import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Footer({ setActivePage, activePage }) {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user && (user.id || user.regId || user.email));
  const isHomePage = !activePage || activePage === 'home';

  // Only show courses & important links when visitor is on the public home page and not logged in
  const showCoursesAndLinks = !isLoggedIn && isHomePage;

  const [activeCourses, setActiveCourses] = useState([]);

  useEffect(() => {
    if (!showCoursesAndLinks) return;
    let isMounted = true;

    api.get('/home-data')
      .then((res) => {
        if (!isMounted || !res.data?.ok) return;
        if (Array.isArray(res.data.courses)) {
          const active = res.data.courses.filter(
            (c) => c.status !== 'Inactive' && c.status !== 'Hidden'
          );
          setActiveCourses(active.slice(0, 4));
        }
      })
      .catch(() => {
        api.get('/courses')
          .then((res) => {
            if (!isMounted || !res.data?.ok) return;
            if (Array.isArray(res.data.courses)) {
              const active = res.data.courses.filter(
                (c) => c.status !== 'Inactive' && c.status !== 'Hidden'
              );
              setActiveCourses(active.slice(0, 4));
            }
          })
          .catch(() => {});
      });

    return () => {
      isMounted = false;
    };
  }, [showCoursesAndLinks]);

  const handleCourseClick = (e) => {
    e.preventDefault();
    if (setActivePage) setActivePage('home');
    setTimeout(() => {
      const el = document.getElementById('courses');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <footer className="w-full bg-[#070d1a] border-t border-slate-800/80 pt-12 pb-8 text-slate-400 text-sm">
      <div
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 ${
          showCoursesAndLinks ? 'md:grid-cols-4' : 'md:grid-cols-2'
        } gap-8 mb-8`}
      >
        {/* Brand / Academy Info */}
        <div className={!showCoursesAndLinks ? 'max-w-md' : ''}>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
              ⚖️
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">BJS & Bar Academy</h3>
              <p className="text-xs text-amber-400">আইন পাঠশালা</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            বাংলাদেশ জুডিশিয়াল সার্ভিস (BJS) এবং বার কাউন্সিল অ্যাডভোকেসি পরীক্ষার প্রস্তুতির একমাত্র বিশ্বস্ত প্রিমিয়াম প্ল্যাটফর্ম।
          </p>
        </div>

        {/* Dynamic Courses (Shown ONLY to visitors on Public Home Page) */}
        {showCoursesAndLinks && (
          <div>
            <h4 className="text-white font-bold mb-3 text-sm">কোর্সসমূহ (Courses)</h4>
            <ul className="space-y-2 text-xs">
              {activeCourses.length > 0 ? (
                activeCourses.map((c) => (
                  <li key={c.id || c._id || c.title}>
                    <a
                      href="#courses"
                      onClick={handleCourseClick}
                      className="hover:text-amber-400 transition-colors line-clamp-1 block"
                      title={c.title}
                    >
                      {c.title}
                    </a>
                  </li>
                ))
              ) : (
                <>
                  <li><a href="#courses" onClick={handleCourseClick} className="hover:text-amber-400 block">18th BJS Preliminary Intensive</a></li>
                  <li><a href="#courses" onClick={handleCourseClick} className="hover:text-amber-400 block">Bar Council Enrolment Masterclass</a></li>
                  <li><a href="#courses" onClick={handleCourseClick} className="hover:text-amber-400 block">Civil Laws Module (CPC & SRA)</a></li>
                  <li><a href="#courses" onClick={handleCourseClick} className="hover:text-amber-400 block">Criminal Laws Module (CrPC & Penal Code)</a></li>
                </>
              )}
            </ul>
          </div>
        )}

        {/* Important Links (Shown ONLY to visitors on Public Home Page) */}
        {showCoursesAndLinks && (
          <div>
            <h4 className="text-white font-bold mb-3 text-sm">গুরুত্বপূর্ণ লিঙ্ক</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setActivePage('register')} className="hover:text-amber-400 text-left transition-colors">
                  নতুন রেজিস্ট্রেশন (Batch Select)
                </button>
              </li>
              <li>
                <button onClick={() => setActivePage('login')} className="hover:text-amber-400 text-left transition-colors">
                  স্টুডেন্ট লগইন (Student Login)
                </button>
              </li>
              <li>
                <button onClick={() => setActivePage('dashboard')} className="hover:text-amber-400 text-left transition-colors">
                  ক্লাস ও ভিডিও মডিউল
                </button>
              </li>
              <li>
                <button onClick={() => setActivePage('home')} className="hover:text-amber-400 text-left transition-colors">
                  হোম পেজ (Home)
                </button>
              </li>
            </ul>
          </div>
        )}

        {/* Helpline & Contact */}
        <div className={!showCoursesAndLinks ? 'md:text-right md:flex md:flex-col md:items-end' : ''}>
          <h4 className="text-white font-bold mb-3 text-sm">যোগাযোগ (Helpline)</h4>
          <div className={`space-y-2 text-xs ${!showCoursesAndLinks ? 'md:text-right' : ''}`}>
            <p className={`flex items-center gap-1.5 text-slate-300 font-medium ${!showCoursesAndLinks ? 'md:justify-end' : ''}`}>
              <span>🌐</span> অনলাইন কোচিং সেন্টার
            </p>
            <p>
              💬 WhatsApp & Call:{" "}
              <a
                href="https://wa.me/8801800077663"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-emerald-400 font-mono font-bold transition-colors"
              >
                01800077663
              </a>
            </p>
            <p>📧 Email: support@bjsbaracademy.com</p>
            <p className={`mt-2 text-[11px] text-emerald-400 flex items-center gap-1 ${!showCoursesAndLinks ? 'md:justify-end' : ''}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              24/7 Academic Support Active
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 border-t border-slate-800/60 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
        <p>© 2026 BJS & Bar Aspirants Academy. All Rights Reserved.</p>
        <p className="mt-2 md:mt-0 font-mono text-[11px]">Protected by Anti-Screen Recording Dynamic Watermark & Device Guard</p>
      </div>
    </footer>
  );
}
