import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { signInWithGooglePopup } from '../services/firebase';
import GoogleCompleteProfileModal from '../components/GoogleCompleteProfileModal';
import api from '../services/api';

export default function Login({ setActivePage }) {
  const { login, googleLogin } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [forgotStep, setForgotStep] = useState(1); // 1: Send OTP, 2: Verify OTP Only, 3: Set New & Confirm Password

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Forgot password form fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleModal, setGoogleModal] = useState({ isOpen: false, googleData: null, firebaseUser: null });
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!identifier || !password) {
      setError('অনুগ্রহ করে আইডেন্টিফায়ার ও পাসওয়ার্ড লিখুন।');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await login(identifier, password, false);
    setLoading(false);

    if (result.ok) {
      if (result.isAdmin || result.user?.isAdmin) {
        setActivePage('admin');
      } else if (result.isMentor || result.user?.isMentor) {
        setActivePage('mentor-dashboard');
      } else {
        setActivePage('dashboard');
      }
    } else {
      setError(result.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      const firebaseUser = await signInWithGooglePopup();
      if (!firebaseUser || !firebaseUser.email) {
        throw new Error('Google একাউন্ট থেকে ইমেইল পাওয়া যায়নি।');
      }
      const result = await googleLogin(firebaseUser);
      setGoogleLoading(false);

      if (result.ok) {
        if (result.isNewUser) {
          // Open Modal to complete profile with university & course selection
          setGoogleModal({
            isOpen: true,
            googleData: result.googleData,
            firebaseUser
          });
          return;
        }

        if (result.isAdmin || result.user?.isAdmin) {
          setActivePage('admin');
        } else if (result.isMentor || result.user?.isMentor) {
          setActivePage('mentor-dashboard');
        } else {
          setActivePage('dashboard');
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setGoogleLoading(false);
      console.error('Google Sign-In Error:', err);
      setError(err.message || 'Google সাইন-ইন সম্পন্ন করা যায়নি।');
    }
  };

  const handleCompleteGoogleProfile = async ({ university, courseId, phone }) => {
    if (!googleModal.firebaseUser) return;
    const result = await googleLogin(googleModal.firebaseUser, { university, courseId, phone });
    if (result.ok && !result.isNewUser) {
      setGoogleModal({ isOpen: false, googleData: null, firebaseUser: null });
      setActivePage('dashboard');
    } else {
      throw new Error(result.message || 'রেজিস্ট্রেশন সম্পন্ন করা সম্ভব হয়নি।');
    }
  };

  // Step 1: Send OTP Request
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail || !String(forgotEmail).trim()) {
      setError('অনুগ্রহ করে আপনার নিবন্ধিত ইমেইল বা মোবাইল নম্বর লিখুন।');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/auth/forgot-password', { emailOrPhone: forgotEmail });
      setLoading(false);
      if (res.data.ok) {
        setSuccessMsg(res.data.message);
        if (res.data.email) setForgotEmail(res.data.email);
        setForgotStep(2);
      } else {
        setError(res.data.message || 'OTP পাঠাতে ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'OTP পাঠাতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  };

  // Step 2: Verify OTP Only
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otp || String(otp).trim().length < 6) {
      setError('অনুগ্রহ করে ৬-ডিজিটের সঠিক OTP কোডটি লিখুন।');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/auth/verify-otp', {
        emailOrPhone: forgotEmail,
        otp
      });
      setLoading(false);
      if (res.data.ok) {
        setResetToken(res.data.resetToken || '');
        setSuccessMsg(res.data.message || '✓ OTP সফলভাবে যাচাই হয়েছে! এখন নতুন পাসওয়ার্ড সেট করুন।');
        setForgotStep(3);
      } else {
        setError(res.data.message || 'ভুল OTP কোড! আবার চেষ্টা করুন।');
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'OTP যাঁচাই করতে সমস্যা হয়েছে।');
    }
  };

  // Step 3: Set New Password & Confirm Password
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('অনুগ্রহ করে নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড লিখুন।');
      return;
    }

    if (newPassword.length < 6) {
      setError('নতুন পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না!');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/auth/reset-password', {
        emailOrPhone: forgotEmail,
        resetToken,
        newPassword,
        confirmPassword
      });
      setLoading(false);
      if (res.data.ok) {
        setSuccessMsg('✓ পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে! একাউন্টে প্রবেশ করা হচ্ছে...');
        setTimeout(async () => {
          const loginRes = await login(forgotEmail, newPassword);
          if (loginRes.ok) {
            setActivePage(loginRes.user.isAdmin ? 'admin' : 'dashboard');
          } else {
            setMode('login');
            setIdentifier(forgotEmail);
            setPassword(newPassword);
          }
        }, 1200);
      } else {
        setError(res.data.message || 'পাসওয়ার্ড রিসেট করা সম্ভব হয়নি।');
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="max-w-md w-full mx-auto py-6 sm:py-12 px-3 sm:px-4 animate-fadeIn select-none">
      <div className="glass-card rounded-2xl p-5 sm:p-8 border border-slate-800 shadow-2xl space-y-5">
        {mode === 'login' ? (
          <>
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-bold flex items-center justify-center text-2xl mx-auto shadow-lg shadow-amber-500/20">
                🔑
              </div>
              <h2 className="text-2xl font-extrabold text-white">স্টুডেন্ট লগইন</h2>
              <p className="text-xs text-slate-400">
                আপনার ফোন নম্বর, স্টুডেন্ট আইডি বা ইমেইল ব্যবহার করুন
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/30 text-rose-300 text-xs font-semibold leading-relaxed">
                ⚠️ {error}
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold leading-relaxed">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  মোবাইল / স্টুডেন্ট আইডি / ইমেইল
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="আপনার মোবাইল নম্বর, আইডি বা ইমেইল লিখুন"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-300 font-medium">পাসওয়ার্ড (Password)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setForgotStep(1);
                      setError(null);
                      setSuccessMsg(null);
                      setForgotEmail(identifier);
                      setOtp('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="text-amber-400 hover:text-amber-300 text-[11px] font-semibold hover:underline"
                  >
                    পাসওয়ার্ড ভুলে গেছেন? (Forgot Password?)
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
              >
                {loading ? 'যাচাই করা হচ্ছে...' : 'লগইন করুন (Instant Login)'}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-3 text-slate-500 font-semibold tracking-wider">অথবা</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-3 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-white font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-md hover:scale-[1.01]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                {googleLoading ? 'Google যাচাই করা হচ্ছে...' : 'Google দিয়ে সরাসরি প্রবেশ করুন'}
              </button>
            </form>

            <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800/80">
              একাউন্ট নেই?{' '}
              <button
                onClick={() => setActivePage('register')}
                className="text-amber-400 font-bold hover:underline"
              >
                নতুন রেজিস্ট্রেশন করুন
              </button>
            </div>
          </>
        ) : (
          <>
            {/* 3-Step Forgot Password Flow */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-600 text-slate-950 font-bold flex items-center justify-center text-2xl mx-auto shadow-lg shadow-emerald-500/20">
                {forgotStep === 3 ? '🔐' : '📧'}
              </div>
              <h2 className="text-xl font-extrabold text-white">
                {forgotStep === 3 ? 'নতুন পাসওয়ার্ড সেট করুন' : 'পাসওয়ার্ড পুনর্নির্ধারণ (Reset Password)'}
              </h2>
              <p className="text-xs text-slate-400">
                {forgotStep === 1 && 'আপনার নিবন্ধিত ইমেইল বা ফোন নম্বর দিয়ে OTP কোড নিন'}
                {forgotStep === 2 && 'আপনার নিবন্ধিত ইমেইলে প্রেরিত ৬-ডিজিটের OTP কোডটি লিখুন'}
                {forgotStep === 3 && 'আপনার নতুন পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড নিশ্চিত করুন'}
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/30 text-rose-300 text-xs font-semibold leading-relaxed">
                ⚠️ {error}
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold leading-relaxed">
                {successMsg}
              </div>
            )}

            {forgotStep === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    নিবন্ধিত ইমেইল বা মোবাইল নম্বর
                  </label>
                  <input
                    type="text"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="উদাহরণ: student@gmail.com বা 01800077663"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                >
                  {loading ? 'OTP পাঠানো হচ্ছে...' : '📩 ইমেইলে OTP পাঠান (Send OTP Code)'}
                </button>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    ৬-ডিজিটের OTP কোড (Verification Code)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="৬ ডিজিটের OTP কোড লিখুন"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-emerald-400 font-mono font-bold text-center tracking-widest text-xl placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                >
                  {loading ? 'OTP যাচাই করা হচ্ছে...' : '✓ OTP কোড যাচাই করুন (Verify OTP)'}
                </button>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    নতুন পাসওয়ার্ড (New Password)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড লিখুন"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    কনফার্ম পাসওয়ার্ড (Confirm Password)
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="পাসওয়ার্ডটি পুনরায় লিখুন"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
                >
                  {loading ? 'আপডেট করা হচ্ছে...' : '🔑 পাসওয়ার্ড নিশ্চিত করুন ও লগইন'}
                </button>
              </form>
            )}

            <div className="pt-2 flex justify-between items-center text-xs text-slate-400 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setForgotStep(1);
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-slate-400 hover:text-white font-semibold"
              >
                ← লগইন স্ক্রিনে ফিরুন
              </button>

              {forgotStep === 2 && (
                <button
                  type="button"
                  onClick={() => {
                    setForgotStep(1);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-bold hover:underline"
                >
                  পুনরায় OTP পাঠান
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Google Sign-up / Login Extra Details Modal */}
      <GoogleCompleteProfileModal
        isOpen={googleModal.isOpen}
        googleData={googleModal.googleData}
        onClose={() => setGoogleModal({ isOpen: false, googleData: null, firebaseUser: null })}
        onComplete={handleCompleteGoogleProfile}
      />
    </div>
  );
}

