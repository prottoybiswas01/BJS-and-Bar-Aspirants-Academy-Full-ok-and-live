import React from 'react';

export default function Footer({ setActivePage }) {
  return (
    <footer className="w-full bg-[#070d1a] border-t border-slate-800/80 pt-12 pb-8 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div>
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

        <div>
          <h4 className="text-white font-bold mb-3 text-sm">কোর্সসমূহ (Courses)</h4>
          <ul className="space-y-2 text-xs">
            <li><a href="#courses" onClick={() => setActivePage('home')} className="hover:text-amber-400">18th BJS Preliminary Intensive</a></li>
            <li><a href="#courses" onClick={() => setActivePage('home')} className="hover:text-amber-400">Bar Council Enrolment Masterclass</a></li>
            <li><a href="#courses" onClick={() => setActivePage('home')} className="hover:text-amber-400">Civil Laws Module (CPC & SRA)</a></li>
            <li><a href="#courses" onClick={() => setActivePage('home')} className="hover:text-amber-400">Criminal Laws Module (CrPC & Penal Code)</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-3 text-sm">গুরুত্বপূর্ণ লিঙ্ক</h4>
          <ul className="space-y-2 text-xs">
            <li><button onClick={() => setActivePage('register')} className="hover:text-amber-400">নতুন রেজিস্ট্রেশন (Batch Select)</button></li>
            <li><button onClick={() => setActivePage('login')} className="hover:text-amber-400">স্টুডেন্ট লগইন (Student Login)</button></li>
            <li><button onClick={() => setActivePage('dashboard')} className="hover:text-amber-400">ক্লাস ও ভিডিও মডিউল</button></li>
            <li><button onClick={() => setActivePage('home')} className="hover:text-amber-400">হোম পেজ (Home)</button></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-3 text-sm">যোগাযোগ (Helpline)</h4>
          <div className="space-y-2 text-xs">
            <p>📍 Academy Campus: Farmgate, Dhaka 1215</p>
            <p>💬 WhatsApp & Call: <a href="https://wa.me/8801800077663" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-emerald-400 font-mono font-bold transition-colors">01800077663</a></p>
            <p>📧 Email: support@bjsbaracademy.com</p>
            <p className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
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
