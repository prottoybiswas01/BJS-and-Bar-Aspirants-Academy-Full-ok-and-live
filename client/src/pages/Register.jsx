import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function Register({ setActivePage }) {
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    university: '',
    batch: 'Regular Batch',
    session: 'Standard Session',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successReg, setSuccessReg] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api.get('/courses');
        if (res.data.ok && Array.isArray(res.data.courses) && res.data.courses.length > 0) {
          const activeCourses = res.data.courses.filter(c =>
            !c.status || c.status === 'Active' || String(c.status).toLowerCase().includes('active')
          );
          const listToUse = activeCourses.length > 0 ? activeCourses : res.data.courses;
          setCourses(listToUse);
          if (listToUse.length > 0) {
            setFormData(prev => ({
              ...prev,
              batch: listToUse[0].title || listToUse[0].id,
              session: listToUse[0].sessionRegText || listToUse[0].schedule || 'Standard Session'
            }));
          }
        }
      } catch (err) {
        console.error('Error loading registration courses:', err);
      }
    };
    fetchCourses();
  }, []);

  const handleBatchChange = (e) => {
    const selectedTitle = e.target.value;
    const matched = courses.find((c) => (c.title || c.id) === selectedTitle);
    setFormData((prev) => ({
      ...prev,
      batch: selectedTitle,
      session: matched ? (matched.sessionRegText || matched.schedule || matched.nextLive || 'Standard Session') : 'Standard Session',
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
        university: formData.university,
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
    <div className="max-w-xl w-full mx-auto py-6 sm:py-12 px-3 sm:px-4 animate-fadeIn">
      <div className="glass-card rounded-2xl p-5 sm:p-8 border border-slate-800 shadow-2xl space-y-5">
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
            <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 text-3xl flex items-center justify-center mx-auto text-center font-bold border border-amber-500/30">
              ⏳
            </div>
            <h3 className="text-xl font-black text-white">রেজিস্ট্রেশন আবেদন সফল হয়েছে!</h3>
            
            <div className="p-4 bg-slate-950 rounded-xl space-y-2 border border-slate-800 text-left text-xs">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">রেজিস্ট্রেশন নম্বর (Reg ID):</span>
                <span className="font-mono font-black text-amber-300 text-sm">{successReg.regId || 'REG-2026-REF'}</span>
              </div>
              {successReg.student?.id && (
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">স্টুডেন্ট আইডি (Student ID):</span>
                  <span className="font-mono font-bold text-slate-200">{successReg.student.id}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-400">বর্তমান স্ট্যাটাস (Status):</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-[11px]">
                  ⏳ পেন্ডিং (এডমিন এপ্রুভালের জন্য অপেক্ষমাণ)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              📩 আপনার নিবন্ধিত ইমেইলে (<strong>{formData.email}</strong>) নিশ্চিতকরণ ইমেইল পাঠানো হয়েছে। এডমিন আপনার তথ্য যাঁচাই ও এপ্রুভ করার পর আপনি সকল ভিডিও ক্লাসের এক্সেস পাবেন।
            </p>

            <button
              onClick={() => setActivePage('login')}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-amber-500/20"
            >
              🔑 লগইন পেজে যান (Go to Login Page)
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
                placeholder="আপনার পূর্ণ নাম লিখুন"
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
                  placeholder="আপনার মোবাইল নম্বর লিখুন"
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
                  placeholder="আপনার ইমেইল ঠিকানা লিখুন"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            {/* University / Institution */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">বিশ্ববিদ্যালয় / আইন ইন্সটিটিউট (University / College)</label>
              <input
                type="text"
                name="university"
                value={formData.university}
                onChange={handleChange}
                placeholder="যেমন: ঢাকা বিশ্ববিদ্যালয় / চট্টগ্রাম বিশ্ববিদ্যালয় / ল কলেজ"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
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
                {courses.length > 0 ? (
                  courses.map((c) => (
                    <option key={c.id || c.title} value={c.title || c.id} className="bg-slate-900 text-white">
                      {c.title || c.id} {c.category ? `(${c.category})` : ''} {c.price ? `— Tk ${c.price}` : ''}
                    </option>
                  ))
                ) : (
                  <option value="" className="bg-slate-900 text-white">
                    কোনো সক্রিয় ব্যাচ উপলব্ধ নেই (No Active Batches Available)
                  </option>
                )}
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
