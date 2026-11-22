const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

// Force safe test environment - prevent any production database connection
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';
process.env.JWT_SECRET = 'test-secret-incident-recovery-key-32chars!!';

test('Incident Recovery: backend initializes cleanly without ERR_REQUIRE_ESM', () => {
  // Test module requires
  assert.doesNotThrow(() => {
    require('./server/services/firebaseIdentity');
  }, 'firebaseIdentity must load without throwing ERR_REQUIRE_ESM');

  assert.doesNotThrow(() => {
    require('./server/services/googleAccountStore');
  }, 'googleAccountStore must load without throwing ERR_REQUIRE_ESM');

  assert.doesNotThrow(() => {
    require('./server/services/googleLogin');
  }, 'googleLogin must load without throwing ERR_REQUIRE_ESM');

  let app;
  assert.doesNotThrow(() => {
    app = require('./server/server');
  }, 'server/server.js must load and export app without crashing');

  assert.equal(typeof app, 'function', 'app must be an Express application function');
});

test('Incident Recovery: HTTP endpoints respond correctly without 500 crash', async (t) => {
  const app = require('./server/server');
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  function makeRequest(path, headers = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method: 'GET',
          headers
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: data
            });
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  }

  try {
    // 1. Health check returns valid JSON (never 500 FUNCTION_INVOCATION_FAILED)
    const health = await makeRequest('/api/health');
    assert.notEqual(health.statusCode, 500, 'Health endpoint must not crash with 500');
    const healthJson = JSON.parse(health.body);
    assert.equal(typeof healthJson, 'object');

    // 2. /api/auth/verify-session returns 401 when unauthenticated
    const verifySession = await makeRequest('/api/auth/verify-session');
    assert.equal(verifySession.statusCode, 401, 'verify-session must return 401 unauthorized');

    // 3. /api/admin/courses returns 401 unauthorized
    const adminCourses = await makeRequest('/api/admin/courses');
    assert.equal(adminCourses.statusCode, 401, 'admin courses must return 401 unauthorized');

    // 4. /api/admin/site-settings returns 401 unauthorized
    const adminSiteSettings = await makeRequest('/api/admin/site-settings');
    assert.equal(adminSiteSettings.statusCode, 401, 'admin site-settings must return 401 unauthorized');

    // 5. /api/admin/mentors returns 401 unauthorized
    const adminMentors = await makeRequest('/api/admin/mentors');
    assert.equal(adminMentors.statusCode, 401, 'admin mentors must return 401 unauthorized');

    // 6. Public endpoints respond gracefully (never 500 FUNCTION_INVOCATION_FAILED)
    const courses = await makeRequest('/api/courses');
    assert.notEqual(courses.statusCode, 500, 'courses must not return 500 crash');

    const siteSettings = await makeRequest('/api/site-settings');
    assert.notEqual(siteSettings.statusCode, 500, 'site-settings must not return 500 crash');

    const mentors = await makeRequest('/api/mentors');
    assert.notEqual(mentors.statusCode, 500, 'mentors must not return 500 crash');

    const homeData = await makeRequest('/api/home-data');
    assert.notEqual(homeData.statusCode, 500, 'home-data must not return 500 crash');

  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
