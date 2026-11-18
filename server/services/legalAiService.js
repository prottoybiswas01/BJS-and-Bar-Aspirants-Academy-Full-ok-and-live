const { retrieveVerifiedSources } = require('./bdLawSourceService');
const { searchLessonsForQuery } = require('./transcriptService');

/**
 * Call Google Gemini API with Grounded Context from Authentic Bangladesh Statutes
 */
async function callGroundedGeminiAi({ query, verifiedSources, apiKey }) {
  // Construct grounded reference context
  const sourceContext = verifiedSources.map((s, idx) => {
    return `[উৎস ${idx + 1}]
আইনের নাম: ${s.actTitleBn} (${s.actTitleEn}, ${s.actNumber || s.year})
আইনের স্থিতি: ${s.statusBn || s.status}
ধারা/অনুচ্ছেদ: ${s.sectionType} ${s.sectionNumBn || s.sectionNum} (${s.titleBn})
মূল সরকারি বিধিবদ্ধ পাঠ্য:
"${s.excerptBn}"
সরকারি সোর্স লিংক: ${s.directUrl || s.sourceUrl}`;
  }).join('\n\n');

  const prompt = `তুমি "BJS & Bar Aspirants Academy"-র অফিসিয়াল আইন পরামর্শক।
শিক্ষার্থীর আইনি প্রশ্ন: "${query}"

নিচে গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের অফিসিয়াল লেজিসলেটিভ পোর্টাল (bdlaws.minlaw.gov.bd) ও সুপ্রিম কোর্টের যাচাইকৃত মূল নথি দেওয়া হলো:
========================
${sourceContext}
========================

নির্দেশনা:
১. শুধুমাত্র উপরে প্রদত্ত মূল আইনি নথির তথ্যের ওপর ভিত্তি করে সহজ, প্রমিত বাংলায় সরাসরি উত্তর দাও।
২. মনগড়া কোনো ধারা বা কাল্পনিক তথ্য দেবে না। উত্তরের সাথে প্রাসঙ্গিক ধারা/অনুচ্ছেদের সুনির্দিষ্ট উল্লেখ করো।
৩. পয়েন্ট আকারে স্পষ্ট ও বোধগম্য করো যাতে শিক্ষার্থী বিজিএস বা বার কাউন্সিল পরীক্ষায় সঠিক উত্তর প্রদান করতে পারে।`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 850
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
 * Synthesize clean statutory answer from verified sources (when AI key is absent)
 */
function synthesizeStatutoryAnswer(query, verifiedSources) {
  if (!verifiedSources || verifiedSources.length === 0) {
    return 'এই প্রশ্নের নির্ভরযোগ্য মূল নথি এখন যাচাই করা যায়নি।';
  }

  const top = verifiedSources[0];
  let answer = `⚖️ **যাচাইকৃত আইনি সমাধান:**\n\n` +
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

  return answer;
}

/**
 * Main Grounded Legal AI Query Processor
 * - Strictly connects to verified Bangladesh Law sources
 * - Distinguishes provider failures from source unavailability
 * - Matches real video subtitles with exact timestamps
 */
async function processLegalAiQuery({ query, studentName = 'শিক্ষার্থী', allLessons = [] }) {
  if (!query || !query.trim()) {
    return {
      ok: false,
      message: 'অনুগ্রহ করে আপনার আইনি প্রশ্ন বা সমস্যাটি লিখুন।'
    };
  }

  const cleanQuery = query.trim();

  // 1. Retrieve verified authentic Bangladesh legal sources
  const sourceResult = await retrieveVerifiedSources(cleanQuery);

  // 1a. Handle Ambiguous queries
  if (sourceResult.isAmbiguous) {
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

  // 1b. If NO verified authentic sources found, do NOT fabricate an answer
  if (verifiedSources.length === 0) {
    return {
      ok: true,
      query: cleanQuery,
      answer: 'এই প্রশ্নের নির্ভরযোগ্য মূল নথি এখন যাচাই করা যায়নি।\n\nঅনুগ্রহ করে সংশ্লিষ্ট আইনের নাম (যেমন: গণপ্রজাতন্ত্রী বাংলাদেশের সংবিধান, দণ্ডবিধি, ফৌজদারি কার্যবিধি, দেওয়ানী কার্যবিধি) বা নির্দিষ্ট ধারা উল্লেখ করে পুনরায় প্রশ্ন করুন।',
      verifiedSources: [],
      matchedLessons: [],
      hasSuggestedVideo: false,
      timestamp: new Date().toISOString()
    };
  }

  // 2. Synthesize or generate answer strictly grounded in verified sources
  let aiAnswer = '';
  let provider = 'bdlaws_statutory_grounded';
  let isAiGenerated = false;

  const geminiKey = process.env.GEMINI_API_KEY || '';

  if (geminiKey) {
    try {
      aiAnswer = await callGroundedGeminiAi({
        query: cleanQuery,
        verifiedSources,
        apiKey: geminiKey
      });
      provider = 'gemini_flash_grounded';
      isAiGenerated = true;
    } catch (err) {
      console.error('Gemini Provider Error:', err.message);
      // Return honest provider error without masking as a canned legal answer
      return {
        ok: false,
        errorCode: 'PROVIDER_ERROR',
        message: 'AI সেবা বর্তমানে সাড়া দিচ্ছে না। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন অথবা নিচে প্রদত্ত মূল আইনি নথি সরাসরি দেখুন।',
        verifiedSources,
        query: cleanQuery,
        timestamp: new Date().toISOString()
      };
    }
  } else {
    aiAnswer = synthesizeStatutoryAnswer(cleanQuery, verifiedSources);
  }

  // 3. Search Video Transcripts for matched academy lessons
  const matchedLessons = searchLessonsForQuery(cleanQuery, allLessons, 2);

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
  processLegalAiQuery
};
