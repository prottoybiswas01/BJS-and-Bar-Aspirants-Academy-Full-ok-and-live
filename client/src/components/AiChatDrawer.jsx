import React, { useState } from 'react';
import api from '../services/api';

export default function AiChatDrawer({ isOpen, onClose, openVideoModal, setActivePage }) {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'আসসালামু আলাইকুম! আমি BJS & Bar Academy Gemini AI Legal Assistant।\n\nবাংলাদেশ সংবিধানের অনুচ্ছেদসমূহ (Articles of Constitution), দেওয়ানী কার্যবিধি (CPC), ফৌজদারী কার্যবিধি (CrPC), দণ্ডবিধি (Penal Code) বা সাক্ষ্য আইন (Evidence Act) সম্পর্কিত যেকোনো প্রশ্ন বা আইনি সমস্যা জিজ্ঞাসা করতে পারেন।',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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
    <div className="fixed inset-y-0 right-0 z-[9990] w-full max-w-md bg-[#0d172a] border-l border-slate-800 shadow-2xl flex flex-col animate-slideLeft font-sans">
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
          className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all"
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
                  {msg.recommendation.type === 'FREE_ORIENTATION' && (
                    <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-emerald-300">🎁 অরিয়েন্টেশন ফ্রি ক্লাস (Free Class)</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-bold">100% Free</span>
                      </div>
                      <p className="text-[11px] text-slate-200 font-bold">{msg.recommendation.lesson?.title || msg.recommendation.courseTitle}</p>
                      <button
                        type="button"
                        onClick={() => {
                          if (openVideoModal && msg.recommendation.lesson) {
                            openVideoModal(msg.recommendation.lesson);
                          }
                        }}
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
