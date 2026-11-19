/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL SOFTWARE - ALL RIGHTS RESERVED
 * COPYRIGHT (C) 2026 BJS & BAR ASPIRANTS ACADEMY. ALL RIGHTS RESERVED.
 * ============================================================================
 * 
 * GitHub Actions Cloud Auto-Coder Engine
 * Executed in GitHub Actions when triggered from Telegram (/fix or /feature).
 * Powered by Gemini 2.5 Pro / Flash with Multimodal Screenshot Vision.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const TELEGRAM_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '7630488220').trim();
const REMOTE_GEMINI_API_KEY = (process.env.REMOTE_GEMINI_API_KEY || '').trim();

/**
 * HTTPS helper
 */
function requestHttps(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (_) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

/**
 * Send or update Telegram status message
 */
async function sendTelegramUpdate(text, replyToId = null) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    };
    if (replyToId) payload.reply_to_message_id = replyToId;

    await requestHttps({
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, payload);
  } catch (err) {
    console.error('⚠️ Telegram status notify failed:', err.message);
  }
}

/**
 * Download remote image to Base64
 */
function downloadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer.toString('base64'));
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Query Gemini Multimodal API with fallback
 */
async function queryGemini(parts, systemInstruction) {
  const models = ['gemini-2.5-pro', 'gemini-flash-latest', 'gemini-2.5-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      console.log(`🤖 Attempting Gemini model: ${model}...`);
      const body = {
        contents: [
          { role: 'user', parts }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192
        }
      };

      if (systemInstruction) {
        body.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const res = await requestHttps({
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${model}:generateContent?key=${REMOTE_GEMINI_API_KEY}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, body);

      if (res.status === 200 && res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(`✓ Model ${model} succeeded!`);
        return res.data.candidates[0].content.parts[0].text;
      }

      lastError = new Error(`HTTP ${res.status}: ${JSON.stringify(res.data?.error || res.data)}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

/**
 * Main Runner
 */
async function main() {
  console.log('🚀 Starting BJS Academy Telegram Auto-Coder...');

  // Parse payload from GitHub Actions event
  let payload = {};
  try {
    const rawPayload = process.env.GITHUB_EVENT_PAYLOAD || '{}';
    payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
  } catch (e) {
    console.error('⚠️ Could not parse GITHUB_EVENT_PAYLOAD:', e.message);
  }

  const actionType = payload.action_type || 'fix';
  const prompt = payload.prompt || 'Codebase optimization and error fix';
  const photoUrl = payload.photo_url || null;
  const replyMessageId = payload.message_id || null;

  await sendTelegramUpdate(
    `⚙️ *গিটহাব অ্যাকশন ক্লাউড অটো-কোডার শুরু হয়েছে*\n\n` +
    `📌 *অ্যাকশন:* \`${actionType.toUpperCase()}\`\n` +
    `📝 *কমান্ড:* ${prompt}\n` +
    `🧠 _Gemini AI কোডবেস পরীক্ষা করছে..._`,
    replyMessageId
  );

  // Download screenshot if available
  const contentParts = [];
  if (photoUrl) {
    try {
      console.log('📷 Downloading attached screenshot from Telegram...');
      const imageBase64 = await downloadImageAsBase64(photoUrl);
      contentParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64
        }
      });
      console.log('✓ Attached screenshot downloaded successfully.');
    } catch (e) {
      console.warn('⚠️ Could not download screenshot:', e.message);
    }
  }

  // Collect relevant context files
  const sampleFiles = [
    'client/src/components/VideoPlayerModal.jsx',
    'client/src/pages/Dashboard.jsx',
    'client/src/pages/AdminPanel.jsx',
    'server/server.js'
  ];

  let contextSnippets = '';
  for (const f of sampleFiles) {
    if (fs.existsSync(f)) {
      const stats = fs.statSync(f);
      if (stats.size < 50000) {
        contextSnippets += `\n\n--- FILE: ${f} ---\n` + fs.readFileSync(f, 'utf8');
      } else {
        contextSnippets += `\n\n--- FILE: ${f} (Exists, size ${stats.size} bytes) ---\n`;
      }
    }
  }

  contentParts.push({
    text: `User requested action: ${actionType.toUpperCase()}\n\n` +
          `User prompt / issue description:\n${prompt}\n\n` +
          `Codebase context:\n${contextSnippets}\n\n` +
          `Provide your solution strictly as a JSON object with this schema:\n` +
          `{\n` +
          `  "explanation": "Summary of changes made",\n` +
          `  "edits": [\n` +
          `    {\n` +
          `      "path": "relative/path/to/file",\n` +
          `      "find": "exact text to replace or leave empty for full overwrite",\n` +
          `      "replace": "replacement text"\n` +
          `    }\n` +
          `  ]\n` +
          `}`
  });

  const systemInstruction = 
    `You are the Senior Staff Autonomous Software Engineer for BJS & Bar Aspirants Academy (https://bjs.kodl.uk). ` +
    `Your goal is to inspect issues and features requested via Telegram and produce safe, production-grade JavaScript/React code edits. ` +
    `Strict rules: ` +
    `1. Never break existing database schemas, security middleware, or environment variables. ` +
    `2. Keep responses in strict valid JSON format with "explanation" and "edits" array. Do not wrap in markdown quotes if possible, or use standard json fenced block. ` +
    `3. Always ensure React client code compiles cleanly with Vite.`;

  console.log('🤖 Sending request to Gemini AI...');
  const geminiResponse = await queryGemini(contentParts, systemInstruction);

  // Extract JSON from response
  let plan = null;
  try {
    const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      plan = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error('⚠️ Could not parse JSON from Gemini response:', err.message);
  }

  if (!plan || !Array.isArray(plan.edits) || plan.edits.length === 0) {
    console.log('No specific code edits generated by AI. Generating status summary.');
    await sendTelegramUpdate(
      `ℹ️ *AI অ্যানালাইসিস রিপোর্ট:*\n\n` +
      `${plan?.explanation || geminiResponse.slice(0, 500)}\n\n` +
      `_কোড পরিবর্তন প্রয়োজন হয়নি বা স্বয়ংক্রিয় পরিবর্তন প্রযোজ্য নয়।_`,
      replyMessageId
    );
    return;
  }

  // Apply edits
  console.log(`Applying ${plan.edits.length} edit(s)...`);
  const modifiedFiles = [];
  for (const edit of plan.edits) {
    const targetPath = path.resolve(edit.path);
    if (!fs.existsSync(targetPath)) {
      console.warn(`File does not exist: ${edit.path}, creating...`);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, edit.replace || '', 'utf8');
      modifiedFiles.push(edit.path);
      continue;
    }

    const currentContent = fs.readFileSync(targetPath, 'utf8');
    if (!edit.find || edit.find.trim() === '') {
      fs.writeFileSync(targetPath, edit.replace, 'utf8');
      modifiedFiles.push(edit.path);
    } else if (currentContent.includes(edit.find)) {
      const updated = currentContent.replace(edit.find, edit.replace);
      fs.writeFileSync(targetPath, updated, 'utf8');
      modifiedFiles.push(edit.path);
    } else {
      console.warn(`Could not find target snippet in ${edit.path}`);
    }
  }

  // Run client build test
  console.log('🔨 Testing client build with Vite...');
  try {
    execSync('npm run build --prefix client', { stdio: 'inherit' });
    console.log('✓ Vite build passed cleanly!');
  } catch (buildErr) {
    console.error('❌ Build failed after AI edits! Rolling back...');
    execSync('git checkout -- .', { stdio: 'inherit' });
    await sendTelegramUpdate(
      `❌ *বিল্ড ভেরিফিকেশন ফেইল্ড!*\n\n` +
      `AI দ্বারা প্রস্তাবিত পরিবর্তনে বিল্ড এরর এসেছে, তাই কোডবেস সুরক্ষিত রাখতে পরিবর্তন বাতিল করা হয়েছে।\n` +
      `এরর: \`${buildErr.message.slice(0, 300)}\``,
      replyMessageId
    );
    process.exit(1);
  }

  // Send success telegram notification
  const successReport = 
    `✅ *অটো-কোডার সম্পন্ন ও ডিপ্লয়মেন্ট প্রস্তুত!*\n\n` +
    `📌 *অ্যাকশন:* \`${actionType.toUpperCase()}\`\n` +
    `📝 *সারাংশ:* ${plan.explanation || 'কোড সফলভাবে আপডেট করা হয়েছে'}\n` +
    `📂 *পরিবর্তিত ফাইলসমূহ:*\n${modifiedFiles.map(f => `• \`${f}\``).join('\n')}\n\n` +
    `🔨 *বিল্ড স্ট্যাটাস:* ✓ Vite Production Build Passed\n` +
    `🚀 *ডিপ্লয়মেন্ট:* GitHub commit & push এর মাধ্যমে Vercel লাইভ ডিপ্লয়মেন্ট ট্রিগার হচ্ছে!`;

  await sendTelegramUpdate(successReport, replyMessageId);
  console.log('✓ Process completed successfully.');
}

main().catch(async (err) => {
  console.error('Fatal Auto-Coder Error:', err);
  await sendTelegramUpdate(`❌ *অটো-কোডার ক্র্যাশ:* ${err.message}`);
  process.exit(1);
});
