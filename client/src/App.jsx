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
import NotFound from './pages/NotFound';
import api from './services/api';

const PAGE_TITLES = {
  'home': 'BJS & Bar Aspirants Academy - সহকারী জজ (BJS) ও বার কাউন্সিল প্রস্তুতি',
  'courses': '📚 প্রিমিয়াম আইন কোর্সসমূহ | BJS & Bar Aspirants Academy',
  'mcq-exams': '✍️ অনলাইন MCQ মডেল টেস্ট | BJS & Bar Aspirants Academy',
  'free-classes': '🎥 ১০০% ফ্রি ডেমো ও অরিয়েন্টেশন ক্লাস | BJS & Bar Aspirants Academy',
  'ai-assistant': '🤖 Gemini AI লিগ্যাল অ্যাসিস্ট্যান্ট | BJS & Bar Aspirants Academy',
  'login': '🔐 স্টুডেন্ট অ্যাকাউন্ট লগইন | BJS & Bar Aspirants Academy',
  'register': '📝 নতুন ব্যাচে ভর্তি ও রেজিস্ট্রেশন | BJS & Bar Aspirants Academy',
  'dashboard': '🎓 স্টুডেন্ট লার্নিং ড্যাশবোর্ড | BJS & Bar Aspirants Academy',
  'admin': '🛡️ অ্যাডমিন সুপার কন্ট্রোল প্যানেল | BJS & Bar Aspirants Academy',
  'admin-login': '🔐 অ্যাডমিন পোর্টাল লগইন | BJS & Bar Aspirants Academy',
  'mentor-dashboard': '👨‍🏫 বিচারক ও মেন্টর ড্যাশবোর্ড | BJS & Bar Aspirants Academy',
  'mentor-login': '👨‍🏫 মেন্টর লগইন পোর্টাল | BJS & Bar Aspirants Academy',
  'mcq-exam': '🎯 লাইভ MCQ পরীক্ষা রুম | BJS & Bar Aspirants Academy',
  'penal-code-1860': '⚖️ দণ্ডবিধি ১৮৬০ স্পেশাল লেকচার সিরিজ | BJS & Bar Aspirants Academy',
  'civil-laws-intensive': '🏛️ দেওয়ানী কার্যবিধি ও সংশ্লিষ্ট আইন | BJS & Bar Aspirants Academy',
  'criminal-laws-intensive': '🚨 ফৌজদারী কার্যবিধি ও অপরাধ আইন | BJS & Bar Aspirants Academy',
  'constitutional-law': '🇧🇩 বাংলাদেশ সংবিধান ও রিট পিটিশন | BJS & Bar Aspirants Academy',
  'bjs-preliminary-preparation': '🏆 বিজেএস প্রিলিমিনারি ও লিখিত প্রস্তুতি | BJS & Bar Aspirants Academy',
  'bar-council-exam-suggestion': '📜 বার কাউন্সিল অ্যাডভোকেটশিপ পরীক্ষা সাজেশন | BJS & Bar Aspirants Academy',
  '404': '৪০৪ - পেজটি পাওয়া যায়নি | BJS & Bar Aspirants Academy'
};

const CLEAN_SECTION_PATHS = [
  '/courses', '/course',
  '/mcq-exams', '/mcq-exam',
  '/free-classes',
  '/ai-assistant', '/ai-legal-assistant', '/ai',
  '/civil-laws-intensive',
  '/criminal-laws-intensive',
  '/constitutional-law',
  '/family-laws',
  '/limitation-and-evidence',
  '/bjs-preliminary-preparation',
  '/bar-council-exam-suggestion',
  '/penal-code-1860',
  '/specific-relief-act',
  '/legal-drafting-and-practice',
  '/ni-act-138'
];

function resolveRoute(user) {
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
  const hash = window.location.hash.toLowerCase().replace(/\/$/, '') || '';

  const storedUser = localStorage.getItem('bjs_user');
  let isStudentLoggedIn = false;
  try {
    if (storedUser) {
      const u = JSON.parse(storedUser);
      if (u && (u.id || u.regId) && !u.isAdmin && !u.isMentor) {
        isStudentLoggedIn = true;
      }
    }
  } catch (e) {}

  if (hash.startsWith('#mcq-exam-') || path.includes('/mcq-exam/')) {
    return 'mcq-exam';
  }
  if (path === '/admin' || hash === '#admin' || hash === '#/admin') {
    return 'admin';
  }
  if (path === '/admin-login' || hash === '#admin-login' || hash === '#/admin-login') {
    return 'admin-login';
  }
  if (path === '/mentor' || path === '/mentor-dashboard' || hash === '#mentor' || hash === '#/mentor' || hash === '#mentor-dashboard') {
    return user?.isMentor ? 'mentor-dashboard' : 'mentor-login';
  }
  if (path === '/mentor-login' || hash === '#mentor-login' || hash === '#/mentor-login') {
    return 'mentor-login';
  }
  if (path === '/login' || hash === '#login' || hash === '#/login') {
    return 'login';
  }
  if (path === '/register' || hash === '#register' || hash === '#/register') {
    return 'register';
  }
  if (path === '/dashboard' || hash === '#dashboard' || hash === '#/dashboard') {
    return 'dashboard';
  }
  if (path === '/' || path === '/home' || hash === '#home' || hash === '#/home' || hash === '') {
    if (isStudentLoggedIn && (hash === '' || path === '/')) {
      return 'dashboard';
    }
    return 'home';
  }

  // Clean Section paths on Home
  if (CLEAN_SECTION_PATHS.includes(path) || CLEAN_SECTION_PATHS.some(p => hash === `#${p.replace('/', '')}`)) {
    return 'home';
  }

  // Anchor actions that belong to home
  if (hash.startsWith('#mentor-') || hash.startsWith('#demo-') || hash.startsWith('#watch-video-') || hash.startsWith('#lesson-')) {
    return 'home';
  }

  // Unrecognized route -> 404
  return '404';
}

function MainApp() {
  const { user } = useAuth();
  const [mcqExamId, setMcqExamId] = useState('');
  const [activePage, setActivePage] = useState(() => resolveRoute(null));

  const [mentorModal, setMentorModal] = useState({ isOpen: false, mentor: null });

  const openMentorProfile = (mentor) => {
    setMentorModal({ isOpen: true, mentor });
  };

  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      const route = resolveRoute(user);
      if (route === 'mcq-exam') {
        const eId = window.location.hash.replace('#mcq-exam-', '') || path.split('/mcq-exam/')[1];
        setMcqExamId(eId);
      }
      setActivePage(route);

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

      // 4. Handle Clean Section URL Scroll & Deep Linking
      if (path === '/courses' || path === '/course' || hash === '#courses') {
        setTimeout(() => {
          const el = document.getElementById('courses');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 350);
      } else if (path === '/mcq-exams' || path === '/mcq-exam' || hash === '#mcq-exams') {
        setTimeout(() => {
          const el = document.getElementById('mcq-exams') || document.getElementById('courses');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 350);
      } else if (path === '/free-classes' || hash === '#free-classes') {
        setTimeout(() => {
          const el = document.getElementById('free-classes') || document.getElementById('courses');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 350);
      } else if (path === '/ai-assistant' || path === '/ai-legal-assistant' || hash === '#ai-legal-assistant') {
        setAiDrawerOpen(true);
      }

      // 5. Handle Deep-Linked AI Legal Search Queries (?q=302 or #ai-legal-assistant?q=...)
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const queryParam = urlParams.get('q') || urlParams.get('search') || urlParams.get('ask');
        if (queryParam && queryParam.trim()) {
          setAiInitialQuery(queryParam.trim());
          setAiDrawerOpen(true);
        } else if (hash.startsWith('#ai-legal-assistant') || hash === '#ai' || hash.startsWith('#ai?')) {
          const hashQuery = window.location.hash.split('?')[1];
          if (hashQuery) {
            const hp = new URLSearchParams(hashQuery);
            const q = hp.get('q') || hp.get('ask') || hp.get('search') || '';
            if (q.trim()) setAiInitialQuery(q.trim());
          }
          setAiDrawerOpen(true);
        }
      } catch (err) {}
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
  const [aiInitialQuery, setAiInitialQuery] = useState('');

  // Professional Clean SPA Navigation (updates browser URL without reloading)
  const navigatePage = (targetPage, customPath = null) => {
    setActivePage(targetPage);
    let targetPath = customPath;
    if (!targetPath) {
      if (targetPage === 'home') targetPath = '/';
      else if (targetPage === 'courses') targetPath = '/courses';
      else if (targetPage === 'mcq-exams') targetPath = '/mcq-exams';
      else if (targetPage === 'ai-assistant') targetPath = '/ai-assistant';
      else if (targetPage === 'login') targetPath = '/login';
      else if (targetPage === 'register') targetPath = '/register';
      else if (targetPage === 'dashboard') targetPath = '/dashboard';
      else if (targetPage === 'admin') targetPath = '/admin';
      else if (targetPage === 'admin-login') targetPath = '/admin-login';
      else if (targetPage === 'mentor-dashboard') targetPath = '/mentor-dashboard';
      else if (targetPage === 'mentor-login') targetPath = '/mentor-login';
      else if (targetPage === 'mcq-exam') targetPath = mcqExamId ? `/mcq-exam/${mcqExamId}` : '/mcq-exams';
    }
    if (targetPath && window.location.pathname !== targetPath) {
      try {
        window.history.pushState(null, '', targetPath);
      } catch (e) {}
    }
    if (targetPage !== 'home' || targetPath === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Dynamic Browser Tab Title & Aesthetics
  useEffect(() => {
    const rawPath = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
    const hash = window.location.hash.toLowerCase();

    let matchedTitle = PAGE_TITLES[activePage] || PAGE_TITLES['home'];

    if (rawPath === '/courses' || rawPath === '/course' || hash === '#courses') {
      matchedTitle = PAGE_TITLES['courses'];
    } else if (rawPath === '/mcq-exams' || rawPath === '/mcq-exam' || hash === '#mcq-exams') {
      matchedTitle = PAGE_TITLES['mcq-exams'];
    } else if (rawPath === '/free-classes' || hash === '#free-classes') {
      matchedTitle = PAGE_TITLES['free-classes'];
    } else if (rawPath === '/ai-assistant' || rawPath === '/ai-legal-assistant' || hash === '#ai-legal-assistant' || aiDrawerOpen) {
      matchedTitle = PAGE_TITLES['ai-assistant'];
    } else if (rawPath.includes('penal-code')) {
      matchedTitle = PAGE_TITLES['penal-code-1860'];
    } else if (rawPath.includes('civil-law')) {
      matchedTitle = PAGE_TITLES['civil-laws-intensive'];
    } else if (rawPath.includes('criminal-law')) {
      matchedTitle = PAGE_TITLES['criminal-laws-intensive'];
    } else if (rawPath.includes('constitutional')) {
      matchedTitle = PAGE_TITLES['constitutional-law'];
    } else if (rawPath.includes('bjs-preliminary')) {
      matchedTitle = PAGE_TITLES['bjs-preliminary-preparation'];
    } else if (rawPath.includes('bar-council')) {
      matchedTitle = PAGE_TITLES['bar-council-exam-suggestion'];
    }

    document.title = matchedTitle;
  }, [activePage, aiDrawerOpen]);

  // Global window helper for one-click AI queries from anywhere on the platform
  useEffect(() => {
    window.askLegalAi = (prompt) => {
      if (prompt && prompt.trim()) {
        setAiInitialQuery(prompt.trim());
        setAiDrawerOpen(true);
      }
    };
    return () => {
      delete window.askLegalAi;
    };
  }, []);

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
        setActivePage={navigatePage}
        toggleAiDrawer={() => setAiDrawerOpen(!aiDrawerOpen)}
        openProfileModal={() => setProfileModalOpen(true)}
      />

      <main className={`flex-1 w-full mx-auto px-3 sm:px-5 lg:px-6 pt-6 ${
        activePage === 'admin' ? 'max-w-[1750px]' : 'max-w-7xl'
      }`}>
        {activePage === 'home' && (
          <Home setActivePage={navigatePage} openMentorProfile={openMentorProfile} openVideoModal={openVideoModal} />
        )}
        {activePage === 'mcq-exam' && (
          <McqExamPlayer examId={mcqExamId} onBack={() => navigatePage('home')} />
        )}
        {activePage === 'login' && <Login setActivePage={navigatePage} />}
        {activePage === 'register' && <Register setActivePage={navigatePage} />}
        {activePage === 'dashboard' && (
          <Dashboard openVideoModal={openVideoModal} />
        )}
        {activePage === 'mentor-login' && <MentorLogin setActivePage={navigatePage} />}
        {activePage === 'mentor-dashboard' && <MentorDashboard />}
        {(activePage === 'admin' || activePage === 'admin-login') && (
          user?.isAdmin ? (
            <AdminPanel openLessonManager={openLessonManager} openVideoModal={openVideoModal} openMentorProfile={openMentorProfile} />
          ) : (
            <AdminLogin setActivePage={navigatePage} />
          )
        )}
        {activePage === '404' && <NotFound setActivePage={navigatePage} />}
      </main>

      <Footer setActivePage={navigatePage} activePage={activePage} />

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
        initialQuery={aiInitialQuery}
        onQueryHandled={() => setAiInitialQuery('')}
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
    <SecurityGuard>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </SecurityGuard>
  );
}
