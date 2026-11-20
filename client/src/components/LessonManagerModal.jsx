import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { lockBodyScroll, unlockBodyScroll } from './ui/scrollLock';
import { getLessonNum, sortLessons, getNextSerial } from '../utils/lessonUtils';

const formatWordCount = (count) => {
  const num = Number(count) || 0;
  return num.toLocaleString('bn-BD');
};

export default function LessonManagerModal({ course, isOpen, onClose }) {
  const { showToast, showError, showSuccess } = useToast();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [syncingSubtitles, setSyncingSubtitles] = useState(false);
  const [quickSyncingId, setQuickSyncingId] = useState(null);
  const [subtitleModal, setSubtitleModal] = useState({
    isOpen: false,
    lesson: null,
    text: '',
    status: '',
    wordCount: 0,
    isSrtOrVtt: false,
    loading: false,
    saving: false
  });
  const [batchReport, setBatchReport] = useState(null);

  const targetCourseId = course?.id || course?._id || '';

  const generateTitle = (moduleName, num) => {
    const mod = (moduleName || course?.title || '').trim();
    const cleanNum = num || 1;
    if (mod) return `${mod} ${cleanNum} Class`;
    return `Class ${cleanNum}`;
  };

  const getDefaultForm = (lessonList) => {
    const defaultModule = (course?.title || '').trim() || 'Family Law';
    const nextNum = getNextSerial(lessonList);
    return {
      id: '',
      module: defaultModule,
      chapter: '',
      title: generateTitle(defaultModule, nextNum),
      youtubeUrl: '',
      releaseDate: new Date().toISOString().split('T')[0],
      description: '',
      order: String(nextNum),
    };
  };

  const [form, setForm] = useState(() => getDefaultForm([]));

  useEffect(() => {
    if (course && isOpen) {
      setLessons([]);
      setForm(getDefaultForm([]));
      loadLessons();
    }
  }, [course?.id, isOpen]);

  const loadLessons = async () => {
    if (!targetCourseId) return;
    setLoading(true);
    try {
      const res = await api.get(`/lessons?courseId=${encodeURIComponent(targetCourseId)}`);
      if (res.data.ok) {
        const rawLoaded = res.data.lessons || [];
        // Strict course matching defense: only retain lessons that belong to this specific course
        const targetClean = String(targetCourseId).trim().toLowerCase();
        const targetTitle = String(course?.title || '').trim().toLowerCase();
        const targetShort = String(course?.shortTitle || '').trim().toLowerCase();
        const loaded = rawLoaded.filter(l => {
          if (!l) return false;
          const lCourse = String(l.courseId || '').trim().toLowerCase();
          return lCourse === targetClean ||
                 (targetTitle && lCourse === targetTitle) ||
                 (targetShort && lCourse === targetShort) ||
                 lCourse.replace(/[-_ ]/g, '') === targetClean.replace(/[-_ ]/g, '');
        });

        setLessons(loaded);
        setForm(prev => {
          if (prev.id) return prev; // Preserve form if user is actively editing a lesson
          return getDefaultForm(loaded);
        });
      }
    } catch (err) {
      console.log('Error loading lessons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (subtitleModal.isOpen) {
          setSubtitleModal(prev => ({ ...prev, isOpen: false }));
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unlockBodyScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, subtitleModal.isOpen, onClose]);

  if (!isOpen || !course) return null;

  const handleModuleChange = (newModule) => {
    setForm(prev => {
      const oldAutoTitle = generateTitle(prev.module, prev.order);
      const isAutoTitle = !prev.title || prev.title === oldAutoTitle;
      return {
        ...prev,
        module: newModule,
        title: isAutoTitle ? generateTitle(newModule, prev.order) : prev.title,
      };
    });
  };

  const handleOrderChange = (newOrder) => {
    setForm(prev => {
      const oldAutoTitle = generateTitle(prev.module, prev.order);
      const isAutoTitle = !prev.title || prev.title === oldAutoTitle;
      return {
        ...prev,
        order: newOrder,
        title: isAutoTitle && newOrder ? generateTitle(prev.module, newOrder) : prev.title,
      };
    });
  };

  const handleEditLesson = (l) => {
    const inferredOrder = getLessonNum(l);
    const resolvedOrder = (l.order !== undefined && l.order !== null && Number(l.order) > 0)
      ? String(l.order)
      : (inferredOrder > 0 && inferredOrder < 999999 ? String(inferredOrder) : '');

    setForm({
      id: l.id || (l._id ? String(l._id) : ''),
      module: l.module || course?.title || '',
      chapter: l.chapter || '',
      title: l.title || '',
      youtubeUrl: l.youtubeUrl || (l.youtubeId ? `https://youtu.be/${l.youtubeId}` : ''),
      releaseDate: l.releaseDate || new Date().toISOString().split('T')[0],
      description: l.description || '',
      order: resolvedOrder,
    });
    setMsg(null);

    setTimeout(() => {
      document.getElementById('lesson-edit-form-heading')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleDeleteLesson = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete video "${title || id}"?`)) return;
    setLessons(prev => prev.filter(l => l.id !== id && l._id !== id));
    try {
      const res = await api.delete(`/admin/lessons/${id}`);
      if (res.data.ok) {
        const text = res.data.message || '✓ Video deleted successfully from MongoDB!';
        setMsg({ type: 'success', text });
        showSuccess(text);
        loadLessons();
      } else {
        const text = res.data.message || 'Error deleting video.';
        setMsg({ type: 'error', text });
        showError(text);
        loadLessons();
      }
    } catch (err) {
      const text = err.response?.data?.message || 'Error deleting video.';
      setMsg({ type: 'error', text });
      showError(text);
      loadLessons();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (!form.youtubeUrl || !form.youtubeUrl.trim()) {
      const errText = 'দয়া করে ইউটিউব লিংক বা ভিডিও আইডি প্রদান করুন।';
      setMsg({ type: 'error', text: errText });
      showError(errText);
      return;
    }

    const finalTitle = form.title.trim() || form.chapter.trim() || form.module.trim() || 'Class Video';
    const isEdit = Boolean(form.id);
    const yId = getYoutubeId(form.youtubeUrl);

    setIsSaving(true);
    setMsg({ type: 'success', text: isEdit ? '⏳ ভিডিও আপডেট হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...' : '⏳ ভিডিও আপলোড ও সেভ হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...' });

    // Task 1: Attempt direct browser-side timedtext extraction (clean residential IP)
    let browserSegments = null;
    let browserTranscript = null;
    if (yId && (!form.id || !form.hasSubtitles)) {
      try {
        setMsg({ type: 'success', text: '🌐 ব্রাউজার (রেসিডেন্সিয়াল IP) দিয়ে সরাসরি ইউটিউব সাবটাইটেল চেক করা হচ্ছে...' });
        const browserSub = await fetchSubtitleFromBrowser(yId);
        if (browserSub && browserSub.ok && browserSub.segments?.length > 0) {
          browserSegments = browserSub.segments;
          browserTranscript = browserSub.text;
          setMsg({ type: 'success', text: `✓ ব্রাউজার থেকে ${browserSegments.length}টি সাবটাইটেল সেগমেন্ট পাওয়া গেছে! সেভ হচ্ছে...` });
        }
      } catch (_) {}
    }

    try {
      const res = await api.post('/admin/lessons/save', {
        ...form,
        isEdit,
        order: form.order !== '' && !isNaN(Number(form.order)) ? Number(form.order) : 0,
        title: finalTitle,
        courseId: targetCourseId,
        browserSegments,
        browserTranscript
      });

      if (res.data.ok) {
        const successText = res.data.message || '✓ Video saved successfully in MongoDB!';
        setMsg({ type: 'success', text: successText });
        showSuccess(successText);

        // Reset form for next upload and advance order
        setForm(prev => {
          const nextNum = (Number(prev.order) || 0) + 1;
          return {
            id: '',
            module: prev.module || course?.title || '',
            chapter: '',
            title: generateTitle(prev.module || course?.title, nextNum),
            youtubeUrl: '',
            releaseDate: new Date().toISOString().split('T')[0],
            description: '',
            order: String(nextNum),
          };
        });

        // Reload fresh lessons
        await loadLessons();
      } else {
        const errText = res.data.message || 'Error saving video.';
        setMsg({ type: 'error', text: errText });
        showError(errText);
      }
    } catch (err) {
      const errText = err.response?.data?.message || 'Error saving video lesson.';
      setMsg({ type: 'error', text: errText });
      showError(errText);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBatchSyncSubtitles = async () => {
    if (!window.confirm("আপনি কি এই কোর্সের সকল ভিডিওর সাবটাইটেল ইউটিউব থেকে স্বয়ংক্রিয়ভাবে সিঙ্ক করতে চান? এতে প্রকৃত ক্যাপশন ট্র্যাকগুলো ডেটাবেজে সংরক্ষিত হবে।")) return;
    setSyncingSubtitles(true);
    setMsg({ type: 'success', text: '⏳ ইউটিউব থেকে সাবটাইটেল সিঙ্ক হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...' });
    try {
      const res = await api.post('/admin/lessons/sync-transcripts', { courseId: targetCourseId });
      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message || '✓ সাবটাইটেল সিঙ্ক সম্পন্ন হয়েছে!' });
        setBatchReport({
          totalChecked: res.data.totalChecked,
          alreadySynced: res.data.alreadySynced,
          synced: res.data.synced,
          noCaptions: res.data.noCaptions,
          failed: res.data.failed,
          items: res.data.items || []
        });
        await loadLessons();
      } else {
        setMsg({ type: 'error', text: res.data.message || 'সাবটাইটেল সিঙ্ক করতে সমস্যা হয়েছে।' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error syncing video subtitles.' });
    } finally {
      setSyncingSubtitles(false);
    }
  };

  const handleSrtFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setSubtitleModal(prev => ({
          ...prev,
          text: content,
          isSrtOrVtt: true,
          wordCount: content.split(/\s+/).filter(Boolean).length
        }));
      }
    };
    reader.readAsText(file);
  };

  // Extract clean 11-character YouTube ID
  const getYoutubeId = (urlOrId) => {
    if (!urlOrId) return '';
    const str = String(urlOrId).trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
    return match ? match[1] : '';
  };

  // Parse raw XML timedtext (<text start="X" dur="Y">...</text> or <p t="X" d="Y">...</p>)
  const parseBrowserXmlSegments = (xmlStr) => {
    if (!xmlStr || typeof xmlStr !== 'string') return [];
    const segments = [];
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
      const textNodes = xmlDoc.getElementsByTagName('text');
      if (textNodes && textNodes.length > 0) {
        for (let i = 0; i < textNodes.length; i++) {
          const node = textNodes[i];
          const start = parseFloat(node.getAttribute('start') || '0');
          const dur = parseFloat(node.getAttribute('dur') || '0');
          const rawText = node.textContent || '';
          const clean = rawText.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').trim();
          if (clean) {
            const m = Math.floor(start / 60);
            const s = Math.floor(start % 60);
            const timestamp = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            segments.push({ start, dur, timestamp, offsetSeconds: start, text: clean });
          }
        }
      } else {
        const pNodes = xmlDoc.getElementsByTagName('p');
        if (pNodes && pNodes.length > 0) {
          for (let i = 0; i < pNodes.length; i++) {
            const node = pNodes[i];
            const start = parseFloat(node.getAttribute('t') || '0') / 1000;
            const dur = parseFloat(node.getAttribute('d') || '0') / 1000;
            const rawText = node.textContent || '';
            const clean = rawText.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').trim();
            if (clean) {
              const m = Math.floor(start / 60);
              const s = Math.floor(start % 60);
              const timestamp = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
              segments.push({ start, dur, timestamp, offsetSeconds: start, text: clean });
            }
          }
        }
      }
    } catch (_) {}

    if (segments.length === 0) {
      const regex = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/gi;
      let match;
      while ((match = regex.exec(xmlStr)) !== null) {
        const start = parseFloat(match[1]);
        const dur = parseFloat(match[2]);
        const rawText = match[3].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').trim();
        if (rawText) {
          const m = Math.floor(start / 60);
          const s = Math.floor(start % 60);
          const timestamp = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
          segments.push({ start, dur, timestamp, offsetSeconds: start, text: rawText });
        }
      }
    }
    return segments;
  };

  // Browser-Assisted Direct YouTube TimedText Subtitle Fetch (immune to Vercel Cloud IP blocks)
  const fetchSubtitleFromBrowser = async (youtubeId) => {
    if (!youtubeId) return null;
    const candidates = ['bn', 'a.bn', 'en', 'a.en'];

    // 1. Try timedtext json3 format (modern YouTube client format)
    for (const lang of candidates) {
      try {
        const url = `https://www.youtube.com/api/timedtext?v=${youtubeId}&lang=${lang}&fmt=json3`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.events)) {
            const segments = [];
            for (const ev of data.events) {
              if (Array.isArray(ev.segs)) {
                const text = ev.segs.map(s => s.utf8 || '').join('').trim();
                if (text && text !== '\n') {
                  const start = (ev.tStartMs || 0) / 1000;
                  const dur = (ev.dDurationMs || 0) / 1000;
                  const m = Math.floor(start / 60);
                  const s = Math.floor(start % 60);
                  const timestamp = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                  segments.push({ start, dur, timestamp, offsetSeconds: start, text });
                }
              }
            }
            if (segments.length > 0) {
              const fullText = segments.map(s => `[${s.timestamp}] ${s.text}`).join('\n');
              return { ok: true, segments, text: fullText, lang, source: 'browser_timedtext_json3' };
            }
          }
        }
      } catch (_) {}
    }

    // 2. Try srv3 XML format
    for (const lang of candidates) {
      try {
        const url = `https://www.youtube.com/api/timedtext?v=${youtubeId}&lang=${lang}&fmt=srv3`;
        const res = await fetch(url);
        if (res.ok) {
          const raw = await res.text();
          if (raw && raw.trim().length > 30) {
            const segments = parseBrowserXmlSegments(raw);
            if (segments.length > 0) {
              const fullText = segments.map(s => `[${s.timestamp}] ${s.text}`).join('\n');
              return { ok: true, segments, text: fullText, lang, source: 'browser_timedtext_srv3' };
            }
          }
        }
      } catch (_) {}
    }

    // 3. Try standard XML format
    for (const lang of candidates) {
      try {
        const url = `https://www.youtube.com/api/timedtext?v=${youtubeId}&lang=${lang}`;
        const res = await fetch(url);
        if (res.ok) {
          const raw = await res.text();
          if (raw && raw.trim().length > 30) {
            const segments = parseBrowserXmlSegments(raw);
            if (segments.length > 0) {
              const fullText = segments.map(s => `[${s.timestamp}] ${s.text}`).join('\n');
              return { ok: true, segments, text: fullText, lang, source: 'browser_timedtext_xml' };
            }
          }
        }
      } catch (_) {}
    }
    return null;
  };

  const handleQuickSyncSubtitle = async (l) => {
    const lId = l.id || l._id;
    const yId = l.youtubeId || getYoutubeId(l.youtubeUrl);
    setQuickSyncingId(lId);
    setMsg({ type: 'success', text: `⏳ "${l.title}" এর জন্য সাবটাইটেল সিঙ্ক হচ্ছে...` });

    try {
      // Step 1: Attempt direct browser extraction first (clean residential IP)
      if (yId) {
        setMsg({ type: 'success', text: `🌐 ব্রাউজার রেসিডেন্সিয়াল IP দিয়ে সরাসরি ইউটিউব থেকে সাবটাইটেল খোঁজা হচ্ছে...` });
        const browserResult = await fetchSubtitleFromBrowser(yId);
        if (browserResult && browserResult.ok && browserResult.segments?.length > 0) {
          const saveRes = await api.post(`/admin/lessons/${lId}/save-transcript`, {
            transcript: browserResult.text,
            segments: browserResult.segments,
            source: 'browser_assisted_sync',
            isSrtOrVtt: true,
            action: 'save'
          });
          if (saveRes.data.ok) {
            setMsg({ type: 'success', text: `✓ ব্রাউজার-অ্যাসিস্টেড সিঙ্ক সফল! ইউটিউব থেকে ${browserResult.segments.length}টি সাবটাইটেল সেগমেন্ট সরাসরি ডেটাবেজে সংরক্ষিত হয়েছে!` });
            await loadLessons();
            return;
          }
        }
      }

      // Step 2: Request backend multi-tier pipeline (invoking Gemini Multimodal Video AI if YouTube has no captions)
      setMsg({ type: 'success', text: `🤖 সার্ভার ও Gemini Multimodal AI দিয়ে ভিডিওর অডিও ট্রান্সক্রাইব করা হচ্ছে...` });
      const res = await api.post(`/admin/lessons/${lId}/transcript`, { action: 'refetch' });
      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message || '✓ সাবটাইটেল সফলভাবে সিঙ্ক হয়েছে!' });
        await loadLessons();
        return;
      }

      // Step 3: If both failed (e.g. video is Private on YouTube)
      if (res.data.status === 'private_or_unavailable' || res.data.errorCode === 'VIDEO_PRIVATE_OR_UNAVAILABLE') {
        setMsg({
          type: 'error',
          text: `⚠️ ভিডিওটি ইউটিউবে Private থাকায় অ্যাক্সেস করা যায়নি। দয়া করে ইউটিউব স্টুডিওতে Unlisted করুন অথবা নিচে "📋 ম্যানুয়াল পেস্ট" ব্যবহার করুন।`
        });
      } else {
        setMsg({
          type: 'error',
          text: res.data.message || 'সাবটাইটেল পাওয়া যায়নি। ১-ক্লিক "📋 ম্যানুয়াল পেস্ট" দিয়ে টেক্সট যুক্ত করুন।'
        });
      }
      await loadLessons();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'সাবটাইটেল সিঙ্ক করতে সমস্যা হয়েছে।' });
    } finally {
      setQuickSyncingId(null);
    }
  };

  const handleOpenSubtitleModal = async (l) => {
    setSubtitleModal({
      isOpen: true,
      lesson: l,
      text: l.transcript || '',
      status: l.transcriptStatus || (l.transcript ? 'ready' : 'none'),
      wordCount: l.transcriptWordCount || (l.transcript ? l.transcript.split(/\s+/).filter(Boolean).length : 0),
      isSrtOrVtt: false,
      loading: true,
      saving: false
    });

    try {
      const res = await api.get(`/admin/lessons/${l.id || l._id}/transcript`);
      if (res.data.ok) {
        setSubtitleModal(prev => ({
          ...prev,
          text: res.data.transcript || '',
          status: res.data.transcriptStatus || 'none',
          wordCount: res.data.wordCount || (res.data.transcript ? res.data.transcript.split(/\s+/).filter(Boolean).length : 0),
          loading: false
        }));
      }
    } catch (err) {
      console.log('Error fetching transcript:', err);
    } finally {
      setSubtitleModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleOpenManualPaste = (l) => {
    handleOpenSubtitleModal(l);
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        setMsg({ type: 'error', text: 'ব্রাউজার ক্লিপবোর্ড অনুমতি দেয়নি। অনুগ্রহ করে টেক্সট এরিয়াতে সরাসরি Ctrl+V দিয়ে পেস্ট করুন।' });
        return;
      }
      const clipText = await navigator.clipboard.readText();
      if (clipText && clipText.trim()) {
        const words = clipText.trim().split(/\s+/).filter(Boolean).length;
        setSubtitleModal(prev => ({
          ...prev,
          text: clipText.trim(),
          wordCount: words,
          status: 'manual'
        }));
        setMsg({ type: 'success', text: `📋 ক্লিপবোর্ড থেকে ${words}টি শব্দ পেস্ট করা হয়েছে! এবার নিচে "💾 সাবটাইটেল সেভ করুন" বাটনে ক্লিক করুন।` });
      } else {
        setMsg({ type: 'error', text: 'ক্লিপবোর্ডে কোনো টেক্সট পাওয়া যায়নি। প্রথমে ইউটিউব স্টুডিও বা ফাইল থেকে টেক্সট কপি করুন।' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'ক্লিপবোর্ড থেকে পড়তে সমস্যা হয়েছে। অনুগ্রহ করে টেক্সট এরিয়াতে সরাসরি Ctrl+V পেস্ট করুন।' });
    }
  };

  const handleSaveSubtitleText = async () => {
    if (!subtitleModal.lesson) return;
    setSubtitleModal(prev => ({ ...prev, saving: true }));
    try {
      const res = await api.post(`/admin/lessons/${subtitleModal.lesson.id || subtitleModal.lesson._id}/save-transcript`, {
        transcript: subtitleModal.text,
        isSrtOrVtt: subtitleModal.isSrtOrVtt || false,
        source: 'manual_paste',
        action: 'save'
      });
      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message || '✓ সাবটাইটেল সফলভাবে সেভ করা হয়েছে!' });
        setSubtitleModal(prev => ({ ...prev, saving: false, isOpen: false }));
        await loadLessons();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'সাবটাইটেল সেভ করতে সমস্যা হয়েছে।' });
      setSubtitleModal(prev => ({ ...prev, saving: false }));
    }
  };

  const handleRefetchSubtitle = async () => {
    if (!subtitleModal.lesson) return;
    const l = subtitleModal.lesson;
    const lId = l.id || l._id;
    const yId = l.youtubeId || getYoutubeId(l.youtubeUrl);
    setSubtitleModal(prev => ({ ...prev, loading: true }));

    try {
      const res = await api.post(`/admin/lessons/${lId}/transcript`, {
        action: 'refetch'
      });
      if (res.data.ok) {
        setSubtitleModal(prev => ({
          ...prev,
          text: res.data.transcript || '',
          status: 'ready',
          wordCount: res.data.wordCount || 0,
          loading: false
        }));
        setMsg({ type: 'success', text: res.data.message || '✓ সাবটাইটেল সফলভাবে রি-ফেচ করা হয়েছে!' });
        await loadLessons();
        return;
      }

      // Check if server IP blocked -> try browser assisted fetch
      if (res.data.status === 'IP_BLOCKED_BY_YOUTUBE' || res.data.errorCode === 'IP_BLOCKED_BY_YOUTUBE') {
        if (yId) {
          setMsg({ type: 'success', text: `🌐 ব্রাউজার দিয়ে সরাসরি ইউটিউব ক্যাপশন ফেচ করা হচ্ছে...` });
          const browserResult = await fetchSubtitleFromBrowser(yId);
          if (browserResult && browserResult.ok) {
            const saveRes = await api.post(`/admin/lessons/${lId}/save-transcript`, {
              transcript: browserResult.text,
              source: 'browser_assisted_sync',
              isSrtOrVtt: true,
              action: 'save'
            });
            if (saveRes.data.ok) {
              setSubtitleModal(prev => ({
                ...prev,
                text: saveRes.data.transcript || browserResult.text,
                status: 'ready',
                wordCount: saveRes.data.wordCount || 0,
                loading: false
              }));
              setMsg({ type: 'success', text: `✓ ব্রাউজার-সিঙ্ক সফল! ইউটিউব থেকে সাবটাইটেল ডাটাবেজে সংরক্ষণ করা হয়েছে!` });
              await loadLessons();
              return;
            }
          }
        }
        showError('ভিডিওটির সাবটাইটেল স্বয়ংক্রিয়ভাবে সংগ্রহ করা যায়নি। নিচে টেক্সট পেস্ট করে "সাবটাইটেল সেভ করুন" চাপুন অথবা ভিডিওটি Unlisted কিনা নিশ্চিত করুন।');
      } else {
        showError(res.data.message || 'ইউটিউব থেকে সাবটাইটেল পাওয়া যায়নি।');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'সাবটাইটেল রি-ফেচ করতে সমস্যা হয়েছে।');
    } finally {
      setSubtitleModal(prev => ({ ...prev, loading: false }));
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-4 gap-3">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-xs font-bold uppercase border border-amber-500/30">
              {course.category || 'COURSE'}
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg">{course.title} — Video Upload & Lesson Manager</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Total Uploaded Videos: <strong className="text-amber-400 font-bold">{lessons.length}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={syncingSubtitles}
              onClick={handleBatchSyncSubtitles}
              className="px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 text-cyan-200 border border-cyan-500/40 font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="সকল ক্লাসের ইউটিউব সাবটাইটেল একসাথে অটো-সিঙ্ক করুন"
            >
              <span>{syncingSubtitles ? '⏳' : '🔄'}</span>
              <span>{syncingSubtitles ? 'সিঙ্ক হচ্ছে...' : 'সাবটাইটেল অটো-সিঙ্ক (Batch Sync)'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-slate-700 transition-colors"
              title="ভিডিও ম্যানেজার বন্ধ করুন (Close)"
            >
              ✕
            </button>
          </div>
        </div>

        {msg && (
          <div className={`p-3 rounded-xl mb-4 font-semibold text-xs flex items-center justify-between ${
            msg.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'
          }`}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)} className="text-xs opacity-75 hover:opacity-100">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-y-auto pr-1">
          {/* Add / Edit Form */}
          <form onSubmit={handleSave} className="lg:col-span-5 space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 self-start">
            <h4 id="lesson-edit-form-heading" className="font-bold text-white border-b border-slate-800/80 pb-2 text-sm flex items-center justify-between">
              <span>{form.id ? '✏️ Edit Video Details' : '➕ Upload New Class Video'}</span>
              {form.id && (
                <button
                  type="button"
                  onClick={() => setForm(getDefaultForm(lessons))}
                  className="text-[10px] text-amber-400 underline font-normal cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </h4>

            <div>
              <label className="block text-slate-400 mb-1 font-bold">
                Module Name (স্বয়ংক্রিয়)
              </label>
              <input
                type="text"
                value={form.module}
                onChange={(e) => handleModuleChange(e.target.value)}
                placeholder={course?.title || "e.g. Family Law"}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-amber-300 font-bold mb-1">
                অধ্যায় / সেশন টাইটেল (Chapter / Session — Optional)
              </label>
              <input
                type="text"
                value={form.chapter}
                onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                placeholder="e.g. অধ্যায় ১: দেওয়ানী কার্যবিধি সূচনা (Optional)"
                className="w-full rounded-lg bg-slate-900 border border-amber-500/30 px-3 py-2 text-white placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-bold">
                Class / Video Title (স্বয়ংক্রিয়)
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={generateTitle(form.module || course?.title, form.order || getNextSerial(lessons))}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-bold">YouTube URL or ID (youtubeUrl)</label>
              <input
                type="text"
                value={form.youtubeUrl}
                onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                placeholder="e.g. https://youtu.be/7HNVqFCWZm4"
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-emerald-400 font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-amber-300 mb-1 font-bold">Class Serial # (ক্রমিক — অপশনাল)</label>
                <input
                  type="number"
                  min="1"
                  value={form.order}
                  onChange={(e) => handleOrderChange(e.target.value)}
                  placeholder={`যেমন: ${getNextSerial(lessons)}`}
                  className="w-full rounded-lg bg-slate-900 border border-amber-500/40 px-3 py-2 text-amber-300 font-mono font-bold"
                  title="ভিডিওর ক্রমিক নম্বর (খালি রাখলেও স্বয়ংক্রিয়ভাবে পরবর্তী সিরিয়াল যুক্ত হবে)"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Release Date</label>
                <input
                  type="date"
                  value={form.releaseDate}
                  onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className={`w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg transition-all mt-2 flex items-center justify-center gap-2 ${
                isSaving ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.02] cursor-pointer'
              }`}
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>{form.id ? 'আপডেট হচ্ছে...' : 'আপলোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...'}</span>
                </>
              ) : (
                <span>{form.id ? '💾 Update Video Details' : '📹 Upload Video to Course'}</span>
              )}
            </button>
          </form>

          {/* Lessons Table Feed matching Spreadsheet Screenshot */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <h4 className="font-bold text-white text-xs">
                📹 Uploaded Course Videos ({lessons.length})
              </h4>
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                Sorted Serially (#1 to #{lessons.length})
              </span>
            </div>

            {loading ? (
              <p className="text-amber-400 font-mono text-center py-6">Loading videos...</p>
            ) : lessons.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-xl border border-dashed border-slate-800 space-y-2 text-slate-500">
                <p className="font-semibold text-slate-400 text-xs">No videos uploaded yet for this course.</p>
                <p className="text-[11px]">Use the Upload Form on the left to add video lectures.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-[11px] border-collapse bg-slate-950">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono bg-slate-900/80">
                      <th className="p-2.5 w-8 text-center">#</th>
                      <th className="p-2.5">Module</th>
                      <th className="p-2.5">Title</th>
                      <th className="p-2.5">YouTube URL</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sortLessons(lessons).map((l, index) => (
                      <tr key={l.id || index} className="hover:bg-slate-900/60 transition-colors">
                        <td className="p-2.5 font-mono font-bold text-amber-400 text-center">{index + 1}</td>
                        <td className="p-2.5 font-semibold text-amber-300">{l.module}</td>
                        <td className="p-2.5 font-bold text-white">
                          {l.title}
                          {l.chapter && <span className="block text-[10px] text-slate-400 font-normal italic">{l.chapter}</span>}
                          {(() => {
                            const isReady = l.transcriptStatus === 'ready' || l.transcriptStatus === 'manual' || (l.hasSubtitles && ((l.transcriptWordCount && l.transcriptWordCount > 0) || l.transcript));
                            const isGenerating = quickSyncingId === (l.id || l._id) || l.transcriptStatus === 'generating' || l.transcriptStatus === 'processing' || l.transcriptStatus === 'in_progress';
                            const isPending = l.transcriptStatus === 'pending' || l.transcriptStatus === 'retry_scheduled' || l.transcriptStatus === 'rate_limited';

                            if (isReady) {
                              const wordCount = formatWordCount(l.transcriptWordCount || (l.transcript ? l.transcript.split(/\s+/).filter(Boolean).length : 0));
                              return (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold mt-1 shadow-sm">
                                  ✅ সাবটাইটেল রেডি ({wordCount} শব্দ)
                                </span>
                              );
                            }

                            if (isGenerating || isPending) {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold mt-1 animate-pulse shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                                  🤖 Gemini AI ট্রান্সক্রিপ্ট তৈরি হচ্ছে...
                                </span>
                              );
                            }

                            return (
                              <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium">
                                    ⚠️ ভিডিও প্রাইভেট/অ্যাক্সেসযোগ্য নয়
                                  </span>
                                  <button
                                    type="button"
                                    disabled={quickSyncingId === (l.id || l._id)}
                                    onClick={() => handleQuickSyncSubtitle(l)}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold cursor-pointer transition-all shadow-sm disabled:opacity-50"
                                    title="পুনরায় সিঙ্ক চেষ্টা করুন"
                                  >
                                    {quickSyncingId === (l.id || l._id) ? '...' : '🔄 রি-ট্রাই সিঙ্ক'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenManualPaste(l)}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-purple-900 hover:bg-purple-800 text-purple-200 font-extrabold cursor-pointer transition-all shadow-sm"
                                    title="১-ক্লিক ম্যানুয়াল সাবটাইটেল পেস্ট"
                                  >
                                    📋 ম্যানুয়াল পেস্ট
                                  </button>
                                </div>
                                {l.transcriptLastError && !l.transcriptLastError.includes("Bot Protection") && (
                                  <span className="text-[8px] text-rose-400/80 font-mono line-clamp-1 max-w-[240px]" title={l.transcriptLastError}>
                                    {l.transcriptLastError}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-2.5 font-mono text-cyan-400 max-w-[130px] truncate">
                          {l.youtubeUrl || `https://youtu.be/${l.youtubeId}`}
                        </td>
                        <td className="p-2.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenManualPaste(l);
                            }}
                            className="px-2 py-1 rounded bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-500/40 font-bold transition-all text-[10px] cursor-pointer"
                            title="ইউটিউব স্টুডিও বা ফাইল থেকে সরাসরি সাবটাইটেল পেস্ট করুন"
                          >
                            📋 ম্যানুয়াল সাবটাইটেল (Paste)
                          </button>
                          <button
                            type="button"
                            disabled={quickSyncingId === (l.id || l._id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickSyncSubtitle(l);
                            }}
                            className="px-2 py-1 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-500/40 font-bold transition-all text-[10px] disabled:opacity-50 cursor-pointer"
                            title="ইউটিউব থেকে সরাসরি সাবটাইটেল সিঙ্ক করুন"
                          >
                            {quickSyncingId === (l.id || l._id) ? '...' : '🔄 সিঙ্ক'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSubtitleModal(l);
                            }}
                            className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 font-bold transition-all text-[10px] cursor-pointer"
                            title="এই ভিডিওর সাবটাইটেল দেখুন বা এডিট করুন"
                          >
                            📝 সাবটাইটেল
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditLesson(l);
                            }}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold transition-all cursor-pointer"
                            title="এই ভিডিও এডিট করুন"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLesson(l.id, l.title);
                            }}
                            className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold transition-all border border-rose-500/30 cursor-pointer"
                            title="ভিডিও ডিলিট করুন"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Subtitle Inspector & Editor Modal */}
        {subtitleModal.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[85vh] text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <div>
                  <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                    <span>📝 ইউটিউব ভিডিও সাবটাইটেল / ট্রান্সক্রিপ্ট</span>
                  </h4>
                  <p className="text-[11px] text-amber-400 font-mono mt-0.5 line-clamp-1">
                    {subtitleModal.lesson?.title}
                  </p>
                </div>
                <button
                  onClick={() => setSubtitleModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    subtitleModal.text ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {subtitleModal.text
                      ? `✓ ${subtitleModal.status === 'manual' ? 'ম্যানুয়াল সাবটাইটেল' : 'সিঙ্কড'} (${formatWordCount(subtitleModal.wordCount || subtitleModal.text.split(/\s+/).filter(Boolean).length)} শব্দ)`
                      : (subtitleModal.loading ? '⏳ তথ্য লোড হচ্ছে...' : '⚠️ কোনো সাবটাইটেল নেই')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    YouTube ID: {subtitleModal.lesson?.youtubeId || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {subtitleModal.lesson?.youtubeId && (
                    <a
                      href={`https://www.youtube.com/watch?v=${subtitleModal.lesson.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 font-bold transition-all text-[11px] flex items-center gap-1 border border-red-500/40 cursor-pointer shadow-sm"
                      title="নতুন ট্যাবে ইউটিউবে ভিডিওটি ওপেন করুন (ক্যাপশন দেখতে Description-এর নিচে 'Show transcript' ক্লিক করুন)"
                    >
                      <span>▶</span>
                      <span>ইউটিউবে ভিডিও খুলুন ↗</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold transition-all text-[11px] flex items-center gap-1.5 shadow-md shadow-purple-900/30 cursor-pointer active:scale-95"
                    title="ক্লিপবোর্ডে কপি করা সাবটাইটেল এক ক্লিকে পেস্ট করুন"
                  >
                    <span>📋</span>
                    <span>ক্লিপবোর্ড থেকে পেস্ট</span>
                  </button>
                  <button
                    type="button"
                    disabled={subtitleModal.loading}
                    onClick={handleRefetchSubtitle}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold transition-all text-[11px] flex items-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    <span>{subtitleModal.loading ? '⏳' : '🔄'}</span>
                    <span>{subtitleModal.loading ? 'ফেচ হচ্ছে...' : 'ইউটিউব রি-ফেচ'}</span>
                  </button>
                </div>
              </div>

              {/* YouTube Studio Guidance Alert Box */}
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 mb-2.5 space-y-1 text-slate-300">
                <p className="font-extrabold text-purple-300 text-xs flex items-center gap-1.5">
                  <span>💡</span> ইউটিউব স্টুডিও (YouTube Studio) থেকে সরাসরি কপি-পেস্ট গাইড:
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  YouTube Studio &gt; Content &gt; ভিডিও এডিট &gt; <strong>Subtitles</strong> &gt; <strong>Edit as text</strong> থেকে সম্পূর্ণ ক্যাপশন কপি করে উপরের <strong className="text-purple-300">"📋 ক্লিপবোর্ড থেকে পেস্ট"</strong> বাটনে ক্লিক করুন। টাইমস্ট্যাম্পযুক্ত (<code className="text-amber-300">0:05</code> বা <code className="text-amber-300">[01:25]</code>) অথবা সাধারণ বাংলা লেখা—উভয় ফরম্যাটই স্বয়ংক্রিয়ভাবে প্রসেস হয়ে ডাটাবেজে পার্মানেন্ট সেভ হবে।
                </p>
              </div>

              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <p className="text-[11px] text-slate-400">
                  শিক্ষার্থীরা আইনি প্রশ্ন করলে 'আইন সহকারী' (AI Legal Assistant) এই লেখার সাথে প্রশ্ন মিলিয়ে নির্দিষ্ট মিনিট-সেকেন্ড প্লে করবে:
                </p>
                <div className="flex items-center gap-2">
                  {subtitleModal.text && (
                    <button
                      type="button"
                      onClick={() => setSubtitleModal(prev => ({ ...prev, text: '', wordCount: 0 }))}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 text-[10px] font-bold border border-rose-500/30 cursor-pointer transition-all"
                      title="টেক্সট মুছে ফেলুন"
                    >
                      🗑️ খালি করুন
                    </button>
                  )}
                  <label className="px-2.5 py-1 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 font-bold text-[10px] border border-blue-500/40 cursor-pointer flex items-center gap-1.5 transition-all shadow-sm">
                    <span>📂</span>
                    <span>SRT / VTT ফাইল (.srt, .vtt)</span>
                    <input
                      type="file"
                      accept=".srt,.vtt,.txt"
                      onChange={handleSrtFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <textarea
                rows={11}
                value={subtitleModal.text}
                onChange={(e) => setSubtitleModal(prev => ({
                  ...prev,
                  text: e.target.value,
                  wordCount: e.target.value.split(/\s+/).filter(Boolean).length
                }))}
                placeholder="[00:00] এখানে ভিডিওর মূল আইনি আলোচনা অথবা YouTube Studio / SRT / VTT টেক্সট পেস্ট করুন...&#10;&#10;উদাহরণ:&#10;0:05 আজকের ক্লাসে আমরা দেওয়ানী কার্যবিধির ৯ ধারা আলোচনা করব।&#10;0:45 সকল দেওয়ানি আদালতের এখতিয়ার ও সুনির্দিষ্ট প্রতিকার..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-slate-200 font-sans text-xs leading-relaxed focus:outline-none focus:border-amber-500 flex-1 resize-none font-mono"
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 mt-3">
                <button
                  type="button"
                  onClick={() => setSubtitleModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
                >
                  বন্ধ করুন
                </button>
                <button
                  type="button"
                  disabled={subtitleModal.saving}
                  onClick={handleSaveSubtitleText}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{subtitleModal.saving ? '⏳ সেভ হচ্ছে...' : '💾 সাবটাইটেল সেভ করুন'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
