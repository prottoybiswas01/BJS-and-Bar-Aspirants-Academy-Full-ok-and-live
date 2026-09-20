import ErrorBoundary from './components/ErrorBoundary';
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import SecurityGuard from './components/SecurityGuard';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import MentorLogin from './pages/MentorLogin';
import MentorDashboard from './pages/MentorDashboard';
import McqExamPlayer from './pages/McqExamPlayer';
import VideoPlayerModal from './components/VideoPlayerModal';
import AiChatDrawer from './components/AiChatDrawer';
import ProfileModal from './components/ProfileModal';
import LessonManagerModal from './components/LessonManagerModal';
import MentorProfileModal from './components/MentorProfileModal';
import ForceTempPasswordModal from './components/ForceTempPasswordModal';
import PwaInstallBanner from './components/PwaInstallBanner';
import api from './services/api';

function MainApp() {
  const { user } = useAuth();
  const [mcqExamId, setMcqExamId] = useState('');
  const [activePage, setActivePage] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    const storedUser = localStorage.getItem('bjs_user');
    let isStudentLoggedIn = false;
    try {
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u && u.id && !u.isAdmin && !u.isMentor) {
          isStudentLoggedIn = true;
        }
      }
    } catch (e) {}

    if (hash.startsWith('#mcq-exam-') || path.includes('/mcq-exam/')) {
      const eId = window.location.hash.replace('#mcq-exam-', '') || path.split('/mcq-exam/')[1];
      return 'mcq-exam';
    }
    if (path === '/admin' || path === '/admin/' || path.endsWith('/admin') || hash === '#admin' || hash === '#/admin') {
      return 'admin';
    }
    if (path === '/mentor' || path === '/mentor/' || path.includes('/mentor') || hash === '#mentor' || hash === '#/mentor') {
      return 'mentor-dashboard';
    }
    if (hash === '#home' || path === '/home') {
      return 'home';
    }
    if (hash === '#dashboard' || path === '/dashboard' || isStudentLoggedIn) {
      return 'dashboard';
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
      
      if (hash.startsWith('#mcq-exam-') || path.includes('/mcq-exam/')) {
        const eId = window.location.hash.replace('#mcq-exam-', '') || path.split('/mcq-exam/')[1];
        setMcqExamId(eId);
        setActivePage('mcq-exam');
        return;
      }

      if (path === '/admin' || path === '/admin/' || path.endsWith('/admin') || hash === '#admin' || hash === '#/admin') {
        setActivePage('admin');
      }
      if (path === '/mentor' || path === '/mentor/' || path.includes('/mentor') || hash === '#mentor' || hash === '#/mentor') {
        setActivePage(user?.isMentor ? 'mentor-dashboard' : 'mentor-login');
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

      if (hash.startsWith('#demo-video-') || hash.startsWith('#demo-course-')) {
        const targetId = window.location.hash.replace('#demo-video-', '').replace('#demo-course-', '');
        if (targetId) {
          api.get(`/lessons?courseId=${targetId}`).then(res => {
            if (res.data && res.data.ok && Array.isArray(res.data.lessons) && res.data.lessons.length > 0) {
              const lessons = res.data.lessons;
              const firstDemo = lessons.find(l => 
                (l.title || '').toLowerCase().includes('orientation') ||
                (l.title || '').includes('অরিয়েন্টেশন')
              ) || lessons[0];

              if (firstDemo) {
                setTimeout(() => {
                  setVideoModal({ isOpen: true, lesson: firstDemo });
                }, 600);
              }
            }
          }).catch(() => {});
        }
      }

      // Handle Direct Video Link from Email Notifications (#watch-video-<id>?courseId=<courseId>)
      if (hash.startsWith('#watch-video-') || hash.startsWith('#lesson-')) {
        const raw = window.location.hash.replace('#watch-video-', '').replace('#lesson-', '');
        const [targetLessonId, query] = raw.split('?');
        const params = new URLSearchParams(query || '');
        const targetCourseId = params.get('courseId') || '';

        const storedUser = localStorage.getItem('bjs_user');
        let currentUser = user;
        if (!currentUser && storedUser) {
          try { currentUser = JSON.parse(storedUser); } catch (e) {}
        }

        // 1. If not logged in -> redirect to login
        if (!currentUser || (!currentUser.id && !currentUser.regId)) {
          setActivePage('login');
          setTimeout(() => {
            alert('🔐 ভিডিও ক্লাসটি দেখতে অনুগ্রহ করে প্রথমে আপনার স্টুডেন্ট অ্যাকাউন্টে লগইন করুন।');
          }, 400);
          return;
        }

        // 2. Check if student is enrolled in targetCourseId
        const allowed = currentUser.allowedCourseIds || [];
        const enrolled = currentUser.enrolledCourseIds || [];
        const rules = currentUser.courseRules || [];
        const isEnrolled = currentUser.isAdmin || currentUser.isMentor ||
          allowed.includes(targetCourseId) ||
          enrolled.includes(targetCourseId) ||
          rules.some(r => r && r.courseId === targetCourseId && r.enrollmentStatus !== 'Suspended');

        if (!isEnrolled && targetCourseId) {
          setActivePage('home');
          setTimeout(() => {
            alert('🔒 আপনি এখনো এই কোর্সে এনরোল করেননি। সম্পূর্ণ ভিডিও ক্লাসগুলো পেতে অনুগ্রহ করে কোর্সটিতে পেমেন্ট করে এনরোল সম্পন্ন করুন।');
            const el = document.getElementById('courses') || document.getElementById('course-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 400);
          return;
        }

        // 3. Enrolled -> Fetch lesson & open video modal directly
        api.get(`/lessons?courseId=${targetCourseId || ''}`).then(res => {
          if (res.data?.ok && Array.isArray(res.data.lessons) && res.data.lessons.length > 0) {
            const found = res.data.lessons.find(l => l.id === targetLessonId || l._id === targetLessonId) || res.data.lessons[0];
            if (found) {
              setActivePage('dashboard');
              setTimeout(() => {
                setVideoModal({ isOpen: true, lesson: found });
              }, 400);
            }
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
  }, [user]);

  // Auto redirect logged in mentor to mentor-dashboard if on mentor pages
  useEffect(() => {
    if (user?.isMentor && activePage === 'mentor-login') {
      setActivePage('mentor-dashboard');
    }
  }, [user, activePage]);

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

      <main className={`flex-1 w-full mx-auto px-3 sm:px-5 lg:px-6 pt-6 ${
        activePage === 'admin' ? 'max-w-[1750px]' : 'max-w-7xl'
      }`}>
        {activePage === 'home' && (
          <Home setActivePage={setActivePage} openMentorProfile={openMentorProfile} openVideoModal={openVideoModal} />
        )}
        {activePage === 'mcq-exam' && (
          <McqExamPlayer examId={mcqExamId} onBack={() => setActivePage('home')} />
        )}
        {activePage === 'login' && <Login setActivePage={setActivePage} />}
        {activePage === 'register' && <Register setActivePage={setActivePage} />}
        {activePage === 'dashboard' && (
          <Dashboard openVideoModal={openVideoModal} />
        )}
        {activePage === 'mentor-login' && <MentorLogin setActivePage={setActivePage} />}
        {activePage === 'mentor-dashboard' && <MentorDashboard />}
        {(activePage === 'admin' || activePage === 'admin-login') && (
          <ErrorBoundary>
          {user?.isAdmin ? (
            <AdminPanel openLessonManager={openLessonManager} openVideoModal={openVideoModal} openMentorProfile={openMentorProfile} />
          ) : (
            <AdminLogin setActivePage={setActivePage} />
          )}
        </ErrorBoundary>
        )}
      </main>

      <Footer setActivePage={setActivePage} activePage={activePage} />

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
      <AiChatDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        openVideoModal={openVideoModal}
        setActivePage={setActivePage}
      />

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

      {/* Force One-Time Temporary Password Change Modal */}
      <ForceTempPasswordModal />

      {/* PWA Floating Mobile Install Prompt Banner & iOS Modal */}
      <PwaInstallBanner />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <SecurityGuard>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </SecurityGuard>
    </ErrorBoundary>
  );
}
