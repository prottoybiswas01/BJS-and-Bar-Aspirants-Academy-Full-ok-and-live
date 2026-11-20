const mongoose = require('mongoose');
const QRCode = require('qrcode');
const { generateCertificatePdf } = require('./certificateService');
const { sendTelegramAlert, notifyNewLesson } = require('./alertService');

function sanitizeGeminiModel(model) {
  if (!model || typeof model !== 'string') return 'gemini-2.5-flash';
  const cleaned = model.trim().replace(/[\r\n"']/g, '').replace(/^models\//, '');
  return cleaned || 'gemini-2.5-flash';
}

function sanitizeGeminiApiKey(key) {
  if (!key || typeof key !== 'string') return '';
  return key.trim().replace(/[\r\n"']/g, '');
}

/**
 * Dynamic Legal Study Notes (100% database & AI-driven - zero static articles)
 */
async function seedDefaultStudyNotes() {
  // Zero hardcoded notes in codebase - strictly dynamic DB driven
  return [];
}

/**
 * AI-Driven Legal Study Guide Generator from Class Transcript using Gemini API
 */
async function generateStudyNotesFromLesson({
  lessonId,
  Lesson,
  StudyNote,
  Course,
  resolveOptimalGeminiModel
}) {
  const lesson = await Lesson.findOne({
    $or: [
      { id: lessonId },
      ...(mongoose.isValidObjectId(lessonId) ? [{ _id: lessonId }] : [])
    ]
  }).lean();
  if (!lesson) {
    throw new Error('লেসন পাওয়া যায়নি।');
  }

  const course = await Course.findOne({
    $or: [
      { id: lesson.courseId },
      ...(mongoose.isValidObjectId(lesson.courseId) ? [{ _id: lesson.courseId }] : [])
    ]
  }).lean();
  const courseTitle = course ? course.title : (lesson.courseTitle || 'BJS & Bar Masterclass');

  const transcript = lesson.transcript || lesson.subtitles || '';
  if (!transcript || transcript.length < 50) {
    throw new Error('এই লেসনে কোনো সাবটাইটেল বা ট্রান্সক্রিপ্ট পাওয়া যায়নি। অনুগ্রহ করে প্রথমে ট্রান্সক্রিপ্ট সিঙ্ক করুন।');
  }

  const geminiApiKey = sanitizeGeminiApiKey(process.env.GEMINI_API_KEY || process.env.REMOTE_GEMINI_API_KEY);
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY কনফিগার করা নেই।');
  }

  let resolvedOptimal = 'gemini-2.5-flash';
  if (typeof resolveOptimalGeminiModel === 'function') {
    try {
      resolvedOptimal = await resolveOptimalGeminiModel(geminiApiKey);
    } catch (e) {
      resolvedOptimal = 'gemini-2.5-flash';
    }
  }
  const optimalModel = sanitizeGeminiModel(resolvedOptimal);

  const prompt = `You are a Senior Judicial Research Scholar and Supreme Court Advocate specializing in Bangladesh Judicial Service (BJS) & Bangladesh Bar Council examination curriculum.

Analyze the class lecture transcript provided below for lesson: "${lesson.title}" (${courseTitle}).
Extract 3 to 4 distinct, high-demand, complex legal provisions or core concepts (for example: CPC Order 39 Rule 1 & 2, CrPC Section 167, Penal Code 405/420, Evidence Act 27, Limitation Act 5, etc.) that were discussed in this class.

For each provision, you MUST:
1. Identify the exact, complete video clip segment in seconds (clipStartSeconds and clipEndSeconds, between 60 and 300 seconds max) where this entire legal provision or topic is explained from beginning to completion. The clip MUST cover a complete section without cutting off mid-sentence or mid-explanation.
2. Provide a rigorous, BJS standard Bangla explanation formatted in clean Markdown with:
   - প্রবিধানের মূল ভিত্তি ও আইনি সংজ্ঞা
   - উপাদান ও শর্তাবলি (Essential elements)
   - বিচারিক পর্যবেক্ষণ বা ল্যান্ডমার্ক কেস ল (যদি প্রযোজ্য হয়)
   - বিজেএস ও বার কাউন্সিল পরীক্ষার প্রস্তুতি টিপস ও সাধারণ ভুলসমূহ
3. Generate SEO metadata in English & Bengali for search rankings.

Return strictly a valid JSON array of objects in this exact schema (no markdown wrap, just raw JSON array):
[
  {
    "title": "সম্পূর্ণ ও আকর্ষণীয় শিরোনাম (বাংলা)",
    "slug": "unique-seo-friendly-english-slug-like-cpc-order-39-temporary-injunction",
    "category": "${courseTitle}",
    "summary": "১-২ লাইনের মূল সারসংক্ষেপ যা স্টুডেন্ট কার্ড ও গুগলে প্রদর্শিত হবে",
    "content": "পূর্ণাঙ্গ আইনি স্টাডি গাইড (Markdown formatted with ##, ###, *, 1., >)",
    "lawSections": ["CPC Order 39 Rule 1", "Specific Relief Act Sec 53"],
    "readTime": "৫ মিনিট",
    "clipStartSeconds": 120,
    "clipEndSeconds": 360,
    "seoTitle": "SEO Title for Google (under 60 chars)",
    "seoDescription": "Meta description for SEO (120-155 chars)",
    "seoKeywords": ["BJS exam", "Order 39 Rule 1", "অস্থায়ী নিষেধাজ্ঞা", "CPC Bangladesh"]
  }
]

Transcript:
${transcript.slice(0, 18000)}`;

  const candidateModels = [
    process.env.GEMINI_MODEL ? sanitizeGeminiModel(process.env.GEMINI_MODEL) : null,
    optimalModel,
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-3.8-flash',
    'gemini-pro-latest'
  ].filter(Boolean).map(sanitizeGeminiModel).filter((v, i, a) => a.indexOf(v) === i);

  let resData = null;
  let lastErr = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.25,
            topP: 0.85
          }
        })
      });

      if (response.ok) {
        resData = await response.json();
        break;
      } else {
        const errorText = await response.text();
        console.warn(`[Gemini Note Gen] Model ${model} returned ${response.status}: ${errorText.slice(0, 150)}`);
        lastErr = new Error(`Gemini API Error (${model} - ${response.status}): ${errorText.slice(0, 150)}`);
      }
    } catch (err) {
      console.warn(`[Gemini Note Gen] Network error with ${model}:`, err.message);
      lastErr = err;
    }
  }

  if (!resData) {
    throw lastErr || new Error('Gemini API থেকে উত্তর পাওয়া যায়নি।');
  }

  const textOutput = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const jsonMatch = textOutput.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (!jsonMatch) {
    throw new Error('Gemini did not return valid JSON array: ' + textOutput.slice(0, 200));
  }

  const generated = JSON.parse(jsonMatch[0]);
  const savedNotes = [];

  for (const item of generated) {
    const rawSlug = (item.slug || item.title).toLowerCase().replace(/[^a-z0-9\u0980-\u09FF]+/g, '-').replace(/(^-|-$)/g, '');
    const noteId = `note-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const clipStart = Math.max(0, Number(item.clipStartSeconds) || 0);
    const rawClipEnd = Math.max(clipStart + 30, Number(item.clipEndSeconds) || (clipStart + 180));
    const clipEnd = Math.min(rawClipEnd, clipStart + 300); // 5 minutes max
    const clipDuration = Math.max(0, clipEnd - clipStart);

    const noteDoc = await StudyNote.findOneAndUpdate(
      { slug: rawSlug },
      {
        id: noteId,
        title: item.title,
        slug: rawSlug,
        category: item.category || courseTitle || 'BJS সিলেবাস ও প্রস্তুতি',
        summary: item.summary || '',
        content: item.content,
        detailedExplanation: item.content || '',
        sectionReference: Array.isArray(item.lawSections) ? item.lawSections.join(', ') : '',
        lawSections: Array.isArray(item.lawSections) ? item.lawSections : [],
        readTime: item.readTime || '৫ মিনিট',
        isPublished: true,
        sourceCourseId: lesson.courseId,
        sourceLessonId: lesson.id,
        courseId: lesson.courseId,
        courseTitle,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        videoUrl: lesson.youtubeUrl || (lesson.youtubeId ? `https://www.youtube.com/watch?v=${lesson.youtubeId}` : ''),
        youtubeId: lesson.youtubeId || '',
        clipStartSeconds: clipStart,
        clipEndSeconds: clipEnd,
        clipDuration,
        seoTitle: item.seoTitle || item.title,
        seoDescription: item.seoDescription || item.summary,
        seoKeywords: Array.isArray(item.seoKeywords) ? item.seoKeywords : [],
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    savedNotes.push(noteDoc);
  }

  return savedNotes;
}

/**
 * AI Auto-MCQ Generator using Gemini API and Lesson Transcript
 */
async function generateAiMcqsFromTranscript({
  courseId,
  lessonIds,
  lessonId,
  numQuestions,
  questionCount = 10,
  durationMinutes = 20,
  negativeMarks = 0.25,
  Lesson,
  McqExam,
  resolveOptimalGeminiModel
}) {
  const targetIds = Array.isArray(lessonIds) && lessonIds.length > 0
    ? lessonIds
    : (lessonId ? [lessonId] : []);

  let query = {};
  if (targetIds.length > 0) {
    query = {
      $or: [
        { id: { $in: targetIds } },
        { _id: { $in: targetIds.filter(id => mongoose.isValidObjectId(id)) } }
      ]
    };
  } else if (courseId) {
    query.courseId = courseId;
  }

  const lessons = await Lesson.find(query).limit(20).lean();
  if (!lessons || lessons.length === 0) {
    throw new Error('কোনো ক্লাস ভিডিও বা লেকচার ডাটা পাওয়া যায়নি।');
  }

  // Combine transcripts from all selected lessons
  const transcriptParts = lessons
    .map(l => {
      const text = l.transcript || l.subtitles || '';
      return `[পাঠ/লেসন: "${l.title}" (${l.courseTitle || l.chapter || 'আইন'})]:\n${text}`;
    })
    .filter(p => p.length > 20);

  const transcriptText = transcriptParts.join('\n\n---\n\n').slice(0, 30000);

  if (transcriptText.length < 50) {
    throw new Error('নির্বাচিত ক্লাসে পর্যাপ্ত সাবটাইটেল বা ট্রান্সক্রিপ্ট টেক্সট পাওয়া যায়নি।');
  }

  const finalCount = Math.max(1, Math.min(Number(questionCount || numQuestions) || 10, 100));

  const prompt = `You are a Senior Judicial Research Scholar and Supreme Court Advocate specializing in Bangladesh Judicial Service (BJS) & Bangladesh Bar Council examination curriculum.

Based on the following lecture transcript from BJS Academy (${lessons.length} lesson(s) combined), generate exactly ${finalCount} high-yield multiple choice questions (MCQ) in Bengali adhering strictly to BJS preliminary examination standards.

Each question must test conceptual understanding of Bangladesh law (Penal Code, CPC, CrPC, Evidence Act, Constitution, Family Law, etc.) discussed in the transcript.
Output ONLY a valid JSON array of objects with the exact schema:
[
  {
    "questionText": "প্রশ্ন...",
    "options": ["বিকল্প ক", "বিকল্প খ", "বিকল্প গ", "বিকল্প ঘ"],
    "correctIndex": 0,
    "explanation": "আইনি ধারা ও ব্যাখ্যামূলক বিশ্লেষণ..."
  }
]

Transcript:
${transcriptText}`;

  const geminiApiKey = sanitizeGeminiApiKey(process.env.GEMINI_API_KEY || process.env.REMOTE_GEMINI_API_KEY);
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY কনফিগার করা নেই।');
  }

  let resolvedOptimal = 'gemini-2.5-flash';
  if (typeof resolveOptimalGeminiModel === 'function') {
    try {
      resolvedOptimal = await resolveOptimalGeminiModel(geminiApiKey);
    } catch (e) {
      resolvedOptimal = 'gemini-2.5-flash';
    }
  }
  const optimalModel = sanitizeGeminiModel(resolvedOptimal);

  const candidateModels = [
    process.env.GEMINI_MODEL ? sanitizeGeminiModel(process.env.GEMINI_MODEL) : null,
    optimalModel,
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-3.8-flash',
    'gemini-pro-latest'
  ].filter(Boolean).map(sanitizeGeminiModel).filter((v, i, a) => a.indexOf(v) === i);

  let resData = null;
  let lastErr = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.85
          }
        })
      });

      if (response.ok) {
        resData = await response.json();
        break;
      } else {
        const errorText = await response.text();
        console.warn(`[Gemini MCQ Gen] Model ${model} returned ${response.status}: ${errorText.slice(0, 150)}`);
        lastErr = new Error(`Gemini API Error (${model} - ${response.status}): ${errorText.slice(0, 150)}`);
      }
    } catch (err) {
      console.warn(`[Gemini MCQ Gen] Network error with ${model}:`, err.message);
      lastErr = err;
    }
  }

  if (!resData) {
    throw lastErr || new Error('Gemini API থেকে উত্তর পাওয়া যায়নি।');
  }

  const textOutput = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const jsonMatch = textOutput.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (!jsonMatch) {
    throw new Error('Gemini থেকে সঠিক MCQ ফরম্যাট তৈরি করা যায়নি।');
  }

  const rawQuestions = JSON.parse(jsonMatch[0]);
  const formattedQuestions = rawQuestions.map((q, idx) => ({
    id: `q-ai-${Date.now()}-${idx + 1}`,
    questionText: q.questionText,
    options: Array.isArray(q.options) ? q.options.slice(0, 4) : ['ক', 'খ', 'গ', 'ঘ'],
    correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
    explanation: q.explanation || ''
  }));

  const lessonTitles = lessons.map(l => l.title);
  const examTitle = lessonTitles.length === 1
    ? `AI মডেল টেস্ট: ${lessonTitles[0]} (${formattedQuestions.length} প্রশ্ন)`
    : `AI সমন্বিত মডেল টেস্ট: ${lessonTitles.slice(0, 2).join(' + ')}${lessonTitles.length > 2 ? ` ও আরও ${lessonTitles.length - 2}টি লেসন` : ''} (${formattedQuestions.length} প্রশ্ন)`;

  const courseTitle = lessons[0]?.chapter || lessons[0]?.courseTitle || lessons[0]?.courseId || 'BJS Law Masterclass';
  const newExamId = `EXAM-AI-${Date.now()}`;
  const newExam = await McqExam.create({
    id: newExamId,
    title: examTitle,
    courseId: courseId || lessons[0]?.courseId || '',
    courseTitle,
    subject: lessons[0]?.chapter || 'আইন প্রস্তুতি',
    durationMinutes: Number(durationMinutes) || Math.max(10, Math.ceil(formattedQuestions.length * 1.5)),
    totalMarks: formattedQuestions.length,
    totalQuestions: formattedQuestions.length,
    passPercentage: 50,
    isPublic: true,
    isLiveModelTest: false,
    negativeMarks: Number(negativeMarks) || 0.25,
    questions: formattedQuestions,
    createdBy: 'Gemini AI Auto-Generator'
  });

  return newExam;
}

/**
 * Get Leaderboard for an MCQ Exam
 */
async function getExamLeaderboard(param) {
  let examId;
  let McqExam;
  let McqResult;

  if (typeof param === 'string') {
    examId = param;
  } else if (param && typeof param === 'object') {
    examId = param.examId || param.id;
    McqExam = param.McqExam;
    McqResult = param.McqResult;
  }

  if (!McqExam) McqExam = require('../models/McqExam');
  if (!McqResult) McqResult = require('../models/McqResult');

  const isObjectId = mongoose.isValidObjectId(examId);
  const examQuery = isObjectId
    ? { $or: [{ id: examId }, { _id: examId }] }
    : { id: examId };

  const exam = await McqExam.findOne(examQuery).lean();
  if (!exam) {
    throw new Error('পরীক্ষা খুঁজে পাওয়া যায়নি।');
  }

  const resultQuery = isObjectId
    ? { $or: [{ examId: exam.id }, { examId: exam._id.toString() }, { examId: String(examId) }] }
    : { examId: exam.id || examId };

  const results = await McqResult.find(resultQuery)
    .sort({ netScore: -1, score: -1, timeTakenSeconds: 1, submittedAt: 1 })
    .limit(100)
    .lean();

  const leaderboard = results.map((r, idx) => ({
    rank: idx + 1,
    studentName: r.studentName || r.candidateName || 'পরীক্ষার্থী',
    candidateName: r.candidateName || r.studentName || 'পরীক্ষার্থী',
    candidateUniversity: r.candidateUniversity || 'BJS পরীক্ষার্থী',
    studentPhone: r.studentPhone ? r.studentPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '***',
    score: r.score,
    netScore: r.netScore !== undefined && r.netScore !== null ? r.netScore : r.score,
    totalMarks: r.totalMarks,
    correctCount: r.correctCount || Math.round(r.score),
    wrongCount: r.wrongCount || 0,
    negativeDeduction: r.negativeDeduction || 0,
    percentage: r.percentage,
    grade: r.grade,
    timeTakenSeconds: r.timeTakenSeconds || 0,
    submittedAt: r.submittedAt
  }));

  return {
    ok: true,
    exam: {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      totalQuestions: exam.totalQuestions,
      fullMarks: exam.totalMarks,
      negativeMarks: exam.negativeMarks,
      isLiveModelTest: exam.isLiveModelTest || false,
      liveStartTime: exam.liveStartTime,
      liveEndTime: exam.liveEndTime
    },
    examTitle: exam.title,
    isLiveModelTest: exam.isLiveModelTest || false,
    liveStartTime: exam.liveStartTime,
    liveEndTime: exam.liveEndTime,
    totalParticipants: results.length,
    totalCandidates: results.length,
    leaderboard
  };
}

module.exports = {
  seedDefaultStudyNotes,
  generateAiMcqsFromTranscript,
  getExamLeaderboard,
  generateStudyNotesFromLesson
};
