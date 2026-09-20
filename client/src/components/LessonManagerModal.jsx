import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function LessonManagerModal({ course, isOpen, onClose }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const targetCourseId = course?.id || course?._id || '';

  const [form, setForm] = useState({
    id: '',
    module: '',
    chapter: '',
    title: '',
    duration: '56min',
    youtubeUrl: '',
    releaseDate: new Date().toISOString().split('T')[0],
    description: '',
    order: '',
  });

  useEffect(() => {
    if (course && isOpen) {
      loadLessons();
    }
  }, [course, isOpen]);

  const loadLessons = async () => {
    if (!targetCourseId) return;
    setLoading(true);
    try {
      const res = await api.get(`/lessons?courseId=${targetCourseId}`);
      if (res.data.ok) {
        setLessons(res.data.lessons || []);
      }
    } catch (err) {
      console.log('Error loading lessons:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !course) return null;

  const handleEditLesson = (l) => {
    setForm({
      id: l.id,
      module: l.module || '',
      chapter: l.chapter || '',
      title: l.title || '',
      duration: l.duration || '56min',
      youtubeUrl: l.youtubeUrl || (l.youtubeId ? `https://youtu.be/${l.youtubeId}` : ''),
      releaseDate: l.releaseDate || new Date().toISOString().split('T')[0],
      description: l.description || '',
      order: l.order !== undefined && l.order !== null && l.order > 0 ? String(l.order) : '',
    });
    setMsg(null);
  };

  const handleDeleteLesson = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete video "${title || id}"?`)) return;
    setLessons(prev => prev.filter(l => l.id !== id && l._id !== id));
    try {
      const res = await api.delete(`/admin/lessons/${id}`);
      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message || '✓ Video deleted successfully from MongoDB!' });
        loadLessons();
      } else {
        setMsg({ type: 'error', text: res.data.message || 'Error deleting video.' });
        loadLessons();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Error deleting video.' });
      loadLessons();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.youtubeUrl) {
      setMsg({ type: 'error', text: 'Please enter YouTube URL or Video ID.' });
      return;
    }

    const finalTitle = form.title.trim() || form.chapter.trim() || form.module.trim() || 'Class Video';

    try {
      const res = await api.post('/admin/lessons/save', {
        ...form,
        order: form.order !== '' && !isNaN(Number(form.order)) ? Number(form.order) : 0,
        title: finalTitle,
        courseId: targetCourseId,
      });

      if (res.data.ok) {
        const savedLesson = res.data.lesson || { ...form, title: finalTitle, courseId: targetCourseId, id: form.id || `les-${Date.now()}` };
        setLessons(prev => {
          const idx = prev.findIndex(l => l.id === savedLesson.id || (savedLesson._id && l._id === savedLesson._id));
          if (idx > -1) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...savedLesson };
            return updated;
          }
          return [savedLesson, ...prev];
        });

        setMsg({ type: 'success', text: res.data.message || '✓ Video saved successfully in MongoDB!' });
        setForm({
          id: '',
          module: '',
          chapter: '',
          title: '',
          duration: '56min',
          youtubeUrl: '',
          releaseDate: new Date().toISOString().split('T')[0],
          description: '',
          order: '',
        });
        await loadLessons();
      } else {
        setMsg({ type: 'error', text: res.data.message || 'Error saving video.' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Error saving video lesson.' });
    }
  };

  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-5xl max-h-[92vh] rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-xs font-bold uppercase border border-amber-500/30">
              {course.category || 'COURSE'}
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg">{course.title} — Video Upload & Lesson Manager</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Total Uploaded Videos: <strong className="text-amber-400 font-bold">{lessons.length}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm">✕</button>
        </div>

        {msg && (
          <div className={`p-3 rounded-xl mb-4 font-semibold text-xs flex items-center justify-between ${
            msg.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'
          }`}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)} className="text-xs opacity-75 hover:opacity-100">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-y-auto pr-1">
          {/* Add / Edit Form */}
          <form onSubmit={handleSave} className="lg:col-span-5 space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 self-start">
            <h4 className="font-bold text-white border-b border-slate-800/80 pb-2 text-sm flex items-center justify-between">
              <span>{form.id ? '✏️ Edit Video Details' : '➕ Upload New Class Video'}</span>
              {form.id && (
                <button
                  type="button"
                  onClick={() => setForm({
                    id: '',
                    module: '',
                    chapter: '',
                    title: '',
                    duration: '56min',
                    youtubeUrl: '',
                    releaseDate: new Date().toISOString().split('T')[0],
                    description: '',
                    order: '',
                  })}
                  className="text-[10px] text-amber-400 underline font-normal"
                >
                  Cancel Edit
                </button>
              )}
            </h4>

            <div>
              <label className="block text-slate-400 mb-1 font-bold">Module Name</label>
              <input
                type="text"
                value={form.module}
                onChange={(e) => setForm({ ...form, module: e.target.value })}
                placeholder="e.g. Module 1 বা বিষয়বস্তু"
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-amber-300 font-bold mb-1">
                অধ্যায় / সেকশন টাইটেল (Chapter Name — Optional)
              </label>
              <input
                type="text"
                value={form.chapter}
                onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                placeholder="e.g. অধ্যায় ১: দেওয়ানী কার্যবিধি সূচনা (Optional)"
                className="w-full rounded-lg bg-slate-900 border border-amber-500/30 px-3 py-2 text-white placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-bold">Class / Video Title (Optional — Auto fills if blank)</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Family Laws 1st Class"
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-bold">YouTube URL or ID (youtubeUrl)</label>
              <input
                type="text"
                value={form.youtubeUrl}
                onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                placeholder="e.g. https://youtu.be/7HNVqFCWZm4"
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-emerald-400 font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Duration</label>
                <input
                  type="text"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  placeholder="56min"
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-amber-300 mb-1 font-bold">Class Serial # (ক্রমিক)</label>
                <input
                  type="number"
                  min="0"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: e.target.value })}
                  placeholder={form.id ? 'যেমন: 1, 2' : `যেমন: ${lessons.length + 1}`}
                  className="w-full rounded-lg bg-slate-900 border border-amber-500/40 px-3 py-2 text-amber-300 font-mono"
                  title="ভিডিওর ক্রমিক নম্বর (খালি রাখলে স্বয়ংক্রিয়ভাবে টাইটেল বা আপলোড ক্রম অনুযায়ী সিরিয়াল হবে)"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-bold">Release Date</label>
              <input
                type="date"
                value={form.releaseDate}
                onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-white font-mono"
              />
            </div>

            <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg transition-all hover:scale-[1.02] mt-2">
              {form.id ? '💾 Update Video Details' : '📹 Upload Video to Course'}
            </button>
          </form>

          {/* Lessons Table Feed matching Spreadsheet Screenshot */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <h4 className="font-bold text-white text-xs">
                📹 Uploaded Course Videos ({lessons.length})
              </h4>
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                Sorted Serially (#1 to #{lessons.length})
              </span>
            </div>

            {loading ? (
              <p className="text-amber-400 font-mono text-center py-6">Loading videos...</p>
            ) : lessons.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-xl border border-dashed border-slate-800 space-y-2 text-slate-500">
                <p className="font-semibold text-slate-400 text-xs">No videos uploaded yet for this course.</p>
                <p className="text-[11px]">Use the Upload Form on the left to add video lectures.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-[11px] border-collapse bg-slate-950">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono bg-slate-900/80">
                      <th className="p-2.5 w-8 text-center">#</th>
                      <th className="p-2.5">Module</th>
                      <th className="p-2.5">Title</th>
                      <th className="p-2.5">Duration</th>
                      <th className="p-2.5">YouTube URL</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {[...lessons].sort((a, b) => {
                      const toEnDigits = (str) => {
                        if (!str) return '';
                        const bn = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
                        return String(str).replace(/[০-৯]/g, (d) => bn.indexOf(d));
                      };
                      const parseNum = (l) => {
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

                      const numA = parseNum(a);
                      const numB = parseNum(b);
                      if (numA !== numB) return numA - numB;
                      const dateA = new Date(a.createdAt || a.releaseDate || 0).getTime();
                      const dateB = new Date(b.createdAt || b.releaseDate || 0).getTime();
                      if (dateA !== dateB) return dateA - dateB;
                      return (a.title || '').localeCompare(b.title || '');
                    }).map((l, index) => (
                      <tr key={l.id || index} className="hover:bg-slate-900/60 transition-colors">
                        <td className="p-2.5 font-mono font-bold text-amber-400 text-center">{index + 1}</td>
                        <td className="p-2.5 font-semibold text-amber-300">{l.module}</td>
                        <td className="p-2.5 font-bold text-white">
                          {l.title}
                          {l.chapter && <span className="block text-[10px] text-slate-400 font-normal italic">{l.chapter}</span>}
                        </td>
                        <td className="p-2.5 text-slate-300 font-mono">{l.duration || '56min'}</td>
                        <td className="p-2.5 font-mono text-cyan-400 max-w-[130px] truncate">
                          {l.youtubeUrl || `https://youtu.be/${l.youtubeId}`}
                        </td>
                        <td className="p-2.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleEditLesson(l)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(l.id, l.title)}
                            className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold transition-all border border-rose-500/30"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
