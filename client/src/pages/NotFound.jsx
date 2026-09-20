import React from 'react';

export default function NotFound({ setActivePage }) {
  const handleNavigate = (page, path = '/') => {
    if (setActivePage) {
      setActivePage(page);
    }
    if (window.history?.pushState) {
      window.history.pushState({}, '', path);
    } else {
      window.location.href = path;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-12 text-center relative overflow-hidden">
      {/* Background Glowing Ambient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Glass Card */}
      <div className="max-w-2xl w-full p-8 sm:p-12 rounded-3xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-xl shadow-2xl space-y-6 relative">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold tracking-wider">
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          HTTP 404 • PAGE NOT FOUND
        </div>

        {/* 404 Visual Heading */}
        <div className="space-y-2">
          <h1 className="text-7xl sm:text-9xl font-black bg-gradient-to-r from-amber-400 via-rose-400 to-cyan-400 bg-clip-text text-transparent select-none tracking-tight">
            404
          </h1>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            পৃষ্ঠাটি খুঁজে পাওয়া যায়নি
          </h2>
        </div>

        {/* Informative Description */}
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
          দুঃখিত! আপনি যে লিঙ্কটিতে প্রবেশের চেষ্টা করছেন তা সরানো হয়েছে, লিঙ্কটির বানান ভুল রয়েছে অথবা সাময়িকভাবে অনুপলব্ধ রয়েছে।
        </p>

        {/* Quick Navigation Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => handleNavigate('home', '/')}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
          >
            <span>🏠</span> মূল পাতায় ফিরে যান
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('dashboard', '/dashboard')}
            className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 hover:border-slate-600 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>🎓</span> স্টুডেন্ট পোর্টাল
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('mentor-login', '/mentor-login')}
            className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 hover:border-slate-600 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>👨‍🏫</span> মেন্টর লগইন
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('admin', '/admin')}
            className="px-5 py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 text-amber-300 font-bold text-sm border border-amber-500/30 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>🔐</span> এডমিন প্রবেশদ্বার
          </button>
        </div>

        {/* Help & Support Footer */}
        <div className="pt-6 border-t border-slate-800/80 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2">
            <span>📞 সহায়তা ও হটলাইন:</span>
            <a href="tel:+8801716160460" className="text-amber-400 hover:underline">
              +880 1716-160460
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span>✉️ ইমেইল:</span>
            <a href="mailto:info@bjs.kodl.uk" className="text-cyan-400 hover:underline">
              info@bjs.kodl.uk
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
