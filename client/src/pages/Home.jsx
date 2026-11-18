import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Home({ setActivePage, openMentorProfile, openVideoModal }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [courseQuery, setCourseQuery] = useState('');
  const query = courseQuery.trim().toLocaleLowerCase();
  const matchingCourses = courses.filter(course =>
    [course.title, course.category, course.faculty].some(value => String(value || '').toLocaleLowerCase().includes(query))
  );
  const [mentors, setMentors] = useState([]);
  const [isMentorsModalOpen, setIsMentorsModalOpen] = useState(false);
  const [enrollModalCourse, setEnrollModalCourse] = useState(null);
  const [courseDetailsModal, setCourseDetailsModal] = useState({ isOpen: false, course: null, lessons: [], loading: false });
  const [toastMsg, setToastMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiSearchInput, setAiSearchInput] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCopyDemoLink = (e, courseId) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const shareUrl = `${window.location.origin}/#demo-video-${courseId}`;
    try {
      navigator.clipboard.writeText(shareUrl);
    } catch (err) {
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    showToast("🔗 ১ম ক্লাসের ফ্রী ডেমো লিংক কপি হয়েছে! শেয়ার করতে পারবেন।");
  };
  const [stats, setStats] = useState({
    studentsCount: 0,
    mentorsCount: 0
  });

  const [siteSettings, setSiteSettings] = useState({
    badgeText: '🔥 ১৮তম BJS ও বার কাউন্সিল অ্যাডভোকেসি স্পেশাল ব্যাচে ভর্তি চলছে!',
    heroTitle: 'বিচারক ও আইনজীবী হওয়ার স্বপ্নে গড়ি নিশ্চিত সাফল্য',
    heroSubtitle: 'বাংলাদেশ জুডিশিয়াল সার্ভিস (BJS) এবং বার কাউন্সিল পরীক্ষায় শীর্ষস্থান অর্জনের জন্য দেশের সেরা বিচারক ও সুপ্রিম কোর্টের সিনিয়র আইনজীবীদের তত্ত্বাবধানে তৈরি পূর্ণাঙ্গ প্রস্তুতি কোর্স।'
  });

  const toEnDigits = (str) => {
    if (!str) return '';
    const bn = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    return String(str).replace(/[০-৯]/g, (d) => bn.indexOf(d));
  };

  const parseLessonNum = (l) => {
    const explicitOrder = (l.order !== undefined && l.order !== null && !isNaN(Number(l.order)) && Number(l.order) > 0)
      ? Number(l.order) : null;
    const rawStr = ((l.title || '') + ' ' + (l.chapter || '') + ' ' + (l.module || '') + ' ' + (l.id || '')).toLowerCase();
    const str = toEnDigits(rawStr);

    if (str.includes('orientation') || str.includes('অরিয়েন্টেশন') || str.includes('ইনট্রো') || str.includes('intro') || str.includes('গাইডলাইন') || str.includes('guideline')) {
      return -1;
    }
    if (/\b(?:fast|first|1st)\b/i.test(str) || str.includes('fast class') || str.includes('first class') || str.includes('১ম') || str.includes('প্রথম')) {
      return 1;
    }
    if (/\b(?:2nd|second|secend)\b/i.test(str) || str.includes('2nd class') || str.includes('second class') || str.includes('২য়') || str.includes('দ্বিতীয়')) {
      return 2;
    }
    if (/\b(?:3rd|third)\b/i.test(str) || str.includes('3rd class') || str.includes('৩য়') || str.includes('তৃতীয়')) {
      return 3;
    }
    if (/\b(?:4th|fourth|forth)\b/i.test(str) || str.includes('৪র্থ') || str.includes('চতুর্থ')) {
      return 4;
    }
    const bnOrdinals = [
      { num: 5, words: ['5th', 'fifth', '৫ম', 'পঞ্চম'] },
      { num: 6, words: ['6th', 'sixth', '৬ষ্ঠ', 'ষষ্ঠ'] },
      { num: 7, words: ['7th', 'seventh', '৭ম', 'সপ্তম'] },
      { num: 8, words: ['8th', 'eighth', '৮ম', 'অষ্টম'] },
      { num: 9, words: ['9th', 'ninth', '৯ম', 'নবম'] },
      { num: 10, words: ['10th', 'tenth', '১০ম', 'দশম'] },
      { num: 11, words: ['11th', '১১তম'] },
      { num: 12, words: ['12th', '১২তম'] },
      { num: 13, words: ['13th', '১৩তম'] },
      { num: 14, words: ['14th', '১৪তম'] },
      { num: 15, words: ['15th', '১৫তম'] },
    ];
    for (const item of bnOrdinals) {
      if (item.words.some(w => str.includes(w))) return item.num;
    }
    const prefixMatch = str.match(/(?:class|lecture|lesson|module|video|part|পর্ব|ক্লাস|পাঠ|লেকচার|অধ্যায়|\#)[-_\s]*(\d+)/i);
    if (prefixMatch) return parseInt(prefixMatch[1], 10);
    const ordinalMatch = str.match(/(\d+)\s*(?:st|nd|rd|th|ম|য়|র্থ|ষ্ঠ|তম)/i);
    if (ordinalMatch) return parseInt(ordinalMatch[1], 10);
    if (explicitOrder !== null) return explicitOrder;
    const allNums = [...str.matchAll(/\b(\d+)\b/g)].map(m => parseInt(m[1], 10));
    const candidateNums = allNums.filter(n => n < 1800 || n > 2099);
    if (candidateNums.length > 0) return candidateNums[0];
    return 999999;
  };

  const sortLessons = (list) => {
    return [...(list || [])].sort((a, b) => {
      const numA = parseLessonNum(a);
      const numB = parseLessonNum(b);
      if (numA !== numB) return numA - numB;
      const dateA = new Date(a.createdAt || a.releaseDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.releaseDate || 0).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (a.title || '').localeCompare(b.title || '');
    });
  };

  const handleOpenCourseDetails = async (c) => {
    setCourseDetailsModal({ isOpen: true, course: c, lessons: [], loading: true });
    try {
      const res = await api.get(`/lessons?courseId=${c.id}`);
      if (res.data && res.data.ok) {
        const sorted = sortLessons(res.data.lessons || []);
        setCourseDetailsModal({ isOpen: true, course: c, lessons: sorted, loading: false });
      } else {
        setCourseDetailsModal({ isOpen: true, course: c, lessons: [], loading: false });
      }
    } catch (err) {
      console.error("Error loading course lessons:", err);
      setCourseDetailsModal({ isOpen: true, course: c, lessons: [], loading: false });
    }
  };

  useEffect(() => {
    let isMounted = true;
    api.get('/home-data')
      .then((res) => {
        if (!isMounted || !res.data || !res.data.ok) return;
        const data = res.data;
        if (Array.isArray(data.courses)) {
          const activeOnly = data.courses.filter(c => c.status !== 'Inactive' && c.status !== 'Hidden');
          setCourses(activeOnly);
        }
        if (Array.isArray(data.mentors)) {
          setMentors(data.mentors);
        }
        if (data.stats) {
          setStats({
            studentsCount: data.stats.studentsCount || 0,
            mentorsCount: data.stats.mentorsCount || 0
          });
        }
        if (data.settings) {
          setSiteSettings(prev => ({
            badgeText: data.settings.badgeText || prev.badgeText,
            heroTitle: data.settings.heroTitle || prev.heroTitle,
            heroSubtitle: data.settings.heroSubtitle || prev.heroSubtitle
          }));
        }
      })
      .catch(() => {
        // Fallback to separate endpoints if /home-data is not reachable
        api.get('/courses').then(res => {
          if (isMounted && res.data?.ok && Array.isArray(res.data.courses)) {
            setCourses(res.data.courses.filter(c => c.status !== 'Inactive' && c.status !== 'Hidden'));
          }
        }).catch(() => {});
        api.get('/mentors').then(res => {
          if (isMounted && res.data?.ok) setMentors(res.data.mentors || []);
        }).catch(() => {});
        api.get('/public-stats').then(res => {
          if (isMounted && res.data?.ok) {
            setStats({
              studentsCount: res.data.studentsCount || 0,
              mentorsCount: res.data.mentorsCount || 0
            });
          }
        }).catch(() => {});
        api.get('/site-settings').then(res => {
          if (isMounted && res.data?.ok && res.data.settings) {
            setSiteSettings(prev => ({
              badgeText: res.data.settings.badgeText || prev.badgeText,
              heroTitle: res.data.settings.heroTitle || prev.heroTitle,
              heroSubtitle: res.data.settings.heroSubtitle || prev.heroSubtitle
            }));
          }
        }).catch(() => {});
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-16 pb-16 animate-fadeIn">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-bounceIn max-w-md w-full px-4">
          <div className="p-4 rounded-2xl bg-cyan-950/95 border border-cyan-400 text-cyan-200 text-xs font-bold shadow-2xl flex items-center justify-between gap-3 backdrop-blur-xl">
            <span>{toastMsg}</span>
            <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
          </div>
        </div>
      )}
      <section className="library-masthead">
        <div className="masthead-inner">
          {siteSettings.badgeText && <p className="admission-note">{siteSettings.badgeText}</p>}
          <h1>{siteSettings.heroTitle}</h1>
          <p className="masthead-intro">{siteSettings.heroSubtitle}</p>
          <form className="course-finder" onSubmit={event => {
            event.preventDefault();
            document.getElementById('courses')?.scrollIntoView({behavior:'smooth'});
          }}>
            <Search size={21} aria-hidden="true" />
            <input aria-label="কোর্স খুঁজুন" type="search" placeholder="কোর্স, বিষয় বা মেন্টরের নাম" value={courseQuery} onChange={event => setCourseQuery(event.target.value)} />
            <button type="submit">কোর্স খুঁজুন</button>
          </form>
          <div className="masthead-links">
            <button onClick={() => setActivePage(user ? ((user.isAdmin || user.role === 'admin') ? 'admin' : (user.isMentor || user.role === 'mentor') ? 'mentor-dashboard' : 'dashboard') : 'login')}>{user ? 'আমার ড্যাশবোর্ড' : 'স্টুডেন্ট লগইন'} ↗</button>
            {!user && <button onClick={() => setActivePage('register')}>নিবন্ধন ↗</button>}
            <button onClick={() => setIsMentorsModalOpen(true)}>মেন্টর পরিচিতি ↗</button>
            {stats.studentsCount > 0 && <span>{stats.studentsCount.toLocaleString('bn-BD')} জন শিক্ষার্থী</span>}
          </div>
        </div>
      </section>



      {/* Courses Showcase Section */}
      <section id="courses" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">কোর্সসমূহ</h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
            ক্লাসের সময়সূচি, মেন্টর ও কোর্স ফি দেখে বেছে নিন।
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-amber-400 font-mono animate-pulse">
            কোর্স ডেটা লোড হচ্ছে...
          </div>
        ) : (
          <div className="catalog-list">
            {matchingCourses.map(c => (
              <article key={c.id} className="catalog-entry">
                <div className="catalog-title">
                  {c.category && <small>{c.category}</small>}
                  <h3><button onClick={() => handleOpenCourseDetails(c)}>{c.title}</button></h3>
                  <p>{c.description}</p>
                </div>
                <dl>
                  {[[ 'মেন্টর',c.faculty ],['ক্লাসের সময়',c.schedule],['পরবর্তী ক্লাস',c.nextLive]].filter(([,value]) => value).map(([label,value]) =>
                    <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                  )}
                </dl>
                <div className="catalog-enroll"><strong>৳ {c.price}</strong><button onClick={() => setEnrollModalCourse(c)}>ভর্তি হোন</button></div>
                <footer>
                  <button onClick={() => handleOpenCourseDetails(c)}>সিলেবাস ও ফ্রি ভিডিও ↗</button>
                  {c.schedulePdfUrl && <a href={c.schedulePdfUrl} target="_blank" rel="noopener noreferrer" download="Class-Schedule.pdf">সময়সূচি PDF ↓</a>}
                  <button onClick={event => handleCopyDemoLink(event,c.id)}>ডেমো লিংক কপি</button>
                </footer>
              </article>
            ))}
            {matchingCourses.length === 0 && <p role="status">{query ? 'এই নামে কোনো কোর্স পাওয়া যায়নি।' : 'এখন কোনো কোর্স প্রদর্শনের জন্য নেই।'}</p>}
            {query && <button className="catalog-reset" onClick={() => setCourseQuery('')}>সব কোর্স দেখুন</button>}
          </div>
        )}
      </section>
      <section aria-label="আইন সহকারী" className="assistant-search-section">
          {/* AI Instant Legal & Section Search Bar */}
          <div className="hero-search w-full max-w-2xl mx-auto my-6 p-2 rounded-2xl bg-gradient-to-r from-slate-900/95 via-[#0d1c38]/95 to-slate-900/95 border border-cyan-500/35 shadow-2xl shadow-cyan-950/40 backdrop-blur-md text-left">
            <h2 className="mb-4 text-xl font-bold text-white">আইন সহকারীকে প্রশ্ন করুন</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = aiSearchInput.trim();
                if (q && window.askLegalAi) {
                  window.askLegalAi(q);
                  setAiSearchInput('');
                }
              }}
              className="flex items-center gap-2"
            >
              <div className="pl-3 text-cyan-400 text-base sm:text-lg shrink-0">⚡</div>
              <input
                type="text"
                value={aiSearchInput}
                onChange={(e) => setAiSearchInput(e.target.value)}
                placeholder="আইনের যেকোনো ধারা বা প্রশ্ন লিখুন (যেমন: ৩০২ ধারা, ৫৪ ধারা, BJS, বার কাউন্সিল, জামিন)..."
                className="flex-1 bg-transparent border-0 text-white placeholder-slate-400 text-xs sm:text-sm px-1 py-1.5 focus:outline-none"
              />
              <button
                type="submit"
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>AI উত্তর পান</span>
                <span>🤖</span>
              </button>
            </form>

            {/* Clickable Quick Keyword & Section Chips */}
            <details className="query-shortcuts"><summary>প্রশ্নের বিষয় বেছে নিন</summary><div className="flex flex-wrap gap-2 pt-3">

              {[
                { label: '🏛️ BJS প্রস্তুতি', q: 'সহকারী জজ (BJS) পরীক্ষার প্রিলিমিনারি ও লিখিত সিলেবাস এবং প্রস্তুতি কৌশল' },
                { label: '📋 বার কাউন্সিল MCQ', q: 'বার কাউন্সিল অ্যাডভোকেটশিপ এমসিকিউ পরীক্ষার পাস মার্কস ও গুরুত্বপূর্ণ বিষয়' },
                { label: '⚖️ ৩০২ ধারা', q: 'দণ্ডবিধি ৩০২ ধারা ও খুনের শাস্তির উপাদান কি কি?' },
                { label: '🚨 ৫৪ ধারা', q: 'ফৌজদারী কার্যবিধি ৫৪ ধারায় পরোয়ানা ছাড়া গ্রেফতারের নিয়ম কি?' },
                { label: '🛡️ ৪৯৭ ধারা (জামিন)', q: 'CrPC Section 497 জামিনের দরখাস্ত ও জামিন মঞ্জুরের নিয়ম' },
                { label: '📜 ১০২ অনুচ্ছেদ (রিট)', q: 'বাংলাদেশ সংবিধানের ১০২ অনুচ্ছেদে রিট পিটিশন করার নিয়ম' },
                { label: '📑 দেওয়ানী ১৪৪ ধারা', q: 'দেওয়ানী কার্যবিধি ১৪৪ ধারা Restitution বা পুনঃস্থাপন কি?' },
                { label: '⏱️ তামাদি ৫ ধারা', q: 'তামাদি আইন ৫ ধারা বিলম্ব মার্জনা (Condonation of Delay)' }
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (window.askLegalAi) window.askLegalAi(chip.q);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-800/90 hover:bg-cyan-950 hover:border-cyan-500/50 hover:text-cyan-300 border border-slate-700/60 text-slate-300 transition-all text-[10px] font-medium cursor-pointer active:scale-95"
                >
                  {chip.label}
                </button>
              ))}
            </div></details>
          </div>

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

      {/* Course Details & Public Syllabus Video Preview Modal */}
      {courseDetailsModal.isOpen && courseDetailsModal.course && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-xs">
            <button
              onClick={() => setCourseDetailsModal({ isOpen: false, course: null, lessons: [], loading: false })}
              className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm border border-slate-700 cursor-pointer"
            >
              ✕
            </button>

            {/* Header Metadata */}
            <div className="space-y-2 border-b border-slate-800 pb-4 pr-8">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-[11px] font-bold rounded-lg border border-amber-500/30 inline-block font-mono">
                {courseDetailsModal.course.category || 'Law Course'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">{courseDetailsModal.course.title}</h2>
              <p className="text-xs text-slate-300 leading-relaxed">{courseDetailsModal.course.description}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-xs text-slate-300 font-medium">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">ফ্যাকাল্টি শিক্ষক</span>
                  <span className="font-bold text-amber-400">{courseDetailsModal.course.faculty}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">ক্লাস সিডিউল</span>
                  <span className="font-bold text-emerald-400 font-mono">{courseDetailsModal.course.schedule}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-slate-500 block text-[10px]">কোর্স ফি</span>
                  <span className="font-extrabold text-amber-300 text-sm font-mono">৳ {courseDetailsModal.course.price} BDT</span>
                </div>
              </div>

              {courseDetailsModal.course.schedulePdfUrl && (
                <div className="pt-2">
                  <a
                    href={courseDetailsModal.course.schedulePdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download="Class-Schedule.pdf"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <span>📅</span>
                    <span>ক্লাস শিডিউল ডাউনলোড করুন (Class Schedule PDF)</span>
                    <span className="text-[10px] bg-slate-950/25 px-1.5 py-0.5 rounded font-mono font-bold">ডাউনলোড</span>
                  </a>
                </div>
              )}
            </div>

            {/* Course Modules & Lesson List */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>📚 কোর্স পাঠ্যক্রম ও ভিডিও ক্লাস তালিকা (Syllabus)</span>
                </h3>
                <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  🎁 ১ম ভিডিওটি সবার জন্য ১00% ফ্রী আনলকড্
                </span>
              </div>

              {courseDetailsModal.loading ? (
                <div className="text-center py-10 text-amber-400 font-mono animate-pulse">
                  ক্লাস তালিকা লোড হচ্ছে...
                </div>
              ) : courseDetailsModal.lessons.length === 0 ? (
                <div className="text-center py-8 bg-slate-950 rounded-2xl border border-slate-800 text-slate-400">
                  এই কোর্সের ভিডিও ক্লাসগুলো শীঘ্রই আপলোড করা হবে।
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                  {courseDetailsModal.lessons.map((l, index) => {
                    const isOrientation = (
                      (l.title || '').toLowerCase().includes('orientation') ||
                      (l.title || '').includes('অরিয়েন্টেশন') ||
                      (l.title || '').toLowerCase().includes('intro') ||
                      (l.title || '').includes('ইনট্রো')
                    );
                    const isFirstVideo = (index === 0);
                    const isFreeDemo = isOrientation || isFirstVideo;
                    const hasVideo = Boolean(l.youtubeId || l.youtubeUrl);

                    const orientationCountBefore = courseDetailsModal.lessons.slice(0, index).filter(item => {
                      const t = ((item.title || '') + ' ' + (item.module || '')).toLowerCase();
                      return t.includes('orientation') || t.includes('অরিয়েন্টেশন') || t.includes('intro') || t.includes('ইনট্রো');
                    }).length;
                    const regularClassNum = Math.max(1, index + 1 - orientationCountBefore);

                    return (
                      <div
                        key={l.id || index}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isFreeDemo
                            ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-100'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                              isFreeDemo
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono'
                                : 'bg-slate-800 text-slate-400 border-slate-700 font-mono'
                            }`}>
                              {isOrientation ? '🎁 Orientation Class (Free Demo)' : isFirstVideo ? '🎁 Class #1 (Free Demo Unlocked)' : `🔒 Class #${regularClassNum} (Locked)`}
                            </span>
                            {l.duration && <span className="font-mono text-[10px] text-slate-400">⏱️ {l.duration}</span>}
                          </div>
                          <h4 className="font-bold text-white text-sm">{l.title}</h4>
                          {l.description && <p className="text-xs text-slate-400">{l.description}</p>}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isFreeDemo && hasVideo ? (
                            <>
                              <button
                                onClick={() => {
                                  if (openVideoModal) openVideoModal(l);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-xs shadow-md hover:from-emerald-400 hover:to-teal-400 transition-all hover:scale-105 cursor-pointer"
                              >
                                ▶️ ফ্রী ডেমো প্লে করুন
                              </button>
                              <button
                                onClick={(e) => handleCopyDemoLink(e, courseDetailsModal.course.id)}
                                className="px-3 py-1.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                title="এই ১টি ফ্রী ডেমো ক্লাসের ডিরেক্ট শেয়ারেবল লিংক কপি করুন"
                              >
                                <span>🔗 ডেমো লিংক কপি</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setCourseDetailsModal({ isOpen: false, course: null, lessons: [], loading: false });
                                setEnrollModalCourse(courseDetailsModal.course);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer"
                            >
                              🔒 লকড (ভর্তি আবশ্যক)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Action Footer */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-slate-400 text-xs">
                সকল ক্লাস আনলক করতে ও পরীক্ষায় অংশগ্রহণ করতে এখনই ভর্তি সম্পূর্ণ করুন।
              </p>
              <button
                onClick={() => {
                  const c = courseDetailsModal.course;
                  setCourseDetailsModal({ isOpen: false, course: null, lessons: [], loading: false });
                  setEnrollModalCourse(c);
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer"
              >
                📝 এই কোর্সে ভর্তি হোন (Enroll Now)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
