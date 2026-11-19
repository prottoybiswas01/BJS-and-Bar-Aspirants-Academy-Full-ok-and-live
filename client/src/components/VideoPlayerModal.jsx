import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, Smartphone, ShieldCheck, X, BookMarked, FileText, Plus, Trash2, Play } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from './ui/scrollLock';

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

  const canPlayFull = clipOptions ? Boolean(clipOptions.canPlayFull || clipOptions.isEnrolled) : true;
  const initialStartTime = Number(clipOptions?.startTime || 0);
  const [playStartTime, setPlayStartTime] = useState(initialStartTime);
  const endTime = Number(clipOptions?.endTime || (initialStartTime + 60));
  const clipDuration = Math.max(endTime - initialStartTime, 15);
  const startFmt = clipOptions?.startFormatted || `${Math.floor(initialStartTime / 60)}:${String(initialStartTime % 60).padStart(2, '0')}`;
  const endFmt = clipOptions?.endFormatted || `${Math.floor(endTime / 60)}:${String(endTime % 60).padStart(2, '0')}`;

  const [clipEnded, setClipEnded] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(clipDuration);
  const [playerKey, setPlayerKey] = useState(1);

  // In-Video Timestamp Notepad & Bookmarking State
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
  const [elapsedSec, setElapsedSec] = useState(0);

  // Track rough playback elapsed timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [playerKey]);

  // Update current time candidate string
  const currentEstSeconds = playStartTime + elapsedSec;
  const estMinutes = Math.floor(currentEstSeconds / 60);
  const estSeconds = currentEstSeconds % 60;
  const currentEstFmt = `${String(estMinutes).padStart(2, '0')}:${String(estSeconds).padStart(2, '0')}`;

  // Save bookmarks to localStorage
  const saveBookmarksList = (list) => {
    setBookmarks(list);
    try {
      localStorage.setItem(studentStorageKey, JSON.stringify(list));
    } catch (e) {}
  };

  const handleAddBookmark = (e) => {
    e?.preventDefault();
    if (!newNoteText.trim()) return;

    const timeToUse = customTimeInput && customTimeInput !== '00:00' ? customTimeInput : currentEstFmt;
    const parts = timeToUse.split(':').map(Number);
    const targetSec = parts.length === 2 ? (parts[0] * 60 + parts[1]) : currentEstSeconds;

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
    setPlayStartTime(sec);
    setElapsedSec(0);
    setPlayerKey((k) => k + 1);
  };

  // Auto-pause and show Course Enrollment Card when preview clip completes
  useEffect(() => {
    if (canPlayFull) {
      setClipEnded(false);
      return;
    }

    setClipEnded(false);
    setSecondsLeft(clipDuration);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setClipEnded(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [canPlayFull, playerKey, clipDuration]);

  const handleReplayClip = () => {
    setClipEnded(false);
    setSecondsLeft(clipDuration);
    setPlayStartTime(initialStartTime);
    setElapsedSec(0);
    setPlayerKey((k) => k + 1);
  };

  const iframeSrc = canPlayFull
    ? `https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&start=${playStartTime}&rel=0&modestbranding=1&controls=1&showinfo=1&iv_load_policy=3&fs=1&disablekb=0&color=amber&enablejsapi=1`
    : `https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&start=${playStartTime}&end=${endTime}&rel=0&modestbranding=1&controls=1&showinfo=1&iv_load_policy=3&fs=1&disablekb=1&color=amber&enablejsapi=1`;

  // Body Scroll Lock & ESC key handling
  useEffect(() => {
    lockBodyScroll();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unlockBodyScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

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
    } catch (err) {
      toggleFullscreen();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div
        ref={containerRef}
        className={`relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isFullscreen ? 'h-screen w-screen max-w-none rounded-none border-0' : 'max-h-[95vh]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
            <div className="truncate">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                {courseTitle || 'BJS & Bar Masterclass'}
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-md sm:max-w-xl">
                {title || 'Lecture Video'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Notepad Drawer Toggle Button */}
            <button
              onClick={() => setShowNotesDrawer(!showNotesDrawer)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                showNotesDrawer
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
              }`}
              title="টাইমস্ট্যাম্প নোটপ্যাড ও বুকমার্ক"
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">নোটস ও বুকমার্ক</span>
              {bookmarks.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[9px] flex items-center justify-center font-mono">
                  {bookmarks.length}
                </span>
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all font-bold text-sm hidden sm:flex"
              title="ফুলস্ক্রিন"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-rose-900/80 text-slate-300 hover:text-white flex items-center justify-center transition-all font-bold text-sm"
              title="বন্ধ করুন (Close)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Player + Notes Split Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-black">
          {/* Main Video View */}
          <div className="relative aspect-video lg:aspect-auto flex-1 bg-black overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
            {/* Anti-Piracy Top Shield */}
            <div
              className="absolute top-0 left-0 right-0 h-14 z-30 pointer-events-auto bg-gradient-to-b from-black/85 via-black/40 to-transparent cursor-default select-none"
              onContextMenu={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-3 pt-2 text-[10px] text-amber-400/90 font-bold pointer-events-none select-none">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>🔒 BJS Academy Protected Stream</span>
                </span>
                <span className="text-[9px] text-slate-400 font-mono">STU: {student?.id || 'AUTH-SECURE'}</span>
              </div>
            </div>

            {activeVideoId ? (
              <iframe
                key={playerKey}
                src={iframeSrc}
                className="h-full w-full border-0 pointer-events-auto"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                title={title}
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-rose-400 p-6 text-center">
                <span className="text-4xl mb-2">📹</span>
                <p className="font-bold text-lg">ভিডিও এখনো আপলোড করা হয়নি</p>
              </div>
            )}

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
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs sm:text-sm shadow-xl transition-all hover:scale-105"
                  >
                    🎓 কোর্সে ভর্তি হোন (Enroll Now)
                  </button>
                  <button
                    onClick={handleReplayClip}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm"
                  >
                    🔄 আবার ক্লিপটি দেখুন
                  </button>
                </div>
              </div>
            )}

            {/* Micro-Watermark Overlay */}
            <div className="pointer-events-none absolute top-3 left-3 z-40">
              <div className="bg-slate-950/70 backdrop-blur-sm border border-slate-800/80 px-2.5 py-1 rounded-lg text-slate-300/80 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>{student?.name || 'Student'}</span>
                <span className="text-amber-400/90 font-mono text-[9px]">({student?.id || 'STU-2026'})</span>
              </div>
            </div>
          </div>

          {/* Collapsible / Side Notepad & Bookmarks Panel */}
          {showNotesDrawer && (
            <div className="w-full lg:w-80 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-64 lg:h-auto overflow-hidden animate-fadeIn">
              <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <FileText className="w-4 h-4" />
                  <span>ক্লাস নোটপ্যাড ও বুকমার্ক</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">সময়: {currentEstFmt}</span>
              </div>

              {/* Add Bookmark Form */}
              <form onSubmit={handleAddBookmark} className="p-3 border-b border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomTimeInput(currentEstFmt)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-mono font-bold border border-slate-700"
                    title="বর্তমান সময় সেট করুন"
                  >
                    ⏱️ বর্তমান ({currentEstFmt})
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
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0"
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
                        className="text-slate-600 hover:text-rose-400 p-1 transition-all opacity-0 group-hover:opacity-100"
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
        </div>

        {/* Player Controls Footer */}
        <div className="bg-slate-950 border-t border-slate-800/80 px-3 sm:px-6 py-2.5 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-medium text-slate-300 truncate">
              {canPlayFull
                ? 'ভিডিওর যেকোনো পয়েন্টে নোট বা বুকমার্ক যোগ করতে উপরের "নোটস ও বুকমার্ক" বাটনে ক্লিক করুন।'
                : (clipEnded ? '⚠️ ফ্রি ক্লিপ শেষ হয়েছে।' : `⏳ ক্লিপ বাকি: ${secondsLeft} সেঃ (${startFmt} - ${endFmt})`)}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleLandscapeFullscreen}
              className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold shrink-0 text-[10px]"
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
