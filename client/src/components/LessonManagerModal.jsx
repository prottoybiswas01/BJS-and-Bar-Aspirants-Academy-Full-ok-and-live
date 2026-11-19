import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { lockBodyScroll, unlockBodyScroll } from './ui/scrollLock';
import { getLessonNum, sortLessons, getNextSerial } from '../utils/lessonUtils';

export default function LessonManagerModal({ course, isOpen, onClose }) {
  const { showToast, showError, showSuccess } = useToast();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
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
      loadLessons();
    }
  }, [course, isOpen]);

  const loadLessons = async () => {
    if (!targetCourseId) return;
    setLoading(true);
    try {
      const res = await api.get(`/lessons?courseId=${targetCourseId}`);
      if (res.data.ok) {
        const loaded = res.data.lessons || [];
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
      id: l.id,
      module: l.module || course?.title || '',
      chapter: l.chapter || '',
      title: l.title || '',
      youtubeUrl: l.youtubeUrl || (l.youtubeId ? `https://youtu.be/${l.youtubeId}` : ''),
      releaseDate: l.releaseDate || new Date().toISOString().split('T')[0],
      description: l.description || '',
      order: resolvedOrder,
    });
    setMsg(null);
  };

  const handleDeleteLesson = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete video "${title || id}"?`)) return;
    setLessons(prev => prev.filter(l => l.id !== id && l._id !== id));
    try {
      const res = await api.delete(`/admin/lessons/${id}`);
      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message || '✓ Video deleted successfully from MongoDB!' });
        loadLessons();
      } else {
        setMsg({ type: 'error', text: res.data.message || 'Error deleting video.' });
        loadLessons();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Error deleting video.' });
      loadLessons();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.youtubeUrl) {
      setMsg({ type: 'error', text: 'Please enter YouTube URL or Video ID.' });
      return;
    }

    const finalTitle = form.title.trim() || form.chapter.trim() || form.module.trim() || 'Class Video';

    try {
      const res = await api.post('/admin/lessons/save', {
        ...form,
        order: form.order !== '' && !isNaN(Number(form.order)) ? Number(form.order) : 0,
        title: finalTitle,
        courseId: targetCourseId,
      });

      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message || '✓ Video saved successfully in MongoDB!' });
        // Reload fresh lessons and advance form to the next automatic serial
        await loadLessons();
      } else {
        setMsg({ type: 'error', text: res.data.message || 'Error saving video.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error saving video lesson.' });
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

  const handleQuickSyncSubtitle = async (l) => {
    const lId = l.id || l._id;
    setQuickSyncingId(lId);
    setMsg({ type: 'success', text: `⏳ "${l.title}" এর জন্য ইউটিউব থেকে সাবটাইটেল সিঙ্ক হচ্ছে...` });
    try {
      const res = await api.post(`/admin/lessons/${lId}/transcript`, { action: 'refetch' });
      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message || '✓ সাবটাইটেল সফলভাবে সিঙ্ক হয়েছে!' });
        await loadLessons();
      } else {
        setMsg({ type: 'error', text: res.data.message || 'ইউটিউবে এই ভিডিওর কোনো ক্যাপশন ট্র্যাক পাওয়া যায়নি।' });
      }
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
      wordCount: l.transcript ? l.transcript.split(/\s+/).filter(Boolean).length : 0,
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
          wordCount: res.data.wordCount || 0,
          loading: false
        }));
      }
    } catch (err) {
      console.log('Error fetching transcript:', err);
    } finally {
      setSubtitleModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSaveSubtitleText = async () => {
    if (!subtitleModal.lesson) return;
    setSubtitleModal(prev => ({ ...prev, saving: true }));
    try {
      const res = await api.post(`/admin/lessons/${subtitleModal.lesson.id || subtitleModal.lesson._id}/transcript`, {
        transcript: subtitleModal.text,
        isSrtOrVtt: subtitleModal.isSrtOrVtt || false,
        action: 'save'
      });
      if (res.data.ok) {
        setMsg({ type: 'success', text: '✓ সাবটাইটেল সফলভাবে সেভ করা হয়েছে!' });
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
    setSubtitleModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await api.post(`/admin/lessons/${subtitleModal.lesson.id || subtitleModal.lesson._id}/transcript`, {
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
      onClick={(e) => {
        if (e.target === e.currentTarget && !subtitleModal.isOpen) onClose();
      }}
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
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm">✕</button>
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
            <h4 className="font-bold text-white border-b border-slate-800/80 pb-2 text-sm flex items-center justify-between">
              <span>{form.id ? '✏️ Edit Video Details' : '➕ Upload New Class Video'}</span>
              {form.id && (
                <button
                  type="button"
                  onClick={() => setForm(getDefaultForm(lessons))}
                  className="text-[10px] text-amber-400 underline font-normal"
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

            <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg transition-all hover:scale-[1.02] mt-2">
              {form.id ? '💾 Update Video Details' : '📹 Upload Video to Course'}
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
                          {(l.transcriptStatus === 'ready' || l.transcriptStatus === 'manual') ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold mt-1">
                              ✓ {l.transcriptStatus === 'manual' ? 'ম্যানুয়াল সাবটাইটেল' : 'সাবটাইটেল সিঙ্কড'} ({l.transcriptWordCount || (l.transcript ? l.transcript.split(/\s+/).filter(Boolean).length : 0)} শব্দ)
                            </span>
                          ) : l.transcriptStatus === 'no_captions' ? (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                                ⚠️ ক্যাপশন পাওয়া যায়নি
                              </span>
                              <button
                                type="button"
                                disabled={quickSyncingId === (l.id || l._id)}
                                onClick={() => handleQuickSyncSubtitle(l)}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold cursor-pointer transition-all shadow-sm disabled:opacity-50"
                                title="ইউটিউব থেকে পুনরায় চেষ্টা করুন"
                              >
                                {quickSyncingId === (l.id || l._id) ? '...' : '🔄 রিট্রাই'}
                              </button>
                            </div>
                          ) : (l.transcriptStatus === 'retry_scheduled' || l.transcriptStatus === 'rate_limited') ? (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium">
                                ⏳ {l.transcriptStatus === 'rate_limited' ? 'রেট লিমিট (রিট্রাই অপেক্ষমাণ)' : `রিট্রাই শিডিউলড (${l.transcriptAttemptCount || 1})`}
                              </span>
                              <button
                                type="button"
                                disabled={quickSyncingId === (l.id || l._id)}
                                onClick={() => handleQuickSyncSubtitle(l)}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold cursor-pointer transition-all shadow-sm disabled:opacity-50"
                                title="এখনই রিট্রাই করুন"
                              >
                                {quickSyncingId === (l.id || l._id) ? '...' : '🔄 রিট্রাই'}
                              </button>
                            </div>
                          ) : l.transcriptStatus === 'private_or_restricted' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium mt-1">
                              🔒 ভিডিও প্রাইভেট/অনুপলব্ধ
                            </span>
                          ) : l.transcriptStatus === 'failed' ? (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-rose-500/15 text-rose-300 border border-rose-500/30 font-medium">
                                ❌ সিঙ্ক ব্যর্থ
                              </span>
                              <button
                                type="button"
                                disabled={quickSyncingId === (l.id || l._id)}
                                onClick={() => handleQuickSyncSubtitle(l)}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-rose-500 hover:bg-rose-400 text-white font-extrabold cursor-pointer transition-all shadow-sm disabled:opacity-50"
                                title="পুনরায় চেষ্টা করুন"
                              >
                                {quickSyncingId === (l.id || l._id) ? '...' : '🔄 রিট্রাই'}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                                ⏳ সাবটাইটেল পেন্ডিং
                              </span>
                              <button
                                type="button"
                                disabled={quickSyncingId === (l.id || l._id)}
                                onClick={() => handleQuickSyncSubtitle(l)}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold cursor-pointer transition-all shadow-sm disabled:opacity-50"
                                title="ইউটিউব থেকে এখনই সাবটাইটেল সিঙ্ক করুন"
                              >
                                {quickSyncingId === (l.id || l._id) ? '...' : '🔄 সিঙ্ক'}
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-cyan-400 max-w-[130px] truncate">
                          {l.youtubeUrl || `https://youtu.be/${l.youtubeId}`}
                        </td>
                        <td className="p-2.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={quickSyncingId === (l.id || l._id)}
                            onClick={() => handleQuickSyncSubtitle(l)}
                            className="px-2 py-1 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-500/40 font-bold transition-all text-[10px] disabled:opacity-50"
                            title="ইউটিউব থেকে সরাসরি সাবটাইটেল সিঙ্ক করুন"
                          >
                            {quickSyncingId === (l.id || l._id) ? '...' : '🔄 সিঙ্ক'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenSubtitleModal(l)}
                            className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 font-bold transition-all text-[10px]"
                            title="এই ভিডিওর সাবটাইটেল দেখুন বা এডিট করুন"
                          >
                            📝 সাবটাইটেল
                          </button>
                          <button
                            onClick={() => handleEditLesson(l)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(l.id, l.title)}
                            className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold transition-all border border-rose-500/30"
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

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    subtitleModal.text ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {subtitleModal.text ? `✓ সিঙ্কড (${subtitleModal.wordCount || subtitleModal.text.split(/\s+/).filter(Boolean).length} শব্দ)` : '⚠️ কোনো সাবটাইটেল নেই'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    YouTube ID: {subtitleModal.lesson?.youtubeId || 'N/A'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={subtitleModal.loading}
                  onClick={handleRefetchSubtitle}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold transition-all text-[11px] flex items-center gap-1 border border-slate-700 cursor-pointer"
                >
                  <span>{subtitleModal.loading ? '⏳' : '🔄'}</span>
                  <span>{subtitleModal.loading ? 'ফেচ হচ্ছে...' : 'ইউটিউব থেকে রি-ফেচ'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <p className="text-[11px] text-slate-400">
                  শিক্ষার্থীরা যখন আইনি প্রশ্ন করবে, এআই এই সাবটাইটেল সার্চ করে ক্লাস ও নির্দিষ্ট টাইমস্ট্যাম্প সাজেস্ট করবে:
                </p>
                <label className="px-2.5 py-1 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 font-bold text-[10px] border border-blue-500/40 cursor-pointer flex items-center gap-1.5 transition-all shadow-sm">
                  <span>📂</span>
                  <span>SRT / VTT ফাইল আপলোড (.srt, .vtt)</span>
                  <input
                    type="file"
                    accept=".srt,.vtt,.txt"
                    onChange={handleSrtFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                rows={12}
                value={subtitleModal.text}
                onChange={(e) => setSubtitleModal(prev => ({
                  ...prev,
                  text: e.target.value,
                  wordCount: e.target.value.split(/\s+/).filter(Boolean).length
                }))}
                placeholder="[00:00] এখানে ভিডিওর মূল আইনি আলোচনা অথবা SRT/VTT টেক্সট পেস্ট করুন...&#10;উদাহরণ:&#10;[01:25] ফৌজদারি কার্যবিধির ১৬৭ ধারার রিমান্ড পদ্ধতি..."
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
