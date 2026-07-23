import React, { useState } from 'react';
import api from '../services/api';

export default function AiChatDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'আসসালামু আলাইকুম! আমি BJS & Bar Academy Gemini AI Legal Assistant। দেওয়ানী কার্যবিধি (CPC), ফৌজদারী কার্যবিধি (CrPC), দণ্ডবিধি (Penal Code), বা সাক্ষ্য আইন (Evidence Act) সম্পর্কিত যেকোনো প্রশ্ন জিজ্ঞাসা করতে পারেন।',
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
        setMessages((prev) => [...prev, { sender: 'ai', text: res.data.reply }]);
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
    <div className="fixed inset-y-0 right-0 z-[9990] w-full max-w-md bg-[#0d172a] border-l border-slate-800 shadow-2xl flex flex-col animate-slideLeft">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/20">
            🤖
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Gemini AI Legal Assistant</h3>
            <p className="text-[11px] text-cyan-400">BJS & Bar Council Law Expert</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm"
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
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                  : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none whitespace-pre-line'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-cyan-400 flex items-center gap-2">
              <span className="animate-spin">⏳</span> Gemini AI আইনি ধারা বিশ্লেষণ করছে...
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="p-2 bg-slate-900/60 border-t border-slate-800 flex gap-1.5 overflow-x-auto text-[10px]">
        <button
          onClick={() => setInput('CPC Section 11 Res Judicata কি?')}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap"
        >
          Res Judicata (Sec 11)
        </button>
        <button
          onClick={() => setInput('CrPC Section 154 FIR পদ্ধতি বলুন')}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap"
        >
          FIR (Sec 154)
        </button>
        <button
          onClick={() => setInput('BJS পরীক্ষার বিষয়সমূহ ও মার্কস কত?')}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap"
        >
          BJS Syllabus
        </button>
      </div>

      {/* Form Input */}
      <form onSubmit={handleSend} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="আপনার আইনি প্রশ্ন লিখুন..."
          className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md"
        >
          Send
        </button>
      </form>
    </div>
  );
}
