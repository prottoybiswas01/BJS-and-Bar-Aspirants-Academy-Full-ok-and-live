const { retrieveVerifiedSources } = require('./bdLawSourceService');
const { searchLessonsForQuery } = require('./transcriptService');

/**
 * Call Google Gemini API with Grounded Context from Authentic Bangladesh Statutes
 * AND Matched Academy Video Transcripts / Subtitles
 */
async function callGroundedGeminiAi({ query, verifiedSources = [], matchedLessons = [], apiKey }) {
  // Construct grounded statutory reference context
  const sourceContext = verifiedSources.map((s, idx) => {
    return `[উৎস ${idx + 1}]
আইনের নাম: ${s.actTitleBn} (${s.actTitleEn}, ${s.actNumber || s.year})
আইনের স্থিতি: ${s.statusBn || s.status}
ধারা/অনুচ্ছেদ: ${s.sectionType} ${s.sectionNumBn || s.sectionNum} (${s.titleBn})
মূল সরকারি বিধিবদ্ধ পাঠ্য:
"${s.excerptBn}"
সরকারি সোর্স লিংক: ${s.directUrl || s.sourceUrl}`;
  }).join('\n\n');

  // Construct matched academy video subtitles reference context
  let videoContext = '';
  if (matchedLessons && matchedLessons.length > 0) {
    videoContext = matchedLessons.map((l, idx) => {
      return `[অ্যাকাডেমি ভিডিও ক্লাস ${idx + 1}]
ভিডিওর শিরোনাম: ${l.title || 'ক্লাস'}
কোর্স/অধ্যায়: ${l.chapter || l.module || 'বিজিএস ও বার প্রস্তুতি'}
নির্দিষ্ট টাইমস্ট্যাম্প: ${l.timestamp || '[00:00]'}
ক্লাসের প্রাসঙ্গিক আলোচনা (সাবটাইটেল অংশ):
"${l.snippet || ''}"`;
    }).join('\n\n');
  }

  const prompt = `তুমি "BJS & Bar Aspirants Academy"-র অফিসিয়াল এআই আইন পরামর্শক (আইন সহকারী)।
শিক্ষার্থীর আইনি প্রশ্ন: "${query}"

${sourceContext ? `নিচে গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের অফিসিয়াল লেজিসলেটিভ পোর্টাল (bdlaws.minlaw.gov.bd) ও সুপ্রিম কোর্টের যাচাইকৃত মূল বিধিবদ্ধ আইনি নথি দেওয়া হলো:
========================
${sourceContext}
========================` : ''}

${videoContext ? `নিচে আমাদের একাডেমির সংশ্লিষ্ট লেকচার ভিডিও ক্লাস ও সাবটাইটেল (Transcripts) থেকে প্রাপ্ত প্রাসঙ্গিক অংশ দেওয়া হলো:
========================
${videoContext}
========================` : ''}

নির্দেশনা:
১. ${sourceContext ? 'শুধুমাত্র উপরে প্রদত্ত সরকারি মূল আইনি নথির তথ্যের ওপর ভিত্তি করে সহজ, প্রমিত বাংলায় সরাসরি উত্তর দাও।' : 'উপরে প্রদত্ত একাডেমির ভিডিও ক্লাসের আলোচনা ও প্রমিত আইনের তথ্যের ওপর ভিত্তি করে সঠিক উত্তর দাও।'}
২. মনগড়া কোনো ধারা বা কাল্পনিক তথ্য দেবে না। উত্তরের সাথে প্রাসঙ্গিক ধারা/অনুচ্ছেদের সুনির্দিষ্ট উল্লেখ করো।
৩. পয়েন্ট আকারে স্পষ্ট ও বোধগম্য করো যাতে শিক্ষার্থী বিজিএস বা বার কাউন্সিল পরীক্ষায় সঠিক উত্তর প্রদান করতে পারে।
${videoContext ? `৪. উত্তরের একদম শেষে অবশ্যই আমাদের একাডেমির ভিডিও ক্লাসের স্পষ্ট রেফারেন্স যুক্ত করো (যেখানে শিক্ষার্থীর পড়ার সুবিধার্থে ক্লাসের সঠিক শিরোনাম এবং নির্দিষ্ট সময়/টাইমস্ট্যাম্প স্পষ্টভাবে উল্লেখ থাকবে, যেমন: "📺 একাডেমি ক্লাস রেফারেন্স: [ক্লাসের শিরোনাম] — প্রাসঙ্গিক আলোচনা: [টাইমস্ট্যাম্প]")।` : ''}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 950
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini Provider Error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response received from AI provider");

  return text;
}

/**
 * Synthesize clean statutory answer from verified sources and matched video lessons
 */
function synthesizeStatutoryAnswer(query, verifiedSources = [], matchedLessons = []) {
  if ((!verifiedSources || verifiedSources.length === 0) && (!matchedLessons || matchedLessons.length === 0)) {
    return 'এই প্রশ্নের নির্ভরযোগ্য মূল নথি এখন যাচাই করা যায়নি।';
  }

  let answer = '';
  if (verifiedSources && verifiedSources.length > 0) {
    const top = verifiedSources[0];
    answer = `⚖️ **যাচাইকৃত আইনি সমাধান:**\n\n` +
      `**সংশ্লিষ্ট আইন:** ${top.actTitleBn} (${top.actTitleEn})\n` +
      `**আইনের স্থিতি:** ${top.statusBn || 'কার্যকর আইন'}\n` +
      `**সংশ্লিষ্ট ধারা/অনুচ্ছেদ:** ${top.sectionType} ${top.sectionNumBn || top.sectionNum} — ${top.titleBn}\n\n` +
      `📌 **মূল আইনি বিধান ও পর্যালোচনা:**\n` +
      `${top.excerptBn}\n\n` +
      `উক্ত আইনের সরাসরি সরকারি গেজেট ও লেজিসলেটিভ নথি বিস্তারিত দেখতে নিচে "মূল উৎস দেখুন" বাটনে ক্লিক করুন।`;

    if (verifiedSources.length > 1) {
      const second = verifiedSources[1];
      answer += `\n\n📌 **অতিরিক্ত প্রাসঙ্গিক বিধান:**\n` +
        `• ${second.actTitleBn}: ${second.sectionType} ${second.sectionNumBn || second.sectionNum} (${second.titleBn})`;
    }
  }

  if (matchedLessons && matchedLessons.length > 0) {
    const topLesson = matchedLessons[0];
    const lessonRef = `\n\n📺 **একাডেমি ভিডিও ক্লাস ও সাবটাইটেল রেফারেন্স:**\n` +
      `• **ক্লাস:** ${topLesson.title} (${topLesson.chapter || topLesson.module || 'কোর্স'})\n` +
      `• **আলোচনার সময় (Timestamp):** \`${topLesson.timestamp || '[00:00]'}\`\n` +
      `• **সংক্ষিপ্ত নোট:** "${topLesson.snippet || ''}"`;
    answer = answer ? (answer + lessonRef) : (`⚖️ **একাডেমি ক্লাস পর্যালোচনা:**\n${lessonRef}`);
  }

  return answer;
}

/**
 * Main Grounded Legal AI Query Processor
 * - Strictly connects to verified Bangladesh Law sources
 * - Grounds AI answer in academy video transcripts with precise [MM:SS] timestamps
 * - Distinguishes provider failures from source unavailability
 */
async function processLegalAiQuery({ query, studentName = 'শিক্ষার্থী', allLessons = [] }) {
  if (!query || !query.trim()) {
    return {
      ok: false,
      message: 'অনুগ্রহ করে আপনার আইনি প্রশ্ন বা সমস্যাটি লিখুন।'
    };
  }

  const cleanQuery = query.trim();

  // 1. Search Video Transcripts / Subtitles for matched academy lessons FIRST
  const matchedLessons = searchLessonsForQuery(cleanQuery, allLessons, 3);

  // 2. Retrieve verified authentic Bangladesh legal sources
  const sourceResult = await retrieveVerifiedSources(cleanQuery);

  // 2a. Handle Ambiguous queries
  if (sourceResult.isAmbiguous && (!matchedLessons || matchedLessons.length === 0)) {
    return {
      ok: true,
      query: cleanQuery,
      answer: sourceResult.clarificationPrompt,
      isAmbiguous: true,
      verifiedSources: [],
      matchedLessons: [],
      timestamp: new Date().toISOString()
    };
  }

  const verifiedSources = sourceResult.sources || [];

  // 2b. If NO verified authentic sources found AND no video transcript match, guide user
  if (verifiedSources.length === 0 && (!matchedLessons || matchedLessons.length === 0)) {
    return {
      ok: true,
      query: cleanQuery,
      answer: 'এই প্রশ্নের নির্ভরযোগ্য মূল নথি বা একাডেমি লেকচার এখন যাচাই করা যায়নি।\n\nঅনুগ্রহ করে সংশ্লিষ্ট আইনের নাম (যেমন: গণপ্রজাতন্ত্রী বাংলাদেশের সংবিধান, দণ্ডবিধি, ফৌজদারি কার্যবিধি, দেওয়ানী কার্যবিধি) বা নির্দিষ্ট ধারা উল্লেখ করে পুনরায় প্রশ্ন করুন।',
      verifiedSources: [],
      matchedLessons: [],
      hasSuggestedVideo: false,
      timestamp: new Date().toISOString()
    };
  }

  // 3. Synthesize or generate answer strictly grounded in verified sources & video subtitles
  let aiAnswer = '';
  let provider = 'bdlaws_statutory_grounded';
  let isAiGenerated = false;

  const geminiKey = process.env.GEMINI_API_KEY || '';

  if (geminiKey) {
    try {
      aiAnswer = await callGroundedGeminiAi({
        query: cleanQuery,
        verifiedSources,
        matchedLessons,
        apiKey: geminiKey
      });
      provider = 'gemini_flash_grounded';
      isAiGenerated = true;
    } catch (err) {
      console.error('Gemini Provider Error:', err.message);
      // If statutory sources or video transcripts exist, fallback to synthesize cleanly
      if (verifiedSources.length > 0 || (matchedLessons && matchedLessons.length > 0)) {
        aiAnswer = synthesizeStatutoryAnswer(cleanQuery, verifiedSources, matchedLessons);
        provider = 'bdlaws_statutory_fallback';
      } else {
        return {
          ok: false,
          errorCode: 'PROVIDER_ERROR',
          message: 'AI সেবা বর্তমানে সাড়া দিচ্ছে না। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন অথবা নিচে প্রদত্ত মূল আইনি নথি সরাসরি দেখুন।',
          verifiedSources,
          query: cleanQuery,
          timestamp: new Date().toISOString()
        };
      }
    }
  } else {
    aiAnswer = synthesizeStatutoryAnswer(cleanQuery, verifiedSources, matchedLessons);
  }

  return {
    ok: true,
    query: cleanQuery,
    answer: aiAnswer,
    provider,
    isAiGenerated,
    verifiedSources,
    matchedLessons: matchedLessons || [],
    hasSuggestedVideo: (matchedLessons && matchedLessons.length > 0),
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  processLegalAiQuery,
  callGroundedGeminiAi,
  synthesizeStatutoryAnswer
};
