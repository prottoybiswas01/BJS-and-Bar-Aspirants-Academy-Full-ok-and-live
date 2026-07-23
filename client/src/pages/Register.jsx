import React, { useState } from 'react';
import api from '../services/api';

export default function Register({ setActivePage }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    batch: 'Judiciary 2026',
    session: 'Weekend Intensive (Fri & Sat 8:00 PM)',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successReg, setSuccessReg] = useState(null);

  // Available Batches & Associated Auto-Filling Sessions
  const batchOptions = [
    {
      name: 'Judiciary 2026',
      defaultSession: 'Weekend Intensive (Fri & Sat 8:00 PM)',
      sessions: [
        'Weekend Intensive (Fri & Sat 8:00 PM)',
        'Regular Evening (Mon, Wed, Fri 7:00 PM)',
      ],
    },
    {
      name: 'Bar Council Advocacy 2026',
      defaultSession: 'Evening Special (Sun, Tue, Thu 9:00 PM)',
      sessions: [
        'Evening Special (Sun, Tue, Thu 9:00 PM)',
        'Friday Full Day Crash Course',
      ],
    },
    {
      name: 'Civil Laws Masterclass (CPC & SRA)',
      defaultSession: 'Sunday Special (7:30 PM)',
      sessions: ['Sunday Special (7:30 PM)'],
    },
  ];

  const handleBatchChange = (e) => {
    const selectedBatchName = e.target.value;
    const matched = batchOptions.find((b) => b.name === selectedBatchName);
    setFormData((prev) => ({
      ...prev,
      batch: selectedBatchName,
      session: matched ? matched.defaultSession : '',
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('পাসওয়ার্ড দুটি মিলছে না। পুনরায় চেষ্টা করুন।');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/register', {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        batch: formData.batch,
        session: formData.session,
        password: formData.password,
      });

      if (res.data.ok) {
        setSuccessReg(res.data.registration || { regId: res.data.regId });
      } else {
        setError(res.data.message || 'রেজিস্ট্রেশনে সমস্যা দেখা দিয়েছে।');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'রেজিস্ট্রেশনে সমস্যা দেখা দিয়েছে। পুনরায় সাবমিট করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4 animate-fadeIn">
      <div className="glass-card rounded-2xl p-8 border border-slate-800 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-2xl mx-auto shadow-lg shadow-amber-500/20">
            📝
          </div>
          <h2 className="text-2xl font-extrabold text-white">নতুন স্টুডেন্ট রেজিস্ট্রেশন</h2>
          <p className="text-xs text-slate-400">
            BJS & Bar Academy প্ল্যাটফর্মে ভর্তির জন্য আপনার সঠিক তথ্য প্রদান করুন
          </p>
        </div>

        {successReg ? (
          <div className="p-6 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-center space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 text-2xl flex items-center justify-center mx-auto text-center font-bold">
              ✓
            </div>
            <h3 className="text-lg font-bold text-white">রেজিস্ট্রেশন সফল হয়েছে!</h3>
            <p className="text-xs text-slate-300">
              আপনার আবেদনের নম্বর (Registration ID):
            </p>
            <div className="p-3 bg-slate-950 rounded-xl font-mono text-xl font-black text-amber-300 tracking-wider border border-amber-500/30">
              {successReg.regId}
            </div>
            <p className="text-[11px] text-slate-400">
              অ্যাডমিন আপনার রেজিস্ট্রেশন ভেরিফাই করার পর আপনার একাউন্ট সক্রিয় হবে।
            </p>
            <button
              onClick={() => setActivePage('login')}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all"
            >
              লগইন পেজে যান (Go to Login)
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-500/40 text-rose-300 font-semibold leading-relaxed">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1">পূর্ণ নাম (Full Name)</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Adv. Mahfuzur Rahman"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">মোবাইল নম্বর (Phone)</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 01978167016"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">ইমেইল এড্রেস (Email)</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. student@gmail.com"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            {/* Dynamic Batch Select Dropdown */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">ব্যাচ নির্বাচন করুন (Select Batch)</label>
              <select
                name="batch"
                value={formData.batch}
                onChange={handleBatchChange}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-amber-300 font-semibold focus:outline-none focus:border-amber-500"
              >
                {batchOptions.map((b) => (
                  <option key={b.name} value={b.name} className="bg-slate-900 text-white">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-filled Session */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">সেশন ও সময়সূচী (Session Schedule)</label>
              <input
                type="text"
                name="session"
                value={formData.session}
                readOnly
                className="w-full rounded-xl bg-slate-900/80 border border-slate-800 px-4 py-3 text-emerald-400 font-mono focus:outline-none cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">পাসওয়ার্ড (Password)</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">পাসওয়ার্ড নিশ্চিত করুন</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition-all"
            >
              {loading ? 'প্রসেস করা হচ্ছে...' : 'রেজিস্ট্রেশন সম্পন্ন করুন (Submit)'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
