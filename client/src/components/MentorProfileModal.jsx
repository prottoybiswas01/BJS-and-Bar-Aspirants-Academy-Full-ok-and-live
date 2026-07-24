import React, { useState } from 'react';

export default function MentorProfileModal({ mentor, isOpen, onClose, setActivePage }) {
  if (!isOpen || !mentor) return null;

  const [copied, setCopied] = useState(false);

  // Generate unique shareable link for this mentor
  const shareUrl = `${window.location.origin}${window.location.pathname}#mentor-${mentor.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3500);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `⚖️ *${mentor.name}* - ${mentor.designation}\n📍 ${mentor.posting || 'BJS & Bar Academy Faculty'}\n📖 Specialization: ${mentor.expertise || 'Judicial Law'}\n\nCheck out the official mentor profile at BJS & Bar Aspirants Academy:\n${shareUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleFacebookShare = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(fbUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn font-sans">
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-amber-500/40 shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto space-y-6 bg-[#0b1325] text-slate-100 relative">
        
        {/* Floating Close & Home Navigation Buttons */}
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/40 uppercase tracking-widest">
              ⚖️ OFFICIAL JUDICIAL FACULTY
            </span>
          </div>

          <div className="flex items-center gap-2">
            {setActivePage && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setActivePage('home');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-all border border-slate-700 shadow-md flex items-center gap-1.5"
              >
                <span>🏠</span> হোমপেজে যান
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-base font-bold transition-all border border-slate-700 shadow-md"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Hero Magistrate Profile Header */}
        <div className="flex flex-col items-center p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-amber-500/30 shadow-xl relative overflow-hidden text-center space-y-4">
          {/* Glowing Background Accent */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

          {/* Profile Photo Badge - Extra Large & Prominent */}
          <div className="relative shrink-0 pt-2">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-gradient-to-tr from-amber-500 via-amber-300 to-emerald-500 p-1 shadow-2xl">
              <div className="w-full h-full rounded-[22px] bg-slate-950 overflow-hidden flex items-center justify-center text-6xl font-bold text-amber-400">
                {mentor.photoUrl ? (
                  <img src={mentor.photoUrl} alt={mentor.name} className="w-full h-full object-cover" />
                ) : (
                  '👨‍⚖️'
                )}
              </div>
            </div>
            <div className="pt-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-black tracking-widest uppercase border border-slate-900 shadow-lg inline-block">
                ✓ VERIFIED FACULTY
              </span>
            </div>
          </div>

          {/* Title & Designations */}
          <div className="space-y-2 max-w-lg">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{mentor.name}</h2>
            <div className="inline-block px-4 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 font-extrabold text-xs sm:text-sm border border-amber-500/30 shadow-md">
              🏛️ {mentor.designation}
            </div>

            <p className="text-xs sm:text-sm text-slate-300 flex items-center justify-center gap-1.5 pt-1">
              <span className="text-amber-400 font-bold">📍 বর্তমান পদায়ন:</span>
              <span className="font-semibold text-slate-100">{mentor.posting || 'Senior Judicial Practitioner'}</span>
            </p>
          </div>
        </div>

        {/* Shareable Link Banner */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-bold flex items-center gap-1.5">
              <span>🔗</span> মেন্টরের প্রোফাইল শেয়ারিং লিংক (Share Profile Link):
            </span>
            {copied && (
              <span className="text-emerald-400 font-mono font-bold animate-bounce">
                ✓ লিংক কপি করা হয়েছে!
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-amber-400 font-mono text-xs focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all shadow-md active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <span>📋</span> লিংক কপি
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1 cursor-pointer"
                title="Share on WhatsApp"
              >
                <span>💬</span> WhatsApp
              </button>

              <button
                type="button"
                onClick={handleFacebookShare}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1 cursor-pointer"
                title="Share on Facebook"
              >
                <span>📘</span> FB
              </button>
            </div>
          </div>
        </div>

        {/* Judicial Achievements & Stats (Fully Dynamic from Admin) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">STUDENTS MENTORED</span>
            <p className="text-base sm:text-lg font-black text-amber-400 font-mono">{mentor.studentsMentored || '1,500+ Aspirants'}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">JUDGES PRODUCED</span>
            <p className="text-base sm:text-lg font-black text-emerald-400 font-mono">{mentor.judgesProduced || '45+ Assistant Judges'}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">TEACHING EXP.</span>
            <p className="text-base sm:text-lg font-black text-purple-400 font-mono">{mentor.experienceYears || '10+ Years'}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">STUDENT RATING</span>
            <p className="text-base sm:text-lg font-black text-amber-300 font-mono">⭐ {mentor.ratingScore || '4.9 / 5.0'}</p>
          </div>
        </div>

        {/* Expertise & Bio Sections */}
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
              <span>📖</span> বিষয়ভিত্তিক দক্ষতা ও স্পেশালাইজেশন (Subject Specialization)
            </h3>
            <p className="text-slate-300 leading-relaxed font-medium">
              {mentor.expertise || 'BJS & Bar Council Advocacy Course Modules, Civil Procedure Code (CPC), CrPC & Evidence Act'}
            </p>
          </div>

          {mentor.showPhone && mentor.phone && (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">📞 সরাসরি যোগাযোগ / হেল্পলাইন:</span>
              <span className="font-mono text-emerald-400 font-extrabold text-sm">{mentor.phone}</span>
            </div>
          )}

          {mentor.bio && (
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <h3 className="font-extrabold text-amber-300 text-xs flex items-center gap-2">
                <span>💬</span> মেন্টরের ব্যক্তিগত বার্তা ও দিকনির্দেশনা (Personal Advice)
              </h3>
              <p className="text-slate-300 italic leading-relaxed text-xs">
                "{mentor.bio}"
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700 shadow-md"
          >
            বন্ধ করুন (Close Profile)
          </button>

          {setActivePage && (
            <button
              type="button"
              onClick={() => {
                onClose();
                setActivePage('register');
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🚀</span> মেন্টরের কোর্সে এনরোল করুন (Enroll Now)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
