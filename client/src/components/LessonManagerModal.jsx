import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function LessonManagerModal({ course, isOpen, onClose }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const [form, setForm] = useState({
    id: '',
    module: 'Fast Class',
    title: '',
    duration: '56min',
    youtubeUrl: '',
    releaseDate: new Date().toISOString().split('T')[0],
    description: '',
  });

  useEffect(() => {
    if (course && isOpen) {
      loadLessons();
    }
  }, [course, isOpen]);

  const loadLessons = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/lessons?courseId=${course.id}`);
      if (res.data.ok) setLessons(res.data.lessons);
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
      module: l.module || 'Fast Class',
      chapter: l.chapter || '',
      title: l.title,
      duration: l.duration || '56min',
      youtubeUrl: l.youtubeUrl || l.youtubeId || '',
      releaseDate: l.releaseDate || new Date().toISOString().split('T')[0],
      description: l.description || '',
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title) return;

    try {
      const res = await api.post('/admin/lessons/save', {
        ...form,
        courseId: course.id,
      });

      if (res.data.ok) {
        setMsg({ type: 'success', text: res.data.message });
        setForm({
          id: '',
          module: 'Fast Class',
          title: '',
          duration: '56min',
          youtubeUrl: '',
          releaseDate: new Date().toISOString().split('T')[0],
          description: '',
        });
        loadLessons();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Error saving video lesson.' });
    }
  };

  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col overflow-hidden text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold uppercase">
              {course.category}
            </span>
            <h3 className="font-extrabold text-white text-lg">{course.title} — Video Upload & Lesson Manager</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white">✕</button>
        </div>

        {msg && (
          <div className={`p-3 rounded-xl mb-4 font-semibold ${msg.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950 text-rose-300'}`}>
            {msg.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-y-auto">
          {/* Add / Edit Form */}
          <form onSubmit={handleSave} className="lg:col-span-5 space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h4 className="font-bold text-white mb-1">{form.id ? '✏️ Edit Video Details' : '➕ Upload New Class Video'}</h4>

            <div>
              <label className="block text-slate-400 mb-1">Module Name</label>
              <input
                type="text"
                value={form.module}
                onChange={(e) => setForm({ ...form, module: e.target.value })}
                placeholder="e.g. Fast Class"
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-white"
                required
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
              <label className="block text-slate-400 mb-1">Class / Video Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. English Class"
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">YouTube URL or ID (youtubeUrl)</label>
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
                <label className="block text-slate-400 mb-1">Duration</label>
                <input
                  type="text"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  placeholder="56min"
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Release Date</label>
                <input
                  type="date"
                  value={form.releaseDate}
                  onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-white"
                />
              </div>
            </div>

            <button type="submit" className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold transition-all">
              {form.id ? 'Update Video Details' : 'Upload Video to Course'}
            </button>
          </form>

          {/* Lessons Table Feed matching Spreadsheet Screenshot */}
          <div className="lg:col-span-7 space-y-3 overflow-x-auto">
            <h4 className="font-bold text-white">📹 Uploaded Course Videos ({lessons.length})</h4>
            {loading ? (
              <p className="text-amber-400 font-mono">Loading videos...</p>
            ) : lessons.length === 0 ? (
              <p className="text-slate-500 py-8 text-center bg-slate-950 rounded-xl border border-slate-800">
                No videos uploaded yet for this course.
              </p>
            ) : (
              <table className="w-full text-left text-[11px] border-collapse bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="p-2">Module</th>
                    <th className="p-2">Title</th>
                    <th className="p-2">Duration</th>
                    <th className="p-2">YouTube URL</th>
                    <th className="p-2">Release Date</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {lessons.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-900/50">
                      <td className="p-2 font-semibold text-amber-300">{l.module}</td>
                      <td className="p-2 font-bold text-white">{l.title}</td>
                      <td className="p-2 text-slate-300 font-mono">{l.duration}</td>
                      <td className="p-2 font-mono text-cyan-400 max-w-[140px] truncate">
                        {l.youtubeUrl || `https://youtu.be/${l.youtubeId}`}
                      </td>
                      <td className="p-2 font-mono text-slate-400">{l.releaseDate}</td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => handleEditLesson(l)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
