/**
 * Test Suite: Telegram Remote Auto-Fix & Cloud Coder Engine Verification
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server/.env') });

const { handleTelegramWebhook } = require('./server/services/telegramBotService');

async function runTests() {
  console.log('========================================================');
  console.log('🚀 TESTING TELEGRAM REMOTE AUTO-FIX & CLOUD CODER SUITE');
  console.log('========================================================\n');

  // Test 1: Reject Unauthorized Chat ID
  console.log('--- Test 1: Strict Unauthorized Access Protection ---');
  let blockedResult = null;
  const mockReqUnauthorized = {
    body: {
      message: {
        from: { id: 999999999 }, // Unauthorized attacker ID
        chat: { id: 999999999 },
        text: '/fix delete database',
        message_id: 101
      }
    }
  };
  const mockResUnauthorized = {
    status: (code) => ({
      json: (data) => {
        blockedResult = { code, data };
        return blockedResult;
      }
    })
  };

  await handleTelegramWebhook(mockReqUnauthorized, mockResUnauthorized);
  assert.strictEqual(blockedResult.code, 200, 'Should return HTTP 200 to satisfy Telegram webhook');
  assert.strictEqual(blockedResult.data.blocked, true, 'Must block unauthorized chat ID');
  console.log('  ✓ PASS: Malicious or unauthorized chat IDs are strictly blocked\n');

  // Test 2: Help command from authorized chat ID
  console.log('--- Test 2: Authorized Chat ID Command Reception ---');
  let helpResult = null;
  const mockReqAuthorized = {
    body: {
      message: {
        from: { id: 7630488220 },
        chat: { id: 7630488220 },
        text: '/status',
        message_id: 102
      }
    }
  };
  const mockResAuthorized = {
    status: (code) => ({
      json: (data) => {
        helpResult = { code, data };
        return helpResult;
      }
    })
  };

  await handleTelegramWebhook(mockReqAuthorized, mockResAuthorized);
  assert.strictEqual(helpResult.code, 200);
  assert.strictEqual(helpResult.data.ok, true);
  console.log('  ✓ PASS: Authorized admin (Chat ID: 7630488220) recognized and executed\n');

  // Test 3: Auto-Coder script syntax & environment loading
  console.log('--- Test 3: Auto-Coder Script Integrity & Payload Verification ---');
  const autoCoderPath = path.resolve('scripts/telegram_auto_coder.js');
  const fs = require('fs');
  assert.strictEqual(fs.existsSync(autoCoderPath), true, 'telegram_auto_coder.js must exist');
  const content = fs.readFileSync(autoCoderPath, 'utf8');
  assert.ok(content.includes('queryGemini'), 'Must contain Gemini multimodal engine');
  assert.ok(content.includes('downloadImageAsBase64'), 'Must support image/screenshot vision');
  assert.ok(content.includes('npm run build --prefix client'), 'Must verify build before committing');
  console.log('  ✓ PASS: Auto-Coder script verified with Gemini vision and build verification\n');

  // Test 4: GitHub Actions Workflow definition
  console.log('--- Test 4: GitHub Actions Workflow Definition ---');
  const workflowPath = path.resolve('.github/workflows/telegram-autofix.yml');
  assert.strictEqual(fs.existsSync(workflowPath), true, 'Workflow YAML must exist');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  assert.ok(workflowContent.includes('telegram_autofix'), 'Must listen to repository_dispatch telegram_autofix');
  assert.ok(workflowContent.includes('REMOTE_GEMINI_API_KEY'), 'Must inject REMOTE_GEMINI_API_KEY secret');
  console.log('  ✓ PASS: Workflow YAML verified with repository_dispatch and remote AI secrets\n');

  console.log('========================================================');
  console.log('✓ ALL TELEGRAM REMOTE AUTO-FIX SUITE TESTS PASSED (4/4)!');
  console.log('========================================================');
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
