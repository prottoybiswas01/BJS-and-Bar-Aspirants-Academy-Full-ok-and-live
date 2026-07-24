import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activePage, setActivePage, toggleAiDrawer, openProfileModal }) {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-40 w-full bg-[#0b1325]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Name */}
          <div 
            onClick={() => setActivePage('home')} 
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <span className="text-2xl font-bold text-slate-950 font-serif">⚖️</span>
            </div>
            <div>
              <div className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>BJS & Bar Academy</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  আইন পাঠশালা
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Judiciary & Advocacy Excellence Portal</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-2">
            {user && !user.isAdmin && (
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
          </div>

          {/* Action Buttons & Profile */}
          <div className="flex items-center space-x-3">
            {/* AI Assistant Button */}
            <button
              onClick={toggleAiDrawer}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-900/60 to-blue-900/60 border border-cyan-500/30 text-cyan-300 hover:border-cyan-400 text-xs font-semibold shadow-md hover:scale-105 transition-all"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span>Gemini AI Legal Assistant</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                {!user.isAdmin && (
                  <button
                    onClick={openProfileModal}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-amber-500/50 transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                      {user.name ? user.name[0].toUpperCase() : 'S'}
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs font-bold text-slate-200 line-clamp-1">{user.name}</p>
                      <p className="text-[10px] text-amber-400 font-mono">{user.id || 'STUDENT'}</p>
                    </div>
                  </button>
                )}

                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/40 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  title="Logout from Account"
                >
                  <span>🚪</span>
                  <span>লগআউট (Logout)</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActivePage('login')}
                  className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  লগইন (Login)
                </button>
                <button
                  onClick={() => setActivePage('register')}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
                >
                  রেজিস্ট্রেশন করুন
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
