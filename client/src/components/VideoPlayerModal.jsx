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
  Check
} from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from './ui/scrollLock';
import './VideoPlayerModal.css';

const getFullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;

function requestHdPlayback(player) {
  // Current YouTube embeds select quality adaptively. Older players may honor this preference.
  if (typeof player.setPlaybackQuality !== 'function') return;
  try {
    const levels = player.getAvailableQualityLevels?.();
    const prefer720 = levels?.includes('hd720') && !levels.includes('hd1080');
    player.setPlaybackQuality(prefer720 ? 'hd720' : 'hd1080');
  } catch (_) {
    try {
      player.setPlaybackQuality('hd720');
    } catch (_) {}
  }
}

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
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef(null);
  const hasRequestedFullscreen = useRef(false);
  const isFullscreen = isNativeFullscreen || isExpanded;

  // Dynamic Moving Watermark Overlay Positions
  const watermarkPositions = [
    { top: '15%', left: '12%' },
    { top: '68%', left: '22%' },
    { top: '30%', left: '55%' },
    { top: '72%', left: '58%' },
    { top: '45%', left: '35%' },
    { top: '20%', left: '68%' }
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

  const activeVideoId = resolveVideoId(videoId);
  const activeTitle = title || 'Lecture Video';

  // Secret Student ID resolution (STU-...)
  const studentSecretId = student?.id?.startsWith('STU-')
    ? student.id
    : (student?.id ? `STU-${student.id.replace(/^STU-/, '')}` : (student?.regId ? `STU-${student.regId}` : 'STU-SECURE'));

  // Clip & Course Preview Options
  const canPlayFull = clipOptions ? Boolean(clipOptions.canPlayFull || clipOptions.isEnrolled) : true;
  const initialStartTime = Number(clipOptions?.startTime || 0);
  const endTime = Number(clipOptions?.endTime || (initialStartTime + 60));
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

  useEffect(() => {
    const container = containerRef.current;
    const orientation = window.screen?.orientation;
    let wasFullscreen = false;

    const syncFullscreen = () => {
      const entered = getFullscreenElement() === container;
      if (entered === wasFullscreen) return;
      wasFullscreen = entered;
      setIsNativeFullscreen(entered);
      if (entered) {
        setIsExpanded(false);
        orientation?.lock?.('landscape').catch(() => {});
      } else {
        orientation?.unlock?.();
      }
    };

    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);
      if (wasFullscreen) orientation?.unlock?.();
    };
  }, []);

  const openFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container || getFullscreenElement() === container) return;
    hasRequestedFullscreen.current = true;
    const requestFullscreen = container.requestFullscreen || container.webkitRequestFullscreen;
    if (requestFullscreen) {
      try {
        await requestFullscreen.call(container);
        return;
      } catch (_) {}
    }
    if (containerRef.current === container) setIsExpanded(true);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (getFullscreenElement() === containerRef.current) {
      const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
      try {
        await exitFullscreen?.call(document);
      } catch (_) {}
    } else if (isExpanded) {
      setIsExpanded(false);
    } else {
      await openFullscreen();
    }
  }, [isExpanded, openFullscreen]);

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

      const autoplay = !isTouchDevice();
      playerRef.current = new YT.Player(playerId, {
        videoId: activeVideoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: Number(autoplay),
          vq: 'hd1080',
          hd: 1,
          controls: 0,         // Hide all native YouTube controls
          rel: 0,
          modestbranding: 1,
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
            requestHdPlayback(event.target);
            const dur = event.target.getDuration() || 0;
            if (dur > 0) setDuration(dur);
            if (autoplay) event.target.playVideo();
          },
          onStateChange: (event) => {
            if (!isMounted) return;
            if (event.data === YT.PlayerState.PLAYING) {
              requestHdPlayback(event.target);
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

  const playVideo = useCallback(() => {
    if (!playerRef.current) return;
    if (isTouchDevice() && !hasRequestedFullscreen.current) {
      void openFullscreen();
    }
    playerRef.current.playVideo();
  }, [openFullscreen]);

  // Safe Play / Pause Toggle
  const togglePlay = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isPlayerReady || !playerRef.current || clipEnded) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playVideo();
      }
    } catch (_) {}
  }, [isPlayerReady, isPlaying, clipEnded, playVideo]);

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
        playVideo();
      } catch (_) {}
    }
    setCurrentTime(sec);
  };

  const handleReplayClip = () => {
    setClipEnded(false);
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(initialStartTime, true);
        playVideo();
      } catch (_) {}
    }
    setCurrentTime(initialStartTime);
  };

  // Anti-Piracy Keyboard Inspect Lock & Global Keybindings
  useEffect(() => {
    lockBodyScroll();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) toggleFullscreen();
        else onClose?.();
        return;
      }
      // Allow typing in note text input
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;

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
      if (e.code === 'Space' && e.target?.tagName !== 'BUTTON') {
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
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      unlockBodyScroll();
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [onClose, togglePlay, handleSkip, isMuted, volume, isFullscreen, toggleFullscreen]);

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
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 animate-fadeIn">
      <div
        ref={containerRef}
        className={`video-player-modal${isFullscreen ? ' is-expanded' : ''}`}
      >
        {/* Top Header Bar */}
        <div className="bg-slate-950/95 border-b border-slate-800/80 px-3 sm:px-5 py-1.5 flex items-center justify-between gap-3 shrink-0">
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
              <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md lg:max-w-xl">
                {activeTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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

        {/* The frame and its click-blocking overlays share the same 16:9 bounds. */}
        <div
          className="video-player-stage w-full relative bg-black select-none"
          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }}
        >
          <div className="video-player-frame relative overflow-hidden">
            {/* 1. LOCKED YouTube iframe Container - 100% pointer-events-none */}
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

            {/* 2. Safe Transparent Click-to-Play/Pause Overlay */}
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
              {!isPlaying && isPlayerReady && !clipEnded && (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/60 border border-amber-500/50 text-amber-400 flex items-center justify-center shadow-2xl">
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-1 fill-current" />
                </div>
              )}
            </div>

            {/* 3. Top Security Shield Banner - pointer-events-none */}
            <div className="absolute top-0 left-0 right-0 h-10 z-30 pointer-events-none bg-gradient-to-b from-black/80 via-black/30 to-transparent select-none">
              <div className="flex items-center justify-between px-3 pt-2 text-[10px] text-amber-400/90 font-bold select-none">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>🔒 BJS Academy Protected Stream</span>
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {studentSecretId}
                </span>
              </div>
            </div>

            {/* 4. Moving student watermark */}
            <div
              className="pointer-events-none absolute inset-x-2 z-30 select-none transition-[top,padding] duration-1000 ease-in-out"
              style={{
                top: watermarkPositions[watermarkIndex].top,
                paddingLeft: watermarkPositions[watermarkIndex].left
              }}
            >
              <span className="inline-block max-w-full break-words text-[10px] sm:text-xs font-semibold leading-tight text-white/50 [text-shadow:0_1px_2px_#000]">
                {student?.name || 'STUDENT'} • {studentSecretId}
              </span>
            </div>
          </div>

          {!canPlayFull && clipEnded && (
            <div className="absolute inset-0 bg-slate-950/95 flex overflow-y-auto p-3 text-center z-50">
              <div className="m-auto space-y-2">
                <p className="text-xs font-bold text-amber-300">🔒 ফ্রি রেফারেন্স ক্লিপ সমাপ্ত</p>
                <h3 className="text-sm sm:text-xl font-extrabold text-white">
                  সম্পূর্ণ ক্লাস পেতে <span className="text-amber-400">"{courseTitle || 'এই কোর্স'}"</span>-এ ভর্তি হোন
                </h3>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <button
                    onClick={() => {
                      if (onEnrollClick) onEnrollClick(courseId);
                      else onClose?.();
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    🎓 কোর্সে ভর্তি হোন (Enroll Now)
                  </button>
                  <button
                    onClick={handleReplayClip}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-700"
                  >
                    🔄 আবার ক্লিপটি দেখুন
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Custom playback controls take up their own space below the video. */}
        <div
          className="relative z-40 shrink-0 bg-black px-2 sm:px-4 pb-1 select-none"
          hidden={!canPlayFull && clipEnded}
        >
          {/* Seek Bar Timeline Slider */}
          <div className="flex items-center gap-2 py-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={handleSeek}
              className="min-w-0 flex-1 h-1.5 sm:h-2 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400"
              style={{
                background: `linear-gradient(to right, #f59e0b ${(currentTime / (duration || 1)) * 100}%, rgba(51, 65, 85, 0.8) ${(currentTime / (duration || 1)) * 100}%)`
              }}
              title="টাইমলাইন এগিয়ে বা পিছিয়ে নিন"
            />
            <div className="shrink-0 whitespace-nowrap font-mono text-[10px] sm:text-xs text-slate-300 tabular-nums">
              <span className="text-amber-400 font-bold">{currentFormattedTime}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons Row */}
          <div className="flex flex-wrap items-center justify-between text-white text-xs gap-x-0.5 gap-y-1 sm:justify-start sm:gap-2">
            <button
              onClick={togglePlay}
              className="video-player-control rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 hover:text-amber-300 border border-amber-500/30"
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
              className="video-player-control rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
              title="-10 সেকেন্ড পেছনে যান"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono hidden sm:inline">-10s</span>
            </button>

            <button
              onClick={(e) => handleSkip(10, e)}
              className="video-player-control rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
              title="+10 সেকেন্ড সামনে যান"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono hidden sm:inline">+10s</span>
            </button>

            {/* Volume Control */}
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="video-player-control rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
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

            <button
              onClick={toggleCaptions}
              className={`video-player-control rounded-lg text-[11px] font-bold sm:ml-auto ${
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
            <div>
              <button
                onClick={() => setShowSpeedMenu((open) => !open)}
                className="video-player-control rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] sm:text-[11px] font-mono font-bold border border-slate-700"
                title="প্লেব্যাক স্পিড পরিবর্তন করুন"
                aria-expanded={showSpeedMenu}
              >
                <span>{playbackRate}x</span>
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full right-2 sm:right-4 mb-2 py-1 w-24 max-h-[45dvh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 animate-fadeIn">
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
              className="video-player-control rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
              title={isFullscreen ? 'ফুলস্ক্রিন থেকে বের হন (F)' : 'ফুলস্ক্রিন করুন (F)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Clean Timestamped Notes Section - ONLY Notes Section below locked video */}
        <div className="video-player-extra flex-1 min-h-0 overflow-y-auto bg-slate-950 p-3 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-slate-800 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
                <BookMarked className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
                  <span>টাইমস্ট্যাম্পড ক্লাস নোটপ্যাড ও বুকমার্ক</span>
                  {bookmarks.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/30">
                      {bookmarks.length}
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-400">লেকচার চলাকালীন যেকোনো মুহূর্তের গুরুত্বপূর্ণ পয়েন্ট ও আইনি ধারা নোট করে রাখুন</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono text-slate-400">বর্তমান সময়:</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-400 font-mono text-xs font-bold">
                ⏱️ {currentFormattedTime}
              </span>
            </div>
          </div>

          {/* Add Bookmark / Note Form */}
          <form onSubmit={handleAddBookmark} className="p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCustomTimeInput(currentFormattedTime)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-mono font-bold border border-slate-700 cursor-pointer transition-all active:scale-95"
                  title="বর্তমান ভিডিও সময় ইনপুটে সেট করুন"
                >
                  ⏱️ বর্তমান ({currentFormattedTime})
                </button>
                <input
                  type="text"
                  value={customTimeInput}
                  onChange={(e) => setCustomTimeInput(e.target.value)}
                  placeholder="MM:SS"
                  className="w-16 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-amber-400 text-xs font-mono text-center focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="এই মুহূর্তের গুরুত্বপূর্ণ নোট বা আইনি ধারা লিখুন..."
                  className="min-w-0 flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>নোট সেভ</span>
                </button>
              </div>
            </div>
          </form>

          {/* Saved Bookmarks List */}
          <div className="space-y-2">
            {bookmarks.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs space-y-1 bg-slate-900/40 rounded-xl border border-slate-800/80 p-4">
                <p className="text-slate-400 font-bold">💡 এই ক্লাসে এখনো কোনো টাইমস্ট্যাম্পড নোট নেই।</p>
                <p className="text-[11px] text-slate-500">ক্লাস চলাকালীন গুরুত্বপূর্ণ পয়েন্ট বুকমার্ক করে রাখুন। ক্লিক করলেই সরাসরি ঐ সময়ে জাম্প করবে।</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-all flex items-start justify-between gap-2.5 group shadow-sm"
                  >
                    <button
                      onClick={() => handleJumpToBookmark(bm.seconds)}
                      className="flex-1 text-left space-y-1 cursor-pointer"
                      title="এই সময় থেকে ভিডিও প্লে করুন"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30 flex items-center gap-1 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                          <Play className="w-2.5 h-2.5 fill-current" />
                          {bm.timeFormatted}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{bm.createdAt}</span>
                      </div>
                      <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">{bm.note}</p>
                    </button>
                    <button
                      onClick={() => handleDeleteBookmark(bm.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                      title="নোট মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Player Controls Footer */}
        <div className="video-player-extra bg-slate-950 border-t border-slate-800/80 px-3 sm:px-6 py-2.5 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-medium text-slate-300 truncate">
              {canPlayFull
                ? '🔒 সুরক্ষিত ভিডিও স্ট্রিমিং ও ব্যক্তিগত টাইমস্ট্যাম্পড নোটস সক্রিয়।'
                : (clipEnded ? '⚠️ ফ্রি ক্লিপ শেষ হয়েছে।' : `⏳ ক্লিপ বাকি: ${formatTime(endTime - currentTime)} (${startFmt} - ${endFmt})`)}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleFullscreen}
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
