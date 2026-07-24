import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard({ openVideoModal, openPaymentModal }) {
  const { user, updateUserProfile } = useAuth();
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const courseRes = await api.get('/courses');
      if (courseRes.data.ok) {
        setCourses(courseRes.data.courses);
        if (courseRes.data.courses.length > 0) {
          setSelectedCourse(courseRes.data.courses[0]);
          fetchLessons(courseRes.data.courses[0].id);
        }
      }
    } catch (err) {
      console.log('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async (courseId) => {
    try {
      const res = await api.get(`/lessons?courseId=${courseId}`);
      if (res.data.ok) {
        setLessons(res.data.lessons);
      }
    } catch (err) {
      console.log('Lessons error:', err);
    }
  };

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    fetchLessons(course.id);
  };

  const toggleComplete = async (lessonId) => {
    if (!user) return;
    try {
      const res = await api.post('/student/complete-lesson', {
        studentId: user.id,
        lessonId,
      });
      if (res.data.ok) {
        updateUserProfile({ completedLessonIds: res.data.completedLessonIds });
      }
    } catch (err) {
      console.log('Complete toggle error:', err);
    }
  };

  // Group lessons by Chapter (অধ্যায়) if available, otherwise by Module
  const groupedLessons = lessons.reduce((acc, l) => {
    const groupKey = l.chapter && l.chapter.trim() !== '' ? l.chapter : (l.module || 'সাধারণ বিষয়সূচি (General Module)');
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(l);
    return acc;
  }, {});

  // Evaluate Student Course Rule for Selected Course
  const courseRule = user?.courseRules?.find((r) => r.courseId === selectedCourse?.id) || {
    unlimitedAccess: true, // Default open for enrolled courses
    enrollmentStatus: 'Active'
  };

  const isEnrolled = selectedCourse && (user?.allowedCourseIds?.includes(selectedCourse.id) || user?.enrolledCourseIds?.includes(selectedCourse.id));
  const isUnlimited = courseRule.unlimitedAccess || isEnrolled;
  const completedCount = user?.completedLessonIds?.length || 0;
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="space-y-8 pb-16 animate-fadeIn">
      {/* Admin Popup Message Alert */}
      {user?.popupMessage?.body && (
        <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs shadow-lg space-y-1">
          <div className="flex justify-between items-center font-bold text-amber-300">
            <span>📢 {user.popupMessage.title || 'Notice from Academy Admin'}</span>
            <span className="font-mono text-[10px] text-slate-400">
              {new Date(user.popupMessage.sentAt).toLocaleDateString()}
            </span>
          </div>
          <p className="leading-relaxed text-slate-100">{user.popupMessage.body}</p>
        </div>
      )}

      {/* Top Welcome Banner */}
      <section className="glass-card rounded-2xl p-6 sm:p-8 border border-amber-500/20 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
                ● STATUS: {user?.status || 'Active'}
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
                ID: {user?.id || 'STU-2026-001'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white">
              স্বাগতম, <span className="text-gradient-gold">{user?.name || 'শিক্ষার্থী'}</span>!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              ব্যাচ: <strong className="text-amber-300">{user?.batch || 'Wed,Sat'}</strong> | সেশন: <span className="text-slate-400">{user?.session || '2026-04-01'}</span>
            </p>
          </div>

          {/* Learning Progress Widget */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 min-w-[240px]">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-400">কোর্স অগ্রগতি (Progress)</span>
              <span className="text-amber-400 font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 text-right">
              {completedCount} / {lessons.length} লেকচার সম্পন্ন
            </p>
          </div>
        </div>
      </section>

      {/* Course Switcher Tabs */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>📚 নিবন্ধিত ও লার্নিং কোর্সসমূহ</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {courses.map((c) => {
            const active = selectedCourse?.id === c.id;
            const enrolled = user?.allowedCourseIds?.includes(c.id) || user?.enrolledCourseIds?.includes(c.id);

            return (
              <button
                key={c.id}
                onClick={() => handleSelectCourse(c)}
                className={`p-4 rounded-2xl text-left transition-all border ${
                  active
                    ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                    : 'glass-card border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold font-mono text-amber-400">{c.shortTitle || c.title}</span>
                  {enrolled ? (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      Enrolled
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                      Not Enrolled
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-sm text-white line-clamp-1">{c.title}</h3>
                <p className="text-[11px] text-slate-500 mt-1">ফ্যাকাল্টি: {c.faculty}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected Course Modules & Video Matrix */}
      {selectedCourse && (
        <section className="space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">
                    {selectedCourse.category}
                  </span>
                  {isUnlimited && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px]">
                      ★ Unlimited Access Active
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-extrabold text-white">{selectedCourse.title}</h2>
                <p className="text-xs text-slate-400 mt-1">{selectedCourse.description}</p>
              </div>

              {!isEnrolled && (
                <button
                  onClick={() => openPaymentModal(selectedCourse)}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-lg shadow-pink-600/30 transition-all flex items-center gap-2"
                >
                  <span>bKash দিয়ে ভর্তি হন</span>
                  <span className="font-mono">৳{selectedCourse.price}</span>
                </button>
              )}
            </div>

            {/* Video Color-Coding Matrix Legend */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-wrap items-center gap-4 text-xs">
              <span className="text-slate-400 font-medium">ভিডিও স্ট্যাটাস গাইড:</span>
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-semibold">
                🟢 Emerald Green: ভিডিও প্রস্তুত ও আনলকড
              </span>
              <span className="flex items-center gap-1 text-rose-400 bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-500/30 font-semibold">
                🔴 Rose Red: ভিডিও পেন্ডিং / কোর্স আনলকড নয়
              </span>
            </div>

            {/* Lessons Accordion List */}
            <div className="space-y-6 pt-2">
              {Object.keys(groupedLessons).length === 0 ? (
                <p className="text-center py-8 text-slate-500 text-xs">
                  এই কোর্সের কোনো লেকচার ভিডিও পাওয়া যায়নি।
                </p>
              ) : (
                Object.entries(groupedLessons).map(([groupTitle, groupLessons]) => (
                  <div key={groupTitle} className="space-y-3">
                    <h3 className="text-xs sm:text-sm font-extrabold text-amber-300 border-l-4 border-amber-500 pl-3 py-1.5 flex items-center justify-between bg-slate-950/80 px-3.5 rounded-r-xl border-y border-r border-slate-800">
                      <span className="flex items-center gap-2">📖 {groupTitle}</span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
                        {groupLessons.length} টি ক্লাসের ভিডিও
                      </span>
                    </h3>

                    <div className="space-y-2">
                      {groupLessons.map((l) => {
                        const isCompleted = user?.completedLessonIds?.includes(l.id);
                        const hasVideo = Boolean(l.youtubeId || l.youtubeUrl);
                        const canWatch = isEnrolled && hasVideo;

                        let cardClass = 'bg-rose-950/20 border-rose-500/30 text-rose-200';
                        let badgeText = '🔴 Video Pending';
                        let badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/30';

                        if (!isEnrolled) {
                          badgeText = '🔒 Course Locked';
                        } else if (hasVideo) {
                          cardClass = 'bg-emerald-950/25 border-emerald-500/30 text-emerald-200 hover:border-emerald-400';
                          badgeText = '🟢 Video Unlocked';
                          badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                        }

                        if (isCompleted) {
                          cardClass = 'bg-emerald-900/40 border-emerald-400 text-emerald-100';
                        }

                        return (
                          <div
                            key={l.id}
                            className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${cardClass}`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                                  {badgeText}
                                </span>
                                <span className="font-mono text-[11px] text-slate-400">⏱️ {l.duration}</span>
                                <span className="font-mono text-[10px] text-slate-500">Released: {l.releaseDate}</span>
                              </div>
                              <h4 className="font-bold text-white text-sm">{l.title}</h4>
                              <p className="text-xs text-slate-300">{l.description}</p>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                              <button
                                onClick={() => toggleComplete(l.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                  isCompleted
                                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                }`}
                              >
                                {isCompleted ? '✓ Completed' : 'Mark Done'}
                              </button>

                              <button
                                onClick={() => openVideoModal(l)}
                                className={`px-4 py-2 rounded-xl text-xs font-extrabold shadow-md transition-all ${
                                  canWatch
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 hover:scale-105'
                                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-pointer'
                                }`}
                              >
                                {canWatch ? '▶ প্লে ক্লাস (Play)' : '🔒 প্রিভিউ / তথ্য'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
