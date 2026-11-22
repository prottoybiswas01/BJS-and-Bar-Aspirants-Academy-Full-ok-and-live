import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function PublicNotes() {
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState(['সকল']);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('সকল');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const fetchNotes = async () => {
      try {
        const params = selectedCategory === 'সকল' ? {} : { category: selectedCategory };
        const { data } = await api.get('/notes', { params, signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!data?.ok || !Array.isArray(data.notes)) throw new Error('Unexpected notes response');
        setNotes(data.notes);
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(Array.from(new Set(data.categories)));
        }
        // Check hash or slug
        const hash = window.location.hash;
        if (hash.startsWith('#notes-') || hash.startsWith('#note-')) {
          const slugOrId = hash.replace('#notes-', '').replace('#note-', '');
          const found = data.notes.find(n => n.slug === slugOrId || n.id === slugOrId);
          setSelectedNote(found || null);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setNotes([]);
        setSelectedNote(null);
        console.warn('Notes fetch notice:', err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchNotes();
    return () => controller.abort();
  }, [selectedCategory]);

  const handleOpenNote = async (note) => {
    setSelectedNote(note);
    window.location.hash = `#note-${note.slug}`;
    try {
      await api.get(`/notes/${note.slug}`);
    } catch (e) {}
  };

  const filteredNotes = notes.filter(n => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.summary && n.summary.toLowerCase().includes(q)) ||
      (n.category && n.category.toLowerCase().includes(q)) ||
      (Array.isArray(n.lawSections) && n.lawSections.some(s => s.toLowerCase().includes(q)))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 pt-20 pb-16 px-4 sm:px-6 lg:px-8 transition-colors">
      {/* Top Hero / Header Section */}
      <div className="max-w-6xl mx-auto text-center space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-extrabold uppercase tracking-wider">
          <span>⚖️</span>
          <span>ফ্রি আইনি স্টাডি গাইড ও পরীক্ষা বিশ্লেষণ</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 dark:text-white tracking-tight">
          বিজেএস ও বার কাউন্সিল <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-indigo-600 dark:from-amber-400 dark:to-indigo-400">আইন ও পরীক্ষা গাইড</span>
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          সহকারী জজ (BJS) এবং বার কাউন্সিল অ্যাডভোকেটশিপ পরীক্ষার জন্য গুরুত্বপূর্ণ আইনি ধারা, কেস ল ও সমস্যাভিত্তিক প্রশ্নের সহজ ও নির্ভুল বিশ্লেষণ।
        </p>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto pt-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="আইনের ধারা বা বিষয় লিখে খুঁজুন (যেমন: CPC 9, রিমান্ড, ১৬৭ ধারা, প্রতারণা)..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-[#0e1726] border border-slate-300 dark:border-slate-800 text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-sm text-sm"
            />
            <span className="absolute left-4 top-3.5 text-slate-400 text-lg">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'bg-white dark:bg-[#0e1726] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="py-20 text-center text-slate-500 space-y-2">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold">আইনি নোটস লোড হচ্ছে...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-[#0e1726] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
            <span className="text-4xl">📖</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">কোনো আইনি নোট পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">অন্য কোনো কিওয়ার্ড বা ক্যাটাগরি দিয়ে চেষ্টা করুন।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <div
                key={note.id || note.slug}
                onClick={() => handleOpenNote(note)}
                className="bg-white dark:bg-[#0e1726] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 hover:border-amber-500/50 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between cursor-pointer group hover:-translate-y-1"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-100 dark:border-indigo-900/50">
                      {note.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {note.youtubeId && (
                        <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-200 dark:border-rose-900/50 flex items-center gap-1">
                          <span>🎥</span> ভিডিও ক্লিপ
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <span>⏱️</span>
                        <span>{note.readTime || '৫ মিনিট'}</span>
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-950 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-snug line-clamp-2">
                    {note.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                    {note.summary || note.content.slice(0, 120) + '...'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {(note.lawSections || []).slice(0, 2).map((sec, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {sec}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <span>পড়ুন</span>
                    <span>→</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note Reader Modal / Drawer */}
      {selectedNote && (
        <div className="fixed inset-0 z-[9995] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-[#0d1627] w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30">
                    {selectedNote.category}
                  </span>
                  <span className="text-xs text-slate-400">⏱️ {selectedNote.readTime || '৫ মিনিট'} পাঠ</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black leading-snug text-white">
                  {selectedNote.title}
                </h2>
              </div>
              <button
                onClick={() => {
                  setSelectedNote(null);
                  window.location.hash = '#notes';
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-200 leading-relaxed text-sm sm:text-base">
              {/* Highlight Box */}
              {selectedNote.summary && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 text-sm font-semibold">
                  📌 <strong>সারসংক্ষেপ:</strong> {selectedNote.summary}
                </div>
              )}

              {/* Timestamped Public Video Clip Player (enforced 2-5 min class segment, max 300s) */}
              {selectedNote.youtubeId && (() => {
                const clipStart = Math.max(0, Number(selectedNote.clipStartSeconds) || 0);
                let clipEnd = Number(selectedNote.clipEndSeconds);
                if (!clipEnd || clipEnd <= clipStart) {
                  clipEnd = clipStart + 180;
                }
                if (clipEnd - clipStart > 300) {
                  clipEnd = clipStart + 300; // Enforce max 300s (5 mins) boundary
                }
                const embedId = String(selectedNote.youtubeId).startsWith('bjs_enc_')
                  ? atob(String(selectedNote.youtubeId).replace('bjs_enc_', ''))
                  : selectedNote.youtubeId;

                return (
                  <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl space-y-2.5 p-3 sm:p-4 text-white">
                    <div className="flex items-center justify-between text-xs text-amber-400 font-bold px-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span>🎥 ক্লাসের রেফারেন্স ভিডিও ক্লিপ (আইনি ধারা বিশ্লেষণ)</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                        ⏱️ {Math.floor(clipStart / 60)}:{String(clipStart % 60).padStart(2, '0')} - {Math.floor(clipEnd / 60)}:{String(clipEnd % 60).padStart(2, '0')} ({clipEnd - clipStart} সে.)
                      </span>
                    </div>
                    <div className="w-full aspect-video max-h-[48vh] relative overflow-hidden rounded-xl bg-black">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${embedId}?start=${clipStart}&end=${clipEnd}&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&controls=1&fs=1`}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="autoplay; encrypted-media; fullscreen"
                        allowFullScreen
                        title={selectedNote.title}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 px-1 italic">
                      💡 এই আইনি বিধানটির উপর ক্লাসের নির্বাচিত মূল লেকচার ক্লিপটি উপরে সরাসরি প্লে করুন।
                    </p>
                  </div>
                );
              })()}

              {/* Sections badge */}
              {Array.isArray(selectedNote.lawSections) && selectedNote.lawSections.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">সম্পর্কিত ধারা:</span>
                  {selectedNote.lawSections.map((sec, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700">
                      ⚖️ {sec}
                    </span>
                  ))}
                </div>
              )}

              {/* Main Content with clean Markdown-style rendering */}
              <div className="prose prose-slate dark:prose-invert max-w-none space-y-4 pt-2">
                {selectedNote.content.split('\n\n').map((paragraph, pIdx) => {
                  const trimmed = paragraph.trim();
                  if (trimmed.startsWith('## ')) {
                    return <h3 key={pIdx} className="text-lg font-black text-slate-950 dark:text-white pt-3 border-b border-slate-200 dark:border-slate-800 pb-1.5">{trimmed.replace('## ', '')}</h3>;
                  }
                  if (trimmed.startsWith('### ')) {
                    return <h4 key={pIdx} className="text-base font-extrabold text-indigo-700 dark:text-indigo-300 pt-2">{trimmed.replace('### ', '')}</h4>;
                  }
                  if (trimmed.startsWith('> ')) {
                    return <blockquote key={pIdx} className="p-3.5 bg-slate-100 dark:bg-slate-900 border-l-4 border-amber-500 rounded-r-xl italic text-slate-700 dark:text-slate-300">{trimmed.replace('> ', '')}</blockquote>;
                  }
                  if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                    const items = trimmed.split('\n').map(item => item.replace(/^[*-]\s*/, ''));
                    return (
                      <ul key={pIdx} className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                        {items.map((it, iIdx) => <li key={iIdx}>{it}</li>)}
                      </ul>
                    );
                  }
                  return <p key={pIdx} className="text-slate-700 dark:text-slate-300 leading-relaxed">{paragraph}</p>;
                })}
              </div>

              {/* CTA Box */}
              <div className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="font-extrabold text-amber-400 text-sm">সম্পূর্ণ কোর্সে বিস্তারিত শিখতে চান?</h4>
                  <p className="text-xs text-slate-300">আমাদের প্রিমিয়াম বিজিএস ও বার কাউন্সিল মাস্টারক্লাসে সম্পূর্ণ সিলেবাস কভার করা হয়েছে।</p>
                </div>
                <a
                  href="/#courses"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all whitespace-nowrap shadow-md cursor-pointer"
                >
                  কোর্সসমূহ দেখুন ↗
                </a>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>BJS & Bar Aspirants Academy - ফ্রি আইন সহায়তা</span>
              <button
                onClick={() => {
                  setSelectedNote(null);
                  window.location.hash = '#notes';
                }}
                className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
