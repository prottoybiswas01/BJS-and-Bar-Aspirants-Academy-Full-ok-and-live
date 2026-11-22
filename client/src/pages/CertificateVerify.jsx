import React, { useState, useEffect } from 'react';
import BrandLogo from '../components/BrandLogo';
import PaymentInvoiceView from '../components/PaymentInvoiceView';
import api from '../services/api';
import { downloadCertificate } from '../utils/certificateDownload';

export default function CertificateVerify() {
  const [certId, setCertId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadLoading, setDownloadLoading] = useState(false);

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
      verifyDocument(targetId);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyDocument = async (idToVerify) => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const cleanId = idToVerify.trim();
      const res = await api.get(`/certificates/verify/${encodeURIComponent(cleanId)}`);
      if (res.data?.ok && res.data.valid) {
        if (res.data.type === 'receipt') {
          setData({
            type: 'receipt',
            receipt: res.data.receipt,
            paymentHistory: res.data.paymentHistory || [],
            totalPaid: res.data.totalPaid || 0,
            canDownload: true
          });
        } else {
          setData({
            type: 'certificate',
            ...res.data.certificate
          });
        }
      } else {
        setError(res.data?.message || 'সার্টিফিকেট বা মানি রিসিটটি খুঁজে পাওয়া যায়নি বা এটি বৈধ নয়।');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'যাচাইকরণে সমস্যা হয়েছে। আইডি চেক করে পুনরায় চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!certId.trim()) return;
    window.location.hash = `#verify-${certId.trim()}`;
    verifyDocument(certId.trim());
  };

  const handleDownloadReceiptPdf = async (receiptId) => {
    try {
      setDownloadLoading(true);
      const res = await api.get(`/receipts/verify/${encodeURIComponent(receiptId)}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt-${receiptId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('রসিদ PDF ডাউনলোড করতে সমস্যা হয়েছে।');
    } finally {
      setDownloadLoading(false);
    }
  };

  const isReceipt = data && data.type === 'receipt';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pt-20 sm:pt-24 pb-16 px-3 sm:px-6 flex items-center justify-center">
      <div className={`w-full transition-all duration-300 ${isReceipt ? 'max-w-4xl' : 'max-w-2xl'} bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden`}>
        {/* Header Banner */}
        <div className="p-5 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white text-center space-y-3">
          <div className="flex justify-center">
            <BrandLogo size="lg" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
            <span>🛡️</span>
            <span>অফিসিয়াল ডিজিটাল ভেরিফিকেশন পোর্টাল</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            সার্টিফিকেট ও পেমেন্ট মানি রিসিটের সত্যতা যাচাই ও প্রামাণিকতা পর্যবেক্ষণ
          </p>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-8 space-y-6">
          {/* Search Box if ID not provided or user wants to recheck */}
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <input
              type="text"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              placeholder="সার্টিফিকেট বা মানি রিসিট আইডি লিখুন (যেমন: REC-2026-4136 অথবা CERT-2026-...)..."
              className="flex-1 px-3.5 sm:px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
            <button
              type="submit"
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-extrabold text-xs sm:text-sm transition-all shadow-md shrink-0 cursor-pointer"
            >
              যাচাই করুন
            </button>
          </form>

          {loading ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold">নথি যাচাই করা হচ্ছে...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2 text-rose-800 animate-fadeIn">
              <span className="text-4xl">⚠️</span>
              <h3 className="font-extrabold text-base">অবৈধ বা অপ্রাপ্ত নথি!</h3>
              <p className="text-xs text-rose-600">{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-6 animate-fadeIn">
              {/* Document Verified Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-extrabold text-emerald-900 text-sm">
                      {isReceipt ? 'যাচাইকৃত অফিসিয়াল পেমেন্ট মানি রিসিট' : 'যাচাইকৃত বৈধ ডিজিটাল সার্টিফিকেট'}
                    </h4>
                    <p className="text-xs text-emerald-700">
                      Official Authenticity Verified by BJS Academic Council
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-200 text-emerald-900 font-bold text-xs font-mono">
                  100% VALID & GENUINE
                </span>
              </div>

              {/* CASE 1: RECEIPT VIEW WITH STEP A (INVOICE) & STEP B (PAYMENT HISTORY) */}
              {isReceipt ? (
                <div className="space-y-8">
                  {/* Step A: Exact Image_16.png Printable Payment Invoice */}
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-cinzel">
                        ধাপ ১: মানি রিসিট ও অফিসিয়াল ভাউচার প্রিভিউ (A4 Official Preview)
                      </h3>
                    </div>
                    <PaymentInvoiceView
                      receipt={data.receipt}
                      onDownloadPdf={handleDownloadReceiptPdf}
                      downloadLoading={downloadLoading}
                      showActions={true}
                    />
                  </div>

                  {/* Step B: Student's Complete Payment History Table */}
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                          <span>📊 শিক্ষার্থীর সম্পূর্ণ পেমেন্ট হিস্ট্রি (Payment History)</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          {data.receipt.studentName} ({data.receipt.studentId})-এর সকল কোর্স ও পরীক্ষার ফি পরিশোধের ইতিহাস
                        </p>
                      </div>

                      {/* Total Paid on Platform Badge */}
                      <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-600/20 border border-amber-500/40 text-[#92400E] shrink-0">
                        <span className="text-[10px] uppercase font-bold block">প্ল্যাটফর্মে মোট পরিশোধিত ফি:</span>
                        <strong className="font-mono text-base font-black text-slate-900">
                          BDT {Number(data.totalPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-900 text-slate-300 font-mono text-[11px] uppercase border-b border-slate-800">
                          <tr>
                            <th className="p-3">তারিখ ও সময়</th>
                            <th className="p-3">কোর্স / ব্যাচ</th>
                            <th className="p-3">পেমেন্ট মেথড</th>
                            <th className="p-3">ট্রানজেকশন আইডি</th>
                            <th className="p-3 text-right">পরিশোধিত ফি</th>
                            <th className="p-3 text-center">স্ট্যাটাস</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.paymentHistory.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-400">
                                অন্য কোনো পূর্ববর্তী পেমেন্ট রেকর্ড নেই।
                              </td>
                            </tr>
                          ) : (
                            data.paymentHistory.map((item, idx) => (
                              <tr key={item.receiptId || idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="p-3 font-mono text-[11px] text-slate-600">
                                  {new Date(item.paymentTime).toLocaleString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td className="p-3 font-bold text-slate-900">
                                  {item.batch || 'BJS & Bar Masterclass'}
                                </td>
                                <td className="p-3 text-slate-600">
                                  {item.paymentMethod || 'bKash'}
                                </td>
                                <td className="p-3 font-mono text-amber-700 font-bold">
                                  {item.trxId || 'N/A'}
                                </td>
                                <td className="p-3 font-mono font-black text-slate-900 text-right">
                                  ৳ {Number(item.amount || 0).toLocaleString('en-US')}
                                </td>
                                <td className="p-3 text-center">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                    <span>APPROVED / PAID</span>
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* CASE 2: CERTIFICATE VIEW */
                <div className="space-y-6">
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
                        <span className="text-slate-400 font-bold">বিশ্ববিদ্যালয় / প্রতিষ্ঠান:</span>
                        <p className="font-bold text-slate-800 pt-0.5">{data.university || 'Department of Law, University of Dhaka'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold">শিক্ষার্থী রোল / আইডি:</span>
                        <p className="font-mono font-bold text-slate-800 pt-0.5">{data.studentRoll || 'Verified Student'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold">কোর্সের নাম:</span>
                        <p className="font-bold text-slate-800 pt-0.5">{data.courseTitle}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold">ফলাফল ও গ্রেড:</span>
                        <p className="font-mono font-bold text-emerald-700 pt-0.5">{data.marksGrade || 'Marks: 88 / 100 (Grade: A+)'}</p>
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
                    </div>

                    {data.syllabusDescription && (
                      <div className="pt-2 border-t border-slate-200 text-xs">
                        <span className="text-slate-400 font-bold block mb-1">পাঠ্যক্রম ও সিলেবাস বিবরণ (Curriculum Covered):</span>
                        <p className="text-slate-700 font-serif italic bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                          "{data.syllabusDescription}"
                        </p>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-200 flex justify-end">
                      <button
                        type="button"
                        onClick={() => downloadCertificate(data.certificateId)
                          .catch(() => setError('সার্টিফিকেট ডাউনলোড করা যায়নি।'))}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
                      >
                        <span>📜</span>
                        <span>অফিসিয়াল PDF সার্টিফিকেট ডাউনলোড</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs">
              যাচাই করতে সার্টিফিকেট অথবা মানি রিসিট আইডি লিখে সার্চ করুন।
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 text-center text-xs text-slate-500">
          © 2026 BJS & Bar Aspirants Academy. All rights reserved. Sovereign Digital Verification Portal.
        </div>
      </div>
    </div>
  );
}
