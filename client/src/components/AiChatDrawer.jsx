import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AiChatDrawer({ isOpen, onClose, openVideoModal, setActivePage }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'আসসালামু আলাইকুম! আমি BJS & Bar Academy Gemini AI Legal Assistant।\n\nবাংলাদেশ সংবিধানের অনুচ্ছেদসমূহ (Articles of Constitution), দেওয়ানী কার্যবিধি (CPC), ফৌজদারী কার্যবিধি (CrPC), দণ্ডবিধি (Penal Code) বা সাক্ষ্য আইন (Evidence Act) সম্পর্কিত যেকোনো প্রশ্ন বা আইনি সমস্যা জিজ্ঞাসা করতে পারেন।',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [accessModal, setAccessModal] = useState(null);

  if (!isOpen) return null;

  // Multi-tier Access Verification Engine
  const checkLessonAccess = (rec) => {
    const lesson = rec?.lesson;
    if (!lesson) return { allowed: false, reason: 'NO_LESSON' };

    // 1. Free orientation classes are open to everyone
    const isFreeOrOrientation =
      lesson.isFree === true ||
      rec.type === 'FREE_ORIENTATION' ||
      (lesson.title && (lesson.title.toLowerCase().includes('orientation') || lesson.title.includes('অরিয়েন্টেশন'))) ||
      (lesson.module && (lesson.module.toLowerCase().includes('orientation') || lesson.module.includes('অরিয়েন্টেশন')));

    if (isFreeOrOrientation) {
      return { allowed: true, reason: 'FREE_ORIENTATION' };
    }

    // 2. Guest user check -> Prompt login / registration
    const isLoggedIn = !!(user && (user.id || user.regId || user._id));
    if (!isLoggedIn) {
      return {
        allowed: false,
        reason: 'LOGIN_REQUIRED',
        message: 'এই প্রিমিয়াম ক্লাসটি দেখতে হলে অনুগ্রহ করে প্রথমে রেজিস্ট্রেশন অথবা লগইন করুন।',
        courseTitle: rec.courseTitle || 'একাডেমি কোর্স',
        courseId: rec.courseId || lesson.courseId
      };
    }

    // 3. Admin & Mentors have full access
    if (user.isAdmin || user.isMentor) {
      return { allowed: true, reason: 'ADMIN_OR_MENTOR' };
    }

    // 4. Unlimited / Lifetime access check
    const allowed = user.allowedCourseIds || [];
    const enrolled = user.enrolledCourseIds || [];
    const rules = user.courseRules || [];

    if (user.unlimitedAccess === true || allowed.includes('all')) {
      return { allowed: true, reason: 'UNLIMITED_ACCESS' };
    }

    // 5. Course enrollment check
    const targetCourseId = rec.courseId || lesson.courseId;
    const isEnrolled = !!(
      targetCourseId && (
        allowed.includes(targetCourseId) ||
        enrolled.includes(targetCourseId) ||
        user.course === targetCourseId ||
        rules.some(r => r && r.courseId === targetCourseId && r.enrollmentStatus !== 'Suspended')
      )
    );

    if (isEnrolled) {
      return { allowed: true, reason: 'ENROLLED' };
    }

    // Logged in but not enrolled in this specific course
    return {
      allowed: false,
      reason: 'ENROLL_REQUIRED',
      message: `এই ক্লাসটি "${rec.courseTitle || 'একাডেমি কোর্স'}" কোর্সের অন্তর্ভুক্ত। ক্লাসটি সম্পূর্ণ দেখতে হলে অনুগ্রহ করে এই কোর্সে এনরোল করুন।`,
      courseTitle: rec.courseTitle || 'একাডেমি কোর্স',
      courseId: targetCourseId
    };
  };

  const handlePlayVideo = (rec) => {
    // 1. Direct Backend-Processed Access Decision (from MongoDB + Fast-Cache)
    const backendAccess = rec?.access;
    if (backendAccess) {
      if (backendAccess.canPlay) {
        setAccessModal(null);
        if (openVideoModal && rec.lesson) {
          openVideoModal(rec.lesson);
        } else if (rec.lesson?.youtubeId) {
          window.open(`https://youtu.be/${rec.lesson.youtubeId}`, '_blank');
        }
        return;
      }

      if (backendAccess.actionRequired === 'LOGIN') {
        setAccessModal({
          type: 'LOGIN_REQUIRED',
          title: backendAccess.promptTitle || 'প্রথমে রেজিস্ট্রেশন বা লগইন করুন',
          message: backendAccess.promptMessage || 'এই প্রিমিয়াম একাডেমি ক্লাসটি দেখার জন্য আপনাকে প্রথমে একটি একাউন্ট রেজিস্ট্রেশন অথবা লগইন করতে হবে।',
          lesson: rec.lesson,
          courseTitle: backendAccess.courseTitle || rec.courseTitle || 'একাডেমি কোর্স'
        });
        return;
      }

      if (backendAccess.actionRequired === 'ENROLL') {
        setAccessModal({
          type: 'ENROLL_REQUIRED',
          title: backendAccess.promptTitle || 'আপনি এই কোর্সে এনরোল করেন',
          message: backendAccess.promptMessage || `এই ভিডিও ক্লাসটি "${backendAccess.courseTitle || rec.courseTitle || 'একাডেমি কোর্স'}" এর অন্তর্ভুক্ত। ক্লাসটি দেখতে হলে অনুগ্রহ করে কোর্সে এনরোল সম্পন্ন করুন।`,
          lesson: rec.lesson,
          courseTitle: backendAccess.courseTitle || rec.courseTitle || 'একাডেমি কোর্স',
          courseId: rec.courseId || rec.lesson?.courseId
        });
        return;
      }
    }

    // 2. Fallback Client-side Verification
    const access = checkLessonAccess(rec);

    if (access.allowed) {
      setAccessModal(null);
      if (openVideoModal && rec.lesson) {
        openVideoModal(rec.lesson);
      } else if (rec.lesson?.youtubeId) {
        window.open(`https://youtu.be/${rec.lesson.youtubeId}`, '_blank');
      }
      return;
    }

    if (access.reason === 'LOGIN_REQUIRED') {
      setAccessModal({
        type: 'LOGIN_REQUIRED',
        title: 'প্রথমে রেজিস্ট্রেশন বা লগইন করুন',
        message: 'এই প্রিমিয়াম একাডেমি ক্লাসটি দেখার জন্য আপনাকে প্রথমে একটি একাউন্ট রেজিস্ট্রেশন অথবা লগইন করতে হবে।',
        lesson: rec.lesson,
        courseTitle: rec.courseTitle || 'একাডেমি কোর্স'
      });
      return;
    }

    if (access.reason === 'ENROLL_REQUIRED') {
      setAccessModal({
        type: 'ENROLL_REQUIRED',
        title: 'কোর্সে এনরোল করুন',
        message: `এই ভিডিও ক্লাসটি "${rec.courseTitle || 'একাডেমি কোর্স'}" এর অন্তর্ভুক্ত। ক্লাসটি দেখতে হলে অনুগ্রহ করে কোর্সে এনরোল সম্পন্ন করুন।`,
        lesson: rec.lesson,
        courseTitle: rec.courseTitle || 'একাডেমি কোর্স',
        courseId: access.courseId
      });
      return;
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { prompt: userText });
      if (res.data.ok) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            reply: res.data.reply,
            text: res.data.reply,
            recommendation: res.data.recommendation
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'ai', text: 'দুঃখিত, কোনো ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।' },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'AI সার্ভিস কানেকশনে ত্রুটি ঘটেছে।' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-[9990] w-full max-w-md bg-[#0d172a] border-l border-slate-800 shadow-2xl flex flex-col animate-slideLeft font-sans relative overflow-hidden">
      {/* Access Gate Modal / Dialog */}
      {accessModal && (
        <div className="absolute inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md p-5 flex flex-col justify-center items-center animate-fadeIn text-center">
          {accessModal.type === 'LOGIN_REQUIRED' && (
            <div className="w-full max-w-sm bg-gradient-to-b from-[#131d36] to-[#0a1020] border border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl text-amber-400 shadow-lg shadow-amber-500/10">
                🔒
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  স্টুডেন্ট একাউন্ট প্রয়োজন
                </span>
                <h3 className="mt-2 text-base font-extrabold text-white">
                  প্রথমে রেজিস্ট্রেশন বা লগইন করুন
                </h3>
                <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                  এই প্রিমিয়াম একাডেমি ক্লাসটি দেখার জন্য আপনাকে প্রথমে একটি একাউন্ট রেজিস্ট্রেশন অথবা লগইন করতে হবে।
                </p>
              </div>

              {accessModal.lesson?.title && (
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-left space-y-1">
                  <p className="text-[11px] text-white font-bold line-clamp-2">
                    🎥 {accessModal.lesson.title}
                  </p>
                  {accessModal.courseTitle && (
                    <p className="text-[10px] text-amber-300 font-mono">
                      📚 {accessModal.courseTitle}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAccessModal(null);
                    onClose();
                    if (setActivePage) setActivePage('register');
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>📝</span> নতুন রেজিস্ট্রেশন করুন (Register)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccessModal(null);
                    onClose();
                    if (setActivePage) setActivePage('login');
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>🔑</span> একাউন্টে লগইন করুন (Login)
                </button>
                <button
                  type="button"
                  onClick={() => setAccessModal(null)}
                  className="w-full py-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  ✕ এখন নয় (ফিরে যান)
                </button>
              </div>
            </div>
          )}

          {accessModal.type === 'ENROLL_REQUIRED' && (
            <div className="w-full max-w-sm bg-gradient-to-b from-[#131d36] to-[#0a1020] border border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-2xl text-cyan-400 shadow-lg shadow-cyan-500/10">
                🎓
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  কোর্স এনরোলমেন্ট প্রয়োজন
                </span>
                <h3 className="mt-2 text-base font-extrabold text-white">
                  আপনি এই কোর্সে এনরোল করেন
                </h3>
                <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                  এই ভিডিও ক্লাসটি <strong className="text-amber-300 font-semibold">{accessModal.courseTitle || 'একাডেমি কোর্স'}</strong>-এর অন্তর্ভুক্ত। ক্লাসটি সম্পূর্ণ দেখতে হলে অনুগ্রহ করে কোর্সে এনরোল সম্পন্ন করুন।
                </p>
              </div>

              {accessModal.lesson?.title && (
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-left space-y-1">
                  <p className="text-[11px] text-white font-bold line-clamp-2">
                    🎥 {accessModal.lesson.title}
                  </p>
                  {accessModal.courseTitle && (
                    <p className="text-[10px] text-cyan-300 font-mono">
                      📚 {accessModal.courseTitle}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAccessModal(null);
                    onClose();
                    if (setActivePage) setActivePage('home');
                    setTimeout(() => {
                      const el = document.getElementById('courses') || document.getElementById('course-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>🚀</span> এই কোর্সে এনরোল করুন (Enroll Now)
                </button>
                <button
                  type="button"
                  onClick={() => setAccessModal(null)}
                  className="w-full py-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  ✕ বাতিল করুন
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20 text-lg">
            🤖
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Gemini AI Legal Assistant</h3>
            <p className="text-[11px] text-cyan-400 font-mono">BJS & Bar Council Law Expert</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none shadow-md'
                  : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none whitespace-pre-line shadow-md'
              }`}
            >
              {msg.text}

              {/* Dynamic Course & Video Recommendation Action Cards */}
              {msg.recommendation && (
                <div className="mt-3 pt-2.5 border-t border-slate-700/80 space-y-2">
                  {msg.recommendation.type === 'MATCHED_LESSON' && (() => {
                    const bAccess = msg.recommendation.access;
                    const access = bAccess
                      ? {
                          allowed: bAccess.canPlay,
                          badgeText: bAccess.badgeText,
                          btnText: bAccess.btnText,
                          reason: bAccess.actionRequired === 'LOGIN' ? 'LOGIN_REQUIRED' : bAccess.actionRequired === 'ENROLL' ? 'ENROLL_REQUIRED' : ''
                        }
                      : checkLessonAccess(msg.recommendation);
                    return (
                      <div className="p-3.5 rounded-xl bg-gradient-to-br from-cyan-950/90 to-blue-950/90 border border-cyan-500/50 space-y-2.5 text-xs shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-cyan-300 flex items-center gap-1.5">
                            <span>🎥</span> প্রস্তাবিত ভিডিও লেকচার (Academy Class)
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                            access.allowed
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {access.badgeText || (access.allowed ? '✅ আনলক করা' : access.reason === 'LOGIN_REQUIRED' ? '🔒 লগইন প্রয়োজন' : '🔒 এনরোল প্রয়োজন')}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-white font-extrabold line-clamp-2">
                            {msg.recommendation.lesson?.title}
                          </p>
                          {msg.recommendation.courseTitle && (
                            <span className="text-[10px] text-amber-300 font-mono">
                              📚 {msg.recommendation.courseTitle}
                            </span>
                          )}
                        </div>
                        {msg.recommendation.snippet && (
                          <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 italic leading-relaxed">
                            <span className="text-cyan-400 font-bold not-italic">🗣️ ক্লাসে শিক্ষকের বক্তব্য: </span>
                            "{msg.recommendation.snippet}"
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePlayVideo(msg.recommendation)}
                          className={`w-full py-2.5 rounded-xl text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                            access.allowed
                              ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400'
                              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500'
                          }`}
                        >
                          <span>{access.allowed ? '▶️' : '🔒'}</span>{' '}
                          {access.btnText || (access.allowed
                            ? 'এই ক্লাসটি সরাসরি প্লে করুন'
                            : access.reason === 'LOGIN_REQUIRED'
                            ? 'ক্লাসটি দেখতে লগইন করুন'
                            : 'ক্লাসটি দেখতে এনরোল করুন')}
                        </button>
                      </div>
                    );
                  })()}

                  {msg.recommendation.type === 'FREE_ORIENTATION' && (
                    <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-emerald-300">🎁 অরিয়েন্টেশন ফ্রি ক্লাস (Free Class)</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-bold">100% Free</span>
                      </div>
                      <p className="text-[11px] text-slate-200 font-bold">{msg.recommendation.lesson?.title || msg.recommendation.courseTitle}</p>
                      <button
                        type="button"
                        onClick={() => handlePlayVideo(msg.recommendation)}
                        className="w-full py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span>▶️</span> অরিয়েন্টেশন ফ্রি ক্লাস সরাসরি দেখুন
                      </button>
                    </div>
                  )}

                  {msg.recommendation.type === 'PAID_COURSE_ENROLL' && (
                    <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/50 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-amber-300">🔒 প্রিমিয়াম পেইড কোর্স (Paid Module)</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 font-bold">Tk {msg.recommendation.price} BDT</span>
                      </div>
                      <p className="text-[11px] text-slate-200 font-bold">{msg.recommendation.courseTitle}</p>
                      <p className="text-[10px] text-slate-400">এই বিষয় ও কোর্সটির সম্পূর্ণ ভিডিও দেখতে প্রথমে এনরোল করতে হবে।</p>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (setActivePage) setActivePage('register');
                        }}
                        className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span>🚀</span> কোর্সে এনরোল করুন (Enroll Now)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Mandatory AI Disclaimer Box under EVERY AI message (Concise 1-2 Lines) */}
              {msg.sender === 'ai' && (
                <div className="mt-2.5 px-3 py-2 rounded-xl bg-[#091122] border border-amber-500/35 text-[10.5px] leading-snug font-sans text-slate-300">
                  <span className="font-extrabold text-amber-400">⚠️ সতর্কবার্তা: </span>
                  <span className="font-medium text-slate-300">
                    AI সহকারীটি বর্তমানে <strong>ট্রেনিং মোডে</strong> রয়েছে। তথ্যে অনাকাঙ্ক্ষিত ভুল থাকতে পারে; সিদ্ধান্ত নেওয়ার পূর্বে বিজ্ঞ বিচারক বা আইনজীবীর মাধ্যমে যাচাই করে নিন।
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-cyan-400 flex items-center gap-2">
              <span className="animate-spin">⏳</span> Gemini AI বাংলাদেশ সংবিধান ও আইনি ধারা বিশ্লেষণ করছে...
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="p-2 bg-slate-900/60 border-t border-slate-800 flex gap-1.5 overflow-x-auto text-[10px]">
        <button
          onClick={() => setInput('বাংলাদেশ সংবিধানের মৌলিক অধিকার কি কি?')}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap font-medium"
        >
          সংবিধান মৌলিক অধিকার (Art 27-44)
        </button>
        <button
          onClick={() => setInput('CPC Section 11 Res Judicata কি?')}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap font-medium"
        >
          Res Judicata (Sec 11)
        </button>
        <button
          onClick={() => setInput('CrPC Section 154 FIR এবং ১০০% ফ্রি ক্লাস বলুন')}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap font-medium"
        >
          FIR (Sec 154)
        </button>
      </div>

      {/* Form Input */}
      <form onSubmit={handleSend} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="আপনার আইনি বা সংবিধানের প্রশ্ন লিখুন..."
          className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
        >
          Send
        </button>
      </form>
    </div>
  );
}
