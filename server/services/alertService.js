const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9115946092:AAFt9UXe5XALCddLBgU3KQXJFueCcCEycvA';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '7630488220';
const ALERT_EMAIL = process.env.ALERT_EMAIL || 'prottoybiswas575358@gmail.com';

// Rate-safe message queue for Telegram (max 20 messages per minute)
const messageQueue = [];
let isQueueProcessing = false;

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendTelegramRaw(htmlMessage) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: htmlMessage,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 6000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ ok: res.statusCode === 200, status: res.statusCode, body });
      });
    });

    req.on('error', (err) => {
      console.warn('⚠️ Telegram Alert dispatch notice:', err.message);
      resolve({ ok: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'TIMEOUT' });
    });

    req.write(postData);
    req.end();
  });
}

async function processQueue() {
  if (isQueueProcessing || messageQueue.length === 0) return;
  isQueueProcessing = true;

  while (messageQueue.length > 0) {
    const item = messageQueue.shift();
    try {
      await sendTelegramRaw(item);
    } catch (e) {
      console.warn('Telegram queue error:', e.message);
    }
    // 1500ms delay between dispatches to maintain safe API limits
    await new Promise(r => setTimeout(r, 1500));
  }

  isQueueProcessing = false;
}

function sendTelegramAlert(htmlMessage, priority = 'normal') {
  if (priority === 'urgent') {
    messageQueue.unshift(htmlMessage);
  } else {
    messageQueue.push(htmlMessage);
  }
  processQueue();
}

/**
 * Emergency Email Alert - RESERVED STRICTLY for Database Failures & Fatal 500 Crashes
 * Conserves the 100/day email quota.
 */
async function sendEmergencyEmail(subject, htmlBody, resendClient) {
  try {
    if (!resendClient) return;
    await resendClient.emails.send({
      from: 'BJS Security Alert <noreply@bjs.kodl.uk>',
      to: [ALERT_EMAIL],
      subject: `🚨 [CRITICAL ALERT] ${subject}`,
      html: htmlBody
    });
  } catch (err) {
    console.warn('Emergency email notice:', err.message);
  }
}

// ----------------- Specialized Notification Formats -----------------

function notifyNewLesson({ courseTitle, lessonTitle, youtubeId }) {
  const msg = `🎥 <b>নতুন ভিডিও ক্লাস আপলোড হয়েছে!</b>\n\n` +
    `📚 <b>কোর্স:</b> ${escapeHtml(courseTitle || 'BJS Masterclass')}\n` +
    `📌 <b>ক্লাস:</b> ${escapeHtml(lessonTitle)}\n` +
    `▶️ <b>YouTube ID:</b> <code>${escapeHtml(youtubeId || 'N/A')}</code>\n` +
    `⏰ <b>সময়:</b> ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })} (BST)`;
  sendTelegramAlert(msg, 'normal');
}

function notifyRegistration({ name, email, phone, batch }) {
  const msg = `📝 <b>নতুন শিক্ষার্থী রেজিস্ট্রেশন সম্পন্ন!</b>\n\n` +
    `👤 <b>নাম:</b> ${escapeHtml(name)}\n` +
    `📱 <b>মোবাইল:</b> <code>${escapeHtml(phone)}</code>\n` +
    `📧 <b>ইমেইল:</b> ${escapeHtml(email)}\n` +
    `🎓 <b>ব্যাচ:</b> ${escapeHtml(batch || 'General')}\n` +
    `⏰ <b>সময়:</b> ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })} (BST)`;
  sendTelegramAlert(msg, 'normal');
}

function notifyReceipt({ studentName, amount, receiptId, paymentMethod }) {
  const msg = `💳 <b>নতুন পেমেন্ট রিসিট অনুমোদিত!</b>\n\n` +
    `👤 <b>শিক্ষার্থী:</b> ${escapeHtml(studentName)}\n` +
    `💰 <b>পরিমাণ:</b> ৳${amount} BDT\n` +
    `🧾 <b>রিসিট নং:</b> <code>${escapeHtml(receiptId)}</code>\n` +
    `🏦 <b>পদ্ধতি:</b> ${escapeHtml(paymentMethod || 'Manual')}\n` +
    `⏰ <b>সময়:</b> ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })} (BST)`;
  sendTelegramAlert(msg, 'normal');
}

function notifySecurityAttack({ attackType, ip, userAgent, path, payload }) {
  const msg = `🚨 <b>সাইবার অ্যাটাক ডিটেকশন অ্যালার্ট!</b>\n\n` +
    `⚠️ <b>অ্যাটাক টাইপ:</b> <code>${escapeHtml(attackType)}</code>\n` +
    `🌐 <b>আইপি:</b> <code>${escapeHtml(ip)}</code>\n` +
    `📍 <b>পাথ:</b> <code>${escapeHtml(path)}</code>\n` +
    `🔍 <b>পেলোড:</b> <code>${escapeHtml(String(payload || '').slice(0, 150))}</code>\n` +
    `⏰ <b>সময়:</b> ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })} (BST)`;
  sendTelegramAlert(msg, 'urgent');
}

function notifyAdminDiff({ section, adminId, ip, diff }) {
  const msg = `🛡️ <b>অ্যাডমিন প্যানেল আপডেট নোটিশ</b>\n\n` +
    `📂 <b>সেকশন:</b> ${escapeHtml(section)}\n` +
    `👤 <b>অ্যাডমিন:</b> ${escapeHtml(adminId || 'Admin')}\n` +
    `🌐 <b>আইপি:</b> <code>${escapeHtml(ip)}</code>\n` +
    `📋 <b>পরিবর্তন:</b> ${escapeHtml(String(diff || '').slice(0, 200))}\n` +
    `⏰ <b>সময়:</b> ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })} (BST)`;
  sendTelegramAlert(msg, 'normal');
}

function notifySiteError({ module, endpoint, error }) {
  const msg = `⚠️ <b>প্ল্যাটফর্ম রানটাইম এরর রিপোর্ট</b>\n\n` +
    `🧩 <b>মডিউল:</b> ${escapeHtml(module)}\n` +
    `📍 <b>এন্ডপয়েন্ট:</b> <code>${escapeHtml(endpoint)}</code>\n` +
    `❌ <b>এরর:</b> <code>${escapeHtml(String(error).slice(0, 200))}</code>\n` +
    `⏰ <b>সময়:</b> ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })} (BST)`;
  sendTelegramAlert(msg, 'normal');
}

module.exports = {
  sendTelegramAlert,
  sendEmergencyEmail,
  notifyNewLesson,
  notifyRegistration,
  notifyReceipt,
  notifySecurityAttack,
  notifyAdminDiff,
  notifySiteError
};
