import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, X, Smartphone, Sparkles, Home, GraduationCap, ShieldCheck, UserCheck, LogOut, User, PhoneCall, BookOpen, FileText, Award, CreditCard } from 'lucide-react';

export default function Navbar({ activePage, setActivePage, toggleAiDrawer, openProfileModal }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handlePwaClick = () => {
    window.dispatchEvent(new CustomEvent('open-pwa-install'));
  };

  const handleNavClick = (page) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full bg-[#0b1325]/95 backdrop-blur-md border-b border-slate-800/80 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15 sm:h-20">
            {/* Brand Logo & Name */}
            <div 
              onClick={() => handleNavClick('home')} 
              className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group shrink-0"
            >
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-200 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
                <span className="text-base sm:text-2xl font-bold text-slate-950 font-serif">⚖️</span>
              </div>
              <div>
                <div className="text-xs sm:text-lg lg:text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  <span className="truncate max-w-[150px] sm:max-w-none">BJS & Bar Academy</span>
                  <span className="hidden sm:inline-block text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 font-bold">
                    আইন পাঠশালা
                  </span>
                </div>
                <p className="hidden md:block text-[11px] sm:text-xs text-slate-400 font-medium">Judiciary & Advocacy Excellence Portal</p>
              </div>
            </div>

            {/* Desktop Navigation Links (>= md) */}
            <div className="hidden md:flex items-center space-x-1.5 lg:space-x-2">
              <button
                onClick={() => handleNavClick('home')}
                className={`px-3 py-2 rounded-lg font-bold text-sm transition-colors cursor-pointer ${
                  activePage === 'home'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                🏠 হোম
              </button>

              {user && (user.isAdmin || user.role === 'admin') && (
                <button
                  onClick={() => handleNavClick('admin')}
                  className={`px-3 py-2 rounded-lg font-bold text-sm transition-colors cursor-pointer ${
                    activePage === 'admin'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-amber-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  🛡️ Admin Panel
                </button>
              )}

              {user && (user.isMentor || user.role === 'mentor') && (
                <button
                  onClick={() => handleNavClick('mentor-dashboard')}
                  className={`px-3 py-2 rounded-lg font-bold text-sm transition-colors cursor-pointer ${
                    activePage === 'mentor-dashboard'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-amber-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  👨‍🏫 Mentor Dashboard
                </button>
              )}

              {user && !user.isAdmin && !user.isMentor && user.role !== 'admin' && user.role !== 'mentor' && (
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className={`px-3 py-2 rounded-lg font-bold text-sm transition-colors cursor-pointer ${
                    activePage === 'dashboard'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  🎓 Student Dashboard
                </button>
              )}
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              {/* Install PWA Button (Desktop & Tablet) */}
              <button
                type="button"
                onClick={handlePwaClick}
                className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                title="BJS Academy ওয়েব অ্যাপ ইনস্টল করুন"
              >
                <span>📲</span>
                <span className="hidden lg:inline">ওয়েব অ্যাপ (Install)</span>
                <span className="lg:hidden">ওয়েব অ্যাপ</span>
              </button>

              {/* Mobile Install PWA Pill (< sm) */}
              <button
                type="button"
                onClick={handlePwaClick}
                className="sm:hidden flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold active:scale-95 cursor-pointer"
                title="অ্যাপ ইনস্টল করুন"
              >
                <span>📲</span>
                <span>অ্যাপ</span>
              </button>

              {/* AI Assistant Button */}
              <button
                type="button"
                onClick={toggleAiDrawer}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border border-cyan-500/40 text-cyan-300 hover:border-cyan-400 text-[11px] sm:text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                title="Open Gemini AI Legal Assistant"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                <span className="hidden md:inline">Gemini AI Assistant</span>
                <span className="md:hidden font-bold">AI</span>
              </button>

              {/* User Logged In Actions (Desktop) */}
              {user ? (
                <>
                  {!user.isAdmin && activePage !== 'admin' && activePage !== 'admin-login' && (
                    <button
                      type="button"
                      onClick={openProfileModal}
                      className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-amber-500/50 transition-all text-left cursor-pointer"
                      title="আমার প্রোফাইল ও সেটিংস"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center text-xs shadow-sm">
                        {user.name ? user.name[0].toUpperCase() : 'U'}
                      </div>
                      <div className="max-w-[120px] truncate">
                        <p className="text-xs font-bold text-slate-200 truncate">{user.name}</p>
                        <p className="text-[10px] text-amber-400 font-mono">{user.isMentor ? 'MENTOR' : (user.id || 'STUDENT')}</p>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={logout}
                    className="hidden md:flex px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/40 text-xs font-bold items-center gap-1.5 transition-all shadow-md cursor-pointer"
                    title="Logout"
                  >
                    <span>🚪</span>
                    <span>লগআউট</span>
                  </button>

                  {/* Mobile Hamburger / Profile Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    className="md:hidden p-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 hover:text-white flex items-center justify-center cursor-pointer active:scale-95"
                    aria-label="মোবাইল মেনু খুলুন"
                  >
                    {user?.name ? (
                      <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                        {user.name[0].toUpperCase()}
                      </div>
                    ) : (
                      <Menu className="w-5 h-5 text-amber-400" />
                    )}
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => handleNavClick('login')}
                    className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    লগইন
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('register')}
                    className="px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-extrabold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-md shadow-amber-500/20 transition-all active:scale-95 whitespace-nowrap cursor-pointer"
                  >
                    ভর্তি হোন
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    className="md:hidden p-1.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white cursor-pointer"
                    aria-label="মেনু খুলুন"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Modern Slide-out Mobile Menu Drawer (< md) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fadeIn">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-slate-900 border-l border-slate-800 shadow-2xl p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-bold">
                    ⚖️
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">BJS & Bar Academy</h3>
                    <p className="text-[10px] text-amber-400 font-bold">আইন পাঠশালা</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  title="বন্ধ করুন"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Logged In User Profile Summary */}
              {user ? (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
                      {user.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-white truncate">{user.name}</p>
                      <p className="text-[10px] font-mono text-amber-400 font-bold truncate">
                        ID: {user.isMentor ? 'MENTOR' : (user.id || 'STUDENT')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/80 font-semibold">
                    <span className="text-emerald-400">● স্ট্যাটাস: {user.status || 'Active'}</span>
                    <span className="text-slate-400 truncate max-w-[120px]">{user.batch || 'Masterclass'}</span>
                  </div>
                </div>
              ) : null}

              {/* Navigation Links */}
              <div className="space-y-1.5 text-xs font-bold text-slate-200">
                <button
                  type="button"
                  onClick={() => handleNavClick('home')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                    activePage === 'home'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'hover:bg-slate-800/70 text-slate-300'
                  }`}
                >
                  <Home className="w-4 h-4 text-amber-400" />
                  <span>🏠 হোম পেজ (Home)</span>
                </button>

                {user && !user.isAdmin && !user.isMentor && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleNavClick('dashboard')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                        activePage === 'dashboard'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'hover:bg-slate-800/70 text-slate-300'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4 text-amber-400" />
                      <span>🎓 স্টুডেন্ট ড্যাশবোর্ড</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleNavClick('dashboard');
                        window.dispatchEvent(new CustomEvent('switch-dashboard-tab', { detail: 'lectures' }));
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 pl-7 text-[11px]"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                      <span>📹 ভিডিও ক্লাসসমূহ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleNavClick('dashboard');
                        window.dispatchEvent(new CustomEvent('switch-dashboard-tab', { detail: 'assignments' }));
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 pl-7 text-[11px]"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>📝 লিখিত অ্যাসাইনমেন্ট</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleNavClick('dashboard');
                        window.dispatchEvent(new CustomEvent('switch-dashboard-tab', { detail: 'exams' }));
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 pl-7 text-[11px]"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>🎯 অনলাইন MCQ পরীক্ষা</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleNavClick('dashboard');
                        window.dispatchEvent(new CustomEvent('switch-dashboard-tab', { detail: 'payments' }));
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 pl-7 text-[11px]"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span>💳 মানি রিসিট ও পেমেন্ট</span>
                    </button>
                  </>
                )}

                {user && (user.isAdmin || user.role === 'admin') && (
                  <button
                    type="button"
                    onClick={() => handleNavClick('admin')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/70 text-amber-400 font-bold"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>🛡️ এডমিন প্যানেল (Admin)</span>
                  </button>
                )}

                {user && (user.isMentor || user.role === 'mentor') && (
                  <button
                    type="button"
                    onClick={() => handleNavClick('mentor-dashboard')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/70 text-amber-400 font-bold"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>👨‍🏫 মেন্টর ড্যাশবোর্ড</span>
                  </button>
                )}

                {user && openProfileModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openProfileModal();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/70 text-slate-300"
                  >
                    <User className="w-4 h-4 text-cyan-400" />
                    <span>👤 আমার প্রোফাইল ও সেটিংস</span>
                  </button>
                )}

                {/* Direct Web App Install Option */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handlePwaClick();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/30"
                >
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>📲 ওয়েব অ্যাপ ইনস্টল করুন (PWA)</span>
                </button>

                {/* Gemini AI Assistant Drawer */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    toggleAiDrawer();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-cyan-950/40 text-cyan-300 border border-cyan-500/30"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>⚖️ জেমিনি AI লিগ্যাল অ্যাসিস্ট্যান্ট</span>
                </button>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <a
                href="https://wa.me/8801800077663"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>WhatsApp হেল্পলাইন: 01800077663</span>
              </a>

              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 font-extrabold text-xs flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>লগআউট (Logout)</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleNavClick('login')}
                    className="py-2 text-center rounded-xl bg-slate-800 text-slate-200 font-bold text-xs"
                  >
                    লগইন
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('register')}
                    className="py-2 text-center rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md"
                  >
                    ভর্তি হোন
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
