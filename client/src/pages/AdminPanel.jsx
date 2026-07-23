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

  // Message Form State
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

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, studentsRes, coursesRes, mailRes] = await Promise.all([
        api.get('/admin/overview-stats'),
        api.get('/admin/students'),
        api.get('/courses'),
        api.get('/admin/mail-settings')
      ]);

      if (statsRes.data.ok) setStats(statsRes.data);
      if (studentsRes.data.ok) setStudents(studentsRes.data.students);
      if (coursesRes.data.ok) setCourses(coursesRes.data.courses);
      if (mailRes.data.ok) setMailSettings(mailRes.data.settings);
    } catch (err) {
      console.log('Error loading admin data:', err);
    } finally {
      setLoading(false);
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
        setStudentForm({
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
        loadAllAdminData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error saving student.' });
    }
  };

  const handleEditStudent = (s) => {
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
        setCourseForm({
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

        {/* Admissions Overview & Monthly Enrollment Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">ADMISSIONS OVERVIEW</span>
                <h3 className="font-extrabold text-white text-base">Monthly Enrollment</h3>
                <p className="text-xs text-slate-400">Review all courses across 2026 with a clear month-by-month admission breakdown.</p>
              </div>
              <div className="flex gap-2 mt-2 sm:mt-0">
                <select className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1">
                  <option>All Courses (21)</option>
                </select>
                <select className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1">
                  <option>2026</option>
                </select>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">TOTAL STUDENTS</span>
                <p className="text-xl font-black text-white font-mono">{stats.totalStudents || 21}</p>
                <p className="text-[10px] text-slate-400">21 joined in 2026</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">PEAK MONTH</span>
                <p className="text-xl font-black text-amber-400 font-mono">Apr</p>
                <p className="text-[10px] text-slate-400">12 students</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">MONTHLY AVERAGE</span>
                <p className="text-xl font-black text-cyan-400 font-mono">1.8</p>
                <p className="text-[10px] text-slate-400">All dated records included</p>
              </div>
            </div>

            {/* Month-by-month Bar Chart Visual */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 overflow-x-auto">
              <div className="grid grid-cols-12 gap-1 text-center min-w-[500px]">
                {Object.entries(stats.monthlyCounts || {}).map(([m, val]) => (
                  <div key={m} className="flex flex-col items-center justify-end h-28 space-y-1">
                    <span className="text-[10px] font-mono text-amber-300 font-bold">{val}</span>
                    <div
                      className="w-full max-w-[20px] rounded-t bg-gradient-to-t from-amber-600 to-amber-400 transition-all"
                      style={{ height: `${Math.max(val * 8, 4)}px` }}
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
                <p className="font-bold text-amber-300">{stats.latestAdmission || 'MD. HASAN MURAD'}</p>
                <p className="text-[10px] text-slate-500">Jun 2026</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">MISSING JOIN DATES</p>
                <p className="font-mono font-bold text-white">0</p>
                <p className="text-[10px] text-slate-500">Student records in current scope that need valid join date.</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">CURRENT SCOPE</p>
                <p className="font-bold text-white">All courses</p>
                <p className="text-[10px] text-slate-500">2026 | No year-on-year comparison</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Summary Stat Badges Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border border-slate-800 text-center">
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">STUDENTS</span>
          <p className="text-2xl font-black text-amber-400 font-mono">{students.length || 21}</p>
        </div>
        <div className="glass-card p-4 rounded-xl border border-slate-800 text-center">
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">PAYMENT REVIEWS</span>
          <p className="text-2xl font-black text-rose-400 font-mono">0</p>
        </div>
        <div className="glass-card p-4 rounded-xl border border-slate-800 text-center">
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">ACTIVE COURSES</span>
          <p className="text-2xl font-black text-emerald-400 font-mono">{courses.filter(c => c.status === 'Active').length || 4}</p>
        </div>
        <div className="glass-card p-4 rounded-xl border border-slate-800 text-center">
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">MESSAGE LOGS</span>
          <p className="text-2xl font-black text-cyan-400 font-mono">3</p>
        </div>
      </section>

      {/* 4. Email Notifications / Portal Mail Settings Card */}
      <section className="glass-card rounded-xl p-6 border border-slate-800 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase">EMAIL NOTIFICATIONS</span>
            <h2 className="text-base font-extrabold text-white">Portal Mail Settings</h2>
            <p className="text-xs text-slate-400">Students can receive automatic mail when they log in, get course access, or have status updated.</p>
          </div>
          <span className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
            ENABLED
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-2">
            <label className="block text-slate-400 font-semibold">Fallback & Admin Copy Email Address</label>
            <input
              type="email"
              value={mailSettings.fallbackEmail}
              onChange={(e) => setMailSettings({ ...mailSettings, fallbackEmail: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mailSettings.enableAllMails}
                onChange={(e) => setMailSettings({ ...mailSettings, enableAllMails: e.target.checked })}
                className="rounded bg-slate-950 border-slate-800 text-amber-500"
              />
              Enable all mails
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mailSettings.loginMails}
                onChange={(e) => setMailSettings({ ...mailSettings, loginMails: e.target.checked })}
                className="rounded bg-slate-950 border-slate-800 text-amber-500"
              />
              Login mails
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mailSettings.courseAccessMails}
                onChange={(e) => setMailSettings({ ...mailSettings, courseAccessMails: e.target.checked })}
                className="rounded bg-slate-950 border-slate-800 text-amber-500"
              />
              Course access mails
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={mailSettings.paymentReviewMails}
                onChange={(e) => setMailSettings({ ...mailSettings, paymentReviewMails: e.target.checked })}
                className="rounded bg-slate-950 border-slate-800 text-amber-500"
              />
              Payment review mails
            </label>
          </div>
        </div>

        <div className="pt-2 flex justify-start">
          <button
            onClick={handleSaveMailSettings}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
          >
            Save Mail Settings
          </button>
        </div>
      </section>

      {/* 5. Student Control / Student Access Manager */}
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

        {/* Bulk Action Controls */}
        <div className="flex items-center gap-3 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 font-semibold">
            <input
              type="checkbox"
              checked={selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0}
              onChange={toggleSelectAllStudents}
              className="rounded bg-slate-900 border-slate-700 text-amber-500"
            />
            Select All ({selectedStudentIds.length})
          </label>
          <select className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2.5 py-1 text-xs">
            <option>Bulk Action</option>
            <option>Approve Selected</option>
            <option>Set 2 Devices Limit</option>
            <option>Reset Device Fingerprints</option>
          </select>
          <button className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs">
            Apply
          </button>
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
                <tr key={s.id} className="hover:bg-slate-900/50">
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
                      Edit
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

      {/* 6. Editor & Selected Students Messaging Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Student Profile Form */}
        <form onSubmit={handleSaveStudent} className="lg:col-span-6 glass-card rounded-xl p-6 border border-slate-800 space-y-3 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">EDITOR</span>
              <h3 className="font-extrabold text-white text-sm">Student Profile Form</h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
              {studentForm.id ? `Edit: ${studentForm.id}` : 'New Student'}
            </span>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Student name"
              value={studentForm.name}
              onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Phone Number"
                value={studentForm.phone}
                onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white font-mono"
                required
              />
              <input
                type="email"
                placeholder="Email Address"
                value={studentForm.email}
                onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Batch"
                value={studentForm.batch}
                onChange={(e) => setStudentForm({ ...studentForm, batch: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white"
              />
              <input
                type="text"
                placeholder="Session"
                value={studentForm.session}
                onChange={(e) => setStudentForm({ ...studentForm, session: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white font-mono"
              />
            </div>

            <input
              type="password"
              placeholder="Password (leave blank if keeping existing)"
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
              placeholder="Set custom limit e.g. 2 or 10000"
              value={studentForm.maxDeviceCount}
              onChange={(e) => setStudentForm({ ...studentForm, maxDeviceCount: e.target.value })}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-white font-mono"
            />
            <p className="text-[10px] text-slate-500">All students default to 2 devices. Override only if requested.</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <select
              value={studentForm.status}
              onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value })}
              className="rounded-xl bg-slate-950 border border-slate-800 px-2 py-1.5 text-white"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Blocked">Blocked</option>
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

          {/* Allowed Courses Selection Checkboxes */}
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

          <button type="submit" className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold transition-all">
            Save Student
          </button>
        </form>

        {/* Selected Students Course Assignment & Messaging */}
        <div className="lg:col-span-6 glass-card rounded-xl p-6 border border-slate-800 space-y-4 text-xs">
          <div className="border-b border-slate-800 pb-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase">SELECTED STUDENTS</span>
            <h3 className="font-extrabold text-white text-sm">Course Assignment + Messaging</h3>
            <p className="text-[11px] text-amber-400 font-mono mt-0.5">
              Selected: {selectedStudentIds.length} student(s)
            </p>
          </div>

          {/* Send Popup Message */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase">SEND STUDENT POPUP MESSAGE</span>
            <input
              type="text"
              placeholder="Message title"
              value={popupTitle}
              onChange={(e) => setPopupTitle(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-white"
            />
            <textarea
              placeholder="Write a message for the selected students"
              value={popupBody}
              onChange={(e) => setPopupBody(e.target.value)}
              rows="2"
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-white"
            ></textarea>
            <button
              type="button"
              onClick={handleSendPopupMessage}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold"
            >
              Send Popup Message
            </button>
          </div>

          {/* Send Direct Email */}
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
              placeholder="Write the email you want to send to selected students"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              rows="2"
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-white"
            ></textarea>
            <button
              type="button"
              onClick={handleSendDirectEmail}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
            >
              Send Email
            </button>
          </div>
        </div>
      </section>

      {/* 7. Course Control / Course Launch Manager & Catalog */}
      <section className="space-y-6">
        <div className="glass-card rounded-xl p-6 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">COURSE CONTROL</span>
              <h2 className="text-base font-extrabold text-white">Course Launch Manager</h2>
            </div>
            <button
              type="button"
              onClick={() => setCourseForm({
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
              })}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold"
            >
              Clear Form
            </button>
          </div>

          <form onSubmit={handleSaveCourse} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <input
              type="text"
              placeholder="Course ID (optional)"
              value={courseForm.id}
              onChange={(e) => setCourseForm({ ...courseForm, id: e.target.value })}
              className="rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white font-mono"
            />
            <input
              type="text"
              placeholder="Course Title"
              value={courseForm.title}
              onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
              className="rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white"
              required
            />
            <input
              type="text"
              placeholder="Short Title"
              value={courseForm.shortTitle}
              onChange={(e) => setCourseForm({ ...courseForm, shortTitle: e.target.value })}
              className="rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white"
            />
            <input
              type="text"
              placeholder="Faculty"
              value={courseForm.faculty}
              onChange={(e) => setCourseForm({ ...courseForm, faculty: e.target.value })}
              className="rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white"
            />
            <input
              type="text"
              placeholder="Category"
              value={courseForm.category}
              onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
              className="rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white font-mono uppercase"
            />
            <input
              type="text"
              placeholder="Course Fee (Tk)"
              value={courseForm.price}
              onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
              className="rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-amber-300 font-mono"
            />

            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs">
                Save / Launch Course
              </button>
            </div>
          </form>
        </div>

        {/* Course Catalog Grid */}
        <div className="space-y-4">
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
        </div>
      </section>
    </div>
  );
}
