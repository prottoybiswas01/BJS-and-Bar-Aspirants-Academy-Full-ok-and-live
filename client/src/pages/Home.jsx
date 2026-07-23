import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Home({ setActivePage, openPaymentModal }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // MCQ Practice State
  const [mcqIndex, setMcqIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const sampleMcqs = [
    {
      q: 'দেওয়ানী কার্যবিধি ১৯০৮ (CPC) এর কত ধারায় Res Judicata বর্ণিত হয়েছে?',
      options: ['Section 9', 'Section 10', 'Section 11', 'Section 115'],
      ans: 2,
      exp: 'ব্যাখ্যা: ধারা ১১ অনুসারে Res Judicata এর বিধান দেওয়া হয়েছে, অর্থাৎ একই বিষয়বস্তু ও পক্ষগণের মধ্যে একবার চূড়ান্ত নিষ্পত্তি হওয়া মামলা পুনরায় বিচার করা যাবে না।',
    },
    {
      q: 'ফৌজদারী কার্যবিধি ১৮৯৮ (CrPC) এর কত ধারায় FIR রেকর্ড করার বিধান রয়েছে?',
      options: ['Section 154', 'Section 161', 'Section 164', 'Section 173'],
      ans: 0,
      exp: 'ব্যাখ্যা: ধারা ১৫৪ এ আমলযোগ্য অপরাধের সংবাদ (First Information Report) রেকর্ড করার নিয়ম বর্ণনা করা হয়েছে।',
    },
    {
      q: 'সাক্ষ্য আইন ১৮৭২ (Evidence Act) এর কত ধারায় পুলিশের নিকট প্রদত্ত স্বীকারোক্তি অপ্রাসঙ্গিক?',
      options: ['Section 24', 'Section 25', 'Section 27', 'Section 32'],
      ans: 1,
      exp: 'ব্যাখ্যা: ধারা ২৫ অনুযায়ী পুলিশ অফিসারের নিকট প্রদত্ত কোনো কনফেশন আসামীর বিরুদ্ধে প্রমাণ করা যাবে না।',
    },
  ];

  useEffect(() => {
    api.get('/courses')
      .then((res) => {
        if (res.data.ok) setCourses(res.data.courses);
      })
      .catch((err) => console.log('Courses error:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleMcqSelect = (idx) => {
    setSelectedAnswer(idx);
    setShowResult(true);
  };

  const nextMcq = () => {
    setSelectedAnswer(null);
    setShowResult(false);
    setMcqIndex((prev) => (prev + 1) % sampleMcqs.length);
  };

  return (
    <div className="space-y-16 pb-16 animate-fadeIn">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-[#0b1325] to-[#0d172a]">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                ১৮তম BJS ও বার কাউন্সিল অ্যাডভোকেসি স্পেশাল ব্যাচে ভর্তি চলছে!
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                বিচারক ও আইনজীবী হওয়ার <br />
                <span className="text-gradient-gold">স্বপ্নে গড়ি নিশ্চিত সাফল্য</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                বাংলাদেশ জুডিশিয়াল সার্ভিস (BJS) এবং বার কাউন্সিল পরীক্ষায় শীর্ষস্থান অর্জনের জন্য দেশের সেরা বিচারক ও সুপ্রিম কোর্টের সিনিয়র আইনজীবীদের তত্ত্বাবধানে তৈরি পূর্ণাঙ্গ প্রস্তুতি কোর্স।
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => setActivePage('register')}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/25 transition-all hover:scale-105"
                >
                  📝 এখনই ভর্তি হোন (Register Batch)
                </button>
                {user ? (
                  <button
                    onClick={() => setActivePage('dashboard')}
                    className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm transition-all"
                  >
                    🎓 আপনার স্টুডেন্ট ড্যাশবোর্ড
                  </button>
                ) : (
                  <button
                    onClick={() => setActivePage('login')}
                    className="px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm transition-all"
                  >
                    🔑 স্টুডেন্ট লগইন (Login)
                  </button>
                )}
              </div>

              {/* Stat Badges */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800/80">
                <div>
                  <p className="text-2xl font-black text-amber-400 font-mono">1,250+</p>
                  <p className="text-xs text-slate-400 font-medium">সফল বিচারক ও আইনজীবী</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-cyan-400 font-mono">100%</p>
                  <p className="text-xs text-slate-400 font-medium">নিরাপদ ভিডিও লেকচার</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-400 font-mono">24/7</p>
                  <p className="text-xs text-slate-400 font-medium">Gemini AI Legal Helper</p>
                </div>
              </div>
            </div>

            {/* Right MCQ Interactive Card Widget */}
            <div className="lg:col-span-5">
              <div className="glass-card rounded-2xl p-6 shadow-2xl border border-amber-500/20 relative">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-amber-500 text-slate-950 font-bold text-[11px]">
                      LIVE MCQ PRACTICE
                    </span>
                    <span className="text-xs text-slate-400">BJS Preli Model Test</span>
                  </div>
                  <span className="font-mono text-xs text-amber-400">Question {mcqIndex + 1}/{sampleMcqs.length}</span>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-semibold text-white leading-relaxed">
                    {sampleMcqs[mcqIndex].q}
                  </p>

                  <div className="space-y-2">
                    {sampleMcqs[mcqIndex].options.map((opt, idx) => {
                      let btnClass = 'bg-slate-900 border-slate-800 text-slate-200 hover:border-amber-500/50';
                      if (selectedAnswer !== null) {
                        if (idx === sampleMcqs[mcqIndex].ans) {
                          btnClass = 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold';
                        } else if (idx === selectedAnswer) {
                          btnClass = 'bg-rose-950 border-rose-500 text-rose-300';
                        }
                      }
                      return (
                        <button
                          key={idx}
                          onClick={() => handleMcqSelect(idx)}
                          disabled={showResult}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${btnClass}`}
                        >
                          <span>{opt}</span>
                          {selectedAnswer !== null && idx === sampleMcqs[mcqIndex].ans && (
                            <span className="text-emerald-400 font-bold">✓ সঠিক</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {showResult && (
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-slate-300 leading-relaxed animate-fadeIn">
                      <p className="font-bold text-amber-300 mb-1">ব্যাখ্যা (Explanation):</p>
                      <p>{sampleMcqs[mcqIndex].exp}</p>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={nextMcq}
                      className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all"
                    >
                      পরবর্তী প্রশ্ন (Next MCQ) →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Courses Showcase Section */}
      <section id="courses" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">আমাদের প্রিমিয়াম কোর্সসমূহ</h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
            আপনার লক্ষ্য অনুযায়ী কোর্স নির্বাচন করুন এবং সেরা প্রস্তুতি সম্পন্ন করুন
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-amber-400 font-mono animate-pulse">
            কোর্স ডেটা লোড হচ্ছে...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {courses.map((c) => (
              <div key={c.id} className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-bl-xl border-l border-b border-amber-500/30">
                  {c.category || 'Law Course'}
                </div>

                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
                    📚
                  </div>

                  <div>
                    <h3 className="font-extrabold text-white text-lg leading-snug">{c.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description}</p>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                    <p className="flex justify-between">
                      <span className="text-slate-500">ফ্যাকাল্টি:</span>
                      <span className="font-semibold text-slate-200">{c.faculty}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">ক্লাস সিডিউল:</span>
                      <span className="font-mono text-amber-300">{c.schedule}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500">পরবর্তী লাইভ ক্লাস:</span>
                      <span className="font-mono text-emerald-400">{c.nextLive}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400">কোর্স ফি</p>
                    <p className="text-xl font-black text-amber-400 font-mono">৳ {c.price} <span className="text-xs font-normal text-slate-400">BDT</span></p>
                  </div>

                  <button
                    onClick={() => openPaymentModal(c)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold shadow-md transition-all hover:scale-105"
                  >
                    ভর্তি হোন (Enroll)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Unique Security Highlights Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-2xl p-8 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl flex-shrink-0">
              🛡️
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Anti-Screen Capture Security</h4>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                ভিডিও চলাকালীন আপনার নাম ও মোবাইল নম্বর দিয়ে ডায়নামিক ওয়াটারমার্ক স্ক্রিনে ভেসে বেড়াবে।
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center text-2xl flex-shrink-0">
              📲
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">2 Devices Multi-Guard</h4>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                আপনার নিজস্ব সর্বোচ্চ ২টি ডিভাইসে নিরাপদ এক্সেস। অ্যাকাউন্ট শেয়ারিং প্রতিরোধে কঠোর সুরক্ষা।
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-2xl flex-shrink-0">
              🤖
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Gemini AI Legal Helper</h4>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                যেকোনো সময় দেওয়ানী, ফৌজদারী বা দণ্ডবিধির জটিল ধারার তাৎক্ষণিক ব্যাখ্যা নিন AI সহকারী থেকে।
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
