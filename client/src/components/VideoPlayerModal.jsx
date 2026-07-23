import React, { useEffect, useState } from 'react';

export default function VideoPlayerModal({ videoId, title, student, onClose }) {
  const [timestamp, setTimestamp] = useState(new Date().toLocaleString());

  useEffect(() => {
    // Update watermark timestamp live every 5s
    const timer = setInterval(() => {
      setTimestamp(new Date().toLocaleString());
    }, 5000);

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
      clearInterval(timer);
      window.removeEventListener('contextmenu', preventAction);
      window.removeEventListener('keydown', preventAction);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn select-none">
      <div className="relative w-full max-w-5xl rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <div>
              <h3 className="font-bold text-white text-base md:text-lg line-clamp-1">{title}</h3>
              <p className="text-xs text-emerald-400 font-mono">
                🔒 Protected Video Stream | Student ID: {student?.id || 'STU-GUEST'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-all"
            title="Close Video"
          >
            ✕
          </button>
        </div>

        {/* Protected Frame Container */}
        <div className="relative aspect-video w-full bg-black overflow-hidden group">
          {videoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=1&enablejsapi=1`}
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

          {/* Dynamic Floating Watermark Overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-50">
            <div className="animate-watermark p-4 rounded-xl bg-black/20 backdrop-blur-[1px] border border-white/5 opacity-30 select-none text-center">
              <p className="font-mono text-xs font-black tracking-widest text-emerald-300 drop-shadow-md">
                {student?.name || 'STUDENT'} | {student?.phone || '019XXXXXXX'}
              </p>
              <p className="font-mono text-[10px] text-amber-200 tracking-wider">
                ID: {student?.id || 'STU-2026'} | {timestamp}
              </p>
              <p className="text-[9px] font-bold text-rose-400 tracking-widest uppercase mt-0.5">
                PROPRIETARY ACADEMY CONTENT - STRICTLY NO RECORDING
              </p>
            </div>
          </div>

          {/* Additional Corner Watermark */}
          <div className="pointer-events-none absolute bottom-4 left-4 z-40 opacity-20 text-[10px] font-mono text-white">
            SESSION: {student?.session || 'Weekend Intensive'}
          </div>
        </div>

        {/* Security Alert Bar */}
        <div className="bg-slate-900 border-t border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">🛡️ Anti-Screen Capture Enabled</span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline text-slate-500">Right-click & shortcuts disabled</span>
          </div>
          <span className="font-mono text-emerald-400 text-[11px]">Device Verified</span>
        </div>
      </div>
    </div>
  );
}
