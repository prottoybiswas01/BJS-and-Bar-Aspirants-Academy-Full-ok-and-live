import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard({ openVideoModal }) {
  const { user, updateUserProfile } = useAuth();
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tab state: 'lectures' | 'assignments'
  const [selectedTab, setSelectedTab] = useState('lectures');
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [submittingAsnId, setSubmittingAsnId] = useState(null);
  const [subText, setSubText] = useState('');
  const [subDocUrl, setSubDocUrl] = useState('');
  const [subImages, setSubImages] = useState([]); // Array of base64 image strings or URLs
  const [subLoading, setSubLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    fetchData();
    if (user?.id) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      const [resAsn, resSub] = await Promise.all([
        api.get('/student/assignments', { params: { studentId: user?.id } }),
        api.get('/student/my-submissions', { params: { studentId: user?.id } })
      ]);
      if (resAsn.data.ok) setStudentAssignments(resAsn.data.assignments || []);
      if (resSub.data.ok) setMySubmissions(resSub.data.submissions || []);
    } catch (err) {
      console.log('Assignments fetch notice:', err);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1600;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedDataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageFilesSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        setSubImages(prev => [...prev, compressed]);
      } catch (err) {
        console.error('Image compression error:', err);
      }
    }
  };

  const removeSubImage = (index) => {
    setSubImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAssignment = async (e, assignmentId, courseId) => {
    e.preventDefault();
    if (!subDocUrl && subImages.length === 0) {
      showToast("অনুগ্রহ করে খাতার পৃষ্ঠার ছবি আপলোড করুন অথবা ড্রাইভ/পিডিএফ লিংক শেয়ার করুন।", 'error');
      return;
    }

    setSubLoading(true);
    try {
      const res = await api.post('/student/submit-assignment', {
        assignmentId,
        studentId: user?.id,
        studentName: user?.name,
        studentEmail: user?.email,
        studentPhone: user?.phone,
        courseId,
        submissionText: subText,
        attachmentUrl: subDocUrl,
        imageUrls: subImages
      });

      setSubLoading(false);
      if (res.data.ok) {
        showToast(res.data.message || "আপনার অ্যাসাইনমেন্ট উত্তর সফলভাবে জমা হয়েছে!", 'success');
        setSubmittingAsnId(null);
        setSubText('');
        setSubDocUrl('');
        setSubImages([]);
        fetchAssignments();
      } else {
        showToast(res.data.message || "অ্যাসাইনমেন্ট জমা দিতে সমস্যা হয়েছে।", 'error');
      }
    } catch (err) {
      setSubLoading(false);
      showToast(err.response?.data?.message || "অ্যাসাইনমেন্ট জমা দিতে সমস্যা হয়েছে।", 'error');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const courseRes = await api.get('/courses');
      if (courseRes.data.ok) {
        const activeCourses = (courseRes.data.courses || []).filter(c =>
          !c.status || c.status === 'Active' || String(c.status).toLowerCase().includes('active')
        );
        setCourses(activeCourses);
        if (activeCourses.length > 0) {
          setSelectedCourse(activeCourses[0]);
          fetchLessons(activeCourses[0].id);
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
      {/* Floating Glassmorphic Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-bounceIn max-w-md w-full px-4">
          <div className={`p-4 rounded-2xl border shadow-2xl flex items-center justify-between gap-3 backdrop-blur-xl ${
            toast.type === 'error'
              ? 'bg-rose-950/95 border-rose-500/50 text-rose-200 shadow-rose-900/30'
              : 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200 shadow-emerald-900/30'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{toast.type === 'error' ? '⚠️' : '🎉'}</span>
              <p className="text-xs sm:text-sm font-bold leading-relaxed">{toast.msg}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="w-6 h-6 rounded-lg bg-slate-900/60 hover:bg-slate-900 flex items-center justify-center text-xs font-bold shrink-0 text-slate-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-slate-400 font-bold">আপনার এনরোলকৃত কোর্সসমূহ:</span>
              {courses
                .filter(c => (user?.allowedCourseIds || user?.enrolledCourseIds || []).includes(c.id))
                .map(c => (
                  <span key={c.id} className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-sm">
                    📚 {c.shortTitle || c.title}
                  </span>
                ))}
              {(!user?.allowedCourseIds || user?.allowedCourseIds.length === 0) && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-sm">
                  📚 {user?.batch || 'BJS & Bar Masterclass'}
                </span>
              )}
            </div>
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

      {/* Section Tab Navigation: Video Lectures vs Assignments */}
      <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-2">
        <button
          onClick={() => setSelectedTab('lectures')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
            selectedTab === 'lectures'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📹 ভিডিও ক্লাসসমূহ (Lectures)
        </button>
        <button
          onClick={() => setSelectedTab('assignments')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all relative ${
            selectedTab === 'assignments'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>📝 অ্যাসাইনমেন্ট ও পরীক্ষা ({studentAssignments.length})</span>
        </button>
      </div>

      {/* LECTURES TAB */}
      {selectedTab === 'lectures' && (
        <>
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
                            const isOrientation = (
                              (l.title || '').toLowerCase().includes('orientation') ||
                              (l.title || '').includes('অরিয়েন্টেশন') ||
                              (l.module || '').toLowerCase().includes('orientation') ||
                              (l.module || '').includes('অরিয়েন্টেশন') ||
                              (l.chapter || '').toLowerCase().includes('orientation') ||
                              (l.chapter || '').includes('অরিয়েন্টেশন')
                            );
                            const isCompleted = user?.completedLessonIds?.includes(l.id);
                            const hasVideo = Boolean(l.youtubeId || l.youtubeUrl);
                            const canWatch = (isEnrolled || isOrientation) && hasVideo;

                            let cardClass = 'bg-rose-950/20 border-rose-500/30 text-rose-200';
                            let badgeText = '🔴 Video Pending';
                            let badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/30';

                            if (isOrientation && hasVideo) {
                              cardClass = 'bg-emerald-950/30 border-emerald-500/50 text-emerald-100 hover:border-emerald-400 shadow-md';
                              badgeText = '🎁 Free Orientation Unlocked';
                              badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
                            } else if (!isEnrolled) {
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
                                    className={`px-4 py-2 rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer ${
                                      canWatch
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 hover:scale-105'
                                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                                    }`}
                                  >
                                    {canWatch ? (isOrientation ? '▶️ অরিয়েন্টেশন ফ্রি প্লে' : '▶️ প্লে ভিডিও') : '🔒 প্রিভিউ / তথ্য'}
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
        </>
      )}

      {/* ASSIGNMENTS TAB */}
      {selectedTab === 'assignments' && (
        <section className="space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-white">নির্ধারিত অ্যাসাইনমেন্ট ও হোমওয়ার্ক</h2>
                <p className="text-xs text-slate-400">মেন্টর কর্তৃক প্রকাশিত অ্যাসাইনমেন্ট জমা দিন ও রেজাল্ট দেখুন</p>
              </div>
            </div>

            {studentAssignments.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                বর্তমানে আপনার জন্য কোনো অ্যাসাইনমেন্ট প্রকাশ করা হয়নি।
              </div>
            ) : (
              <div className="space-y-4">
                {studentAssignments.map(asn => {
                  const crs = courses.find(c => c.id === asn.courseId);
                  const sub = mySubmissions.find(s => s.assignmentId === asn.id);
                  const isSubmitted = Boolean(sub);
                  const isGraded = sub && sub.marksObtained !== null && sub.marksObtained !== undefined;
                  const canResubmit = sub?.canResubmit;

                  return (
                    <div key={asn.id} className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div>
                          <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                            {crs ? crs.title : asn.courseId}
                          </span>
                          <h3 className="text-base font-extrabold text-white mt-1">{asn.title}</h3>
                          <p className="text-xs text-slate-400 font-medium">মেন্টর: {asn.mentorName || 'Faculty'}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 text-xs font-mono font-bold">
                            🎯 মোট মার্কস: {asn.totalMarks}
                          </span>
                          {isSubmitted ? (
                            isGraded ? (
                              <span className="px-3 py-1 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                                ✓ মার্কস: {sub.marksObtained} / {asn.totalMarks}
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-xl bg-amber-950 text-amber-300 border border-amber-500/40 text-xs font-bold">
                                ⏳ মূল্যায়নের অপেক্ষায়
                              </span>
                            )
                          ) : (
                            <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">
                              পেন্ডিং (জমা দিতে হবে)
                            </span>
                          )}
                        </div>
                      </div>

                      {asn.description && (
                        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-200 leading-relaxed">
                          <strong className="text-amber-400 block mb-1">অ্যাসাইনমেন্ট প্রশ্ন/নির্দেশনা:</strong>
                          {asn.description}
                        </div>
                      )}

                      {/* SUBMISSION STATE & FORM */}
                      {isSubmitted && !canResubmit ? (
                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-emerald-400 font-bold">
                            <span>✓ আপনি অ্যাসাইনমেন্টটি জমা দিয়েছেন</span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {new Date(sub.createdAt).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {sub.submissionText && (
                            <p className="text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800">
                              {sub.submissionText}
                            </p>
                          )}

                          {sub.attachmentUrl && (
                            <a href={sub.attachmentUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline font-semibold block">
                              🔗 সংযুক্ত ফাইল / ডকুমেন্ট লিংক ↗
                            </a>
                          )}

                          {isGraded && (
                            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-1 mt-2">
                              <p className="text-emerald-300 font-extrabold text-xs">
                                🏆 মেন্টর মূল্যায়ন রেজাল্ট: {sub.marksObtained} / {asn.totalMarks}
                              </p>
                              {sub.feedback && (
                                <p className="text-slate-300 text-xs leading-relaxed">
                                  💬 <strong>মেন্টর মন্তব্য:</strong> {sub.feedback}
                                </p>
                              )}
                            </div>
                          )}

                          <p className="text-[10px] text-slate-500 pt-1">
                            ⚠️ আপনি ইতোমধ্যে জমা দিয়েছেন। পরিবর্তন করতে চাইলে মেন্টর বা অ্যাডমিনের সাথে যোগাযোগ করুন।
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 pt-1">
                          {canResubmit && (
                            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold">
                              🔄 আপনাকে পুনরায় অ্যাসাইনমেন্ট জমা দেওয়ার অনুমতি দেওয়া হয়েছে!
                            </div>
                          )}

                           {submittingAsnId === asn.id ? (
                            <form onSubmit={(e) => handleSubmitAssignment(e, asn.id, asn.courseId)} className="space-y-4 bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs">
                              {/* Multi-Page Handwritten Exam Paper Photo Upload */}
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="block text-amber-400 font-bold">
                                    📷 খাতার পৃষ্ঠার ছবি আপলোড (Handwritten Answer Sheet Photos)
                                  </label>
                                  <span className="text-[10px] text-slate-400">একাধিক পেজ সিলেক্ট করুন ({subImages.length}টি যুক্ত)</span>
                                </div>

                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handleImageFilesSelect}
                                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                                />

                                {/* Preview Thumbnails of Uploaded Exam Pages */}
                                {subImages.length > 0 && (
                                  <div className="pt-2 flex flex-wrap gap-2">
                                    {subImages.map((imgUrl, idx) => (
                                      <div key={idx} className="relative group w-20 h-24 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                                        <img src={imgUrl} alt={`Page ${idx+1}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1 text-center">
                                          <span className="text-[9px] text-amber-300 font-bold">Page {idx+1}</span>
                                          <button
                                            type="button"
                                            onClick={() => removeSubImage(idx)}
                                            className="px-1 py-0.5 rounded bg-rose-600 text-white text-[9px] font-bold"
                                          >
                                            ✕ মুছে ফেলুন
                                          </button>
                                        </div>
                                        <span className="absolute bottom-0 left-0 right-0 bg-slate-950/80 text-[8px] text-slate-300 text-center font-mono py-0.5">
                                          পৃষ্ঠা {idx+1}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div>
                                <label className="block text-slate-300 font-medium mb-1">গুগল ড্রাইভ / পিডিএফ / এক্সটার্নাল ডকুমেন্ট লিঙ্ক (ঐচ্ছিক)</label>
                                <input
                                  type="url"
                                  value={subDocUrl}
                                  onChange={(e) => setSubDocUrl(e.target.value)}
                                  placeholder="https://drive.google.com/file/d/... বা PDF লিঙ্ক"
                                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                                />
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSubmittingAsnId(null)}
                                  className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                                >
                                  বাতিল
                                </button>
                                <button
                                  type="submit"
                                  disabled={subLoading}
                                  className="py-2 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-extrabold hover:from-amber-400 shadow-md"
                                >
                                  {subLoading ? 'জমা হচ্ছে...' : '📤 জমা দিন (Submit Assignment)'}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <button
                              onClick={() => {
                                setSubmittingAsnId(asn.id);
                                setSubText(sub?.submissionText || '');
                                setSubDocUrl(sub?.attachmentUrl || '');
                              }}
                              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 text-xs font-extrabold shadow-md transition-all"
                            >
                              ✍️ {canResubmit ? 'পুনরায় উত্তর জমা দিন' : 'উত্তর জমা দিন (Submit Response)'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
