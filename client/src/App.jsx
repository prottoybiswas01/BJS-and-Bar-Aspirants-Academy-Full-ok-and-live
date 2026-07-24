import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import VideoPlayerModal from './components/VideoPlayerModal';
import AiChatDrawer from './components/AiChatDrawer';
import ProfileModal from './components/ProfileModal';
import LessonManagerModal from './components/LessonManagerModal';
import MentorProfileModal from './components/MentorProfileModal';
import api from './services/api';

function MainApp() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path === '/admin' || path === '/admin/' || path.endsWith('/admin') || hash === '#admin' || hash === '#/admin') {
      return 'admin';
    }
    return 'home';
  });

  const [mentorModal, setMentorModal] = useState({ isOpen: false, mentor: null });

  const openMentorProfile = (mentor) => {
    setMentorModal({ isOpen: true, mentor });
  };

  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || path === '/admin/' || path.endsWith('/admin') || hash === '#admin' || hash === '#/admin') {
        setActivePage('admin');
      }

      if (hash.startsWith('#mentor-')) {
        const mId = window.location.hash.substring(8);
        api.get('/mentors').then(res => {
          if (res.data.ok) {
            const found = (res.data.mentors || []).find(m => m.id === mId || m._id === mId);
            if (found) setMentorModal({ isOpen: true, mentor: found });
          }
        }).catch(() => {});
      }
    };
    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Modals & Drawers State
  const [videoModal, setVideoModal] = useState({ isOpen: false, lesson: null });
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [lessonManagerModal, setLessonManagerModal] = useState({ isOpen: false, course: null });
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  const openVideoModal = (lesson) => {
    setVideoModal({ isOpen: true, lesson });
  };

  const openLessonManager = (course) => {
    setLessonManagerModal({ isOpen: true, course });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#0b1325] text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        toggleAiDrawer={() => setAiDrawerOpen(!aiDrawerOpen)}
        openProfileModal={() => setProfileModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activePage === 'home' && (
          <Home setActivePage={setActivePage} openMentorProfile={openMentorProfile} />
        )}
        {activePage === 'login' && <Login setActivePage={setActivePage} />}
        {activePage === 'register' && <Register setActivePage={setActivePage} />}
        {activePage === 'dashboard' && (
          <Dashboard openVideoModal={openVideoModal} />
        )}
        {(activePage === 'admin' || activePage === 'admin-login') && (
          user?.isAdmin ? (
            <AdminPanel openLessonManager={openLessonManager} openVideoModal={openVideoModal} openMentorProfile={openMentorProfile} />
          ) : (
            <AdminLogin setActivePage={setActivePage} />
          )
        )}
      </main>

      <Footer setActivePage={setActivePage} />

      {/* Video Player Modal */}
      {videoModal.isOpen && (
        <VideoPlayerModal
          videoId={videoModal.lesson?.youtubeId}
          title={videoModal.lesson?.title}
          student={user}
          onClose={() => setVideoModal({ isOpen: false, lesson: null })}
        />
      )}

      {/* Lesson & Video Upload Manager Modal */}
      {lessonManagerModal.isOpen && (
        <LessonManagerModal
          course={lessonManagerModal.course}
          isOpen={lessonManagerModal.isOpen}
          onClose={() => setLessonManagerModal({ isOpen: false, course: null })}
        />
      )}

      {/* Gemini AI Assistant Drawer */}
      <AiChatDrawer isOpen={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />

      {/* Profile Modal */}
      {profileModalOpen && (
        <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
      )}

      {/* Shareable Mentor Profile Showcase Modal */}
      {mentorModal.isOpen && mentorModal.mentor && (
        <MentorProfileModal
          mentor={mentorModal.mentor}
          isOpen={mentorModal.isOpen}
          onClose={() => setMentorModal({ isOpen: false, mentor: null })}
          setActivePage={setActivePage}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
