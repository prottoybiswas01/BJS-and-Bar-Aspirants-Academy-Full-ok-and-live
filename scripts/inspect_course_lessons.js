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
