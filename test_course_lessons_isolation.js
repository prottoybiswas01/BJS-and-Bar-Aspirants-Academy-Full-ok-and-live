const assert = require('assert');

// Test course lesson filtering and isolation logic
function filterLessonsForCourse(allLessons, courseId, resolvedC) {
  const targetIds = [String(courseId).trim().toLowerCase()];
  if (resolvedC) {
    if (resolvedC.id) targetIds.push(String(resolvedC.id).toLowerCase().trim());
    if (resolvedC._id) targetIds.push(String(resolvedC._id).toLowerCase().trim());
    if (resolvedC.title) targetIds.push(String(resolvedC.title).toLowerCase().trim());
    if (resolvedC.shortTitle) targetIds.push(String(resolvedC.shortTitle).toLowerCase().trim());
    if (Array.isArray(resolvedC.legacyIds)) resolvedC.legacyIds.forEach(id => targetIds.push(String(id).toLowerCase().trim()));
  }

  const targetSet = new Set(targetIds.filter(Boolean));

  return (allLessons || []).filter(l => {
    if (!l) return false;
    const lCId = String(l.courseId || '').toLowerCase().trim();
    return targetSet.has(lCId);
  });
}

console.log('--- STARTING LESSON ISOLATION TESTS ---');

// Mock data representing database with 89 lessons across different courses
const mockLessons = [
  { id: 'l1', courseId: 'Civil laws', title: 'CPC Class 1', module: 'CPC 1908' },
  { id: 'l2', courseId: 'Civil laws', title: 'CPC Class 2', module: 'CPC 1908' },
  { id: 'l3', courseId: 'Civil laws', title: 'CPC Class 3', module: 'CPC 1908' },
  { id: 'l4', courseId: 'Family Law', title: 'Family Law 1st', module: 'Family Laws' },
  { id: 'l5', courseId: 'Family Law', title: 'Family Law 2nd', module: 'Family Laws' },
  { id: 'l6', courseId: 'english', title: 'English 1', module: 'English Class' },
  { id: 'l7', courseId: 'Constitution', title: 'Constitution 1', module: 'সংবিধান' }
];

// Test 1: New course with 0 lessons
const newCourse = { id: 'test Course Launch', title: 'Launch', shortTitle: 'test Course Launch' };
const newCourseLessons = filterLessonsForCourse(mockLessons, newCourse.id, newCourse);
console.log('New course lessons count:', newCourseLessons.length);
assert.strictEqual(newCourseLessons.length, 0, 'New course MUST have 0 lessons, not leak other courses!');
console.log('✓ Test 1 Passed: New course strictly receives 0 lessons (no leak).');

// Test 2: Existing course 'Civil laws'
const cpcCourse = { id: 'Civil laws', title: 'General clauses act 1887', shortTitle: 'CPC' };
const cpcLessons = filterLessonsForCourse(mockLessons, cpcCourse.id, cpcCourse);
console.log('Civil laws lessons count:', cpcLessons.length);
assert.strictEqual(cpcLessons.length, 3, 'Civil laws should return exactly 3 lessons');
assert(cpcLessons.every(l => l.courseId === 'Civil laws'), 'All lessons must belong to Civil laws');
console.log('✓ Test 2 Passed: Existing course receives only its own lessons.');

// Test 3: Existing course 'Family Law'
const flCourse = { id: 'Family Law', title: 'Family Law', shortTitle: 'Family Law & Practice' };
const flLessons = filterLessonsForCourse(mockLessons, flCourse.id, flCourse);
console.log('Family Law lessons count:', flLessons.length);
assert.strictEqual(flLessons.length, 2, 'Family Law should return exactly 2 lessons from mock');
assert(flLessons.every(l => l.courseId === 'Family Law'), 'All lessons must belong to Family Law');
console.log('✓ Test 3 Passed: Family Law receives only its own lessons.');

console.log('--- ALL LESSON ISOLATION TESTS PASSED ---');
