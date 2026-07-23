import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, getDeviceId } = useAuth();

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xl">
              {user.name ? user.name[0].toUpperCase() : 'S'}
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg">{user.name}</h3>
              <p className="text-xs text-amber-400 font-mono">ID: {user.id || 'STU-2026'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <p className="text-slate-500 font-medium">মোবাইল (Phone)</p>
              <p className="font-bold text-white font-mono">{user.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">ইমেইল (Email)</p>
              <p className="font-bold text-white line-clamp-1">{user.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">ব্যাচ (Batch)</p>
              <p className="font-bold text-amber-300">{user.batch || 'Judiciary 2026'}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">সেশন (Session)</p>
              <p className="font-bold text-slate-200">{user.session || 'Weekend Intensive'}</p>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">পোর্টাল অ্যাক্সেস মোড:</span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {user.portalAccessMode || 'Full Access'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">রেজিস্টার্ড ডিভাইস লিমিট:</span>
              <span className="font-mono font-bold text-amber-400">2 Devices Max</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">বর্তমান ডিভাইস ID:</span>
              <span className="font-mono text-[10px] text-slate-400 truncate max-w-[180px]">{getDeviceId()}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
          >
            বন্ধ করুন (Close)
          </button>
        </div>
      </div>
    </div>
  );
}
