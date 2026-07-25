import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function MentorDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'assignments' | 'evaluations'

  // Data states
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');

  // Assignment Form State
  const [asnTitle, setAsnTitle] = useState('');
  const [asnCourseId, setAsnCourseId] = useState('');
  const [asnDescription, setAsnDescription] = useState('');
  const [asnTotalMarks, setAsnTotalMarks] = useState(100);
  const [asnDueDate, setAsnDueDate] = useState('');
  const [asnSubmitting, setAsnSubmitting] = useState(false);

  // Evaluation Grading Modal State
  const [gradingModal, setGradingModal] = useState({ isOpen: false, submission: null });
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isFullScriptView, setIsFullScriptView] = useState(false);
  const [gradeMarks, setGradeMarks] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradingSubmitting, setGradingSubmitting] = useState(false);

  // Interactive Image Inspector Zoom & Pan States
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullScreenModal, setIsFullScreenModal] = useState(false);

  const handleZoomIn = () => setZoomScale(prev => Math.min(4.5, prev + 0.35));
  const handleZoomOut = () => {
    setZoomScale(prev => {
      const next = Math.max(0.6, prev - 0.35);
      if (next <= 1) setPanPos({ x: 0, y: 0 });
      return next;
    });
  };
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleResetZoom = () => {
    setZoomScale(1);
    setRotation(0);
    setPanPos({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (zoomScale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoomScale <= 1) return;
    setPanPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e) => {
    if (zoomScale <= 1 || !e.touches || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - panPos.x, y: touch.clientY - panPos.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || zoomScale <= 1 || !e.touches || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPanPos({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDownloadMeritPdf = async (assignmentId, title) => {
    try {
      showToast(`🏆 "${title}" মেধা তালিকা পিডিএফে কনভার্ট ও প্রসেস হচ্ছে...`, 'success');
      const response = await api.post('/admin/generate-merit-pdf', { assignmentId }, { responseType: 'blob' });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Merit_List_${(title || 'Assignment').replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
      showToast('পিডিএফ মেধা তালিকা ডাউনলোডে সমস্যা হয়েছে।', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resStud, resCrs, resAsn, resSub] = await Promise.all([
        api.get('/mentor/students', { params: { mentorId: user?.id } }),
        api.get('/courses'),
        api.get('/mentor/assignments', { params: { mentorId: user?.id } }),
        api.get('/mentor/submissions', { params: { mentorId: user?.id } })
      ]);

      if (resStud.data.ok) setStudents(resStud.data.students || []);
      if (resCrs.data.ok) setCourses(resCrs.data.courses || []);
      if (resAsn.data.ok) setAssignments(resAsn.data.assignments || []);
      if (resSub.data.ok) setSubmissions(resSub.data.submissions || []);
    } catch (err) {
      console.error("Mentor dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Create Assignment
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!asnTitle || !asnCourseId) {
      showToast("অ্যাসাইনমেন্ট শিরোনাম ও কোর্স সিলেক্ট করুন।", "error");
      return;
    }

    setAsnSubmitting(true);
    try {
      const res = await api.post('/mentor/assignments', {
        title: asnTitle,
        courseId: asnCourseId,
        description: asnDescription,
        totalMarks: Number(asnTotalMarks) || 100,
        dueDate: asnDueDate,
        mentorId: user?.id || "MTR-001",
        mentorName: user?.name || "Mentor"
      });

      setAsnSubmitting(false);
      if (res.data.ok) {
        showToast(res.data.message || "অ্যাসাইনমেন্ট সফলভাবে প্রকাশিত হয়েছে!");
        setAsnTitle('');
        setAsnDescription('');
        setAsnTotalMarks(100);
        setAsnDueDate('');
        loadData();
      } else {
        showToast(res.data.message || "অ্যাসাইনমেন্ট তৈরিতে সমস্যা হয়েছে।", "error");
      }
    } catch (err) {
      setAsnSubmitting(false);
      showToast(err.response?.data?.message || "অ্যাসাইনমেন্ট সার্ভার এরর।", "error");
    }
  };

  // Handle Delete Assignment
  const handleDeleteAssignment = async (id) => {
    if (!window.confirm("আপনি কি নিশ্চিত যে এই অ্যাসাইনমেন্টটি মুছে ফেলতে চান?")) return;
    try {
      const res = await api.delete(`/mentor/assignments/${id}`);
      if (res.data.ok) {
        showToast("অ্যাসাইনমেন্ট মুছে ফেলা হয়েছে।");
        loadData();
      }
    } catch (e) {
      showToast("মুছে ফেলতে সমস্যা হয়েছে।", "error");
    }
  };

  // Handle Grade Submission
  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!gradingModal.submission) return;

    setGradingSubmitting(true);
    try {
      const res = await api.post('/mentor/grade-submission', {
        submissionId: gradingModal.submission.id,
        marksObtained: Number(gradeMarks),
        feedback: gradeFeedback,
        gradedBy: user?.name || "Mentor"
      });

      setGradingSubmitting(false);
      if (res.data.ok) {
        showToast(res.data.message || "খাতা মূল্যায়ন সফল হয়েছে!");
        setGradingModal({ isOpen: false, submission: null });
        loadData();
      } else {
        showToast(res.data.message || "মূল্যায়নে সমস্যা হয়েছে।", "error");
      }
    } catch (err) {
      setGradingSubmitting(false);
      showToast("মূল্যায়ন সংরক্ষণ সমস্যা।", "error");
    }
  };

  // Handle Reset Submission (Allow student to resubmit)
  const handleResetSubmission = async (submissionId) => {
    if (!window.confirm("আপনি কি এই শিক্ষার্থীকে পুনরায় অ্যাসাইনমেন্ট জমা দেওয়ার অনুমতি দিতে চান?")) return;

    try {
      const res = await api.post('/mentor/reset-submission', { submissionId });
      if (res.data.ok) {
        showToast("শিক্ষার্থীকে রিসেট অনুমতি দেওয়া হয়েছে।");
        loadData();
      }
    } catch (e) {
      showToast("রিসেট করতে সমস্যা হয়েছে।", "error");
    }
  };

  // Filtered Students
  const filteredStudents = students.filter(s => {
    const q = searchStudent.toLowerCase();
    const matchSearch = (s.name || '').toLowerCase().includes(q) ||
                        (s.phone || '').includes(q) ||
                        (s.id || '').toLowerCase().includes(q) ||
                        (s.email || '').toLowerCase().includes(q);

    if (selectedCourseFilter === 'all') return matchSearch;
    const enrolled = s.enrolledCourseIds || s.allowedCourseIds || [];
    return matchSearch && enrolled.includes(selectedCourseFilter);
  });

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-2 animate-bounce ${
          toast.type === 'error'
            ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
            : 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
        }`}>
          <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Mentor Profile Header Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 bg-gradient-to-r from-slate-950 via-[#0b1325] to-amber-950/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black text-2xl sm:text-3xl flex items-center justify-center shadow-xl shadow-amber-500/20 shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'M'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">{user?.name || 'মেন্টর প্যানেল'}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                  Official Mentor
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {user?.designation || 'সহকারী জজ (BJS)'} • {user?.email}
              </p>
              <p className="text-[11px] text-amber-400/90 font-mono mt-1">
                🆔 {user?.id || 'MTR-ID'}
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
            <div className="text-center px-2">
              <p className="text-lg font-black text-amber-400">{students.length}</p>
              <p className="text-[10px] text-slate-400 font-medium">নির্ধারিত শিক্ষার্থী</p>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="text-center px-2">
              <p className="text-lg font-black text-cyan-400">{assignments.length}</p>
              <p className="text-[10px] text-slate-400 font-medium">প্রকাশিত অ্যাসাইনমেন্ট</p>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="text-center px-2">
              <p className="text-lg font-black text-emerald-400">{submissions.length}</p>
              <p className="text-[10px] text-slate-400 font-medium">জমা হওয়া খাতা</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'students'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <span>👨‍🎓</span>
          <span>নির্ধারিত শিক্ষার্থী তালিকা ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'assignments'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <span>📝</span>
          <span>অ্যাসাইনমেন্ট ম্যানেজার ({assignments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('evaluations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'evaluations'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <span>📊</span>
          <span>খাতা মূল্যায়ন ও মার্কিং ({submissions.length})</span>
        </button>
      </div>

      {/* TAB 1: ASSIGNED STUDENTS DIRECTORY */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="শিক্ষার্থীর নাম, আইডি বা ফোন দিয়ে খুঁজুন..."
                className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">কোর্স ফিল্টার:</span>
              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="w-full sm:w-48 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">সকল নির্ধারিত কোর্স</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-4">স্টুডেন্ট আইডি ও নাম</th>
                    <th className="p-4">মোবাইল ও ইমেইল</th>
                    <th className="p-4">ব্যাচ</th>
                    <th className="p-4">এনরোল্ড কোর্স</th>
                    <th className="p-4">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400">
                        তথ্য লোড হচ্ছে...
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-slate-400">
                        কোনো শিক্ষার্থী পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                              {st.name ? st.name[0].toUpperCase() : 'S'}
                            </div>
                            <div>
                              <p className="font-bold text-white text-xs">{st.name}</p>
                              <p className="text-[10px] text-amber-400 font-mono">{st.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-mono text-slate-200">{st.phone}</p>
                          <p className="text-[11px] text-slate-400">{st.email || 'N/A'}</p>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 font-medium text-[11px]">
                            {st.batch || 'Judiciary 2026'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(st.allowedCourseIds || st.enrolledCourseIds || []).map((cId) => {
                              const crs = courses.find(c => c.id === cId);
                              return (
                                <span key={cId} className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-medium">
                                  {crs ? crs.title : cId}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            st.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {st.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ASSIGNMENT MANAGER */}
      {activeTab === 'assignments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Create Assignment Form */}
          <div className="lg:col-span-1 glass-card rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <span className="text-xl">➕</span>
              <h3 className="text-base font-extrabold text-white">নতুন অ্যাসাইনমেন্ট প্রকাশ</h3>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">অ্যাসাইনমেন্ট শিরোনাম *</label>
                <input
                  type="text"
                  value={asnTitle}
                  onChange={(e) => setAsnTitle(e.target.value)}
                  placeholder="উদাহরণ: দেওয়ানী কার্যবিধি মোকাদ্দমা ড্রাফটিং"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">কোর্স নির্বাচন করুন *</label>
                <select
                  value={asnCourseId}
                  onChange={(e) => setAsnCourseId(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  required
                >
                  <option value="">-- কোর্স বেছে নিন --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">মোট নম্বর</label>
                  <input
                    type="number"
                    value={asnTotalMarks}
                    onChange={(e) => setAsnTotalMarks(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">জমার শেষ তারিখ</label>
                  <input
                    type="date"
                    value={asnDueDate}
                    onChange={(e) => setAsnDueDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">অ্যাসাইনমেন্টের বিবরণ / প্রশ্ন / ইনস্ট্রাকশন</label>
                <textarea
                  rows={4}
                  value={asnDescription}
                  onChange={(e) => setAsnDescription(e.target.value)}
                  placeholder="অ্যাসাইনমেন্টের প্রশ্নাবলী বা বিস্তারিত ইনস্ট্রাকশন লিখুন..."
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={asnSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all"
              >
                {asnSubmitting ? 'প্রকাশ হচ্ছে...' : '📢 অ্যাসাইনমেন্ট প্রকাশ করুন'}
              </button>
            </form>
          </div>

          {/* Assignments List */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white">প্রকাশিত অ্যাসাইনমেন্ট সমূহ</h3>
              <span className="text-xs text-slate-400 font-mono">মোট: {assignments.length}টি</span>
            </div>

            {assignments.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                এখনো কোনো অ্যাসাইনমেন্ট প্রকাশ করা হয়নি।
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map(asn => {
                  const crs = courses.find(c => c.id === asn.courseId);
                  const asnSubmissions = submissions.filter(s => s.assignmentId === asn.id);

                  return (
                    <div key={asn.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 transition-all space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                            {crs ? crs.title : asn.courseId}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-1">{asn.title}</h4>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleDownloadMeritPdf(asn.id, asn.title)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400/40 text-xs font-black transition-all shadow-md flex items-center gap-1"
                            title="মেধা তালিকা পিডিএফে রেজাল্ট শিট ডাউনলোড করুন"
                          >
                            🏆 মেধা তালিকা (PDF)
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('evaluations');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-900 transition-colors"
                          >
                            📥 খাতা ({asnSubmissions.length})
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(asn.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-900 transition-colors"
                            title="মুছে ফেলুন"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {asn.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                          {asn.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                        <span>🎯 মোট মার্কস: <strong className="text-amber-400">{asn.totalMarks}</strong></span>
                        <span>📅 শেষ তারিখ: <strong className="text-slate-200">{asn.dueDate || 'সীমাহীন'}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SUBMISSIONS & EVALUATION */}
      {activeTab === 'evaluations' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-white">জমা হওয়া অ্যাসাইনমেন্ট ও মূল্যায়ন</h3>
                <p className="text-xs text-slate-400">শিক্ষার্থীদের জমা দেওয়া খাতা চেক করুন এবং প্রাপ্ত নম্বর প্রদান করুন</p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">শিক্ষার্থী</th>
                    <th className="p-3.5">অ্যাসাইনমেন্ট</th>
                    <th className="p-3.5">উত্তর / লিংক</th>
                    <th className="p-3.5">জমার সময়</th>
                    <th className="p-3.5">প্রাপ্ত নম্বর</th>
                    <th className="p-3.5 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500 text-xs">
                        এখনো কোনো শিক্ষার্থী অ্যাসাইনমেন্ট জমা দেয়নি।
                      </td>
                    </tr>
                  ) : (
                    submissions.map(sub => {
                      const asn = assignments.find(a => a.id === sub.assignmentId);
                      const isGraded = sub.marksObtained !== null && sub.marksObtained !== undefined;

                      return (
                        <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5">
                            <div>
                              <p className="font-bold text-white">{sub.studentName || 'Student'}</p>
                              <p className="text-[10px] text-amber-400 font-mono">{sub.studentId}</p>
                              <p className="text-[10px] text-slate-400">{sub.studentPhone}</p>
                            </div>
                          </td>
                          <td className="p-3.5 max-w-xs">
                            <p className="font-bold text-slate-200 line-clamp-1">{asn ? asn.title : sub.assignmentId}</p>
                            <p className="text-[10px] text-slate-400">মোট মার্কস: {asn?.totalMarks || 100}</p>
                          </td>
                          <td className="p-3.5 max-w-xs space-y-1">
                            {sub.imageUrls && sub.imageUrls.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                                📷 {sub.imageUrls.length}টি খাতার পৃষ্ঠা যুক্ত
                              </span>
                            )}
                            {sub.submissionText && (
                              <p className="text-[11px] text-slate-300 bg-slate-950 p-2 rounded border border-slate-800 line-clamp-2 leading-relaxed">
                                {sub.submissionText}
                              </p>
                            )}
                            {sub.attachmentUrl && (
                              <a
                                href={sub.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block text-[11px] text-cyan-400 font-semibold hover:underline"
                              >
                                🔗 ডক/পিডিএফ লিংক খুলুন ↗
                              </a>
                            )}
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-400">
                            {new Date(sub.createdAt).toLocaleDateString('bn-BD', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="p-3.5">
                            {isGraded ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 font-extrabold border border-emerald-500/40 text-xs">
                                  {sub.marksObtained} / {asn?.totalMarks || 100}
                                </span>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                মূল্যায়ন বাকি
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              onClick={() => {
                                setGradingModal({ isOpen: true, submission: sub });
                                setActiveImgIdx(0);
                                setGradeMarks(sub.marksObtained !== null ? sub.marksObtained : '');
                                setGradeFeedback(sub.feedback || '');
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-all shadow-md flex-inline items-center gap-1"
                            >
                              📄 {isGraded ? 'খাতা ও মার্কস দেখুন' : 'খাতা দেখুন ও নম্বর দিন'}
                            </button>

                            <button
                              onClick={() => handleResetSubmission(sub.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold"
                              title="পুনরায় জমা দেওয়ার অনুমতি দিন"
                            >
                              🔄 রিসেট
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCED EXAM SCRIPT INSPECTOR & GRADING MODAL */}
      {gradingModal.isOpen && gradingModal.submission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="glass-card max-w-5xl w-full rounded-3xl p-5 sm:p-7 border border-slate-800 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div>
                <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  HANDWRITTEN EXAM SCRIPT INSPECTOR
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  শিক্ষার্থী খাতা মূল্যায়ন ও মার্কিং প্যানেল
                </h3>
              </div>
              <button
                onClick={() => setGradingModal({ isOpen: false, submission: null })}
                className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-lg font-bold transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Grid Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1 pr-1">
              
              {/* Left Column (8 cols): Exam Paper Handwritten Photos & Script Viewer */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Answer Script Images Gallery */}
                {gradingModal.submission.imageUrls && gradingModal.submission.imageUrls.length > 0 ? (
                  <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <span>📷 হস্তলিখিত খাতার পৃষ্ঠা:</span>
                        <strong className="text-white font-mono">{activeImgIdx + 1} / {gradingModal.submission.imageUrls.length}</strong>
                      </span>

                      {/* Interactive Zoom & Controls Toolbar */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          disabled={activeImgIdx === 0}
                          onClick={() => { setActiveImgIdx(prev => Math.max(0, prev - 1)); handleResetZoom(); }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-200 border border-slate-800 hover:border-amber-500 text-xs font-bold disabled:opacity-40"
                          title="আগের পৃষ্ঠা"
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          disabled={activeImgIdx >= gradingModal.submission.imageUrls.length - 1}
                          onClick={() => { setActiveImgIdx(prev => Math.min(gradingModal.submission.imageUrls.length - 1, prev + 1)); handleResetZoom(); }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-200 border border-slate-800 hover:border-amber-500 text-xs font-bold disabled:opacity-40"
                          title="পরের পৃষ্ঠা"
                        >
                          ▶
                        </button>

                        <div className="h-4 w-[1px] bg-slate-800 mx-1" />

                        <button
                          type="button"
                          onClick={handleZoomIn}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold transition-all"
                          title="জুম ইন"
                        >
                          🔍+
                        </button>
                        <button
                          type="button"
                          onClick={handleZoomOut}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold transition-all"
                          title="জুম আউট"
                        >
                          🔍-
                        </button>
                        <button
                          type="button"
                          onClick={handleRotate}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-200 border border-slate-800 hover:border-amber-500 text-xs font-bold"
                          title="ঘোড়ান"
                        >
                          🔄
                        </button>
                        <button
                          type="button"
                          onClick={handleResetZoom}
                          className="px-2 py-1 rounded-lg bg-slate-900 text-slate-400 border border-slate-800 hover:text-white text-xs font-bold"
                          title="জুম রিসেট"
                        >
                          100%
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsFullScreenModal(true)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500 hover:text-slate-950 text-xs font-bold transition-all"
                          title="ফুলস্ক্রিনে খাতা ইনস্পেক্ট করুন"
                        >
                          ↗ ফুলস্ক্রিন
                        </button>
                      </div>
                    </div>

                    {/* Main Interactive Zoomable & Draggable Inspector Area */}
                    <div
                      onWheel={(e) => {
                        if (e.deltaY < 0) handleZoomIn();
                        else if (e.deltaY > 0) handleZoomOut();
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 min-h-[380px] max-h-[520px] flex items-center justify-center p-4 select-none touch-none"
                      style={{ cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                    >
                      <div
                        className="transition-transform duration-75 ease-out flex items-center justify-center"
                        style={{
                          transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoomScale}) rotate(${rotation}deg)`,
                          transformOrigin: 'center center',
                          willChange: 'transform'
                        }}
                      >
                        <img
                          src={gradingModal.submission.imageUrls[activeImgIdx]}
                          alt={`Script Page ${activeImgIdx + 1}`}
                          className="max-h-[460px] max-w-full w-auto object-contain shadow-2xl rounded-lg pointer-events-none"
                          draggable={false}
                        />
                      </div>
                      {zoomScale > 1 && (
                        <div className="absolute bottom-3 right-3 px-3 py-1 rounded-xl bg-slate-950/90 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold backdrop-blur-md shadow-lg pointer-events-none">
                          🔍 জুম: {Math.round(zoomScale * 100)}% (মাউস/আঙ্গুল দিয়ে ড্রাগ করুন)
                        </div>
                      )}
                    </div>

                    {/* Page Thumbnails Bar */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {gradingModal.submission.imageUrls.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => { setActiveImgIdx(idx); handleResetZoom(); }}
                          className={`relative w-16 h-20 rounded-lg overflow-hidden border shrink-0 transition-all ${
                            activeImgIdx === idx
                              ? 'border-amber-500 ring-2 ring-amber-500/50 scale-105'
                              : 'border-slate-800 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt={`Thumb ${idx+1}`} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 left-0 right-0 bg-slate-950/80 text-[8px] font-mono font-bold text-slate-200 text-center py-0.5">
                            P.{idx+1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <span>🧹 অটো-গার্বেজ ক্লিনআপ নোটিশ:</span>
                    </p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      ১৫ দিন পার হওয়ায় স্পেস সাশ্রয়ে খাতার ছবিসমূহ ডাটাবেজ থেকে ক্লিনআপ করা হয়েছে। শিক্ষার্থী নম্বর <strong>({gradingModal.submission.marksObtained !== null ? gradingModal.submission.marksObtained : 'জমা'})</strong> ও মূল্যায়ন তথ্য ডাটাবেজে সম্পূর্ণ সুরক্ষিত রয়েছে।
                    </p>
                  </div>
                )}

                {/* Typed Text Answer */}
                {gradingModal.submission.submissionText && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <span className="text-amber-400 font-bold block">📝 শিক্ষার্থীর টাইপকৃত উত্তর (Written Answer Text):</span>
                    <div className="p-3 rounded-xl bg-slate-900 text-slate-200 leading-relaxed font-sans max-h-48 overflow-y-auto border border-slate-800/80 whitespace-pre-wrap">
                      {gradingModal.submission.submissionText}
                    </div>
                  </div>
                )}

                {/* PDF / Attachment Link */}
                {gradingModal.submission.attachmentUrl && (
                  <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-xs">
                    <span className="text-cyan-200 font-bold">📄 গুগল ড্রাইভ / পিডিএফ ডকুমেন্ট লিংক:</span>
                    <a
                      href={gradingModal.submission.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-extrabold shadow hover:bg-cyan-400 transition-all"
                    >
                      ডকুমেন্ট সরাসরি খুলুন ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Right Column (5 cols): Student Profile & Evaluation Input Form */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Student Info Card with University & Academic History */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <p className="text-slate-400 text-[10px]">পরীক্ষার্থী শিক্ষার্থী:</p>
                      <p className="font-extrabold text-white text-sm">{gradingModal.submission.studentName}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-[11px] border border-amber-500/30">
                      {gradingModal.submission.studentId}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-300 pt-1">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 font-medium">🎓 বিশ্ববিদ্যালয় / ল ইন্সটিটিউট:</span>
                      <strong className="text-amber-400 font-semibold">
                        {gradingModal.submission.studentUniversity ||
                         students.find(s => s.id === gradingModal.submission.studentId)?.university ||
                         'ঢাকা বিশ্ববিদ্যালয় (আইন বিভাগ)'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between px-1 text-slate-400">
                      <span>🏛️ একাডেমিক রেজাল্ট আইডি: <strong className="text-amber-300 font-mono">{gradingModal.submission.studentId}</strong></span>
                      <span>📅 জমা: <strong className="text-slate-200">{new Date(gradingModal.submission.createdAt).toLocaleDateString()}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Grading Form */}
                <form onSubmit={handleSaveGrade} className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <label className="block text-amber-400 font-extrabold text-sm">
                      প্রাপ্ত নম্বর (Obtained Marks) *
                    </label>
                    <input
                      type="number"
                      value={gradeMarks}
                      onChange={(e) => setGradeMarks(e.target.value)}
                      placeholder="যেমন: 85"
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-amber-400 font-extrabold text-2xl focus:outline-none focus:border-amber-500"
                      required
                    />
                    <p className="text-[10px] text-slate-400">
                      নোট: মোট বরাদ্দকৃত মার্কসের ওপর প্রাপ্ত পয়েন্ট প্রদান করুন।
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">
                      মেন্টর পরামর্শ ও ফিডব্যাক নোট (Evaluation Feedback Notes)
                    </label>
                    <textarea
                      rows={4}
                      value={gradeFeedback}
                      onChange={(e) => setGradeFeedback(e.target.value)}
                      placeholder="খাতায় ভুলত্রুটি বা উন্নতির পরামর্শ লিখুন..."
                      className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setGradingModal({ isOpen: false, submission: null })}
                      className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={gradingSubmitting}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-extrabold hover:from-amber-400 shadow-lg shadow-amber-500/20"
                    >
                      {gradingSubmitting ? 'সংরক্ষণ হচ্ছে...' : '✓ মার্কস সংরক্ষণ করুন'}
                    </button>
                  </div>
                </form>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* FULL-SCREEN INTERACTIVE EXAM SCRIPT INSPECTOR MODAL */}
      {isFullScreenModal && gradingModal.submission && gradingModal.submission.imageUrls && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col p-4 animate-fadeIn">
          {/* Header Controls */}
          <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-2xl border border-slate-800 backdrop-blur-md mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-extrabold text-amber-400">
                📄 পৃষ্ঠা: {activeImgIdx + 1} / {gradingModal.submission.imageUrls.length}
              </span>
              <span className="text-xs text-slate-400">
                ({gradingModal.submission.studentName} — {gradingModal.submission.studentId})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleZoomIn}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-extrabold"
              >
                🔍+ জুম ইন
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-extrabold"
              >
                🔍- জুম আউট
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold"
              >
                🔄 ঘোড়ান
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold"
              >
                100% রিসেট
              </button>
              <button
                type="button"
                onClick={() => setIsFullScreenModal(false)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg"
              >
                ✕ বন্ধ করুন
              </button>
            </div>
          </div>

          {/* Full Screen Centered & Draggable Canvas Area */}
          <div
            onWheel={(e) => {
              if (e.deltaY < 0) handleZoomIn();
              else if (e.deltaY > 0) handleZoomOut();
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex-1 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden p-4 flex items-center justify-center relative select-none touch-none"
            style={{ cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          >
            <div
              className="transition-transform duration-75 ease-out flex items-center justify-center"
              style={{
                transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoomScale}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                willChange: 'transform'
              }}
            >
              <img
                src={gradingModal.submission.imageUrls[activeImgIdx]}
                alt={`Full Screen Script Page ${activeImgIdx + 1}`}
                className="max-h-[85vh] max-w-full w-auto object-contain shadow-2xl rounded-xl pointer-events-none"
                draggable={false}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
