import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminPanel({ openLessonManager }) {
  const [stats, setStats] = useState({
    totalStudents: 21,
    activeCourses: 4,
    paymentReviews: 0,
    messageLogs: 3,
    peakMonth: 'Apr (12 students)',
    monthlyAverage: '1.8',
    latestAdmission: 'MD. HASAN MURAD',
    monthlyCounts: { JAN: 0, FEB: 0, MAR: 7, APR: 12, MAY: 1, JUN: 1, JUL: 0, AUG: 0, SEP: 0, OCT: 0, NOV: 0, DEC: 0 }
  });

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [mailSettings, setMailSettings] = useState({
    enabled: true,
    fallbackEmail: 'bjsacademy38@gmail.com',
    enableAllMails: true,
    sendAdminCopy: false,
    loginMails: true,
    profileUpdateMails: true,
    courseAccessMails: true,
    deviceUpdateMails: true,
    paymentReviewMails: true,
  });

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Selected Active Student for Per-Course Access Rules Panel
  const [selectedStudentForRules, setSelectedStudentForRules] = useState(null);
  const [activeRuleCourseId, setActiveRuleCourseId] = useState('civil-laws-intensive');

  const [perCourseRule, setPerCourseRule] = useState({
    courseId: 'civil-laws-intensive',
    unlimitedAccess: false,
    accessStartDate: '2026-04-01',
    accessEndDate: '2026-06-30',
    videoAccessUntil: '2026-06-30',
    lastPaymentDate: '2026-04-01',
    paymentDueDate: '2026-06-30',
    monthlyFee: '1000',
    enrollmentStatus: 'Active',
    paidMonths: '2026-04'
  });

  // Student Profile Form State
  const [studentForm, setStudentForm] = useState({
    id: '',
    name: '',
    phone: '',
    email: '',
    batch: 'Wed,Sat',
    session: '2026-04-01',
    password: '',
    maxDeviceCount: 2,
    status: 'Active',
    loginApproval: 'Approved',
    portalAccessMode: 'Full Video Access',
    highlight: '',
    allowedCourseIds: ['civil-laws-intensive']
  });

  // Messaging State
  const [popupTitle, setPopupTitle] = useState('');
  const [popupBody, setPopupBody] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Course Form State
  const [courseForm, setCourseForm] = useState({
    id: '',
    title: '',
    shortTitle: '',
    faculty: 'Shanto Deb Roy Arno',
    category: 'CIVIL LAW',
    schedule: 'Wed,Sat',
    batchRegText: 'Wed,Sat',
    sessionRegText: '2026-04-01',
    nextLive: 'Wed,Sat 8:30 PM',
    price: '1000',
    description: ''
  });

  // Hero Banner Settings State
  const [showHeroBannerSettings, setShowHeroBannerSettings] = useState(false);
  const [siteSettingsForm, setSiteSettingsForm] = useState({
    badgeText: '১৮তম BJS ও বার কাউন্সিল অ্যাডভোকেসি স্পেশাল ব্যাচে ভর্তি চলছে!',
    heroTitle: 'বিচারক ও আইনজীবী হওয়ার স্বপ্নে গড়ি নিশ্চিত সাফল্য',
    heroSubtitle: 'বাংলাদেশ জুডিশিয়াল সার্ভিস (BJS) এবং বার কাউন্সিল পরীক্ষায় শীর্ষস্থান অর্জনের জন্য দেশের সেরা বিচারক ও সুপ্রিম কোর্টের সিনিয়র আইনজীবীদের তত্ত্বাবধানে তৈরি পূর্ণাঙ্গ প্রস্তুতি কোর্স।'
  });

  // Dynamic Admissions Overview Filters
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [selectedYearFilter, setSelectedYearFilter] = useState('2026');

  // Dynamic Year Options (from student records + range)
  const availableYears = Array.from(new Set([
    '2024', '2025', '2026', '2027', '2028', '2029', '2030',
    ...students.map(s => {
      const d = s.joinedOn || (s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '');
      return d ? d.substring(0, 4) : '';
    }).filter(Boolean)
  ])).sort().reverse();

  // Dynamic Enrollment Stats Calculation from Real Students Data
  const getEnrollmentStats = () => {
    let filtered = students;
    if (selectedCourseFilter !== 'all') {
      filtered = filtered.filter(s =>
        (s.enrolledCourseIds && s.enrolledCourseIds.includes(selectedCourseFilter)) ||
        (s.allowedCourseIds && s.allowedCourseIds.includes(selectedCourseFilter))
      );
    }

    const yearFiltered = filtered.filter(s => {
      const dateStr = s.joinedOn || (s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '');
      return dateStr ? dateStr.startsWith(String(selectedYearFilter)) : false;
    });

    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthlyCounts = { JAN: 0, FEB: 0, MAR: 0, APR: 0, MAY: 0, JUN: 0, JUL: 0, AUG: 0, SEP: 0, OCT: 0, NOV: 0, DEC: 0 };
    let missingDates = 0;

    yearFiltered.forEach(s => {
      const dateStr = s.joinedOn || (s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '');
      if (dateStr && dateStr.length >= 7) {
        const monthIdx = parseInt(dateStr.substring(5, 7), 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          monthlyCounts[months[monthIdx]] += 1;
        }
      } else {
        missingDates += 1;
      }
    });

    let maxVal = -1;
    let peakMonthName = 'None';
    let peakMonthVal = 0;
    Object.entries(monthlyCounts).forEach(([m, val]) => {
      if (val > maxVal && val > 0) {
        maxVal = val;
        peakMonthName = m;
        peakMonthVal = val;
      }
    });

    const totalInYear = yearFiltered.length;
    const avg = (totalInYear / 12).toFixed(1);

    let latestStudentName = 'None';
    let latestStudentDate = '';
    if (students.length > 0) {
      const sorted = [...students].sort((a, b) => {
        const dA = a.joinedOn || a.createdAt || '';
        const dB = b.joinedOn || b.createdAt || '';
        return dB.localeCompare(dA);
      });
      latestStudentName = sorted[0].name;
      latestStudentDate = sorted[0].joinedOn || (sorted[0].createdAt ? new Date(sorted[0].createdAt).toISOString().split('T')[0] : '');
    }

    return {
      totalInYear,
      allTimeCount: filtered.length,
      monthlyCounts,
      peakMonthName,
      peakMonthVal,
      monthlyAverage: avg,
      latestStudentName,
      latestStudentDate,
      missingDates
    };
  };

  const currentStats = getEnrollmentStats();

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, studentsRes, coursesRes, mailRes, siteSettingsRes] = await Promise.all([
        api.get('/admin/overview-stats'),
        api.get('/admin/students'),
        api.get('/courses'),
        api.get('/admin/mail-settings'),
        api.get('/site-settings')
      ]);

      if (statsRes.data.ok) setStats(statsRes.data);
      if (studentsRes.data.ok) {
        setStudents(studentsRes.data.students);
        if (studentsRes.data.students.length > 0) {
          setSelectedStudentForRules(studentsRes.data.students[0]);
        }
      }
      if (coursesRes.data.ok) setCourses(coursesRes.data.courses);
      if (mailRes.data.ok) setMailSettings(mailRes.data.settings);
      if (siteSettingsRes.data.ok && siteSettingsRes.data.settings) {
        setSiteSettingsForm(siteSettingsRes.data.settings);
      }
    } catch (err) {
      console.log('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSiteSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await api.post('/admin/site-settings', siteSettingsForm);
      if (res.data.ok) {
        setMsg({ type: 'success', text: 'হিরো ব্যানার পরিবর্তন সফলভাবে সেভ করা হয়েছে!' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'হিরো ব্যানার সেভ করতে সমস্যা হয়েছে।' });
    }
  };

  const handleSaveMailSettings = async () => {
    try {
      const res = await api.post('/admin/mail-settings', mailSettings);
      if (res.data.ok) setMsg({ type: 'success', text: 'Mail settings saved successfully!' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to save mail settings.' });
    }
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.phone || !studentForm.email) {
      setMsg({ type: 'error', text: 'Please fill name, phone, and email.' });
      return;
    }

    try {
      const res = await api.post('/admin/students/save', studentForm);
      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message });
        loadAllAdminData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error saving student.' });
    }
  };

  const handleEditStudent = (s) => {
    setSelectedStudentForRules(s);
    setStudentForm({
      id: s.id,
      name: s.name,
      phone: s.phone,
      email: s.email,
      batch: s.batch || 'Wed,Sat',
      session: s.session || '2026-04-01',
      password: '',
      maxDeviceCount: s.maxDeviceCount || 2,
      status: s.status || 'Active',
      loginApproval: s.loginApproval || 'Approved',
      portalAccessMode: s.portalAccessMode || 'Full Video Access',
      highlight: s.highlight || '',
      allowedCourseIds: s.allowedCourseIds || s.enrolledCourseIds || []
    });

    // Check existing course rule
    if (s.courseRules && s.courseRules.length > 0) {
      const foundRule = s.courseRules.find((r) => r.courseId === activeRuleCourseId) || s.courseRules[0];
      setPerCourseRule(foundRule);
    }
  };

  const handleSaveCourseAccessRules = async () => {
    if (!selectedStudentForRules) {
      setMsg({ type: 'error', text: 'Please select a student from the list first.' });
      return;
    }

    try {
      const res = await api.post('/admin/students/course-rules', {
        studentId: selectedStudentForRules.id,
        courseRule: {
          ...perCourseRule,
          courseId: activeRuleCourseId
        }
      });

      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message });
        loadAllAdminData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Error saving course access rules.' });
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm(`Are you sure you want to delete student ${id}?`)) return;
    try {
      const res = await api.delete(`/admin/students/${id}`);
      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message });
        loadAllAdminData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Error deleting student.' });
    }
  };

  const handleSendPopupMessage = async () => {
    if (selectedStudentIds.length === 0) {
      setMsg({ type: 'error', text: 'Please select student(s) first.' });
      return;
    }
    try {
      const res = await api.post('/admin/students/message', {
        studentIds: selectedStudentIds,
        type: 'popup',
        title: popupTitle,
        body: popupBody
      });
      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message });
        setPopupTitle('');
        setPopupBody('');
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Error sending popup message.' });
    }
  };

  const handleSendDirectEmail = async () => {
    if (selectedStudentIds.length === 0) {
      setMsg({ type: 'error', text: 'Please select student(s) first.' });
      return;
    }
    try {
      const res = await api.post('/admin/students/message', {
        studentIds: selectedStudentIds,
        type: 'email',
        subject: emailSubject,
        body: emailBody
      });
      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message });
        setEmailSubject('');
        setEmailBody('');
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Error sending email.' });
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.title) return;
    try {
      const res = await api.post('/admin/courses/save', courseForm);
      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message });
        loadAllAdminData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Error saving course.' });
    }
  };

  const handleToggleCourse = async (courseId) => {
    try {
      const res = await api.post('/admin/courses/toggle', { courseId });
      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message });
        loadAllAdminData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Error toggling course status.' });
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm(`Delete course ${courseId}?`)) return;
    try {
      const res = await api.delete(`/admin/courses/${courseId}`);
      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message });
        loadAllAdminData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Error deleting course.' });
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone.includes(searchQuery) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectAllStudents = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  const toggleStudentSelection = (id) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(i => i !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-fadeIn text-slate-100 font-sans">
      {/* 1. Header Banner */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase">AIN PATHSHALA</span>
          <h1 className="text-2xl font-black text-white tracking-tight">Admin Control Panel</h1>
        </div>
        <div className="flex items-center space-x-3 mt-3 sm:mt-0">
          <span className="text-xs text-amber-400 font-bold">Student Portal</span>
          <span className="px-3 py-1 rounded-md bg-slate-800 text-xs font-semibold text-slate-300">Logout</span>
        </div>
      </header>

      {/* 2. Live Sheet Control / Prottoy Dashboard */}
      <section className="glass-card rounded-xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-mono text-slate-400 tracking-wider">LIVE SHEET CONTROL</span>
            <h2 className="text-lg font-bold text-white">Prottoy Dashboard</h2>
            <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <span>●</span> Admin login approved.
            </p>
          </div>
          <div className="flex gap-2 mt-3 sm:mt-0">
            <button onClick={loadAllAdminData} className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">
              Refresh Data
            </button>
            <button className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">
              Open Registration Page
            </button>
          </div>
        </div>

        {msg && (
          <div className={`p-3 rounded-xl text-xs font-bold ${msg.type === 'success' ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950/90 text-rose-300'}`}>
            {msg.text}
          </div>
        )}

      {/* 2.5 Hero Banner Settings Section */}
      <section className="glass-card rounded-xl p-6 border border-amber-500/30 shadow-xl space-y-4 bg-slate-950/60 transition-all">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/80 pb-3">
          <div>
            <span className="text-[10px] font-mono text-amber-400 tracking-wider font-bold">HOMEPAGE BANNER CONTROL</span>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🎨</span> হোমপেজ হিরো ব্যানার কন্ট্রোল (Hero Banner Settings)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              হোমপেজের ব্যাচ নোটিশ টেক্সট, প্রধান টাইটেল এবং সাবটাইটেল/বিবরণ সেশনের তথ্য সরাসরি এডিট ও আপডেট করুন
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowHeroBannerSettings(!showHeroBannerSettings)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shadow-md mt-2 sm:mt-0"
          >
            <span>{showHeroBannerSettings ? '▲ হাইড করুন (Hide)' : '▼ অন-হাইড করে এডিট করুন (Unhide Banner Settings)'}</span>
          </button>
        </div>

        {showHeroBannerSettings && (
          <form onSubmit={handleSaveSiteSettings} className="space-y-4 text-xs pt-2 animate-fadeIn">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-amber-300 font-bold mb-1">
                  ১. ব্যাচ নোটিশ ব্যাজ টেক্সট (Notice Badge Text)
                </label>
                <input
                  type="text"
                  value={siteSettingsForm.badgeText}
                  onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, badgeText: e.target.value })}
                  placeholder="e.g. ১৮তম BJS ও বার কাউন্সিল অ্যাডভোকেসি স্পেশাল ব্যাচে ভর্তি চলছে!"
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-amber-300 font-bold mb-1">
                  ২. হিরো মেইন টাইটেল (Hero Main Title)
                </label>
                <textarea
                  rows={2}
                  value={siteSettingsForm.heroTitle}
                  onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, heroTitle: e.target.value })}
                  placeholder="e.g. বিচারক ও আইনজীবী হওয়ার স্বপ্নে গড়ি নিশ্চিত সাফল্য"
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 font-bold text-sm leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-amber-300 font-bold mb-1">
                  ৩. হিরো সাবটাইটেল / বিবরণী (Hero Subtitle / Description)
                </label>
                <textarea
                  rows={3}
                  value={siteSettingsForm.heroSubtitle}
                  onChange={(e) => setSiteSettingsForm({ ...siteSettingsForm, heroSubtitle: e.target.value })}
                  placeholder="e.g. বাংলাদেশ জুডিশিয়াল সার্ভিস (BJS) এবং বার কাউন্সিল পরীক্ষায়..."
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500 text-xs leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
              >
                💾 ব্যানার পরিবর্তন সেভ করুন (Save Banner Settings)
              </button>
            </div>
          </form>
        )}
      </section>

        {/* Admissions Overview & Monthly Enrollment Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">ADMISSIONS OVERVIEW</span>
                <h3 className="font-extrabold text-white text-base">Monthly Enrollment</h3>
                <p className="text-xs text-slate-400">Review all courses across {selectedYearFilter} with a clear month-by-month admission breakdown.</p>
              </div>
              <div className="flex gap-2 mt-2 sm:mt-0">
                <select
                  value={selectedCourseFilter}
                  onChange={(e) => setSelectedCourseFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Courses ({students.length})</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.shortTitle || c.title}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYearFilter}
                  onChange={(e) => setSelectedYearFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">TOTAL STUDENTS</span>
                <p className="text-xl font-black text-white font-mono">{currentStats.totalInYear}</p>
                <p className="text-[10px] text-slate-400">{currentStats.totalInYear} joined in {selectedYearFilter}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">PEAK MONTH</span>
                <p className="text-xl font-black text-amber-400 font-mono">{currentStats.peakMonthName}</p>
                <p className="text-[10px] text-slate-400">{currentStats.peakMonthVal} students</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">MONTHLY AVERAGE</span>
                <p className="text-xl font-black text-cyan-400 font-mono">{currentStats.monthlyAverage}</p>
                <p className="text-[10px] text-slate-400">All dated records included</p>
              </div>
            </div>

            {/* Month-by-month Bar Chart Visual */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 overflow-x-auto">
              <div className="grid grid-cols-12 gap-1 text-center min-w-[500px]">
                {Object.entries(currentStats.monthlyCounts).map(([m, val]) => (
                  <div key={m} className="flex flex-col items-center justify-end h-28 space-y-1">
                    <span className="text-[10px] font-mono text-amber-300 font-bold">{val}</span>
                    <div
                      className="w-full max-w-[20px] rounded-t bg-gradient-to-t from-amber-600 to-amber-400 transition-all duration-300"
                      style={{ height: `${Math.max(val * 12, val > 0 ? 8 : 3)}px` }}
                    ></div>
                    <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">{m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Operational Summary / Quick Notes */}
          <div className="lg:col-span-4 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold">OPERATIONAL SUMMARY</span>
              <h4 className="font-extrabold text-white text-sm">Quick Notes</h4>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">LATEST ADMISSION</p>
                <p className="font-bold text-amber-300">{currentStats.latestStudentName}</p>
                <p className="text-[10px] text-slate-500">{currentStats.latestStudentDate || selectedYearFilter}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">MISSING JOIN DATES</p>
                <p className="font-mono font-bold text-white">{currentStats.missingDates}</p>
                <p className="text-[10px] text-slate-500">Student records in current scope that need valid join date.</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">CURRENT SCOPE</p>
                <p className="font-bold text-white">
                  {selectedCourseFilter === 'all' ? 'All courses' : selectedCourseFilter}
                </p>
                <p className="text-[10px] text-slate-500">{selectedYearFilter} | Live Database Filter</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Student Control / Student Access Manager */}
      <section className="glass-card rounded-xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 gap-3">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase">STUDENT CONTROL</span>
            <h2 className="text-base font-extrabold text-white">Student Access Manager</h2>
            <p className="text-xs text-slate-400">Showing {filteredStudents.length} students across {courses.length} courses.</p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, ID, email"
              className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white placeholder-slate-500"
            />
            <button
              onClick={() => setStudentForm({
                id: '',
                name: '',
                phone: '',
                email: '',
                batch: 'Wed,Sat',
                session: '2026-04-01',
                password: '',
                maxDeviceCount: 2,
                status: 'Active',
                loginApproval: 'Approved',
                portalAccessMode: 'Full Video Access',
                highlight: '',
                allowedCourseIds: []
              })}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
            >
              New Student
            </button>
          </div>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="p-3">SELECT</th>
                <th className="p-3">STUDENT</th>
                <th className="p-3">PHONE</th>
                <th className="p-3">BATCH</th>
                <th className="p-3">APPROVAL / ACCESS</th>
                <th className="p-3">STATUS</th>
                <th className="p-3">COURSES</th>
                <th className="p-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStudents.map((s) => (
                <tr key={s.id} className={`hover:bg-slate-900/50 ${selectedStudentForRules?.id === s.id ? 'bg-amber-950/20 border-l-4 border-amber-500' : ''}`}>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(s.id)}
                      onChange={() => toggleStudentSelection(s.id)}
                      className="rounded bg-slate-950 border-slate-800 text-amber-500"
                    />
                  </td>
                  <td className="p-3">
                    <p className="font-bold text-white">{s.name}</p>
                    <p className="font-mono text-[10px] text-amber-300">{s.id}</p>
                    <p className="text-[10px] text-slate-400">{s.email}</p>
                  </td>
                  <td className="p-3 font-mono text-slate-300">{s.phone}</td>
                  <td className="p-3 text-slate-300 max-w-[140px]">
                    <p className="line-clamp-1">{s.batch}</p>
                    <p className="text-[10px] text-slate-500 font-mono line-clamp-1">{s.session}</p>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Approved
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      0/{s.maxDeviceCount || 2} active devices
                    </p>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300 font-bold text-[11px]">
                    {(s.allowedCourseIds || s.enrolledCourseIds || []).length} Course(s)
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button
                      onClick={() => handleEditStudent(s)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[11px]"
                    >
                      Edit / Rule Rules
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(s.id)}
                      className="px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-[11px]"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Editor & Selected Students PER COURSE RULE Engine Panel (Reference Screenshot 2 Sync) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Student Profile Form */}
        <form onSubmit={handleSaveStudent} className="lg:col-span-5 glass-card rounded-xl p-6 border border-slate-800 space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">EDITOR</span>
              <h3 className="font-extrabold text-white text-sm">Student Profile Form</h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
              {studentForm.id || 'STU-2026-020'}
            </span>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Student name (e.g. Srity)"
              value={studentForm.name}
              onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white"
              required
            />
            <input
              type="text"
              placeholder="Phone Number (e.g. 01781920154)"
              value={studentForm.phone}
              onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white font-mono"
              required
            />
            <input
              type="email"
              placeholder="Email Address (e.g. sritypaul294@gmail.com)"
              value={studentForm.email}
              onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white"
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Batch (e.g. Wed,Sat)"
                value={studentForm.batch}
                onChange={(e) => setStudentForm({ ...studentForm, batch: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white"
              />
              <input
                type="text"
                placeholder="Session (e.g. 2026-04-01)"
                value={studentForm.session}
                onChange={(e) => setStudentForm({ ...studentForm, session: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white font-mono"
              />
            </div>

            <input
              type="password"
              placeholder="Password (e.g. 43146)"
              value={studentForm.password}
              onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white"
            />
          </div>

          {/* Custom Device Limit */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">DEVICE LIMIT</span>
            <input
              type="number"
              placeholder="2"
              value={studentForm.maxDeviceCount}
              onChange={(e) => setStudentForm({ ...studentForm, maxDeviceCount: e.target.value })}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-white font-mono"
            />
            <p className="text-[10px] text-slate-500">All students default to 2 devices. Set custom only when overriding.</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <select
              value={studentForm.status}
              onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value })}
              className="rounded-xl bg-slate-950 border border-slate-800 px-2 py-1.5 text-white"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <select
              value={studentForm.loginApproval}
              onChange={(e) => setStudentForm({ ...studentForm, loginApproval: e.target.value })}
              className="rounded-xl bg-slate-950 border border-slate-800 px-2 py-1.5 text-white"
            >
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
            </select>
            <select
              value={studentForm.portalAccessMode}
              onChange={(e) => setStudentForm({ ...studentForm, portalAccessMode: e.target.value })}
              className="rounded-xl bg-slate-950 border border-slate-800 px-2 py-1.5 text-amber-300 font-bold"
            >
              <option value="Full Video Access">Full Video Access</option>
              <option value="Preview Mode">Preview Mode</option>
            </select>
          </div>

          <textarea
            placeholder="Registered online. Preview access activated automatically..."
            value={studentForm.highlight}
            onChange={(e) => setStudentForm({ ...studentForm, highlight: e.target.value })}
            rows="2"
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-slate-300"
          ></textarea>

          {/* Allowed Courses Checkboxes */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase">ALLOWED COURSES</span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {courses.map((c) => {
                const checked = (studentForm.allowedCourseIds || []).includes(c.id);
                return (
                  <label key={c.id} className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        let list = studentForm.allowedCourseIds || [];
                        if (e.target.checked) list = [...list, c.id];
                        else list = list.filter((i) => i !== c.id);
                        setStudentForm({ ...studentForm, allowedCourseIds: list });
                      }}
                      className="rounded bg-slate-900 border-slate-700 text-amber-500"
                    />
                    <span className="line-clamp-1">{c.shortTitle || c.title}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <button type="submit" className="w-full py-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-700 text-white font-extrabold transition-all">
            Save Student
          </button>
        </form>

        {/* Course Assignment + Messaging & PER COURSE RULE Panel (Screenshot 2 Sync) */}
        <div className="lg:col-span-7 glass-card rounded-xl p-6 border border-slate-800 space-y-4 text-xs">
          <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">SELECTED STUDENTS</span>
              <h3 className="font-extrabold text-white text-sm">Course Assignment + Messaging</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Managing <strong className="text-amber-300">{selectedStudentForRules?.name || 'Srity'}</strong>. You can update approval, preview access, course access, and rules from this block.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-slate-800 text-amber-400 font-mono font-bold text-[10px]">
              1 selected
            </span>
          </div>

          {/* Assign Courses */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">ASSIGN COURSES</span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {courses.map((c) => {
                const isSelected = activeRuleCourseId === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setActiveRuleCourseId(c.id)}
                    className={`p-2.5 rounded-xl text-left border flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input type="checkbox" checked={isSelected} readOnly className="rounded bg-slate-900 border-slate-700 text-amber-500" />
                    <div>
                      <p className="font-bold text-white line-clamp-1">{c.title}</p>
                      <p className="text-[9px] text-slate-500">{c.category}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PER COURSE RULE CARD (Screenshot 2 Yellow Unlimited Switch Card) */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">COURSE ACCESS RULES</span>
                <h4 className="font-extrabold text-white text-base mt-0.5">{activeRuleCourseId}</h4>
                <p className="text-[10px] text-slate-500">Civil Law | Batch: Wed,Sat | Session: 2026-04-01</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-mono text-[9px] uppercase font-bold border border-slate-800">
                PER COURSE RULE
              </span>
            </div>

            {/* Unlimited Access Yellow Toggle Card */}
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h5 className="font-extrabold text-amber-300 text-xs">Unlimited Access</h5>
                <p className="text-[10px] text-amber-100/70 leading-relaxed max-w-sm">
                  Turn this on to keep the course unlocked for life. Start and end dates stay visible for reference, but access and payment deadlines stop locking videos until you switch this off.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPerCourseRule({ ...perCourseRule, unlimitedAccess: !perCourseRule.unlimitedAccess })}
                className={`px-4 py-2 rounded-xl text-xs font-black shadow-md transition-all ${
                  perCourseRule.unlimitedAccess
                    ? 'bg-amber-400 text-slate-950 shadow-amber-400/20'
                    : 'bg-slate-900 text-amber-400 border border-amber-500/40'
                }`}
              >
                {perCourseRule.unlimitedAccess ? 'Unlimited ON' : 'Unlimited OFF'}
              </button>
            </div>

            {/* 6 Date & Fee Fields Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1 text-[10px]">Access Start Date</label>
                <input
                  type="date"
                  value={perCourseRule.accessStartDate}
                  onChange={(e) => setPerCourseRule({ ...perCourseRule, accessStartDate: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1 text-[10px]">Access End Date</label>
                <input
                  type="date"
                  value={perCourseRule.accessEndDate}
                  onChange={(e) => setPerCourseRule({ ...perCourseRule, accessEndDate: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1 text-[10px]">Video Access Until</label>
                <input
                  type="date"
                  value={perCourseRule.videoAccessUntil}
                  onChange={(e) => setPerCourseRule({ ...perCourseRule, videoAccessUntil: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1 text-[10px]">Last Payment Date</label>
                <input
                  type="date"
                  value={perCourseRule.lastPaymentDate}
                  onChange={(e) => setPerCourseRule({ ...perCourseRule, lastPaymentDate: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1 text-[10px]">Payment Due Date</label>
                <input
                  type="date"
                  value={perCourseRule.paymentDueDate}
                  onChange={(e) => setPerCourseRule({ ...perCourseRule, paymentDueDate: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1 text-[10px]">Monthly Fee</label>
                <input
                  type="text"
                  value={perCourseRule.monthlyFee}
                  onChange={(e) => setPerCourseRule({ ...perCourseRule, monthlyFee: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-amber-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1 text-[10px]">Enrollment Status</label>
                <select
                  value={perCourseRule.enrollmentStatus}
                  onChange={(e) => setPerCourseRule({ ...perCourseRule, enrollmentStatus: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white"
                >
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-400 font-medium mb-1 text-[10px]">Paid Months</label>
                <input
                  type="text"
                  value={perCourseRule.paidMonths}
                  onChange={(e) => setPerCourseRule({ ...perCourseRule, paidMonths: e.target.value })}
                  placeholder="e.g. 2026-04, 2026-05"
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-start">
              <button
                type="button"
                onClick={handleSaveCourseAccessRules}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/20 transition-all"
              >
                Save Course Access
              </button>
            </div>
          </div>

          {/* Send Student Popup Message & Direct Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase">SEND POPUP MESSAGE</span>
              <input
                type="text"
                placeholder="Message title"
                value={popupTitle}
                onChange={(e) => setPopupTitle(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-white"
              />
              <textarea
                placeholder="Write message for student popup..."
                value={popupBody}
                onChange={(e) => setPopupBody(e.target.value)}
                rows="2"
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-white"
              ></textarea>
              <button type="button" onClick={handleSendPopupMessage} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs">
                Send Popup
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase">SEND DIRECT EMAIL</span>
              <input
                type="text"
                placeholder="Email subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-white"
              />
              <textarea
                placeholder="Write email message..."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows="2"
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-white"
              ></textarea>
              <button type="button" onClick={handleSendDirectEmail} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs">
                Send Email
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Course Catalog */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-extrabold text-white">COURSE CATALOG — Active And Hidden Courses</h3>
          <span className="text-xs font-mono text-amber-400">
            {courses.filter(c => c.status === 'Active').length} active / {courses.length} total
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {courses.map((c) => (
            <div key={c.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">{c.category}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                    {c.status}
                  </span>
                </div>
                <h4 className="font-extrabold text-white text-sm">{c.title}</h4>
                <p className="text-slate-400 text-[11px] mt-0.5">{c.faculty}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  Batch: {c.batchRegText || c.schedule} | Session: {c.sessionRegText || '2026-04-01'}
                </p>
                <p className="text-amber-300 font-mono font-bold mt-1">Course Fee: Tk {c.price}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                <button
                  onClick={() => openLessonManager(c)}
                  className="px-3 py-1.5 rounded bg-cyan-900/60 hover:bg-cyan-800 text-cyan-300 font-bold text-[11px] border border-cyan-500/30"
                >
                  📹 Upload & Manage Videos
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleCourse(c.id)}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[11px]"
                  >
                    {c.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(c.id)}
                    className="px-3 py-1.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-[11px]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
