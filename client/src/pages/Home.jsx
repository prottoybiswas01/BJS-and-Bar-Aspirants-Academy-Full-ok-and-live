import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Home({ setActivePage, openMentorProfile }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [isMentorsModalOpen, setIsMentorsModalOpen] = useState(false);
  const [enrollModalCourse, setEnrollModalCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    studentsCount: 0,
    mentorsCount: 0
  });

  const [siteSettings, setSiteSettings] = useState({
    badgeText: '🔥 ১৮তম BJS ও বার কাউন্সিল অ্যাডভোকেসি স্পেশাল ব্যাচে ভর্তি চলছে!',
    heroTitle: 'বিচারক ও আইনজীবী হওয়ার স্বপ্নে গড়ি নিশ্চিত সাফল্য',
    heroSubtitle: 'বাংলাদেশ জুডিশিয়াল সার্ভিস (BJS) এবং বার কাউন্সিল পরীক্ষায় শীর্ষস্থান অর্জনের জন্য দেশের সেরা বিচারক ও সুপ্রিম কোর্টের সিনিয়র আইনজীবীদের তত্ত্বাবধানে তৈরি পূর্ণাঙ্গ প্রস্তুতি কোর্স।'
  });

  useEffect(() => {
    api.get('/courses')
      .then((res) => {
        if (res.data.ok && Array.isArray(res.data.courses)) {
          const activeOnly = res.data.courses.filter(c => c.status !== 'Inactive' && c.status !== 'Hidden');
          setCourses(activeOnly);
        } else {
          setCourses([]);
        }
      })
      .catch((err) => {
        console.log('Courses error:', err);
        setCourses([]);
      })
      .finally(() => setLoading(false));

    api.get('/mentors')
      .then((res) => {
        if (res.data.ok) setMentors(res.data.mentors || []);
      })
      .catch((err) => console.log('Mentors fetch error:', err));

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
          setSiteSettings(prev => ({
            badgeText: res.data.settings.badgeText || prev.badgeText,
            heroTitle: res.data.settings.heroTitle || prev.heroTitle,
            heroSubtitle: res.data.settings.heroSubtitle || prev.heroSubtitle
          }));
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
          {(siteSettings.badgeText || '🔥 ১৮তম বিজিএস ও বার কাউন্সিল স্পেশাল ব্যাচে ভর্তি চলছে') && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] sm:text-xs font-semibold max-w-full text-center leading-snug">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0"></span>
              <span className="line-clamp-2">{siteSettings.badgeText || '🔥 ১৮তম বিজিএস ও বার কাউন্সিল স্পেশাল ব্যাচে ভর্তি চলছে'}</span>
            </div>
          )}

          <h1 className="text-2xl sm:text-5xl font-extrabold text-white tracking-tight leading-snug sm:leading-tight whitespace-pre-line">
            {siteSettings.heroTitle || "BJS & Bar Aspirants Academy\nJudiciary & Advocacy Excellence Portal"}
          </h1>

          <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {siteSettings.heroSubtitle || "বাংলাদেশের অন্যতম প্রধান আইন একাডেমিতে আপনাকে স্বাগতম। জুডিশিয়ারি ও বার কাউন্সিল প্রস্তুতির সেরা গাইডলাইন।"}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-2 w-full max-w-md sm:max-w-none mx-auto">
            {user ? (
              <>
                <button
                  onClick={() => {
                    if (user.isAdmin || user.role === 'admin') setActivePage('admin');
                    else if (user.isMentor || user.role === 'mentor') setActivePage('mentor-dashboard');
                    else setActivePage('dashboard');
                  }}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {(user.isAdmin || user.role === 'admin')
                    ? '🛡️ আপনার এডমিন ড্যাশবোর্ড (Admin Panel)'
                    : (user.isMentor || user.role === 'mentor')
                    ? '👨‍🏫 আপনার মেন্টর ড্যাশবোর্ড (Mentor Dashboard)'
                    : '🎓 আপনার স্টুডেন্ট ড্যাশবোর্ড (Student Dashboard)'}
                </button>
                <a
                  href="#courses"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm transition-all text-center"
                >
                  📚 কোর্সসমূহ দেখুন (View Courses)
                </a>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActivePage('register')}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/25 transition-all active:scale-95"
                >
                  📝 এখনই ভর্তি হোন (Register Batch)
                </button>
                <button
                  onClick={() => setActivePage('login')}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm transition-all"
                >
                  🔑 স্টুডেন্ট লগইন (Login)
                </button>
              </>
            )}
          </div>

          {/* Dynamic 4 Stat Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80 max-w-3xl mx-auto">
            <div>
              <p className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                {stats.studentsCount > 0 ? `${stats.studentsCount}+` : '3+'}
              </p>
              <p className="text-xs text-slate-400 font-medium">নিবন্ধিত শিক্ষার্থী</p>
            </div>

            {/* Clickable Mentors Stat Card */}
            <div
              onClick={() => setIsMentorsModalOpen(true)}
              className="p-2 rounded-xl bg-purple-950/20 border border-purple-500/30 hover:border-purple-400/60 hover:bg-purple-900/30 transition-all cursor-pointer group shadow-lg"
              title="মাননীয় বিচারক ও মেন্টরদের প্রোফাইল দেখতে ক্লিক করুন"
            >
              <p className="text-2xl sm:text-3xl font-black text-purple-400 font-mono group-hover:scale-105 transition-transform flex items-center justify-center gap-1">
                <span>{mentors.length > 0 ? `${mentors.length}+` : (stats.mentorsCount > 0 ? `${stats.mentorsCount}+` : '1+')}</span>
                <span className="text-xs opacity-75">🔍</span>
              </p>
              <p className="text-xs text-purple-300 font-bold group-hover:text-white transition-colors">
                অভিজ্ঞ মেন্টর ও শিক্ষক
              </p>
              <span className="text-[9px] text-purple-400/80 block mt-0.5 font-mono">
                (প্রোফাইল দেখতে ক্লিক করুন)
              </span>
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
                    onClick={() => setEnrollModalCourse(c)}
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

      {/* Course Enrollment WhatsApp Notice Modal */}
      {enrollModalCourse && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-5 text-center text-xs">
            <button
              onClick={() => setEnrollModalCourse(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm"
            >
              ✕
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-amber-500/10">
              📱
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">কোর্সে ভর্তির অফিশিয়াল নির্দেশনা</h3>
              <p className="text-xs text-amber-300 font-bold">{enrollModalCourse.title}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed text-left">
              <p className="font-bold text-amber-400 flex items-center gap-1.5">
                <span>⚠️</span> সার্ভিস নোটিশ:
              </p>
              <p>
                অনলাইন সয়ংক্রিয় পেমেন্ট সিস্টেমটি আপাতত বন্ধ রয়েছে। কোর্সে ভর্তি নিশ্চিত করতে ও ক্লাসের এক্সেস পেতে সরাসরি আমাদের অফিশিয়াল <strong>WhatsApp</strong> নম্বরে যোগাযোগ করুন বা সরাসরি কল দিন।
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <a
                href="https://wa.me/8801800077663"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02]"
              >
                <span>💬</span> WhatsApp-এ সরাসরি যোগাযোগ করুন (01800077663)
              </a>

              <button
                onClick={() => {
                  setEnrollModalCourse(null);
                  setActivePage('register');
                }}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
              >
                📝 নতুন একাউন্ট রেজিস্ট্রেশন ফরমটি পূরণ করুন
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Mentors & Faculty Modal */}
      {isMentorsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-card rounded-2xl p-6 sm:p-8 border border-purple-500/30 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-6 bg-[#0b1325] text-slate-100 font-sans">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-2xl shadow-lg">
                  ⚖️
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white">
                    আইন পাঠশালার মাননীয় মেন্টর ও শিক্ষকবৃন্দ
                  </h2>
                  <p className="text-xs text-purple-300 font-medium">
                    BJS বিচারক, সুপ্রিম কোর্টের সিনিয়র আইনজীবী ও বিষয়ভিত্তিক অভিজ্ঞ মেন্টরগণ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMentorsModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-lg font-bold transition-all border border-slate-700 shadow-md"
              >
                ✕
              </button>
            </div>

            {/* Mentors List Cards Grid */}
            {mentors.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto text-2xl font-bold border border-purple-500/20">
                  ⚖️
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-white">বর্তমানে কোনো মেন্টরের তথ্য যুক্ত করা হয়নি</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    অ্যাডমিন প্যানেলের <strong>"মেন্টর ও শিক্ষক ব্যবস্থাপনা"</strong> থেকে মেন্টর বা শিক্ষকের প্রোফাইল যুক্ত করা হলে তা এখানে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mentors.map((m) => (
                  <div key={m.id} className="p-5 rounded-2xl bg-slate-900/90 border border-purple-500/25 hover:border-purple-400/50 space-y-3 transition-all shadow-lg hover:shadow-purple-950/40">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-950 to-indigo-900 border border-purple-500/40 text-purple-300 font-bold flex items-center justify-center text-2xl shrink-0 overflow-hidden shadow-md">
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" />
                        ) : (
                          '⚖️'
                        )}
                      </div>
                      <div className="space-y-1 flex-1">
                        <h4 className="font-extrabold text-white text-base leading-snug">{m.name}</h4>
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-extrabold border border-purple-500/30">
                          {m.designation}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
                      <p className="text-slate-300 flex items-start gap-2">
                        <span className="text-purple-400 font-bold shrink-0">📍 পোস্টিং:</span>
                        <span className="font-medium text-slate-200">{m.posting}</span>
                      </p>
                      <p className="text-slate-300 flex items-start gap-2">
                        <span className="text-amber-400 font-bold shrink-0">📖 বিষয়:</span>
                        <span className="font-medium text-slate-200">{m.expertise}</span>
                      </p>
                      {m.showPhone && m.phone && (
                        <p className="text-slate-300 flex items-center gap-2 pt-1 font-mono text-[11px]">
                          <span className="text-emerald-400 font-bold shrink-0">📞 যোগাযোগ:</span>
                          <span className="text-emerald-300 font-bold">{m.phone}</span>
                        </p>
                      )}
                      {m.bio && (
                        <p className="text-[11px] text-slate-400 italic pt-1 leading-relaxed border-t border-slate-800/50 mt-1">
                          "{m.bio}"
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openMentorProfile && openMentorProfile(m)}
                        className="w-full px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 cursor-pointer"
                      >
                        <span>⚖️</span> ফুল জুডিশিয়াল প্রোফাইল ও শেয়ার লিংক
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsMentorsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 shadow-md"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
