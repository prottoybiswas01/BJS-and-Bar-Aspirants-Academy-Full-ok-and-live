import React, { useEffect, useState } from 'react';

export default function VideoPlayerModal({ videoId, title, student, onClose }) {
  useEffect(() => {
    // Disable right-click & DevTools shortcuts
    const preventAction = (e) => {
      if (
        e.type === 'contextmenu' ||
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || // Ctrl+Shift+I/J/C
        (e.ctrlKey && e.keyCode === 85) || // Ctrl+U
        (e.ctrlKey && e.keyCode === 83) // Ctrl+S
      ) {
        e.preventDefault();
        return false;
      }
    };

    window.addEventListener('contextmenu', preventAction);
    window.addEventListener('keydown', preventAction);

    return () => {
      window.removeEventListener('contextmenu', preventAction);
      window.removeEventListener('keydown', preventAction);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-fadeIn select-none">
      <div className="relative w-full max-w-6xl rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
        {/* Header matching Screenshot 2 */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                BJS ACADEMY SECURE STREAM
              </span>
              <h3 className="font-extrabold text-white text-sm sm:text-base line-clamp-1">{title || 'Authorized portal playback only'}</h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-block px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-bold border border-slate-700">
              STREAMING IN SECURE VIEW
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-all font-bold text-sm"
              title="Close Video"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Protected Video Container */}
        <div className="relative aspect-video w-full bg-black overflow-hidden group">
          {videoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=1&showinfo=0&iv_load_policy=3&fs=1&disablekb=0&color=white`}
              className="h-full w-full border-0 pointer-events-auto"
              allow="autoplay; encrypted-media"
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

          {/* Shield mask for bottom-right YouTube logo */}
          <div className="pointer-events-none absolute bottom-0 right-0 w-36 h-10 z-30 bg-gradient-to-t from-black/80 to-transparent"></div>

          {/* Ultra-Low Opacity Edge Drift Watermark (Low opacity, non-distracting 4-corner drift) */}
          <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
            <div className="animate-subtle-drift absolute opacity-[0.12] select-none text-[11px] font-mono font-bold text-slate-200 whitespace-nowrap tracking-wider">
              {student?.email || student?.phone || 'student@bjs.com'} • {student?.id || 'STU-2026-001'}
            </div>
          </div>

          {/* Screenshot 2 Exact Bottom-Right Permanent Student Badge */}
          <div className="pointer-events-none absolute bottom-4 right-4 z-40">
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-2xl shadow-2xl text-left border-l-2 border-l-amber-500">
              <p className="font-extrabold text-white text-xs sm:text-sm tracking-wide">
                {student?.name || 'Prottoy Kumar Biswas'}
              </p>
              <p className="font-mono text-[10px] text-amber-400 font-bold tracking-wider">
                ID {student?.id || 'STU-2026-001'}
              </p>
            </div>
          </div>

          {/* Left Corner Session Label */}
          <div className="pointer-events-none absolute bottom-4 left-4 z-40 opacity-30 text-[10px] font-mono text-slate-300">
            SESSION: {student?.session || 'Wed,Sat'}
          </div>
        </div>

        {/* Security Footer matching Screenshot 2 */}
        <div className="bg-slate-950 border-t border-slate-800/80 px-6 py-2.5 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="font-medium text-slate-300">
              Screen recording, link sharing, and third-party extraction are prohibited.
            </span>
          </div>
          <span className="font-mono text-amber-400/80 hidden sm:inline text-[10px]">
            • Visible only inside your active BJS Academy session.
          </span>
        </div>
      </div>
    </div>
  );
}
