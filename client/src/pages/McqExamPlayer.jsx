import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function McqExamPlayer({ examId, onBack }) {
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  // Candidate Info State
  const [candidate, setCandidate] = useState({
    name: '',
    phone: '',
    email: '',
    university: 'ঢাকা বিশ্ববিদ্যালয় (আইন বিভাগ)'
  });
  const [step, setStep] = useState('info'); // info | test | result

  // Exam Answers & Timer State
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(1800); // 30 mins
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!examId) return;
    setLoading(true);
    api.get(`/mcq-exams/${examId}`)
      .then(res => {
        if (res.data.ok && res.data.exam) {
          setExam(res.data.exam);
          setTimeLeft((res.data.exam.durationMinutes || 30) * 60);
        }
      })
      .catch(err => {
        console.error("Error loading MCQ exam:", err);
      })
      .finally(() => setLoading(false));
  }, [examId]);

  // Countdown Timer Effect
  useEffect(() => {
    if (step !== 'test' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const handleStartExam = (e) => {
    e.preventDefault();
    if (!candidate.name) {
      alert("পরীক্ষার্থীর নাম পূরণ করা আবশ্যক।");
      return;
    }
    setStep('test');
  };

  const handleOptionSelect = (qId, optionIdx) => {
    setAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  const handleSubmitExam = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post('/mcq-exams/submit', {
        examId,
        candidateName: candidate.name,
        candidatePhone: candidate.phone,
        candidateEmail: candidate.email,
        candidateUniversity: candidate.university,
        answers
      });
      if (res.data.ok) {
        setResult(res.data.result);
        setStep('result');
      } else {
        alert(res.data.message || "পরীক্ষা সাবমিশনে সমস্যা হয়েছে।");
      }
    } catch (err) {
      console.error("MCQ Submit Error:", err);
      alert(err.response?.data?.message || "পরীক্ষা সাবমিট করতে সমস্যা হয়েছে।");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const now = new Date();
  const isUpcoming = exam?.startDate && new Date(exam.startDate) > now;
  const isExpired = exam?.endDate && new Date(exam.endDate) < now;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070d19] text-white flex items-center justify-center p-6">
        <div className="text-amber-400 font-bold text-sm">⏳ অনলাইন এমসিকিউ পরীক্ষা লোড হচ্ছে...</div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-[#070d19] text-white flex flex-col items-center justify-center p-6 space-y-4">
        <p className="text-rose-400 font-bold">⚠️ এমসিকিউ পরীক্ষাটি খুঁজে পাওয়া যায়নি বা বন্ধ করা হয়েছে।</p>
        <button onClick={onBack} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs">
          ← হোমপেজে ফিরে যান
        </button>
      </div>
    );
  }

  if (isUpcoming) {
    return (
      <div className="min-h-screen bg-[#070d19] text-white flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <span className="text-5xl">⏳</span>
        <h2 className="text-xl font-bold text-amber-400">পরীক্ষার সময় নির্ধারিত হয়নি বা এখনো শুরু হয়নি</h2>
        <p className="text-xs text-slate-300 max-w-md leading-relaxed">
          এই পরীক্ষাটি আগামী <strong className="text-amber-300 font-mono">{new Date(exam.startDate).toLocaleString()}</strong> এ শুরু হবে। নির্ধারিত সময়ে পরীক্ষা দেওয়া শুরু করুন।
        </p>
        <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors">
          ← প্রধান পেজে ফিরে যান
        </button>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#070d19] text-white flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <span className="text-5xl">🔒</span>
        <h2 className="text-xl font-bold text-rose-400">পরীক্ষার সময়সীমা অতিক্রান্ত হয়েছে</h2>
        <p className="text-xs text-slate-300 max-w-md leading-relaxed">
          এই পরীক্ষার নির্ধারিত সময়সীমা (<strong className="text-rose-300 font-mono">{new Date(exam.endDate).toLocaleString()}</strong>) শেষ হওয়ায় উত্তর সাবমিট করা বন্ধ রয়েছে।
        </p>
        <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors">
          ← প্রধান পেজে ফিরে যান
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070d19] text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Banner */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
              ⚖️ BJS & BAR ASPIRANTS ACADEMY
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">{exam.title}</h1>
            <p className="text-xs text-slate-400">
              সময়: {exam.durationMinutes} মিনিট | মোট প্রশ্ন: {exam.questions?.length || 40}টি | পাস মার্ক: {exam.passPercentage}%
            </p>
          </div>

          <button onClick={onBack} className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800 shrink-0">
            ← প্রধান পেজ
          </button>
        </div>

        {/* STEP 1: Candidate Info Entry */}
        {step === 'info' && (
          <form onSubmit={handleStartExam} className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6 max-w-xl mx-auto">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-amber-400">পরীক্ষার্থীর তথ্য প্রদান করুন</h2>
              <p className="text-xs text-slate-400">পরীক্ষা শুরু করার পূর্বে আপনার সঠিক তথ্য ইনপুট দিন</p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">পরীক্ষার্থীর নাম (Candidate Name) *</label>
                <input
                  type="text"
                  required
                  value={candidate.name}
                  onChange={e => setCandidate({ ...candidate, name: e.target.value })}
                  placeholder="e.g. মোঃ তানভীর আহমেদ"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">মোবাইল নম্বর (Phone Number)</label>
                <input
                  type="text"
                  value={candidate.phone}
                  onChange={e => setCandidate({ ...candidate, phone: e.target.value })}
                  placeholder="e.g. 01712345678"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500">একাডেমির নিবন্ধিত ফোন দিলে আপনার স্টুডেন্ট ড্যাশবোর্ডে অটো-ম্যাচ হবে</span>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">ইমেইল এড্রেস (Email Address)</label>
                <input
                  type="email"
                  value={candidate.email}
                  onChange={e => setCandidate({ ...candidate, email: e.target.value })}
                  placeholder="e.g. tanvir@gmail.com"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-slate-500">পরীক্ষা শেষে তাৎক্ষণিক রেজাল্ট কার্ড আপনার ইমেইলে চলে যাবে</span>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">বিশ্ববিদ্যালয় / ল ইনস্টিটিউট</label>
                <input
                  type="text"
                  value={candidate.university}
                  onChange={e => setCandidate({ ...candidate, university: e.target.value })}
                  placeholder="e.g. ঢাকা বিশ্ববিদ্যালয় (আইন বিভাগ)"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              🚀 পরীক্ষা শুরু করুন (Start MCQ Exam)
            </button>
          </form>
        )}

        {/* STEP 2: Live MCQ Question Test Player */}
        {step === 'test' && (
          <div className="space-y-6">
            {/* Sticky Timer Bar */}
            <div className="sticky top-20 z-30 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 backdrop-blur-md flex items-center justify-between shadow-xl">
              <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                <span>⏱️ অবশিষ্টাংশ সময়:</span>
                <strong className={`font-mono text-base ${timeLeft < 180 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                  {formatTime(timeLeft)}
                </strong>
              </span>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                উত্তর প্রদান: {Object.keys(answers).length} / {exam.questions.length}
              </span>
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {exam.questions.map((q, qIdx) => (
                <div key={q.id || qIdx} className="glass-card rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold flex items-center justify-center text-xs shrink-0 border border-amber-500/30">
                      {qIdx + 1}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white leading-relaxed">{q.questionText}</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2 sm:pl-10">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = answers[q.id] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleOptionSelect(q.id, optIdx)}
                          className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isSelected ? 'bg-amber-500 text-slate-950 border-amber-400' : 'border-slate-700 text-slate-400'
                          }`}>
                            {['ক', 'খ', 'গ', 'ঘ'][optIdx] || String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={handleSubmitExam}
                disabled={submitting}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                {submitting ? 'সাবমিট হচ্ছে...' : '✓ পরীক্ষা জমা দিন (Submit Exam)'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Result Summary & Detailed Answer Key with Explanations */}
        {step === 'result' && result && (
          <div className="space-y-6 animate-fadeIn">
            {/* Result Score Card */}
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 text-center space-y-4">
              <span className="text-4xl">🏆</span>
              <h2 className="text-xl font-black text-white">আপনার পরীক্ষার ফলাফল</h2>
              
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">প্রাপ্ত নম্বর</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">{result.score} / {result.totalMarks}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">পার্সেন্টেজ</span>
                  <span className="text-xl font-black text-amber-400 font-mono">{result.percentage}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">গ্রেড/স্ট্যাটাস</span>
                  <span className="text-sm font-bold text-cyan-300">{result.grade}</span>
                </div>
              </div>

              {result.candidateEmail && (
                <p className="text-xs text-emerald-400 font-medium">
                  ✓ একটি বিস্তারিত রেজাল্ট ইমেইল কার্ড আপনার <strong>{result.candidateEmail}</strong> ঠিকানায় পাঠানো হয়েছে!
                </p>
              )}
            </div>

            {/* Detailed Answer Key & Explanations Section */}
            <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
              <h3 className="text-base font-extrabold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <span>📝 সঠিক উত্তর ও বিস্তারিত ব্যাখ্যা (Answer Key & Explanations)</span>
              </h3>

              <div className="space-y-5">
                {exam.questions.map((q, idx) => {
                  const userAns = result.userAnswers?.find(a => a.questionId === q.id);
                  const isUserCorrect = userAns ? userAns.isCorrect : false;

                  return (
                    <div key={q.id || idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-white">
                          Q{idx + 1}. {q.questionText}
                        </h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                          isUserCorrect ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30' : 'bg-rose-950 text-rose-300 border-rose-500/30'
                        }`}>
                          {isUserCorrect ? 'সঠিক ✓' : 'ভুল/উত্তরহীন ✕'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt, oIdx) => {
                          const isCorrectOption = oIdx === q.correctIndex;
                          const isUserSelected = userAns && userAns.selectedIndex === oIdx;

                          let bgClass = 'bg-slate-900 border-slate-800 text-slate-400';
                          if (isCorrectOption) {
                            bgClass = 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 font-bold';
                          } else if (isUserSelected && !isCorrectOption) {
                            bgClass = 'bg-rose-950/80 border-rose-500/50 text-rose-300 line-through';
                          }

                          return (
                            <div key={oIdx} className={`p-2.5 rounded-xl border ${bgClass} flex items-center justify-between`}>
                              <span>[{['ক', 'খ', 'গ', 'ঘ'][oIdx] || String.fromCharCode(65 + oIdx)}] {opt}</span>
                              {isCorrectOption && <span className="text-[10px] text-emerald-400 font-extrabold">সঠিক উত্তর ✓</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Detailed Explanation / ব্যাখ্যা Block */}
                      {q.explanation && (
                        <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs leading-relaxed space-y-1">
                          <span className="font-bold block text-amber-400 text-[11px]">💡 উত্তর ব্যাখ্যা (Explanation):</span>
                          <p>{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
