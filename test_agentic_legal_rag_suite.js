// ============================================================================
// HARD PRODUCTION SAFETY GUARD: Blocks test execution against production DB
// ============================================================================
(() => {
  try { require('dotenv').config({ path: 'server/.env' }); } catch (e) {}
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  const db = process.env.MONGODB_DB || '';
  const isExplicitTestDb = uri.includes('_test') || uri.includes('127.0.0.1') || uri.includes('localhost') || db.includes('_test');
  if (uri && !isExplicitTestDb) {
    console.error(`🚫 HARD SAFETY GUARD TRIGGERED: Test script blocked! MONGODB_URI points to non-test database ("${db || 'production'}"). Execution aborted to protect real production data.`);
    process.exit(1);
  }
})();

/**
 * Test Suite: Production-Grade Agentic RAG Legal AI Architecture
 * Tests 21 distinct edge cases, intent classification, anti-hallucination guardrails,
 * unoffered topic filtering, multi-turn memory, and statutory grounding.
 */

process.env.NODE_ENV = 'test';

const { processLegalAiQuery, analyzeUserIntentAndContext } = require('./server/services/legalAiService');
const { searchLessonsForQuery } = require('./server/services/transcriptService');
const { retrieveVerifiedSources } = require('./server/services/bdLawSourceService');

// Mock Academy Lessons for Testing
const mockLessons = [
  {
    id: "les_1",
    _id: "les_1",
    courseId: "course_cpc",
    chapter: "দেওয়ানী কার্যবিধি ১৯০৮ (CPC)",
    title: "CPC - Orientation Class & Basic Structure",
    module: "দেওয়ানী কার্যবিধি",
    youtubeUrl: "https://www.youtube.com/watch?v=mock1",
    classSerial: 1,
    hasSubtitles: true,
    transcriptStatus: "ready",
    transcript: "[00:00] আসসালামু আলাইকুম সবাইকে। [00:15] আমাদের বিজিএস ও বার কাউন্সিলের ওরিয়েন্টেশন ক্লাসে স্বাগতম। [00:30] আজ আমরা দেওয়ানী কার্যবিধির বেসিক স্ট্রাকচার নিয়ে কথা বলব।"
  },
  {
    id: "les_2",
    _id: "les_2",
    courseId: "course_cpc",
    chapter: "দেওয়ানী কার্যবিধি ১৯০৮ (CPC)",
    title: "CPC Section 9 - Jurisdiction of Civil Courts",
    module: "দেওয়ানী কার্যবিধি",
    youtubeUrl: "https://www.youtube.com/watch?v=mock2",
    classSerial: 2,
    hasSubtitles: true,
    transcriptStatus: "ready",
    transcript: "[00:00] দেওয়ানী আদালতের এখতিয়ার নিয়ে দেওয়ানী কার্যবিধির ৯ ধারা অত্যন্ত গুরুত্বপূর্ণ। [01:20] দেওয়ানী প্রকৃতির মোকদ্দমা শুনানির সাধারণ এখতিয়ার সম্পর্কে এখানে বিস্তারিত বলা হয়েছে।"
  },
  {
    id: "les_3",
    _id: "les_3",
    courseId: "course_const",
    chapter: "গণপ্রজাতন্ত্রী বাংলাদেশের সংবিধান",
    title: "সংবিধানের ৩য় ভাগ - মৌলিক অধিকার ও ২৭ অনুচ্ছেদ (সমতা)",
    module: "সংবিধান",
    youtubeUrl: "https://www.youtube.com/watch?v=mock3",
    classSerial: 3,
    hasSubtitles: true,
    transcriptStatus: "ready",
    transcript: "[00:00] সংবিধানের ২৭ অনুচ্ছেদ অনুযায়ী সকল নাগরিক আইনের দৃষ্টিতে সমান এবং আইনের সমান আশ্রয় লাভের অধিকারী। [00:45] আইনের দৃষ্টিতে সমতার মৌলিক অধিকার এখানে ব্যাখ্যা করা হয়েছে।"
  },
  {
    id: "les_4",
    _id: "les_4",
    courseId: "course_eng",
    chapter: "General English",
    title: "English for Law Students - Class 1",
    module: "ইংলিশ",
    youtubeUrl: "https://www.youtube.com/watch?v=mock4",
    classSerial: 4,
    hasSubtitles: true,
    transcriptStatus: "ready",
    transcript: "[00:00] Welcome everyone to our English class. [00:20] Today we will learn basic legal terminology in English."
  },
  {
    id: "les_5",
    _id: "les_5",
    courseId: "course_family",
    chapter: "Family Law & Practice",
    title: "Family Law Class 1 - Dower and Maintenance",
    module: "পারিবারিক আইন",
    youtubeUrl: "https://www.youtube.com/watch?v=mock5",
    classSerial: 5,
    hasSubtitles: true,
    transcriptStatus: "ready",
    transcript: "[00:00] পারিবারিক আদালত আইন ২০২৩ এবং মুসলিম পারিবারিক আইন অধ্যাদেশ ১৯৬১ অনুযায়ী দেনমোহর ও ভরণপোষণের অধিকার এবং মোকদ্দমা পরিচালনার নিয়ম।"
  }
];

async function runTestSuite() {
  console.log("======================================================================");
  console.log("   PRODUCTION-GRADE AGENTIC RAG LEGAL AI - AUTOMATED TEST SUITE       ");
  console.log("======================================================================\n");

  let passed = 0;
  let failed = 0;

  async function testCase(name, runner) {
    try {
      await runner();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name} -> Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Chit-chat: Greeting
  await testCase("Test 1: 'হ্যালো' -> Warm greeting, zero videos, zero statutes", async () => {
    const res = await processLegalAiQuery({ query: "হ্যালো", allLessons: mockLessons });
    if (!res.ok) throw new Error("Result not ok");
    if (res.intent !== 'CHAT_OR_GREETING') throw new Error(`Expected CHAT_OR_GREETING, got ${res.intent}`);
    if (res.matchedLessons.length !== 0) throw new Error(`Expected 0 matched lessons, got ${res.matchedLessons.length}`);
    if (res.verifiedSources.length !== 0) throw new Error(`Expected 0 verified sources, got ${res.verifiedSources.length}`);
    if (!res.answer.includes("আসসালামু আলাইকুম")) throw new Error("Expected greeting message");
  });

  // 2. Chit-chat: How are you
  await testCase("Test 2: 'কেমন আছেন আপনারা?' -> Warm greeting, zero videos", async () => {
    const res = await processLegalAiQuery({ query: "কেমন আছেন আপনারা?", allLessons: mockLessons });
    if (res.intent !== 'CHAT_OR_GREETING') throw new Error(`Expected CHAT_OR_GREETING, got ${res.intent}`);
    if (res.matchedLessons.length !== 0) throw new Error("Should not return lessons");
  });

  // 3. Chit-chat: Praise / Thanks
  await testCase("Test 3: 'ধন্যবাদ অনেক সাহায্য হলো' -> Courtesy reply, zero videos", async () => {
    const res = await processLegalAiQuery({ query: "ধন্যবাদ অনেক সাহায্য হলো", allLessons: mockLessons });
    if (res.intent !== 'CHAT_OR_GREETING') throw new Error(`Expected CHAT_OR_GREETING, got ${res.intent}`);
    if (res.matchedLessons.length !== 0) throw new Error("Should not return lessons");
  });

  // 4. Clarification Gatekeeper: Vague question
  await testCase("Test 4: 'আমার নামে মামলা হয়েছে কি করবো?' -> Asks 1-2 clarifying questions, zero videos", async () => {
    const res = await processLegalAiQuery({ query: "আমার নামে মামলা হয়েছে কি করবো?", allLessons: mockLessons });
    if (res.intent !== 'CLARIFICATION_NEEDED') throw new Error(`Expected CLARIFICATION_NEEDED, got ${res.intent}`);
    if (res.matchedLessons.length !== 0) throw new Error("Should not recommend videos for vague queries");
    if (!res.answer.includes("দেওয়ানী প্রকৃতির") || !res.answer.includes("ফৌজদারি প্রকৃতির")) {
      throw new Error("Answer must ask civil vs criminal clarification");
    }
  });

  // 5. Clarification Gatekeeper: Ambiguous legal problem
  await testCase("Test 5: 'একটা আইনি সমস্যায় পড়েছি' -> Asks clarifying questions, zero videos", async () => {
    const res = await processLegalAiQuery({ query: "একটা আইনি সমস্যায় পড়েছি", allLessons: mockLessons });
    if (res.intent !== 'CLARIFICATION_NEEDED') throw new Error(`Expected CLARIFICATION_NEEDED, got ${res.intent}`);
    if (res.matchedLessons.length !== 0) throw new Error("Should not return lessons");
  });

  // 6. Explicit Class Search: Orientation
  await testCase("Test 6: 'Orientation class' -> Metadata matches Orientation class video", async () => {
    const res = await processLegalAiQuery({ query: "Orientation class", allLessons: mockLessons });
    if (res.matchedLessons.length === 0) throw new Error("Expected at least 1 matched lesson");
    if (!res.matchedLessons[0].title.toLowerCase().includes("orientation")) {
      throw new Error(`Expected orientation class, got: ${res.matchedLessons[0].title}`);
    }
  });

  // 7. Explicit Class Search: CPC Section 9
  await testCase("Test 7: 'CPC Section 9 video' -> Matches CPC Sec 9 lesson", async () => {
    const res = await processLegalAiQuery({ query: "CPC Section 9 video", allLessons: mockLessons });
    if (res.matchedLessons.length === 0) throw new Error("Expected lesson match");
    if (!res.matchedLessons[0].title.includes("Section 9")) {
      throw new Error(`Expected CPC Section 9 lesson, got: ${res.matchedLessons[0].title}`);
    }
  });

  // 8. Explicit Class Search: Family Law
  await testCase("Test 8: 'Family Law Class 1' -> Matches Family Law lesson", async () => {
    const res = await processLegalAiQuery({ query: "Family Law Class 1", allLessons: mockLessons });
    if (res.matchedLessons.length === 0) throw new Error("Expected Family Law lesson");
    if (!res.matchedLessons[0].title.toLowerCase().includes("family law")) {
      throw new Error(`Expected Family Law, got ${res.matchedLessons[0].title}`);
    }
  });

  // 9. Unoffered Topic Gatekeeper: Dowry
  await testCase("Test 9: 'স্বামী যৌতুক দাবি করছে এবং মারধর করেছে' -> Dowry 2018 & Nari O Shishu 2000, ZERO irrelevant videos", async () => {
    const res = await processLegalAiQuery({ query: "স্বামী যৌতুক দাবি করছে এবং মারধর করেছে", allLessons: mockLessons });
    if (res.matchedLessons.length !== 0) {
      throw new Error(`CRITICAL: Irrelevant video returned for dowry: ${res.matchedLessons.map(l => l.title).join(', ')}`);
    }
    if (!res.answer.includes("যৌতুক নিরোধ আইন") && !res.answer.includes("নারী ও শিশু নির্যাতন দমন আইন")) {
      throw new Error("Answer must ground in Dowry / Nari O Shishu laws");
    }
    if (res.answer.includes("৫৪ ধারা") || res.answer.includes("২৯৯ ধারা")) {
      throw new Error("CRITICAL: Answer must NEVER mention CrPC 54 or murder 299 for dowry!");
    }
    if (!res.answer.includes("আইনি সতর্কবার্তা")) {
      throw new Error("Must include legal disclaimer");
    }
  });

  // 10. Dowry Statute Inquiry
  await testCase("Test 10: 'যৌতুকের জন্য মামলা করার নিয়ম কি' -> Dowry Prohibition Act 2018, ZERO videos", async () => {
    const res = await processLegalAiQuery({ query: "যৌতুকের জন্য মামলা করার নিয়ম কি", allLessons: mockLessons });
    if (res.matchedLessons.length !== 0) throw new Error("Must return zero videos for unoffered topic");
    if (!res.answer.includes("যৌতুক নিরোধ আইন")) throw new Error("Must mention Dowry Prohibition Act 2018");
  });

  // 11. CPC Section 9 Query (Statute + Academy HAS course)
  await testCase("Test 11: 'দেওয়ানী আদালতের এখতিয়ার এবং ৯ ধারা' -> Grounds in CPC Sec 9 and recommends CPC lesson", async () => {
    const res = await processLegalAiQuery({ query: "দেওয়ানী আদালতের এখতিয়ার এবং ৯ ধারা", allLessons: mockLessons });
    if (!res.answer.includes("দেওয়ানী কার্যবিধি") && !res.answer.includes("৯ ধারা")) {
      throw new Error("Must mention CPC Sec 9");
    }
    if (res.matchedLessons.length === 0) throw new Error("Should match CPC lesson since academy has it");
    if (!res.matchedLessons[0].title.includes("Section 9")) {
      throw new Error(`Expected Sec 9 lesson, got ${res.matchedLessons[0].title}`);
    }
  });

  // 12. Cheque Dishonour (NI Act 138)
  await testCase("Test 12: 'চেক ডিজঅনার হলে কি মামলা করতে হয়' -> NI Act 138, ZERO videos", async () => {
    const res = await processLegalAiQuery({ query: "চেক ডিজঅনার হলে কি মামলা করতে হয়", allLessons: mockLessons });
    if (res.matchedLessons.length !== 0) throw new Error("Cheque topic has no academy course; must return 0 videos");
    if (!res.answer.includes("হস্তান্তরযোগ্য দলিল আইন") && !res.answer.includes("১৩৮ ধারা")) {
      throw new Error("Must mention NI Act 1881 Sec 138");
    }
    if (!res.answer.includes("লিগ্যাল নোটিশ") && !res.answer.includes("৩০ দিন")) {
      throw new Error("Must mention 30 days legal notice step");
    }
  });

  // 13. Land Dispossession (SRA 9)
  await testCase("Test 13: 'জমি বেদখল হয়ে গেছে ৬ মাস আগে' -> Specific Relief Act Sec 9 with 6-month limitation", async () => {
    const res = await processLegalAiQuery({ query: "জমি বেদখল হয়ে গেছে ৬ মাস আগে কি করব", allLessons: mockLessons });
    if (!res.answer.includes("সুনির্দিষ্ট প্রতিকার আইন") || (!res.answer.includes("৯ ধারা") && !res.answer.includes("ধারা ৯"))) {
      throw new Error("Must mention SRA 1877 Sec 9");
    }
    if (!res.answer.includes("৬ মাস")) throw new Error("Must mention 6-month limitation");
  });

  // 14. Police Arrest / Remand (CrPC 167)
  await testCase("Test 14: 'পুলিশ গ্রেপ্তার করে রিমান্ড চেয়েছে' -> CrPC 167 & Article 33", async () => {
    const res = await processLegalAiQuery({ query: "পুলিশ গ্রেপ্তার করে রিমান্ড চেয়েছে", allLessons: mockLessons });
    if (!res.answer.includes("১৬৭") && !res.answer.includes("রিমান্ড") && !res.answer.includes("ফৌজদারি")) {
      throw new Error("Must mention remand / CrPC provisions");
    }
  });

  // 15. Guardrail: Out-of-bounds Section Detection
  await testCase("Test 15: 'দণ্ডবিধির ৯৯৯৯ ধারা কি' -> Guardrail catches invalid section (max 511)", async () => {
    const res = await processLegalAiQuery({ query: "দণ্ডবিধির ৯৯৯৯ ধারা কি", allLessons: mockLessons });
    if (!res.answer.includes("সতর্কবার্তা") || !res.answer.includes("৫১১")) {
      throw new Error(`Expected out-of-bounds guardrail, got: ${res.answer}`);
    }
  });

  // 16. Guardrail: Non-existent / Fake Law
  await testCase("Test 16: 'কাল্পনিক আজগুবি আইনের ১০০ ধারা' -> Guardrail disclosure", async () => {
    const res = await processLegalAiQuery({ query: "কাল্পনিক আজগুবি আইনের ১০০ ধারা", allLessons: mockLessons });
    if (res.verifiedSources.length !== 0) throw new Error("Should not find sources for fake law");
  });

  // 17. Multi-Turn Context Resolution
  await testCase("Test 17: Multi-turn: Turn 1 (মামলা হয়েছে) -> Turn 2 (টাকা ধার নিয়ে আত্মসাৎ করেছে বন্ধু)", async () => {
    const turn1Res = await processLegalAiQuery({ query: "আমার মামলা হয়েছে", allLessons: mockLessons });
    if (turn1Res.intent !== 'CLARIFICATION_NEEDED') throw new Error("Turn 1 should ask clarification");

    const history = [
      { role: "user", content: "আমার মামলা হয়েছে" },
      { role: "assistant", content: turn1Res.answer }
    ];

    const turn2Res = await processLegalAiQuery({
      query: "টাকা ধার নিয়ে আত্মসাৎ করেছে বন্ধু",
      conversationHistory: history,
      allLessons: mockLessons
    });

    if (!turn2Res.answer.includes("৪০৬") && !turn2Res.answer.includes("৪২০") && !turn2Res.answer.includes("আত্মসাৎ")) {
      throw new Error(`Multi-turn context failed to resolve to Penal Code 406/420. Got: ${turn2Res.answer}`);
    }
  });

  // 18. Banglish Query
  await testCase("Test 18: Banglish: 'amar taka niye ferot dicche na cheat korse' -> Penal Code 406/420", async () => {
    const res = await processLegalAiQuery({ query: "amar taka niye ferot dicche na cheat korse", allLessons: mockLessons });
    if (!res.answer.includes("৪০৬") && !res.answer.includes("৪২০") && !res.answer.includes("প্রতারণা")) {
      throw new Error(`Banglish failed to resolve to 406/420. Got: ${res.answer}`);
    }
  });

  // 19. Banglish Family Law
  await testCase("Test 19: Banglish: 'wife khurposh dower claim kore case korse' -> Family Court Act / MFLO", async () => {
    const res = await processLegalAiQuery({ query: "wife khurposh dower claim kore case korse", allLessons: mockLessons });
    if (!res.answer.includes("পারিবারিক") && !res.answer.includes("দেনমোহর") && !res.answer.includes("ভরণপোষণ")) {
      throw new Error(`Banglish family inquiry failed. Got: ${res.answer}`);
    }
  });

  // 20. Constitutional Equality: Article 27
  await testCase("Test 20: 'সংবিধানের ২৭ অনুচ্ছেদ অনুযায়ী সমতার অর্থ কি' -> Grounds in Article 27 + matches Constitution class", async () => {
    const res = await processLegalAiQuery({ query: "সংবিধানের ২৭ অনুচ্ছেদ অনুযায়ী সমতার অর্থ কি", allLessons: mockLessons });
    if (!res.answer.includes("সংবিধান") || !res.answer.includes("২৭")) {
      throw new Error("Must ground in Article 27");
    }
    if (res.matchedLessons.length === 0) throw new Error("Must match Constitution class");
    if (!res.matchedLessons[0].title.includes("২৭ অনুচ্ছেদ")) {
      throw new Error(`Expected Article 27 class, got: ${res.matchedLessons[0].title}`);
    }
  });

  // 21. Standard Legal Disclaimer Check
  await testCase("Test 21: Legal Advice responses MUST always include disclaimer", async () => {
    const res = await processLegalAiQuery({ query: "টাকা ফেরত পাচ্ছি না কি মামলা করব", allLessons: mockLessons });
    if (!res.answer.includes("আইনি সতর্কবার্তা (Legal Disclaimer)")) {
      throw new Error("Missing mandatory legal disclaimer");
    }
  });

  console.log("\n======================================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("======================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(e => {
  console.error("Fatal Test Suite Crash:", e);
  process.exit(1);
});
