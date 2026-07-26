import React, { useEffect, useState, useRef } from 'react';
import { Maximize2, Minimize2, Smartphone, ShieldCheck, X } from 'lucide-react';

export default function VideoPlayerModal({ videoId, title, student, onClose }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-1 sm:p-4 animate-fadeIn select-none">
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
              <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 block truncate">
                BJS ACADEMY SECURE STREAM
              </span>
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
        <div className="relative aspect-video w-full bg-black overflow-hidden flex-1">
          {videoId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=1&showinfo=1&iv_load_policy=3&fs=1&disablekb=0&color=amber&enablejsapi=1`}
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

          {/* Micro-Compact Semi-Transparent Watermark Overlay (Non-Intrusive for Mobile) */}
          <div className="pointer-events-none absolute top-3 left-3 z-40">
            <div className="bg-slate-950/70 backdrop-blur-sm border border-slate-800/80 px-2.5 py-1 rounded-lg text-slate-300/80 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>{student?.name || 'Prottoy'}</span>
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
              ফুল কন্ট্রোলস এক্টিভ: ভিডিও ১০ সেঃ টানুন/পজ করুন।
            </span>
          </div>

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
  );
}
