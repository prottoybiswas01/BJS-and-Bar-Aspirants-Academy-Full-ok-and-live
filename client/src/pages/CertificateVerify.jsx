import React, { useState, useEffect } from 'react';
import BrandLogo from '../components/BrandLogo';
import api from '../services/api';

export default function CertificateVerify() {
  const [certId, setCertId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Extract ID from pathname or hash
    const path = window.location.pathname;
    const hash = window.location.hash;
    let targetId = '';

    if (path.includes('/verify/')) {
      targetId = path.split('/verify/')[1];
    } else if (hash.startsWith('#verify-')) {
      targetId = hash.replace('#verify-', '');
    }

    if (targetId) {
      setCertId(targetId);
      verifyCertificate(targetId);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyCertificate = async (idToVerify) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/certificates/verify/${idToVerify}`);
      if (res.data?.ok && res.data.valid) {
        setData(res.data.certificate);
      } else {
        setError(res.data?.message || 'সার্টিফিকেটটি খুঁজে পাওয়া যায়নি বা এটি বৈধ নয়।');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'সার্টিফিকেট যাচাইকরণে সমস্যা হয়েছে। আইডি চেক করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!certId.trim()) return;
    window.location.hash = `#verify-${certId.trim()}`;
    verifyCertificate(certId.trim());
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pt-24 pb-16 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden">
        {/* Header Banner */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white text-center space-y-3">
          <div className="flex justify-center">
            <BrandLogo size="lg" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
            <span>🛡️</span>
            <span>অফিসিয়াল ডিজিটাল সার্টিফিকেট ভেরিফিকেশন পোর্টাল</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            সার্টিফিকেটের সত্যতা যাচাই ও প্রামাণিকতা পর্যবেক্ষণ
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Search Box if ID not provided or user wants to recheck */}
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <input
              type="text"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              placeholder="সার্টিফিকেট আইডি লিখুন (যেমন: CERT-BJS-2026-1234)..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-extrabold text-sm transition-all shadow-md"
            >
              যাচাই করুন
            </button>
          </form>

          {loading ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold">সার্টিফিকেট যাচাই হচ্ছে...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2 text-rose-800">
              <span className="text-4xl">⚠️</span>
              <h3 className="font-extrabold text-base">অবৈধ বা অপ্রাপ্ত সার্টিফিকেট!</h3>
              <p className="text-xs text-rose-600">{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-6 animate-fadeIn">
              {/* Verified Badge Header */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-md">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-extrabold text-emerald-900 text-sm">যাচাইকৃত বৈধ সার্টিফিকেট</h4>
                    <p className="text-xs text-emerald-700">Official Authenticity Verified by BJS Academic Council</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-200 text-emerald-900 font-bold text-xs font-mono">
                  VALID & GENUINE
                </span>
              </div>

              {/* Certificate Details Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold">শিক্ষার্থীর নাম:</span>
                    <h3 className="text-base font-black text-slate-900 pt-0.5">{data.studentName}</h3>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold">সার্টিফিকেট আইডি:</span>
                    <p className="font-mono text-sm font-bold text-amber-700 pt-0.5">{data.certificateId}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold">কোর্সের নাম:</span>
                    <p className="font-bold text-slate-800 pt-0.5">{data.courseTitle}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold">ইস্যুর তারিখ:</span>
                    <p className="font-bold text-slate-800 pt-0.5">
                      {new Date(data.issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold">ইস্যুকারী কর্তৃপক্ষ:</span>
                    <p className="font-bold text-slate-800 pt-0.5">{data.issuedBy || 'BJS & Bar Aspirants Academy'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold">প্রামাণিকতা স্ট্যাটাস:</span>
                    <p className="font-bold text-emerald-600 pt-0.5">১০০% ভেরিফাইড ও সংরক্ষিত</p>
                  </div>
                </div>

                {/* PDF Download Button */}
                <div className="pt-3 border-t border-slate-200 flex justify-end">
                  <a
                    href={`/api/certificates/${data.certificateId}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <span>📜</span>
                    <span>অফিসিয়াল PDF সার্টিফিকেট ডাউনলোড</span>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs">
              যাচাই করতে সার্টিফিকেট আইডি লিখে সার্চ করুন।
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 text-center text-xs text-slate-500">
          © 2026 BJS & Bar Aspirants Academy. All Rights Reserved.
        </div>
      </div>
    </div>
  );
}
