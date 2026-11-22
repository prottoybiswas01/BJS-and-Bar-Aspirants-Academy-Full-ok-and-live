import React from 'react';

/**
 * Vintage Corner Flourish SVG
 */
function CornerOrnament({ className = '', style = {} }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`w-7 h-7 pointer-events-none ${className}`}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M2 28V4C4 4 10 4 14 4" stroke="#D4AF37" strokeWidth="2" strokeLinecap="square" />
      <path d="M28 2H4C4 4 4 10 4 14" stroke="#D4AF37" strokeWidth="2" strokeLinecap="square" />
      <path d="M6 22V6H22" stroke="#0F172A" strokeWidth="1" strokeLinecap="square" />
      <path d="M6 6L10 2L14 6L10 10Z" fill="#D4AF37" />
      <circle cx="10" cy="6" r="1.5" fill="#0F172A" />
      <path d="M2 14C8 14 14 8 14 2" stroke="#D4AF37" strokeWidth="1" />
    </svg>
  );
}

/**
 * Ornate Horizontal Divider Swash
 */
function OrnateDivider() {
  return (
    <div className="relative py-2 flex items-center justify-center">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[#0F172A]/70"></div>
      </div>
      <div className="relative px-4 bg-[#FCFAF2] flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#0F172A]"></span>
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#D4AF37] fill-current">
          <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9Z" />
        </svg>
        <span className="w-2 h-2 rounded-full bg-[#0F172A]"></span>
      </div>
    </div>
  );
}

/**
 * Premium Payment Invoice UI matching image_16.png
 */
export default function PaymentInvoiceView({
  receipt,
  onDownloadPdf,
  downloadLoading = false,
  showActions = true
}) {
  if (!receipt) return null;

  const receiptId = receipt.receiptId || 'REC-2026-4136';
  const amountVal = Number(receipt.amount || 0);
  const amountFormatted = amountVal.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const formattedDate = receipt.paymentTime
    ? new Date(receipt.paymentTime).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : '19 Nov 2026, 08:29 AM';

  const qrUrl = receipt.qrCodeDataUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`https://bjs.kodl.uk/verify/${receiptId}`)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Top Quick Actions Bar (Screen only) */}
      {showActions && (
        <div className="flex items-center justify-between flex-wrap gap-3 pb-2 print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-400 font-bold text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Official Money Receipt (Image_16 Matching)</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>🖨️ প্রিন্ট রসিদ</span>
            </button>
            <button
              type="button"
              disabled={downloadLoading}
              onClick={() => onDownloadPdf && onDownloadPdf(receiptId)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <span>{downloadLoading ? '⏳ ডাউনলোড হচ্ছে...' : '📥 Download PDF Receipt'}</span>
            </button>
          </div>
        </div>
      )}

      {/* The Exact Image_16.png A4 Portrait Document Container */}
      <div
        id="payment-invoice-printable"
        className="relative mx-auto w-full max-w-3xl bg-[#FCFAF2] text-[#0F172A] rounded-2xl shadow-2xl p-5 sm:p-9 border-2 border-[#D4AF37] overflow-hidden select-text font-sans transition-colors"
        style={{
          boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.25), 0 0 35px rgba(212, 175, 55, 0.15)'
        }}
      >
        {/* Subtle Diagonal Guilloche Security Background Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(212, 175, 55, 0.02) 0px, rgba(212, 175, 55, 0.02) 2px, transparent 2px, transparent 10px)'
          }}
        ></div>

        {/* Ultra-Faint Central Judicial Scales Watermark directly behind content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] select-none">
          <svg viewBox="0 0 100 100" className="w-[420px] h-[420px] text-[#D4AF37] fill-current">
            <path d="M50 8c-1.1 0-2 .9-2 2v4.1c-13.8 1.1-25 12.3-25 26.2 0 4.1 1 8 2.8 11.4L15 62c-2.8 3.5-1.5 8 2.8 8h64.4c4.3 0 5.6-4.5 2.8-8l-10.8-10.3C76 48.3 77 44.4 77 40.3c0-13.9-11.2-25.1-25-26.2V10c0-1.1-.9-2-2-2zm0 8c11.6 0 21 9.4 21 21 0 4.4-1.4 8.5-3.7 11.9l-12.7 12c-1.3 1.2-3.1 1.9-4.6 1.9s-3.3-.7-4.6-1.9l-12.7-12C34.4 45.5 33 41.4 33 37c0-11.6 9.4-21 21-21zm-24 58h48v6H26v-6z" />
          </svg>
        </div>

        {/* Expansive Inner Navy / Gold Double Pinstripe */}
        <div className="absolute inset-2 sm:inset-3 border border-[#D4AF37]/40 pointer-events-none rounded-xl"></div>
        <div className="absolute inset-2.5 sm:inset-3.5 border border-[#0F172A]/15 pointer-events-none rounded-xl"></div>

        {/* 4 Vintage Corner Ornaments (Gold & Navy) */}
        <CornerOrnament className="absolute top-4 left-4" />
        <CornerOrnament className="absolute top-4 right-4" style={{ transform: 'scaleX(-1)' }} />
        <CornerOrnament className="absolute bottom-4 left-4" style={{ transform: 'scaleY(-1)' }} />
        <CornerOrnament className="absolute bottom-4 right-4" style={{ transform: 'scale(-1, -1)' }} />

        {/* Inner Content Area */}
        <div className="relative z-10 space-y-5">
          {/* TOP HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#0F172A]/15 pb-4">
            {/* Left Side: Circular Navy/Gold Seal & Brand Typography */}
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border-2 border-[#D4AF37] bg-[#0F172A] flex items-center justify-center text-amber-400 text-2xl shadow-md shrink-0">
                ⚖️
              </div>
              <div className="space-y-0.5">
                <h1 className="font-cinzel text-xl sm:text-2xl font-black text-[#0F172A] tracking-wider leading-none">
                  BJS & BAR ACADEMY
                </h1>
                <p className="font-sans text-[11px] sm:text-xs font-bold text-[#1E293B]">
                  সহকারী জজ (BJS) ও বার কাউন্সিল অ্যাডভোকেটশিপ প্রস্তুতি একাডেমি
                </p>
                <p className="font-sans text-[10px] text-slate-600">
                  Official Payment Money Receipt  •  Portal: <span className="text-[#B8860B] font-mono">https://bjs.kodl.uk</span>
                </p>
              </div>
            </div>

            {/* Right Side: OFFICIAL RECEIPT, Transaction ID & Status Pill */}
            <div className="text-left sm:text-right space-y-1.5 shrink-0">
              <h2 className="font-cinzel font-black tracking-[0.2em] text-[#B8860B] text-base sm:text-lg uppercase">
                OFFICIAL RECEIPT
              </h2>
              <div className="inline-block px-3 py-1 rounded bg-slate-100 border border-[#D4AF37]/40 text-[#0F172A] font-mono font-bold text-xs shadow-xs">
                TRANSACTION ID: #{receiptId}
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-400 font-bold text-[11px] shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>✓ PAID & SECURED</span>
                </span>
              </div>
            </div>
          </div>

          {/* HERO AMOUNT DISPLAY (BDT 1,000.00) */}
          <div className="rounded-2xl bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7] to-[#FFFBEB] border-2 border-[#D4AF37] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-cinzel text-[10px] font-bold text-[#92400E] tracking-widest uppercase">
                TOTAL AMOUNT PAID
              </span>
              <h3 className="font-cinzel font-black text-3xl sm:text-5xl text-[#0F172A] tracking-tight">
                BDT {amountFormatted}
              </h3>
              <p className="font-sans text-[10px] text-[#78350F]">
                Payment Verified & Credited to BJS Academic Council • BST (UTC+6)
              </p>
            </div>

            <div className="shrink-0">
              <div className="px-4 py-2.5 rounded-xl bg-emerald-100 border-2 border-emerald-500 text-emerald-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm">
                <span className="text-base text-emerald-700">✓</span>
                <span>PAID & SECURED</span>
              </div>
            </div>
          </div>

          {/* Filigree Ornate Divider */}
          <OrnateDivider />

          {/* TWO-COLUMN DATA DISPLAY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Left Column: STUDENT INFO */}
            <div className="rounded-xl bg-white border border-[#0F172A]/15 overflow-hidden shadow-xs flex flex-col">
              <div className="bg-[#0F172A] px-4 py-2 text-[#D4AF37] font-cinzel text-xs font-bold tracking-wider flex items-center gap-2">
                <span>✦</span>
                <span>STUDENT INFO</span>
              </div>
              <div className="p-4 space-y-3.5 flex-1 text-xs">
                <div>
                  <span className="text-slate-500 font-bold text-[10px] uppercase block">Student Full Name:</span>
                  <p className="font-cursive-vip text-2xl sm:text-3xl text-[#0F172A] font-normal leading-tight pt-0.5">
                    {receipt.studentName || 'Md Imran Hasan Khan'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold text-[10px] uppercase block">Student ID / Roll:</span>
                  <p className="font-mono text-slate-800 font-bold pt-0.5">
                    {receipt.studentId || 'STU-1789917155102-765'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold text-[10px] uppercase block">Contact Phone:</span>
                  <p className="font-mono text-slate-800 font-bold pt-0.5">
                    {receipt.studentPhone || '01800077663'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold text-[10px] uppercase block">Email Address:</span>
                  <p className="font-sans text-slate-800 font-medium pt-0.5">
                    {receipt.studentEmail || 'student@bjs.kodl.uk'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: RECEIPT DETAILS */}
            <div className="rounded-xl bg-white border border-[#0F172A]/15 overflow-hidden shadow-xs flex flex-col">
              <div className="bg-[#0F172A] px-4 py-2 text-[#D4AF37] font-cinzel text-xs font-bold tracking-wider flex items-center gap-2">
                <span>✦</span>
                <span>RECEIPT DETAILS</span>
              </div>
              <div className="p-4 space-y-3.5 flex-1 text-xs">
                <div>
                  <span className="text-slate-500 font-bold text-[10px] uppercase block">Course / Batch:</span>
                  <p className="font-bold text-[#0F172A] text-sm pt-0.5">
                    {receipt.batch || 'General Clauses Act 1887'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold text-[10px] uppercase block">Payment Method:</span>
                  <p className="font-bold text-slate-800 pt-0.5">
                    {receipt.paymentMethod || 'bKash Official'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold text-[10px] uppercase block">Transaction Reference (TrxID):</span>
                  <p className="font-mono text-amber-700 font-bold pt-0.5">
                    {receipt.trxId || 'DKJF0N0SK'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold text-[10px] uppercase block">Date & Time (BST):</span>
                  <p className="font-mono text-slate-800 font-medium pt-0.5">
                    {formattedDate}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Authenticity Citation */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 leading-relaxed font-serif italic text-center">
            "This official receipt constitutes genuine evidentiary proof of fee clearance for BJS & Bar Aspirants Academy. Digitally attested under the authoritative supervision of the Academic Council. Permanent cryptographic record indexed on https://bjs.kodl.uk."
          </div>

          {/* BOTTOM VERIFICATION FOOTER (ROYAL NAVY #1E293B) */}
          <div className="rounded-2xl bg-[#1E293B] text-white p-5 sm:p-7 border-t-4 border-b-4 border-[#D4AF37] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Left Area: 3D Official Payee Seal & Director Signature */}
            <div className="flex items-center gap-4 text-left">
              {/* Official Payee Seal (Double Ring Gold Emblem) */}
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#D4AF37] bg-[#D4AF37]/10 flex flex-col items-center justify-center text-center p-1 shadow-inner shrink-0">
                <span className="text-base text-amber-300">⚖️</span>
                <span className="text-[8px] font-cinzel font-bold text-[#D4AF37] leading-none mt-1 uppercase">
                  OFFICIAL<br/>PAYEE SEAL<br/>2026
                </span>
              </div>

              {/* Signature & Designation */}
              <div className="space-y-1">
                <p className="font-cursive-vip text-2xl text-amber-300 drop-shadow-sm leading-none">
                  Shanto Deb Roy Arno
                </p>
                <div className="w-36 h-px bg-slate-500"></div>
                <p className="font-cinzel text-xs font-bold text-white uppercase tracking-wider">
                  DIRECTOR, BJS & BAR ACADEMY
                </p>
                <p className="font-sans text-[10px] text-slate-400">
                  Digital Signatory  •  Authorized Signatory
                </p>
                <p className="font-mono text-[9px] text-amber-400/90 font-bold uppercase">
                  Official Payee Seal of Authenticity
                </p>
              </div>
            </div>

            {/* Right Area: Scannable High-Contrast QR Code Card */}
            <div className="flex flex-col items-center text-center shrink-0">
              <div className="bg-white p-2.5 rounded-xl border-2 border-[#D4AF37] shadow-md space-y-1.5 inline-block">
                <img
                  src={qrUrl}
                  alt="Scan to Verify Receipt"
                  className="w-24 h-24 object-contain mx-auto rounded"
                />
                <p className="font-cinzel text-[10px] font-bold text-[#0F172A] tracking-widest uppercase">
                  SCAN TO VERIFY
                </p>
                <p className="font-mono text-[9px] font-bold text-[#D4AF37]">
                  {receiptId}
                </p>
              </div>
              <p className="text-[9px] text-slate-400 font-mono mt-1">
                bjs.kodl.uk/verify
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
