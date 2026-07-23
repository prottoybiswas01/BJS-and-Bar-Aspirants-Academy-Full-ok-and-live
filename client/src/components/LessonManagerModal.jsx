import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function LessonManagerModal({ course, isOpen, onClose }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const [form, setForm] = useState({
    id: '',
    module: 'Module 1: General Classes',
    title: '',
    duration: '45min',
    youtubeId: '',
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
      module: l.module || 'Module 1',
      title: l.title,
      duration: l.duration || '45min',
      youtubeId: l.youtubeId || '',
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
          module: 'Module 1: General Classes',
          title: '',
          duration: '45min',
          youtubeId: '',
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
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                {course.category}
              </span>
              <h3 className="font-extrabold text-white text-lg">{course.title} — Video & Lesson Manager</h3>
            </div>
            <p className="text-xs text-slate-400">Add YouTube Video IDs, release dates, and lecture notes</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white">✕</button>
        </div>

        {msg && (
          <div className={`p-3 rounded-xl mb-4 text-xs font-semibold ${msg.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950 text-rose-300'}`}>
            {msg.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-y-auto">
          {/* Add / Edit Form */}
          <form onSubmit={handleSave} className="lg:col-span-5 space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
            <h4 className="font-bold text-white mb-2">{form.id ? '✏️ Edit Lesson Video' : '➕ Add New Class Video'}</h4>

            <div>
              <label className="block text-slate-400 mb-1">Module Name</label>
              <input
                type="text"
                value={form.module}
                onChange={(e) => setForm({ ...form, module: e.target.value })}
                placeholder="e.g. Module 1: CPC 1908"
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Lecture / Class Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Lecture 01: Jurisdiction Sec 9-11"
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">YouTube Video ID (11 chars)</label>
              <input
                type="text"
                value={form.youtubeId}
                onChange={(e) => setForm({ ...form, youtubeId: e.target.value })}
                placeholder="e.g. dQw4w9WgXcQ"
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-emerald-400 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Duration</label>
                <input
                  type="text"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
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

            <div>
              <label className="block text-slate-400 mb-1">Description / Notes</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows="2"
                className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-white"
              ></textarea>
            </div>

            <button type="submit" className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold transition-all">
              {form.id ? 'Update Video Lesson' : 'Save Lesson'}
            </button>
          </form>

          {/* Lessons Feed */}
          <div className="lg:col-span-7 space-y-3">
            <h4 className="font-bold text-white text-xs">📹 Current Video Lessons ({lessons.length})</h4>
            {loading ? (
              <p className="text-xs text-amber-400 font-mono">Loading videos...</p>
            ) : lessons.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center bg-slate-950 rounded-xl border border-slate-800">
                No videos uploaded yet for this course.
              </p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 text-xs">
                {lessons.map((l) => (
                  <div key={l.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-amber-400">{l.module}</span>
                        {l.youtubeId ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                            🟢 ID: {l.youtubeId}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-300 font-mono border border-rose-500/30">
                            🔴 Pending Video
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-white">{l.title}</h5>
                      <p className="text-[10px] text-slate-400">Released: {l.releaseDate} | Duration: {l.duration}</p>
                    </div>

                    <button
                      onClick={() => handleEditLesson(l)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
