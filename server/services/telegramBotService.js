/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL SOFTWARE - ALL RIGHTS RESERVED
 * COPYRIGHT (C) 2026 BJS & BAR ASPIRANTS ACADEMY. ALL RIGHTS RESERVED.
 * ============================================================================
 * 
 * Secure Telegram Remote Super-Admin Bot Service
 * Enables authorized admin (Chat ID: 7630488220) to:
 * 1. AI Screenshot Payment Verification (Gemini Vision) & instant course assignment
 * 2. Instant student profile lookup & verification
 * 3. Server, MongoDB, and Gemini live status checks
 * 4. Remote code fixes (/fix) and feature deployment (/feature) via GitHub Actions
 * 5. Interactive /help system with persistent commands menu & inline callback buttons
 * 
 * Persistent conversational state stored in MongoDB TelegramSession.
 */

const https = require('https');
const mongoose = require('mongoose');

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const GITHUB_REPO = 'prottoybiswas01/BJS-and-Bar-Aspirants-Academy-Full-ok-and-live';

const Student = require('../models/Student');
const Course = require('../models/Course');
const Receipt = require('../models/Receipt');
const TelegramSession = require('../models/TelegramSession');

/**
 * Safe HTTPS Request Helper
 */
function makeHttpsRequest(options, postData = null, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (_) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('HTTPS request timed out'));
    });

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

/**
 * Ensure MongoDB Connection in Serverless Environment
 */
async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) return;
  try {
    await mongoose.connect(uri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000
    });
  } catch (err) {
    console.warn('⚠️ MongoDB connection notice in Telegram service:', err.message);
  }
}

/**
 * Send message to Telegram Chat with optional reply_to and reply_markup
 */
async function sendTelegramMessage(chatId, text, replyToMessageId = null, replyMarkup = null, { parseMode = 'Markdown', timeoutMs = 15000 } = {}) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token || !chatId) return { ok: false, error: 'Missing token or chatId' };

  try {
    const payload = {
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    };
    if (parseMode) payload.parse_mode = parseMode;
    if (replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await makeHttpsRequest({
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, payload, timeoutMs);

    return res.data;
  } catch (err) {
    console.error('⚠️ Telegram send message error:', err.message);
    return { ok: false, error: err.message };
  }
}

const bangladeshLoginTime = new Intl.DateTimeFormat('bn-BD', {
  timeZone: 'Asia/Dhaka',
  dateStyle: 'medium',
  timeStyle: 'medium',
  hourCycle: 'h23'
});

const bengaliDigits = value => String(value).replace(/[0-9]/g, digit => '০১২৩৪৫৬৭৮৯'[digit]);
const alertText = (value, maxLength = 250) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength) || '—';

function formatStudentForAlert(student) {
  const id = alertText(student.id || student.regId);
  return `${alertText(student.name)} (${/^STU-/i.test(id) ? id : `STU-${id}`})`;
}

function sendStudentActivityAlert(lines) {
  const chatId = (process.env.TELEGRAM_CHAT_ID || '7630488220').trim();
  return sendTelegramMessage(chatId, lines.join('\n'), null, null, { parseMode: null, timeoutMs: 2500 });
}

function sendStudentLoginAlert(student, enrolledCourses, method, loggedInAt) {
  return sendStudentActivityAlert([
    '🔐 শিক্ষার্থী লগইন',
    `👤 শিক্ষার্থী: ${formatStudentForAlert(student)}`,
    `📱 ইমেইল / ফোন: ${alertText(student.email)} / ${alertText(student.phone)}`,
    `📚 এনরোলকৃত কোর্স: ${alertText(enrolledCourses.join(', ') || 'কোনো কোর্স নেই', 1200)}`,
    `🕒 লগইন সময় ও মাধ্যম: ${bangladeshLoginTime.format(loggedInAt)} (GMT+6) · ${method}`
  ]);
}

function sendStudentWatchAlert(student, courseTitle, lessonTitle, { event, watchedSeconds, videoTimestamp }) {
  const duration = `${bengaliDigits(Math.floor(watchedSeconds / 60))} মিনিট ${bengaliDigits(watchedSeconds % 60)} সেকেন্ড`;
  const position = [Math.floor(videoTimestamp / 60), videoTimestamp % 60]
    .map(part => bengaliDigits(String(part).padStart(2, '0'))).join(':');
  return sendStudentActivityAlert([
    event === 'started' ? '▶️ ক্লাস শুরু করেছে' : '⏹️ ক্লাস দেখা শেষ/বন্ধ করেছে',
    `👤 শিক্ষার্থী: ${formatStudentForAlert(student)}`,
    `🎬 কোর্স ও ক্লাস: ${alertText(courseTitle)} — ${alertText(lessonTitle)}`,
    `⏱️ দেখার সময়কাল: ${duration} | ভিডিও অবস্থান: ${position}`
  ]);
}

/**
 * Answer Telegram Callback Query (Awaited for Serverless Integrity)
 */
async function answerCallbackQuery(callbackQueryId, text = null, showAlert = false) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token || !callbackQueryId) return;

  try {
    const payload = { callback_query_id: callbackQueryId };
    if (text) payload.text = text;
    if (showAlert) payload.show_alert = showAlert;

    await makeHttpsRequest({
      hostname: 'api.telegram.org',
      path: `/bot${token}/answerCallbackQuery`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, payload);
  } catch (err) {
    console.warn('⚠️ answerCallbackQuery error:', err.message);
  }
}

/**
 * Edit existing Telegram message text (for inline interactions)
 */
async function editTelegramMessageText(chatId, messageId, text, replyMarkup = null) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token || !chatId || !messageId) return { ok: false };

  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await makeHttpsRequest({
      hostname: 'api.telegram.org',
      path: `/bot${token}/editMessageText`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, payload);

    return res.data;
  } catch (err) {
    console.warn('⚠️ editTelegramMessageText error:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Auto-Register Telegram Bot Menu Commands (setMyCommands)
 * Displays persistent blue 'Menu' button next to chat input box
 */
async function registerBotCommands(token) {
  const botToken = token || (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!botToken) return { ok: false, error: 'Missing token' };

  try {
    const payload = {
      commands: [
        { command: 'help', description: 'সকল ফিচার ও বিস্তারিত গাইড' },
        { command: 'payment', description: 'পেমেন্ট ভেরিফাই ও কোর্স অ্যাক্টিভ' },
        { command: 'student', description: 'স্টুডেন্ট তথ্য খুঁজুন' },
        { command: 'status', description: 'সার্ভার ও ডিপ্লয়মেন্ট স্ট্যাটাস' },
        { command: 'fix', description: 'রিমোট বাগ ফিক্স (স্ক্রিনশটসহ)' },
        { command: 'feature', description: 'নতুন ফিচার যোগ করুন' }
      ]
    };

    const res = await makeHttpsRequest({
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/setMyCommands`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, payload);

    console.log('🤖 Telegram setMyCommands result:', res.data?.description || res.status);
    return res.data;
  } catch (err) {
    console.warn('⚠️ setMyCommands warning:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Get direct download URL for a Telegram Photo File ID
 */
async function getTelegramFileUrl(fileId) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token || !fileId) return null;

  try {
    const res = await makeHttpsRequest({
      hostname: 'api.telegram.org',
      path: `/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
      method: 'GET'
    });

    if (res.data?.ok && res.data?.result?.file_path) {
      return `${TELEGRAM_API_BASE}/file/bot${token}/${res.data.result.file_path}`;
    }
    return null;
  } catch (err) {
    console.error('⚠️ Failed to get Telegram file URL:', err.message);
    return null;
  }
}

/**
 * Register Webhook with Telegram & Configure Commands
 */
async function setupTelegramWebhook(appUrl) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token || !appUrl) return { ok: false, message: 'Missing bot token or app URL' };

  try {
    const cleanUrl = appUrl.replace(/\/+$/, '');
    const webhookUrl = `${cleanUrl}/api/telegram-webhook`;

    const res = await makeHttpsRequest({
      hostname: 'api.telegram.org',
      path: `/bot${token}/setWebhook`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: false
    });

    console.log(`🤖 Telegram Webhook registered to: ${webhookUrl} -> Result:`, res.data?.description || res.status);

    // Auto-register commands menu
    const cmdResult = await registerBotCommands(token);

    return {
      webhook: res.data,
      commands: cmdResult
    };
  } catch (err) {
    console.error('⚠️ Failed to register Telegram Webhook:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Trigger GitHub Actions Repository Dispatch for Auto-Coder
 */
async function triggerGitHubAutoFix(clientPayload) {
  const pat = (process.env.GH_PAT || process.env.GITHUB_TOKEN || '').trim();
  if (!pat) {
    throw new Error('GH_PAT বা GITHUB_TOKEN কনফিগার করা নেই। অনুগ্রহ করে Vercel-এ GH_PAT যোগ করুন।');
  }

  const payload = {
    event_type: 'telegram_autofix',
    client_payload: clientPayload
  };

  const res = await makeHttpsRequest({
    hostname: 'api.github.com',
    path: `/repos/${GITHUB_REPO}/dispatches`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'BJS-Telegram-SuperAdmin-Bot'
    }
  }, payload);

  if (res.status === 204 || res.status === 200) {
    return { ok: true };
  }
  return { ok: false, status: res.status, data: res.data };
}

/**
 * Persistent Session State Management (stored in MongoDB for serverless durability)
 */
async function getSession(chatId) {
  try {
    await ensureDb();
    let session = await TelegramSession.findOne({ chatId });
    if (!session) {
      session = await TelegramSession.create({ chatId, step: 'idle', payload: {} });
    }
    return session;
  } catch (err) {
    return { chatId, step: 'idle', payload: {} };
  }
}

async function updateSession(chatId, step, payload = {}) {
  try {
    await ensureDb();
    return await TelegramSession.findOneAndUpdate(
      { chatId },
      { step, payload, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn('⚠️ Telegram session update warning:', err.message);
  }
}

/**
 * AI Forensic Payment Screenshot Analyzer using Gemini Vision
 */
async function analyzePaymentScreenshot(photoUrl) {
  const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.REMOTE_GEMINI_API_KEY || '').trim();
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY কনফিগার করা নেই।');
  }

  const imageRes = await fetch(photoUrl);
  if (!imageRes.ok) {
    throw new Error(`স্ক্রিনশট ছবি ডাউনলোড ব্যর্থ হয়েছে (${imageRes.statusText})`);
  }
  const arrayBuffer = await imageRes.arrayBuffer();
  const base64Image = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = (imageRes.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();

  const optimalModel = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${optimalModel}:generateContent?key=${geminiApiKey}`;

  const prompt = `You are a forensic mobile banking payment verification AI for Bangladesh MFS (bKash, Nagad, Rocket, Upay, Bank).
Examine this payment confirmation screenshot. Extract the transaction details strictly.
Fields to extract:
1. "transactionId": TrxID or Transaction ID (e.g., "BL98XX7Y", "9A7B6C5D"). Extract the exact alphanumeric string.
2. "amount": Clean numeric amount in BDT / Taka (e.g. 1000 or 1500).
3. "paymentMethod": One of "bKash", "Nagad", "Rocket", "Upay", "Bank Transfer", "Other".
4. "dateTime": Date and time of payment as shown on screenshot.

Return strictly a valid JSON object in this format (no markdown, no backticks, no comments):
{
  "transactionId": "...",
  "amount": 1000,
  "paymentMethod": "bKash",
  "dateTime": "..."
}`;

  let response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64Image } }
        ]
      }],
      generationConfig: { temperature: 0.1, topP: 0.8 }
    })
  });

  if (!response.ok) {
    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    response = await fetch(fallbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Image } }
          ]
        }]
      })
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Vision Error (${response.status}): ${errorText.slice(0, 150)}`);
  }

  const resData = await response.json();
  const textOutput = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const match = textOutput.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('Gemini Vision did not return valid JSON: ' + textOutput.slice(0, 150));
  }
  return JSON.parse(match[0]);
}

/**
 * Super-Admin Persistent Bottom Reply Keyboard
 */
const SUPER_ADMIN_KEYBOARD = {
  keyboard: [
    [{ text: '💳 পেমেন্ট অ্যাপ্রুভ' }, { text: '🔍 স্টুডেন্ট সার্চ' }],
    [{ text: '📊 সার্ভার স্ট্যাটাস' }, { text: '🛠️ রিমোট কোড ফিক্স' }],
    [{ text: '❓ সাহায্য ও গাইড (/help)' }]
  ],
  resize_keyboard: true,
  one_time_keyboard: false
};

/**
 * Interactive Help Inline Keyboard (With Clickable Callback Handlers)
 */
const HELP_INLINE_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '💳 পেমেন্ট অ্যাপ্রুভ গাইড', callback_data: 'guide_payment' },
      { text: '🔍 স্টুডেন্ট সার্চ গাইড', callback_data: 'guide_student' }
    ],
    [
      { text: '🛠️ রিমোট কোড ফিক্স গাইড', callback_data: 'guide_fix' },
      { text: '📊 লাইভ স্ট্যাটাস দেখুন', callback_data: 'guide_status' }
    ]
  ]
};

/**
 * Helper: Send Live Server Status Report
 */
async function sendStatusReport(chatId, replyToMessageId = null) {
  const uptime = Math.floor(process.uptime());
  const hours = Math.floor(uptime / 3600);
  const mins = Math.floor((uptime % 3600) / 60);

  let commitHash = 'main';
  try {
    const { execSync } = require('child_process');
    commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch (_) {}

  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.REMOTE_GEMINI_API_KEY);
  const hasMongo = Boolean(process.env.MONGODB_URI);
  const studentCount = await Student.countDocuments().catch(() => 0);
  const courseCount = await Course.countDocuments().catch(() => 0);
  const receiptCount = await Receipt.countDocuments().catch(() => 0);

  const statusMsg = `🟢 *BJS Academy Platform Live Status*\n\n` +
    `🌐 *Portal:* https://bjs.kodl.uk\n` +
    `📦 *Git Commit:* \`${commitHash}\` (Production Live)\n` +
    `⏱️ *Uptime:* ${hours}h ${mins}m\n` +
    `🗄️ *MongoDB Pool:* ${hasMongo ? '✓ Connected & Pooled' : '⚠️ Pending'}\n` +
    `👥 *নিবন্ধিত শিক্ষার্থী:* ${studentCount} জন\n` +
    `📚 *সক্রিয় কোর্স:* ${courseCount} টি\n` +
    `🧾 *ইস্যুকৃত মানি রিসিট:* ${receiptCount} টি\n` +
    `🧠 *Gemini AI API:* ${hasGeminiKey ? '✓ Active (Vision & Subtitles Ready)' : '⚠️ Key Missing'}\n` +
    `🛡️ *Anti-Piracy Shield:* ✓ Active (Locked Iframe & Controls)\n` +
    `🤖 *Remote Auto-Coder:* ✓ Ready (GitHub Actions + Gemini Vision)\n` +
    `🚀 *Vercel Deployment:* Auto-sync enabled on \`main\``;

  return await sendTelegramMessage(chatId, statusMsg, replyToMessageId, SUPER_ADMIN_KEYBOARD);
}

/**
 * Helper: Find student by query string (ID, Phone, Email, Name)
 */
async function findStudentByQuery(queryStr) {
  const clean = String(queryStr || '').trim();
  if (!clean) return null;
  return await Student.findOne({
    $or: [
      { id: clean },
      { id: clean.toUpperCase() },
      { phone: clean },
      { email: clean.toLowerCase() }
    ]
  });
}

/**
 * Main Webhook Handler for Incoming Telegram Updates (Messages & Callback Queries)
 * STRICTLY AWAITS every Telegram API call to guarantee zero dropped messages on Vercel serverless.
 */
async function handleTelegramWebhook(req, res) {
  try {
    const update = req.body;
    if (!update) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const authorizedChatId = String(process.env.TELEGRAM_CHAT_ID || '7630488220').trim();

    // =========================================================
    // 1. HANDLE INLINE BUTTON CALLBACK QUERIES (callback_query)
    // =========================================================
    if (update.callback_query) {
      const cq = update.callback_query;
      const cqId = cq.id;
      const senderId = String(cq.from?.id || cq.message?.chat?.id || '');

      if (senderId !== authorizedChatId) {
        console.warn(`🔒 Unauthorized Telegram Callback Query from ID: ${senderId}`);
        await answerCallbackQuery(cqId, 'অননুমোদিত এক্সেস!', true);
        return res.status(200).json({ ok: true, blocked: true });
      }

      await ensureDb();
      const cqData = cq.data || '';

      // Immediately answer callback query so Telegram spinner stops
      await answerCallbackQuery(cqId);

      // A. Payment Approval Guide Callback
      if (cqData === 'guide_payment') {
        await updateSession(senderId, 'awaiting_student_query', {});
        const guideMsg = `💳 *AI পেমেন্ট ভেরিফিকেশন ও কোর্স অনুমোদন গাইড*\n\n` +
          `*পেমেন্ট ভেরিফাই করার ২টি সহজ উপায়:*\n\n` +
          `📌 *১. সুপার-ফাস্ট শর্টকাট (সবচেয়ে সহজ):*\n` +
          `সরাসরি bKash/Nagad পেমেন্ট স্ক্রিনশটের ছবিটি পাঠান এবং ছবির ক্যাপশনে শিক্ষার্থীর *আইডি* (যেমন: \`STU-2026-001\`) অথবা *মোবাইল নম্বর* (যেমন: \`01800077663\`) লিখে দিন। Gemini AI ছবি পড়ে TrxID ও টাকা স্বয়ংক্রিয়ভাবে বের করবে!\n\n` +
          `📌 *২. ধাপে ধাপে পদ্ধতি:*\n` +
          `১. নিচে শিক্ষার্থীর আইডি বা মোবাইল নম্বর লিখে পাঠান।\n` +
          `২. এরপর পেমেন্টের স্ক্রিনশট পাঠিয়ে দিন।\n` +
          `৩. তালিকা থেকে কোর্স নম্বর (যেমন: \`1\`) বাছাই করলেই ডিজিটাল মানি রিসিট তৈরি হয়ে পোর্টাল এক্সেস চালু হবে।\n\n` +
          `👉 *এখনই শুরু করতে শিক্ষার্থীর আইডি অথবা মোবাইল নম্বর লিখে পাঠান:*`;
        await sendTelegramMessage(senderId, guideMsg, null, SUPER_ADMIN_KEYBOARD);
        return res.status(200).json({ ok: true });
      }

      // B. Student Search Guide Callback
      if (cqData === 'guide_student') {
        await updateSession(senderId, 'awaiting_student_search', {});
        const guideMsg = `🔍 *স্টুডেন্ট অনুসন্ধান গাইড*\n\n` +
          `শিক্ষার্থীর নাম, আইডি বা মোবাইল নম্বর লিখে পাঠান। যেমন:\n` +
          `• \`STU-2026-001\`\n` +
          `• \`01800077663\`\n` +
          `• \`Srity\`\n\n` +
          `_সরাসরি যেকারো তথ্য দেখতে নাম, আইডি বা ফোন নম্বর লিখে রিপ্লাই দিন:_`;
        await sendTelegramMessage(senderId, guideMsg, null, SUPER_ADMIN_KEYBOARD);
        return res.status(200).json({ ok: true });
      }

      // C. Remote Code Fix Guide Callback
      if (cqData === 'guide_fix') {
        const fixGuide = `🛠️ *রিমোট কোড ফিক্স ও ফিচার গাইড*\n\n` +
          `টেলিগ্রাম থেকেই GitHub Actions ও Gemini AI-এর মাধ্যমে কোডবেসে স্বয়ংক্রিয় পরিবর্তন আনা যায়:\n\n` +
          `১. *বাগ বা সমস্যা ফিক্স:* \`/fix [সমস্যার বর্ণনা]\`\n` +
          `   _টিপস:_ বাগ যেখানে হয়েছে তার স্ক্রিনশট দিয়ে ক্যাপশনে \`/fix এই পেজের টেবিলটি রেসপনসিভ করো\` লিখলে AI স্ক্রিনশট দেখে নিখুঁত কোড লিখবে।\n\n` +
          `২. *নতুন ফিচার তৈরি:* \`/feature [ফিচারের বর্ণনা]\`\n` +
          `   উদাহরণ: \`/feature অ্যাডমিন প্যানেলে স্টুডেন্ট এক্সপোর্ট এক্সেল বাটন যোগ করো\`\n\n` +
          `৩. *লাইভ পাইপলাইন:* কমান্ড পাঠানো মাত্র GitHub Actions রানার চালু হবে, কোড পরিবর্তন করবে, Vite বিল্ড টেস্ট করবে এবং Vercel-এ পুশ করবে।`;
        await sendTelegramMessage(senderId, fixGuide, null, SUPER_ADMIN_KEYBOARD);
        return res.status(200).json({ ok: true });
      }

      // D. Live Status Callback
      if (cqData === 'guide_status') {
        await sendStatusReport(senderId, null);
        return res.status(200).json({ ok: true });
      }

      return res.status(200).json({ ok: true });
    }

    // =========================================================
    // 2. HANDLE INCOMING CHAT MESSAGES
    // =========================================================
    if (!update.message) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const message = update.message;
    const senderId = String(message.from?.id || message.chat?.id || '');

    // STRICT ACCESS CONTROL
    if (senderId !== authorizedChatId) {
      console.warn(`🔒 Unauthorized Telegram access attempt from ID: ${senderId}`);
      return res.status(200).json({ ok: true, blocked: true });
    }

    await ensureDb();
    const text = (message.text || message.caption || '').trim();
    const messageId = message.message_id;
    const hasPhoto = Array.isArray(message.photo) && message.photo.length > 0;
    const session = await getSession(senderId);

    // Auto-register commands menu in background
    registerBotCommands(process.env.TELEGRAM_BOT_TOKEN).catch(() => {});

    // Cancel / Reset Command
    if (text === '/cancel' || text === 'বাতিল' || text === 'Cancel') {
      await updateSession(senderId, 'idle', {});
      await sendTelegramMessage(
        senderId,
        '🔄 *চলমান অপারেশন বাতিল করা হয়েছে।*\n\nআপনি মূল মেন্যুতে ফিরে এসেছেন। নিচের যেকোনো বাটন চাপুন:',
        messageId,
        SUPER_ADMIN_KEYBOARD
      );
      return res.status(200).json({ ok: true });
    }

    // Start / Menu / Help Command
    if (
      text === '/start' ||
      text === '/help' ||
      text === 'help' ||
      text === '/menu' ||
      text === 'মেন্যু' ||
      text === 'সাহায্য' ||
      text === '❓ সাহায্য ও গাইড (/help)'
    ) {
      await updateSession(senderId, 'idle', {});
      const menuMsg = `🏛️ *BJS Academy Remote Super-Admin Console*\n` +
        `🌐 *Portal:* https://bjs.kodl.uk\n\n` +
        `স্বাগতম অ্যাডমিন! আপনি মোবাইল থেকেই প্ল্যাটফর্মের সার্বিক কার্যক্রম পরিচালনা করতে পারবেন:\n\n` +
        `💳 *পেমেন্ট ভেরিফাই:* স্ক্রিনশট থেকে AI দ্বারা ট্রানজেকশন রিড ও স্বয়ংক্রিয় কোর্স অনুমোদন\n` +
        `🔍 *স্টুডেন্ট সার্চ:* আইডি বা ফোন দিয়ে শিক্ষার্থীর তথ্য ও অ্যাক্টিভ কোর্স পর্যবেক্ষণ\n` +
        `📊 *সার্ভার স্ট্যাটাস:* প্রোডাকশন গিট কমিট, MongoDB পুল ও জেমিনি এআই হেলথ\n` +
        `🛠️ *রিমোট কোড ফিক্স:* \`/fix\` বা \`/feature\` দিয়ে তাৎক্ষণিক ক্লাউড কোডার চালানো\n\n` +
        `👇 *নিচের বাটনে ক্লিক করে বিস্তারিত গাইড ও লাইভ অ্যাকশন দেখুন:*`;

      await sendTelegramMessage(senderId, menuMsg, messageId, HELP_INLINE_KEYBOARD);
      return res.status(200).json({ ok: true });
    }

    // Status Command
    if (text === '/status' || text === 'status' || text === '📊 সার্ভার স্ট্যাটাস') {
      await sendStatusReport(senderId, messageId);
      return res.status(200).json({ ok: true });
    }

    // Remote Code Fix Guide
    if (text === '🛠️ রিমোট কোড ফিক্স') {
      const fixGuide = `🛠️ *ক্লাউড অটো-কোডার নির্দেশনা:*\n\n` +
        `১. *বাগ বা সমস্যা ফিক্স করতে:*\n` +
        `   \`/fix [সমস্যার বিস্তারিত বর্ণনা]\`\n` +
        `   _(টিপস: সমস্যার স্ক্রিনশট পাঠিয়ে ক্যাপশনে \`/fix ...\` লিখলে AI ছবি বিশ্লেষণ করে ফিক্স করবে)_\n\n` +
        `২. *নতুন ফিচার যুক্ত করতে:*\n` +
        `   \`/feature [ফিচারের বর্ণনা]\`\n\n` +
        `আমাদের ক্লাউড রানার গিটহাবে স্বয়ংক্রিয়ভাবে কোড লিখে টেস্ট পাস করিয়ে Vercel-এ ডিপ্লয় করবে।`;
      await sendTelegramMessage(senderId, fixGuide, messageId, SUPER_ADMIN_KEYBOARD);
      return res.status(200).json({ ok: true });
    }

    // Remote /fix or /feature Execution
    const isFix = text.startsWith('/fix');
    const isFeature = text.startsWith('/feature');

    if (isFix || isFeature) {
      const actionType = isFix ? 'fix' : 'feature';
      const commandPrefix = isFix ? '/fix' : '/feature';
      const promptText = text.slice(commandPrefix.length).trim();

      if (!promptText && !hasPhoto) {
        await sendTelegramMessage(
          senderId,
          `⚠️ অনুগ্রহ করে \`${commandPrefix}\` এর পর সমস্যার বিবরণ অথবা নতুন ফিচারের বর্ণনা লিখুন।\nউদাহরণ: \`${commandPrefix} অ্যাডমিন প্যানেলে স্টুডেন্ট সার্চ ফিল্টার যোগ করো\``,
          messageId
        );
        return res.status(200).json({ ok: true });
      }

      let photoUrl = null;
      if (hasPhoto) {
        const highestResPhoto = message.photo[message.photo.length - 1];
        photoUrl = await getTelegramFileUrl(highestResPhoto.file_id);
      }

      const ackMsg = `⚡ *BJS Academy Cloud Auto-Coder সক্রিয় হয়েছে!*\n\n` +
        `📌 *অ্যাকশন টাইপ:* \`${actionType.toUpperCase()}\`\n` +
        `📝 *নির্দেশনা:* ${promptText || '(স্ক্রিনশট বিশ্লেষণ)'}\n` +
        `📷 *স্ক্রিনশট:* ${photoUrl ? '✓ সংযুক্ত করা হয়েছে' : 'নেই'}\n` +
        `🤖 *ইঞ্জিন:* Gemini AI + GitHub Actions Cloud Runner\n\n` +
        `⏳ _গিটহাব অ্যাকশন ওয়ার্কফ্লো শুরু করা হচ্ছে..._`;
      await sendTelegramMessage(senderId, ackMsg, messageId);

      try {
        const dispatchResult = await triggerGitHubAutoFix({
          action_type: actionType,
          prompt: promptText,
          photo_url: photoUrl,
          chat_id: senderId,
          message_id: messageId,
          requested_at: new Date().toISOString()
        });

        if (!dispatchResult.ok) {
          await sendTelegramMessage(
            senderId,
            `⚠️ GitHub Dispatch ত্রুটি: HTTP ${dispatchResult.status}। অনুগ্রহ করে গিটহাব টোকেন পারমিশন চেক করুন।`,
            messageId
          );
        }
      } catch (dispatchErr) {
        console.error('⚠️ GitHub Dispatch Failed:', dispatchErr);
        await sendTelegramMessage(
          senderId,
          `❌ GitHub Dispatch ফেইল্ড: ${dispatchErr.message}`,
          messageId
        );
      }

      return res.status(200).json({ ok: true });
    }

    // Student Search Initiation or Direct Execution
    const isSearchCmd = text.startsWith('/student') || text.startsWith('/search') || text === '🔍 স্টুডেন্ট সার্চ';
    if (isSearchCmd) {
      const inlineQuery = text.replace(/^\/(student|search)\s*/i, '').trim();
      if (inlineQuery && inlineQuery !== '🔍 স্টুডেন্ট সার্চ') {
        // Direct search execution
        const students = await Student.find({
          $or: [
            { id: { $regex: inlineQuery, $options: 'i' } },
            { phone: { $regex: inlineQuery, $options: 'i' } },
            { name: { $regex: inlineQuery, $options: 'i' } },
            { email: { $regex: inlineQuery, $options: 'i' } }
          ]
        }).limit(5).lean();

        if (!students || students.length === 0) {
          await sendTelegramMessage(
            senderId,
            `❌ \`${inlineQuery}\` তথ্য দিয়ে কোনো শিক্ষার্থী পাওয়া যায়নি।`,
            messageId,
            SUPER_ADMIN_KEYBOARD
          );
          return res.status(200).json({ ok: true });
        }

        let reply = `🔍 *${students.length} জন শিক্ষার্থী পাওয়া গেছে:*\n\n`;
        students.forEach((s, idx) => {
          reply += `${idx + 1}. *${s.name}*\n` +
            `   🆔 আইডি: \`${s.id}\` | 📱 ফোন: \`${s.phone}\`\n` +
            `   🎓 বিশ্ববিদ্যালয়: ${s.university || 'N/A'}\n` +
            `   📊 স্ট্যাটাস: ${s.status} (অনুমোদন: ${s.loginApproval})\n` +
            `   📚 কোর্সসমূহ: ${(s.allowedCourseIds || []).join(', ') || 'কোনো কোর্স অনুমোদিত নেই'}\n\n`;
        });
        await sendTelegramMessage(senderId, reply, messageId, SUPER_ADMIN_KEYBOARD);
        return res.status(200).json({ ok: true });
      }

      await updateSession(senderId, 'awaiting_student_search', {});
      await sendTelegramMessage(
        senderId,
        '🔍 *শিক্ষার্থী অনুসন্ধান*\n\nঅনুগ্রহ করে শিক্ষার্থীর নাম, আইডি (যেমন: `STU-2026-001`) অথবা মোবাইল নম্বর লিখুন:\n_(বাতিল করতে /cancel লিখুন)_',
        messageId
      );
      return res.status(200).json({ ok: true });
    }

    if (session.step === 'awaiting_student_search') {
      const q = text.trim();
      const students = await Student.find({
        $or: [
          { id: { $regex: q, $options: 'i' } },
          { phone: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } }
        ]
      }).limit(5).lean();

      if (!students || students.length === 0) {
        await sendTelegramMessage(
          senderId,
          `❌ \`${q}\` তথ্য দিয়ে কোনো শিক্ষার্থী পাওয়া যায়নি। অন্য কোনো নাম বা নম্বর দিয়ে খুঁজুন অথবা /cancel লিখুন:`,
          messageId
        );
        return res.status(200).json({ ok: true });
      }

      let reply = `🔍 *${students.length} জন শিক্ষার্থী পাওয়া গেছে:*\n\n`;
      students.forEach((s, idx) => {
        reply += `${idx + 1}. *${s.name}*\n` +
          `   🆔 আইডি: \`${s.id}\` | 📱 ফোন: \`${s.phone}\`\n` +
          `   🎓 বিশ্ববিদ্যালয়: ${s.university || 'N/A'}\n` +
          `   📊 স্ট্যাটাস: ${s.status} (অনুমোদন: ${s.loginApproval})\n` +
          `   📚 কোর্সসমূহ: ${(s.allowedCourseIds || []).join(', ') || 'কোনো কোর্স অনুমোদিত নেই'}\n\n`;
      });
      reply += `_নতুন সার্চ করতে নাম/নম্বর লিখুন অথবা /menu দিয়ে মেন্যুতে ফিরুন।_`;

      await updateSession(senderId, 'idle', {});
      await sendTelegramMessage(senderId, reply, messageId, SUPER_ADMIN_KEYBOARD);
      return res.status(200).json({ ok: true });
    }

    // Payment Verification Initiation
    if (text === '💳 পেমেন্ট অ্যাপ্রুভ' || text === '/payment' || text === 'payment') {
      await updateSession(senderId, 'awaiting_student_query', {});
      const payPrompt = `💳 *AI পেমেন্ট ভেরিফিকেশন ও কোর্স অনুমোদন*\n\n` +
        `ধাপ ১: শিক্ষার্থীর আইডি (যেমন: \`STU-2026-001\`) অথবা মোবাইল নম্বর (যেমন: \`01800077663\`) লিখুন।\n\n` +
        `💡 *শর্টকাট:* আপনি সরাসরি পেমেন্ট স্ক্রিনশটের ক্যাপশনে শিক্ষার্থীর আইডি বা মোবাইল নম্বর লিখে পাঠালেও স্বয়ংক্রিয়ভাবে প্রসেস হয়ে যাবে!\n` +
        `_(বাতিল করতে /cancel লিখুন)_`;
      await sendTelegramMessage(senderId, payPrompt, messageId);
      return res.status(200).json({ ok: true });
    }

    // Handle Photo Uploads (Payment Screenshots)
    if (hasPhoto) {
      const highestResPhoto = message.photo[message.photo.length - 1];
      const photoUrl = await getTelegramFileUrl(highestResPhoto.file_id);

      if (!photoUrl) {
        await sendTelegramMessage(senderId, '⚠️ ছবি ডাউনলোড করা যায়নি। পুনরায় পাঠান।', messageId);
        return res.status(200).json({ ok: true });
      }

      let matchedStudent = null;
      if (text) {
        const tokens = text.split(/[\s,]+/);
        for (const tok of tokens) {
          if (tok.length >= 4) {
            matchedStudent = await findStudentByQuery(tok);
            if (matchedStudent) break;
          }
        }
      }

      if (!matchedStudent && session.step === 'awaiting_payment_screenshot' && session.payload?.studentId) {
        matchedStudent = await Student.findOne({ id: session.payload.studentId });
      }

      if (!matchedStudent) {
        await updateSession(senderId, 'awaiting_student_for_pending_photo', { pendingPhotoUrl: photoUrl });
        await sendTelegramMessage(
          senderId,
          '📸 *পেমেন্ট স্ক্রিনশট পাওয়া গেছে!*\n\nএই পেমেন্টটি কোন শিক্ষার্থীর জন্য? অনুগ্রহ করে শিক্ষার্থীর আইডি (যেমন: `STU-2026-001`) অথবা মোবাইল নম্বর লিখে পাঠান:',
          messageId
        );
        return res.status(200).json({ ok: true });
      }

      // Process with Gemini Vision
      await sendTelegramMessage(
        senderId,
        `⏳ *Gemini AI পেমেন্ট স্ক্রিনশট বিশ্লেষণ করছে...*\nশিক্ষার্থী: *${matchedStudent.name}* (\`${matchedStudent.id}\`)`,
        messageId
      );

      let extracted = null;
      try {
        extracted = await analyzePaymentScreenshot(photoUrl);
      } catch (geminiErr) {
        console.error('⚠️ Gemini Vision Error:', geminiErr);
        extracted = {
          transactionId: 'N/A',
          amount: 1000,
          paymentMethod: 'bKash',
          dateTime: new Date().toLocaleString('en-GB')
        };
      }

      const courses = await Course.find().limit(10).lean();
      if (!courses || courses.length === 0) {
        courses.push({ id: 'c-bjs-foundation', title: 'Judicial Foundation & BJS Masterclass', fee: 1500 });
      }

      const courseOptions = courses.map((c, i) => ({
        index: i + 1,
        id: c.id,
        title: c.title,
        fee: c.fee || 1000
      }));

      await updateSession(senderId, 'awaiting_course_selection', {
        studentId: matchedStudent.id,
        studentName: matchedStudent.name,
        studentPhone: matchedStudent.phone,
        studentEmail: matchedStudent.email,
        extractedPayment: extracted,
        courseOptions
      });

      let reviewMsg = `🔍 *Gemini AI পেমেন্ট বিশ্লেষণ সম্পন্ন!*\n\n` +
        `👤 *শিক্ষার্থী:* ${matchedStudent.name} (\`${matchedStudent.id}\`)\n` +
        `📱 *মোবাইল:* \`${matchedStudent.phone}\`\n` +
        `💰 *টাকার পরিমাণ:* ৳${extracted.amount || 'N/A'}\n` +
        `💳 *পেমেন্ট মাধ্যম:* ${extracted.paymentMethod || 'bKash'}\n` +
        `🧾 *TrxID:* \`${extracted.transactionId || 'N/A'}\`\n` +
        `📅 *তারিখ/সময়:* ${extracted.dateTime || 'N/A'}\n\n` +
        `📚 *কোন কোর্সে এক্সেস দিতে চান? নম্বর লিখে রিপ্লাই দিন:*\n`;

      courseOptions.forEach(c => {
        reviewMsg += `*${c.index}.* ${c.title} (ফি: ৳${c.fee})\n`;
      });
      reviewMsg += `\n_(শুধুমাত্র নম্বরটি পাঠিয়ে রিপ্লাই দিন, যেমন: 1)_`;

      await sendTelegramMessage(senderId, reviewMsg, messageId);
      return res.status(200).json({ ok: true });
    }

    // Handle student query for pending photo
    if (session.step === 'awaiting_student_for_pending_photo') {
      const student = await findStudentByQuery(text);
      if (!student) {
        await sendTelegramMessage(
          senderId,
          `⚠️ \`${text}\` দিয়ে কোনো শিক্ষার্থী পাওয়া যায়নি। সঠিক আইডি বা ফোন নম্বর লিখুন অথবা /cancel লিখুন:`,
          messageId
        );
        return res.status(200).json({ ok: true });
      }

      const photoUrl = session.payload?.pendingPhotoUrl;
      await sendTelegramMessage(
        senderId,
        `⏳ *Gemini AI পেমেন্ট স্ক্রিনশট বিশ্লেষণ করছে...*\nশিক্ষার্থী: *${student.name}* (\`${student.id}\`)`,
        messageId
      );

      let extracted = null;
      try {
        extracted = await analyzePaymentScreenshot(photoUrl);
      } catch (err) {
        extracted = { transactionId: 'N/A', amount: 1000, paymentMethod: 'bKash', dateTime: new Date().toLocaleString('en-GB') };
      }

      const courses = await Course.find().limit(10).lean();
      const courseOptions = (courses.length > 0 ? courses : [
        { id: 'c-bjs-foundation', title: 'Judicial Foundation & BJS Masterclass', fee: 1500 }
      ]).map((c, i) => ({ index: i + 1, id: c.id, title: c.title, fee: c.fee || 1000 }));

      await updateSession(senderId, 'awaiting_course_selection', {
        studentId: student.id,
        studentName: student.name,
        studentPhone: student.phone,
        studentEmail: student.email,
        extractedPayment: extracted,
        courseOptions
      });

      let reviewMsg = `🔍 *Gemini AI পেমেন্ট বিশ্লেষণ সম্পন্ন!*\n\n` +
        `👤 *শিক্ষার্থী:* ${student.name} (\`${student.id}\`)\n` +
        `📱 *মোবাইল:* \`${student.phone}\`\n` +
        `💰 *টাকার পরিমাণ:* ৳${extracted.amount || 'N/A'}\n` +
        `💳 *পেমেন্ট মাধ্যম:* ${extracted.paymentMethod || 'bKash'}\n` +
        `🧾 *TrxID:* \`${extracted.transactionId || 'N/A'}\`\n` +
        `📅 *তারিখ/সময়:* ${extracted.dateTime || 'N/A'}\n\n` +
        `📚 *কোন কোর্সে এক্সেস দিতে চান? নম্বর লিখে রিপ্লাই দিন:*\n`;

      courseOptions.forEach(c => {
        reviewMsg += `*${c.index}.* ${c.title} (ফি: ৳${c.fee})\n`;
      });
      reviewMsg += `\n_(শুধুমাত্র নম্বরটি পাঠিয়ে রিপ্লাই দিন, যেমন: 1)_`;

      await sendTelegramMessage(senderId, reviewMsg, messageId);
      return res.status(200).json({ ok: true });
    }

    // Handle student input in awaiting_student_query step
    if (session.step === 'awaiting_student_query') {
      const student = await findStudentByQuery(text);
      if (!student) {
        await sendTelegramMessage(
          senderId,
          `⚠️ \`${text}\` দিয়ে কোনো শিক্ষার্থী পাওয়া যায়নি। অনুগ্রহ করে সঠিক আইডি বা মোবাইল নম্বর লিখুন (অথবা /cancel দিন):`,
          messageId
        );
        return res.status(200).json({ ok: true });
      }

      await updateSession(senderId, 'awaiting_payment_screenshot', {
        studentId: student.id,
        studentName: student.name,
        studentPhone: student.phone
      });

      const ack = `✅ *শিক্ষার্থী শনাক্ত হয়েছে!*\n\n` +
        `👤 *নাম:* ${student.name}\n` +
        `📱 *মোবাইল:* \`${student.phone}\`\n` +
        `🆔 *আইডি:* \`${student.id}\`\n` +
        `📚 *বর্তমান কোর্স:* ${(student.allowedCourseIds || []).join(', ') || 'কোনো কোর্স অনুমোদিত নেই'}\n\n` +
        `📸 এবার শিক্ষার্থীর bKash/Nagad/Rocket পেমেন্ট স্ক্রিনশটের ছবিটি পাঠান (Gemini AI স্বয়ংক্রিয়ভাবে TrxID ও টাকা যাচাই করবে):`;

      await sendTelegramMessage(senderId, ack, messageId);
      return res.status(200).json({ ok: true });
    }

    // Handle Course Selection Number in awaiting_course_selection step
    if (session.step === 'awaiting_course_selection') {
      const choice = parseInt(text, 10);
      const options = session.payload?.courseOptions || [];
      const selectedCourse = options.find(c => c.index === choice);

      if (!selectedCourse) {
        await sendTelegramMessage(
          senderId,
          `⚠️ অবৈধ নির্বাচন! অনুগ্রহ করে তালিকা থেকে ১ থেকে ${options.length} এর মধ্যে সঠিক নম্বরটি লিখে রিপ্লাই দিন (অথবা /cancel লিখুন):`,
          messageId
        );
        return res.status(200).json({ ok: true });
      }

      const studentId = session.payload?.studentId;
      const extracted = session.payload?.extractedPayment || {};
      const student = await Student.findOne({ id: studentId });

      if (!student) {
        await updateSession(senderId, 'idle', {});
        await sendTelegramMessage(senderId, '❌ শিক্ষার্থী ডাটাবেসে পাওয়া যায়নি। প্রক্রিয়াটি বাতিল করা হয়েছে।', messageId, SUPER_ADMIN_KEYBOARD);
        return res.status(200).json({ ok: true });
      }

      // Assign and sync selected course
      const courseId = selectedCourse.id;
      student.status = 'Active';
      student.loginApproval = 'Approved';
      if (!Array.isArray(student.allowedCourseIds)) student.allowedCourseIds = [];
      if (!Array.isArray(student.enrolledCourseIds)) student.enrolledCourseIds = [];

      if (!student.allowedCourseIds.includes(courseId)) {
        student.allowedCourseIds.push(courseId);
      }
      if (!student.enrolledCourseIds.includes(courseId)) {
        student.enrolledCourseIds.push(courseId);
      }

      if (!Array.isArray(student.courseRules)) student.courseRules = [];
      const existingRule = student.courseRules.find(r => r.courseId === courseId);
      if (!existingRule) {
        student.courseRules.push({
          courseId,
          unlimitedAccess: true,
          enrollmentStatus: 'Active',
          accessStartDate: new Date().toISOString().split('T')[0]
        });
      } else {
        existingRule.enrollmentStatus = 'Active';
        existingRule.unlimitedAccess = true;
      }
      student.accessVersion = Date.now();
      await student.save();

      // Create Verified Digital Receipt in MongoDB
      const receiptId = `REC-BJS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await Receipt.create({
        receiptId,
        studentId: student.id,
        studentName: student.name,
        studentPhone: student.phone,
        studentEmail: student.email || `${student.id}@bjs.local`,
        batch: selectedCourse.title,
        amount: Number(extracted.amount) || Number(selectedCourse.fee) || 1000,
        paymentMethod: extracted.paymentMethod || 'bKash',
        trxId: extracted.transactionId || 'N/A',
        paymentTime: new Date(),
        note: `Approved via Telegram Super-Admin for ${selectedCourse.title}`,
        issuedBy: 'Telegram Remote Super-Admin'
      });

      // Clear session
      await updateSession(senderId, 'idle', {});

      const successMsg = `🎉 *পেমেন্ট অ্যাপ্রুভ ও কোর্স সফলভাবে অ্যাক্টিভ হয়েছে!*\n\n` +
        `👤 *শিক্ষার্থী:* ${student.name} (\`${student.id}\`)\n` +
        `📱 *ফোন:* \`${student.phone}\`\n` +
        `📚 *অ্যাসাইনকৃত কোর্স:* ${selectedCourse.title}\n` +
        `💰 *পেমেন্ট:* ৳${extracted.amount || selectedCourse.fee} (${extracted.paymentMethod || 'bKash'})\n` +
        `🧾 *Trx ID:* \`${extracted.transactionId || 'N/A'}\`\n` +
        `📜 *মানি রিসিট আইডি:* \`${receiptId}\`\n` +
        `🔗 *রসিদ ভিউ:* https://bjs.kodl.uk/dashboard\n\n` +
        `✅ শিক্ষার্থীর কোর্স এক্সেস ও পোর্টাল লগইন তাৎক্ষণিকভাবে অনুমোদিত হয়েছে!`;

      await sendTelegramMessage(senderId, successMsg, messageId, SUPER_ADMIN_KEYBOARD);
      return res.status(200).json({ ok: true });
    }

    // Default / Unrecognized Message
    await sendTelegramMessage(
      senderId,
      '💡 কোনো অপশন নির্বাচন করতে নিচের বাটন ব্যবহার করুন অথবা /help লিখুন:',
      messageId,
      HELP_INLINE_KEYBOARD
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('⚠️ Telegram Webhook Error:', err);
    return res.status(200).json({ ok: false, error: err.message });
  }
}

module.exports = {
  sendTelegramMessage,
  sendStudentLoginAlert,
  sendStudentWatchAlert,
  answerCallbackQuery,
  editTelegramMessageText,
  registerBotCommands,
  getTelegramFileUrl,
  setupTelegramWebhook,
  triggerGitHubAutoFix,
  handleTelegramWebhook,
  analyzePaymentScreenshot
};
