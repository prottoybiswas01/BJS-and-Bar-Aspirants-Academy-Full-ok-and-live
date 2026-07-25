import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function MentorLogin({ setActivePage }) {
  const { mentorLogin } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('অনুগ্রহ করে আপনার ইমেইল ও পাসওয়ার্ড লিখুন।');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const result = await mentorLogin(email, password);
    setLoading(false);

    if (result.ok) {
      setActivePage('mentor-dashboard');
    } else {
      setError(result.message);
    }
  };

  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!name || !email || !password) {
      setError('অনুগ্রহ করে নাম, ইমেইল এবং পাসওয়ার্ড পূরণ করুন।');
      return;
    }

    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/auth/mentor/register', { name, email, password });
      setLoading(false);
      if (res.data.ok) {
        setSuccessMsg(res.data.message || 'মেন্টর রেজিস্ট্রেশন সফল হয়েছে! অ্যাডমিন অনুমোদনের পর লগইন করুন।');
        setName('');
        setEmail('');
        setPassword('');
        setTimeout(() => setTab('login'), 2500);
      } else {
        setError(res.data.message || 'রেজিস্ট্রেশনে সমস্যা হয়েছে।');
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'মেন্টর রেজিস্ট্রেশন করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="max-w-md w-full mx-auto py-8 px-4 animate-fadeIn select-none">
      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-600 to-amber-400 text-slate-950 font-bold flex items-center justify-center text-3xl mx-auto shadow-lg shadow-amber-500/20">
            👨‍🏫
          </div>
          <h2 className="text-2xl font-extrabold text-white">মেন্টর ও শিক্ষক পোর্টাল</h2>
          <p className="text-xs text-amber-400 font-medium">
            Judiciary & Bar Exam Mentor Access Point
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'login'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🔑 মেন্টর লগইন (Login)
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'register'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📝 মেন্টর রেজিস্ট্রেশন (Signup)
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/30 text-rose-300 text-xs font-semibold leading-relaxed">
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold leading-relaxed">
            ✓ {successMsg}
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">ইমেইল এড্রেস (Mentor Email)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mentor@example.com"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">পাসওয়ার্ড (Password)</label>
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
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
            >
              {loading ? 'যাচাই করা হচ্ছে...' : 'মেন্টর পোর্টালে প্রবেশ করুন'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">পূর্ণ নাম (Full Name)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="আপনার পূর্ণ নাম লিখুন"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">ইমেইল এড্রেস (Email Address)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="আপনার অফিসিয়াল ইমেইল লিখুন"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">নতুন পাসওয়ার্ড (Create Password)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300">
              📌 <strong>নোট:</strong> মেন্টর রেজিস্ট্রেশনের পর সুপার অ্যাডমিনের অনুমোদনের পর আপনার একাউন্ট সক্রিয় হবে।
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
            >
              {loading ? 'আবেদন পাঠানো হচ্ছে...' : 'মেন্টর রেজিস্ট্রেশন সম্পূর্ণ করুন'}
            </button>
          </form>
        )}

        <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-800/80">
          স্টুডেন্ট বা অ্যাডমিন লগইন খুঁজছেন?{' '}
          <button
            onClick={() => setActivePage('login')}
            className="text-amber-400 font-bold hover:underline"
          >
            স্টুডেন্ট লগইন করুন
          </button>
        </div>

      </div>
    </div>
  );
}
