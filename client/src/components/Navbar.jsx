import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activePage, setActivePage, toggleAiDrawer, openProfileModal }) {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-40 w-full bg-[#0b1325]/95 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo & Name */}
          <div 
            onClick={() => setActivePage('home')} 
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <span className="text-lg sm:text-2xl font-bold text-slate-950 font-serif">⚖️</span>
            </div>
            <div>
              <div className="text-xs sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>BJS & Bar Academy</span>
                <span className="hidden sm:inline-block text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  আইন পাঠশালা
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-400 font-medium">Judiciary & Advocacy Excellence Portal</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-2">
            {user && !user.isAdmin && !user.isMentor && (
              <button
                onClick={() => setActivePage('dashboard')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activePage === 'dashboard'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                Student Dashboard
              </button>
            )}
            {user && user.isMentor && (
              <button
                onClick={() => setActivePage('mentor-dashboard')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                  activePage === 'mentor-dashboard'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-amber-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                👨‍🏫 Mentor Dashboard
              </button>
            )}
          </div>

          {/* Action Buttons & Profile */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            {/* AI Assistant Button */}
            <button
              onClick={toggleAiDrawer}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-900/60 to-blue-900/60 border border-cyan-500/30 text-cyan-300 hover:border-cyan-400 text-[11px] sm:text-xs font-semibold shadow-md transition-all active:scale-95"
              title="Open Gemini AI Assistant"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="hidden sm:inline">Gemini AI Legal Assistant</span>
              <span className="sm:hidden font-bold">AI Helper</span>
            </button>

            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {!user.isAdmin && (
                  <button
                    onClick={openProfileModal}
                    className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-amber-500/50 transition-all text-left"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                      {user.name ? user.name[0].toUpperCase() : 'M'}
                    </div>
                    <div className="hidden md:block">
                      <p className="text-xs font-bold text-slate-200 line-clamp-1">{user.name}</p>
                      <p className="text-[10px] text-amber-400 font-mono">{user.isMentor ? 'MENTOR' : (user.id || 'STUDENT')}</p>
                    </div>
                  </button>
                )}

                <button
                  onClick={logout}
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/40 text-[11px] sm:text-xs font-extrabold flex items-center gap-1 transition-all shadow-md cursor-pointer"
                  title="Logout from Account"
                >
                  <span>🚪</span>
                  <span className="hidden sm:inline">লগআউট (Logout)</span>
                  <span className="sm:hidden">লগআউট</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <button
                  onClick={() => setActivePage('mentor-login')}
                  className="px-2 sm:px-3 py-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors hidden sm:block"
                >
                  👨‍🏫 মেন্টর লগইন
                </button>
                <button
                  onClick={() => setActivePage('login')}
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  লগইন
                </button>
                <button
                  onClick={() => setActivePage('register')}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-md shadow-amber-500/20 transition-all active:scale-95 whitespace-nowrap"
                >
                  <span className="hidden sm:inline">রেজিস্ট্রেশন করুন</span>
                  <span className="sm:hidden">ভর্তি হোন</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
