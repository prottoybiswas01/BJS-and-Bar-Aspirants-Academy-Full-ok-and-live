const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const mongoose = require('mongoose');
const Lesson = require('../server/models/Lesson');
const { processLegalAiQuery, analyzeUserIntentAndContext } = require('../server/services/legalAiService');

async function testAll() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'bjs_academy' });
  const allLessons = await Lesson.find().lean();
  console.log(`Loaded ${allLessons.length} lessons from MongoDB.\n`);

  const testQueries = [
    {
      title: 'Test 1: Greeting & Chit-chat',
      q: 'হাই কেমন আছেন?'
    },
    {
      title: 'Test 2: Banglish Real-life Problem (Neighbor land dispute)',
      q: 'bhai amar neighbor jomi dokhol korche ki korbo'
    },
    {
      title: 'Test 3: Broken Bengali Personal Problem (Money fraud / debt)',
      q: 'আমার এক আত্মীয় ৫ লাখ টাকা নিয়া এখন ফেরত দেয় না কি মামলা করব'
    },
    {
      title: 'Test 4: Video / Class Search (Family Law)',
      q: 'Family Law er class 1 ta kothay pabo'
    },
    {
      title: 'Test 5: Statutory Section Inquiry (Penal Code 300 exceptions)',
      q: 'দণ্ডবিধির ৩০০ ধারার ব্যতিক্রমগুলো কি?'
    },
    {
      title: 'Test 6: Unverified / Fictional Statute Safe Disclosure',
      q: 'কাল্পনিক আজগুবি আইনের ৯৯৯৯ ধারা সম্পর্কে বলুন'
    }
  ];

  for (const t of testQueries) {
    console.log(`========================================================`);
    console.log(`🔍 ${t.title}`);
    console.log(`User Input: "${t.q}"`);
    const intent = analyzeUserIntentAndContext(t.q);
    console.log(`Detected Intent: ${intent.primaryIntent}`);

    const res = await processLegalAiQuery({
      query: t.q,
      studentName: 'করিম আহমেদ',
      allLessons
    });

    console.log(`OK: ${res.ok} | Provider: ${res.provider} | Verified Sources: ${res.verifiedSources?.length || 0} | Matched Lessons: ${res.matchedLessons?.length || 0}`);
    console.log(`--- RESPONSE ---`);
    console.log(res.answer);
    console.log(`--------------------------------------------------------\n`);
  }

  await mongoose.disconnect();
}

testAll().catch(err => {
  console.error(err);
  process.exit(1);
});
