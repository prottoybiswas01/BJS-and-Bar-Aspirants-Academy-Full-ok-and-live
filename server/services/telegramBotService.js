/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL SOFTWARE - ALL RIGHTS RESERVED
 * COPYRIGHT (C) 2026 BJS & BAR ASPIRANTS ACADEMY. ALL RIGHTS RESERVED.
 * ============================================================================
 * 
 * Secure Telegram Remote Auto-Fix & Feature Bot Service
 * Enables authorized admin (Chat ID: 7630488220) to trigger AI automated code fixes
 * and feature implementations via Telegram text commands and screenshots.
 */

const https = require('https');

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_REPO = 'prottoybiswas01/BJS-and-Bar-Aspirants-Academy-Full-ok-and-live';

/**
 * Safe HTTPS Request Helper
 */
function makeHttpsRequest(options, postData = null) {
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
    req.setTimeout(15000, () => {
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
 * Send message to Telegram Chat
 */
async function sendTelegramMessage(chatId, text, replyToMessageId = null) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token || !chatId) return { ok: false, error: 'Missing token or chatId' };

  try {
    const url = new URL(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`);
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    };
    if (replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }

    const res = await makeHttpsRequest({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, payload);

    return res.data;
  } catch (err) {
    console.error('⚠️ Telegram send message error:', err.message);
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
    const url = new URL(`${TELEGRAM_API_BASE}/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const res = await makeHttpsRequest({
      hostname: url.hostname,
      path: url.pathname + url.search,
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
 * Register Webhook with Telegram
 */
async function setupTelegramWebhook(appUrl) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token || !appUrl) return { ok: false, message: 'Missing bot token or app URL' };

  try {
    const cleanUrl = appUrl.replace(/\/+$/, '');
    const webhookUrl = `${cleanUrl}/api/telegram/webhook`;
    const url = new URL(`${TELEGRAM_API_BASE}/bot${token}/setWebhook`);

    const res = await makeHttpsRequest({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      url: webhookUrl,
      allowed_updates: ['message'],
      drop_pending_updates: false
    });

    console.log(`🤖 Telegram Webhook registered to: ${webhookUrl} -> Result:`, res.data?.description || res.status);
    return res.data;
  } catch (err) {
    console.error('⚠️ Failed to register Telegram Webhook:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Trigger GitHub Actions Repository Dispatch
 */
async function triggerGitHubAutoFix(clientPayload) {
  const pat = (process.env.GH_PAT || '').trim();
  if (!pat) {
    throw new Error('GH_PAT environment variable not configured');
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
      'User-Agent': 'BJS-Telegram-AutoCoder-Bot'
    }
  }, payload);

  if (res.status === 204 || res.status === 200) {
    return { ok: true };
  }
  return { ok: false, status: res.status, data: res.data };
}

/**
 * Main Webhook Handler for Incoming Telegram Updates
 */
async function handleTelegramWebhook(req, res) {
  try {
    const update = req.body;
    if (!update || !update.message) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const message = update.message;
    const senderId = String(message.from?.id || message.chat?.id || '');
    const authorizedChatId = String(process.env.TELEGRAM_CHAT_ID || '7630488220').trim();

    // STRICT ACCESS CONTROL: Only authorized admin chat ID can command the bot
    if (senderId !== authorizedChatId) {
      console.warn(`🔒 Unauthorized Telegram access attempt from ID: ${senderId}`);
      return res.status(200).json({ ok: true, blocked: true });
    }

    const text = (message.text || message.caption || '').trim();
    const messageId = message.message_id;

    // Handle /help or /start
    if (text === '/start' || text === '/help') {
      const helpMsg = `⚖️ *BJS Academy Remote Cloud Auto-Coder*\n\n` +
        `আপনি যেকোনো স্থান থেকে মোবাইল দিয়ে নিচের কমান্ডগুলো ব্যবহার করতে পারেন:\n\n` +
        `🔧 */fix [সমস্যার বিবরণ]*\n(স্ক্রিনশট ছবিসহ বা ছাড়া পাঠালে ক্লাউড এআই স্বয়ংক্রিয়ভাবে বাগ ফিক্স করবে)\n\n` +
        `✨ */feature [নতুন ফিচারের বিবরণ]*\n(নতুন কোনো পৃষ্ঠা, বাটন বা ফিচার যুক্ত করার নির্দেশ দিন)\n\n` +
        `📊 */status*\n(সার্ভার ও ডাটাবেজ হেলথ চেক)\n\n` +
        `_প্রোটেকশন: শুধুমাত্র আপনার অথরাইজড আইডি (${authorizedChatId}) কার্যকর।_`;
      await sendTelegramMessage(senderId, helpMsg, messageId);
      return res.status(200).json({ ok: true });
    }

    // Handle /status
    if (text === '/status') {
      const uptime = Math.floor(process.uptime());
      const hours = Math.floor(uptime / 3600);
      const mins = Math.floor((uptime % 3600) / 60);
      const statusMsg = `🟢 *BJS Academy Platform Status*\n\n` +
        `🌐 *Portal:* https://bjs.kodl.uk\n` +
        `⏱️ *Uptime:* ${hours}h ${mins}m\n` +
        `🛡️ *Security Layer:* Active & Enforced\n` +
        `🤖 *AI Auto-Coder:* Ready (GitHub Actions + Gemini 2.5/Flash)\n` +
        `🚀 *Vercel Deployment:* Auto-sync on git push`;
      await sendTelegramMessage(senderId, statusMsg, messageId);
      return res.status(200).json({ ok: true });
    }

    // Check if command is /fix or /feature
    const isFix = text.startsWith('/fix');
    const isFeature = text.startsWith('/feature');

    if (!isFix && !isFeature) {
      // Ignored non-command message
      return res.status(200).json({ ok: true });
    }

    const actionType = isFix ? 'fix' : 'feature';
    const commandPrefix = isFix ? '/fix' : '/feature';
    const promptText = text.slice(commandPrefix.length).trim();

    if (!promptText && (!message.photo || message.photo.length === 0)) {
      await sendTelegramMessage(
        senderId,
        `⚠️ অনুগ্রহ করে \`${commandPrefix}\` এর পর সমস্যার বিবরণ অথবা নতুন ফিচারের বর্ণনা লিখুন।\nউদাহরণ: \`${commandPrefix} অ্যাডমিন প্যানেলে স্টুডেন্ট সার্চ ফিল্টার যোগ করো\``,
        messageId
      );
      return res.status(200).json({ ok: true });
    }

    // Handle attached photo / screenshot if present
    let photoUrl = null;
    if (message.photo && Array.isArray(message.photo) && message.photo.length > 0) {
      const highestResPhoto = message.photo[message.photo.length - 1];
      photoUrl = await getTelegramFileUrl(highestResPhoto.file_id);
    }

    // Send immediate live progress acknowledgment
    const ackMsg = `⚡ *BJS Academy Cloud Auto-Coder সক্রিয় হয়েছে!*\n\n` +
      `📌 *অ্যাকশন টাইপ:* \`${actionType.toUpperCase()}\`\n` +
      `📝 *নির্দেশনা:* ${promptText || '(স্ক্রিনশট বিশ্লেষণ)'}\n` +
      `📷 *স্ক্রিনশট:* ${photoUrl ? '✓ সংযুক্ত করা হয়েছে' : 'নেই'}\n` +
      `🤖 *ইঞ্জিন:* Gemini AI + GitHub Actions Cloud Runner\n\n` +
      `⏳ _গিটহাব অ্যাকশন ওয়ার্কফ্লো শুরু করা হচ্ছে... ফলাফল প্রস্তুত হলে জানানো হবে।_`;

    await sendTelegramMessage(senderId, ackMsg, messageId);

    // Trigger GitHub Repository Dispatch
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
  } catch (err) {
    console.error('⚠️ Telegram Webhook Error:', err);
    return res.status(200).json({ ok: false, error: err.message });
  }
}

module.exports = {
  sendTelegramMessage,
  getTelegramFileUrl,
  setupTelegramWebhook,
  triggerGitHubAutoFix,
  handleTelegramWebhook
};
