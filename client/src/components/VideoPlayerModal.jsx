import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Maximize2,
  Minimize2,
  Smartphone,
  ShieldCheck,
  X,
  BookMarked,
  FileText,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Subtitles,
  Check,
  ListVideo,
  Bot,
  Send,
  Sparkles,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';
import api from '../services/api';
import { sortLessons } from '../utils/lessonUtils';
import BrandLogo from './BrandLogo';
import { lockBodyScroll, unlockBodyScroll } from './ui/scrollLock';

// Global singleton promise for loading YouTube Iframe API script
let ytScriptLoadingPromise = null;
function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }
  if (!ytScriptLoadingPromise) {
    ytScriptLoadingPromise = new Promise((resolve) => {
      const existing = document.getElementById('bjs-youtube-iframe-api');
      if (!existing) {
        const tag = document.createElement('script');
        tag.id = 'bjs-youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const first = document.getElementsByTagName('script')[0];
        if (first && first.parentNode) {
          first.parentNode.insertBefore(tag, first);
        } else {
          document.head.appendChild(tag);
        }
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        resolve(window.YT);
      };

      // Fallback polling in case callback fired earlier
      const interval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(interval);
          resolve(window.YT);
        }
      }, 80);
    });
  }
  return ytScriptLoadingPromise;
}

export default function VideoPlayerModal({
  videoId,
  title,
  student,
  clipOptions = null,
  courseTitle = '',
  courseId = '',
  onClose,
  onEnrollClick
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const containerRef = useRef(null);

  // Dynamic Moving Watermark Overlay
  const watermarkPositions = [
    { top: '18%', left: '12%' },
    { top: '65%', left: '20%' },
    { top: '35%', left: '55%' },
    { top: '75%', left: '60%' },
    { top: '48%', left: '35%' },
    { top: '22%', left: '68%' }
  ];
  const [watermarkIndex, setWatermarkIndex] = useState(0);

  useEffect(() => {
    const wmTimer = setInterval(() => {
      setWatermarkIndex((prev) => (prev + 1) % watermarkPositions.length);
    }, 15000);
    return () => clearInterval(wmTimer);
  }, [watermarkPositions.length]);

  // De-obfuscate protected video ID if encoded with bjs_enc_ prefix
  const resolveVideoId = (raw) => {
    if (!raw) return '';
    const str = String(raw).trim();
    if (str.startsWith('bjs_enc_')) {
      try {
        if (typeof window !== 'undefined' && window.atob) {
          return window.atob(str.replace('bjs_enc_', ''));
        }
      } catch (e) {
        return str;
      }
    }
    return str;
  };

  // Dynamic active video & title state (allows switching lessons within classroom)
  const [currentActiveVideoId, setCurrentActiveVideoId] = useState(() => resolveVideoId(videoId));
  const [currentActiveTitle, setCurrentActiveTitle] = useState(title || 'Lecture Video');

  useEffect(() => {
    if (videoId) {
      setCurrentActiveVideoId(resolveVideoId(videoId));
      setCurrentActiveTitle(title || 'Lecture Video');
    }
  }, [videoId, title]);

  const activeVideoId = currentActiveVideoId;

  // Sidebar Theater state (3 Tabs: lessons | notes | ai)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('lessons'); // 'lessons' | 'notes' | 'ai'
  const [courseLessons, setCourseLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  // Fetch Course Lessons when courseId is provided
  useEffect(() => {
    if (!courseId) return;
    let isMounted = true;
    setLoadingLessons(true);
    api.get(`/lessons?courseId=${courseId}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.ok && Array.isArray(res.data.lessons)) {
          const sorted = sortLessons(res.data.lessons);
          setCourseLessons(sorted);
        }
      })
      .catch((err) => {
        console.warn('Classroom lessons fetch:', err.message);
      })
      .finally(() => {
        if (isMounted) setLoadingLessons(false);
      });

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  // AI Assistant In-Classroom Chat State
  const [aiMessages, setAiMessages] = useState([
    {
      sender: 'ai',
      text: 'আসসালামু আলাইকুম! আমি ক্লাসরুম AI সহকারী। লেকচার চলাকালীন কোনো আইনি ধারা, কেস ল বা কনসেপ্ট বুঝতে সমস্যা হলে আমাকে সরাসরি লিখুন।'
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiMessagesEndRef = useRef(null);

  const handleSendAi = async (textToSend) => {
    const q = (textToSend || aiInput || '').trim();
    if (!q || aiLoading) return;
    setAiInput('');
    setAiMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setAiLoading(true);

    try {
      const historyPayload = aiMessages.slice(-4).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text || ''
      }));

      const res = await api.post('/ai/chat', {
        prompt: q,
        conversationHistory: historyPayload
      });

      if (res.data && res.data.ok) {
        setAiMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: res.data.reply,
            verifiedSources: res.data.verifiedSources || []
          }
        ]);
      } else {
        setAiMessages((prev) => [
          ...prev,
          { sender: 'ai', text: res.data?.message || 'দুঃখিত, এই মুহূর্তে উত্তর তৈরি করা যায়নি।' }
        ]);
      }
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'সার্ভার সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।' }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (sidebarTab === 'ai') {
      aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, aiLoading, sidebarTab]);

  // Clip & Course Preview Options
  const canPlayFull = clipOptions ? Boolean(clipOptions.canPlayFull || clipOptions.isEnrolled) : true;
  const initialStartTime = Number(clipOptions?.startTime || 0);
  const endTime = Number(clipOptions?.endTime || (initialStartTime + 60));
  const clipDuration = Math.max(endTime - initialStartTime, 15);
  const startFmt = clipOptions?.startFormatted || `${Math.floor(initialStartTime / 60)}:${String(initialStartTime % 60).padStart(2, '0')}`;
  const endFmt = clipOptions?.endFormatted || `${Math.floor(endTime / 60)}:${String(endTime % 60).padStart(2, '0')}`;

  const [clipEnded, setClipEnded] = useState(false);

  // YouTube Player Instance & Custom Control Bar State
  const playerId = useRef(`bjs-yt-${Math.random().toString(36).substring(2, 9)}`).current;
  const playerRef = useRef(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialStartTime);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Bookmark storage
  const studentStorageKey = `bjs_bookmarks_${student?.id || 'guest'}_${activeVideoId}`;
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem(studentStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [newNoteText, setNewNoteText] = useState('');
  const [customTimeInput, setCustomTimeInput] = useState('00:00');

  // Format MM:SS helper
  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const totalSecs = Math.floor(secs);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    const h = Math.floor(m / 60);
    if (h > 0) {
      const remM = m % 60;
      return `${h}:${String(remM).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentFormattedTime = formatTime(currentTime);

  // Initialize locked YouTube Player via YT.Player API
  useEffect(() => {
    let isMounted = true;
    let pollTimer = null;

    if (!activeVideoId) return;

    loadYouTubeIframeApi().then((YT) => {
      if (!isMounted || !YT) return;

      // Clean up previous instance
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (_) {}
        playerRef.current = null;
      }

      playerRef.current = new YT.Player(playerId, {
        videoId: activeVideoId,
        playerVars: {
          autoplay: 1,
          controls: 0,         // Hide all native YouTube controls
          rel: 0,              // Disable related suggested videos
          modestbranding: 1,   // Remove YouTube logo
          disablekb: 1,        // Disable iframe keyboard hijacking
          iv_load_policy: 3,   // Disable annotations & channel overlays
          playsinline: 1,      // In-page playback on mobile
          start: initialStartTime,
          fs: 0,               // Disable native fullscreen button inside iframe
          enablejsapi: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : ''
        },
        events: {
          onReady: (event) => {
            if (!isMounted) return;
            setIsPlayerReady(true);
            const dur = event.target.getDuration() || 0;
            if (dur > 0) setDuration(dur);
            event.target.playVideo();
            setIsPlaying(true);
          },
          onStateChange: (event) => {
            if (!isMounted) return;
            if (event.data === YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === YT.PlayerState.ENDED) {
              setIsPlaying(false);
              if (!canPlayFull) {
                setClipEnded(true);
              }
            }
          }
        }
      });

      // Synchronize playhead position
      pollTimer = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          try {
            const curr = playerRef.current.getCurrentTime() || 0;
            const dur = playerRef.current.getDuration() || 0;
            setCurrentTime(curr);
            if (dur > 0) setDuration(dur);

            // Handle preview clip auto-cutoff
            if (!canPlayFull && curr >= endTime) {
              playerRef.current.pauseVideo();
              setIsPlaying(false);
              setClipEnded(true);
            }
          } catch (_) {}
        }
      }, 250);
    });

    return () => {
      isMounted = false;
      if (pollTimer) clearInterval(pollTimer);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (_) {}
        playerRef.current = null;
      }
    };
  }, [activeVideoId, initialStartTime, canPlayFull, endTime, playerId]);

  // Safe Play / Pause Toggle
  const togglePlay = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch (_) {}
  }, [isPlaying]);

  // Skip -10s or +10s
  const handleSkip = useCallback((seconds, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!playerRef.current) return;
    try {
      const curr = playerRef.current.getCurrentTime() || currentTime;
      const target = Math.max(0, Math.min(duration || 999999, curr + seconds));
      playerRef.current.seekTo(target, true);
      setCurrentTime(target);
    } catch (_) {}
  }, [currentTime, duration]);

  // Interactive Seek Slider
  const handleSeek = (e) => {
    const target = Number(e.target.value);
    setCurrentTime(target);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(target, true);
      } catch (_) {}
    }
  };

  // Volume & Mute Controls
  const handleVolumeChange = (e) => {
    const newVol = Number(e.target.value);
    setVolume(newVol);
    if (playerRef.current) {
      try {
        if (newVol === 0) {
          playerRef.current.mute();
          setIsMuted(true);
        } else {
          if (isMuted) {
            playerRef.current.unMute();
            setIsMuted(false);
          }
          playerRef.current.setVolume(newVol);
        }
      } catch (_) {}
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    try {
      if (isMuted) {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume > 0 ? volume : 80);
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch (_) {}
  };

  // Playback Speed Selector
  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      try {
        playerRef.current.setPlaybackRate(rate);
      } catch (_) {}
    }
    setShowSpeedMenu(false);
  };

  // Subtitles / Captions Toggle
  const toggleCaptions = () => {
    if (!playerRef.current) return;
    try {
      if (isCaptionsOn) {
        if (typeof playerRef.current.unloadModule === 'function') {
          playerRef.current.unloadModule('captions');
        }
        setIsCaptionsOn(false);
      } else {
        if (typeof playerRef.current.loadModule === 'function') {
          playerRef.current.loadModule('captions');
        }
        setIsCaptionsOn(true);
      }
    } catch (_) {
      setIsCaptionsOn(!isCaptionsOn);
    }
  };

  // Save bookmarks
  const saveBookmarksList = (list) => {
    setBookmarks(list);
    try {
      localStorage.setItem(studentStorageKey, JSON.stringify(list));
    } catch (_) {}
  };

  const handleAddBookmark = (e) => {
    e?.preventDefault();
    if (!newNoteText.trim()) return;

    const timeToUse = customTimeInput && customTimeInput !== '00:00' ? customTimeInput : currentFormattedTime;
    const parts = timeToUse.split(':').map(Number);
    const targetSec = parts.length === 2 ? (parts[0] * 60 + parts[1]) : Math.floor(currentTime);

    const newBm = {
      id: `bm-${Date.now()}`,
      timeFormatted: timeToUse,
      seconds: targetSec,
      note: newNoteText.trim(),
      createdAt: new Date().toLocaleDateString('bn-BD')
    };

    const updated = [newBm, ...bookmarks];
    saveBookmarksList(updated);
    setNewNoteText('');
  };

  const handleDeleteBookmark = (bmId) => {
    const updated = bookmarks.filter((b) => b.id !== bmId);
    saveBookmarksList(updated);
  };

  const handleJumpToBookmark = (sec) => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(sec, true);
        playerRef.current.playVideo();
        setIsPlaying(true);
      } catch (_) {}
    }
    setCurrentTime(sec);
  };

  const handleReplayClip = () => {
    setClipEnded(false);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(initialStartTime, true);
        playerRef.current.playVideo();
        setIsPlaying(true);
      } catch (_) {}
    }
    setCurrentTime(initialStartTime);
  };

  // Fullscreen Management
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const toggleLandscapeFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
        if (window.screen?.orientation?.lock) {
          await window.screen.orientation.lock('landscape').catch(() => {});
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        if (window.screen?.orientation?.unlock) {
          window.screen.orientation.unlock();
        }
      }
    } catch (_) {
      toggleFullscreen();
    }
  };

  // Anti-Piracy Keyboard Inspect Lock & Global Keybindings
  useEffect(() => {
    lockBodyScroll();
    const handleKeyDown = (e) => {
      // Allow typing in note text input
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        if (e.key === 'Escape') onClose?.();
        return;
      }

      // Block devtools, inspect shortcuts, view-source and print
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && ['U', 'S', 'P'].includes(e.key.toUpperCase())) ||
        (e.metaKey && e.altKey && ['I', 'J', 'C', 'U'].includes(e.key.toUpperCase()))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Video Controls Keyboard Shortcuts
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSkip(10);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      unlockBodyScroll();
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [onClose, togglePlay, handleSkip, isMuted, volume]);

  // Intercept right-click and selection across player modal
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const preventContext = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    el.addEventListener('contextmenu', preventContext, { capture: true });
    el.addEventListener('selectstart', preventContext, { capture: true });
    return () => {
      el.removeEventListener('contextmenu', preventContext, { capture: true });
      el.removeEventListener('selectstart', preventContext, { capture: true });
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div
        ref={containerRef}
        className={`relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isFullscreen ? 'h-screen w-screen max-w-none rounded-none border-0' : 'max-h-[95vh]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="bg-slate-950/95 border-b border-slate-800/80 px-3 sm:px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              ⚖️
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 uppercase tracking-wider truncate max-w-[140px] sm:max-w-xs">
                  {courseTitle || 'BJS & Bar Masterclass'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="text-[9px] font-mono text-emerald-400 font-bold hidden md:inline">CLASSROOM</span>
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md lg:max-w-lg">
                {currentActiveTitle || title || 'Lecture Video'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Sidebar View Toggle Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isSidebarOpen
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
              }`}
              title={isSidebarOpen ? 'সাইডবার লুকান (পূর্ণ ভিডিও ভিউ)' : 'সাইডবার খুলুন (লেসন, নোটস ও AI)'}
            >
              {isSidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              <span className="hidden sm:inline">{isSidebarOpen ? 'থিযাটার ভিউ' : 'লেসন ও নোটস'}</span>
              {bookmarks.length > 0 && !isSidebarOpen && (
                <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[9px] flex items-center justify-center font-mono">
                  {bookmarks.length}
                </span>
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all font-bold text-sm hidden sm:flex cursor-pointer"
              title="ফুলস্ক্রিন (F)"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-rose-900/80 text-slate-300 hover:text-white flex items-center justify-center transition-all font-bold text-sm cursor-pointer"
              title="বন্ধ করুন (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Player + Modular Classroom Split Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-black">
          {/* Main Video View - Responsive full-width 16:9 container */}
          <div
            className="w-full aspect-video lg:aspect-auto max-h-[75vh] lg:max-h-none relative overflow-hidden bg-black select-none flex-1 group"
            style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }}
          >
            {/* 1. LOCKED YouTube iframe Container - 100% pointer-events-none to prevent redirects */}
            <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden bg-black">
              {activeVideoId ? (
                <div id={playerId} className="w-full h-full pointer-events-none border-0" />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-rose-400 p-6 text-center">
                  <span className="text-4xl mb-2">📹</span>
                  <p className="font-bold text-lg">ভিডিও এখনো আপলোড করা হয়নি</p>
                </div>
              )}
            </div>

            {/* 2. Safe Transparent Click-to-Play/Pause Overlay (Covers the whole video) */}
            <div
              className="absolute inset-0 z-20 cursor-pointer pointer-events-auto flex items-center justify-center"
              onClick={togglePlay}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }}
              title="প্লে / পজ করতে ক্লিক করুন"
            >
              {/* Centered Pause Indicator Badge */}
              {!isPlaying && isPlayerReady && !clipEnded && (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 backdrop-blur-sm border border-amber-500/50 text-amber-400 flex items-center justify-center shadow-2xl transition-transform hover:scale-110">
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 ml-1 fill-current" />
                </div>
              )}
            </div>

            {/* 3. Top Security Shield Banner - pointer-events-none */}
            <div className="absolute top-0 left-0 right-0 h-12 z-30 pointer-events-none bg-gradient-to-b from-black/80 via-black/30 to-transparent select-none">
              <div className="flex items-center justify-between px-3 pt-2 text-[10px] text-amber-400/90 font-bold select-none">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>🔒 BJS Academy Protected Stream</span>
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  STU: {student?.id || 'AUTH-SECURE'}
                </span>
              </div>
            </div>

            {/* 4. Dynamic Moving Watermark Overlay (Anti-Piracy Screen Recording Protection) */}
            <div
              className="pointer-events-none absolute z-30 select-none transition-all duration-1000 ease-in-out"
              style={{
                top: watermarkPositions[watermarkIndex].top,
                left: watermarkPositions[watermarkIndex].left,
                opacity: 0.35
              }}
            >
              <div className="bg-black/80 backdrop-blur-[2px] border border-white/20 px-3 py-1.5 rounded-lg text-white font-mono text-[11px] font-bold flex items-center gap-2 shadow-2xl tracking-wider select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{student?.name || 'BJS STUDENT'}</span>
                <span className="text-amber-300 font-mono">| {student?.phone || '01XXXXXXXXX'}</span>
                <span className="text-slate-300 font-mono text-[10px]">
                  ID: {student?.id || student?.regId || 'SECURE'}
                </span>
              </div>
            </div>

            {/* 5. Custom Bottom Player Control Bar (Fully Interactive & Safe from YouTube Redirects) */}
            <div
              className="absolute bottom-0 left-0 right-0 z-40 pointer-events-auto bg-gradient-to-t from-black via-black/80 to-transparent p-2.5 sm:px-4 sm:py-3 space-y-1.5 sm:space-y-2 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Seek Bar Timeline Slider */}
              <div className="relative flex items-center cursor-pointer py-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.5}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 sm:h-2 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 focus:outline-none transition-all"
                  style={{
                    background: `linear-gradient(to right, #f59e0b ${(currentTime / (duration || 1)) * 100}%, rgba(51, 65, 85, 0.8) ${(currentTime / (duration || 1)) * 100}%)`
                  }}
                  title="টাইমলাইন এগিয়ে বা পিছিয়ে নিন"
                />
              </div>

              {/* Control Buttons Row */}
              <div className="flex items-center justify-between text-white text-xs gap-2">
                {/* Left Controls: Play/Pause, -10s, +10s, Volume, Time Display */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={togglePlay}
                    className="p-1.5 sm:p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 hover:text-amber-300 border border-amber-500/30 transition-all cursor-pointer shadow-md"
                    title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={(e) => handleSkip(-10, e)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    title="-10 সেকেন্ড পেছনে যান"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-mono hidden sm:inline">-10s</span>
                  </button>

                  <button
                    onClick={(e) => handleSkip(10, e)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                    title="+10 সেকেন্ড সামনে যান"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-mono hidden sm:inline">+10s</span>
                  </button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={toggleMute}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                      title={isMuted ? 'আনমিউট করুন (M)' : 'মিউট করুন (M)'}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : volume < 50 ? (
                        <Volume1 className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-14 sm:w-20 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-amber-500 focus:outline-none hidden sm:block"
                      title={`ভলিউম: ${isMuted ? 0 : volume}%`}
                    />
                  </div>

                  {/* Live Duration Display */}
                  <div className="font-mono text-[10px] sm:text-xs text-slate-300 ml-1">
                    <span className="text-amber-400 font-bold">{currentFormattedTime}</span>
                    <span className="text-slate-500 mx-1">/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Right Controls: CC, Speed, Fullscreen */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Subtitles / CC Toggle */}
                  <button
                    onClick={toggleCaptions}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                      isCaptionsOn
                        ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                        : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title="সাবটাইটেল / CC অন/অফ করুন"
                  >
                    <Subtitles className="w-3.5 h-3.5" />
                    <span className="text-[10px] hidden sm:inline">CC</span>
                  </button>

                  {/* Speed Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 border border-slate-700"
                      title="প্লেব্যাক স্পিড পরিবর্তন করুন"
                    >
                      <span>{playbackRate}x</span>
                    </button>

                    {showSpeedMenu && (
                      <div className="absolute bottom-full right-0 mb-2 py-1 w-24 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 animate-fadeIn">
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 px-2.5 py-1 font-bold border-b border-slate-800">
                          Speed
                        </div>
                        {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => handleSpeedChange(spd)}
                            className={`w-full px-2.5 py-1.5 text-left text-xs font-mono font-bold flex items-center justify-between transition-colors ${
                              playbackRate === spd
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <span>{spd}x</span>
                            {playbackRate === spd && <Check className="w-3 h-3 text-amber-400" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fullscreen Button */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title={isFullscreen ? 'ফুলস্ক্রিন থেকে বের হন (F)' : 'ফুলস্ক্রিন করুন (F)'}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Non-Enrolled Smart Clip Ended: Course Enrollment Overlay */}
            {!canPlayFull && clipEnded && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 text-center z-50 animate-fadeIn">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl sm:text-4xl mb-3 shadow-xl animate-bounce">
                  🔒
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-2">
                  ফ্রি রেফারেন্স ক্লিপ সমাপ্ত
                </span>
                <h3 className="text-base sm:text-xl font-extrabold text-white max-w-md">
                  সম্পূর্ণ ক্লাস পেতে <span className="text-amber-400">"{courseTitle || 'এই কোর্স'}"</span>-এ ভর্তি হোন
                </h3>
                <div className="flex items-center gap-3 mt-5 flex-wrap justify-center">
                  <button
                    onClick={() => {
                      if (onEnrollClick) onEnrollClick(courseId);
                      else onClose?.();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs sm:text-sm shadow-xl transition-all hover:scale-105 cursor-pointer"
                  >
                    🎓 কোর্সে ভর্তি হোন (Enroll Now)
                  </button>
                  <button
                    onClick={handleReplayClip}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm cursor-pointer hover:bg-slate-700"
                  >
                    🔄 আবার ক্লিপটি দেখুন
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: THEATER CLASSROOM (3 Modular Tabs) */}
          {isSidebarOpen && (
            <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-72 lg:h-auto overflow-hidden animate-fadeIn shrink-0">
              {/* Sidebar 3-Tab Navigator */}
              <div className="p-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-1 shrink-0">
                <button
                  onClick={() => setSidebarTab('lessons')}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    sidebarTab === 'lessons'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ListVideo className="w-3.5 h-3.5" />
                  <span>লেসন তালিকা</span>
                  {courseLessons.length > 0 && (
                    <span className="text-[10px] font-mono px-1 rounded bg-black/20">
                      {courseLessons.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setSidebarTab('notes')}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    sidebarTab === 'notes'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <BookMarked className="w-3.5 h-3.5" />
                  <span>নোটস</span>
                  {bookmarks.length > 0 && (
                    <span className="text-[10px] font-mono px-1 rounded bg-black/20">
                      {bookmarks.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setSidebarTab('ai')}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    sidebarTab === 'ai'
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-cyan-400 hover:text-cyan-300 hover:bg-slate-800'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>AI সহকারী</span>
                </button>
              </div>

              {/* TAB 1: LESSONS LIST */}
              {sidebarTab === 'lessons' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[11px] text-slate-400">
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <span>📚</span> কোর্সের মোট ক্লাস ({courseLessons.length})
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">ক্লিক করে প্লে করুন</span>
                  </div>

                  {loadingLessons ? (
                    <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p>লেসন তালিকা লোড হচ্ছে...</p>
                    </div>
                  ) : courseLessons.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs space-y-1">
                      <p>এই কোর্সে এখনো কোনো অতিরিক্ত লেসন নেই।</p>
                      <p className="text-[10px] text-slate-600">বর্তমানে সক্রিয় লেকচারটি উপরে চলছে।</p>
                    </div>
                  ) : (
                    courseLessons.map((lesson, idx) => {
                      const lessonVid = resolveVideoId(lesson.youtubeId || lesson.videoId);
                      const isCurrent = lessonVid === activeVideoId;
                      return (
                        <div
                          key={lesson.id || lesson._id || idx}
                          onClick={() => {
                            if (lessonVid) {
                              setCurrentActiveVideoId(lessonVid);
                              setCurrentActiveTitle(lesson.title || `Class ${idx + 1}`);
                              setCurrentTime(0);
                              setClipEnded(false);
                            }
                          }}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 group ${
                            isCurrent
                              ? 'bg-amber-500/15 border-amber-500/50 shadow-md'
                              : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
                                isCurrent
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-400 group-hover:text-white'
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p
                                className={`text-xs font-bold leading-snug truncate ${
                                  isCurrent ? 'text-amber-300' : 'text-slate-200 group-hover:text-white'
                                }`}
                              >
                                {lesson.title}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span>{lesson.module || 'মডিউল'}</span>
                                {lesson.duration && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono">{lesson.duration}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {isCurrent ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 shrink-0 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                              <span>চলছে</span>
                            </span>
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 2: TIMESTAMP NOTES & BOOKMARKS */}
              {sidebarTab === 'notes' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      <FileText className="w-3.5 h-3.5" />
                      <span>ক্লাস নোটপ্যাড ও বুকমার্ক</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">সময়: {currentFormattedTime}</span>
                  </div>

                  {/* Add Bookmark Form */}
                  <form onSubmit={handleAddBookmark} className="p-2.5 border-b border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomTimeInput(currentFormattedTime)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-mono font-bold border border-slate-700 cursor-pointer"
                        title="বর্তমান সময় সেট করুন"
                      >
                        ⏱️ বর্তমান ({currentFormattedTime})
                      </button>
                      <input
                        type="text"
                        value={customTimeInput}
                        onChange={(e) => setCustomTimeInput(e.target.value)}
                        placeholder="MM:SS"
                        className="w-16 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-amber-400 text-xs font-mono text-center focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        placeholder="এই মুহূর্তের গুরুত্বপূর্ণ নোট লিখুন..."
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>সেভ</span>
                      </button>
                    </div>
                  </form>

                  {/* Saved Bookmarks List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {bookmarks.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs space-y-1">
                        <p>💡 কোনো নোট বা বুকমার্ক সেভ করা নেই।</p>
                        <p className="text-[10px] text-slate-600">ক্লাস চলাকালীন গুরুত্বপূর্ণ পয়েন্ট বুকমার্ক করে রাখুন।</p>
                      </div>
                    ) : (
                      bookmarks.map((bm) => (
                        <div
                          key={bm.id}
                          className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/40 transition-all flex items-start justify-between gap-2 group"
                        >
                          <button
                            onClick={() => handleJumpToBookmark(bm.seconds)}
                            className="flex-1 text-left space-y-0.5 cursor-pointer"
                            title="এই সময় থেকে ভিডিও প্লে করুন"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                                <Play className="w-2.5 h-2.5 fill-current" />
                                {bm.timeFormatted}
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 line-clamp-2 leading-snug">{bm.note}</p>
                          </button>
                          <button
                            onClick={() => handleDeleteBookmark(bm.id)}
                            className="text-slate-600 hover:text-rose-400 p-1 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: INTERACTIVE GEMINI AI LEGAL ASSISTANT */}
              {sidebarTab === 'ai' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Gemini AI আইন সহকারী</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">ক্লাসরুম সাপোর্ট</span>
                  </div>

                  {/* Quick Legal Prompt Suggestions */}
                  <div className="p-2 border-b border-slate-800/80 bg-slate-950/40 flex flex-wrap gap-1">
                    {[
                      { label: '⚖️ ধারা ৯ CPC', q: 'দেওয়ানী কার্যবিধি ৯ ধারা দেওয়ানী আদালতের এখতিয়ার কি?' },
                      { label: '🚨 ৫৪ ধারা CrPC', q: 'CrPC 54 ধারায় পুলিশ কি বিনা পরোয়ানায় গ্রেফতার করতে পারে?' },
                      { label: '🛡️ জামিন নিয়ম', q: 'ফৌজদারী কার্যবিধির ৪৯৭ ধারায় জামিন মঞ্জুরের মূল শর্ত কি?' },
                      { label: '⏳ তামাদি ৫ ধারা', q: 'তামাদি আইন ৫ ধারা অনুসারে বিলম্ব মার্জনা কীভাবে হয়?' }
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendAi(chip.q)}
                        className="px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-700/60 text-slate-300 text-[10px] font-medium transition-all cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Messages Stream */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {aiMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[90%] p-2.5 rounded-2xl text-xs leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                              : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-line'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="flex items-center gap-2 text-cyan-400 text-xs p-2">
                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>AI আইন সহকারী উত্তর বিশ্লেষণ করছে...</span>
                      </div>
                    )}
                    <div ref={aiMessagesEndRef} />
                  </div>

                  {/* AI Input Box */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendAi();
                    }}
                    className="p-2 border-t border-slate-800 bg-slate-950 flex gap-1.5"
                  >
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder="আইনের ধারা বা প্রশ্ন জিজ্ঞাসা করুন..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="submit"
                      disabled={aiLoading || !aiInput.trim()}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Player Controls Footer */}
        <div className="bg-slate-950 border-t border-slate-800/80 px-3 sm:px-6 py-2.5 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-medium text-slate-300 truncate">
              {canPlayFull
                ? 'কোর্সের অন্যান্য ক্লাস প্লে করতে "লেসন তালিকা", নোট রাখতে "নোটস", অথবা আইনি ধারার তাৎক্ষণিক ব্যাখ্যার জন্য "AI সহকারী" ব্যবহার করুন।'
                : (clipEnded ? '⚠️ ফ্রি ক্লিপ শেষ হয়েছে।' : `⏳ ক্লিপ বাকি: ${formatTime(endTime - currentTime)} (${startFmt} - ${endFmt})`)}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleLandscapeFullscreen}
              className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold shrink-0 text-[10px] cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>মোবাইলে ঘুরিয়ে দেখুন (Landscape)</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
