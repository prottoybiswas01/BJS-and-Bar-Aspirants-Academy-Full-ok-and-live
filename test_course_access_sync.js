const assert = require('assert');

// Mock memoryDb and helper structures to simulate server logic exactly
const mockCourses = [
  { id: 'cpc', title: 'General clauses act 1887', shortTitle: 'CPC', batchRegText: 'Fast time', status: 'Active' },
  { id: 'english', title: 'English', shortTitle: 'English', batchRegText: 'English Class', status: 'Active' },
  { id: 'family-law', title: 'Family Law', shortTitle: 'Family Law', status: 'Active' }
];

// Load server functions or test logic directly
console.log('--- STARTING COURSE ACCESS SYNC & GHOST COURSE ELIMINATION TESTS ---');

// Test 1: syncStudentCourseData behavior
function testSyncStudentCourseData() {
  const memoryDb = { courses: mockCourses };

  function matchCourse(rawBatch) {
    if (!rawBatch) return null;
    const bStr = String(rawBatch).trim().toLowerCase();
    return mockCourses.find(c => {
      const cId = String(c.id || '').trim().toLowerCase();
      const cTitle = String(c.title || '').trim().toLowerCase();
      const cShort = String(c.shortTitle || '').trim().toLowerCase();
      const cBatch = String(c.batchRegText || '').trim().toLowerCase();
      return cId === bStr || cTitle === bStr || cShort === bStr || cBatch === bStr ||
        (cTitle && cTitle.includes(bStr)) || (bStr && bStr.includes(cShort));
    });
  }

  function syncStudentCourseData(student, explicitAllowedIds = null) {
    if (!student) return;

    let targetAllowed = null;
    if (Array.isArray(explicitAllowedIds)) {
      targetAllowed = Array.from(new Set(
        explicitAllowedIds
          .map(id => String(id || '').trim())
          .filter(id => id && !id.includes('---'))
      ));
    } else if (Array.isArray(student.allowedCourseIds) && student.allowedCourseIds.length > 0) {
      targetAllowed = Array.from(new Set(
        student.allowedCourseIds
          .map(id => String(id || '').trim())
          .filter(id => id && !id.includes('---'))
      ));
    }

    if (targetAllowed !== null) {
      const allCourses = memoryDb.courses || [];
      targetAllowed = targetAllowed.map(id => {
        const match = allCourses.find(c => 
          String(c.id).toLowerCase() === String(id).toLowerCase() ||
          String(c.title).toLowerCase() === String(id).toLowerCase() ||
          String(c.shortTitle).toLowerCase() === String(id).toLowerCase()
        );
        return match ? match.id : id;
      });
      targetAllowed = Array.from(new Set(targetAllowed.filter(Boolean)));

      student.allowedCourseIds = targetAllowed;
      student.enrolledCourseIds = [...targetAllowed];
      student.course = targetAllowed[0] || '';

      if (targetAllowed.length > 0 && allCourses.length > 0) {
        const assignedCourseObj = allCourses.find(c => targetAllowed.includes(c.id));
        if (assignedCourseObj) {
          const curBatchClean = String(student.batch || '').trim().toLowerCase();
          const oldMatchedC = allCourses.find(c => {
            const cId = String(c.id || '').trim().toLowerCase();
            const cTitle = String(c.title || '').trim().toLowerCase();
            const cShort = String(c.shortTitle || '').trim().toLowerCase();
            return cId === curBatchClean || cTitle === curBatchClean || cShort === curBatchClean;
          });
          if (oldMatchedC && !targetAllowed.includes(oldMatchedC.id)) {
            student.batch = assignedCourseObj.title || assignedCourseObj.shortTitle || student.batch;
          }
        }
      }

      const existingRules = Array.isArray(student.courseRules) ? student.courseRules : [];
      const updatedRules = [];

      existingRules.forEach(r => {
        if (!r || !r.courseId) return;
        const rId = String(r.courseId).trim();
        const isRetained = targetAllowed.some(cId => 
          cId.toLowerCase() === rId.toLowerCase() ||
          cId.toLowerCase().replace(/[-_]/g, ' ') === rId.toLowerCase().replace(/[-_]/g, ' ')
        );
        if (isRetained) {
          updatedRules.push({ ...r, enrollmentStatus: 'Active' });
        }
      });

      targetAllowed.forEach(cId => {
        const hasRule = updatedRules.some(r => r.courseId.toLowerCase() === cId.toLowerCase());
        if (!hasRule) {
          updatedRules.push({ courseId: cId, enrollmentStatus: 'Active' });
        }
      });

      student.courseRules = updatedRules;
      student.accessVersion = Date.now();
    }
  }

  // Simulated student initially registered for CPC (General clauses act 1887)
  const student = {
    id: 'STU-1795039039403-985',
    name: 'test User',
    phone: '01792167016',
    batch: 'General clauses act 1887',
    allowedCourseIds: ['cpc'],
    enrolledCourseIds: ['cpc'],
    courseRules: [
      { courseId: 'cpc', enrollmentStatus: 'Active' }
    ]
  };

  console.log('1. Initial state:', { batch: student.batch, allowed: student.allowedCourseIds, enrolled: student.enrolledCourseIds });
  assert.strictEqual(student.allowedCourseIds.includes('cpc'), true);

  // Admin changes access to ONLY English
  syncStudentCourseData(student, ['english']);

  console.log('2. After changing access to English:', {
    batch: student.batch,
    allowed: student.allowedCourseIds,
    enrolled: student.enrolledCourseIds,
    rules: student.courseRules
  });

  assert.deepStrictEqual(student.allowedCourseIds, ['english'], 'allowedCourseIds must strictly contain only english');
  assert.deepStrictEqual(student.enrolledCourseIds, ['english'], 'enrolledCourseIds must strictly contain only english');
  assert.strictEqual(student.batch, 'English', 'student.batch must update to English');
  assert.strictEqual(student.courseRules.some(r => r.courseId === 'cpc'), false, 'Old CPC rule must be completely purged');
  assert.strictEqual(student.courseRules.some(r => r.courseId === 'english'), true, 'English rule must exist');
  console.log('✓ Test 1 Passed: syncStudentCourseData purges old course and updates batch properly.');

  // Test 2: GET /api/admin/students mapping simulation
  let allowed = [...student.allowedCourseIds];
  let enrolled = [...student.enrolledCourseIds];

  const matchedC = matchCourse(student.batch);
  if (allowed.length > 0) {
    enrolled = [...allowed];
    if (matchedC && !allowed.includes(matchedC.id)) {
      const assignedC = mockCourses.find(c => allowed.includes(c.id));
      if (assignedC) student.batch = assignedC.title || assignedC.shortTitle || student.batch;
    }
  }

  assert.deepStrictEqual(enrolled, ['english'], 'GET /api/admin/students must never re-add CPC to enrolled');
  assert.deepStrictEqual(allowed, ['english'], 'GET /api/admin/students must keep allowed as english');
  console.log('✓ Test 2 Passed: GET /api/admin/students never re-injects ghost course into enrolledCourseIds.');

  // Test 3: AdminPanel distinctAllowed calculation
  const rawAllowed = (Array.isArray(student?.allowedCourseIds) && student.allowedCourseIds.length > 0)
    ? student.allowedCourseIds
    : (Array.isArray(student?.enrolledCourseIds) && student.enrolledCourseIds.length > 0)
      ? student.enrolledCourseIds
      : (student?.course ? [student.course] : []);

  const distinctAllowed = Array.from(new Set(rawAllowed));
  assert.deepStrictEqual(distinctAllowed, ['english'], 'distinctAllowed must be exactly [english]');
  console.log('✓ Test 3 Passed: AdminPanel rawAllowed resolution produces exactly 1 active course.');
}

testSyncStudentCourseData();
console.log('--- ALL COURSE ACCESS TESTS COMPLETED SUCCESSFULLY ---');
