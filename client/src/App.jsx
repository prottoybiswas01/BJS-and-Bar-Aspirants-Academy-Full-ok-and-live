import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import VideoPlayerModal from './components/VideoPlayerModal';
import AiChatDrawer from './components/AiChatDrawer';
import ProfileModal from './components/ProfileModal';
import PaymentModal from './components/PaymentModal';

function MainApp() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState('home');

  // Modals & Drawers State
  const [videoModal, setVideoModal] = useState({ isOpen: false, lesson: null });
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, course: null });
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  const openVideoModal = (lesson) => {
    setVideoModal({ isOpen: true, lesson });
  };

  const openPaymentModal = (course) => {
    setPaymentModal({ isOpen: true, course });
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
          <Home setActivePage={setActivePage} openPaymentModal={openPaymentModal} />
        )}
        {activePage === 'login' && <Login setActivePage={setActivePage} />}
        {activePage === 'register' && <Register setActivePage={setActivePage} />}
        {activePage === 'dashboard' && (
          <Dashboard openVideoModal={openVideoModal} openPaymentModal={openPaymentModal} />
        )}
        {activePage === 'admin' && <AdminPanel />}
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

      {/* Gemini AI Assistant Drawer */}
      <AiChatDrawer isOpen={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />

      {/* Profile Modal */}
      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />

      {/* bKash Payment Submission Modal */}
      {paymentModal.isOpen && (
        <PaymentModal
          course={paymentModal.course}
          isOpen={paymentModal.isOpen}
          onClose={() => setPaymentModal({ isOpen: false, course: null })}
          onSuccess={() => setActivePage('dashboard')}
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
