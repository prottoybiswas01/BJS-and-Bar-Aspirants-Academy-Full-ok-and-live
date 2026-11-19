const { retrieveVerifiedSources } = require('./bdLawSourceService');
const { searchLessonsForQuery } = require('./transcriptService');

/**
 * Production-Grade Agentic RAG Architecture for BJS & Bar Academy Legal Assistant
 * 
 * Pipeline:
 * 1. LLM-First Intent & Context Gatekeeper:
 *    - Evaluates query + multi-turn history.
 *    - Classifies into CHAT_OR_GREETING, CLARIFICATION_NEEDED, CLASS_OR_VIDEO_LOOKUP, LEGAL_ADVICE_OR_STATUTE.
 * 2. Stage-1 Routing:
 *    - Greetings & Chitchat -> Zero search, warm text response.
 *    - Clarification -> Zero search, 1-2 focused questions.
 * 3. Two-Stage Video Retrieval & Strict AI Re-Ranking:
 *    - Metadata priority for class names/serials.
 *    - Topic gatekeeper: Excludes courses/videos when academy has no course on that topic (e.g. Dowry, Cheque).
 * 4. Grounded Bangladesh Legislation (bdlaws.minlaw.gov.bd):
 *    - Authentic statutes and sections.
 * 5. Strict Guardrails:
 *    - Detects invalid sections (e.g. Section 9999) & fictional laws.
 *    - Appends Legal Disclaimer to personal legal problems.
 */

function mergeConversationContext(query, conversationHistory = []) {
  const current = String(query || '').trim();
  if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
    return current;
  }

  // Find the last assistant message and last user message
  const recentHistory = conversationHistory.slice(-4);
  const lastAssistantTurn = [...recentHistory].reverse().find(m => m.role === 'assistant' || m.sender === 'ai');
  const lastUserTurn = [...recentHistory].reverse().find(m => (m.role === 'user' || m.sender === 'user') && (m.content || m.text) !== current);

  // If current message is brief (e.g. "ফৌজদারি", "টাকা আত্মসাৎ", "হ্যাঁ থানায় গেছি"), merge context from history
  if (current.split(/\s+/).length <= 6 && lastAssistantTurn) {
    const assistantText = String(lastAssistantTurn.content || lastAssistantTurn.text || lastAssistantTurn.reply || '');
    const userPrevText = lastUserTurn ? String(lastUserTurn.content || lastUserTurn.text || '') : '';
    
    // Extract contextual keywords from previous turns
    let contextualPrefix = '';
    if (assistantText.includes('দেওয়ানী') || assistantText.includes('ফৌজদারি') || userPrevText.includes('মামলা')) {
      contextualPrefix = `${userPrevText} `;
    }
    return `${contextualPrefix}${current}`.trim();
  }

  return current;
}

/**
 * Intent & Context Gatekeeper
 */
function analyzeUserIntentAndContext(query, conversationHistory = []) {
  const raw = String(query || '').trim();
  const lower = raw.toLowerCase();
  const cleanPunct = lower.replace(/[?!।,.\-_/\\@#$%^&*()]/g, '').trim();

  // 1. Chit-chat & Greetings
  const hasLegalKeywords = /(?:মামলা|ধারা|আইন|আদালত|কোর্ট|পুলিশ|গ্রেপ্তার|রিমান্ড|যৌতুক|চেক|টাকা|দেনমোহর|খোরপোষ|জমি|বেদখল|দলিল|খতিয়ান|চুরি|প্রতারণা|আত্মসাৎ|খুন|মারধর|নোটিশ|বিচার|শাস্তি|এখতিয়ার|সংবিধান|অনুচ্ছেদ|বিজিএস|বার\s*কাউন্সিল|কোর্স|ক্লাস|ভিডিও|লেকচার|problem|law|statute|penal|crpc|cpc)/i.test(lower);
  const greetingSubstrings = [
    'কেমন আছেন', 'kemon achen', 'ভালো আছেন', 'valo achen', 'bhalo achen',
    'নমস্কার', 'সালাম', 'আসসালামু আলাইকুম', 'assalamu alaikum', 'salam',
    'ধন্যবাদ', 'thank you', 'thanks', 'thx', 'শুভ সকাল', 'শুভ দুপুর', 'শুভ সন্ধ্যা',
    'good morning', 'good evening', 'good afternoon', 'হাই', 'হ্যালো', 'hello', 'hey'
  ];
  const containsGreeting = greetingSubstrings.some(g => lower.includes(g));

  const greetingPatterns = [
    /^(?:hi|hello|hey|salam|assalamu\s*alaikum|নমস্কার|সালাম|আসসালামু\s*আলাইকুম|কেমন\s*আছেন|kemon\s*achen|good\s*morning|good\s*evening|good\s*afternoon|ধন্যবাদ|thanks|thank\s*you|thx)$/i,
    /^(?:হাই|হ্যালো|হাই\s*কেমন\s*আছেন|হ্যালো\s*কেমন\s*আছেন|কেমন\s*আছেন|ভালো\s*আছেন|ভালো\s*আছো|valo\s*achen|bhalo\s*achen)$/i,
    /^(?:who\s*are\s*you|তুমি\s*কে|কে\s*আপনি|তোমার\s*পরিচয়\s*কি|আপনার\s*পরিচয়\s*কি|bjs\s*academy\s*ki|academy\s*ki|তোমরা\s*কারা)$/i,
    /^(?:অনেক\s*ধন্যবাদ|অনেক\s*উপকার\s*হলো|দারুণ\s*কাজ|দারুণ|great|awesome)$/i
  ];
  const isGreeting = greetingPatterns.some(p => p.test(cleanPunct)) || 
                     (cleanPunct.length <= 5 && ['hi', 'hey', 'hello', 'হাই', 'হ্যালো', 'ধন্যবাদ'].includes(cleanPunct)) ||
                     (!hasLegalKeywords && containsGreeting);

  // 2. Ambiguous or Vague queries requiring clarification
  // e.g. "আমার নামে মামলা হয়েছে", "একটা আইনি সমস্যায় পড়েছি", "মামলা করতে চাই", "help me police problem"
  const vagueProblemPatterns = [
    /^(?:আমার\s*(?:নামে\s*)?(?:একটা\s*)?মামলা\s*(?:হয়েছে|হইছে|করছে)(?:\s*(?:কি|কী)\s*করব[ো]?)?)$/i,
    /^(?:একটা\s*আইনি\s*(?:ঝামেলায়|সমস্যায়)\s*পড়েছি(?:\s*(?:সাহায্য\s*করুন|কি\s*করব)?)?)$/i,
    /^(?:আইনি\s*পরামর্শ\s*চাই|আইনি\s*সহায়তা\s*চাই|help\s*me\s*legal\s*problem|help\s*me\s*police\s*problem)$/i,
    /^(?:মামলা\s*করতে\s*চাই|আমি\s*কি\s*মামলা\s*করতে\s*পারি|থানা\s*পুলিশ\s*নিয়ে\s*সমস্যা)$/i,
    /^(?:আমার\s*সম্পত্তি\s*নিয়ে\s*বিরোধ|জমি\s*নিয়ে\s*বিরোধ\s*(?:কি\s*করব)?)$/i
  ];
  const isDirectVagueProblem = vagueProblemPatterns.some(p => p.test(cleanPunct));
  const isUltraShort = (cleanPunct.length <= 4 && !isGreeting) || /^(?:\?|আইন|ধারা|মামলা|শাস্তি|help|law)$/i.test(cleanPunct);
  const isClarificationNeeded = (isDirectVagueProblem || isUltraShort) && (!conversationHistory || conversationHistory.length === 0);

  // 3. Class / Video Search Intent
  const videoSearchKeywords = [
    'ভিডিও', 'ক্লাস', 'লেকচার', 'রেকর্ডিং', 'কোর্স ভিডিও', 'ভিডিও লিংক', 'কোথায় পাব', 'ভিডিও দেখতে চাই',
    'class', 'video', 'lecture', 'recording', 'kothay', 'dekhte chai', 'link', '1st class', '2nd class',
    'orientation', 'মডিউল', 'module', 'অধ্যায়', 'chapter', 'ক্লাস কোথায়', '১ম ক্লাস', '২য় ক্লাস', '৩য় ক্লাস'
  ];
  const isVideoSearch = videoSearchKeywords.some(kw => lower.includes(kw)) &&
    !lower.includes('মামলা করব') && !lower.includes('শাস্তি কি') && !lower.includes('ধারা কত') && !lower.includes('যৌতুক');

  // 4. Real-Life Legal Problem Intent (Dispute, crime, fraud, domestic, land, money)
  const problemKeywords = [
    'যৌতুক', 'dowry', 'জমি দখল', 'বেদখল', 'সীমানা', 'প্রাচীর', 'ভাঙচুর', 'টাকা ধার', 'টাকা আত্মসাৎ', 'টাকা ফেরত', 'টাকা পাওনা', 'টাকা', 'চিটিং', 'প্রতারণা',
    'হুমকি', 'মারামারি', 'আঘাত', 'চেক বাউন্স', 'চেক ডিজঅনার', 'তালাক', 'ডিভোর্স', 'দেনমোহর', 'খোরপোষ',
    'ভরণপোষণ', 'মিথ্যা মামলা', 'পুলিশ', 'থানা', 'জিডি', 'এজাহার', 'এফআইআর', 'আটক', 'গ্রেপ্তার', 'করনীয়',
    'করণীয়', 'কি করব', 'কি করবো', 'কী করব', 'মামলা করব', 'মামলা করবো', 'মামলা করতে', 'neighbor', 'jomi', 'dokhol', 'bedokhol', 'bhanga',
    'cheating', 'fraud', 'threat', 'humki', 'money', 'taka', 'cheque', 'bounce', 'dishonour', 'divorce',
    'talak', 'denmohor', 'police', 'fir', 'gd', 'ki korbo', 'amar neighbor', 'shimanapracir', 'cheat'
  ];
  const isLegalProblem = problemKeywords.some(kw => lower.includes(kw));

  // 5. Statutory / Exam Inquiry Intent
  const statuteKeywords = [
    'ধারা', 'অনুচ্ছেদ', 'আদেশ', 'দফা', 'section', 'article', 'order', 'দণ্ডবিধি', 'ফৌজদারি কার্যবিধি',
    'দেওয়ানী কার্যবিধি', 'সাক্ষ্য আইন', 'সুনির্দিষ্ট প্রতিকার', 'সংবিধান', 'এনআই অ্যাক্ট', 'তামাদি',
    'বার কাউন্সিল', 'বিজিএস', 'bjs', 'bar council', 'res judicata', 'prima facie', 'cpc', 'crpc',
    'ব্যতিক্রম', 'শাস্তি', 'উপাদান', 'জামিনের নিয়ম', 'যৌতুক নিরোধ আইন'
  ];
  const isStatuteInquiry = statuteKeywords.some(kw => lower.includes(kw));

  // Determine Primary Core Intent
  let primaryIntent = 'GENERAL_LEGAL_QUERY';
  if (isGreeting) {
    primaryIntent = 'CHAT_OR_GREETING';
  } else if (isClarificationNeeded) {
    primaryIntent = 'CLARIFICATION_NEEDED';
  } else if (isVideoSearch && !isLegalProblem && !isStatuteInquiry) {
    primaryIntent = 'CLASS_OR_VIDEO_LOOKUP';
  } else if (isVideoSearch && (isLegalProblem || isStatuteInquiry)) {
    primaryIntent = 'MIXED_INQUIRY';
  } else if (isLegalProblem) {
    primaryIntent = 'LEGAL_ADVICE_OR_STATUTE';
  } else if (isStatuteInquiry) {
    primaryIntent = 'LEGAL_ADVICE_OR_STATUTE';
  }

  return {
    raw,
    lower,
    primaryIntent,
    isGreeting,
    isClarificationNeeded,
    isVideoSearch,
    isLegalProblem,
    isStatuteInquiry,
    isVague: isClarificationNeeded
  };
}

let cachedResolvedModel = null;
let lastModelCheckTime = 0;

/**
 * Dynamically resolves the best active Gemini model supported by the user's API Key.
 * Queries Google's ListModels endpoint to automatically discover available Flash models
 * (e.g. gemini-2.5-flash, gemini-3.8-flash, etc.)
 */
async function resolveOptimalGeminiModel(apiKey) {
  if (process.env.GEMINI_MODEL) {
    return process.env.GEMINI_MODEL;
  }
  if (!apiKey) {
    return 'gemini-2.5-flash';
  }

  const now = Date.now();
  if (cachedResolvedModel && (now - lastModelCheckTime < 3600000)) {
    return cachedResolvedModel;
  }

  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listRes = await fetch(listUrl, {
      method: 'GET',
      headers: { 'x-goog-api-key': apiKey }
    });
    if (listRes.ok) {
      const data = await listRes.json();
      if (Array.isArray(data?.models)) {
        const usable = data.models.filter(m => 
          Array.isArray(m.supportedGenerationMethods) && 
          m.supportedGenerationMethods.includes('generateContent')
        );

        const modelNames = usable.map(m => m.name.replace(/^models\//, ''));
        console.log(`[Gemini Discovery] Found ${modelNames.length} usable models: ${modelNames.slice(0, 10).join(', ')}`);

        // Preference order: super-fast flash-lite-latest (fastest & lowest latency), then flash-latest, then 2.5-flash
        const pick =
          modelNames.find(n => n === 'gemini-flash-lite-latest') ||
          modelNames.find(n => n === 'gemini-flash-latest') ||
          modelNames.find(n => n === 'gemini-2.5-flash-lite') ||
          modelNames.find(n => n === 'gemini-2.5-flash') ||
          modelNames.find(n => n.includes('3.8-flash')) ||
          modelNames.find(n => n === 'gemini-pro-latest') ||
          modelNames.find(n => n.includes('flash')) ||
          modelNames[0];

        if (pick) {
          cachedResolvedModel = pick;
          lastModelCheckTime = now;
          console.log(`[Gemini Discovery] Selected optimal model: ${cachedResolvedModel}`);
          return cachedResolvedModel;
        }
      }
    } else {
      const errTxt = await listRes.text();
      console.warn(`[Gemini Discovery] ListModels returned ${listRes.status}: ${errTxt.substring(0, 180)}`);
    }
  } catch (err) {
    console.warn(`[Gemini Discovery] Error checking models: ${err.message}`);
  }

  return 'gemini-2.5-flash';
}

/**
 * Call Google Gemini API with Grounding & Multi-turn Context
 */
async function callGroundedGeminiAi({ query, intentMeta, verifiedSources = [], matchedLessons = [], studentName = 'শিক্ষার্থী', apiKey, conversationHistory = [] }) {
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

  let historyContext = '';
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    historyContext = conversationHistory.slice(-4).map(m => {
      const role = m.role === 'user' || m.sender === 'user' ? 'শিক্ষার্থী' : 'আইন সহকারী';
      const text = m.content || m.text || m.reply || '';
      return `${role}: ${text}`;
    }).join('\n');
  }

  const prompt = `তুমি "BJS & Bar Aspirants Academy"-র অফিসিয়াল আইন সহকারী (AI Legal Assistant)। তুমি একজন প্রজ্ঞাবান আইনজ্ঞ, সহানুভূতিশীল মেন্টর এবং শিক্ষার্থীদের বিশ্বস্ত পরামর্শক।

শিক্ষার্থীর ইনপুট: "${query}"
শিক্ষার্থীর নাম: ${studentName}
শনাক্তকৃত ইনটেন্ট (Intent): ${intentMeta.primaryIntent}

${historyContext ? `[পূর্ববর্তী চ্যাট কনটেক্সট (Conversation History)]:
========================
${historyContext}
========================` : ''}

${sourceContext ? `[বাংলাদেশ সরকারের অফিসিয়াল লেজিসলেটিভ ও সুপ্রিম কোর্ট নথি (bdlaws.minlaw.gov.bd)]:
========================
${sourceContext}
========================` : '[তথ্যসূত্র: গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের প্রচলিত আইনের মূল বিধান অনুযায়ী উত্তর প্রস্তুত করো]'}

${videoContext ? `[BJS & Bar Academy অফিসিয়াল ভিডিও লেকচার ও বাংলা সাবটাইটেল (MongoDB)]:
========================
${videoContext}
========================` : ''}

[কঠোর এআই রিজনিং ও রেসপন্স গাইডলাইন]:
১. ইনটেন্ট অনুযায়ী রেসপন্স ফিল্টারিং:
  - CHAT_OR_GREETING হলে: সম্পূর্ণ বন্ধুত্বপূর্ণ সম্ভাষণ জানাও। কোনো ভিডিও বা ধারা যুক্ত করবে না।
  - CLARIFICATION_NEEDED হলে: কোনো অনুমানভিত্তিক ধারা না দিয়ে ১-২টি সুস্পষ্ট পাল্টা প্রশ্ন করো।
  - LEGAL_ADVICE_OR_STATUTE হলে:
    (ক) যৌতুকের ক্ষেত্রে শুধুমাত্র যৌতুক নিরোধ আইন ২০১৮ ও নারী ও শিশু নির্যাতন দমন আইন ২০০০ উল্লেখ করবে। কখনোই CrPC ৫৪ বা খুনের ২৯৯ ধারা উল্লেখ করবে না।
    (খ) চেক ডিজঅনারের ক্ষেত্রে শুধুমাত্র এনআই অ্যাক্ট ১৮৮১-এর ১৩৮ ধারা উল্লেখ করবে।
    (গ) জমি বেদখলের ক্ষেত্রে সুনির্দিষ্ট প্রতিকার আইন ১৮৭৭-এর ৯ ধারা এবং ৬ মাসের সময়সীমা উল্লেখ করবে।
    (ঘ) ভিডিও কনটেক্সট যদি না থাকে বা অপ্রাসঙ্গিক হয়, তবে কোনো ভিডিও লিংক উল্লেখ করবে না।
    (ঙ) উত্তরের শেষে অবশ্যই লিগ্যাল ডিসক্লেইমার যুক্ত করবে:
        "⚠️ **আইনি সতর্কবার্তা (Legal Disclaimer):** এই পরামর্শটি সাধারণ আইনি শিক্ষা ও সচেতনতার উদ্দেশ্যে প্রদত্ত। কোনো চূড়ান্ত আইনি পদক্ষেপ গ্রহণের পূর্বে একজন বিজ্ঞ আইনজীবীর সাথে সরাসরি পরামর্শ করার অনুরোধ করা হলো।"

২. মনগড়া বা কাল্পনিক কোনো ধারা কখনোই তৈরি করবে না।`;

  const optimalModel = await resolveOptimalGeminiModel(apiKey);
  const candidateModels = [
    process.env.GEMINI_MODEL,
    optimalModel,
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-3.8-flash',
    'gemini-pro-latest'
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

  let lastErr = null;
  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Gemini Attempt] Model "${model}" failed (${response.status}): ${errText.substring(0, 160)}`);
        lastErr = new Error(`Gemini Provider (${model}) Error: ${response.status} - ${errText}`);
        if (response.status === 404 || response.status === 503 || response.status === 400) {
          continue;
        }
        throw lastErr;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error(`Empty response received from Gemini model ${model}`);

      // Cache working model
      cachedResolvedModel = model;
      lastModelCheckTime = Date.now();

      return { text, model };
    } catch (err) {
      lastErr = err;
      if (candidateModels.indexOf(model) < candidateModels.length - 1) {
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr || new Error("Failed to generate response from Gemini API");
}

/**
 * Production-Grade Dynamic Synthesizer (Zero-Failure Fallback Engine)
 */
function synthesizeDynamicAnswer({ query, intentMeta, verifiedSources = [], matchedLessons = [], studentName = 'শিক্ষার্থী' }) {
  // 1. Chit-chat & Greetings
  if (intentMeta.primaryIntent === 'CHAT_OR_GREETING' || intentMeta.isGreeting) {
    return `👋 **আসসালামু আলাইকুম!**\n` +
      `আমি **BJS & Bar Aspirants Academy**-র অফিসিয়াল **আইন সহকারী (AI Legal Assistant)**।\n\n` +
      `আপনাকে কীভাবে সাহায্য করতে পারি? আপনি নিচের যেকোনো বিষয়ে আমাকে প্রশ্ন করতে পারেন:\n` +
      `• ⚖️ **বাস্তব জীবনের আইনি সমাধান:** জমিজমা বিরোধ, যৌতুক সংক্রান্ত সমস্যা, চেক ডিজঅনার, পারিবারিক দেনমোহর বা আর্থিক প্রতারণা।\n` +
      `• 📖 **আইনের ধারা ও পর্যালোচনা:** দণ্ডবিধি, ফৌজদারি কার্যবিধি, দেওয়ানী কার্যবিধি, সংবিধান ও অন্যান্য প্রচলিত আইন।\n` +
      `• 🎥 **একাডেমি ক্লাস ও লেকচার:** আমাদের কোর্সের যেকোনো ক্লাস ও টপিক।\n\n` +
      `আপনার নির্দিষ্ট প্রশ্ন বা বিষয়টি লিখুন, আমি সহযোগিতা করতে প্রস্তুত।`;
  }

  // 2. Clarification Needed for Ambiguous/Incomplete Queries
  if (intentMeta.primaryIntent === 'CLARIFICATION_NEEDED') {
    return `আপনার আইনি সমস্যাটি সঠিকভাবে মূল্যায়নের জন্য অনুগ্রহ করে নিচের বিষয়গুলো একটু স্পষ্ট করুন:\n\n` +
      `১. বিষয়টি কি **দেওয়ানী প্রকৃতির** (যেমন: জমিজমা, স্বত্ব, বাটোয়ারা বা পারিবারিক অধিকার) নাকি **ফৌজদারি প্রকৃতির** (যেমন: মারামারি, অর্থ আত্মসাৎ, প্রতারণা, চুরি বা থানায় এজাহার/অভিযোগ)?\n` +
      `২. আপনার প্রতিপক্ষ কী পদক্ষেপ নিয়েছে (যেমন: থানায় জিডি/মামলা হয়েছে, লিগ্যাল নোটিশ এসেছে, নাকি কোনো নোটিশ ছাড়াই বিরোধ সৃষ্টি হয়েছে)?\n\n` +
      `এই বিষয়গুলো জানালে আমি আপনাকে সংশ্লিষ্ট আইন, প্রযোজ্য ধারা এবং সুনির্দিষ্ট পরবর্তী ব্যবহারিক পদক্ষেপ জানাতে পারব।`;
  }

  // 3. Class / Video Search
  if (intentMeta.primaryIntent === 'CLASS_OR_VIDEO_LOOKUP' && matchedLessons.length > 0) {
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

  // 4. Real-life Legal Problem & Advice
  if (intentMeta.isLegalProblem || intentMeta.primaryIntent === 'LEGAL_ADVICE_OR_STATUTE') {
    const cleanLower = query.toLowerCase();
    let ans = `⚖️ **বাস্তব আইনি সমাধান ও দিকনির্দেশনা:**\n\n`;

    // (A) Dowry Problem Specific Handling
    if (cleanLower.includes('যৌতুক') || cleanLower.includes('dowry')) {
      ans += `📌 **প্রযোজ্য আইন ও ধারা:**\n` +
        `• **যৌতুক নিরোধ আইন, ২০১৮ (ধারা ৩ ও ৪):** প্রত্যক্ষ বা পরোক্ষভাবে যৌতুক দাবি করা, গ্রহণ করা বা প্রদান করা জামিন-অযোগ্য ও আমলযোগ্য অপরাধ। শাস্তি: অনধিক ৫ বছর কিন্তু অন্যূন ১ বছর কারাদণ্ড বা ৫০,০০০ টাকা পর্যন্ত অর্থদণ্ড কিংবা উভয় দণ্ড।\n` +
        `• **নারী ও শিশু নির্যাতন দমন আইন, ২০০০ (ধারা ১১):** যৌতুকের দাবিতে শারীরিক নির্যাতন বা জখম করা হলে কঠোর সশ্রম কারাদণ্ড এবং মৃত্যুর ক্ষেত্রে মৃত্যুদণ্ড বা যাবজ্জীবন কারাদণ্ডের বিধান রয়েছে।\n\n` +
        `📌 **করণীয় ও ব্যবহারিক পদক্ষেপ:**\n` +
        `১. **চিকিৎসা ও প্রমাণপত্র:** শারীরিক নির্যাতনের ঘটনা ঘটলে অবিলম্বে সরকারি হাসপাতালে চিকিৎসা নিয়ে 'মেডিকেল সার্টিফিকেট' সংগ্রহ করুন।\n` +
        `২. **থানায় মামলা বা জিডি:** যৌতুক দাবি বা নির্যাতনের ঘটনায় নিকটস্থ থানায় সরাসরি এজাহার (FIR) দায়ের করতে পারেন।\n` +
        `৩. **আদালতে সিআর মামলা:** থানা মামলা গ্রহণ না করলে বিজ্ঞ জুডিসিয়াল ম্যাজিস্ট্রেট আদালতে যৌতুক নিরোধ আইনে সরাসরি নালিশী (CR) মামলা দায়ের করা যায়।\n` +
        `৪. **জরুরি হেল্পলাইন:** সরকারি জরুরি সেবার জন্য **১০৯** (নারী ও শিশু নির্যাতন প্রতিরোধ সেল) অথবা **৯৯৯**-এ তাৎক্ষণিক যোগাযোগ করতে পারেন।\n\n`;
    }
    // (B) Land Dispossession Specific Handling
    else if (cleanLower.includes('বেদখল') || cleanLower.includes('দখল') || cleanLower.includes('সীমানা')) {
      ans += `📌 **প্রযোজ্য আইন ও ধারা:**\n` +
        `• **সুনির্দিষ্ট প্রতিকার আইন, ১৮৭৭ (ধারা ৯):** যথাযথ আইনি পন্থা ব্যতিরেকে স্থাবর সম্পত্তি থেকে দখলচ্যুত হলে স্বত্ব প্রতিষ্ঠা ছাড়াই বেদখল হওয়ার **৬ মাসের মধ্যে** দখল পুনরুদ্ধারের জন্য মোকদ্দমা দায়ের করা যায়।\n` +
        `• **ফৌজদারি কার্যবিধি, ১৮৯৮ (ধারা ১৪৪/১৪৫):** বিরোধপূর্ণ জমিতে শান্তি ভঙ্গের বা আইন-শৃঙ্খলা বিঘ্নিত হওয়ার আশঙ্কা থাকলে নির্বাহী ম্যাজিস্ট্রেট আদালতে আবেদন করে স্থিতাবস্থা (Status Quo) বজায় রাখা যায়।\n` +
        `• **দণ্ডবিধি, ১৮৬০ (ধারা ৪৪৭ ও ৪২৭):** জমিতে বেআইনিভাবে প্রবেশ ও প্রাচীর ভাঙচুর করার অপরাধে অনধিকার প্রবেশ ও অনিষ্টের মামলা দায়ের করা যায়।\n\n` +
        `📌 **করণীয় ও ব্যবহারিক পদক্ষেপ:**\n` +
        `১. জমির মালিকানা ও খতিয়ান/দলিল এবং সর্বশেষ খাজনার রসিদ প্রস্তুত রাখুন।\n` +
        `২. বেদখল হওয়ার ৬ মাসের সময়সীমা যেন তামাদি না হয় সেদিকে বিশেষ লক্ষ্য রেখে দেওয়ানী আদালতে মোকদ্দমা দায়ের করুন।\n\n`;
    }
    // (C) Cheque Dishonour Specific Handling
    else if (cleanLower.includes('চেক') && (cleanLower.includes('বাউন্স') || cleanLower.includes('ডিজঅনার') || cleanLower.includes('টাকা'))) {
      ans += `📌 **প্রযোজ্য আইন ও ধারা:**\n` +
        `• **হস্তান্তরযোগ্য দলিল আইন, ১৮৮১ (এনআই অ্যাক্ট, ধারা ১৩৮):** ব্যাংক অ্যাকাউন্টে অপর্যাপ্ত তহবিলের কারণে চেক বাউন্স বা প্রত্যাখ্যাত হলে তা ফৌজদারি অপরাধ। শাস্তি: অনধিক ১ বছর কারাদণ্ড অথবা চেকে উল্লিখিত অর্থের তিনগুণ পর্যন্ত অর্থদণ্ড, কিংবা উভয় দণ্ড।\n\n` +
        `📌 **বাধ্যতামূলক আইনি ধাপসমূহ:**\n` +
        `১. ব্যাংক থেকে 'চেক প্রত্যাখ্যাত হওয়ার স্মারক' (Dishonour Memo) গ্রহণ করুন।\n` +
        `২. মেমো পাওয়ার **৩০ দিনের মধ্যে** রেজিস্ট্রি ডাকযোগে আইনজীবীর মাধ্যমে চেকদাতাকে ১৫ দিনের সময় দিয়ে 'লিগ্যাল নোটিশ' প্রেরণ করুন।\n` +
        `৩. নোটিশ প্রাপ্তির ৩০ দিন অতিবাহিত হওয়ার পর আদালতে সিআর মামলা দায়ের করতে হবে।\n\n`;
    }
    // (D) General Criminal Fraud / Breach of Trust / Money dispute
    else if (cleanLower.includes('টাকা') || cleanLower.includes('আত্মসাৎ') || cleanLower.includes('প্রতারণা') || cleanLower.includes('চিটিং') || cleanLower.includes('cheat')) {
      ans += `📌 **প্রযোজ্য আইন ও ধারা:**\n` +
        `• **দণ্ডবিধি, ১৮৬০ (ধারা ৪০৬):** অপরাধমূলক বিশ্বাসভঙ্গের (Criminal breach of trust) শাস্তি—অনধিক ৩ বছর কারাদণ্ড বা অর্থদণ্ড।\n` +
        `• **দণ্ডবিধি, ১৮৬০ (ধারা ৪২০):** অসদুপায়ে সম্পত্তি অর্পণ ও প্রতারণার (Cheating) শাস্তি—অনধিক ৭ বছর কারাদণ্ড এবং অর্থদণ্ড।\n\n` +
        `📌 **করণীয় পদক্ষেপ:** টাকা লেনদেনের রসিদ, ব্যাংক স্টেটমেন্ট বা চুক্তিনামা সংরক্ষণ করে থানায় এজাহার বা আদালতে সিআর মামলা দায়ের করতে পারেন।\n\n`;
    }
    // (E) General Case with Verified Source from Database
    else if (verifiedSources.length > 0) {
      const top = verifiedSources[0];
      ans += `📌 **প্রযোজ্য আইন ও বিধান:**\n` +
        `• **সংশ্লিষ্ট আইন:** ${top.actTitleBn} (${top.actTitleEn})\n` +
        `• **সংশ্লিষ্ট ধারা:** ${top.sectionType} ${top.sectionNumBn || top.sectionNum} — ${top.titleBn}\n` +
        `• **মূল বিধিবদ্ধ বিধান:** "${top.excerptBn}"\n\n` +
        `📌 **বাস্তবমুখী পদক্ষেপ:** উপযুক্ত প্রমাণাদি সংগ্রহ করে বিজ্ঞ আইনজীবীর মাধ্যমে সংশ্লিষ্ট দেওয়ানী বা ফৌজদারি আদালতে আইনগত প্রতিকার প্রার্থনা করতে পারেন।\n\n`;
    } else {
      ans += `📌 **আইনি মূল্যায়ন:** আপনার উল্লেখিত বিষয়ে সংশ্লিষ্ট প্রচলিত আইনে যথাযথ প্রতিকারের বিধান রয়েছে। ঘটনার বিস্তারিত প্রমাণাদি ও স্বাক্ষীদের তথ্য সংরক্ষণ করুন।\n\n`;
    }

    if (matchedLessons.length > 0) {
      const topLesson = matchedLessons[0];
      ans += `📺 **একাডেমি ভিডিও ক্লাস রেফারেন্স:**\n` +
        `• **ক্লাস:** ${topLesson.title} (${topLesson.chapter || topLesson.module || 'কোর্স'})\n` +
        `• **আলোচনার সময় (Timestamp):** \`[${topLesson.timestamp || '00:00'}]\`\n\n`;
    }

    ans += `⚠️ **আইনি সতর্কবার্তা (Legal Disclaimer):** এই পরামর্শটি সাধারণ আইনি শিক্ষা ও সচেতনতার উদ্দেশ্যে প্রদত্ত। কোনো চূড়ান্ত আইনি পদক্ষেপ গ্রহণের পূর্বে একজন বিজ্ঞ আইনজীবীর সাথে সরাসরি পরামর্শ করার অনুরোধ করা হলো।`;
    return ans;
  }

  // 5. Statutory Explanation Only
  if (verifiedSources.length > 0) {
    const top = verifiedSources[0];
    let ans = `⚖️ **যাচাইকৃত আইনি সমাধান:**\n\n` +
      `**সংশ্লিষ্ট আইন:** ${top.actTitleBn} (${top.actTitleEn})\n` +
      `**আইনের স্থিতি:** ${top.statusBn || 'কার্যকর আইন'}\n` +
      `**সংশ্লিষ্ট ধারা/অনুচ্ছেদ:** ${top.sectionType} ${top.sectionNumBn || top.sectionNum} — ${top.titleBn}\n\n` +
      `📌 **মূল আইনি বিধান ও পর্যালোচনা:**\n` +
      `${top.excerptBn}\n\n` +
      `উক্ত আইনের সরাসরি সরকারি গেজেট ও লেজিসলেটিভ নথি বিস্তারিত দেখতে নিচে "মূল উৎস দেখুন" বাটনে ক্লিক করুন।`;

    if (matchedLessons.length > 0) {
      const topLesson = matchedLessons[0];
      ans += `\n\n📺 **একাডেমি ভিডিও ক্লাস ও সাবটাইটেল রেফারেন্স:**\n` +
        `• **ক্লাস:** ${topLesson.title} (${topLesson.chapter || topLesson.module || 'কোর্স'})\n` +
        `• **আলোচনার সময় (Timestamp):** \`[${topLesson.timestamp || '00:00'}]\`\n` +
        `• **সংক্ষিপ্ত নোট:** "${topLesson.snippet || ''}"`;
    }
    return ans;
  }

  // 6. Matched Academy Lesson Only
  if (matchedLessons.length > 0) {
    const topLesson = matchedLessons[0];
    return `⚖️ **একাডেমি ক্লাস পর্যালোচনা:**\n\n` +
      `আমাদের একাডেমির ভিডিও ক্লাসে এই বিষয়ে বিস্তারিত আলোচনা রয়েছে:\n` +
      `• **ক্লাস:** ${topLesson.title} (${topLesson.chapter || topLesson.module || 'কোর্স'})\n` +
      `• **আলোচনার সময় (Timestamp):** \`[${topLesson.timestamp || '00:00'}]\`\n` +
      `• **আলোচনার অংশ:** "${topLesson.snippet || ''}"\n\n` +
      `নিচে ভিডিও কার্ড থেকে সরাসরি ক্লাসটি উপভোগ করতে পারেন।`;
  }

  // 7. Unverified Query Disclosure
  return `এই প্রশ্নের নির্ভরযোগ্য মূল নথি বা একাডেমি লেকচার এখন যাচাই করা যায়নি।\n\nঅনুগ্রহ করে সংশ্লিষ্ট আইনের নাম (যেমন: গণপ্রজাতন্ত্রী বাংলাদেশের সংবিধান, দণ্ডবিধি, ফৌজদারি কার্যবিধি, দেওয়ানী কার্যবিধি) বা নির্দিষ্ট ধারা উল্লেখ করে পুনরায় প্রশ্ন করুন।`;
}

/**
 * Main Grounded Legal AI Query Processor (Production-Grade Agentic Architecture)
 */
async function processLegalAiQuery({ query, studentName = 'শিক্ষার্থী', allLessons = [], conversationHistory = [] }) {
  if (!query || !query.trim()) {
    return {
      ok: false,
      message: 'অনুগ্রহ করে আপনার আইনি প্রশ্ন বা সমস্যাটি লিখুন।'
    };
  }

  const cleanQuery = query.trim();

  // Multi-Turn Context Merging: Combine brief replies with earlier context
  const contextualQuery = mergeConversationContext(cleanQuery, conversationHistory);

  // Stage-1: LLM-First Intent & Context Gatekeeper
  const intentMeta = analyzeUserIntentAndContext(contextualQuery, conversationHistory);

  // CASE 1: Chit-chat & Greetings
  if (intentMeta.primaryIntent === 'CHAT_OR_GREETING' || intentMeta.isGreeting) {
    const greetingAnswer = synthesizeDynamicAnswer({ query: cleanQuery, intentMeta, studentName });
    return {
      ok: true,
      query: cleanQuery,
      answer: greetingAnswer,
      intent: 'CHAT_OR_GREETING',
      provider: 'agentic_gatekeeper_greeting',
      isAiGenerated: false,
      verifiedSources: [],
      matchedLessons: [],
      hasSuggestedVideo: false,
      isAmbiguous: false,
      timestamp: new Date().toISOString()
    };
  }

  // CASE 2: Clarification Needed (Vague / Incomplete problem)
  if (intentMeta.primaryIntent === 'CLARIFICATION_NEEDED') {
    const clarificationAnswer = synthesizeDynamicAnswer({ query: cleanQuery, intentMeta, studentName });
    return {
      ok: true,
      query: cleanQuery,
      answer: clarificationAnswer,
      intent: 'CLARIFICATION_NEEDED',
      provider: 'agentic_gatekeeper_clarification',
      isAiGenerated: false,
      verifiedSources: [],
      matchedLessons: [],
      hasSuggestedVideo: false,
      isAmbiguous: true,
      timestamp: new Date().toISOString()
    };
  }

  // CASE 3: Guardrail Check for Non-Existent / Out-of-bounds Sections
  const sourceResult = await retrieveVerifiedSources(contextualQuery);
  if (sourceResult.isInvalidSection) {
    return {
      ok: true,
      query: cleanQuery,
      answer: `⚠️ **ধারা যাচাইকরণ সতর্কবার্তা:**\n\n${sourceResult.message}`,
      intent: 'INVALID_SECTION_GUARDRAIL',
      provider: 'agentic_statute_guardrail',
      isAiGenerated: false,
      verifiedSources: [],
      matchedLessons: [],
      hasSuggestedVideo: false,
      isAmbiguous: false,
      timestamp: new Date().toISOString()
    };
  }

  const verifiedSources = sourceResult.sources || [];

  // Stage-2: Two-Stage Video Retrieval & Strict AI Re-Ranking
  // Note: searchLessonsForQuery automatically blocks unoffered topics (Dowry, Cheque, Cyber, etc.)
  const matchedLessons = searchLessonsForQuery(contextualQuery, allLessons, 2, intentMeta);
  const hasSuggestedVideo = (matchedLessons && matchedLessons.length > 0);

  // Synthesize Answer: Gemini API if key is present, otherwise Smart Fallback Engine
  let aiAnswer = '';
  let provider = 'bdlaws_statutory_grounded';
  let isAiGenerated = false;

  const geminiKey = process.env.GEMINI_API_KEY || '';

  if (geminiKey) {
    try {
      const geminiRes = await callGroundedGeminiAi({
        query: contextualQuery,
        intentMeta,
        verifiedSources,
        matchedLessons,
        studentName,
        apiKey: geminiKey,
        conversationHistory
      });
      aiAnswer = typeof geminiRes === 'string' ? geminiRes : (geminiRes?.text || '');
      const usedModel = typeof geminiRes === 'object' && geminiRes?.model ? geminiRes.model : 'gemini-2.5-flash';
      provider = `gemini_${usedModel.replace(/[\.\-]/g, '_')}`;
      isAiGenerated = true;
    } catch (err) {
      console.error('Gemini Provider Error:', err.message);
      aiAnswer = synthesizeDynamicAnswer({
        query: contextualQuery,
        intentMeta,
        verifiedSources,
        matchedLessons,
        studentName
      });
      provider = 'bdlaws_statutory_fallback';
    }
  } else {
    aiAnswer = synthesizeDynamicAnswer({
      query: contextualQuery,
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
    hasSuggestedVideo,
    isAmbiguous: false,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  processLegalAiQuery,
  callGroundedGeminiAi,
  resolveOptimalGeminiModel,
  synthesizeDynamicAnswer,
  analyzeUserIntentAndContext
};
