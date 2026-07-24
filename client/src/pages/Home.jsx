import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Home({ setActivePage, openPaymentModal }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    studentsCount: 0,
    mentorsCount: 0
  });

  const [siteSettings, setSiteSettings] = useState({
    badgeText: '১৮তম BJS ও বার কাউন্সিল অ্যাডভোকেসি স্পেশাল ব্যাচে ভর্তি চলছে!',
    heroTitle: 'বিচারক ও আইনজীবী হওয়ার স্বপ্নে গড়ি নিশ্চিত সাফল্য',
    heroSubtitle: 'বাংলাদেশ জুডিশিয়াল সার্ভিস (BJS) এবং বার কাউন্সিল পরীক্ষায় শীর্ষস্থান অর্জনের জন্য দেশের সেরা বিচারক ও সুপ্রিম কোর্টের সিনিয়র আইনজীবীদের তত্ত্বাবধানে তৈরি পূর্ণাঙ্গ প্রস্তুতি কোর্স।'
  });

  useEffect(() => {
    api.get('/courses')
      .then((res) => {
        if (res.data.ok) setCourses(res.data.courses);
      })
      .catch((err) => console.log('Courses error:', err))
      .finally(() => setLoading(false));

    api.get('/public-stats')
      .then((res) => {
        if (res.data.ok) {
          setStats({
            studentsCount: res.data.studentsCount || 0,
            mentorsCount: res.data.mentorsCount || 0
          });
        }
      })
      .catch((err) => console.log('Public stats error:', err));

    api.get('/site-settings')
      .then((res) => {
        if (res.data.ok && res.data.settings) {
          setSiteSettings(res.data.settings);
        }
      })
      .catch((err) => console.log('Site settings error:', err));
  }, []);

  return (
    <div className="space-y-16 pb-16 animate-fadeIn">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-[#0b1325] to-[#0d172a]">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          {siteSettings.badgeText && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              {siteSettings.badgeText}
            </div>
          )}

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight whitespace-pre-line">
            {siteSettings.heroTitle}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {siteSettings.heroSubtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
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

          {/* Dynamic 4 Stat Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80 max-w-3xl mx-auto">
            <div>
              <p className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                {stats.studentsCount > 0 ? `${stats.studentsCount}+` : '0+'}
              </p>
              <p className="text-xs text-slate-400 font-medium">নিবন্ধিত শিক্ষার্থী</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">
                {stats.mentorsCount > 0 ? `${stats.mentorsCount}+` : '1+'}
              </p>
              <p className="text-xs text-slate-400 font-medium">অভিজ্ঞ মেন্টর ও শিক্ষক</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">100%</p>
              <p className="text-xs text-slate-400 font-medium">নিরাপদ ভিডিও লেকচার</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">24/7</p>
              <p className="text-xs text-slate-400 font-medium">Gemini AI Legal Helper</p>
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
