import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login({ setActivePage }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!identifier || !password) {
      setError('অনুগ্রহ করে আইডেন্টিফায়ার ও পাসওয়ার্ড লিখুন।');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await login(identifier, password);
    setLoading(false);

    if (result.ok) {
      if (result.user.isAdmin) {
        setActivePage('admin');
      } else {
        setActivePage('dashboard');
      }
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto py-6 sm:py-12 px-3 sm:px-4 animate-fadeIn">
      <div className="glass-card rounded-2xl p-5 sm:p-8 border border-slate-800 shadow-2xl space-y-5">
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
            {loading ? 'যাচাই করা হচ্ছে...' : 'লগইন করুন (Instant Login)'}
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
      </div>
    </div>
  );
}
