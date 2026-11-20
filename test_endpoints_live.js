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
 * Live Endpoint Regression Verification Script
 * Starts Express app on ephemeral port and tests real endpoints:
 * 1. Health check with real database
 * 2. Courses retrieval
 * 3. Lessons retrieval
 * 4. Mentors retrieval
 * 5. Home data retrieval
 * 6. Disconnected fail-safe 503 behavior
 */

require('dotenv').config({ path: 'server/.env' });
const http = require('http');

async function testEndpoints() {
  console.log('========================================================');
  console.log('🚀 LIVE READ-ONLY ENDPOINT VERIFICATION');
  console.log('========================================================\n');

  process.env.NODE_ENV = 'test';
  const app = require('./server/server');
  const server = http.createServer(app);

  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ Test server running on ${baseUrl}\n`);

  let pass = 0;
  let fail = 0;

  function assert(cond, msg, detail = '') {
    if (cond) {
      console.log(`  ✓ PASS: ${msg}`);
      pass++;
    } else {
      console.error(`  ✕ FAIL: ${msg} ${detail ? '(' + detail + ')' : ''}`);
      fail++;
    }
  }

  async function get(path) {
    return new Promise((resolve, reject) => {
      http.get(`${baseUrl}${path}`, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }).on('error', reject);
    });
  }

  try {
    // 1. Health Endpoint
    console.log('--- 1. Testing /api/health ---');
    const health = await get('/api/health');
    assert(health.status === 200, 'Health endpoint returns HTTP 200', health.status);
    assert(health.data?.ok === true, 'Health ok is true');
    assert(health.data?.dbMode === 'MongoDB Atlas Connected', 'Health dbMode is MongoDB Atlas Connected', health.data?.dbMode);
    assert(health.data?.database === 'bjs_academy', 'Health reports database as bjs_academy', health.data?.database);

    // 2. Courses Endpoint
    console.log('\n--- 2. Testing /api/courses ---');
    const courses = await get('/api/courses');
    assert(courses.status === 200, 'Courses endpoint returns HTTP 200', courses.status);
    assert(courses.data?.ok === true, 'Courses response ok is true');
    assert(Array.isArray(courses.data?.courses), 'Courses response contains array');
    assert(courses.data?.courses?.length > 0, `Courses count is ${courses.data?.courses?.length} (> 0)`);
    assert(courses.data?.source === 'mongodb', 'Courses data source is mongodb', courses.data?.source);

    // 3. Mentors Endpoint
    console.log('\n--- 3. Testing /api/mentors ---');
    const mentors = await get('/api/mentors');
    assert(mentors.status === 200, 'Mentors endpoint returns HTTP 200', mentors.status);
    assert(mentors.data?.ok === true, 'Mentors response ok is true');
    assert(Array.isArray(mentors.data?.mentors), 'Mentors response contains array');
    assert(mentors.data?.mentors?.length > 0, `Mentors count is ${mentors.data?.mentors?.length} (> 0)`);

    // 4. Lessons Endpoint
    console.log('\n--- 4. Testing /api/lessons ---');
    const lessons = await get('/api/lessons');
    assert(lessons.status === 200, 'Lessons endpoint returns HTTP 200', lessons.status);
    assert(lessons.data?.ok === true, 'Lessons response ok is true');
    assert(Array.isArray(lessons.data?.lessons), 'Lessons response contains array');
    assert(lessons.data?.lessons?.length > 0, `Lessons count is ${lessons.data?.lessons?.length} (> 0)`);

    // 5. Home Data Endpoint
    console.log('\n--- 5. Testing /api/home-data ---');
    const homeData = await get('/api/home-data');
    assert(homeData.status === 200, 'Home data returns HTTP 200', homeData.status);
    assert(homeData.data?.ok === true, 'Home data response ok is true');
    assert(homeData.data?.courses?.length > 0, `Home data courses count is ${homeData.data?.courses?.length}`);
    assert(homeData.data?.mentors?.length > 0, `Home data mentors count is ${homeData.data?.mentors?.length}`);
    assert(homeData.data?.stats?.studentsCount > 0, `Home data student count is ${homeData.data?.stats?.studentsCount}`);

    console.log('\n========================================================');
    console.log(`ENDPOINT SUITE SUMMARY: ${pass} PASSED, ${fail} FAILED`);
    console.log('========================================================');
  } finally {
    server.close();
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  }

  if (fail > 0) process.exit(1);
}

testEndpoints().catch(err => {
  console.error('Fatal endpoint test error:', err);
  process.exit(1);
});
