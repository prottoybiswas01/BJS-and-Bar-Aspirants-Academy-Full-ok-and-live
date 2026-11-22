import React, { useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import BrandLogo from './BrandLogo';

export default function Navbar({ activePage, setActivePage, toggleAiDrawer, openProfileModal }) {
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const menuRef = useRef(null);
  const isAdmin = user?.isAdmin || user?.role === 'admin';
  const isMentor = user?.isMentor || user?.role === 'mentor';

  const handleNavClick = (page, sectionId = null) => {
    menuRef.current?.close();
    if (setActivePage) setActivePage(page);
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleLogout = () => {
    menuRef.current?.close();
    logout();
  };

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-white/85 dark:bg-[#090D16]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-full gap-2">
          {/* Brand Logo & Name */}
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="flex min-w-0 items-center text-left cursor-pointer"
            title="BJS & Bar Academy - হোমপেজে যান"
          >
            <BrandLogo size="sm" variant={isDark ? 'default' : 'light'} className="max-w-full [&>div:last-child]:min-w-0 [&>div:last-child_span]:truncate" />
          </button>

          {/* Centered Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
            <button
              onClick={() => handleNavClick('home')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs xl:text-sm transition-all cursor-pointer ${
                activePage === 'home'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              🏠 হোম
            </button>
            <button
              onClick={() => handleNavClick('home', 'courses')}
              className="px-3 py-1.5 rounded-lg font-bold text-xs xl:text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
            >
              📚 কোর্সসমূহ
            </button>
            <button
              onClick={() => handleNavClick('notes')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs xl:text-sm transition-all cursor-pointer ${
                activePage === 'notes'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              📖 আইন গাইড
            </button>
            <button
              onClick={() => {
                if (isMentor) {
                  handleNavClick('mentor-dashboard');
                } else {
                  handleNavClick('home', 'mentors');
                }
              }}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs xl:text-sm transition-all cursor-pointer ${
                activePage === 'mentor-dashboard'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              👨‍🏫 মেন্টর প্যানেল
            </button>

            {/* Admin Exclusive Link */}
            {isAdmin && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`px-3.5 py-1.5 rounded-lg font-extrabold text-xs xl:text-sm transition-all cursor-pointer ${
                  activePage === 'admin'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 border border-purple-500/30'
                }`}
              >
                🛡️ অ্যাডমিন কমান্ড সেন্টার
              </button>
            )}

            {/* Student Dashboard Link */}
            {user && !isAdmin && !isMentor && (
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`px-3.5 py-1.5 rounded-lg font-extrabold text-xs xl:text-sm transition-all cursor-pointer ${
                  activePage === 'dashboard'
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                🎓 স্টুডেন্ট পোর্টাল
              </button>
            )}
          </nav>

          {/* Right Action Controls - Crisp High Contrast & Zero-Wrap Alignment */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 flex-nowrap">
            {/* Theme Toggle (Daylight / Obsidian) */}
            <button
              onClick={toggleTheme}
              className="size-11 lg:size-9 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-amber-300 hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer shrink-0"
              title={isDark ? "Daylight Reading Mode-এ সুইচ করুন" : "Executive Obsidian Dark Mode-এ সুইচ করুন"}
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* AI Assistant Pill */}
            <button
              onClick={toggleAiDrawer}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/80 dark:hover:bg-cyan-900/80 border border-cyan-400 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-300 hover:border-cyan-500 text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
              title="Gemini AI Legal Assistant চালু করুন"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span>AI লিগ্যাল সহকারী</span>
            </button>

            {/* User Profile / Auth State */}
            {user ? (
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                {!isAdmin && activePage !== 'admin' && activePage !== 'admin-login' && (
                  <button
                    onClick={openProfileModal}
                    className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 hover:border-amber-500/50 transition-all text-left cursor-pointer max-w-40 shadow-sm"
                    title="প্রোফাইল সেটিংস দেখুন"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-sm shrink-0">
                      {user.name ? user.name[0].toUpperCase() : 'M'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-200 line-clamp-1">{user.name}</p>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-bold leading-none">
                        {isMentor ? 'MENTOR' : (user.id || 'STUDENT')}
                      </p>
                    </div>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="px-2.5 sm:px-3 h-11 lg:h-9 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/70 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-200 border border-rose-300 dark:border-rose-500/40 text-xs font-extrabold flex items-center gap-1 transition-all shadow-sm cursor-pointer shrink-0 whitespace-nowrap"
                  title="অ্যাকাউন্ট থেকে লগআউট করুন"
                >
                  লগআউট
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <button
                  onClick={() => handleNavClick('login')}
                  className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer shrink-0"
                >
                  লগইন
                </button>
                <button
                  onClick={() => handleNavClick('register')}
                  className="px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm font-extrabold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-95 whitespace-nowrap cursor-pointer shrink-0"
                >
                  <span className="hidden sm:inline">ভর্তি ও রেজিস্ট্রেশন</span>
                  <span className="sm:hidden">ভর্তি</span>
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => menuRef.current?.showModal()}
              className="size-11 shrink-0 lg:hidden grid place-items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              aria-label="মেনু খুলুন"
              aria-haspopup="dialog"
              aria-controls="mobile-navbar-menu"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </div>
      <dialog
        ref={menuRef}
        id="mobile-navbar-menu"
        aria-labelledby="mobile-navbar-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) menuRef.current?.close();
        }}
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-72 max-w-[90vw] border-l border-slate-200 bg-white text-slate-900 shadow-xl backdrop:bg-slate-950/60 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
      >
        <div className="min-h-full p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
            <h2 id="mobile-navbar-title" className="text-base font-bold">মেনু</h2>
            <button type="button" onClick={() => menuRef.current?.close()} aria-label="মেনু বন্ধ করুন" className="grid size-11 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="size-5" />
            </button>
          </div>
          <nav aria-label="মোবাইল নেভিগেশন" className="grid gap-1 [&>button]:min-h-11 [&>button]:rounded-lg [&>button]:px-3 [&>button]:text-left [&>button]:text-sm [&>button]:font-bold [&>button:hover]:bg-slate-100 dark:[&>button:hover]:bg-slate-800 [&>button[aria-current=page]]:text-amber-700 dark:[&>button[aria-current=page]]:text-amber-300">
            <button type="button" aria-current={activePage === 'home' ? 'page' : undefined} onClick={() => handleNavClick('home')}>হোম</button>
            {user && (
              <button type="button" onClick={() => handleNavClick(isAdmin ? 'admin' : isMentor ? 'mentor-dashboard' : 'dashboard')}>
                ড্যাশবোর্ড
              </button>
            )}
            <button type="button" aria-current={activePage === 'notes' ? 'page' : undefined} onClick={() => handleNavClick('notes')}>আইন গাইড</button>
            {user && !isAdmin && (
              <button type="button" onClick={() => { menuRef.current?.close(); openProfileModal?.(); }}>প্রোফাইল</button>
            )}
            {user && (
              <button type="button" onClick={handleLogout} className="text-rose-700 dark:text-rose-300">লগআউট</button>
            )}
          </nav>
        </div>
      </dialog>
    </header>
  );
}
