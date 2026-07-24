import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ForceTempPasswordModal() {
  const { user, setUser } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!user || !user.isTemporaryPassword) return null;

  const handleSubmit = async (e) => {
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

    try {
      const res = await api.post('/auth/change-temp-password', {
        studentId: user.id || user.email || user.phone,
        newPassword,
        confirmPassword
      });

      setLoading(false);
      if (res.data.ok) {
        setSuccess('✓ আপনার স্থায়ী পাসওয়ার্ড সফলভাবে সংরক্ষিত হয়েছে!');
        setTimeout(() => {
          if (setUser) {
            setUser((prev) => ({ ...prev, isTemporaryPassword: false }));
          }
        }, 1200);
      } else {
        setError(res.data.message || 'পাসওয়ার্ড পরিবর্তন করতে ব্যর্থ হয়েছে।');
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 font-sans select-none animate-fadeIn">
      <div className="bg-[#0c1629] border border-amber-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 text-left border-t-4 border-t-amber-500">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-bold flex items-center justify-center text-2xl mx-auto shadow-lg shadow-amber-500/20">
            🔒
          </div>
          <h2 className="text-xl font-black text-white">সিকিউরিটি নোটিশ: নতুন পাসওয়ার্ড সেট করুন</h2>
          <p className="text-xs text-amber-300 font-medium">
            আপনার একাউন্টে এডমিন কর্তৃক প্রদত্ত টেম্পোরারি (একবার ব্যবহারযোগ্য) পাসওয়ার্ড দিয়ে লগইন করা হয়েছে। নিরাপত্তা রক্ষার্থে এখনই আপনার নিজস্ব নতুন স্থায়ী পাসওয়ার্ড সেট করুন।
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold leading-relaxed">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-semibold leading-relaxed">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              নতুন স্থায়ী পাসওয়ার্ড (New Permanent Password)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="অন্তত ৬ অক্ষরের নতুন পাসওয়ার্ড"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              পাসওয়ার্ড নিশ্চিত করুন (Confirm Password)
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="পুনরায় পাসওয়ার্ড লিখুন"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] cursor-pointer"
          >
            {loading ? 'সংরক্ষণ করা হচ্ছে...' : '💾 নতুন পাসওয়ার্ড সেভ ও একাউন্ট আনলক করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}
