import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import QuestionFormattedView from '../components/QuestionFormattedView';
import { formatBangladeshTime, toBangladeshDigits } from '../utils/dateUtils';
import { sortLessons } from '../utils/lessonUtils';
import { getNotificationPermission, requestAndSubscribePush } from '../utils/pushNotification';

export default function Dashboard({ openVideoModal, openProfileModal }) {
  const { user, updateUserProfile } = useAuth();
  const { showToast, showSuccess, showError, showWarning, showInfo } = useToast();
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tab state: 'lectures' | 'assignments' | 'exams' | 'payments'
  const [selectedTab, setSelectedTab] = useState('lectures');
  const [showCoursesSection, setShowCoursesSection] = useState(true);
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [studentReceipts, setStudentReceipts] = useState([]);
  const [submittingAsnId, setSubmittingAsnId] = useState(null);
  const [subText, setSubText] = useState('');
  const [subDocUrl, setSubDocUrl] = useState('');
  const [subImages, setSubImages] = useState([]); // Array of base64 image strings or URLs
  const [subLoading, setSubLoading] = useState(false);
  // Student MCQ Exams & Performance States
  const [studentExams, setStudentExams] = useState([]);
  const [studentResults, setStudentResults] = useState([]);
  const [studentCertificates, setStudentCertificates] = useState([]);
  const [leaderboardModal, setLeaderboardModal] = useState({
    isOpen: false,
    examId: null,
    examTitle: '',
    leaderboard: [],
    totalParticipants: 0,
    loading: false
  });
  const [pushStatus, setPushStatus] = useState(() => getNotificationPermission());
  const [pushLoading, setPushLoading] = useState(false);
  const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passLoading, setPassLoading] = useState(false);
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    result: null,
    review: [],
    loading: false
  });
  const [viewReceiptModal, setViewReceiptModal] = useState({ isOpen: false, receipt: null });

  // Close review & leaderboard modals on tab change
  useEffect(() => {
    setReviewModal({ isOpen: false, result: null, review: [], loading: false });
    setLeaderboardModal({ isOpen: false, examId: null, examTitle: '', leaderboard: [], totalParticipants: 0, loading: false });
    setViewReceiptModal({ isOpen: false, receipt: null });
  }, [selectedTab]);

  // Request sequence, active course reference, and in-memory tab/course cache to prevent race conditions
  const currentReqSeqRef = useRef(0);
  const selectedCourseIdRef = useRef(null);
  const courseLessonsCacheRef = useRef({});

  useEffect(() => {
    // Immediate state reset on user change or logout to guarantee zero data leakage
    setCourses([]);
    setLessons([]);
    setSelectedCourse(null);
    setStudentAssignments([]);
    setMySubmissions([]);
    setStudentExams([]);
    setStudentResults([]);
    courseLessonsCacheRef.current = {};

    if (!user?.id) {
      selectedCourseIdRef.current = null;
      setLoading(false);
      return;
    }

    // Restore previously selected course from localStorage if available
    const savedCourseId = localStorage.getItem('bjs_selected_course_' + user.id);
    if (savedCourseId) {
      selectedCourseIdRef.current = savedCourseId;
    } else {
      selectedCourseIdRef.current = null;
    }

    fetchData(true, savedCourseId || null);

    // Dynamic refetch when tab is refocused or becomes visible
    const onVisibilityChange = () => {
      if (!document.hidden && user?.id) {
        fetchData(false, selectedCourseIdRef.current);
      }
    };
    const onFocus = () => {
      if (user?.id) {
        fetchData(false, selectedCourseIdRef.current);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);

    // Fast background sync interval
    const interval = setInterval(() => {
      if (user?.id && !document.hidden) {
        fetchData(false, selectedCourseIdRef.current);
      }
    }, 10000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [user?.id]);

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

  const fetchExamsAndResults = async () => {
    try {
      const [resEx, resRes] = await Promise.all([
        api.get('/student/mcq-exams', { params: { studentId: user?.id, phone: user?.phone } }),
        api.get('/student/my-mcq-results', { params: { studentId: user?.id, phone: user?.phone, email: user?.email } })
      ]);
      if (resEx.data.ok) setStudentExams(resEx.data.exams || []);
      if (resRes.data.ok) setStudentResults(resRes.data.results || []);
    } catch (err) {
      console.log('MCQ Exams fetch notice:', err);
    }
  };

  const handleOpenReviewModal = async (resObj) => {
    setReviewModal({ isOpen: true, result: resObj, review: [], loading: true });
    try {
      const res = await api.get(`/student/mcq-result/${resObj.id || resObj.resultId || resObj._id}`);
      if (res.data.ok) {
        setReviewModal(prev => ({
          ...prev,
          review: res.data.review || [],
          loading: false
        }));
      }
    } catch (err) {
      console.log('Error loading result review:', err);
    } finally {
      setReviewModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDownloadReceiptPdf = async (receiptId) => {
    try {
      showToast('⏳ রসিদ PDF তৈরি ও ডাউনলোড হচ্ছে...', 'success');
      const response = await api.get(`/student/receipts/${receiptId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt-${receiptId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast(`✓ Receipt-${receiptId}.pdf ডাউনলোড সম্পন্ন!`, 'success');
    } catch (err) {
      showToast('রসিদ PDF ডাউনলোড করতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleOpenLeaderboard = async (examId, examTitle) => {
    setLeaderboardModal({ isOpen: true, examId, examTitle, leaderboard: [], totalParticipants: 0, loading: true });
    try {
      const res = await api.get(`/mcq-exams/${examId}/leaderboard`);
      if (res.data?.ok) {
        setLeaderboardModal({
          isOpen: true,
          examId,
          examTitle: res.data.exam?.title || examTitle,
          leaderboard: res.data.leaderboard || [],
          totalParticipants: res.data.totalParticipants || 0,
          loading: false
        });
      }
    } catch (err) {
      showToast('লিডারবোর্ড লোড করতে সমস্যা হয়েছে।', 'error');
      setLeaderboardModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDownloadCertificatePdf = async (certId) => {
    try {
      showToast('⏳ সার্টিফিকেট PDF তৈরি ও ডাউনলোড হচ্ছে...', 'success');
      const response = await api.get(`/certificates/${certId}/download`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Certificate-${certId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast(`✓ Certificate-${certId}.pdf ডাউনলোড সম্পন্ন!`, 'success');
    } catch (err) {
      showToast('সার্টিফিকেট PDF ডাউনলোড করতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleTogglePushNotification = async () => {
    setPushLoading(true);
    try {
      const res = await requestAndSubscribePush(user?.id, user?.enrolledCourses || []);
      if (res.ok) {
        showSuccess(res.message);
        setPushStatus('granted');
      } else {
        showError(res.message);
      }
    } catch (e) {
      showError('পুশ নোটিফিকেশন চালু করতে সমস্যা হয়েছে।');
    } finally {
      setPushLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passForm.newPassword || passForm.newPassword.length < 6) {
      showError('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      showError('নতুন পাসওয়ার্ড দুটি মিলছে না!');
      return;
    }
    setPassLoading(true);
    try {
      const res = await api.post('/student/change-password', {
        oldPassword: passForm.oldPassword,
        newPassword: passForm.newPassword
      });
      if (res.data?.ok) {
        showSuccess('✓ পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!');
        setPassForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showError(res.data?.message || 'পাসওয়ার্ড পরিবর্তনে সমস্যা হয়েছে।');
      }
    } catch (err) {
      showError(err.response?.data?.message || 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।');
    } finally {
      setPassLoading(false);
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

  const fetchData = async (isInitial = true, courseIdOverride = null) => {
    const seq = ++currentReqSeqRef.current;
    if (isInitial) setLoading(true);
    try {
      const targetCourseId = courseIdOverride || selectedCourseIdRef.current || (user?.id ? localStorage.getItem('bjs_selected_course_' + user.id) : null);
      // High-Speed Backend-Processed & Fast-Cached Student Dashboard API
      const res = await api.get('/student/dashboard-data', {
        params: {
          studentId: user?.id || user?.regId,
          courseId: targetCourseId || undefined
        }
      });

      // Discard response if another newer request has already been dispatched
      if (seq !== currentReqSeqRef.current) return;

      if (res.data?.ok) {
        if (Array.isArray(res.data.courses)) setCourses(res.data.courses);

        const serverCourse = res.data.selectedCourse;
        const currentTarget = selectedCourseIdRef.current;

        if (serverCourse) {
          const isTargetMatch = currentTarget && (
            String(serverCourse.id).toLowerCase().trim() === String(currentTarget).toLowerCase().trim() ||
            String(serverCourse._id) === String(currentTarget) ||
            String(serverCourse.id).toLowerCase().trim().replace(/s$/, '') === String(currentTarget).toLowerCase().trim().replace(/s$/, '')
          );

          if (!currentTarget || isTargetMatch) {
            setSelectedCourse(serverCourse);
            selectedCourseIdRef.current = serverCourse.id;
            if (user?.id) localStorage.setItem('bjs_selected_course_' + user.id, serverCourse.id);
          } else {
            // Check if currentTarget is still enrolled in res.data.courses
            const targetCourseObj = (res.data.courses || []).find(c =>
              c.isEnrolled && (
                String(c.id).toLowerCase().trim() === String(currentTarget).toLowerCase().trim() ||
                String(c.id).toLowerCase().trim().replace(/s$/, '') === String(currentTarget).toLowerCase().trim().replace(/s$/, '')
              )
            );

            if (targetCourseObj) {
              // User has deliberately selected currentTarget and still has access to it.
              // Keep currentTarget selected; do not let an out-of-order default course override it!
              setSelectedCourse(targetCourseObj);
              selectedCourseIdRef.current = targetCourseObj.id;
            } else {
              // Access to currentTarget was revoked by admin: gracefully fall back to server's selectedCourse
              setSelectedCourse(serverCourse);
              selectedCourseIdRef.current = serverCourse.id;
              if (user?.id) localStorage.setItem('bjs_selected_course_' + user.id, serverCourse.id);
            }
          }
        } else if (res.data.courses && res.data.courses.every(c => !c.isEnrolled)) {
          setSelectedCourse(null);
          selectedCourseIdRef.current = null;
          if (user?.id) localStorage.removeItem('bjs_selected_course_' + user.id);
        }

        // Only update lessons if the lessons in this response belong to the active course
        if (Array.isArray(res.data.lessons)) {
          const activeCourseId = selectedCourseIdRef.current;
          const returnedCourseId = res.data.selectedCourse?.id;
          const isCourseMatch = !activeCourseId || !returnedCourseId ||
            String(returnedCourseId).toLowerCase().trim() === String(activeCourseId).toLowerCase().trim() ||
            String(returnedCourseId).toLowerCase().trim().replace(/s$/, '') === String(activeCourseId).toLowerCase().trim().replace(/s$/, '');

          if (isCourseMatch) {
            setLessons(res.data.lessons);
          }
          if (returnedCourseId) {
            courseLessonsCacheRef.current[returnedCourseId] = res.data.lessons;
          }
        }

        if (Array.isArray(res.data.assignments)) setStudentAssignments(res.data.assignments);
        if (Array.isArray(res.data.submissions)) setMySubmissions(res.data.submissions);
        if (Array.isArray(res.data.exams)) setStudentExams(res.data.exams);
        if (Array.isArray(res.data.results)) setStudentResults(res.data.results);
        if (Array.isArray(res.data.receipts)) setStudentReceipts(res.data.receipts);
        if (Array.isArray(res.data.certificates)) setStudentCertificates(res.data.certificates);
        return;
      }
    } catch (err) {
      if (seq !== currentReqSeqRef.current) return;
      console.log('Dashboard backend-processed data notice, falling back:', err.message);
      try {
        const courseRes = await api.get('/courses');
        if (courseRes.data.ok) {
          const activeCourses = (courseRes.data.courses || []).filter(c =>
            !c.status || c.status === 'Active' || String(c.status).toLowerCase().includes('active')
          );
          setCourses(activeCourses);
          if (activeCourses.length > 0 && !selectedCourse) {
            setSelectedCourse(activeCourses[0]);
            fetchLessons(activeCourses[0].id);
          }
        }
      } catch (e) {}
    } finally {
      if (seq === currentReqSeqRef.current && isInitial) setLoading(false);
    }
  };

  const fetchLessons = async (courseId) => {
    try {
      const res = await api.get(`/lessons?courseId=${courseId || ''}`);
      if (res.data?.ok) {
        const fetched = Array.isArray(res.data.lessons) ? res.data.lessons : [];
        setLessons(fetched);
        if (courseId) courseLessonsCacheRef.current[courseId] = fetched;
      }
    } catch (err) {
      console.log('Lessons error:', err);
    }
  };

  const handleSelectCourse = (course) => {
    if (!course) return;
    selectedCourseIdRef.current = course.id;
    if (user?.id) {
      localStorage.setItem('bjs_selected_course_' + user.id, course.id);
    }
    setSelectedCourse(course);

    // Instant cache-hit: immediately populate screen with cached lessons if already viewed
    if (course.id && courseLessonsCacheRef.current[course.id]) {
      setLessons(courseLessonsCacheRef.current[course.id]);
    } else {
      setLessons([]); // Clear previous course's lessons immediately so they don't linger
    }
    fetchData(false, course.id);
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

  // Sort lessons in canonical natural ascending order (#1, #2 ... #24)
  const sortedLessons = sortLessons(lessons);

  const firstLessonId = sortedLessons[0]?.id;

  // Group lessons by Chapter (অধ্যায়) if available, otherwise by Module
  const groupedLessons = sortedLessons.reduce((acc, l) => {
    const groupKey = l?.chapter && l.chapter.trim() !== '' ? l.chapter : (l?.module || 'সাধারণ বিষয়সূচি (General Module)');
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(l);
    return acc;
  }, {});

  // Evaluate Student Approval & Course Access Rules (Strict Course-Level Enrollment Check)
  const isApproved = Boolean(
    user?.loginApproval === 'Approved' &&
    user?.status !== 'Pending' &&
    user?.status !== 'Blocked' &&
    user?.status !== 'Inactive'
  );

  const isUnlimited = Boolean(
    isApproved && (
      user?.unlimitedAccess === true ||
      (user?.allowedCourseIds && user?.allowedCourseIds.includes('all'))
    )
  );

  const checkCourseEnrolled = (c) => {
    if (!c || !isApproved) return false;
    // 1. Direct Backend-Processed Access from MongoDB
    if (c.isEnrolled !== undefined) return Boolean(c.isEnrolled);
    if (isUnlimited) return true;

    const rawAllowed = (Array.isArray(user?.allowedCourseIds) && user.allowedCourseIds.length > 0)
      ? user.allowedCourseIds
      : (Array.isArray(user?.enrolledCourseIds) ? user.enrolledCourseIds : []);

    const allowed = rawAllowed.filter(id => id && !String(id).includes('---') && String(id).trim() !== '');

    const cId = String(c?.id || '').toLowerCase().trim();
    const cMongoId = String(c?._id || '').toLowerCase().trim();
    const cOldId = String(c?.oldId || '').toLowerCase().trim();
    const cNorm = cId.replace(/[-_]/g, ' ');

    return allowed.some(id => {
      const sId = String(id).toLowerCase().trim();
      return sId === cId || sId === cMongoId || (cOldId && sId === cOldId) || sId.replace(/[-_]/g, ' ') === cNorm;
    });
  };

  const isCourseAllowed = checkCourseEnrolled(selectedCourse);
  const isEnrolled = isApproved && isCourseAllowed;
  const completedCount = user?.completedLessonIds?.length || 0;
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 animate-fadeIn">
      {/* Pending Admin Approval Warning Banner */}
      {!isApproved && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/40 text-amber-950 dark:text-amber-200 text-xs sm:text-sm space-y-2 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-extrabold text-sm">
            <span className="text-xl">⏳</span>
            <span>আপনার অ্যাকাউন্টটি বর্তমানে এডমিন এপ্রুভালের জন্য অপেক্ষমাণ রয়েছে (Awaiting Admin Approval)</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            আপনার রেজিস্ট্রেশন সফলভাবে গৃহীত হয়েছে। এডমিন আপনার আবেদন যাঁচাই করে এপ্রুভ ও কোর্স অ্যাক্সেস প্রদান করার পর ভিডিও ক্লাসগুলো দেখতে পারবেন। হেল্পলাইন: <strong>01800077663</strong>
          </p>
        </div>
      )}

      {/* Admin Popup Message Alert */}
      {user?.popupMessage?.body && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-950 dark:text-amber-200 text-xs shadow-sm space-y-1">
          <div className="flex justify-between items-center font-bold text-amber-900 dark:text-amber-300">
            <span>📢 {user.popupMessage.title || 'Notice from Academy Admin'}</span>
            <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
              {new Date(user.popupMessage.sentAt).toLocaleDateString()}
            </span>
          </div>
          <p className="leading-relaxed text-slate-800 dark:text-slate-100">{user.popupMessage.body}</p>
        </div>
      )}

      {/* Top Welcome Banner - High Contrast in Light/Dark & Zero Awkward Wrapping */}
      <section className="rounded-2xl p-5 sm:p-8 border border-slate-200 dark:border-amber-500/20 bg-white dark:bg-slate-900/80 shadow-md dark:shadow-2xl relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            {/* Top Student Profile Badges - Clean Alignment on Mobile */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="px-2.5 sm:px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono text-xs font-extrabold border border-emerald-300 dark:border-emerald-500/30 whitespace-nowrap shadow-xs">
                ● STATUS: {user?.status || 'Active'}
              </span>
              <span className="px-2.5 sm:px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-mono text-xs font-extrabold border border-amber-300 dark:border-amber-500/30 whitespace-nowrap shadow-xs">
                ID: {user?.id || 'STU-2026-001'}
              </span>
              {openProfileModal && (
                <button
                  type="button"
                  onClick={openProfileModal}
                  className="px-2.5 sm:px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800 text-slate-800 dark:text-amber-300 hover:text-slate-950 dark:hover:text-amber-200 font-bold text-xs border border-slate-300 dark:border-amber-500/30 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                  title="প্রোফাইল দেখুন ও ইমেইল পরিবর্তন করুন"
                >
                  <span>👤</span>
                  <span>আমার প্রোফাইল ও সেটিংস</span>
                </button>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              স্বাগতম, <span className="text-gradient-gold">{user?.name || 'শিক্ষার্থী'}</span>!
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">আপনার এনরোলকৃত কোর্সসমূহ:</span>
              {courses
                .filter(c => checkCourseEnrolled(c))
                .map(c => (
                  <span key={c.id} className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs font-bold shadow-xs whitespace-nowrap">
                    📚 {c.shortTitle || c.title}
                  </span>
                ))}
              {courses.filter(c => checkCourseEnrolled(c)).length === 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs font-bold shadow-xs whitespace-nowrap">
                  📚 {isApproved ? (user?.batch || 'BJS & Bar Masterclass') : 'কোনো সক্রিয় কোর্স নেই (পেন্ডিং)'}
                </span>
              )}
            </div>
          </div>

          {/* Quick-Resume & Learning Progress Widget */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Quick-Resume Button */}
            {lessons.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const nextLessonToWatch = lessons.find(l => !user?.completedLessonIds?.includes(l.id) && (l.youtubeId || l.youtubeUrl)) || lessons[0];
                  if (nextLessonToWatch) {
                    openVideoModal(nextLessonToWatch);
                  } else {
                    showToast("কোনো সক্রিয় ভিডিও ক্লাস পাওয়া যায়নি।", "info");
                  }
                }}
                className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                title="সর্বশেষ অসম্পূর্ণ ক্লাস থেকে ভিডিও লেকচার শুরু করুন"
              >
                <span>▶</span>
                <span>সর্বশেষ ক্লাস থেকে পড়া চালিয়ে যান</span>
              </button>
            )}

            {/* Learning Progress Widget */}
            <div className="bg-slate-100 dark:bg-slate-950/90 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 min-w-[220px] transition-colors">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600 dark:text-slate-400">কোর্স অগ্রগতি (Progress)</span>
                <span className="text-amber-600 dark:text-amber-400 font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 text-right font-mono">
                {completedCount} / {lessons.length} লেকচার সম্পন্ন
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Segmented Tab Navigation: 5 Smooth Horizontal Pill Tabs */}
      <div className="flex flex-wrap bg-white dark:bg-slate-950/95 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 gap-1.5 shadow-md dark:shadow-xl transition-colors">
        <button
          onClick={() => setSelectedTab('lectures')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all text-center cursor-pointer ${
            selectedTab === 'lectures'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          📚 ক্লাস ও কোর্স
        </button>
        <button
          onClick={() => setSelectedTab('exams')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all relative text-center cursor-pointer ${
            selectedTab === 'exams'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <span>📝 মডেল টেস্ট ({studentExams.length})</span>
        </button>
        <button
          onClick={() => setSelectedTab('assignments')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all relative text-center cursor-pointer ${
            selectedTab === 'assignments'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <span>📂 অ্যাসাইনমেন্ট ({studentAssignments.length})</span>
        </button>
        <button
          onClick={() => setSelectedTab('payments')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all relative text-center cursor-pointer ${
            selectedTab === 'payments'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <span>🧾 মানি রিসিট ({studentReceipts.length})</span>
        </button>
        <button
          onClick={() => setSelectedTab('certificates')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all relative text-center cursor-pointer ${
            selectedTab === 'certificates'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <span>🎓 সার্টিফিকেট ({studentCertificates.length})</span>
        </button>
      </div>

      {/* LECTURES TAB */}
      {selectedTab === 'lectures' && (
        <>
          {/* Course Switcher Tabs */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📚 নিবন্ধিত ও লার্নিং কোর্সসমূহ</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowCoursesSection(!showCoursesSection)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>{showCoursesSection ? '👁️ হাইড করুন (Hide)' : '👁️ দেখান (Show Courses)'}</span>
              </button>
            </div>

            {showCoursesSection && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fadeIn">
                {courses.map((c) => {
                  const active = selectedCourse?.id === c.id;
                  const enrolled = checkCourseEnrolled(c);

                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCourse(c)}
                      className={`p-4 rounded-2xl text-left transition-all border cursor-pointer ${
                        active
                          ? 'bg-amber-500/10 border-amber-500 text-slate-900 dark:text-white shadow-md'
                          : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold font-mono text-amber-700 dark:text-amber-400">{c.shortTitle || c.title}</span>
                        {!isApproved ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-500/30">
                            ⏳ Pending Approval
                          </span>
                        ) : enrolled ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-500/30">
                            ✓ Enrolled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            🔒 Not Enrolled
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">{c.title}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">ফ্যাকাল্টি: {c.faculty}</p>
                      {enrolled && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                          <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 font-bold mb-1">
                            <span>কোর্স অগ্রগতি</span>
                            <span className="text-amber-600 dark:text-amber-400 font-mono">
                              {active ? `${progressPercent}%` : 'সক্রিয়'}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400"
                              style={{ width: active ? `${progressPercent}%` : '50%' }}
                            />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Selected Course Modules & Video Matrix */}
          {selectedCourse && (
            <section className="space-y-6">
              <div className="rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-4 shadow-sm transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono uppercase tracking-wider">
                        {selectedCourse.category}
                      </span>
                      {isUnlimited && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px]">
                          ★ Unlimited Access Active
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{selectedCourse.title}</h2>
                  </div>
                </div>

                {/* Video Color-Coding Matrix Legend */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-4 text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">ভিডিও স্ট্যাটাস গাইড:</span>
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-500/30 font-semibold">
                    🟢 Emerald Green: ভিডিও প্রস্তুত ও আনলকড
                  </span>
                  <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-500/30 font-semibold">
                    🔴 Rose Red: ভিডিও পেন্ডিং / কোর্স আনলকড নয়
                  </span>
                </div>

                {/* Lessons Accordion List */}
                <div className="space-y-6 pt-2">
                  {Object.keys(groupedLessons).length === 0 ? (
                    <p className="text-center py-8 text-slate-500 text-xs">
                      এই কোর্সে এখনো কোনো লেসন যোগ করা হয়নি।
                    </p>
                  ) : (
                    Object.entries(groupedLessons).map(([groupTitle, groupLessons]) => (
                      <div key={groupTitle} className="space-y-3">
                        <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-amber-300 border-l-4 border-amber-500 pl-3 py-2 flex items-center justify-between bg-slate-50 dark:bg-slate-950/80 px-3.5 rounded-r-xl border-y border-r border-slate-200 dark:border-slate-800 shadow-xs">
                          <span className="flex items-center gap-2">📖 {groupTitle}</span>
                          <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 font-bold bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-xs">
                            {groupLessons.length} টি ক্লাসের ভিডিও
                          </span>
                        </h3>

                        <div className="space-y-2">
                          {groupLessons.map((l) => {
                            const isOrientation = Boolean(
                              (l.title || '').toLowerCase().includes('orientation') ||
                              (l.title || '').includes('অরিয়েন্টেশন') ||
                              (l.module || '').toLowerCase().includes('orientation') ||
                              (l.module || '').includes('অরিয়েন্টেশন') ||
                              (l.chapter || '').toLowerCase().includes('orientation') ||
                              (l.chapter || '').includes('অরিয়েন্টেশন') ||
                              l.isFree
                            );
                            const isCompleted = user?.completedLessonIds?.includes(l.id);
                            const hasVideo = Boolean(l.youtubeId || l.youtubeUrl);
                            const isUnlocked = l.isUnlocked !== undefined ? Boolean(l.isUnlocked) : (isEnrolled || isOrientation);
                            const canWatch = isUnlocked && hasVideo;

                            let cardClass = 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200';
                            let badgeText = '🔴 Video Pending';
                            let badgeClass = 'bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-500/30';

                            if (!isApproved && !isOrientation) {
                              badgeText = '🔒 Awaiting Admin Approval';
                              badgeClass = 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-500/30 font-bold';
                            } else if (!isUnlocked) {
                              badgeText = '🔒 Course Locked';
                              badgeClass = 'bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-500/30 font-bold';
                            } else if (!hasVideo) {
                              badgeText = '🔴 Video Pending';
                              badgeClass = 'bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-500/30';
                            } else {
                              cardClass = 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 hover:border-emerald-400';
                              badgeText = isOrientation ? '🟢 Free Preview / Demo' : '🟢 Video Unlocked';
                              badgeClass = 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30';
                            }

                            if (isCompleted) {
                              cardClass = 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-400 text-emerald-950 dark:text-emerald-100';
                            }

                            return (
                              <div
                                key={l.id}
                                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${cardClass}`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                                      {badgeText}
                                    </span>
                                    <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">Released: {l.releaseDate}</span>
                                  </div>
                                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{l.title}</h4>
                                  <p className="text-xs text-slate-600 dark:text-slate-300">{l.description}</p>
                                </div>

                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <button
                                    onClick={() => toggleComplete(l.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                      isCompleted
                                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50'
                                    }`}
                                  >
                                    {isCompleted ? '✓ Completed' : 'Mark Done'}
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (canWatch) {
                                        openVideoModal(l);
                                      } else if (!isUnlocked) {
                                        showToast('🔒 এই ভিডিও ক্লাসটি লকড্। ক্লাসটি দেখতে কোর্সে সক্রিয় ভর্তি ও অনুমোদন প্রয়োজন।', 'error');
                                      } else if (!hasVideo) {
                                        showToast('🔴 ভিডিও এখনো আপলোড করা হয়নি (Video Pending)।', 'error');
                                      } else {
                                        showToast('🔒 এই ভিডিও ক্লাসটি বর্তমানে লক করা রয়েছে।', 'error');
                                      }
                                    }}
                                    className={`px-4 py-2 rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer ${
                                      canWatch
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 hover:scale-105'
                                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-200'
                                    }`}
                                  >
                                    {canWatch ? '▶️ প্লে ভিডিও' : '🔒 ক্লাস লকড্'}
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
          <div className="rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-4 shadow-sm transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">নির্ধারিত অ্যাসাইনমেন্ট ও হোমওয়ার্ক</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">মেন্টর কর্তৃক প্রকাশিত অ্যাসাইনমেন্ট জমা দিন ও রেজাল্ট দেখুন</p>
              </div>
            </div>

            {studentAssignments.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
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
                    <div key={asn.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
                        <div>
                          <span className="px-2.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-500/30">
                            {crs ? crs.title : asn.courseId}
                          </span>
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">{asn.title}</h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">মেন্টর: {asn.mentorName || 'Faculty'}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-400 text-xs font-mono font-bold shadow-xs">
                            🎯 মোট মার্কস: {asn.totalMarks}
                          </span>
                          {isSubmitted ? (
                            isGraded ? (
                              <span className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-xs font-bold">
                                ✓ মার্কস: {sub.marksObtained} / {asn.totalMarks}
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 text-xs font-bold">
                                ⏳ মূল্যায়নের অপেক্ষায়
                              </span>
                            )
                          ) : (
                            <span className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                              পেন্ডিং (জমা দিতে হবে)
                            </span>
                          )}
                        </div>
                      </div>

                      {asn.description && (
                        <QuestionFormattedView description={asn.description} title="অ্যাসাইনমেন্ট প্রশ্ন/নির্দেশনা:" />
                      )}

                      {/* SUBMISSION STATE & FORM */}
                      {isSubmitted && !canResubmit ? (
                        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 space-y-2 text-xs shadow-xs">
                          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                            <span>✓ আপনি অ্যাসাইনমেন্টটি জমা দিয়েছেন</span>
                            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                              {formatBangladeshTime(sub.createdAt)}
                            </span>
                          </div>

                          {sub.submissionText && (
                            <p className="text-slate-800 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                              {sub.submissionText}
                            </p>
                          )}

                          {sub.attachmentUrl && (
                            <a href={sub.attachmentUrl} target="_blank" rel="noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold block">
                              🔗 সংযুক্ত ফাইল / ডকুমেন্ট লিংক ↗
                            </a>
                          )}

                          {isGraded && (
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 rounded-xl space-y-1 mt-2">
                              <p className="text-emerald-800 dark:text-emerald-300 font-extrabold text-xs">
                                🏆 মেন্টর মূল্যায়ন রেজাল্ট: {sub.marksObtained} / {asn.totalMarks}
                              </p>
                              {sub.feedback && (
                                <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                                  💬 <strong>মেন্টর মন্তব্য:</strong> {sub.feedback}
                                </p>
                              )}
                            </div>
                          )}

                          <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                            ⚠️ আপনি ইতোমধ্যে জমা দিয়েছেন। পরিবর্তন করতে চাইলে মেন্টর বা অ্যাডমিনের সাথে যোগাযোগ করুন।
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 pt-1">
                          {canResubmit && (
                            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-300 text-xs font-semibold">
                              🔄 আপনাকে পুনরায় অ্যাসাইনমেন্ট জমা দেওয়ার অনুমতি দেওয়া হয়েছে!
                            </div>
                          )}

                           {submittingAsnId === asn.id ? (
                            <form onSubmit={(e) => handleSubmitAssignment(e, asn.id, asn.courseId)} className="space-y-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
                              {/* Multi-Page Handwritten Exam Paper Photo Upload */}
                              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="block text-amber-700 dark:text-amber-400 font-bold">
                                    📷 খাতার পৃষ্ঠার ছবি আপলোড (Handwritten Answer Sheet Photos)
                                  </label>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">একাধিক পেজ সিলেক্ট করুন ({subImages.length}টি যুক্ত)</span>
                                </div>

                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handleImageFilesSelect}
                                  className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                                />

                                {/* Preview Thumbnails of Uploaded Exam Pages */}
                                {subImages.length > 0 && (
                                  <div className="pt-2 flex flex-wrap gap-2">
                                    {subImages.map((imgUrl, idx) => (
                                      <div key={idx} className="relative group w-20 h-24 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
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
                                        <span className="absolute bottom-0 left-0 right-0 bg-slate-900/80 text-[8px] text-slate-200 text-center font-mono py-0.5">
                                          পৃষ্ঠা {idx+1}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div>
                                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">গুগল ড্রাইভ / পিডিএফ / এক্সটার্নাল ডকুমেন্ট লিঙ্ক (ঐচ্ছিক)</label>
                                <input
                                  type="url"
                                  value={subDocUrl}
                                  onChange={(e) => setSubDocUrl(e.target.value)}
                                  placeholder="https://drive.google.com/file/d/... বা PDF লিঙ্ক"
                                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                                />
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSubmittingAsnId(null)}
                                  className="py-2 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                                >
                                  বাতিল
                                </button>
                                <button
                                  type="submit"
                                  disabled={subLoading}
                                  className="py-2 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-extrabold hover:from-amber-400 shadow-md cursor-pointer"
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
                              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 text-xs font-extrabold shadow-md transition-all cursor-pointer"
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

      {/* EXAMS TAB */}
      {selectedTab === 'exams' && (
        <section className="space-y-6">
          {/* Active Available MCQ Exams */}
          <div className="rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-4 shadow-sm transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-2">
              <div>
                <span className="px-2.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-mono text-[10px] font-bold border border-amber-300 dark:border-amber-500/30 uppercase">
                  ONLINE MODEL TESTS
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  <span>🎯 উপলব্ধ অনলাইন এমসিকিউ পরীক্ষা ও মডেল টেস্ট</span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  নির্ধারিত সময়ের মধ্যে পরীক্ষায় অংশগ্রহণ করুন। সময় শেষ হলে উত্তর স্বয়ংক্রিয়ভাবে জমা হয়ে যাবে।
                </p>
              </div>
            </div>

            {studentExams.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                বর্তমানে আপনার জন্য কোনো সক্রিয় অনলাইন এমসিকিউ পরীক্ষা নেই।
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studentExams.map(ex => {
                  const now = new Date();
                  const isUpcoming = ex.startDate && new Date(ex.startDate) > now;
                  const isExpired = ex.endDate && new Date(ex.endDate) < now;
                  const isLive = !isUpcoming && !isExpired;

                  return (
                    <div
                      key={ex.id || ex._id}
                      className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 shadow-xs"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 font-mono text-[10px] font-bold border border-cyan-300 dark:border-cyan-500/30">
                            {ex.courseTitle || ex.courseId || '🌐 সার্বজনীন পরীক্ষা'}
                          </span>

                          {isUpcoming ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                              ⏳ আসন্ন
                            </span>
                          ) : isExpired ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30">
                              🔒 বন্ধ
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 animate-pulse">
                              🟢 লাইভ চলছে
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                          {ex.title}
                        </h3>

                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200 dark:border-slate-900 font-sans">
                          <div className="text-slate-700 dark:text-slate-300">
                            ⏱️ সময়: <strong className="text-amber-700 dark:text-amber-400 font-mono">{ex.durationMinutes} মিনিট</strong>
                          </div>
                          <div className="text-slate-700 dark:text-slate-300">
                            🎯 পূর্ণমান: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{ex.totalMarks} মার্কস</strong>
                          </div>
                          <div className="text-slate-700 dark:text-slate-300">
                            📉 ভুল উত্তর: <strong className="text-rose-700 dark:text-rose-400 font-mono">-{ex.negativeMarks}</strong>
                          </div>
                          <div className="text-slate-700 dark:text-slate-300">
                            🔄 সুযোগ (Limit): <strong className="text-cyan-700 dark:text-cyan-400 font-mono">
                              {ex.attemptLimit === 0 ? 'আনলিমিটেড' : `${ex.attemptLimit} বার (${ex.attemptsTaken} বার দেওয়া হয়েছে)`}
                            </strong>
                          </div>
                        </div>

                        {/* Schedule Info */}
                        {(ex.startDate || ex.endDate) && (
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-600 dark:text-slate-400 space-y-0.5 font-mono">
                            {ex.startDate && (
                              <div>📅 শুরু: {new Date(ex.startDate).toLocaleString()}</div>
                            )}
                            {ex.endDate && (
                              <div>🔒 শেষ: {new Date(ex.endDate).toLocaleString()}</div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-900">
                        {isUpcoming ? (
                          <button
                            disabled
                            className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 text-xs font-bold cursor-not-allowed"
                          >
                            ⏳ নির্ধারিত সময়ে শুরু হবে
                          </button>
                        ) : isExpired ? (
                          <button
                            disabled
                            className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 text-xs font-bold cursor-not-allowed"
                          >
                            🔒 পরীক্ষার সময় শেষ হয়েছে
                          </button>
                        ) : !ex.canAttempt ? (
                          <button
                            disabled
                            className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
                          >
                            <span>✓</span> আপনার সর্বোচ্চ সুযোগ শেষ ({ex.attemptsTaken}/{ex.attemptLimit})
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              window.location.hash = `#mcq-exam-${ex.id}`;
                            }}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                          >
                            <span>▶️</span> পরীক্ষা শুরু করুন (Start Exam)
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenLeaderboard(ex.id || ex._id, ex.title)}
                          className="w-full mt-2 py-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:border-amber-400"
                        >
                          <span>🏆</span>
                          <span>সেন্ট্রাল মেরিট লিস্ট ও লিডারবোর্ড</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past MCQ Results & Performance Table */}
          <div className="rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-4 shadow-sm transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-2">
              <div>
                <span className="px-2.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-300 dark:border-emerald-500/30 uppercase">
                  ACADEMIC PERFORMANCE
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  <span>🏆 আমার পূর্ববর্তী পরীক্ষার ফলাফল ও পারফরম্যান্স</span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  আপনার জমা দেওয়া সকল পরীক্ষার নম্বর, প্রাপ্ত গ্রেড ও বিস্তারিত সমাধান দেখুন।
                </p>
              </div>
            </div>

            {studentResults.length === 0 ? (
              <div className="p-10 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                আপনি এখনো কোনো অনলাইন এমসিকিউ পরীক্ষায় অংশগ্রহণ করেননি। উপরের পরীক্ষাগুলো থেকে শুরু করুন।
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">পরীক্ষার শিরোনাম (Exam Title)</th>
                      <th className="p-3 text-center">প্রাপ্ত নম্বর (Score)</th>
                      <th className="p-3 text-center">শতকরা হার (%)</th>
                      <th className="p-3 text-center">গ্রেড ও ফলাফল</th>
                      <th className="p-3 text-center">জমাদানের সময়</th>
                      <th className="p-3 text-right">বিস্তারিত রিভিউ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {studentResults.map((r, idx) => (
                      <tr key={r.id || r.resultId || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="p-3">
                          <div className="font-extrabold text-slate-900 dark:text-white text-xs">{r.examTitle || 'MCQ Model Test'}</div>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">ID: {r.id || r.resultId}</span>
                        </td>
                        <td className="p-3 text-center font-mono font-black text-amber-700 dark:text-amber-400 text-sm">
                          {r.score} <span className="text-xs text-slate-500 font-normal">/ {r.totalMarks}</span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                          {r.percentage}%
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            r.percentage >= 80 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-500/30' :
                            r.percentage >= 50 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30' :
                            'bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
                          }`}>
                            {r.grade || (r.percentage >= 50 ? 'Passed ✓' : 'Needs Practice')}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenReviewModal(r)}
                              className="px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950 dark:hover:bg-cyan-900 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 font-bold text-xs transition-all shadow-xs cursor-pointer"
                            >
                              🔍 উত্তর রিভিউ
                            </button>
                            <button
                              onClick={() => handleOpenLeaderboard(r.examId || r.id, r.examTitle)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 font-bold text-xs transition-all shadow-xs cursor-pointer"
                            >
                              🏆 মেরিট
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* PAYMENTS & MONEY RECEIPTS TAB */}
      {selectedTab === 'payments' && (
        <section className="space-y-6 animate-fadeIn">
          {/* Header Card */}
          <div className="rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-950/90 shadow-sm dark:shadow-xl transition-colors">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>💳</span> আমার পেমেন্ট ও মানি রিসিট হিস্ট্রি
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                আপনার পরিশোধিত কোর্স ফি, পেমেন্ট মেথড ও ভেরিফায়েড ডিজিটাল মানি রিসিট (বাংলাদেশ সময় / BST অনুযায়ী)।
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                ✓ সেন্ট্রাল ভেরিফায়েড অ্যাকাউন্ট
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-800 dark:text-emerald-400 text-lg font-bold">
                ৳
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">মোট পরিশোধিত ফি</p>
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  ৳{toBangladeshDigits((studentReceipts.reduce((acc, r) => acc + (Number(r.amount) || 0), 0)).toLocaleString('en-IN'))}
                </p>
              </div>
            </div>

            <div className="rounded-2xl p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/15 border border-cyan-300 dark:border-cyan-500/30 flex items-center justify-center text-cyan-800 dark:text-cyan-400 text-lg font-bold">
                📜
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ইস্যুকৃত মানি রিসিট</p>
                <p className="text-xl font-black text-cyan-700 dark:text-cyan-400 font-mono">
                  {toBangladeshDigits(studentReceipts.length)} টি
                </p>
              </div>
            </div>

            <div className="rounded-2xl p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-amber-800 dark:text-amber-400 text-lg font-bold">
                🇧🇩
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">সময় জোন (টাইমস্ট্যাম্প)</p>
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  বাংলাদেশ সময় (BST, UTC+6)
                </p>
              </div>
            </div>
          </div>

          {/* Receipts Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm dark:shadow-2xl bg-white dark:bg-slate-950/80 transition-colors">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <span>📑</span> মানি রিসিটের পূর্ণাঙ্গ তালিকা ({studentReceipts.length})
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Official PDF Slips</span>
            </div>

            {studentReceipts.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2 bg-slate-50 dark:bg-slate-950/60">
                <span className="text-3xl block">📜</span>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-400">এখনো কোনো মানি রিসিট ইস্যু করা হয়নি।</p>
                <p className="text-xs text-slate-500">আপনার ভর্তি বা কোর্স ফি জমা হওয়ার পর অ্যাডমিন প্যানেল থেকে এখানে ডিজিটাল রিসিট ইস্যু করা হবে।</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      <th className="p-3.5">রসিদ নম্বর</th>
                      <th className="p-3.5">কোর্স / ব্যাচ</th>
                      <th className="p-3.5">ফি (পরিমাণ)</th>
                      <th className="p-3.5">মেথড</th>
                      <th className="p-3.5">ট্রানজেকশন আইডি</th>
                      <th className="p-3.5">পরিশোধের সময় (BST)</th>
                      <th className="p-3.5">স্ট্যাটাস</th>
                      <th className="p-3.5 text-right">ডাউনলোড</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {studentReceipts.map((r, rIdx) => (
                      <tr key={r.receiptId || rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="p-3.5 font-mono font-black text-amber-700 dark:text-amber-400 text-xs">
                          {r.receiptId}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white max-w-[180px] truncate">
                          {r.batch || 'BJS & Bar Masterclass'}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          ৳{toBangladeshDigits(Number(r.amount || 0).toLocaleString('en-IN'))}
                        </td>
                        <td className="p-3.5 font-bold text-cyan-800 dark:text-cyan-300">
                          {r.paymentMethod || 'bKash'}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                          {r.trxId || 'N/A'}
                        </td>
                        <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap">
                          {formatBangladeshTime(r.paymentTime || r.createdAt)}
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                            ✓ পরিশোধিত
                          </span>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => setViewReceiptModal({ isOpen: true, receipt: r })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-amber-300 font-bold text-xs border border-slate-300 dark:border-slate-700 cursor-pointer transition-all active:scale-95"
                            title="ইন-অ্যাপ ভেরিফায়েড মানি রিসিট দেখুন"
                          >
                            <span>👁️</span>
                            <span>রসিদ দেখুন</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadReceiptPdf(r.receiptId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-900/30 cursor-pointer transition-all active:scale-95"
                            title="সরাসরি ক্লিন PDF মানি রিসিট ডাউনলোড করুন"
                          >
                            <span>📥</span>
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* MY CERTIFICATES TAB */}
      {selectedTab === 'certificates' && (
        <section className="space-y-6 animate-fadeIn">
          <div className="rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-4 shadow-sm transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-2">
              <div>
                <span className="px-2.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-mono text-[10px] font-bold border border-amber-300 dark:border-amber-500/30">
                  OFFICIAL DIGITAL CREDENTIALS
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  <span>📜 আমার ডিজিটাল সার্টিফিকেট ও ভেরিফিকেশন</span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  কোর্স সমাপ্তির পর একাডেমি কর্তৃক প্রদত্ত কিউআর-কোড ভেরিফাইড অফিশিয়াল সার্টিফিকেট।
                </p>
              </div>
            </div>

            {studentCertificates.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-4xl">🎓</div>
                <p className="text-slate-800 dark:text-slate-300 font-bold text-sm">কোনো সার্টিফিকেট এখনো ইস্যু করা হয়নি</p>
                <p className="text-slate-600 dark:text-slate-400 text-xs max-w-md mx-auto">
                  আপনার কোর্স সম্পন্ন হওয়ার পর একাডেমি কর্তৃপক্ষ আপনার নামে ডিজিটাল সার্টিফিকেট ইস্যু করবে। সার্টিফিকেট ইস্যু হলে তা এখানে প্রদর্শিত হবে এবং আপনি পিডিএফ ডাউনলোড করতে পারবেন।
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {studentCertificates.map(cert => (
                  <div key={cert.id || cert.certificateId || cert._id} className="p-6 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 border-2 border-amber-500/40 space-y-4 shadow-md dark:shadow-2xl relative overflow-hidden transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="px-2.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-300 dark:border-emerald-500/30">
                          ✓ VERIFIED CREDENTIAL
                        </span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1.5">{cert.courseTitle || 'BJS & Bar Masterclass'}</h3>
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-mono">আইডি: {cert.certificateId}</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-center text-2xl border border-amber-300 dark:border-amber-500/40">
                        ⚖️
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 font-sans">
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span className="text-slate-500 dark:text-slate-400">প্রাপকের নাম:</span>
                        <strong className="text-slate-900 dark:text-white font-bold">{cert.studentName}</strong>
                      </div>
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span className="text-slate-500 dark:text-slate-400">স্টুডেন্ট রোল:</span>
                        <span className="font-mono text-amber-700 dark:text-amber-300 font-bold">{cert.studentId}</span>
                      </div>
                      <div className="flex justify-between text-slate-700 dark:text-slate-300">
                        <span className="text-slate-500 dark:text-slate-400">ইস্যুর তারিখ:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{formatBangladeshTime(cert.issueDate)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadCertificatePdf(cert.id || cert.certificateId || cert._id)}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span>📥</span>
                        <span>ডাউনলোড PDF</span>
                      </button>
                      <a
                        href={`/verify/${cert.id || cert.certificateId || cert._id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-cyan-300 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-300 font-bold text-xs text-center transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>🔍</span>
                        <span>অনলাইনে ভেরিফাই</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* STUDENT PROFILE & SECURITY TAB */}
      {selectedTab === 'profile' && (
        <section className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student Identity Card */}
            <div className="rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-4 shadow-sm transition-colors">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="px-2.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 font-mono text-[10px] font-bold border border-amber-300 dark:border-amber-500/30">
                  DIGITAL IDENTITY CARD
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  <span>👤 শিক্ষার্থী পরিচয় ও একাডেমি প্রোফাইল</span>
                </h2>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-900 pb-2">
                  <span className="text-slate-500 dark:text-slate-400">নাম:</span>
                  <span className="text-slate-900 dark:text-white font-bold">{user?.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-900 pb-2">
                  <span className="text-slate-500 dark:text-slate-400">রেজিস্ট্রেশন রোল / আইডি:</span>
                  <span className="text-amber-700 dark:text-amber-400 font-mono font-bold">{user?.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-900 pb-2">
                  <span className="text-slate-500 dark:text-slate-400">মোবাইল নম্বর:</span>
                  <span className="text-slate-700 dark:text-slate-200 font-mono">{user?.phone}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-900 pb-2">
                  <span className="text-slate-500 dark:text-slate-400">ইমেইল ঠিকানা:</span>
                  <span className="text-slate-700 dark:text-slate-200">{user?.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-900 pb-2">
                  <span className="text-slate-500 dark:text-slate-400">ব্যাচ:</span>
                  <span className="text-amber-800 dark:text-amber-300 font-bold">{user?.batch || 'BJS & Bar Regular'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">অ্যাকাউন্ট স্ট্যাটাস:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">● {user?.status || 'Active'}</span>
                </div>
              </div>

              {/* Browser Push Notifications Activation */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-slate-50 dark:from-blue-950/40 dark:to-slate-950 rounded-xl border border-blue-200 dark:border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <span>🔔</span>
                    <span>ব্রাউজার পুশ নোটিফিকেশন</span>
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    pushStatus === 'granted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {pushStatus === 'granted' ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  কোনো ইমেইল কোটা খরচ না করেই নতুন ভিডিও ক্লাস, লাইভ মডেল টেস্ট ও অ্যাকাডেমিক ঘোষণার তাৎক্ষণিক ব্রাউজার নোটিফিকেশন পান।
                </p>
                <button
                  type="button"
                  onClick={handleTogglePushNotification}
                  disabled={pushLoading || pushStatus === 'granted'}
                  className={`w-full py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    pushStatus === 'granted'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 cursor-default'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-md'
                  }`}
                >
                  {pushLoading ? 'প্রসেসিং হচ্ছে...' : pushStatus === 'granted' ? '✓ পুশ নোটিফিকেশন চালু আছে' : '🔔 নোটিফিকেশন চালু করুন'}
                </button>
              </div>
            </div>

            {/* Device Lock & Password Update */}
            <div className="space-y-6">
              {/* Device Security Status (Max 2 Devices Lock) */}
              <div className="rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3 shadow-sm transition-colors">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span className="px-2.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300 font-mono text-[10px] font-bold border border-rose-300 dark:border-rose-500/30">
                    DEVICE SECURITY GUARD
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                    <span>🛡️ ডিভাইস লক ও নিরাপত্তা (সর্বোচ্চ ২টি ডিভাইস)</span>
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    ভিডিও পাইরেসি ও অননুমোদিত অ্যাক্সেস রোধে আপনার অ্যাকাউন্টটি সর্বোচ্চ ২টি ডিভাইসে সীমাবদ্ধ।
                  </p>
                </div>

                <div className="space-y-2">
                  {(user?.devices && user.devices.length > 0) ? (
                    user.devices.map((dev, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">💻</span>
                          <div>
                            <p className="text-slate-900 dark:text-white font-bold">{dev.userAgent ? dev.userAgent.substring(0, 35) + '...' : `ডিভাইস #${idx + 1}`}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">লগইন: {formatBangladeshTime(dev.lastLogin || dev.createdAt)}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-300 dark:border-emerald-500/30">
                          অনুমোদিত
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                      বর্তমান ডিভাইসটি প্রধান অনুমোদিত ডিভাইস হিসেবে সংরক্ষিত রয়েছে।
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                  ⚠️ ডিভাইস রিসেট বা পরিবর্তন করতে চাইলে হেল্পলাইনে যোগাযোগ করুন।
                </p>
              </div>

              {/* Change Password Form */}
              <div className="rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3 shadow-sm transition-colors">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🔐 পাসওয়ার্ড পরিবর্তন করুন</span>
                </h3>
                <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">বর্তমান পাসওয়ার্ড:</label>
                    <input
                      type="password"
                      required
                      value={passForm.oldPassword}
                      onChange={e => setPassForm({ ...passForm, oldPassword: e.target.value })}
                      placeholder="আপনার বর্তমান পাসওয়ার্ড লিখুন"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর):</label>
                    <input
                      type="password"
                      required
                      value={passForm.newPassword}
                      onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })}
                      placeholder="নতুন গোপনীয় পাসওয়ার্ড"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">নতুন পাসওয়ার্ড নিশ্চিত করুন:</label>
                    <input
                      type="password"
                      required
                      value={passForm.confirmPassword}
                      onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                      placeholder="পাসওয়ার্ডটি পুনরায় লিখুন"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={passLoading}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    {passLoading ? 'সংরক্ষণ হচ্ছে...' : '✓ পাসওয়ার্ড সংরক্ষণ করুন'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* DETAILED MCQ RESULT REVIEW MODAL */}
      {reviewModal.isOpen && (
        <Modal
          isOpen={reviewModal.isOpen}
          onClose={() => setReviewModal({ isOpen: false, result: null, review: [], loading: false })}
          title="পরীক্ষার পূর্ণাঙ্গ উত্তরপত্র ও আইনি ব্যাখ্যা"
          subtitle={reviewModal.result?.examTitle}
          icon="📝"
          maxWidth="max-w-3xl"
          footer={
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={() => setReviewModal({ isOpen: false, result: null, review: [], loading: false })}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs cursor-pointer"
              >
                বন্ধ করুন (Close Review)
              </button>
            </div>
          }
        >
          {/* Scorecard Strip */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mb-4 text-center">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">প্রাপ্ত স্কোর (Score)</span>
              <span className="text-lg font-black text-amber-700 dark:text-amber-400 font-mono">
                {reviewModal.result?.score} <span className="text-xs text-slate-500">/ {reviewModal.result?.totalMarks}</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">শতকরা হার (Percentage)</span>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">
                {reviewModal.result?.percentage}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">ফলাফল গ্রেড</span>
              <span className="text-sm font-extrabold text-cyan-800 dark:text-cyan-300">
                {reviewModal.result?.grade || 'Passed'}
              </span>
            </div>
          </div>

          {/* Questions Review List */}
          <div className="space-y-4 pr-1">
              {reviewModal.loading ? (
                <div className="p-12 text-center text-amber-600 dark:text-amber-400 font-bold">
                  ⏳ উত্তরপত্রের বিস্তারিত রিভিউ লোড হচ্ছে...
                </div>
              ) : reviewModal.review.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  এই পরীক্ষার বিস্তারিত প্রশ্ন ব্যাখ্যা সংরক্ষিত নেই।
                </div>
              ) : (
                reviewModal.review.map((item, idx) => {
                  const optLabels = ['(ক)', '(খ)', '(গ)', '(ঘ)'];
                  return (
                    <div
                      key={item.questionId || idx}
                      className={`p-4 rounded-xl border space-y-2.5 ${
                        item.isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/40'
                          : item.selectedIndex === -1
                          ? 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                          : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-xs leading-relaxed">
                          {item.serial}. {item.questionText}
                        </span>
                        {item.isCorrect ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-500/30 shrink-0">
                            ✓ সঠিক (+১)
                          </span>
                        ) : item.selectedIndex === -1 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 font-bold shrink-0">
                            উত্তর দেওয়া হয়নি (০)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-500/30 shrink-0">
                            ✕ ভুল উত্তর (নেগেটিভ)
                          </span>
                        )}
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {(item.options || []).map((opt, oIdx) => {
                          const isCorrectOpt = oIdx === Number(item.correctIndex);
                          const isUserSelected = oIdx === Number(item.selectedIndex);

                          let optClass = 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                          if (isCorrectOpt) {
                            optClass = 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-500/60 text-emerald-900 dark:text-emerald-200 font-bold';
                          } else if (isUserSelected) {
                            optClass = 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-500/60 text-rose-900 dark:text-rose-200 font-bold line-through';
                          }

                          return (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${optClass}`}
                            >
                              <span>
                                <strong className="mr-1.5 font-mono">{optLabels[oIdx] || `[${oIdx + 1}]`}</strong>
                                {opt}
                              </span>
                              {isCorrectOpt && <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">✓ সঠিক</span>}
                              {isUserSelected && !isCorrectOpt && <span className="text-rose-700 dark:text-rose-400 font-bold text-[10px]">✕ আপনার ভুল</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Legal Explanation Box */}
                      {item.explanation && (
                        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-[11px] text-amber-950 dark:text-amber-200 leading-relaxed space-y-1">
                          <span className="font-extrabold text-amber-800 dark:text-amber-400 block">💡 আইনি ব্যাখ্যা (Mentor Explanation):</span>
                          <p>{item.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
        </Modal>
      )}

      {/* CENTRAL LIVE MERIT LIST & LEADERBOARD MODAL */}
      {leaderboardModal.isOpen && (
        <Modal
          isOpen={leaderboardModal.isOpen}
          onClose={() => setLeaderboardModal({ isOpen: false, examId: null, examTitle: '', leaderboard: [], totalParticipants: 0, loading: false })}
          title={`🏆 সেন্ট্রাল মেধা তালিকা (Live Merit List): ${leaderboardModal.examTitle}`}
          icon="🏆"
          maxWidth="max-w-4xl"
          footer={
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={() => setLeaderboardModal({ isOpen: false, examId: null, examTitle: '', leaderboard: [], totalParticipants: 0, loading: false })}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs cursor-pointer"
              >
                বন্ধ করুন (Close Leaderboard)
              </button>
            </div>
          }
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto p-1 text-xs">
            {leaderboardModal.loading ? (
              <div className="p-12 text-center text-amber-600 dark:text-amber-400 font-bold space-y-2">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto" />
                <p>⏳ সেন্ট্রাল মেধা তালিকা ও লিডারবোর্ড লোড হচ্ছে...</p>
              </div>
            ) : leaderboardModal.leaderboard.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <div className="text-3xl">📊</div>
                <p>এই পরীক্ষায় এখনো কোনো শিক্ষার্থী ফলাফল জমা দেয়নি।</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                  <span className="text-slate-600 dark:text-slate-400">মোট অংশগ্রহণকারী শিক্ষার্থী:</span>
                  <span className="text-amber-700 dark:text-amber-400 font-mono font-bold">{leaderboardModal.totalParticipants} জন</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3 text-center">মেধা স্থান (Rank)</th>
                        <th className="p-3">শিক্ষার্থীর নাম</th>
                        <th className="p-3 text-center">সঠিক</th>
                        <th className="p-3 text-center">ভুল (কাটা)</th>
                        <th className="p-3 text-center">নেট স্কোর (Net Score)</th>
                        <th className="p-3 text-center">ব্যয়িত সময়</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-sans">
                      {leaderboardModal.leaderboard.map((row) => {
                        const medal = row.rank === 1 ? '🥇 1st' : row.rank === 2 ? '🥈 2nd' : row.rank === 3 ? '🥉 3rd' : `#${row.rank}`;
                        const rowClass = row.rank === 1 ? 'bg-amber-500/10' : row.rank === 2 ? 'bg-slate-100 dark:bg-slate-800/40' : row.rank === 3 ? 'bg-amber-100/50 dark:bg-amber-900/10' : '';

                        return (
                          <tr key={row.rank} className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors ${rowClass}`}>
                            <td className="p-3 text-center font-bold">
                              <span className={`px-2 py-0.5 rounded-full font-mono text-xs ${
                                row.rank === 1 ? 'bg-amber-500 text-slate-950 font-black' :
                                row.rank === 2 ? 'bg-slate-300 text-slate-950 font-black' :
                                row.rank === 3 ? 'bg-amber-600 text-white font-black' :
                                'text-slate-600 dark:text-slate-400'
                              }`}>
                                {medal}
                              </span>
                            </td>
                            <td className="p-3">
                              <p className="font-extrabold text-slate-900 dark:text-white text-xs">{row.studentName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{row.studentPhone || '***'}</p>
                            </td>
                            <td className="p-3 text-center font-mono text-emerald-700 dark:text-emerald-400 font-bold">+{row.correctCount}</td>
                            <td className="p-3 text-center font-mono text-rose-700 dark:text-rose-400 font-bold">-{row.negativeDeduction || 0} ({row.wrongCount})</td>
                            <td className="p-3 text-center font-mono text-amber-700 dark:text-amber-300 font-black text-sm">{row.netScore}</td>
                            <td className="p-3 text-center font-mono text-slate-500 dark:text-slate-400">
                              {Math.floor((row.timeTakenSeconds || 0) / 60)}মি. {(row.timeTakenSeconds || 0) % 60}সে.
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
      {/* IN-APP OFFICIAL PAYMENT RECEIPT MODAL */}
      {viewReceiptModal.isOpen && viewReceiptModal.receipt && (
        <Modal
          isOpen={viewReceiptModal.isOpen}
          onClose={() => setViewReceiptModal({ isOpen: false, receipt: null })}
          title="অফিশিয়াল ডিজিটাল মানি রিসিট"
          subtitle={`রসিদ নম্বর: ${viewReceiptModal.receipt.receiptId}`}
          icon="💳"
          maxWidth="max-w-lg"
          footer={
            <div className="w-full flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>🖨️</span> প্রিন্ট রিসিট
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadReceiptPdf(viewReceiptModal.receipt.receiptId)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-900/30"
                >
                  <span>📥</span> ডাউনলোড (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setViewReceiptModal({ isOpen: false, receipt: null })}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-900 text-slate-800 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white text-xs font-bold cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          }
        >
          <div className="bg-white text-slate-900 p-6 rounded-2xl shadow-inner border border-slate-200 space-y-5 font-sans">
            {/* Header */}
            <div className="text-center border-b border-slate-200 pb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 text-slate-950 font-black text-2xl mb-2">
                ⚖️
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">BJS & Bar Aspirants Academy</h3>
              <p className="text-[11px] text-slate-500">অনলাইন জুডিশিয়াল সার্ভিস ও বার কাউন্সিল প্রস্তুতি একাডেমি</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                <span>✓</span> কেন্দ্রীয়ভাবে যাচাইকৃত পরিশোধ (Verified)
              </div>
            </div>

            {/* Receipt Summary Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase">শিক্ষার্থীর নাম</p>
                <p className="font-extrabold text-slate-900 mt-0.5">{viewReceiptModal.receipt.studentName || user?.name}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase">রোল / স্টুডেন্ট আইডি</p>
                <p className="font-mono font-bold text-amber-700 mt-0.5">{viewReceiptModal.receipt.studentId || user?.id}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase">কোর্স / ব্যাচ</p>
                <p className="font-bold text-slate-900 mt-0.5">{viewReceiptModal.receipt.batch || 'BJS & Bar Masterclass'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase">পরিশোধের পরিমাণ</p>
                <p className="font-mono font-black text-emerald-700 text-sm mt-0.5">
                  ৳{toBangladeshDigits(Number(viewReceiptModal.receipt.amount || 0).toLocaleString('en-IN'))}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase">পেমেন্ট মেথড</p>
                <p className="font-bold text-slate-800 mt-0.5">{viewReceiptModal.receipt.paymentMethod || 'Online'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-500 uppercase">ট্রানজেকশন আইডি (TrxID)</p>
                <p className="font-mono font-bold text-slate-700 mt-0.5">{viewReceiptModal.receipt.trxId || 'N/A'}</p>
              </div>
            </div>

            {/* Timestamp & Issuer */}
            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span>ইস্যুর সময়: {formatBangladeshTime(viewReceiptModal.receipt.paymentTime || viewReceiptModal.receipt.createdAt)}</span>
              <span className="font-bold text-slate-700">ইস্যুকারী: {viewReceiptModal.receipt.issuedBy || 'Super Admin'}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
