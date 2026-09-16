import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function GoogleCompleteProfileModal({
  isOpen,
  onClose,
  googleData,
  onComplete
}) {
  const [courses, setCourses] = useState([]);
  const [university, setUniversity] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    api.get('/courses')
      .then(res => {
        if (!isMounted) return;
        if (res.data?.ok && Array.isArray(res.data.courses) && res.data.courses.length > 0) {
          const activeOnly = res.data.courses.filter(c =>
            !c.status || c.status === 'Active' || String(c.status).toLowerCase().includes('active')
          );
          const list = activeOnly.length > 0 ? activeOnly : res.data.courses;
          setCourses(list);
          if (list.length > 0) {
            setSelectedCourseId(list[0].id || list[0]._id);
          }
        }
      })
      .catch(err => console.warn('Error loading courses in modal:', err));

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen || !googleData) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!university.trim()) {
      setError('অনুগ্রহ করে আপনার বিশ্ববিদ্যালয় বা শিক্ষা প্রতিষ্ঠানের নাম লিখুন।');
      return;
    }
    if (!selectedCourseId) {
      setError('অনুগ্রহ করে আপনি যে কোর্সটি করতে চান তা নির্বাচন করুন।');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onComplete({
        university: university.trim(),
        courseId: selectedCourseId,
        phone: phone.trim()
      });
    } catch (err) {
      setError(err.message || 'রেজিস্ট্রেশন সম্পন্ন করতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-amber-500/30 shadow-2xl shadow-amber-500/10 p-6 sm:p-8 space-y-6 text-slate-100 overflow-hidden">
        {/* Glowing Decorative Background Accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2 relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-2xl mx-auto shadow-lg shadow-amber-500/20">
            🎓
          </div>
          <h3 className="text-xl font-extrabold text-white">
            একাডেমিক তথ্য সম্পন্ন করুন
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Google দিয়ে সফলভাবে অথেনটিকেশন হয়েছে। আপনার কোর্স এক্সেস নিশ্চিত করতে নিচের তথ্য ২টি প্রদান করুন:
          </p>
        </div>

        {/* Google User Identity Card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          {googleData.photoUrl ? (
            <img
              src={googleData.photoUrl}
              alt={googleData.name}
              className="w-10 h-10 rounded-full border border-amber-500/40 object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center text-sm shrink-0">
              {googleData.name ? googleData.name[0].toUpperCase() : 'G'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-xs truncate">
                {googleData.name}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                ✓ Google Verified
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate font-mono">
              {googleData.email}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Information Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* University Name */}
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-bold">
              বিশ্ববিদ্যালয় / ল কলেজ এর নাম <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="যেমন: ঢাকা বিশ্ববিদ্যালয়, চট্টগ্রাম বিশ্ববিদ্যালয়, বা ল কলেজ"
              className="w-full rounded-xl bg-slate-950 border border-slate-700/80 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors text-xs"
            />
          </div>

          {/* Desired Course Selection */}
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-bold">
              যে কোর্সটি করতে চাচ্ছেন (Select Course) <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <select
                required
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full appearance-none rounded-xl bg-slate-950 border border-slate-700/80 px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors text-xs cursor-pointer pr-10"
              >
                {courses.length === 0 ? (
                  <option value="">কোর্স লোড হচ্ছে...</option>
                ) : (
                  courses.map((course) => (
                    <option key={course.id || course._id} value={course.id || course._id}>
                      {course.title || course.shortTitle} — (৳{course.price || 'Regular'})
                    </option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                ▼
              </div>
            </div>
          </div>

          {/* Optional Phone Number */}
          <div className="space-y-1.5">
            <label className="block text-slate-400 font-medium">
              মোবাইল নম্বর (ঐচ্ছিক — নোটিফিকেশন ও হেল্পলাইনের জন্য)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full rounded-xl bg-slate-950 border border-slate-700/80 px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors text-xs font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              বাতিল (Cancel)
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>অ্যাকাউন্ট প্রস্তুত হচ্ছে...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>নিবন্ধন সম্পন্ন করুন (Complete Registration)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
