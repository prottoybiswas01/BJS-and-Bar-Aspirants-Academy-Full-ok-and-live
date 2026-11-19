import React from 'react';
import { Home, Video, FileText, Award, User, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MobileBottomNav({ activePage, setActivePage, openProfileModal }) {
  const { user } = useAuth();

  const handleLecturesClick = () => {
    setActivePage('dashboard');
    window.dispatchEvent(new CustomEvent('switch-dashboard-tab', { detail: 'lectures' }));
  };

  const handleAssignmentsClick = () => {
    setActivePage('dashboard');
    window.dispatchEvent(new CustomEvent('switch-dashboard-tab', { detail: 'assignments' }));
  };

  const handleExamsClick = () => {
    setActivePage('dashboard');
    window.dispatchEvent(new CustomEvent('switch-dashboard-tab', { detail: 'exams' }));
  };

  const handleProfileClick = () => {
    if (user) {
      if (openProfileModal) openProfileModal();
      else setActivePage('dashboard');
    } else {
      setActivePage('login');
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#070d1a]/95 backdrop-blur-xl border-t border-slate-800 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] px-2 py-1.5">
      <div className="grid grid-cols-5 items-center text-center">
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => setActivePage('home')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
            activePage === 'home'
              ? 'text-amber-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className={`w-5 h-5 ${activePage === 'home' ? 'text-amber-400' : 'text-slate-400'}`} />
          <span className="text-[10px] mt-0.5 leading-tight">হোম</span>
        </button>

        {/* 2. Video Lectures */}
        <button
          type="button"
          onClick={handleLecturesClick}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
            activePage === 'dashboard'
              ? 'text-amber-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Video className="w-5 h-5 text-emerald-400" />
          <span className="text-[10px] mt-0.5 leading-tight">ক্লাস</span>
        </button>

        {/* 3. Assignments */}
        <button
          type="button"
          onClick={handleAssignmentsClick}
          className="flex flex-col items-center justify-center py-1 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
        >
          <FileText className="w-5 h-5 text-cyan-400" />
          <span className="text-[10px] mt-0.5 leading-tight">অ্যাসাইনমেন্ট</span>
        </button>

        {/* 4. Exams */}
        <button
          type="button"
          onClick={handleExamsClick}
          className="flex flex-col items-center justify-center py-1 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
        >
          <Award className="w-5 h-5 text-amber-400" />
          <span className="text-[10px] mt-0.5 leading-tight">পরীক্ষা</span>
        </button>

        {/* 5. Profile or Login */}
        <button
          type="button"
          onClick={handleProfileClick}
          className="flex flex-col items-center justify-center py-1 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
        >
          {user ? (
            <>
              <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-sm">
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <span className="text-[10px] mt-0.5 leading-tight truncate max-w-[45px]">প্রোফাইল</span>
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5 text-amber-400" />
              <span className="text-[10px] mt-0.5 leading-tight">লগইন</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
