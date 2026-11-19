import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, Smartphone, ShieldCheck, X } from 'lucide-react';
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
  const startTime = Number(clipOptions?.startTime || 0);
  const endTime = Number(clipOptions?.endTime || (startTime + 60));
  const clipDuration = Math.max(endTime - startTime, 15);
  const startFmt = clipOptions?.startFormatted || `${Math.floor(startTime / 60)}:${String(startTime % 60).padStart(2, '0')}`;
  const endFmt = clipOptions?.endFormatted || `${Math.floor(endTime / 60)}:${String(endTime % 60).padStart(2, '0')}`;

  const [clipEnded, setClipEnded] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(clipDuration);
  const [playerKey, setPlayerKey] = useState(1);

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
    setPlayerKey((k) => k + 1);
  };

  const iframeSrc = canPlayFull
    ? `https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&start=${startTime}&rel=0&modestbranding=1&controls=1&showinfo=1&iv_load_policy=3&fs=1&disablekb=0&color=amber&enablejsapi=1`
    : `https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&start=${startTime}&end=${endTime}&rel=0&modestbranding=1&controls=1&showinfo=1&iv_load_policy=3&fs=1&disablekb=1&color=amber&enablejsapi=1`;

  useEffect(() => {
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, []);

  useEffect(() => {
    // Prevent right-click & DevTools shortcuts
    const preventAction = (e) => {
      if (
        e.type === 'contextmenu' ||
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) ||
        (e.ctrlKey && e.keyCode === 85) ||
        (e.ctrlKey && e.keyCode === 83)
      ) {
        e.preventDefault();
        return false;
      }
      if (e.key === 'Escape' && !document.fullscreenElement && !document.webkitFullscreenElement) {
        onClose?.();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };

    window.addEventListener('contextmenu', preventAction);
    window.addEventListener('keydown', preventAction);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('contextmenu', preventAction);
      window.removeEventListener('keydown', preventAction);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleLandscapeFullscreen = async () => {
    const el = containerRef.current || document.getElementById('video-modal-container');
    if (!el) return;

    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
        // Try auto-locking screen to landscape on mobile
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          await window.screen.orientation.lock('landscape').catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
      }
    } catch (err) {
      console.log('Fullscreen toggle notice:', err);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/90 backdrop-blur-md p-1 sm:p-4 animate-fadeIn select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div 
        ref={containerRef}
        id="video-modal-container"
        className={`relative w-full max-w-6xl rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl flex flex-col ${
          isFullscreen ? 'h-full max-w-none rounded-none border-0' : ''
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-3 sm:px-6 py-2.5 bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 block truncate">
                  BJS ACADEMY SECURE STREAM
                </span>
                {canPlayFull ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    ✅ ফুল ক্লাস আনলকড
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    🎥 ফ্রি প্রিভিউ ক্লিপ ([{startFmt} - {endFmt}])
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-white text-xs sm:text-base truncate">{title || 'Authorized Class Lecture'}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Landscape Fullscreen Button */}
            <button
              onClick={toggleLandscapeFullscreen}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[11px] border border-amber-500/30 transition-all active:scale-95"
              title="ঘুরিয়ে ফুলস্ক্রিন দেখুন (Toggle Landscape Fullscreen)"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? 'ছোট করুন' : 'ল্যান্ডস্কেপ ফুলস্ক্রিন'}</span>
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

        {/* Video Player Container */}
        <div className="relative aspect-video w-full bg-black overflow-hidden flex-1 select-none" onContextMenu={(e) => e.preventDefault()}>
          {/* Anti-Piracy Top Shield: Blocks YouTube Title, Share, and Copy Link clicks */}
          <div
            className="absolute top-0 left-0 right-0 h-14 z-30 pointer-events-auto bg-gradient-to-b from-black/85 via-black/40 to-transparent cursor-default select-none"
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => e.stopPropagation()}
            title="BJS Academy Protected Stream"
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
              <p className="font-bold text-lg">ভিডিও এখনো আপলোড করা হয়নি (Video Pending)</p>
              <p className="text-xs text-slate-400 max-w-md mt-1">
                এই ক্লাসটির ভিডিও ফাইল প্রক্রিয়াধীন রয়েছে। ভিডিও আপলোড হওয়ামাত্রই এখানে লাইভ হবে।
              </p>
            </div>
          )}

          {/* Non-Enrolled Smart Clip Ended: Course Enrollment Overlay */}
          {!canPlayFull && clipEnded && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 text-center z-50 animate-fadeIn">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl sm:text-4xl mb-3 shadow-xl shadow-amber-500/10 animate-bounce">
                🔒
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-2">
                ফ্রি রেফারেন্স ক্লিপ সমাপ্ত
              </span>
              <h3 className="text-base sm:text-xl font-extrabold text-white max-w-md sm:max-w-xl">
                সম্পূর্ণ ক্লাস ও হ্যান্ডনোট পেতে <span className="text-amber-400">"{courseTitle || 'এই কোর্স'}"</span>-এ ভর্তি হোন
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 max-w-md mt-2 leading-relaxed">
                আপনি আপনার প্রশ্নের সাথে সম্পর্কিত সুনির্দিষ্ট ফ্রি রেফারেন্স ক্লিপটি সফলভাবে দেখেছেন। ক্লাসের সম্পূর্ণ লেকচার ভিডিও, রিটেন ও প্রিলিমিনারি হ্যান্ডনোট এবং নিয়মিত মডেল টেস্টে অংশ নিতে আজই এনরোল করুন।
              </p>
              <div className="flex items-center gap-3 mt-5 flex-wrap justify-center">
                <button
                  onClick={() => {
                    if (onEnrollClick) {
                      onEnrollClick(courseId);
                    } else {
                      onClose?.();
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/20 transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
                >
                  🎓 কোর্সে ভর্তি হোন (Enroll Now)
                </button>
                <button
                  onClick={handleReplayClip}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  🔄 আবার ক্লিপটি দেখুন
                </button>
              </div>
            </div>
          )}

          {/* Micro-Compact Semi-Transparent Watermark Overlay (Non-Intrusive for Mobile) */}
          <div className="pointer-events-none absolute top-3 left-3 z-40">
            <div className="bg-slate-950/70 backdrop-blur-sm border border-slate-800/80 px-2.5 py-1 rounded-lg text-slate-300/80 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>{student?.name || 'Student'}</span>
              <span className="text-amber-400/90 font-mono text-[9px]">({student?.id || 'STU-2026'})</span>
            </div>
          </div>

          {/* Subdued Low-Opacity Corner Watermark */}
          <div className="pointer-events-none absolute bottom-12 right-3 z-40 opacity-30 text-[9px] font-mono text-slate-300">
            SESSION: {student?.session || 'Wed,Sat'}
          </div>
        </div>

        {/* Player Controls Footer & Mobile Orientation Hint */}
        <div className="bg-slate-950 border-t border-slate-800/80 px-3 sm:px-6 py-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-medium text-slate-300 truncate">
              {canPlayFull
                ? 'ফুল কন্ট্রোলস এক্টিভ: ভিডিও ১০ সেঃ টানুন/পজ করুন।'
                : (clipEnded ? '⚠️ ফ্রি ক্লিপ শেষ হয়েছে।' : `⏳ ক্লিপ বাকি: ${secondsLeft} সেঃ (${startFmt} - ${endFmt})`)}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!canPlayFull && !clipEnded && (
              <button
                onClick={() => {
                  if (onEnrollClick) onEnrollClick(courseId);
                  else onClose?.();
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] transition-all cursor-pointer shadow-sm"
              >
                🎓 ফুল কোর্স আনলক করুন
              </button>
            )}

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
