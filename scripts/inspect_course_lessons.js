// ============================================================================
// HARD PRODUCTION SAFETY GUARD: Blocks script execution against production DB
// ============================================================================
(() => {
  try { require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') }); } catch (e) {}
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  const db = process.env.MONGODB_DB || '';
  const isExplicitTestDb = uri.includes('_test') || uri.includes('127.0.0.1') || uri.includes('localhost') || db.includes('_test');
  if (uri && !isExplicitTestDb) {
    console.error(`🚫 HARD SAFETY GUARD TRIGGERED: Script blocked! MONGODB_URI points to non-test database ("${db || 'production'}"). Execution aborted to protect real production data.`);
    process.exit(1);
  }
})();

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'bjs_academy' });
  const Lesson = mongoose.model('Lesson', new mongoose.Schema({}, { strict: false }));
  const Course = mongoose.model('Course', new mongoose.Schema({}, { strict: false }));
  
  const courses = await Course.find({}, { id: 1, title: 1, shortTitle: 1 });
  console.log('--- COURSES in bjs_academy --- (' + courses.length + ')');
  courses.forEach(c => console.log('id:', c.id, '| title:', c.title, '| _id:', c._id));

  const lessonsGroup = await Lesson.aggregate([
    { $group: { _id: '$courseId', count: { $sum: 1 } } }
  ]);
  console.log('--- LESSONS GROUPED BY COURSE ID in bjs_academy ---');
  console.log(JSON.stringify(lessonsGroup, null, 2));

  await mongoose.disconnect();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
