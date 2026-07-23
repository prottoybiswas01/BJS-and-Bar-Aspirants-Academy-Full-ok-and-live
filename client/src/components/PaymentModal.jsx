import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function PaymentModal({ course, isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const [bkashNumber, setBkashNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  if (!isOpen || !course) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bkashNumber || !trxId) {
      setMessage({ type: 'error', text: 'অনুগ্রহ করে বিকাশ নম্বর ও TrxID প্রদান করুন।' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await api.post('/payments/submit', {
        studentId: user?.id || 'STU-2026-001',
        courseId: course.id,
        bkashNumber,
        trxId,
        amount: course.price || '1000',
      });

      if (res.data.ok) {
        setMessage({ type: 'success', text: 'পেমেন্ট ভেরিফিকেশনের জন্য সফলভাবে জমা দেয়া হয়েছে!' });
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: res.data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'পেমেন্ট জমাদানে ত্রুটি ঘটেছে।' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-pink-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-pink-600/30">
              bK
            </div>
            <div>
              <h3 className="font-bold text-white text-base">bKash Payment Submission</h3>
              <p className="text-xs text-pink-400 font-medium">{course.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* bKash Payment Instructions */}
        <div className="bg-pink-950/30 border border-pink-500/20 rounded-xl p-4 mb-4 text-xs text-pink-200 leading-relaxed">
          <p className="font-bold mb-1 flex items-center gap-1 text-pink-300">
            <span>📲 Send Money Instructions:</span>
          </p>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-pink-100">
            <li>আপনার বিকাশ অ্যাপ খুলে <strong>Send Money</strong> সিলেক্ট করুন।</li>
            <li>একাডেমিক বিকাশ মার্চেন্ট নম্বর: <strong className="font-mono text-amber-300 text-sm">01978167016</strong></li>
            <li>কোর্স ফি: <strong className="text-amber-300">৳ {course.price} BDT</strong> সেন্ড মানি করুন।</li>
            <li>ট্রানজেকশন সফল হলে নিচের ঘরে TrxID ও বিকাশ নম্বর লিখে সাবমিট করুন।</li>
          </ol>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs font-semibold ${
              message.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">প্রেরক বিকাশ নম্বর (Your bKash Number)</label>
            <input
              type="text"
              value={bkashNumber}
              onChange={(e) => setBkashNumber(e.target.value)}
              placeholder="e.g. 01712345678"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-pink-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">ট্রানজেকশন আইডি (bKash TrxID)</label>
            <input
              type="text"
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
              placeholder="e.g. BAX79K2L90"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-white font-mono uppercase tracking-wider placeholder-slate-600 focus:outline-none focus:border-pink-500"
              required
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all"
            >
              বাতিল (Cancel)
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold shadow-lg shadow-pink-600/30 transition-all"
            >
              {loading ? 'জমা হচ্ছে...' : 'পেমেন্ট জমা দিন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
