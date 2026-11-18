import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { lockBodyScroll, unlockBodyScroll } from './ui/scrollLock';
import api from '../services/api';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Lock,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  GraduationCap,
  Sparkles,
  X,
  ExternalLink,
  Layers,
  HelpCircle,
  Loader2,
  KeyRound,
  RotateCw,
  ArrowLeft
} from 'lucide-react';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateUserProfile, getDeviceId } = useAuth();

  // editStep: 'view' | 'input' | 'otp'
  const [editStep, setEditStep] = useState('view');
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedDevId, setCopiedDevId] = useState(false);

  const cooldownTimerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unlockBodyScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (user?.email) {
      setEmailInput(user.email);
    }
    setEditStep('view');
    setOtpInput('');
    setErrorMsg('');
    setSuccessMsg('');
    setCooldown(0);
  }, [user, isOpen]);

  // Resend OTP Cooldown countdown
  useEffect(() => {
    if (cooldown > 0) {
      cooldownTimerRef.current = setTimeout(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, [cooldown]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const currentDeviceId = getDeviceId ? getDeviceId() : 'DEV-UNKNOWN';

  const handleCopyId = () => {
    const stuId = user.id || user.regId || (user.isMentor ? 'MENTOR' : 'STU-2026');
    navigator.clipboard.writeText(stuId).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    }).catch(() => {});
  };

  const handleCopyDevId = () => {
    navigator.clipboard.writeText(currentDeviceId).then(() => {
      setCopiedDevId(true);
      setTimeout(() => setCopiedDevId(false), 2500);
    }).catch(() => {});
  };

  const validateEmailFormat = (email) => {
    const clean = String(email || '').trim().toLowerCase();
    const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return regex.test(clean);
  };

  // Step 1: Send OTP to the NEW email address
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMsg('অনুগ্রহ করে একটি সঠিক নতুন ইমেইল এড্রেস লিখুন।');
      return;
    }

    if (!validateEmailFormat(cleanEmail)) {
      setErrorMsg('ইমেইল ফরম্যাট সঠিক নয় (যেমন: student@gmail.com)।');
      return;
    }

    if (cleanEmail === (user.email || '').toLowerCase()) {
      setErrorMsg('এই ইমেইলটি ইতিমধ্যেই আপনার বর্তমান প্রোফাইলে যুক্ত আছে। নতুন ইমেইল লিখুন।');
      return;
    }

    setSendingOtp(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/student/send-email-otp', {
        studentId: user.id || user.regId,
        newEmail: cleanEmail
      });

      setSendingOtp(false);
      if (res.data && res.data.ok) {
        setEditStep('otp');
        setCooldown(60);
        setOtpInput('');
        setSuccessMsg(res.data.message || `✓ আপনার নতুন ইমেইল (${cleanEmail})-এ ৬-ডিজিটের ভেরিফিকেশন OTP পাঠানো হয়েছে!`);
      } else {
        setErrorMsg(res.data?.message || 'ওটিপি পাঠাতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
      }
    } catch (err) {
      setSendingOtp(false);
      setErrorMsg(
        err.response?.data?.message ||
        'সার্ভার সংযোগ সমস্যা। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
      );
    }
  };

  // Step 2: Verify OTP and save new email address
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanOtp = otpInput.trim();

    if (!cleanOtp || cleanOtp.length < 4) {
      setErrorMsg('অনুগ্রহ করে আপনার নতুন ইমেইলে প্রাপ্ত ৬-ডিজিটের OTP কোডটি লিখুন।');
      return;
    }

    setVerifyingOtp(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/student/verify-email-otp', {
        studentId: user.id || user.regId,
        newEmail: cleanEmail,
        otp: cleanOtp
      });

      setVerifyingOtp(false);
      if (res.data && res.data.ok) {
        const updatedEmail = res.data.email || cleanEmail;
        updateUserProfile({ email: updatedEmail });
        setSuccessMsg(res.data.message || '✓ অভিনন্দন! আপনার নতুন ইমেইল সফলভাবে ভেরিফাই ও যুক্ত হয়েছে!');
        setEditStep('view');
        setOtpInput('');
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setErrorMsg(res.data?.message || 'ভুল OTP কোড! অনুগ্রহ করে সঠিক কোডটি লিখুন।');
      }
    } catch (err) {
      setVerifyingOtp(false);
      setErrorMsg(
        err.response?.data?.message ||
        'ভেরিফিকেশন ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
      );
    }
  };

  const cancelEdit = () => {
    setEmailInput(user.email || '');
    setOtpInput('');
    setEditStep('view');
    setErrorMsg('');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[calc(100dvh-2rem)] rounded-3xl bg-gradient-to-b from-slate-900 via-[#0d1627] to-slate-950 border border-slate-700/60 shadow-[0_25px_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden my-auto">
        
        {/* Top Brand Banner Strip */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600"></div>

        {/* Header Bar */}
        <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
              ⚖️
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm sm:text-base tracking-wide flex items-center gap-2">
                <span>BJS & Bar Aspirants Academy</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                  {user.isMentor ? 'মেন্টর পোর্টাল' : 'স্টুডেন্ট পোর্টাল'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {user.isMentor ? 'সম্মানিত বিচারক ও মেন্টর পরিচিতি' : 'অফিসিয়াল ডিজিটাল শিক্ষার্থী পরিচিতি ও প্রোফাইল'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 border border-slate-700/60 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-all cursor-pointer shadow-sm"
            title="বন্ধ করুন (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 space-y-6 max-h-[82vh] overflow-y-auto custom-scrollbar">

          {/* Student Hero Identity Card */}
          <div className="relative p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-amber-500/25 shadow-xl overflow-hidden">
            {/* Background Watermark Pattern */}
            <div className="absolute -right-6 -bottom-6 text-slate-800/20 text-8xl font-black pointer-events-none select-none font-serif">
              BJS
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar with Glow Ring */}
                <div className="relative shrink-0">
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt={user.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-amber-500/50 shadow-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center text-2xl sm:text-3xl shadow-lg ring-4 ring-amber-500/20">
                      {user.name ? user.name[0].toUpperCase() : 'S'}
                    </div>
                  )}
                  {/* Verified Badge Icon */}
                  <div
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md ring-2 ring-slate-950"
                    title="যাচাইকৃত সক্রিয় শিক্ষার্থী"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>

                {/* Name & Academic ID */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {user.name}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {user.isMentor ? 'সম্মানিত মেন্টর ও বিচারক' : 'ভেরিফাইড শিক্ষার্থী'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono text-amber-400 font-extrabold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      ID: {user.id || user.regId || (user.isMentor ? 'MENTOR' : 'STU-2026-001')}
                    </span>
                    <button
                      onClick={handleCopyId}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1 text-[11px] font-bold cursor-pointer border border-slate-700/60"
                      title="আইডি কপি করুন"
                    >
                      {copiedId ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">কপি হয়েছে!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>কপি আইডি</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 pt-0.5">
                    {user?.isMentor ? (
                      <>👨‍🏫 পদবি: <span className="text-amber-300 font-bold">{user?.designation || 'সহকারী জজ ও প্রশিক্ষক'}</span></>
                    ) : (
                      <>🎓 ব্যাচ: <span className="text-amber-300 font-bold">{user?.batch || 'Judiciary 2026'}</span> • <span className="text-slate-300">{user?.session || 'Weekend Intensive'}</span></>
                    )}
                  </p>
                </div>
              </div>

              {/* Status Pill on Desktop */}
              <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {user?.status || 'Active'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {user?.portalAccessMode || 'Full Access Mode'}
                </span>
              </div>
            </div>
          </div>

          {/* Strict Security Policy Alert Banner */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs shadow-md space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Lock className="w-4 h-4 shrink-0 text-amber-400" />
              <span>একাডেমি প্রোফাইল নিরাপত্তা ও ওটিপি ভেরিফিকেশন নীতিমালা:</span>
            </div>
            <p className="leading-relaxed text-slate-300 text-[11px] sm:text-xs">
              আইনি প্রত্যয়ন ও পরীক্ষার স্বচ্ছতার স্বার্থে শিক্ষার্থীর <strong className="text-white">নাম, মোবাইল নম্বর ও রেজিস্টার্ড ব্যাচ</strong> স্থায়ীভাবে লক করা রয়েছে। শুধুমাত্র আপনার প্রয়োজনীয় <strong className="text-amber-300">ইমেইল এড্রেসটি</strong> পরিবর্তন করতে পারবেন। নিরাপত্তা নিশ্চিত করতে নতুন মেইলে প্রেরিত <strong className="text-emerald-400">ওটিপি (OTP) কোডটি মিললেই কেবল তা অ্যাকাউন্টে যুক্ত হবে</strong>।
            </p>
          </div>

          {/* Feedback Messages */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2.5 shadow-lg animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-bold flex items-center gap-2.5 shadow-lg animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: ব্যক্তিগত ও যোগাযোগ তথ্য */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <span>ব্যক্তিগত ও যোগাযোগ তথ্য</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                ইমেইল ওটিপি ভেরিফায়েড • বাকি তথ্য সুরক্ষিত
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">

              {/* 1. EMAIL FIELD (WITH DUAL-STEP OTP VERIFICATION) */}
              <div className="sm:col-span-2 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border-2 border-amber-500/40 shadow-md relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200">ইমেইল এড্রেস (Email Address)</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold border border-amber-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      ওটিপি ভেরিফিকেশন সহ এডিটেবল
                    </span>
                  </div>

                  {editStep === 'view' && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditStep('input');
                        setErrorMsg('');
                        setSuccessMsg('');
                        setEmailInput('');
                      }}
                      className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>ইমেইল পরিবর্তন করুন</span>
                    </button>
                  )}
                </div>

                {/* VIEW MODE */}
                {editStep === 'view' && (
                  <div className="flex items-center justify-between pt-1">
                    <p className="font-bold text-white text-sm sm:text-base font-mono tracking-wide break-all">
                      {user.email || 'ইমেইল যুক্ত করা হয়নি'}
                    </p>
                    <span className="text-[11px] text-slate-400 hidden sm:inline-block">
                      ক্লাস আপডেট ও গুরুত্বপূর্ণ নোটিসের মূল মাধ্যম
                    </span>
                  </div>
                )}

                {/* STEP 1: INPUT NEW EMAIL & SEND OTP */}
                {editStep === 'input' && (
                  <form onSubmit={handleSendOtp} className="mt-3 space-y-3 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-300">
                        আপনার নতুন ইমেইল এড্রেস লিখুন:
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="যেমন: student@gmail.com"
                          disabled={sendingOtp}
                          autoFocus
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-amber-500/60 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 text-white text-sm font-mono outline-none transition-all placeholder:text-slate-600"
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">
                          New Mail
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      💡 আপনি সাবমিট করলে এই নতুন মেইলে ৬-ডিজিটের একটি ভেরিফিকেশন ওটিপি (OTP) পাঠানো হবে।
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={sendingOtp}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        বাতিল
                      </button>
                      <button
                        type="submit"
                        disabled={sendingOtp}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {sendingOtp ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>ওটিপি পাঠানো হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-3.5 h-3.5" />
                            <span>📨 ওটিপি কোড পাঠান</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 2: ENTER OTP RECEIVED ON NEW EMAIL */}
                {editStep === 'otp' && (
                  <form onSubmit={handleVerifyOtp} className="mt-3 space-y-3.5 animate-fadeIn">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-1">
                      <p className="text-xs text-slate-300">
                        ভেরিফিকেশন কোড পাঠানো হয়েছে: <strong className="text-amber-300 font-mono">{emailInput}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        আপনার নতুন ইমেইলের ইনবক্স বা স্প্যাম ফোল্ডার চেক করে নিচে ৬-ডিজিটের OTP কোডটি লিখুন।
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5" />
                        ৬-ডিজিটের ওটিপি কোড (OTP Code):
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={6}
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          disabled={verifyingOtp}
                          autoFocus
                          className="w-full px-4 py-2.5 text-center rounded-xl bg-slate-950 border-2 border-emerald-500/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 text-emerald-300 text-lg font-mono tracking-[8px] font-extrabold outline-none transition-all placeholder:text-slate-700 placeholder:tracking-normal placeholder:font-normal"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                      {/* Change / Resend OTP Controls */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditStep('input');
                            setErrorMsg('');
                          }}
                          className="text-[11px] text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>ইমেইল সংশোধন</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={cooldown > 0 || sendingOtp}
                          className="text-[11px] text-amber-400 hover:text-amber-300 disabled:text-slate-600 transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <RotateCw className={`w-3 h-3 ${sendingOtp ? 'animate-spin' : ''}`} />
                          <span>
                            {cooldown > 0 ? `পুনরায় পাঠান (${cooldown}s)` : 'পুনরায় ওটিপি পাঠান'}
                          </span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={verifyingOtp}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          বাতিল
                        </button>
                        <button
                          type="submit"
                          disabled={verifyingOtp || otpInput.length < 4}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {verifyingOtp ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>যাচাই হচ্ছে...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>✓ ওটিপি যাচাই ও সেভ করুন</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* 2. FULL NAME (LOCKED) */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    শিক্ষার্থীর পূর্ণ নাম
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-amber-500" />
                    অপরিবর্তনযোগ্য
                  </span>
                </div>
                <p className="font-extrabold text-white text-sm sm:text-base">{user.name}</p>
                <p className="text-[10px] text-slate-500 mt-1">জাতীয় পরিচয়পত্র ও একাডেমি রেজিস্ট্রেশন অনুযায়ী সংরক্ষিত</p>
              </div>

              {/* 3. PHONE NUMBER (LOCKED) */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    মোবাইল নম্বর (লগইন আইডি)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-amber-500" />
                    লকড ও ভেরিফাইড
                  </span>
                </div>
                <p className="font-extrabold text-white font-mono text-sm sm:text-base">{user.phone || 'N/A'}</p>
                <p className="text-[10px] text-slate-500 mt-1">অফিসিয়াল এসএমএস ও পোর্টাল লগইনে ব্যবহৃত মূল নম্বর</p>
              </div>

              {/* 4. UNIVERSITY / INSTITUTION (LOCKED) */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                    আইন শিক্ষাপ্রতিষ্ঠান / বিশ্ববিদ্যালয়
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-amber-500" />
                    স্থায়ী
                  </span>
                </div>
                <p className="font-bold text-slate-200 text-xs sm:text-sm">
                  {user?.university || 'Department of Law (BJS Track)'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">শিক্ষার্থীর একাডেমিক ব্যাকগ্রাউন্ড রেকর্ড</p>
              </div>

              {/* 5. ACTIVE BATCH & SESSION (LOCKED) */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    নিবন্ধিত ব্যাচ ও সেশন
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-amber-500" />
                    স্থায়ী
                  </span>
                </div>
                <p className="font-bold text-amber-300 text-xs sm:text-sm">
                  {user?.batch || 'Judiciary 2026'} ({user?.session || 'Weekend Intensive'})
                </p>
                <p className="text-[10px] text-slate-500 mt-1">বর্তমান সক্রিয় কোর্সরুম ও লেকচার রুটিন</p>
              </div>

            </div>
          </div>

          {/* SECTION 2: একাডেমি এনরোলমেন্ট ও সিকিউরিটি স্ট্যাটাস */}
          <div className="space-y-3">
            <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ডিজিটাল নিরাপত্তা ও ডিভাইস গভর্ন্যান্স</span>
            </h4>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-800/60">
                <span className="text-xs text-slate-400 font-medium">পোর্টাল অ্যাক্সেস পারমিশন:</span>
                <span className="px-3 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold text-xs border border-emerald-500/30 self-start sm:self-auto">
                  {user?.portalAccessMode || 'Full Masterclass Access'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-800/60">
                <span className="text-xs text-slate-400 font-medium">রেজিস্টার্ড ডিভাইস নিরাপত্তা লিমিট:</span>
                <span className="font-mono font-bold text-amber-400 text-xs self-start sm:self-auto">
                  সর্বোচ্চ ২টি সক্রিয় ডিভাইস (2 Devices Max Binding)
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs text-slate-400 font-medium">বর্তমান ব্রাউজার ডিভাইস ফিঙ্গারপ্রিন্ট:</span>
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="font-mono text-[11px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 max-w-[180px] sm:max-w-[240px] truncate">
                    {currentDeviceId}
                  </span>
                  <button
                    onClick={handleCopyDevId}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs cursor-pointer border border-slate-700/60"
                    title="ডিভাইস আইডি কপি করুন"
                  >
                    {copiedDevId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: প্রশাসনিক সংশোধন সহায়তা ও হেল্পলাইন */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <p className="font-bold text-slate-200 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                নাম বা মোবাইল নম্বরে কোনো ভুল আছে?
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                জরুরি প্রয়োজনে নাম বা ফোন নম্বর সংশোধনের জন্য একাডেমি অ্যাডমিন সাপোর্টে সরাসরি যোগাযোগ করুন।
              </p>
            </div>

            <a
              href="https://wa.me/8801800077663?text=আসসালামু%20আলাইকুম,%20আমার%20স্টুডেন্ট%20প্রোফাইলের%20তথ্য%20সংশোধনের%20অনুরোধ।"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-700/80 shrink-0 text-xs shadow-sm cursor-pointer"
            >
              <span>💬 অ্যাডমিন হেল্পলাইন</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-7 py-4 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 font-mono hidden sm:block">
            BJS & Bar Aspirants Academy • Security Shield Active
          </p>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer ml-auto"
          >
            বন্ধ করুন (Close)
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
