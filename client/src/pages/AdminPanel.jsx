import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminPanel({ openLessonManager, openVideoModal }) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeCourses: 0,
    messageLogs: 0,
    peakMonth: 'None',
    monthlyAverage: '0.0',
    latestAdmission: 'None',
    monthlyCounts: { JAN: 0, FEB: 0, MAR: 0, APR: 0, MAY: 0, JUN: 0, JUL: 0, AUG: 0, SEP: 0, OCT: 0, NOV: 0, DEC: 0 }
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
  });

  // Student Portal Live Preview Modal State
  const [previewStudentModal, setPreviewStudentModal] = useState({ isOpen: false, student: null });
  const [previewLessons, setPreviewLessons] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const showToast = (text, type = 'success') => {
    setMsg({ type, text });
    setTimeout(() => {
      setMsg((current) => (current?.text === text ? null : current));
    }, 4500);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Selected Active Student for Per-Course Access Rules Panel & Editor Toggle
  const [selectedStudentForRules, setSelectedStudentForRules] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
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

  // Mentor & Faculty Form State
  const [mentors, setMentors] = useState([]);
  const [mentorForm, setMentorForm] = useState({
    id: '',
    name: '',
    photoUrl: '',
    designation: '',
    posting: '',
    expertise: '',
    phone: '',
    showPhone: false,
    status: 'Active',
    bio: ''
  });

  // Course Form State
  const [courseForm, setCourseForm] = useState({
    id: '',
    title: '',
    shortTitle: '',
    faculty: '',
    category: '',
    schedule: '',
    batchRegText: '',
    sessionRegText: '',
    nextLive: '',
    price: '',
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
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('all');
  const [selectedYearFilter, setSelectedYearFilter] = useState('2026');

  // Super Admin Password Form State
  const [adminUsernameInput, setAdminUsernameInput] = useState('admin');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  const handleChangeAdminPassword = async (e) => {
    e.preventDefault();
    if (!adminPasswordInput) {
      showToast('Please enter a new Admin Password.', 'error');
      return;
    }
    try {
      const res = await api.post('/admin/change-password', {
        newAdminUsername: adminUsernameInput,
        newAdminPassword: adminPasswordInput
      });
      if (res.data.ok) {
        showToast(res.data.message || 'Super Admin Password updated successfully!', 'success');
        setAdminPasswordInput('');
      }
    } catch (err) {
      showToast('Failed to update Admin password.', 'error');
    }
  };

  // Dynamic Year Options (from student records + range)
  const availableYears = Array.from(new Set([
    '2024', '2025', '2026', '2027', '2028', '2029', '2030',
    ...(Array.isArray(students) ? students : []).map(s => {
      const d = s?.joinedOn || (s?.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '');
      return d ? d.substring(0, 4) : '';
    }).filter(Boolean)
  ])).sort().reverse();

  // Dynamic Enrollment Stats Calculation from Real Students Data
  const getEnrollmentStats = () => {
    let filtered = Array.isArray(students) ? students : [];
    if (selectedCourseFilter && selectedCourseFilter !== 'all') {
      filtered = filtered.filter(s =>
        (s?.enrolledCourseIds && Array.isArray(s.enrolledCourseIds) && s.enrolledCourseIds.includes(selectedCourseFilter)) ||
        (s?.allowedCourseIds && Array.isArray(s.allowedCourseIds) && s.allowedCourseIds.includes(selectedCourseFilter))
      );
    }

    const yearStr = String(selectedYearFilter || '2026');
    const yearFiltered = filtered.filter(s => {
      if (!s) return false;
      const dateStr = s.joinedOn || (s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '');
      return dateStr ? dateStr.startsWith(yearStr) : false;
    });

    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthlyCounts = { JAN: 0, FEB: 0, MAR: 0, APR: 0, MAY: 0, JUN: 0, JUL: 0, AUG: 0, SEP: 0, OCT: 0, NOV: 0, DEC: 0 };
    let missingDates = 0;

    yearFiltered.forEach(s => {
      if (!s) return;
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
    if (filtered.length > 0) {
      const sorted = [...filtered].sort((a, b) => {
        const dA = a?.joinedOn || a?.createdAt || '';
        const dB = b?.joinedOn || b?.createdAt || '';
        return String(dB).localeCompare(String(dA));
      });
      if (sorted[0]) {
        latestStudentName = sorted[0].name || 'Student';
        latestStudentDate = sorted[0].joinedOn || (sorted[0].createdAt ? new Date(sorted[0].createdAt).toISOString().split('T')[0] : '');
      }
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

  // Money Receipts & Payment Management State
  const [receipts, setReceipts] = useState([]);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [selectedStudentForReceipt, setSelectedStudentForReceipt] = useState(null);
  const [receiptForm, setReceiptForm] = useState({
    receiptId: '',
    studentId: '',
    studentName: '',
    studentPhone: '',
    studentEmail: '',
    batch: '',
    amount: '',
    paymentMethod: 'bKash',
    trxId: '',
    paymentTime: new Date().toISOString().substring(0, 16),
    note: 'Course Fee Payment'
  });
  const [receiptPreviewModal, setReceiptPreviewModal] = useState({ isOpen: false, receipt: null });

  const currentStats = getEnrollmentStats();

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get('/admin/overview-stats'),
        api.get('/admin/students'),
        api.get('/admin/courses'),
        api.get('/admin/mail-settings'),
        api.get('/site-settings'),
        api.get('/admin/mentors'),
        api.get('/admin/receipts')
      ]);

      if (results[0].status === 'fulfilled' && results[0].value.data?.ok) setStats(results[0].value.data);
      if (results[1].status === 'fulfilled' && results[1].value.data?.ok) setStudents(results[1].value.data.students || []);
      if (results[2].status === 'fulfilled' && results[2].value.data?.ok) setCourses(results[2].value.data.courses || []);
      if (results[3].status === 'fulfilled' && results[3].value.data?.ok) setMailSettings(results[3].value.data.settings);
      if (results[4].status === 'fulfilled' && results[4].value.data?.ok && results[4].value.data.settings) setSiteSettingsForm(results[4].value.data.settings);
      if (results[5].status === 'fulfilled' && results[5].value.data?.ok) setMentors(results[5].value.data.mentors || []);
      if (results[6].status === 'fulfilled' && results[6].value.data?.ok) setReceipts(results[6].value.data.receipts || []);
    } catch (err) {
      console.log('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMentor = (m) => {
    setMentorForm({
      id: m.id,
      name: m.name || '',
      photoUrl: m.photoUrl || '',
      designation: m.designation || 'সহকারী জজ (BJS)',
      posting: m.posting || 'ঢাকা',
      expertise: m.expertise || 'দেওয়ানী ও ফৌজদারী আইন',
      phone: m.phone || '',
      showPhone: !!m.showPhone,
      status: m.status || 'Active',
      bio: m.bio || ''
    });
    showToast(`Editing mentor profile for ${m.name}`, 'success');
    setTimeout(() => {
      document.getElementById('mentor-manager-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleClearMentorForm = () => {
    setMentorForm({
      id: '',
      name: '',
      photoUrl: '',
      designation: 'সহকারী জজ (BJS)',
      posting: 'ঢাকা',
      expertise: 'দেওয়ানী ও ফৌজদারী আইন',
      phone: '',
      showPhone: false,
      status: 'Active',
      bio: ''
    });
    showToast('Mentor form cleared.', 'success');
  };

  const handleSaveMentor = async (e) => {
    e.preventDefault();
    if (!mentorForm.name) {
      showToast('Mentor name is required.', 'error');
      return;
    }
    try {
      const res = await api.post('/admin/mentors/save', mentorForm);
      if (res.data.ok) {
        const saved = res.data.mentor || { ...mentorForm, id: mentorForm.id || `MTR-${Date.now()}` };
        setMentors(prev => {
          const idx = prev.findIndex(m => m.id === saved.id);
          if (idx > -1) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...saved };
            return updated;
          }
          return [saved, ...prev];
        });
        showToast(res.data.message || `✓ Mentor "${mentorForm.name}" saved successfully in MongoDB!`, 'success');
        handleClearMentorForm();
        loadAllAdminData();
      } else {
        showToast(res.data.message || 'Error saving mentor profile.', 'error');
      }
    } catch (err) {
      showToast('Error saving mentor profile.', 'error');
    }
  };

  const handleDeleteMentor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete mentor "${name}"?`)) return;
    setMentors(prev => prev.filter(m => m.id !== id));
    try {
      const res = await api.delete(`/admin/mentors/${id}`);
      if (res.data.ok) {
        showToast(`✓ Mentor "${name}" deleted successfully from system!`, 'success');
        loadAllAdminData();
      } else {
        showToast(res.data.message || 'Error deleting mentor.', 'error');
        loadAllAdminData();
      }
    } catch (err) {
      showToast('Error deleting mentor.', 'error');
      loadAllAdminData();
    }
  };

  const handleOpenStudentPreview = async (student) => {
    setPreviewStudentModal({ isOpen: true, student });
    setPreviewLoading(true);
    try {
      const res = await api.get('/lessons');
      if (res.data.ok) {
        const allowedCourses = student.allowedCourseIds || student.enrolledCourseIds || [];
        const studentLessons = res.data.lessons.filter(l =>
          allowedCourses.length === 0 || allowedCourses.includes(l.courseId)
        );
        setPreviewLessons(studentLessons);
      }
    } catch (err) {
      console.log('Error loading preview lessons:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUpdateStudentApproval = async (student, newApproval) => {
    try {
      const updated = { ...student, loginApproval: newApproval };
      const res = await api.post('/admin/students/save', updated);
      if (res.data.ok) {
        setMsg({ type: 'success', text: `${student.name} authorization set to ${newApproval}!` });
        loadAllAdminData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to update approval status.' });
    }
  };

  const handleUpdateStudentStatus = async (student, newStatus) => {
    try {
      const updated = { ...student, status: newStatus };
      const res = await api.post('/admin/students/save', updated);
      if (res.data.ok) {
        setMsg({ type: 'success', text: `${student.name} status set to ${newStatus}!` });
        loadAllAdminData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to update status.' });
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
      if (res.data.ok) showToast('Mail settings saved successfully!', 'success');
    } catch (err) {
      showToast('Failed to save mail settings.', 'error');
    }
  };

  const handleClearAllDemoData = async () => {
    if (!window.confirm("⚠️ WARNING: Are you sure you want to delete ALL demo data (students, courses, lessons, registrations)? This will prepare the system for a 100% fresh Production environment!")) {
      return;
    }
    setStudents([]);
    setCourses([]);
    setMentors([]);
    try {
      const res = await api.post('/admin/clear-all-demo-data');
      if (res.data.ok) {
        showToast(res.data.message || '✓ All demo data wiped successfully! Ready for Production.', 'success');
        setIsEditorOpen(false);
        setSelectedStudentForRules(null);
        handleClearCourseForm();
        loadAllAdminData();
      }
    } catch (err) {
      showToast('Error clearing demo data.', 'error');
      loadAllAdminData();
    }
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.phone || !studentForm.email) {
      showToast('Please fill in Student Name, Phone, and Email.', 'error');
      return;
    }

    try {
      const res = await api.post('/admin/students/save', studentForm);
      if (res.data.ok) {
        const savedStudent = res.data.student || { ...studentForm, id: studentForm.id || `STU-${Date.now()}` };
        setStudents(prev => {
          const idx = prev.findIndex(s => s.id === savedStudent.id || (savedStudent._id && s._id === savedStudent._id));
          if (idx > -1) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...savedStudent };
            return updated;
          }
          return [savedStudent, ...prev];
        });
        showToast(res.data.message || `✓ Student profile for "${studentForm.name}" saved successfully in MongoDB!`, 'success');
        loadAllAdminData();
      } else {
        showToast(res.data.message || 'Error saving student profile.', 'error');
      }
    } catch (err) {
      showToast('Error saving student profile.', 'error');
    }
  };

  // Course Rules Map (courseId -> rule object)
  const [courseRulesMap, setCourseRulesMap] = useState({});

  const updateRuleFieldForCourse = (courseId, field, value) => {
    setCourseRulesMap(prevMap => {
      const currentRule = prevMap[courseId] || {
        courseId: courseId,
        unlimitedAccess: false,
        accessStartDate: '2026-04-01',
        accessEndDate: '2026-06-30',
        videoAccessUntil: '2026-06-30',
        lastPaymentDate: '2026-04-01',
        paymentDueDate: '2026-06-30',
        monthlyFee: '1000',
        enrollmentStatus: 'Active',
        paidMonths: '2026-04'
      };
      return {
        ...prevMap,
        [courseId]: { ...currentRule, [field]: value }
      };
    });
  };

  const handleEditStudent = (s) => {
    setSelectedStudentForRules(s);
    setIsEditorOpen(true);

    const allowed = s.allowedCourseIds || s.enrolledCourseIds || [];

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
      allowedCourseIds: allowed
    });

    const map = {};
    (s.courseRules || []).forEach(r => {
      if (r && r.courseId) map[r.courseId] = r;
    });

    allowed.forEach(cId => {
      if (!map[cId]) {
        map[cId] = {
          courseId: cId,
          unlimitedAccess: false,
          accessStartDate: '2026-04-01',
          accessEndDate: '2026-06-30',
          videoAccessUntil: '2026-06-30',
          lastPaymentDate: '2026-04-01',
          paymentDueDate: '2026-06-30',
          monthlyFee: '1000',
          enrollmentStatus: 'Active',
          paidMonths: '2026-04'
        };
      }
    });

    setCourseRulesMap(map);
    showToast(`Editing profile & rules for student: ${s.name}`, 'success');

    setTimeout(() => {
      document.getElementById('student-editor-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCreateNewStudent = () => {
    const defaultCourseId = courses[0]?.id || 'civil-laws-intensive';
    const newStudent = {
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
      allowedCourseIds: [defaultCourseId]
    };
    setSelectedStudentForRules(newStudent);
    setStudentForm(newStudent);
    setIsEditorOpen(true);

    setCourseRulesMap({
      [defaultCourseId]: {
        courseId: defaultCourseId,
        unlimitedAccess: false,
        accessStartDate: '2026-04-01',
        accessEndDate: '2026-06-30',
        videoAccessUntil: '2026-06-30',
        lastPaymentDate: '2026-04-01',
        paymentDueDate: '2026-06-30',
        monthlyFee: '1000',
        enrollmentStatus: 'Active',
        paidMonths: '2026-04'
      }
    });
    showToast('Student Profile Form opened for new student.', 'success');

    setTimeout(() => {
      document.getElementById('student-editor-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedStudentForRules(null);
    showToast('Student editor closed.', 'success');
  };

  const handleToggleCourseAssignment = (cId, isChecked) => {
    let currentAllowed = studentForm.allowedCourseIds || [];
    if (isChecked) {
      if (!currentAllowed.includes(cId)) {
        currentAllowed = [...currentAllowed, cId];
      }
      setCourseRulesMap(prev => ({
        ...prev,
        [cId]: prev[cId] || {
          courseId: cId,
          unlimitedAccess: false,
          accessStartDate: '2026-04-01',
          accessEndDate: '2026-06-30',
          videoAccessUntil: '2026-06-30',
          lastPaymentDate: '2026-04-01',
          paymentDueDate: '2026-06-30',
          monthlyFee: '1000',
          enrollmentStatus: 'Active',
          paidMonths: '2026-04'
        }
      }));
    } else {
      currentAllowed = currentAllowed.filter(i => i !== cId);
    }

    setStudentForm(prev => ({ ...prev, allowedCourseIds: currentAllowed }));
    if (selectedStudentForRules) {
      setSelectedStudentForRules(prev => ({ ...prev, allowedCourseIds: currentAllowed }));
    }
  };

  const handleSaveStudentCourseAccess = async () => {
    if (!selectedStudentForRules) {
      showToast('Please select a student from the list first.', 'error');
      return;
    }

    try {
      const updatedStudent = {
        ...selectedStudentForRules,
        allowedCourseIds: studentForm.allowedCourseIds || []
      };

      const res = await api.post('/admin/students/save', updatedStudent);

      if (res.data.ok) {
        setSelectedStudentForRules(updatedStudent);
        showToast(`✓ Course access granted successfully for "${selectedStudentForRules.name}"!`, 'success');
        loadAllAdminData();
      } else {
        showToast(res.data.message || 'Error updating course access.', 'error');
      }
    } catch (err) {
      showToast('Error updating course access.', 'error');
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm(`Are you sure you want to delete student ${id}?`)) return;
    setStudents(prev => prev.filter(s => s.id !== id && s._id !== id));
    try {
      const res = await api.delete(`/admin/students/${id}`);
      if (res.data.ok) {
        showToast(res.data.message || `✓ Student ${id} deleted successfully!`, 'success');
        loadAllAdminData();
      } else {
        showToast(res.data.message || 'Error deleting student.', 'error');
        loadAllAdminData();
      }
    } catch (err) {
      showToast('Error deleting student.', 'error');
      loadAllAdminData();
    }
  };

  const handleSendPopupMessage = async () => {
    if (selectedStudentIds.length === 0) {
      showToast('Please select student(s) first.', 'error');
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
        showToast(res.data.message || 'Popup message sent!', 'success');
        setPopupTitle('');
        setPopupBody('');
      }
    } catch (err) {
      showToast('Error sending popup message.', 'error');
    }
  };

  const handleSendDirectEmail = async () => {
    if (selectedStudentIds.length === 0) {
      showToast('Please select student(s) first.', 'error');
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
        showToast(res.data.message || 'Email sent!', 'success');
        setEmailSubject('');
        setEmailBody('');
      }
    } catch (err) {
      showToast('Error sending email.', 'error');
    }
  };

  const handleEditCourse = (c) => {
    setCourseForm({
      id: c.id,
      title: c.title,
      shortTitle: c.shortTitle || c.title,
      faculty: c.faculty || 'Shanto Deb Roy Arno',
      category: c.category || 'CIVIL LAW',
      schedule: c.schedule || '',
      batchRegText: c.batchRegText || c.schedule || '',
      sessionRegText: c.sessionRegText || '2026-04-01',
      nextLive: c.nextLive || '',
      price: String(c.price || 1000),
      paymentType: c.paymentType || 'One-time Lifetime Access',
      status: c.status || 'Active',
      description: c.description || ''
    });

    showToast(`Loaded course "${c.title}" into Course Launch Manager for editing.`, 'success');

    setTimeout(() => {
      document.getElementById('course-launch-manager-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleClearCourseForm = () => {
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
      paymentType: 'One-time Lifetime Access',
      status: 'Active',
      description: ''
    });
    showToast('Course Launch Form reset.', 'success');
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.title) {
      showToast('Course title is required.', 'error');
      return;
    }
    try {
      const res = await api.post('/admin/courses/save', courseForm);
      if (res.data.ok) {
        const savedCourse = res.data.course || { ...courseForm, id: courseForm.id || `course-${Date.now()}` };
        setCourses(prevCourses => {
          const idx = prevCourses.findIndex(c => c.id === savedCourse.id);
          if (idx > -1) {
            const updated = [...prevCourses];
            updated[idx] = { ...updated[idx], ...savedCourse };
            return updated;
          }
          return [...prevCourses, savedCourse];
        });

        showToast(res.data.message || `✓ Course "${courseForm.title}" saved successfully in MongoDB!`, 'success');
        handleClearCourseForm();
        await loadAllAdminData();
      } else {
        showToast(res.data.message || 'Error saving course.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving course.', 'error');
    }
  };

  const handleToggleCourse = async (courseId) => {
    const target = courses.find(c => c.id === courseId);
    const oldStatus = target?.status || 'Active';
    const newStatus = oldStatus === 'Active' ? 'Inactive' : 'Active';

    // Optimistically update ONLY this course's status so each course status is 100% independent
    setCourses(prevCourses =>
      prevCourses.map(c => c.id === courseId ? { ...c, status: newStatus } : c)
    );

    try {
      const res = await api.post('/admin/courses/toggle', { courseId });
      if (res.data.ok) {
        showToast(res.data.message || `✓ Course "${target?.title || courseId}" is now ${newStatus}!`, 'success');
      } else {
        showToast(res.data.message || 'Error toggling course status.', 'error');
        loadAllAdminData();
      }
    } catch (err) {
      showToast('Error toggling course status.', 'error');
      loadAllAdminData();
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm(`Are you sure you want to delete course ${courseId}?`)) return;
    setCourses(prevCourses => prevCourses.filter(c => c.id !== courseId));
    try {
      const res = await api.delete(`/admin/courses/${courseId}`);
      if (res.data.ok) {
        showToast(res.data.message || '✓ Course deleted successfully from system & database!', 'success');
        loadAllAdminData();
      } else {
        showToast(res.data.message || 'Error deleting course.', 'error');
        loadAllAdminData();
      }
    } catch (err) {
      showToast('Error deleting course.', 'error');
      loadAllAdminData();
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

  // Money Receipt Action Handlers
  const handleSelectStudentForReceipt = (s) => {
    setSelectedStudentForReceipt(s);
    setReceiptForm({
      receiptId: 'REC-2026-' + Math.floor(1000 + Math.random() * 9000),
      studentId: s.id,
      studentName: s.name,
      studentPhone: s.phone,
      studentEmail: s.email,
      batch: s.batch || 'BJS & Bar Masterclass',
      amount: '',
      paymentMethod: 'bKash',
      trxId: '',
      paymentTime: new Date().toISOString().substring(0, 16),
      note: 'Course Fee Payment'
    });
    showToast(`Selected student: ${s.name} (${s.id})`, 'success');
  };

  const handleSaveReceipt = async (e) => {
    if (e) e.preventDefault();
    if (!receiptForm.studentId || !receiptForm.amount) {
      showToast('স্টুডেন্ট আইডি এবং পেমেন্টের পরিমাণ অবশ্যই দিতে হবে।', 'error');
      return;
    }

    try {
      const res = await api.post('/admin/receipts/save', receiptForm);
      if (res.data.ok) {
        showToast(res.data.message || `✓ মানি রিসিট সেভ করা হয়েছে এবং ইমেইল পাঠানো হয়েছে!`, 'success');
        setReceiptForm({
          receiptId: '',
          studentId: '',
          studentName: '',
          studentPhone: '',
          studentEmail: '',
          batch: '',
          amount: '',
          paymentMethod: 'bKash',
          trxId: '',
          paymentTime: new Date().toISOString().substring(0, 16),
          note: 'Course Fee Payment'
        });
        setSelectedStudentForReceipt(null);
        loadAllAdminData();
      } else {
        showToast(res.data.message || 'মানি রিসিট সেভ করতে সমস্যা হয়েছে।', 'error');
      }
    } catch (err) {
      showToast('মানি রিসিট সেভ করতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleResendReceiptEmail = async (receiptId) => {
    try {
      const res = await api.post(`/admin/receipts/resend-email/${receiptId}`);
      if (res.data.ok) {
        showToast(res.data.message || `✓ মানি রিসিট ইমেইল পুনরায় পাঠানো হয়েছে!`, 'success');
      } else {
        showToast(res.data.message || 'ইমেইল পুনরায় পাঠাতে ব্যর্থ হয়েছে।', 'error');
      }
    } catch (err) {
      showToast('ইমেইল পাঠাতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleDeleteReceipt = async (receiptId) => {
    if (!window.confirm(`আপনি কি সত্যিই মানি রিসিট ${receiptId} ডিলিট করতে চান?`)) return;
    try {
      const res = await api.delete(`/admin/receipts/${receiptId}`);
      if (res.data.ok) {
        showToast(res.data.message || `✓ মানি রিসিট ${receiptId} ডিলিট করা হয়েছে!`, 'success');
        loadAllAdminData();
      }
    } catch (err) {
      showToast('ডিলিট করতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleEditReceipt = (r) => {
    setReceiptForm({
      receiptId: r.receiptId,
      studentId: r.studentId,
      studentName: r.studentName,
      studentPhone: r.studentPhone,
      studentEmail: r.studentEmail,
      batch: r.batch || '',
      amount: r.amount || '',
      paymentMethod: r.paymentMethod || 'bKash',
      trxId: r.trxId || '',
      paymentTime: r.paymentTime ? new Date(r.paymentTime).toISOString().substring(0, 16) : new Date().toISOString().substring(0, 16),
      note: r.note || ''
    });
    setSelectedStudentForReceipt({ id: r.studentId, name: r.studentName, phone: r.studentPhone, email: r.studentEmail });
    showToast(`Editing Money Receipt ${r.receiptId}`, 'success');
    document.getElementById('payment-form-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePrintAllReceiptsSummary = () => {
    const totalAmount = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const bkashAmt = receipts.filter(r => (r.paymentMethod || '').toLowerCase().includes('bkash')).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const nagadAmt = receipts.filter(r => (r.paymentMethod || '').toLowerCase().includes('nagad')).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const rocketAmt = receipts.filter(r => (r.paymentMethod || '').toLowerCase().includes('rocket')).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const othersAmt = totalAmount - (bkashAmt + nagadAmt + rocketAmt);

    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment & Collection Summary Report - BJS & Bar Academy</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
          h1 { color: #d97706; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background-color: #f1f5f9; }
          .summary-card { display: flex; gap: 15px; margin: 15px 0; }
          .card { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; flex: 1; text-align: center; }
          .card h3 { margin: 0; font-size: 20px; color: #059669; }
          .card p { margin: 4px 0 0 0; font-size: 11px; color: #64748b; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>⚖️ BJS & Bar Aspirants Academy</h1>
        <p style="margin-top:0; font-size: 12px; color: #64748b;">Official Accounts Collection & Money Receipt Summary Report | Issued: ${new Date().toLocaleString()}</p>
        
        <div class="summary-card">
          <div class="card">
            <h3>৳ ${totalAmount.toLocaleString()} BDT</h3>
            <p>TOTAL COLLECTIONS</p>
          </div>
          <div class="card">
            <h3 style="color:#d97706;">৳ ${bkashAmt.toLocaleString()} BDT</h3>
            <p>BKASH TOTAL</p>
          </div>
          <div class="card">
            <h3 style="color:#2563eb;">৳ ${nagadAmt.toLocaleString()} BDT</h3>
            <p>NAGAD TOTAL</p>
          </div>
          <div class="card">
            <h3 style="color:#7c3aed;">৳ ${rocketAmt.toLocaleString()} BDT</h3>
            <p>ROCKET TOTAL</p>
          </div>
          <div class="card">
            <h3 style="color:#475569;">৳ ${othersAmt.toLocaleString()} BDT</h3>
            <p>OTHERS / CASH TOTAL</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Receipt Ref</th>
              <th>Date & Time</th>
              <th>Student ID</th>
              <th>Student Name</th>
              <th>Phone</th>
              <th>Method</th>
              <th>TrxID</th>
              <th>Amount (BDT)</th>
            </tr>
          </thead>
          <tbody>
            ${receipts.map(r => `
              <tr>
                <td><strong>${r.receiptId}</strong></td>
                <td>${new Date(r.paymentTime || r.createdAt).toLocaleString()}</td>
                <td>${r.studentId}</td>
                <td>${r.studentName}</td>
                <td>${r.studentPhone}</td>
                <td><strong>${r.paymentMethod}</strong></td>
                <td>${r.trxId || 'N/A'}</td>
                <td><strong>৳ ${Number(r.amount).toLocaleString()}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>window.print();</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-8 pb-20 animate-fadeIn text-slate-100 font-sans relative">
      {/* Floating Toast Notification Banner (Visible across the whole page) */}
      {msg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] animate-bounce-short max-w-md w-[90%] shadow-2xl">
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold backdrop-blur-xl transition-all ${
            msg.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/50 shadow-emerald-950/50'
              : 'bg-rose-950/95 text-rose-200 border-rose-500/50 shadow-rose-950/50'
          }`}>
            <div className="flex items-center gap-2.5">
              <span className="text-base">{msg.type === 'success' ? '✅' : '⚠️'}</span>
              <span>{msg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setMsg(null)}
              className="text-slate-400 hover:text-white px-2 py-0.5 text-xs font-mono"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 1. Header Banner */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase">AIN PATHSHALA</span>
          <h1 className="text-2xl font-black text-white tracking-tight">Admin Control Panel</h1>
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
          <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
            <button onClick={loadAllAdminData} className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all">
              🔄 Refresh Data
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
              onClick={handleCreateNewStudent}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md"
            >
              + New Student
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
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <span>{s.name}</span>
                      {s.highlight && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">{s.highlight}</span>}
                    </p>
                    <p className="font-mono text-[10px] text-amber-300">{s.id}</p>
                    <p className="text-[10px] text-slate-400">{s.email}</p>
                  </td>
                  <td className="p-3 font-mono text-slate-300">{s.phone}</td>
                  <td className="p-3 text-slate-300 max-w-[140px]">
                    <p className="line-clamp-1">{s.batch}</p>
                    <p className="text-[10px] text-slate-500 font-mono line-clamp-1">{s.session}</p>
                  </td>
                  <td className="p-3">
                    <select
                      value={s.loginApproval || 'Approved'}
                      onChange={(e) => handleUpdateStudentApproval(s, e.target.value)}
                      className={`px-2 py-1 rounded text-[10px] font-bold border focus:outline-none cursor-pointer ${
                        s.loginApproval === 'Approved' ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30' :
                        s.loginApproval === 'Pending' ? 'bg-amber-950 text-amber-300 border-amber-500/30' :
                        'bg-rose-950 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      <option value="Approved">Approved ✓</option>
                      <option value="Pending">Pending ⏳</option>
                      <option value="Rejected">Rejected ✕</option>
                    </select>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      0/{s.maxDeviceCount || 2} active devices
                    </p>
                  </td>
                  <td className="p-3">
                    <select
                      value={s.status || 'Active'}
                      onChange={(e) => handleUpdateStudentStatus(s, e.target.value)}
                      className={`px-2 py-1 rounded text-[10px] font-bold border focus:outline-none cursor-pointer ${
                        s.status === 'Active' ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30' :
                        'bg-rose-950 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      <option value="Active">Active</option>
                      <option value="Blocked">Blocked 🚫</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="p-3 text-slate-300 font-bold text-[11px]">
                    {(s.allowedCourseIds || s.enrolledCourseIds || []).length} Course(s)
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenStudentPreview(s)}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 font-bold text-[11px] transition-all"
                      title="View Student Portal & Video Courses"
                    >
                      👁️ View Portal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditStudent(s)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-[11px] transition-all"
                    >
                      ✏️ Edit Rules
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStudent(s.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/30 font-bold text-[11px] transition-all"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Editor & Selected Students PER COURSE RULE Engine Panel (Reference Screenshot 2 Sync) */}
      <section id="student-editor-section" className="transition-all duration-300">
        {isEditorOpen && selectedStudentForRules ? (
          <div className="space-y-4 animate-fadeIn">
            {/* Top Bar for Editor Section with Close Button */}
            <div className="flex justify-between items-center bg-slate-950 p-4 rounded-2xl border border-amber-500/30 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center justify-center text-lg shadow-md">
                  ✏️
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                    <span>স্টুডেন্ট এডিটর ও কোর্স রুলস</span>
                    <span className="text-amber-300">({selectedStudentForRules.name || 'New Student'})</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    ID: {selectedStudentForRules.id || 'STU-NEW'} • Phone: {selectedStudentForRules.phone || 'N/A'} • Email: {selectedStudentForRules.email || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditor}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 shadow-md flex items-center gap-1.5"
              >
                <span>✕</span> এডিটর বন্ধ করুন (Close Editor)
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Student Profile Form (Left Card) */}
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

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-slate-400 text-[10px] font-bold mb-1">STUDENT FULL NAME</label>
                    <input
                      type="text"
                      placeholder="Student name (e.g. Srity)"
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] font-bold mb-1">PHONE NUMBER</label>
                    <input
                      type="text"
                      placeholder="Phone Number (e.g. 01781920154)"
                      value={studentForm.phone}
                      onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] font-bold mb-1">EMAIL ADDRESS</label>
                    <input
                      type="email"
                      placeholder="Email Address (e.g. sritypaul294@gmail.com)"
                      value={studentForm.email}
                      onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold mb-1">BATCH</label>
                      <input
                        type="text"
                        placeholder="Batch (e.g. Wed,Sat)"
                        value={studentForm.batch}
                        onChange={(e) => setStudentForm({ ...studentForm, batch: e.target.value })}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] font-bold mb-1">SESSION</label>
                      <input
                        type="text"
                        placeholder="Session (e.g. 2026-04-01)"
                        value={studentForm.session}
                        onChange={(e) => setStudentForm({ ...studentForm, session: e.target.value })}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] font-bold mb-1">PASSWORD (PROTECTED)</label>
                    <input
                      type="password"
                      placeholder="•••••••• (Leave blank to keep current password)"
                      value={studentForm.password}
                      onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-white font-mono"
                    />
                    <span className="text-[9px] text-slate-500 block mt-0.5">Password is encrypted & hidden for security.</span>
                  </div>
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

                {/* Admin Note / Highlight */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">ADMIN NOTE / HIGHLIGHT</span>
                  <textarea
                    placeholder="Add admin note for this student..."
                    value={studentForm.highlight}
                    onChange={(e) => setStudentForm({ ...studentForm, highlight: e.target.value })}
                    rows="2"
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-slate-200 text-xs"
                  ></textarea>
                </div>

                <button type="submit" className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all">
                  💾 Save Student Profile
                </button>
              </form>

              {/* Course Assignment + Messaging & PER COURSE RULE Panel (Screenshot 2 Sync) */}
              <div className="lg:col-span-7 glass-card rounded-xl p-6 border border-slate-800 space-y-4 text-xs">
                <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">SELECTED STUDENT MANAGEMENT</span>
                    <h3 className="font-extrabold text-white text-sm">Course Assignment & Access Rules</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Managing <strong className="text-amber-300">{selectedStudentForRules?.name || 'Srity'}</strong> ({selectedStudentForRules?.id || 'STU-2026-001'}).
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-amber-400 font-mono font-bold text-[10px]">
                    1 selected
                  </span>
                </div>

                {/* Assign Courses */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">ASSIGN COURSES (SELECT COURSES FOR STUDENT)</span>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      {(studentForm.allowedCourseIds || []).length} Course(s) Granted Access
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {courses.map((c) => {
                      const isAssigned = (studentForm.allowedCourseIds || []).includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleToggleCourseAssignment(c.id, !isAssigned)}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                            isAssigned
                              ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg ring-1 ring-amber-500/50'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer flex-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={(e) => handleToggleCourseAssignment(c.id, e.target.checked)}
                              className="rounded bg-slate-900 border-slate-700 text-amber-500 w-4 h-4 cursor-pointer"
                            />
                            <div>
                              <p className="font-bold text-white line-clamp-1">{c.title}</p>
                              <p className="text-[9px] font-mono text-slate-400">{c.category || 'COURSE'} • {c.faculty}</p>
                            </div>
                          </label>
                          {isAssigned && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-extrabold border border-emerald-500/30 shrink-0">
                              ✓ ACCESS GRANTED
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* DYNAMIC SIMPLIFIED COURSE ACCESS CONTROL */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-amber-300 text-xs flex items-center gap-1.5">
                        <span>🔓</span> Lifetime Course Access Control
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        Checking courses above grants <strong className="text-amber-400">Lifetime Unlimited Access</strong> to watch all uploaded video lectures for <strong>{selectedStudentForRules?.name || 'this student'}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveStudentCourseAccess}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                      <span>💾</span> Save Course Access for {selectedStudentForRules?.name || 'Student'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto text-base">
              🔒
            </div>
            <h4 className="font-bold text-slate-300 text-sm">স্টুডেন্ট প্রোফাইল এডিটর ও কোর্স এক্সেস রুলস নিষ্ক্রিয় (Editor Hidden)</h4>
            <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
              যেকোনো নির্দিষ্ট স্টুডেন্টের প্রোফাইল এডিটিং এবং কোর্স সময়সীমা কনফিগার করার জন্য উপরের তালিকা থেকে স্টুডেন্টের পাশে <strong>✏️ Edit Rules</strong> বাটনে ক্লিক করুন।
            </p>
          </div>
        )}
      </section>

      {/* 4.5 Mentor & Faculty Manager (মেন্টর ও শিক্ষক ব্যবস্থাপনা) */}
      <section id="mentor-manager-section" className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 gap-3">
          <div>
            <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">FACULTY CONTROL</span>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <span>👨‍⚖️</span> মেন্টর ও শিক্ষক ব্যবস্থাপনা (Mentor & Faculty Manager)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              হোমপেজের মেন্টর তালিকায় প্রদর্শনের জন্য মাননীয় বিচারক ও মেন্টরদের নাম, পদবী, পোস্টিং ও ছবি যুক্ত করুন।
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearMentorForm}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all shadow-md"
          >
            Clear Form
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form Card */}
          <form onSubmit={handleSaveMentor} className="lg:col-span-5 glass-card rounded-2xl p-5 border border-slate-800 space-y-3 text-xs bg-slate-950/80">
            <h4 className="font-extrabold text-white text-sm border-b border-slate-800/80 pb-2 flex items-center justify-between">
              <span>✍️ Mentor Profile Form</span>
              {mentorForm.id && <span className="text-[10px] text-amber-400 font-mono">Editing: {mentorForm.id}</span>}
            </h4>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">MENTOR FULL NAME (নাম)</label>
                <input
                  type="text"
                  placeholder="e.g. শান্ত দেব রায় অর্ণ"
                  value={mentorForm.name}
                  onChange={(e) => setMentorForm({ ...mentorForm, name: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">DESIGNATION / RANK (পদবী ও ক্যাডার)</label>
                <input
                  type="text"
                  placeholder="e.g. সহকারী জজ (BJS) / সুপ্রিম কোর্টের এডভোকেট"
                  value={mentorForm.designation}
                  onChange={(e) => setMentorForm({ ...mentorForm, designation: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">POSTING & JURISDICTION (পোস্টিং ও জেলা)</label>
                <input
                  type="text"
                  placeholder="e.g. ২য় অতিরিক্ত জেলা ও দায়রা জজ, ঢাকা"
                  value={mentorForm.posting}
                  onChange={(e) => setMentorForm({ ...mentorForm, posting: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">SUBJECT EXPERTISE (বিষয়ভিত্তিক বিশেষত্ব)</label>
                <input
                  type="text"
                  placeholder="e.g. দেওয়ানী আইন, পেনাল কোড ও বার কাউন্সিল এডভোকেসি"
                  value={mentorForm.expertise}
                  onChange={(e) => setMentorForm({ ...mentorForm, expertise: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">PHOTO URL (ছবি বা লোগো লিঙ্ক - অপশনাল)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={mentorForm.photoUrl}
                  onChange={(e) => setMentorForm({ ...mentorForm, photoUrl: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white font-mono text-[11px]"
                />
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400">CONTACT NUMBER (ফোন নম্বর - অপশনাল)</label>
                  <label className="flex items-center gap-1.5 text-[10px] text-amber-300 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mentorForm.showPhone}
                      onChange={(e) => setMentorForm({ ...mentorForm, showPhone: e.target.checked })}
                      className="rounded bg-slate-950 border-slate-700 text-amber-500 w-3.5 h-3.5"
                    />
                    <span>Show Publicly</span>
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="e.g. 01700000000"
                  value={mentorForm.phone}
                  onChange={(e) => setMentorForm({ ...mentorForm, phone: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-white font-mono"
                />
                <p className="text-[9px] text-slate-500 leading-relaxed">
                  যদি Show Publicly টিক দেওয়া থাকে, তবে পাবলিক পোর্টালে এই নম্বরটি প্রদর্শিত হবে।
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">SHORT BIO / INTRO (সংক্ষিপ্ত বিবরণ)</label>
                <textarea
                  rows={2}
                  placeholder="Mentor details or background..."
                  value={mentorForm.bio}
                  onChange={(e) => setMentorForm({ ...mentorForm, bio: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">STATUS</label>
                <select
                  value={mentorForm.status}
                  onChange={(e) => setMentorForm({ ...mentorForm, status: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white font-bold"
                >
                  <option value="Active">Active (Visible on Homepage)</option>
                  <option value="Inactive">Inactive (Hidden)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/20 transition-all"
            >
              💾 Save Mentor Profile
            </button>
          </form>

          {/* Right Mentors List Card */}
          <div className="lg:col-span-7 glass-card rounded-2xl p-5 border border-slate-800 space-y-4 bg-slate-950/80">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">FACULTY LIST</span>
                <h3 className="font-extrabold text-white text-base">Active & Registered Mentors ({mentors.length})</h3>
              </div>
              <span className="text-xs font-mono text-purple-400 font-bold">
                {mentors.filter(m => m.status === 'Active').length} Active
              </span>
            </div>

            {mentors.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto text-xl font-bold">
                  ⚖️
                </div>
                <h4 className="text-white font-bold text-sm">কোনো মেন্টর পাওয়া যায়নি</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  নতুন মেন্টর বা শিক্ষকের তথ্য যুক্ত করতে বামপাশের ফর্মটি পূরণ করে <strong>Save Mentor Profile</strong> বাটনে ক্লিক করুন।
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
                {mentors.map((m) => (
                  <div key={m.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-purple-500/40 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 font-bold flex items-center justify-center text-lg shrink-0 overflow-hidden">
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" />
                        ) : (
                          '⚖️'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-white text-sm">{m.name}</h4>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                            m.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {m.status}
                          </span>
                        </div>
                        <p className="text-purple-300 text-xs font-bold mt-0.5">{m.designation}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          📍 {m.posting} | 📖 {m.expertise}
                        </p>
                        {m.phone && (
                          <p className="text-[10px] font-mono text-slate-400 mt-1">
                            📞 {m.phone} {m.showPhone ? <span className="text-emerald-400 font-bold">(Public)</span> : <span className="text-slate-500">(Hidden)</span>}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleEditMentor(m)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-[11px] transition-all"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMentor(m.id, m.name)}
                        className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/30 font-bold text-[11px] transition-all"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Course Control & Course Launch Manager */}
      <section id="course-launch-manager-section" className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-3 gap-3">
          <div>
            <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">COURSE CONTROL</span>
            <h2 className="text-lg font-extrabold text-white">Course Launch Manager</h2>
          </div>
          <button
            type="button"
            onClick={handleClearCourseForm}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all shadow-md"
          >
            Clear Form
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form Card */}
          <form onSubmit={handleSaveCourse} className="lg:col-span-4 glass-card rounded-2xl p-5 border border-slate-800 space-y-3 text-xs bg-slate-950/80">
            <h4 className="font-extrabold text-white text-sm border-b border-slate-800/80 pb-2 flex items-center justify-between">
              <span>🚀 Course Launch & Edit Form</span>
              {courseForm.id && <span className="text-[10px] text-amber-400 font-mono">Editing: {courseForm.id}</span>}
            </h4>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Course ID (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. civil-laws-intensive"
                  value={courseForm.id}
                  onChange={(e) => setCourseForm({ ...courseForm, id: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white font-mono placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Course title</label>
                <input
                  type="text"
                  placeholder="e.g. Civil Laws Intensive"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white font-medium placeholder-slate-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Short title</label>
                <input
                  type="text"
                  placeholder="e.g. Civil Law"
                  value={courseForm.shortTitle}
                  onChange={(e) => setCourseForm({ ...courseForm, shortTitle: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white font-medium placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Faculty</label>
                <input
                  type="text"
                  placeholder="e.g. Shanto Deb Roy Arno"
                  value={courseForm.faculty}
                  onChange={(e) => setCourseForm({ ...courseForm, faculty: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. CIVIL LAW"
                  value={courseForm.category}
                  onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white uppercase font-mono placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Batch shown on registration form</label>
                <input
                  type="text"
                  placeholder="e.g. Wed,Sat"
                  value={courseForm.batchRegText}
                  onChange={(e) => setCourseForm({ ...courseForm, batchRegText: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Session shown on registration form</label>
                <input
                  type="text"
                  placeholder="e.g. 2026-04-01"
                  value={courseForm.sessionRegText}
                  onChange={(e) => setCourseForm({ ...courseForm, sessionRegText: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white font-mono placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Schedule</label>
                <input
                  type="text"
                  placeholder="e.g. 2 Day / Wed,Sat 8:30 PM"
                  value={courseForm.schedule}
                  onChange={(e) => setCourseForm({ ...courseForm, schedule: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Next live date/time</label>
                <input
                  type="text"
                  placeholder="e.g. Wed,Sat 8:30 PM"
                  value={courseForm.nextLive}
                  onChange={(e) => setCourseForm({ ...courseForm, nextLive: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Course fee (example: 1500)</label>
                <input
                  type="text"
                  placeholder="1000"
                  value={courseForm.price}
                  onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-amber-300 font-mono font-bold placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Monthly Payment / Subscription</label>
                <select
                  value={courseForm.paymentType || 'One-time Lifetime Access'}
                  onChange={(e) => setCourseForm({ ...courseForm, paymentType: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white cursor-pointer"
                >
                  <option value="One-time Lifetime Access">One-time Lifetime Access</option>
                  <option value="Monthly Subscription">Monthly Subscription Fee</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Status</label>
                <select
                  value={courseForm.status || 'Active'}
                  onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-white font-bold cursor-pointer"
                >
                  <option value="Active">Active - visible to students</option>
                  <option value="Inactive">Inactive - hidden from students</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Course details..."
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-slate-300 text-xs placeholder-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
            >
              💾 Save Course
            </button>
          </form>

          {/* Right Course Catalog List */}
          <div className="lg:col-span-8 glass-card rounded-2xl p-5 border border-slate-800 space-y-4 bg-slate-950/80">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">COURSE CATALOG</span>
                <h3 className="font-extrabold text-white text-base">Active And Hidden Courses</h3>
              </div>
              <span className="text-xs font-mono text-amber-400 font-bold">
                {courses.filter(c => c.status === 'Active').length} active / {courses.length} total
              </span>
            </div>

            <div className="space-y-3 max-h-[850px] overflow-y-auto pr-1">
              {courses.length === 0 && (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/50 text-slate-400">
                  <p className="font-semibold text-sm">কোনো কোর্স পাওয়া যায়নি / No courses available</p>
                  <p className="text-xs text-slate-500 mt-1">বাম পাশের "Course Launch & Edit Form" ব্যবহার করে কোর্স তৈরি বা সেভ করুন।</p>
                </div>
              )}
              {courses.map((c) => {
                const studentCount = students.filter(s =>
                  (s.allowedCourseIds && s.allowedCourseIds.includes(c.id)) ||
                  (s.enrolledCourseIds && s.enrolledCourseIds.includes(c.id))
                ).length;

                return (
                  <div key={c.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs hover:border-slate-700 transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-amber-300 uppercase px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                          {c.category || 'COURSE'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {c.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleToggleCourse(c.id)}
                          className={`px-3 py-1 rounded-lg font-bold text-[11px] border transition-all ${
                            c.status === 'Active'
                              ? 'bg-amber-950 text-amber-300 border-amber-500/30 hover:bg-amber-900'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900'
                          }`}
                        >
                          {c.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditCourse(c)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-[11px] transition-all"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCourse(c.id)}
                          className="px-3 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/30 font-bold text-[11px] transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-white text-sm">{c.title}</h4>
                      <p className="text-slate-400 text-[11px] mt-0.5">{c.faculty}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        Batch: {c.batchRegText || c.schedule} | Session: {c.sessionRegText || '2026-04-01'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {c.schedule}
                      </p>
                      {c.status !== 'Active' && (
                        <p className="text-[10px] text-amber-400/80 italic mt-1">
                          This course is hidden from students, videos, and registration until you activate it again.
                        </p>
                      )}
                      <p className="text-amber-300 font-mono font-bold text-xs mt-1">
                        Course Fee: Tk {c.price}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500">
                        ID: {c.id} | Students: {studentCount}
                      </span>

                      <button
                        type="button"
                        onClick={() => openLessonManager(c)}
                        className="px-3 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 font-bold text-[11px] transition-all flex items-center gap-1"
                      >
                        <span>📹</span> Upload & Manage Videos
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 8. PAYMENT FOR STUDENT (স্টুডেন্ট পেমেন্ট ও মানি রিসিট ব্যবস্থাপনা) */}
      <section id="payment-form-section" className="glass-card rounded-2xl p-6 border border-emerald-500/40 shadow-2xl space-y-6 bg-slate-950/70 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold uppercase border border-emerald-500/30">
                FINANCIAL & ACCOUNTS PORTAL
              </span>
              <span className="text-xs text-slate-400 font-mono">Receipt Engine v2.0</span>
            </div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 mt-1">
              <span>💳</span> Payment for Student (পেমেন্ট ও মানি রিসিট সেকশন)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              স্টুডেন্ট সার্চ করুন, পেমেন্ট অ্যান্ট্রি দিন এবং সরাসরি ইউজারের ইমেইলে ব্র্যান্ডেড সিল-ছাপ্পড়সহ অফিশিয়াল মানি রিসিট (Paid Slip) পাঠান।
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrintAllReceiptsSummary}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <span>📄</span> সর্বমোট কালেকশন রিপোর্ট প্রিন্ট (Export PDF/Print)
          </button>
        </div>

        {/* Collection Summary Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-center space-y-1">
            <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">TOTAL COLLECTIONS</span>
            <p className="text-xl font-black text-emerald-400 font-mono">
              ৳ {receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toLocaleString()} BDT
            </p>
            <p className="text-[10px] text-slate-400">{receipts.length} Payment Receipts</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 text-center space-y-1">
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">BKASH TOTAL</span>
            <p className="text-lg font-bold text-amber-300 font-mono">
              ৳ {receipts.filter(r => (r.paymentMethod || '').toLowerCase().includes('bkash')).reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toLocaleString()} BDT
            </p>
            <p className="text-[10px] text-slate-400">bKash Merchant/Personal</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-orange-500/30 text-center space-y-1">
            <span className="text-[10px] font-mono text-orange-400 font-bold uppercase">NAGAD TOTAL</span>
            <p className="text-lg font-bold text-orange-300 font-mono">
              ৳ {receipts.filter(r => (r.paymentMethod || '').toLowerCase().includes('nagad')).reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toLocaleString()} BDT
            </p>
            <p className="text-[10px] text-slate-400">Nagad Official</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-500/30 text-center space-y-1">
            <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">ROCKET TOTAL</span>
            <p className="text-lg font-bold text-purple-300 font-mono">
              ৳ {receipts.filter(r => (r.paymentMethod || '').toLowerCase().includes('rocket')).reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toLocaleString()} BDT
            </p>
            <p className="text-[10px] text-slate-400">DBBL Rocket</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 text-center space-y-1">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">OTHERS / CASH</span>
            <p className="text-lg font-bold text-slate-300 font-mono">
              ৳ {(receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) - (
                receipts.filter(r => (r.paymentMethod || '').toLowerCase().includes('bkash')).reduce((sum, r) => sum + (Number(r.amount) || 0), 0) +
                receipts.filter(r => (r.paymentMethod || '').toLowerCase().includes('nagad')).reduce((sum, r) => sum + (Number(r.amount) || 0), 0) +
                receipts.filter(r => (r.paymentMethod || '').toLowerCase().includes('rocket')).reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
              )).toLocaleString()} BDT
            </p>
            <p className="text-[10px] text-slate-400">Upay / Bank / Cash</p>
          </div>
        </div>

        {/* Step A: Search & Select Student */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <span>🔍</span> ধাপ ১: স্টুডেন্ট সার্চ ও সিলেকশন (Select Student for Payment)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">স্টুডেন্ট নাম, আইডি বা মোবাইল নম্বর দিয়ে সার্চ দিন:</label>
              <input
                type="text"
                value={receiptSearchQuery}
                onChange={(e) => setReceiptSearchQuery(e.target.value)}
                placeholder="উদাহরণ: Prottoy, 01800077663 বা STU-2026-..."
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">অথবা নিচের লিস্ট থেকে সরাসরি স্টুডেন্ট সিলেক্ট করুন:</label>
              <select
                onChange={(e) => {
                  const s = students.find(item => item.id === e.target.value);
                  if (s) handleSelectStudentForReceipt(s);
                }}
                value={selectedStudentForReceipt?.id || ''}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="">-- যেকোনো স্টুডেন্ট বেছে নিন ({students.length} Total) --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id}) - {s.phone} | {s.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Select Filter Grid */}
          {receiptSearchQuery && (
            <div className="pt-2">
              <span className="text-[11px] text-slate-400 font-bold block mb-2">সার্চ ফলাফল ({students.filter(s =>
                s.name.toLowerCase().includes(receiptSearchQuery.toLowerCase()) ||
                s.phone.includes(receiptSearchQuery) ||
                s.id.toLowerCase().includes(receiptSearchQuery.toLowerCase()) ||
                s.email.toLowerCase().includes(receiptSearchQuery.toLowerCase())
              ).length} জন স্টুডেন্ট পাওয়া গেছে):</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {students.filter(s =>
                  s.name.toLowerCase().includes(receiptSearchQuery.toLowerCase()) ||
                  s.phone.includes(receiptSearchQuery) ||
                  s.id.toLowerCase().includes(receiptSearchQuery.toLowerCase()) ||
                  s.email.toLowerCase().includes(receiptSearchQuery.toLowerCase())
                ).map(s => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectStudentForReceipt(s)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedStudentForReceipt?.id === s.id
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-md'
                        : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                    }`}
                  >
                    <p className="font-bold text-xs">{s.name}</p>
                    <p className="text-[11px] text-amber-400 font-mono">{s.id}</p>
                    <p className="text-[10px] text-slate-400">{s.phone} • {s.email}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Student Active Card */}
          {selectedStudentForReceipt && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-lg shadow-md">
                  👤
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-white text-sm">{selectedStudentForReceipt.name}</h4>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] border border-emerald-500/30">
                      {selectedStudentForReceipt.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    📞 {selectedStudentForReceipt.phone} | 📧 {selectedStudentForReceipt.email} | 🎓 {selectedStudentForReceipt.batch}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForReceipt(null)}
                className="text-xs font-bold text-rose-400 hover:underline px-3 py-1 rounded bg-rose-950/50 border border-rose-500/30"
              >
                ✕ পরিবর্তন করুন
              </button>
            </div>
          )}
        </div>

        {/* Step B: Payment Form */}
        <form onSubmit={handleSaveReceipt} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 text-xs">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <span>📝</span> ধাপ ২: পেমেন্ট ও মানি রিসিট অ্যান্ট্রি (Payment Details Entry)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">রিসিট নম্বর (Receipt Ref):</label>
              <input
                type="text"
                value={receiptForm.receiptId}
                onChange={(e) => setReceiptForm({ ...receiptForm, receiptId: e.target.value })}
                placeholder="REC-2026-1049"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-amber-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">পেমেন্টের পরিমাণ (Amount BDT): *</label>
              <input
                type="number"
                value={receiptForm.amount}
                onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                placeholder="উদাহরণ: 5000"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-emerald-400 font-mono font-bold text-base focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">পেমেন্ট মাধ্যম (Payment Method): *</label>
              <select
                value={receiptForm.paymentMethod}
                onChange={(e) => setReceiptForm({ ...receiptForm, paymentMethod: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="bKash">bKash (বিকাশ)</option>
                <option value="Nagad">Nagad (নগদ)</option>
                <option value="Rocket">Rocket (রকেট)</option>
                <option value="Upay">Upay (উপায়)</option>
                <option value="Bank Transfer">Bank Transfer (ব্যাংক ট্রান্সফার)</option>
                <option value="Cash">Cash (নগদ টাকা)</option>
                <option value="Others">Others (অন্যান্য মেথড)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">ট্রানজেকশন আইডি (TrxID):</label>
              <input
                type="text"
                value={receiptForm.trxId}
                onChange={(e) => setReceiptForm({ ...receiptForm, trxId: e.target.value })}
                placeholder="উদাহরণ: 9H7X2K4L1P"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">তারিখ ও সময় (Payment Date & Time):</label>
              <input
                type="datetime-local"
                value={receiptForm.paymentTime}
                onChange={(e) => setReceiptForm({ ...receiptForm, paymentTime: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">পেমেন্ট বিবরণ / নোটিশ (Note / Description):</label>
              <input
                type="text"
                value={receiptForm.note}
                onChange={(e) => setReceiptForm({ ...receiptForm, note: e.target.value })}
                placeholder="উদাহরণ: 18th BJS Intensive Course Fee 1st Installment"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>💾</span> সেভ ও মানি রিসিট ইমেইল পাঠান (Save & Send Money Receipt Email)
            </button>
          </div>
        </form>

        {/* Step C: Receipts History Table */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <span>📋</span> ইস্যুকৃত মানি রিসিট তালিকা (Issued Receipts History - {receipts.length})
            </h3>
            <span className="text-xs text-emerald-400 font-mono font-bold">Auto-Email & Print Enabled</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3">রিসিট নম্বর</th>
                  <th className="p-3">তারিখ ও সময়</th>
                  <th className="p-3">স্টুডেন্ট তথ্য</th>
                  <th className="p-3">মেথড & TrxID</th>
                  <th className="p-3">পেমেন্ট (BDT)</th>
                  <th className="p-3 text-right">অ্যাকশন (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      এখনো কোনো মানি রিসিট ইস্যু করা হয়নি। উপরের ফর্মটি ব্যবহার করে নতুন রিসিট সেভ করুন।
                    </td>
                  </tr>
                ) : (
                  receipts.map(r => (
                    <tr key={r.receiptId} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-amber-400">
                        {r.receiptId}
                      </td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">
                        {new Date(r.paymentTime || r.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-white">{r.studentName}</p>
                        <p className="text-[10px] text-amber-400 font-mono">{r.studentId}</p>
                        <p className="text-[10px] text-slate-400">{r.studentPhone} • {r.studentEmail}</p>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold border border-slate-700 text-[10px]">
                          {r.paymentMethod}
                        </span>
                        <p className="text-[11px] font-mono text-emerald-400 font-bold mt-1">
                          Trx: {r.trxId || 'N/A'}
                        </p>
                      </td>
                      <td className="p-3 font-mono font-black text-emerald-400 text-sm">
                        ৳ {Number(r.amount || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleResendReceiptEmail(r.receiptId)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all"
                          title="Re-send Email to Student"
                        >
                          ✉️ Resend
                        </button>
                        <button
                          type="button"
                          onClick={() => setReceiptPreviewModal({ isOpen: true, receipt: r })}
                          className="px-2.5 py-1 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-500/30 text-[11px] font-bold transition-all"
                          title="Print / View Money Receipt Slip"
                        >
                          📥 Slip
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditReceipt(r)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] font-bold transition-all"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReceipt(r.receiptId)}
                          className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-all"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Printable Money Receipt Slip Modal */}
      {receiptPreviewModal.isOpen && receiptPreviewModal.receipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-card rounded-2xl p-6 border border-emerald-500/40 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-5 bg-[#0b1325] text-slate-100 font-sans">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧾</span>
                <h3 className="font-extrabold text-white text-base">অফিশিয়াল মানি রিসিট (Paid Slip)</h3>
              </div>
              <button
                type="button"
                onClick={() => setReceiptPreviewModal({ isOpen: false, receipt: null })}
                className="text-slate-400 hover:text-white p-1 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Slip Printable Body */}
            <div id="printable-receipt-slip" className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 relative">
              <div className="text-center border-b border-slate-800 pb-3">
                <h2 className="text-lg font-black text-amber-400">⚖️ BJS & Bar Aspirants Academy</h2>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Official Money Receipt & Payment Voucher</p>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-400 font-mono">Receipt Ref: <span className="font-bold text-amber-400">{receiptPreviewModal.receipt.receiptId}</span></p>
                  <p className="text-[11px] text-slate-500 font-mono">{new Date(receiptPreviewModal.receipt.paymentTime || receiptPreviewModal.receipt.createdAt).toLocaleString()}</p>
                </div>
                <span className="px-3 py-1 rounded-md border border-emerald-500 text-emerald-400 font-bold text-xs uppercase tracking-widest bg-emerald-500/10">
                  ✓ OFFICIAL PAID
                </span>
              </div>

              <div className="space-y-2 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Student Name:</span>
                  <span className="font-bold text-white">{receiptPreviewModal.receipt.studentName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Student ID:</span>
                  <span className="font-mono font-bold text-amber-400">{receiptPreviewModal.receipt.studentId}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Registered Email:</span>
                  <span className="text-slate-200">{receiptPreviewModal.receipt.studentEmail}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Phone Number:</span>
                  <span className="text-slate-200">{receiptPreviewModal.receipt.studentPhone}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Course / Batch:</span>
                  <span className="text-cyan-300 font-bold">{receiptPreviewModal.receipt.batch || 'BJS & Bar Masterclass'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Payment Method:</span>
                  <span className="text-amber-400 font-bold">{receiptPreviewModal.receipt.paymentMethod}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">TrxID:</span>
                  <span className="font-mono text-emerald-400 font-bold">{receiptPreviewModal.receipt.trxId || 'N/A'}</span>
                </div>
                {receiptPreviewModal.receipt.note && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Description:</span>
                    <span className="text-slate-300">{receiptPreviewModal.receipt.note}</span>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/40 text-center space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">TOTAL AMOUNT RECEIVED</span>
                <p className="text-2xl font-black text-emerald-400 font-mono">
                  ৳ {Number(receiptPreviewModal.receipt.amount || 0).toLocaleString()} BDT
                </p>
              </div>

              <div className="pt-2 text-center text-[10px] text-slate-500 font-mono border-t border-slate-800">
                Issued & Verified By: Academic Accounts Department | Farmgate, Dhaka 1215
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setReceiptPreviewModal({ isOpen: false, receipt: null })}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                বন্ধ করুন (Close)
              </button>

              <button
                type="button"
                onClick={() => {
                  const content = document.getElementById('printable-receipt-slip')?.innerHTML;
                  const win = window.open('', '_blank');
                  win.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Money Receipt Slip - ${receiptPreviewModal.receipt.receiptId}</title>
                      <style>
                        body { font-family: Arial, sans-serif; padding: 25px; color: #020617; }
                        .p-5 { border: 2px solid #10b981; padding: 20px; border-radius: 12px; max-width: 480px; margin: auto; }
                        h2 { color: #d97706; margin-bottom: 2px; }
                        table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
                        td { padding: 6px 0; border-bottom: 1px solid #e2e8f0; }
                      </style>
                    </head>
                    <body>
                      ${content}
                      <script>window.print();</script>
                    </body>
                    </html>
                  `);
                  win.document.close();
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5"
              >
                <span>🖨️</span> স্লিপ প্রিন্ট করুন (Print Slip)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Portal Live Preview Modal */}
      {previewStudentModal.isOpen && previewStudentModal.student && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-card rounded-2xl p-6 border border-cyan-500/30 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6 bg-[#0b1325] text-slate-100 font-sans">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold flex items-center justify-center text-xl shadow-lg">
                  🎓
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-white">{previewStudentModal.student.name}</h2>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-xs border border-amber-500/30">
                      {previewStudentModal.student.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {previewStudentModal.student.phone} • {previewStudentModal.student.email} • {previewStudentModal.student.batch}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewStudentModal({ isOpen: false, student: null })}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Account & Authorization Status Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">AUTHORIZATION</span>
                <p className="font-bold text-emerald-400">{previewStudentModal.student.loginApproval || 'Approved'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">ACCOUNT STATUS</span>
                <p className="font-bold text-cyan-400">{previewStudentModal.student.status || 'Active'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">ACCESS MODE</span>
                <p className="font-bold text-purple-300">{previewStudentModal.student.portalAccessMode || 'Full Video Access'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">DEVICE LIMIT</span>
                <p className="font-mono font-bold text-amber-400">0/{previewStudentModal.student.maxDeviceCount || 2} Active</p>
              </div>
            </div>

            {/* Section 1: Enrolled Courses */}
            <div className="space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>📚</span> এনরোলকৃত কোর্সসমূহ (Enrolled Courses)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {courses
                  .filter(c => {
                    const allowed = previewStudentModal.student.allowedCourseIds || previewStudentModal.student.enrolledCourseIds || [];
                    return allowed.length === 0 || allowed.includes(c.id);
                  })
                  .map(c => (
                    <div key={c.id} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 text-xs">
                      <p className="font-extrabold text-amber-300">{c.title}</p>
                      <p className="text-slate-400 text-[11px]">ফ্যাকাল্টি: {c.faculty}</p>
                      <p className="text-slate-400 text-[11px]">সিডিউল: <span className="font-mono text-slate-200">{c.schedule}</span></p>
                      <div className="pt-1 flex items-center justify-between text-[10px]">
                        <span className="text-emerald-400 font-bold">✓ Access Granted</span>
                        <span className="text-slate-500 font-mono">৳{c.price} BDT</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Section 2: Available Video Lectures */}
            <div className="space-y-3 border-t border-slate-800 pt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>🎥</span> ভিডিও লেকচার ও লাইভ ক্লাস প্লে ব্যাক ({previewLessons.length})
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">Student Portal Preview</span>
              </div>

              {previewLoading ? (
                <div className="text-center py-6 text-cyan-400 font-mono animate-pulse text-xs">
                  স্টুডেন্ট পোর্টালের ভিডিও ডেটা লোড হচ্ছে...
                </div>
              ) : previewLessons.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs bg-slate-900/50 rounded-xl">
                  এই স্টুডেন্টের জন্য কোনো ভিডিও লেকচার পাওয়া যায়নি।
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {previewLessons.map(l => (
                    <div key={l.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs hover:border-cyan-500/40 transition-all">
                      <div className="space-y-0.5">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[10px] font-bold">
                          {l.courseId}
                        </span>
                        <p className="font-bold text-white">{l.title}</p>
                        <p className="text-[10px] text-slate-400">{l.duration} • {l.releaseDate}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openVideoModal && openVideoModal(l)}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-[11px] shadow-md transition-all flex items-center gap-1 shrink-0"
                      >
                        <span>▶️</span> টেস্ট ভিডিও প্লে
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPreviewStudentModal({ isOpen: false, student: null })}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
              >
                বন্ধ করুন (Close Portal Preview)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
