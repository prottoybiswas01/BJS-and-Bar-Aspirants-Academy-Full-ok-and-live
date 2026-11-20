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
 * BJS & Bar Aspirants Academy - Universal Modal, Navbar & Toast System Test Suite
 * Validates scroll locking reference counting, z-index hierarchy, portal placement,
 * and toast notification infrastructure.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✕ FAIL: ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('========================================================');
console.log('🚀 RUNNING MODAL, NAVBAR & TOAST SYSTEM TEST SUITE');
console.log('========================================================\n');

// --- 1. SCROLL LOCK UNIT TESTS ---
console.log('--- Suite 1: Reference-Counted Scroll Lock (scrollLock.js) ---');

// Mock browser document.body and window for node runtime
global.document = {
  body: {
    style: {
      overflow: '',
      paddingRight: ''
    }
  },
  documentElement: {
    clientWidth: 1024
  }
};
global.window = {
  innerWidth: 1040
};

// Evaluate scrollLock.js logic
let lockBodyScroll, unlockBodyScroll, forceUnlockAllScroll, getLockCount;
try {
  const scrollLockCode = fs.readFileSync(path.join(__dirname, 'client/src/components/ui/scrollLock.js'), 'utf8');
  // Strip export keywords for node VM evaluation
  const cjsCode = scrollLockCode
    .replace(/export function/g, 'function')
    .replace(/export default/g, '') +
    '\nmodule.exports = { lockBodyScroll, unlockBodyScroll, forceUnlockAllScroll, getLockCount: () => lockCount };';
  
  const m = { exports: {} };
  const fn = new Function('module', 'exports', 'document', 'window', cjsCode);
  fn(m, m.exports, global.document, global.window);
  lockBodyScroll = m.exports.lockBodyScroll;
  unlockBodyScroll = m.exports.unlockBodyScroll;
  forceUnlockAllScroll = m.exports.forceUnlockAllScroll;
  getLockCount = m.exports.getLockCount;
} catch (e) {
  console.error('Failed to load scrollLock.js:', e);
}

runTest('Single lock locks body overflow', () => {
  forceUnlockAllScroll();
  lockBodyScroll();
  assert.strictEqual(global.document.body.style.overflow, 'hidden');
  assert.strictEqual(getLockCount(), 1);
});

runTest('Single unlock releases body overflow', () => {
  unlockBodyScroll();
  assert.strictEqual(global.document.body.style.overflow, '');
  assert.strictEqual(getLockCount(), 0);
});

runTest('Nested locks (2 layers) keep overflow locked after first unlock', () => {
  forceUnlockAllScroll();
  lockBodyScroll(); // Level 1 (e.g. LessonManagerModal)
  lockBodyScroll(); // Level 2 (e.g. SubtitleModal)
  assert.strictEqual(getLockCount(), 2);
  assert.strictEqual(global.document.body.style.overflow, 'hidden');

  unlockBodyScroll(); // Close SubtitleModal
  assert.strictEqual(getLockCount(), 1);
  assert.strictEqual(global.document.body.style.overflow, 'hidden', 'Body must remain locked when child modal closes');

  unlockBodyScroll(); // Close LessonManagerModal
  assert.strictEqual(getLockCount(), 0);
  assert.strictEqual(global.document.body.style.overflow, '', 'Body must unlock when all modals are closed');
});

runTest('forceUnlockAllScroll instantly clears all locks', () => {
  lockBodyScroll();
  lockBodyScroll();
  lockBodyScroll();
  assert.strictEqual(getLockCount(), 3);
  forceUnlockAllScroll();
  assert.strictEqual(getLockCount(), 0);
  assert.strictEqual(global.document.body.style.overflow, '');
});

// --- 2. Z-INDEX & STACKING HIERARCHY TESTS ---
console.log('\n--- Suite 2: Stacking Context & Z-Index Hierarchy ---');

const navbarCode = fs.readFileSync(path.join(__dirname, 'client/src/components/Navbar.jsx'), 'utf8');
const modalCode = fs.readFileSync(path.join(__dirname, 'client/src/components/ui/Modal.jsx'), 'utf8');
const toastCode = fs.readFileSync(path.join(__dirname, 'client/src/context/ToastContext.jsx'), 'utf8');

runTest('Navbar is sticky with z-40', () => {
  assert(navbarCode.includes('z-40'), 'Navbar must be z-40');
  assert(navbarCode.includes('sticky top-0'), 'Navbar must be sticky top-0');
});

runTest('Modal component default z-index is z-[9990] (higher than Navbar)', () => {
  assert(modalCode.includes('z-[9990]'), 'Modal default zIndex must be z-[9990]');
});

runTest('Toast notification default z-index is z-[99999] (highest layer)', () => {
  assert(toastCode.includes('z-[99999]'), 'Toast container must be z-[99999]');
});

runTest('Modal component renders through createPortal(..., document.body)', () => {
  assert(modalCode.includes('createPortal('), 'Modal must use createPortal');
  assert(modalCode.includes('document.body'), 'Modal must target document.body');
});

runTest('Toast component renders through createPortal(..., document.body)', () => {
  assert(toastCode.includes('createPortal('), 'ToastContext must use createPortal');
  assert(toastCode.includes('document.body'), 'ToastContext must target document.body');
});

// --- 3. AUDIT OF ALL APPLICATION MODALS & OVERLAYS ---
console.log('\n--- Suite 3: Global Modal Audit Across All Pages ---');

const appCode = fs.readFileSync(path.join(__dirname, 'client/src/App.jsx'), 'utf8');
const adminPanelCode = fs.readFileSync(path.join(__dirname, 'client/src/pages/AdminPanel.jsx'), 'utf8');
const dashboardCode = fs.readFileSync(path.join(__dirname, 'client/src/pages/Dashboard.jsx'), 'utf8');
const mentorDashboardCode = fs.readFileSync(path.join(__dirname, 'client/src/pages/MentorDashboard.jsx'), 'utf8');
const homeCode = fs.readFileSync(path.join(__dirname, 'client/src/pages/Home.jsx'), 'utf8');
const lessonManagerCode = fs.readFileSync(path.join(__dirname, 'client/src/components/LessonManagerModal.jsx'), 'utf8');
const videoPlayerCode = fs.readFileSync(path.join(__dirname, 'client/src/components/VideoPlayerModal.jsx'), 'utf8');
const profileCode = fs.readFileSync(path.join(__dirname, 'client/src/components/ProfileModal.jsx'), 'utf8');
const mentorProfileCode = fs.readFileSync(path.join(__dirname, 'client/src/components/MentorProfileModal.jsx'), 'utf8');
const aiChatCode = fs.readFileSync(path.join(__dirname, 'client/src/components/AiChatDrawer.jsx'), 'utf8');
const tempPassCode = fs.readFileSync(path.join(__dirname, 'client/src/components/ForceTempPasswordModal.jsx'), 'utf8');
const googleProfileCode = fs.readFileSync(path.join(__dirname, 'client/src/components/GoogleCompleteProfileModal.jsx'), 'utf8');

runTest('App.jsx provides ToastProvider to the component tree', () => {
  assert(appCode.includes('<ToastProvider>'), 'App.jsx must wrap application in ToastProvider');
});

runTest('AdminPanel.jsx imports and uses universal Modal', () => {
  assert(adminPanelCode.includes("import Modal from '../components/ui/Modal';"), 'AdminPanel must import Modal');
  assert(adminPanelCode.includes('<Modal'), 'AdminPanel must use Modal for popups');
  assert(!adminPanelCode.includes('className="fixed inset-0 z-50'), 'AdminPanel must not have trapped z-50 fixed modals');
});

runTest('AdminPanel.jsx automatically closes all open modals on tab change', () => {
  assert(adminPanelCode.includes('useEffect(() => {'), 'AdminPanel must have tab change effect');
  assert(adminPanelCode.includes('setReceiptPreviewModal({ isOpen: false, receipt: null })'), 'Tab switch must close receipt preview');
  assert(adminPanelCode.includes('setStudentPaymentProfileModal({ isOpen: false, student: null })'), 'Tab switch must close student payment modal');
});

runTest('Dashboard.jsx review modal uses universal Modal and closes on tab change', () => {
  assert(dashboardCode.includes("import Modal from '../components/ui/Modal';"), 'Dashboard must import Modal');
  assert(dashboardCode.includes('<Modal'), 'Dashboard must use Modal');
  assert(dashboardCode.includes('setReviewModal({ isOpen: false,'), 'Dashboard tab change must close review modal');
});

runTest('MentorDashboard.jsx grading modal and full-screen inspector are portaled', () => {
  assert(mentorDashboardCode.includes("import Modal from '../components/ui/Modal';"), 'MentorDashboard must import Modal');
  assert(mentorDashboardCode.includes('<Modal'), 'MentorDashboard must use Modal for grading');
  assert(mentorDashboardCode.includes('createPortal('), 'MentorDashboard must portal isFullScreenModal');
});

runTest('Home.jsx modals (enroll, mentors, course details) use universal Modal', () => {
  assert(homeCode.includes("import Modal from '../components/ui/Modal';"), 'Home must import Modal');
  assert(homeCode.includes('<Modal'), 'Home must use Modal');
});

runTest('Stand-alone overlay components are portaled to document.body', () => {
  assert(lessonManagerCode.includes('createPortal('), 'LessonManagerModal must use createPortal');
  assert(videoPlayerCode.includes('createPortal('), 'VideoPlayerModal must use createPortal');
  assert(profileCode.includes('createPortal('), 'ProfileModal must use createPortal');
  assert(mentorProfileCode.includes('createPortal('), 'MentorProfileModal must use createPortal');
  assert(aiChatCode.includes('createPortal('), 'AiChatDrawer must use createPortal');
  assert(tempPassCode.includes('createPortal('), 'ForceTempPasswordModal must use createPortal');
  assert(googleProfileCode.includes('createPortal('), 'GoogleCompleteProfileModal must use createPortal');
});

// --- 4. DATE AND TIME FORMATTING INTEGRITY ---
console.log('\n--- Suite 4: Date & Time Clean Formatting ---');

const { formatBangladeshTime: serverFormatTime } = require('./server/utils/dateUtils');

runTest('Backend formatBangladeshTime produces clean English string without Bangladesh Time suffix', () => {
  const result = serverFormatTime(new Date('2026-11-19T07:45:00Z'));
  assert(typeof result === 'string' && result.length > 5, 'Must return formatted string');
  assert(!result.includes('বাংলাদেশ'), 'Result must not contain Bengali text');
  assert(!result.includes('সময়'), 'Result must not contain Bengali time word');
  assert(/AM|PM/i.test(result), 'Result must contain AM/PM in English');
});

runTest('Receipt PDF generator uses clean English formatBangladeshTime', () => {
  const pdfServiceCode = fs.readFileSync(path.join(__dirname, 'server/services/receiptPdfService.js'), 'utf8');
  assert(pdfServiceCode.includes('formatBangladeshTime('), 'Must format with formatBangladeshTime');
  assert(!pdfServiceCode.includes("'bn-BD'"), 'Must not force bn-BD locale');
});

console.log('\n========================================================');
console.log(`SUMMARY: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
console.log('========================================================');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}
