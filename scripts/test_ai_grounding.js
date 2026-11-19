const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const mongoose = require('mongoose');
const Lesson = require('../server/models/Lesson');
const { processLegalAiQuery } = require('../server/services/legalAiService');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'bjs_academy' });
  const allLessons = await Lesson.find().lean();
  console.log(`Loaded ${allLessons.length} lessons from MongoDB.`);

  const testQuery = 'দণ্ডবিধি অনুযায়ী খুন বা নরহত্যার শাস্তি কী?';
  console.log(`\nQuery: "${testQuery}"`);
  console.log('Calling processLegalAiQuery...');

  const result = await processLegalAiQuery({
    query: testQuery,
    studentName: 'টেস্ট শিক্ষার্থী',
    allLessons
  });

  console.log('\n=== RESULT ===');
  console.log('OK:', result.ok);
  console.log('Provider:', result.provider);
  console.log('Is AI Generated:', result.isAiGenerated);
  console.log('Matched Lessons count:', result.matchedLessons ? result.matchedLessons.length : 0);
  if (result.matchedLessons && result.matchedLessons.length > 0) {
    result.matchedLessons.forEach((l, i) => {
      console.log(`  Match ${i + 1}: "${l.title}" | TS: ${l.timestamp} | Snippet: ${l.snippet}`);
    });
  }
  console.log('\n--- AI ANSWER ---');
  console.log(result.answer);
  console.log('-----------------');

  await mongoose.disconnect();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
