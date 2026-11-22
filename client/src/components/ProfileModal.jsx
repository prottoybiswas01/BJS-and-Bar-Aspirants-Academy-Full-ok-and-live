import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { lockBodyScroll, unlockBodyScroll } from './ui/scrollLock';
import BrandLogo from './BrandLogo';
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
  Layers,
  HelpCircle,
  Loader2,
  KeyRound,
  RotateCw,
  ArrowLeft
} from 'lucide-react';
import { validateRealEmail } from '../utils/emailValidator';

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

  // Step 1: Send OTP to the NEW email address
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMsg('অনুগ্রহ করে একটি সঠিক নতুন ইমেইল এড্রেস লিখুন।');
      return;
    }

    const emailCheck = validateRealEmail(cleanEmail);
    if (!emailCheck.ok) {
      setErrorMsg(emailCheck.message || 'ইমেইল ফরম্যাট সঠিক নয় (যেমন: student@gmail.com)।');
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
        newEmail: cleanEmail,
        otp: cleanOtp
      });

      setVerifyingOtp(false);
      if (res.data && res.data.ok) {
        const updatedEmail = res.data.student?.email || cleanEmail;
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
      <div className="relative w-full max-w-4xl max-h-[calc(100dvh-2rem)] rounded-3xl bg-[#0B1220] border border-slate-700/60 shadow-[0_25px_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden my-auto text-slate-100">
        
        {/* Top Sovereign Gold Strip */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600"></div>

        {/* Header Bar */}
        <div className="px-5 sm:px-8 pt-5 pb-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <div>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                {user.isMentor ? 'মেন্টর পোর্টাল' : 'স্টুডেন্ট পোর্টাল'}
              </span>
              <p className="text-[11px] text-slate-400">
                {user.isMentor ? 'সম্মানিত বিচারক ও মেন্টর পরিচিতি' : 'অফিসিয়াল ডিজিটাল শিক্ষার্থী প্রোফাইল ও নিরাপত্তা'}
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

        {/* Modal Scrollable Body: EXECUTIVE 2-COLUMN PROFILE LAYOUT */}
        <div className="p-5 sm:p-8 space-y-6 max-h-[82vh] overflow-y-auto custom-scrollbar">

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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ======================================================== */}
            {/* LEFT COLUMN: IDENTITY, ACADEMIC BADGES & DEVICE GUARD     */}
            {/* ======================================================== */}
            <div className="lg:col-span-5 space-y-4">
              {/* Identity Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-amber-500/30 shadow-xl text-center flex flex-col items-center">
                {/* Avatar with Glow Ring */}
                <div className="relative mb-3">
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt={user.name}
                      className="w-20 h-20 rounded-2xl object-cover ring-2 ring-amber-500/50 shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center text-3xl shadow-lg ring-4 ring-amber-500/20">
                      {user.name ? user.name[0].toUpperCase() : 'S'}
                    </div>
                  )}
                  <div
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md ring-2 ring-slate-950"
                    title="যাচাইকৃত সক্রিয় শিক্ষার্থী"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>

                <h2 className="text-lg font-black text-white tracking-tight">{user.name}</h2>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap justify-center">
                  <span className="font-mono text-amber-400 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 text-xs">
                    ID: {user.id || user.regId || (user.isMentor ? 'MENTOR' : 'STU-2026')}
                  </span>
                  <button
                    onClick={handleCopyId}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-[11px] font-bold cursor-pointer border border-slate-700/60"
                    title="আইডি কপি করুন"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-bold text-[11px] border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{user.isMentor ? 'সম্মানিত মেন্টর ও বিচারক' : 'অফিসিয়াল সক্রিয় শিক্ষার্থী'}</span>
                </div>
              </div>

              {/* Active Courses Badges */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  📚 নিবন্ধিত কোর্স ও ব্যাচ
                </span>
                <div className="space-y-1.5">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/20 text-xs">
                    <p className="font-bold text-amber-300">{user.batch || 'Judiciary 2026 Masterclass'}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{user.session || 'Weekend Intensive'}</p>
                  </div>
                </div>
              </div>

              {/* Registered Device Security Guard */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ডিভাইস নিরাপত্তা (Device Guard)</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    1/2 Active
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  অ্যাকাউন্ট সুরক্ষায় সর্বোচ্চ ২টি ডিভাইসে বাইন্ডিং সক্রিয় রয়েছে।
                </p>

                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-slate-300 truncate">
                    {currentDeviceId}
                  </span>
                  <button
                    onClick={handleCopyDevId}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs cursor-pointer shrink-0"
                    title="ডিভাইস আইডি কপি করুন"
                  >
                    {copiedDevId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Administrative Helpline Notice */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-2">
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>কোনো তথ্য সংশোধনের প্রয়োজন হলে:</span>
                </p>
                <a
                  href="tel:01800077663"
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-amber-500/30"
                >
                  <span>📞 একাডেমি হেল্পলাইন: 01800077663</span>
                </a>
              </div>
            </div>

            {/* ======================================================== */}
            {/* RIGHT COLUMN: EDITABLE FIELDS, EMAIL OTP & PASSWORD      */}
            {/* ======================================================== */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Policy Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>প্রোফাইল নিরাপত্তা ও ওটিপি ভেরিফিকেশন নীতিমালা</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  পরীক্ষার নিরাপত্তা স্বার্থে নাম ও মোবাইল নম্বর স্থায়ী। প্রয়োজনীয় <strong className="text-amber-300">ইমেইল এড্রেসটি ওটিপি কোড দিয়ে তাৎক্ষণিক আপডেট</strong> করতে পারবেন।
                </p>
              </div>

              {/* EMAIL FIELD (WITH DUAL-STEP OTP VERIFICATION) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border-2 border-amber-500/40 shadow-md relative space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200">ইমেইল এড্রেস (Email Address)</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold border border-amber-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      OTP ভেরিফায়েড
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
                      <span>পরিবর্তন করুন</span>
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
                      ক্লাস আপডেট ও নোটিসের মূল মাধ্যম
                    </span>
                  </div>
                )}

                {/* STEP 1: INPUT NEW EMAIL & SEND OTP */}
                {editStep === 'input' && (
                  <form onSubmit={handleSendOtp} className="space-y-3 animate-fadeIn">
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
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-amber-500/60 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 text-white text-sm font-mono outline-none transition-all placeholder:text-slate-600"
                        />
                      </div>
                    </div>

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
                  <form onSubmit={handleVerifyOtp} className="space-y-3 animate-fadeIn">
                    <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 space-y-1">
                      <p className="text-xs text-slate-300">
                        ভেরিফিকেশন কোড পাঠানো হয়েছে: <strong className="text-amber-300 font-mono">{emailInput}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        নতুন ইমেইলের ইনবক্স চেক করে নিচে ৬-ডিজিটের OTP কোডটি লিখুন।
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5" />
                        ৬-ডিজিটের ওটিপি কোড (OTP Code):
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        disabled={verifyingOtp}
                        autoFocus
                        className="w-full px-4 py-2.5 text-center rounded-xl bg-slate-900 border-2 border-emerald-500/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 text-emerald-300 text-lg font-mono tracking-[8px] font-extrabold outline-none transition-all"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
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
                            {cooldown > 0 ? `পুনরায় পাঠান (${cooldown}s)` : 'পুনরায় ওটিপি'}
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
                              <span>✓ সেভ করুন</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Full Name & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Full Name */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      শিক্ষার্থীর নাম
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-amber-500" />
                      লকড
                    </span>
                  </div>
                  <p className="font-extrabold text-white text-sm sm:text-base">{user.name}</p>
                </div>

                {/* Phone */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      মোবাইল নম্বর
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-amber-500" />
                      লকড
                    </span>
                  </div>
                  <p className="font-extrabold text-white font-mono text-sm sm:text-base">{user.phone || 'N/A'}</p>
                </div>

                {/* University */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                      আইন শিক্ষাপ্রতিষ্ঠান / বিশ্ববিদ্যালয়
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-amber-500" />
                      স্থায়ী
                    </span>
                  </div>
                  <p className="font-bold text-slate-200 text-xs sm:text-sm">
                    {user?.university || 'Department of Law (BJS Track)'}
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-8 py-4 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 font-mono hidden sm:block">
            BJS & Bar Academy • Dual-Guard Security Shield Active
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
