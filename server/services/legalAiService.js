const { searchLessonsForQuery } = require('./transcriptService');

/**
 * Bangladesh Constitution and Core Law Knowledge Base (Curated for BJS & Bar Council Aspirants)
 */
const BANGLADESH_LEGAL_KNOWLEDGE = [
  {
    topic: 'সংবিধান ও মৌলিক অধিকার',
    keywords: ['সংবিধান', 'মৌলিক অধিকার', 'অনুচ্ছেদ ২৭', 'অনুচ্ছেদ ৩১', 'অনুচ্ছেদ ৩২', 'অনুচ্ছেদ ৪৪', 'সমতা', 'আইনের আশ্রয়'],
    statutes: 'গণপ্রজাতন্ত্রী বাংলাদেশের সংবিধান (অনুচ্ছেদ ২৭, ৩১, ৩২, ৪৪)',
    summary: 'সংবিধানের অনুচ্ছেদ ২৭ অনুযায়ী সকল নাগরিক আইনের দৃষ্টিতে সমান এবং আইনের সমান আশ্রয় লাভের অধিকারী। অনুচ্ছেদ ৩১ মোতাবেক আইনের আশ্রয়লাভ এবং আইনানুযায়ী ব্যবহার লাভ নাগরিকের অবিচ্ছেদ্য অধিকার। অনুচ্ছেদ ৩২ ব্যক্তির জীবন ও ব্যক্তি স্বাধীনতার সুরক্ষা দেয়। অনুচ্ছেদ ৪৪ অনুযায়ী মৌলিক অধিকার লঙ্ঘিত হলে অনুচ্ছেদ ১০২(১) এর অধীনে সরাসরি হাইকোর্ট বিভাগে রিট আবেদন করা যায়।'
  },
  {
    topic: 'রিট অধিক্ষেত্র (Writ Jurisdiction)',
    keywords: ['রিট', 'হাইকোর্ট', '১০২ অনুচ্ছেদ', 'হেবিয়াস কর্পাস', 'ম্যান্ডামাস', 'সার্টিওরারি', 'প্রোহিবিশন', 'কো-ওয়ারেন্টো'],
    statutes: 'গণপ্রজাতন্ত্রী বাংলাদেশের সংবিধান (অনুচ্ছেদ ১০২)',
    summary: 'সংবিধানের ১০২ অনুচ্ছেদে ৫ ধরণের রিট প্রতিকার রয়েছে: (১) হেবিয়াস কর্পাস (বন্দী প্রদর্শন), (২) ম্যান্ডামাস (পরমাদেশ), (৩) প্রোহিবিশন (নিষেধাজ্ঞা), (৪) সার্টিওরারি (উৎপ্রেষণ) এবং (৫) কো-ওয়ারেন্টো (অধিকার পৃচ্ছা)। মৌলিক অধিকার বলবৎকরণে ক্ষতিগ্রস্ত যেকোনো ব্যক্তি সংক্ষুব্ধ হয়ে সরাসরি মহামান্য হাইকোর্ট বিভাগে রিট পিটিশন দায়ের করতে পারেন।'
  },
  {
    topic: 'জামিন ও রিমান্ড (Bail & Remand)',
    keywords: ['জামিন', 'রিমান্ড', '৪৯৬ ধারা', '৪৯৭ ধারা', '৪৯৮ ধারা', '১৬৭ ধারা', 'অজ্ঞাতনামা আসামি'],
    statutes: 'ফৌজদারি কার্যবিধি ১৮৯৮ (CrPC - ধারা ৪৯৬, ৪৯৭, ৪৯৮, ১৬৭)',
    summary: 'জামিনযোগ্য অপরাধে ধারা ৪৯৬ অনুযায়ী জামিন অধিকার (Matter of Right)। অজামিনযোগ্য অপরাধে ধারা ৪৯৭ অনুযায়ী আদালতের সুবিবেচনা (Discretion of Court)। ধারা ৪৯৮ অনুযায়ী হাইকোর্ট বিভাগ ও দায়রা আদালত আগাম জামিন (Anticipatory Bail) প্রদান করতে পারেন। ফৌজদারি কার্যবিধির ১৬৭ ধারা ও পুলিশ রেগুলেশন অনুযায়ী রিমান্ড মঞ্জুর বা নামঞ্জুর করার এখতিয়ার কেবল ক্ষমতাপ্রাপ্ত ম্যাজিস্ট্রেটের।'
  },
  {
    topic: 'দেওয়ানী প্রতিকার ও অস্থায়ী নিষেধাজ্ঞা (Injunction & CPC)',
    keywords: ['নিষেধাজ্ঞা', 'অস্থায়ী নিষেধাজ্ঞা', 'আদেশ ৩৯', 'দেওয়ানী কার্যবিধি', 'স্বত্ব ঘোষণা', 'দখল পুনরুদ্ধার'],
    statutes: 'দেওয়ানী কার্যবিধি ১৯০৮ (CPC - আদেশ ৩৯, নিয়ম ১ ও ২) এবং সুনির্দিষ্ট প্রতিকার আইন ১৮৭৭ (ধারা ৮, ৯, ৪২, ৫২-৫৭)',
    summary: 'অস্থায়ী নিষেধাজ্ঞার জন্য আদেশ ৩৯, নিয়ম ১-২ অনুযায়ী ৩টি অপরিহার্য শর্ত প্রমাণ করতে হয়: (১) আপাতদৃষ্টিতে গ্রহণযোগ্য মামলা (Prima facie case), (২) অপূরণীয় ক্ষতি (Irreparable loss) এবং (৩) সুবিধার ভারসাম্য (Balance of convenience)। এছাড়া জমিসংক্রান্ত স্বত্ব ও দখল পুনরুদ্ধারে সুনির্দিষ্ট প্রতিকার আইনের ৮, ৯ ও ৪২ ধারার অধীনে মূল মামলা দায়ের করতে হয়।'
  },
  {
    topic: 'দণ্ডবিধি ও অপরাধ আইন (Penal Code)',
    keywords: ['দণ্ডবিধি', 'খুন', 'হত্যা', 'আত্মরক্ষা', 'প্রতারণা', 'চুরি', 'দস্যুতা', '৩০০ ধারা', '৩০২ ধারা', '৪২০ ধারা'],
    statutes: 'দণ্ডবিধি ১৮৬০ (Penal Code - ধারা ৯৬-১০৬, ৩০০, ৩০২, ৪২০)',
    summary: 'ধারা ৯৬-১০৬ পর্যন্ত ব্যক্তিস্বাধীনতা ও সম্পত্তির ব্যক্তিগত আত্মরক্ষার অধিকার (Private Defense) বর্ণিত। খুন ও অপরাধমূলক নরহত্যার পার্থক্য ধারা ২৯৯ ও ৩০০ তে রয়েছে। প্রতারণার দণ্ড ধারা ৪২০ তে বর্ণিত। যেকোনো অপরাধের ক্ষেত্রে দুষ্কর্মের অভিপ্রায় (Mens Rea) এবং অপরাধমূলক কার্য (Actus Reus) প্রমাণ করা প্রসিকিউশনের দায়িত্ব।'
  },
  {
    topic: 'সাক্ষ্য আইন ও স্বীকারোক্তি (Evidence & Confession)',
    keywords: ['সাক্ষ্য', 'স্বীকারোক্তি', '১৬৪ ধারা', '২৪ ধারা', '২৫ ধারা', '২৭ ধারা', 'দালিলিক সাক্ষ্য'],
    statutes: 'সাক্ষ্য আইন ১৮৭২ (ধারা ২৪-২৭, ৪৫, ১০১-১০৫) এবং ফৌজদারি কার্যবিধি (ধারা ১৬৪)',
    summary: 'পুলিশের হেফাজতে প্রদত্ত স্বীকারোক্তি সাক্ষ্য আইনের ২৫ ধারা অনুযায়ী আদালতে অপ্রাসঙ্গিক ও অগ্রহণযোগ্য। তবে ধারা ২৭ অনুযায়ী স্বীকারোক্তির ভিত্তিতে কোনো বস্তু উদ্ধার হলে তা প্রাসঙ্গিক। ম্যাজিস্ট্রেটের নিকট ধারা ১৬৪ অনুযায়ী স্বেচ্ছাপ্রদত্ত জবানবন্দি যথাযথভাবে রেকর্ড হলে সাক্ষ্য হিসেবে গ্রহণযোগ্য। ধারা ১০১ অনুযায়ী প্রমাণের দায়িত্ব (Burden of Proof) দাবিদারের ওপর বর্তায়।'
  }
];

/**
 * Generate intelligent Bangladesh Law response via local expert model
 */
function generateLocalLegalAnswer(query) {
  const qLower = query.toLowerCase();

  // Find matching legal knowledge base topic
  let matchedTopic = null;
  let maxMatched = 0;

  for (const item of BANGLADESH_LEGAL_KNOWLEDGE) {
    let count = 0;
    for (const kw of item.keywords) {
      if (qLower.includes(kw.toLowerCase())) count++;
    }
    if (count > maxMatched) {
      maxMatched = count;
      matchedTopic = item;
    }
  }

  let answerText = "";

  if (matchedTopic && maxMatched > 0) {
    answerText = `⚖️ **বিজিএস ও বার কাউন্সিল লিগ্যাল সলিউশন:**\n\n` +
      `**বিষয়:** ${matchedTopic.topic}\n` +
      `**আইনি ভিত্তি ও সংশ্লিষ্ট আইন:** ${matchedTopic.statutes}\n\n` +
      `**আইনি বিশ্লেষণ ও দিকনির্দেশনা:**\n${matchedTopic.summary}\n\n` +
      `📌 **প্রস্তুতির জন্য করণীয়:** এই প্রশ্নের ক্ষেত্রে সংশ্লিষ্ট ধারার মূল বিধান, উপাদানের শর্তাবলী এবং উচ্চ আদালতের প্রাসঙ্গিক নজির (DLR/BLD Case Laws) উল্লেখ করে উত্তর তৈরি করলে বিজিএস ও বার কাউন্সিল পরীক্ষায় সর্বোচ্চ নম্বর নিশ্চিত করা সম্ভব।`;
  } else {
    answerText = `⚖️ **বিজিএস ও বার কাউন্সিল লিগ্যাল সলিউশন:**\n\n` +
      `আপনার জিজ্ঞাসিত আইনি প্রশ্নের বিশ্লেষণ গণপ্রজাতন্ত্রী বাংলাদেশের সংবিধান ও প্রাসঙ্গিক আইনের আলোকে মূল্যায়ন করা হয়েছে।\n\n` +
      `**আইনি মূল্যায়ন ও সমাধান:**\n` +
      `১. বাংলাদেশের প্রচলিত বিচারব্যবস্থা অনুযায়ী যেকোনো আইনি অধিকার প্রতিষ্ঠা বা লঙ্ঘনের প্রতিকারের ক্ষেত্রে সংশ্লিষ্ট সংবিধিবদ্ধ আইন (Statutory Law) এবং উচ্চ আদালতের ঘোষিত নীতিমালা অনুযায়ী প্রতিকার চাইতে হয়।\n` +
      `২. সংবিধানের অনুচ্ছেদ ২৭ ও ৩১ অনুযায়ী প্রতিটি নাগরিকের আইনি প্রতিকার ও ন্যায্য বিচার পাওয়ার সাংবিধানিক অধিকার রয়েছে।\n` +
      `৩. প্রতিকার পাওয়ার জন্য বিজ্ঞ বিচারিক আদালত বা ক্ষেত্রবিশেষে সংবিধানের ১০২ অনুচ্ছেদের আওতায় মহামান্য সুপ্রিম কোর্টের হাইকোর্ট বিভাগের শরণাপন্ন হওয়া যায়।`;
  }

  return answerText;
}

/**
 * Call Google Gemini API (100% Free Tier) if key is configured
 */
async function callGeminiAi(query, apiKey) {
  const prompt = `তুমি "বিজিএস ও বার কাউন্সিল অ্যাসপিরেন্টস একাডেমি" (BJS & Bar Aspirants Academy)-র সিনিয়র আইনি বিশেষজ্ঞ ও সাবেক বিচারক/অ্যাডভোকেট মেন্টর।
শিক্ষার্থী বা ইউজারের প্রশ্ন: "${query}"

নির্দেশনা:
১. গণপ্রজাতন্ত্রী বাংলাদেশের সংবিধান এবং বাংলাদেশ জুডিশিয়াল সার্ভিস (BJS) ও বাংলাদেশ বার কাউন্সিল পরীক্ষার মানদণ্ড অনুযায়ী সুনির্দিষ্ট ধারা, অনুচ্ছেদ ও আইনি সমাধান দাও।
২. ভাষা হবে প্রমিত, প্রাঞ্জল এবং তথ্যবহুল বাংলা।
৩. পয়েন্ট আকারে স্পষ্ট সমাধান দাও।`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 800
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");

  return text;
}

/**
 * Main Legal AI Assistant Controller
 * 1. Analyzes question against Bangladesh Law / Constitution (via Gemini or Local Expert Engine)
 * 2. Searches YouTube video transcripts from academy lessons
 * 3. Suggests matching video lecture if discussion exists, otherwise provides clean legal answer
 */
async function processLegalAiQuery({ query, studentName = 'শিক্ষার্থী', allLessons = [] }) {
  if (!query || !query.trim()) {
    return {
      ok: false,
      message: 'অনুগ্রহ করে আপনার আইনি প্রশ্ন বা সমস্যাটি লিখুন।'
    };
  }

  const cleanQuery = query.trim();
  let aiAnswer = '';
  let provider = 'local_expert';

  // 1. Check for Gemini API Key in environment
  const geminiKey = process.env.GEMINI_API_KEY || '';
  if (geminiKey) {
    try {
      aiAnswer = await callGeminiAi(cleanQuery, geminiKey);
      provider = 'gemini_flash';
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local legal engine:', err.message);
      aiAnswer = generateLocalLegalAnswer(cleanQuery);
      provider = 'local_expert_fallback';
    }
  } else {
    aiAnswer = generateLocalLegalAnswer(cleanQuery);
  }

  // 2. Search Video Transcripts in Academy Lessons
  const matchedLessons = searchLessonsForQuery(cleanQuery, allLessons, 2);

  return {
    ok: true,
    query: cleanQuery,
    answer: aiAnswer,
    provider,
    matchedLessons: matchedLessons || [],
    hasSuggestedVideo: (matchedLessons && matchedLessons.length > 0),
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  processLegalAiQuery,
  generateLocalLegalAnswer
};
