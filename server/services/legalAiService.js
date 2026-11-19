const { retrieveVerifiedSources } = require('./bdLawSourceService');
const { searchLessonsForQuery } = require('./transcriptService');

/**
 * Dynamic Multi-Lingual Intent & Context Analyzer
 * Understands:
 * - Pure Bengali, Colloquial Bangla, Banglish, English
 * - Class / Video Search (কোর্স বা ক্লাসের ভিডিও খোঁজা)
 * - Real-life Legal Problems (বাস্তব জীবনের ব্যক্তিগত সমস্যা, জমিজমা, অর্থ আত্মসাৎ, পারিবারিক বিরোধ ইত্যাদি)
 * - Statutory / Exam Inquiries (আইনের সুনির্দিষ্ট ধারা, বিজিএস বা বার কাউন্সিল পরীক্ষার বিষয়)
 * - Chit-chat / Greetings (কুশল বিনিময় বা সাধারণ সম্ভাষণ)
 * - Ambiguous / Extremely brief queries
 */
function analyzeUserIntentAndContext(query) {
  const raw = String(query || '').trim();
  const lower = raw.toLowerCase();
  const cleanPunct = lower.replace(/[?!।,.\-_/\\@#$%^&*()]/g, '').trim();

  // 1. Chit-chat & Greetings
  const greetingPatterns = [
    /^(?:hi|hello|hey|salam|assalamu\s*alaikum|নমস্কার|সালাম|আসসালামু\s*আলাইকুম|কেমন\s*আছেন|kemon\s*achen|good\s*morning|good\s*evening|good\s*afternoon|ধন্যবাদ|thanks|thank\s*you|thx)$/i,
    /^(?:হাই|হ্যালো|হাই\s*কেমন\s*আছেন|হ্যালো\s*কেমন\s*আছেন|কেমন\s*আছেন|ভালো\s*আছেন|valo\s*achen|bhalo\s*achen)$/i,
    /^(?:who\s*are\s*you|তুমি\s*কে|কে\s*আপনি|তোমার\s*পরিচয়\s*কি|আপনার\s*পরিচয়\s*কি|bjs\s*academy\s*ki|academy\s*ki)$/i
  ];
  const isGreeting = greetingPatterns.some(p => p.test(cleanPunct)) || (cleanPunct.length <= 5 && ['hi', 'hey', 'hello', 'হাই', 'হ্যালো'].includes(cleanPunct));

  // 2. Video / Class Search Intent
  const videoSearchKeywords = [
    'ভিডিও', 'ক্লাস', 'লেকচার', 'রেকর্ডিং', 'কোর্স ভিডিও', 'ভিডিও লিংক', 'কোথায় পাব', 'ভিডিও দেখতে চাই',
    'class', 'video', 'lecture', 'recording', 'kothay', 'dekhte chai', 'link', '1st class', '2nd class',
    'orientation', 'মডিউল', 'module', 'অধ্যায়', 'chapter', 'ক্লাস কোথায়'
  ];
  const isVideoSearch = videoSearchKeywords.some(kw => lower.includes(kw)) &&
    !lower.includes('মামলা করব') && !lower.includes('শাস্তি কি') && !lower.includes('ধারা কত');

  // 3. Real-Life Legal Problem Intent (Dispute, crime, fraud, domestic, land)
  const problemKeywords = [
    'জমি দখল', 'বেদখল', 'সীমানা', 'প্রাচীর', 'ভাঙচুর', 'টাকা ধার', 'টাকা আত্মসাৎ', 'চিটিং', 'প্রতারণা',
    'হুমকি', 'মারামারি', 'আঘাত', 'চেক বাউন্স', 'চেক ডিজঅনার', 'তালাক', 'ডিভোর্স', 'দেনমোহর', 'খোরপোষ',
    'ভরণপোষণ', 'মিথ্যা মামলা', 'পুলিশ', 'থানা', 'জিডি', 'এজাহার', 'এফআইআর', 'আটক', 'গ্রেপ্তার', 'করনীয়',
    'করণীয়', 'কি করব', 'কি করবো', 'কী করব', 'neighbor', 'jomi', 'dokhol', 'bedokhol', 'bhanga',
    'cheating', 'fraud', 'threat', 'humki', 'money', 'taka', 'cheque', 'bounce', 'dishonour', 'divorce',
    'talak', 'denmohor', 'police', 'fir', 'gd', 'ki korbo', 'amar neighbor', 'shimanapracir'
  ];
  const isLegalProblem = problemKeywords.some(kw => lower.includes(kw));

  // 4. Statutory / Exam Inquiry Intent
  const statuteKeywords = [
    'ধারা', 'অনুচ্ছেদ', 'আদেশ', 'দফা', 'section', 'article', 'order', 'দণ্ডবিধি', 'ফৌজদারি কার্যবিধি',
    'দেওয়ানী কার্যবিধি', 'সাক্ষ্য আইন', 'সুনির্দিষ্ট প্রতিকার', 'সংবিধান', 'এনআই অ্যাক্ট', 'তামাদি',
    'বার কাউন্সিল', 'বিজিএস', 'bjs', 'bar council', 'res judicata', 'prima facie', 'cpc', 'crpc',
    'ব্যতিক্রম', 'শাস্তি', 'উপাদান', 'জামিনের নিয়ম'
  ];
  const isStatuteInquiry = statuteKeywords.some(kw => lower.includes(kw));

  // 5. Extremely Vague or Ambiguous query
  const isVague = (raw.length <= 4 && !isGreeting) || /^(?:\?|আইন|ধারা|মামলা|শাস্তি|help|law)$/i.test(lower);

  // Determine Primary Core Intent
  let primaryIntent = 'GENERAL_LEGAL_QUERY';
  if (isGreeting) {
    primaryIntent = 'GREETING_OR_CHITCHAT';
  } else if (isVague) {
    primaryIntent = 'AMBIGUOUS_VERY_SHORT';
  } else if (isVideoSearch && !isLegalProblem && !isStatuteInquiry) {
    primaryIntent = 'CLASS_SEARCH';
  } else if (isVideoSearch && (isLegalProblem || isStatuteInquiry)) {
    primaryIntent = 'MIXED_INQUIRY';
  } else if (isLegalProblem) {
    primaryIntent = 'LEGAL_PROBLEM_SOLVING';
  } else if (isStatuteInquiry) {
    primaryIntent = 'STATUTORY_EXPLANATION';
  }

  return {
    raw,
    lower,
    primaryIntent,
    isGreeting,
    isVideoSearch,
    isLegalProblem,
    isStatuteInquiry,
    isVague
  };
}

/**
 * Call Google Gemini API with Dynamic Reasoning & Context
 */
async function callGroundedGeminiAi({ query, intentMeta, verifiedSources = [], matchedLessons = [], studentName = 'শিক্ষার্থী', apiKey }) {
  // Construct grounded statutory reference context from bdlaws
  let sourceContext = '';
  if (verifiedSources && verifiedSources.length > 0) {
    sourceContext = verifiedSources.map((s, idx) => {
      return `[সরকারি বিধিবদ্ধ আইন উৎস ${idx + 1}]
আইনের নাম: ${s.actTitleBn} (${s.actTitleEn}, ${s.actNumber || s.year})
আইনের স্থিতি: ${s.statusBn || s.status}
ধারা/অনুচ্ছেদ: ${s.sectionType} ${s.sectionNumBn || s.sectionNum} — ${s.titleBn}
মূল সরকারি পাঠ্য: "${s.excerptBn}"
সরকারি সোর্স লিংক: ${s.directUrl || s.sourceUrl}`;
    }).join('\n\n');
  }

  // Construct matched academy video subtitles reference context from MongoDB
  let videoContext = '';
  if (matchedLessons && matchedLessons.length > 0) {
    videoContext = matchedLessons.map((l, idx) => {
      return `[একাডেমি ভিডিও ক্লাস ${idx + 1}]
ক্লাস শিরোনাম: ${l.title || 'ক্লাস'}
কোর্স/অধ্যায়: ${l.chapter || l.module || 'বিজিএস ও বার প্রস্তুতি'}
টাইমস্ট্যাম্প: [${l.timestamp || '00:00'}]
আলোচিত অংশ (সাবটাইটেল থেকে): "${l.snippet || ''}"`;
    }).join('\n\n');
  }

  const prompt = `তুমি "BJS & Bar Aspirants Academy"-র অফিসিয়াল আইন সহকারী (AI Legal Assistant)। তুমি একজন প্রজ্ঞাবান আইনজ্ঞ, সহানুভূতিশীল মেন্টর এবং শিক্ষার্থীদের বিশ্বস্ত পরামর্শক।

শিক্ষার্থীর ইনপুট: "${query}"
শিক্ষার্থীর নাম: ${studentName}
শনাক্তকৃত ইনটেন্ট (Intent): ${intentMeta.primaryIntent}

${sourceContext ? `[বাংলাদেশ সরকারের অফিসিয়াল লেজিসলেটিভ ও সুপ্রিম কোর্ট নথি (bdlaws.minlaw.gov.bd)]:
========================
${sourceContext}
========================` : '[তথ্যসূত্র: গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের প্রচলিত আইনের মূল বিধান অনুযায়ী উত্তর প্রস্তুত করো]'}

${videoContext ? `[BJS & Bar Academy অফিসিয়াল ভিডিও লেকচার ও বাংলা সাবটাইটেল (MongoDB)]:
========================
${videoContext}
========================` : ''}

[ডাইনামিক এআই রিজনিং ও রেসপন্স গাইডলাইন]:
১. ভাষা শৈলী ও গ্রহণযোগ্যতা: শিক্ষার্থী শুদ্ধ বাংলা, চলিত রূপ, বাংলিশ (Banglish) বা ইংরেজি—যেভাবেই প্রশ্ন করুক না কেন, তার মূল ভাবটি গভীরভাবে বুঝে নিয়ে সহজ, মার্জিত ও প্রমিত বাংলায় সরাসরি উত্তর দাও।

২. ইনটেন্ট অনুযায়ী অ্যাডাপ্টিভ রেসপন্স স্ট্রাকচার (Adaptive Structure):
  - ক) শিক্ষার্থী যদি শুধুমাত্র কোনো ক্লাস/ভিডিও/মডিউল খুঁজে থাকেন (${intentMeta.isVideoSearch ? 'চিহ্নিত: হ্যাঁ' : 'চিহ্নিত: না'}):
       অযথা অপ্রয়োজনীয় দীর্ঘ আইনের বয়ান না দিয়ে সরাসরি আমাদের একাডেমির সংশ্লিষ্ট ক্লাসের শিরোনাম, মডিউল এবং ঠিক কত মিনিটের মাথায় কী আলোচনা হয়েছে তা স্পষ্ট করে তুলে ধরো।
  - খ) শিক্ষার্থী যদি কোনো বাস্তব জীবনের সমস্যা বা বিরোধের কথা বলেন (${intentMeta.isLegalProblem ? 'চিহ্নিত: হ্যাঁ' : 'চিহ্নিত: না'}):
       ১. আইনি মূল্যায়ন: সংশ্লিষ্ট আইন ও ধারা সুনির্দিষ্টভাবে উল্লেখ করো (যেমন: দণ্ডবিধি, ফৌজদারি কার্যবিধি, সুনির্দিষ্ট প্রতিকার আইন, পারিবারিক আইন ইত্যাদি)।
       ২. ধাপে ধাপে ব্যবহারিক আইনি পদক্ষেপ: কীভাবে নিকটস্থ থানায় জিডি/এজাহার দায়ের করবেন, অথবা আদালতে বিজ্ঞ আইনজীবীর মাধ্যমে সিআর/দেওয়ানী মামলা দায়ের করবেন তা সহজ ভাষায় বুঝিয়ে দাও।
       ৩. প্রয়োজনীয় প্রমাণাদি ও সতর্কতা।
       ৪. একাডেমির ভিডিও রেফারেন্স: উপরে যদি আমাদের ক্লাসের সাবটাইটেল থাকে, তবে ক্লাসের শিরোনাম ও নির্দিষ্ট টাইমস্ট্যাম্প উল্লেখ করো যাতে শিক্ষার্থী ক্লাসটি দেখে আরও বিশদ জ্ঞান লাভ করতে পারে।
       ৫. উত্তরের একদম শেষে অবশ্যই সংক্ষেপে এই আইনি সতর্কবার্তাটি যুক্ত করো:
          "⚠️ **আইনি সতর্কবার্তা (Legal Disclaimer):** এই পরামর্শটি সাধারণ আইনি শিক্ষা ও সচেতনতার উদ্দেশ্যে প্রদত্ত। কোনো চূড়ান্ত আইনি পদক্ষেপ গ্রহণের পূর্বে একজন বিজ্ঞ আইনজীবীর সাথে সরাসরি পরামর্শ করার অনুরোধ করা হলো।"
  - গ) শিক্ষার্থী যদি সুনির্দিষ্ট কোনো ধারা বা বার কাউন্সিল/বিজিএস পরীক্ষার টপিক জানতে চান (${intentMeta.isStatuteInquiry ? 'চিহ্নিত: হ্যাঁ' : 'চিহ্নিত: না'}):
       ধারাটির মূল উপাদান (Ingredients), ব্যতিক্রম, এবং প্রয়োগ সুবিন্যস্ত পয়েন্ট আকারে স্পষ্ট করো। ক্লাসের রেফারেন্স থাকলে যুক্ত করো।
  - ঘ) শিক্ষার্থী যদি খুব সংক্ষিপ্ত বা অস্পষ্ট প্রশ্ন করে থাকেন (${intentMeta.isVague ? 'চিহ্নিত: হ্যাঁ' : 'চিহ্নিত: না'}):
       প্রাথমিক ধারণা সংক্ষেপে দিয়ে তাকে ১-২টি প্রাসঙ্গিক পাল্টা প্রশ্ন করো যাতে মূল বিষয়টি পরিষ্কার হয়।
  - ঙ) শিক্ষার্থী যদি কুশল বিনিময় বা সাধারণ সম্ভাষণ জানান (${intentMeta.isGreeting ? 'চিহ্নিত: হ্যাঁ' : 'চিহ্নিত: না'}):
       আন্তরিক ও মার্জিত সম্ভাষণ জানাও, একাডেমি আইন সহকারী হিসেবে নিজের পরিচয় দাও এবং আইন বা কোর্স সংক্রান্ত পড়াশোনায় কীভাবে সাহায্য করতে পারো তা তুলে ধরো।

৩. উত্তরের পরিধি (Adaptive Length):
  ছোট প্রশ্নের উত্তর সংক্ষিপ্ত ও টু-দ্য-পয়েন্ট রাখো; জটিল বাস্তব সমস্যার ক্ষেত্রে সুবিন্যস্ত পয়েন্ট আকারে সহজ সমাধান দাও। মনগড়া বা কাল্পনিক কোনো ধারা কখনোই তৈরি করবে না।`;

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
 * Smart Fallback Synthesizer (when AI API key is absent or provider offline)
 * Dynamically synthesizes the answer based on user intent and knowledge bases
 */
function synthesizeDynamicAnswer({ query, intentMeta, verifiedSources = [], matchedLessons = [], studentName = 'শিক্ষার্থী' }) {
  // 1. Chit-chat & Greetings
  if (intentMeta.isGreeting) {
    return `👋 **আসসালামু আলাইকুম!**\n` +
      `আমি **BJS & Bar Aspirants Academy**-র অফিসিয়াল **আইন সহকারী (AI Legal Assistant)**।\n\n` +
      `আপনাকে কীভাবে সাহায্য করতে পারি? আপনি নিচের যেকোনো বিষয়ে প্রশ্ন করতে পারেন:\n` +
      `• ⚖️ **বাস্তব আইনি সমস্যা:** জমিজমা বিরোধ, চেক ডিজঅনার, পারিবারিক বা ব্যক্তিগত অধিকার।\n` +
      `• 📖 **আইনের ধারা ও ব্যাখ্যা:** দণ্ডবিধি, ফৌজদারি কার্যবিধি, দেওয়ানী কার্যবিধি, সংবিধান ইত্যাদি।\n` +
      `• 🎥 **ভিডিও ক্লাস ও লেকচার:** আমাদের একাডেমির কোর্সের যেকোনো ক্লাস ও টপিক।\n\n` +
      `আপনার নির্দিষ্ট প্রশ্ন বা সমস্যাটি বিস্তারিত লিখুন, আমি সহযোগিতা করতে প্রস্তুত।`;
  }

  // 2. Class / Video Search
  if (intentMeta.isVideoSearch && matchedLessons.length > 0) {
    const top = matchedLessons[0];
    let ans = `🎥 **আপনার কাঙ্ক্ষিত একাডেমি ভিডিও ক্লাস:**\n\n` +
      `• **ক্লাস শিরোনাম:** **${top.title}**\n` +
      `• **কোর্স/অধ্যায়:** ${top.chapter || top.module || 'একাডেমি লেকচার'}\n` +
      `• **আলোচনার সময় (Timestamp):** \`[${top.timestamp || '00:00'}]\`\n` +
      `• **ভিডিওর মূল আলোচনা:** "${top.snippet || 'ভিডিওটিতে এই বিষয়ে পূর্ণাঙ্গ আলোচনা রয়েছে।'}"\n\n` +
      `নিচে ভিডিও কার্ডের "▶️ প্লে করুন" বাটনে ক্লিক করে সরাসরি ক্লাসটি দেখতে পারেন।`;
    if (matchedLessons.length > 1) {
      ans += `\n\n📌 **অন্যান্য প্রাসঙ্গিক ক্লাস:**\n` +
        matchedLessons.slice(1).map(l => `• ${l.title} (সময়: \`[${l.timestamp || '00:00'}]\`)`).join('\n');
    }
    return ans;
  }

  // 3. Real-life Legal Problem
  if (intentMeta.isLegalProblem) {
    let ans = `⚖️ **বাস্তব আইনি সমাধান ও দিকনির্দেশনা:**\n\n`;
    if (verifiedSources.length > 0) {
      const top = verifiedSources[0];
      ans += `📌 **প্রযোজ্য আইন ও বিধান:**\n` +
        `• **সংশ্লিষ্ট আইন:** ${top.actTitleBn} (${top.actTitleEn})\n` +
        `• **সংশ্লিষ্ট ধারা:** ${top.sectionType} ${top.sectionNumBn || top.sectionNum} — ${top.titleBn}\n` +
        `• **মূল বিধিবদ্ধ বিধান:** "${top.excerptBn}"\n\n`;
    }

    ans += `📌 **বাস্তবমুখী পদক্ষেপ:**\n` +
      `১. **তাৎক্ষণিক প্রমাণ সংগ্রহ:** ঘটনার ছবি, দলিল, অডিও/ভিডিও বা চ্যাটের স্ক্রিনশট ও প্রত্যক্ষদর্শীদের তথ্য সংরক্ষণ করুন।\n` +
      `২. **থানায় জিডি বা এজাহার:** অপরাধ সংঘটিত হলে বা হুমকির ক্ষেত্রে তাৎক্ষণিকভাবে নিকটস্থ থানায় জিডি (সাধারণ ডায়েরি) অথবা এজাহার (FIR) দায়ের করতে পারেন।\n` +
      `৩. **আদালতে মোকদ্দমা:** স্থাবর সম্পত্তি বা অধিকারের বিষয়ে বিজ্ঞ আইনজীবীর মাধ্যমে উপযুক্ত আদালতে দেওয়ানী মোকদ্দমা (নিষেধাজ্ঞা/দখল উদ্ধার) অথবা সিআর মামলা দায়ের করা যায়।\n\n`;

    if (matchedLessons.length > 0) {
      const topLesson = matchedLessons[0];
      ans += `📺 **একাডেমি ভিডিও ক্লাস রেফারেন্স:**\n` +
        `• **ক্লাস:** ${topLesson.title} (${topLesson.chapter || topLesson.module || 'কোর্স'})\n` +
        `• **আলোচনার সময় (Timestamp):** \`[${topLesson.timestamp || '00:00'}]\`\n\n`;
    }

    ans += `⚠️ **আইনি সতর্কবার্তা (Legal Disclaimer):** এই পরামর্শটি সাধারণ আইনি শিক্ষা ও সচেতনতার উদ্দেশ্যে প্রদত্ত। কোনো চূড়ান্ত আইনি পদক্ষেপ গ্রহণের পূর্বে একজন বিজ্ঞ আইনজীবীর সাথে সরাসরি পরামর্শ করার অনুরোধ করা হলো।`;
    return ans;
  }

  // 4. Statutory Explanation
  if (verifiedSources.length > 0) {
    const top = verifiedSources[0];
    let ans = `⚖️ **যাচাইকৃত আইনি সমাধান:**\n\n` +
      `**সংশ্লিষ্ট আইন:** ${top.actTitleBn} (${top.actTitleEn})\n` +
      `**আইনের স্থিতি:** ${top.statusBn || 'কার্যকর আইন'}\n` +
      `**সংশ্লিষ্ট ধারা/অনুচ্ছেদ:** ${top.sectionType} ${top.sectionNumBn || top.sectionNum} — ${top.titleBn}\n\n` +
      `📌 **মূল আইনি বিধান ও পর্যালোচনা:**\n` +
      `${top.excerptBn}\n\n` +
      `উক্ত আইনের সরাসরি সরকারি গেজেট ও লেজিসলেটিভ নথি বিস্তারিত দেখতে নিচে "মূল উৎস দেখুন" বাটনে ক্লিক করুন।`;

    if (verifiedSources.length > 1) {
      const second = verifiedSources[1];
      ans += `\n\n📌 **অতিরিক্ত প্রাসঙ্গিক বিধান:**\n` +
        `• ${second.actTitleBn}: ${second.sectionType} ${second.sectionNumBn || second.sectionNum} (${second.titleBn})`;
    }

    if (matchedLessons.length > 0) {
      const topLesson = matchedLessons[0];
      ans += `\n\n📺 **একাডেমি ভিডিও ক্লাস ও সাবটাইটেল রেফারেন্স:**\n` +
        `• **ক্লাস:** ${topLesson.title} (${topLesson.chapter || topLesson.module || 'কোর্স'})\n` +
        `• **আলোচনার সময় (Timestamp):** \`[${topLesson.timestamp || '00:00'}]\`\n` +
        `• **সংক্ষিপ্ত নোট:** "${topLesson.snippet || ''}"`;
    }
    return ans;
  }

  // 5. Matched Academy Lesson Only (when statute not specifically mapped)
  if (matchedLessons.length > 0) {
    const topLesson = matchedLessons[0];
    return `⚖️ **একাডেমি ক্লাস পর্যালোচনা:**\n\n` +
      `আমাদের একাডেমির ভিডিও ক্লাসে এই বিষয়ে বিস্তারিত আলোচনা রয়েছে:\n` +
      `• **ক্লাস:** ${topLesson.title} (${topLesson.chapter || topLesson.module || 'কোর্স'})\n` +
      `• **আলোচনার সময় (Timestamp):** \`[${topLesson.timestamp || '00:00'}]\`\n` +
      `• **আলোচনার অংশ:** "${topLesson.snippet || ''}"\n\n` +
      `নিচে ভিডিও কার্ড থেকে সরাসরি ক্লাসটি উপভোগ করতে পারেন।`;
  }

  // 6. Ambiguous or Unverified Query
  return `এই প্রশ্নের নির্ভরযোগ্য মূল নথি বা একাডেমি লেকচার এখন যাচাই করা যায়নি।\n\nঅনুগ্রহ করে সংশ্লিষ্ট আইনের নাম (যেমন: গণপ্রজাতন্ত্রী বাংলাদেশের সংবিধান, দণ্ডবিধি, ফৌজদারি কার্যবিধি, দেওয়ানী কার্যবিধি) বা নির্দিষ্ট ধারা উল্লেখ করে পুনরায় প্রশ্ন করুন।`;
}

/**
 * Main Grounded Legal AI Query Processor (Dynamic Architecture)
 * - Understands natural language, Banglish, and broken narratives
 * - Dynamically routes between MongoDB Video transcripts and Bangladesh Official Statutes
 * - Adaptive response formatting based on user intent
 */
async function processLegalAiQuery({ query, studentName = 'শিক্ষার্থী', allLessons = [] }) {
  if (!query || !query.trim()) {
    return {
      ok: false,
      message: 'অনুগ্রহ করে আপনার আইনি প্রশ্ন বা সমস্যাটি লিখুন।'
    };
  }

  const cleanQuery = query.trim();

  // 1. Dynamic Intent & Context Analysis
  const intentMeta = analyzeUserIntentAndContext(cleanQuery);

  // 2. Smart Knowledge Routing: Query MongoDB Video Transcripts FIRST
  const matchedLessons = searchLessonsForQuery(cleanQuery, allLessons, 3);

  // 3. Smart Knowledge Routing: Query Official Bangladesh Law Statutes
  let verifiedSources = [];
  if (!intentMeta.isGreeting) {
    const sourceResult = await retrieveVerifiedSources(cleanQuery);
    verifiedSources = sourceResult.sources || [];
  }

  // 3a. Handle Ambiguous / Vague queries when no context is discernible
  if (intentMeta.isVague && verifiedSources.length === 0 && matchedLessons.length === 0) {
    return {
      ok: true,
      query: cleanQuery,
      answer: 'আপনার প্রশ্নটি সংক্ষিপ্ত বা অস্পষ্ট। অনুগ্রহ করে সংশ্লিষ্ট মূল বিষয়টি (যেমন: জমি দখল, চেক ডিজঅনার, পারিবারিক বিরোধ) অথবা আইনের নাম (যেমন: সংবিধান, ফৌজদারি কার্যবিধি, দেওয়ানী কার্যবিধি বা দণ্ডবিধি) উল্লেখ করে প্রশ্ন করুন।',
      isAmbiguous: true,
      intent: intentMeta.primaryIntent,
      verifiedSources: [],
      matchedLessons: [],
      hasSuggestedVideo: false,
      timestamp: new Date().toISOString()
    };
  }

  // 4. Synthesize Answer: Gemini AI if key is present, otherwise Smart Fallback
  let aiAnswer = '';
  let provider = 'bdlaws_statutory_grounded';
  let isAiGenerated = false;

  const geminiKey = process.env.GEMINI_API_KEY || '';

  if (geminiKey) {
    try {
      aiAnswer = await callGroundedGeminiAi({
        query: cleanQuery,
        intentMeta,
        verifiedSources,
        matchedLessons,
        studentName,
        apiKey: geminiKey
      });
      provider = 'gemini_flash_dynamic';
      isAiGenerated = true;
    } catch (err) {
      console.error('Gemini Provider Error:', err.message);
      // Fallback gracefully without breaking
      aiAnswer = synthesizeDynamicAnswer({
        query: cleanQuery,
        intentMeta,
        verifiedSources,
        matchedLessons,
        studentName
      });
      provider = 'bdlaws_statutory_fallback';
    }
  } else {
    aiAnswer = synthesizeDynamicAnswer({
      query: cleanQuery,
      intentMeta,
      verifiedSources,
      matchedLessons,
      studentName
    });
  }

  return {
    ok: true,
    query: cleanQuery,
    answer: aiAnswer,
    intent: intentMeta.primaryIntent,
    provider,
    isAiGenerated,
    verifiedSources,
    matchedLessons: matchedLessons || [],
    hasSuggestedVideo: (matchedLessons && matchedLessons.length > 0),
    isAmbiguous: false,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  processLegalAiQuery,
  callGroundedGeminiAi,
  synthesizeDynamicAnswer,
  analyzeUserIntentAndContext
};
