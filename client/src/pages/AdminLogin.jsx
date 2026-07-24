import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin({ setActivePage }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!identifier || !password) {
      setError('অনুগ্রহ করে অ্যাডমিন আইডেন্টিফায়ার ও পাসওয়ার্ড লিখুন।');
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
        setError('এই অ্যাকাউন্টটিতে অ্যাডমিন অ্যাক্সেস পাওয়ার অনুমতি নেই।');
      }
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 animate-fadeIn">
      <div className="glass-card rounded-2xl p-8 border border-purple-500/30 shadow-2xl shadow-purple-950/40 space-y-6 bg-slate-950/80">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-2xl mx-auto shadow-lg shadow-purple-500/30">
            ⚙️
          </div>
          <h2 className="text-2xl font-extrabold text-purple-300">অ্যাডমিন পোর্টাল লগইন</h2>
          <p className="text-xs text-slate-400">
            সিকিউর সিস্টেম অ্যাডমিনিস্ট্রেটর প্যানেলে প্রবেশ করতে আপনার আইডি ও পাসওয়ার্ড দিন
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/30 text-rose-300 text-xs font-semibold leading-relaxed">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-purple-200 font-medium mb-1">
              অ্যাডমিন ইউজারনেম / ইমেইল / ফোন
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="আপনার এডমিন ইউজারনেম বা আইডি লিখুন"
              className="w-full rounded-xl bg-slate-900 border border-purple-500/30 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
              required
            />
          </div>

          <div>
            <label className="block text-purple-200 font-medium mb-1">অ্যাডমিন পাসওয়ার্ড</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl bg-slate-900 border border-purple-500/30 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]"
          >
            {loading ? 'যাচাই করা হচ্ছে...' : 'অ্যাডমিন প্যানেলে প্রবেশ করুন'}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActivePage('home')}
            className="hover:text-slate-300 transition-colors"
          >
            ← প্রধান ওয়েবসাইটে ফিরে যান
          </button>
        </div>
      </div>
    </div>
  );
}
