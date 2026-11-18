const { YoutubeTranscript } = require('youtube-transcript');

/**
 * Cleanly unescape HTML entities commonly returned by YouTube transcripts
 */
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\[♪[^\]]*\]/g, '') // remove music notes e.g. [♪♪♪]
    .replace(/\[Applause\]/gi, '')
    .replace(/\[Laughter\]/gi, '')
    .trim();
}

/**
 * Extract 11-character YouTube Video ID from any URL format
 */
function extractYoutubeId(input) {
  if (!input) return '';
  const str = String(input).trim();
  if (str.length === 11 && !str.includes('/') && !str.includes('.')) {
    return str;
  }
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  return match ? match[1] : '';
}

/**
 * Convert seconds into MM:SS format
 */
function formatSecondsToTimestamp(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const remainingSec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(m)}:${pad(remainingSec)}`;
}

/**
 * Parse Bengali or English SRT/VTT file or timestamped text
 */
function parseSrtOrVtt(content) {
  if (!content || !String(content).trim()) {
    return { ok: false, message: 'ফাইলটিতে কোনো সাবটাইটেল টেক্সট পাওয়া যায়নি।' };
  }

  const raw = String(content).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = raw.split('\n');
  const segments = [];
  let currentTimestamp = '00:00';
  let currentOffsetSec = 0;
  let currentTextLines = [];

  const timeRegex = /(?:(\d{2}):)?(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}):(\d{2})[,.](\d{3})/;
  const bracketTimeRegex = /\[(\d{1,2}):(\d{2})\]/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (currentTextLines.length > 0) {
        segments.push({
          timestamp: currentTimestamp,
          offsetSeconds: currentOffsetSec,
          text: currentTextLines.join(' ')
        });
        currentTextLines = [];
      }
      continue;
    }

    // Skip pure numbering in SRT
    if (/^\d+$/.test(line) && i + 1 < lines.length && timeRegex.test(lines[i + 1])) {
      continue;
    }

    // Check SRT / VTT timecode: 00:01:23,000 --> 00:01:28,000
    const timeMatch = line.match(timeRegex);
    if (timeMatch) {
      if (currentTextLines.length > 0) {
        segments.push({
          timestamp: currentTimestamp,
          offsetSeconds: currentOffsetSec,
          text: currentTextLines.join(' ')
        });
        currentTextLines = [];
      }
      const hours = parseInt(timeMatch[1] || '0', 10);
      const minutes = parseInt(timeMatch[2] || '0', 10);
      const seconds = parseInt(timeMatch[3] || '0', 10);
      currentOffsetSec = hours * 3600 + minutes * 60 + seconds;
      currentTimestamp = formatSecondsToTimestamp(currentOffsetSec);
      continue;
    }

    // Check bracketed manual format: [01:25] or [12:30]
    const bracketMatch = line.match(bracketTimeRegex);
    if (bracketMatch) {
      if (currentTextLines.length > 0) {
        segments.push({
          timestamp: currentTimestamp,
          offsetSeconds: currentOffsetSec,
          text: currentTextLines.join(' ')
        });
        currentTextLines = [];
      }
      const minutes = parseInt(bracketMatch[1], 10);
      const seconds = parseInt(bracketMatch[2], 10);
      currentOffsetSec = minutes * 60 + seconds;
      currentTimestamp = formatSecondsToTimestamp(currentOffsetSec);
      const textAfter = line.replace(bracketTimeRegex, '').trim();
      if (textAfter) currentTextLines.push(textAfter);
      continue;
    }

    // Skip WEBVTT header
    if (line.startsWith('WEBVTT') || line.startsWith('NOTE')) continue;

    currentTextLines.push(line);
  }

  if (currentTextLines.length > 0) {
    segments.push({
      timestamp: currentTimestamp,
      offsetSeconds: currentOffsetSec,
      text: currentTextLines.join(' ')
    });
  }

  // Combine full text
  const fullText = segments.map(s => `[${s.timestamp}] ${s.text}`).join('\n');
  const pureText = segments.map(s => s.text).join(' ');
  const wordCount = pureText.split(/\s+/).filter(Boolean).length;

  return {
    ok: true,
    transcript: fullText || pureText,
    pureText,
    segments,
    wordCount
  };
}

/**
 * Fetch YouTube transcript for a video ID or URL
 * STRICT: Only marks as ready if actual captions exist. Never substitutes titles or notes.
 */
async function fetchYoutubeTranscript(videoIdOrUrl) {
  const youtubeId = extractYoutubeId(videoIdOrUrl);
  if (!youtubeId) {
    return { ok: false, status: 'failed', message: 'অবৈধ ইউটিউব ভিডিও আইডি বা ইউআরএল।' };
  }

  let rawLines = null;
  let lastError = null;

  // Try 1: Default fetch (auto-detects language)
  try {
    rawLines = await YoutubeTranscript.fetchTranscript(youtubeId);
  } catch (err) {
    lastError = err;
  }

  // Try 2: Explicit Bengali language preference
  if (!rawLines || rawLines.length === 0) {
    try {
      rawLines = await YoutubeTranscript.fetchTranscript(youtubeId, { lang: 'bn' });
    } catch (err) {
      lastError = err;
    }
  }

  // Try 3: English fallback
  if (!rawLines || rawLines.length === 0) {
    try {
      rawLines = await YoutubeTranscript.fetchTranscript(youtubeId, { lang: 'en' });
    } catch (err) {
      lastError = err;
    }
  }

  // STRICT: If no caption track found, DO NOT invent transcript.
  if (!rawLines || rawLines.length === 0) {
    return {
      ok: false,
      status: 'no_captions',
      youtubeId,
      message: 'এই ভিডিওর জন্য ইউটিউবে কোনো ক্যাপশন বা সাবটাইটেল ট্র্যাক পাওয়া যায়নি।'
    };
  }

  // Clean lines with timestamp preservation
  const segments = [];
  const cleanedTextParts = [];

  for (const line of rawLines) {
    const text = decodeHtmlEntities(line.text);
    if (!text) continue;
    const offsetSec = Math.floor(line.offset || 0);
    const ts = formatSecondsToTimestamp(offsetSec);
    segments.push({
      timestamp: ts,
      offsetSeconds: offsetSec,
      text
    });
    cleanedTextParts.push(`[${ts}] ${text}`);
  }

  const fullText = cleanedTextParts.join('\n');
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;

  return {
    ok: true,
    status: 'ready',
    youtubeId,
    transcript: fullText,
    segments,
    lineCount: segments.length,
    wordCount,
    updatedAt: new Date()
  };
}

/**
 * Bengali Stopwords
 */
const BANGLA_STOPWORDS = new Set([
  'কী', 'কি', 'কে', 'কাকে', 'কোথায়', 'কখন', 'কেন', 'কিভাবে', 'হলে', 'হলে কী', 'হবে',
  'আছে', 'নাই', 'না', 'এবং', 'ও', 'বা', 'আর', 'যদি', 'কিন্তু', 'তাহলে', 'এই', 'সেই',
  'কোন', 'একটি', 'টা', 'টি', 'গুলো', 'এর', 'কে', 'তে', 'দিয়ে', 'দ্বারা', 'থেকে', 'চেয়ে',
  'আইন', 'আইনের', 'ধারা', 'অনুচ্ছেদ'
]);

function getBengaliRoot(word) {
  if (!word || word.length <= 3) return word;
  const suffixes = ['গুলো', 'গুলি', 'দেরকে', 'দের', 'সমূহ', 'ের', 'তে', 'কে', 'র', 'ে'];
  for (const suf of suffixes) {
    if (word.endsWith(suf) && word.length - suf.length >= 3) {
      return word.slice(0, -suf.length);
    }
  }
  return word;
}

/**
 * Search lessons by keywords in their real subtitle transcript
 */
function searchLessonsForQuery(query, lessons = [], maxResults = 2) {
  if (!query || !Array.isArray(lessons) || lessons.length === 0) return [];

  const rawTokens = query
    .toLowerCase()
    .replace(/[^\w\u0980-\u09FF\s]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2 && !BANGLA_STOPWORDS.has(t));

  if (rawTokens.length === 0) return [];

  const cleanTokens = [];
  for (const t of rawTokens) {
    if (!cleanTokens.includes(t)) cleanTokens.push(t);
    const root = getBengaliRoot(t);
    if (root && root.length >= 2 && !cleanTokens.includes(root) && !BANGLA_STOPWORDS.has(root)) {
      cleanTokens.push(root);
    }
  }

  const scoredLessons = [];

  for (const lesson of lessons) {
    const transcript = (lesson.transcript || '').toLowerCase();
    const title = (lesson.title || '').toLowerCase();
    const chapter = (lesson.chapter || '').toLowerCase();
    const moduleName = (lesson.module || '').toLowerCase();

    // Skip lessons with no valid transcript
    if (!transcript || transcript.length < 15) continue;

    let score = 0;
    const matchedTokens = [];
    let bestTimestamp = '00:00';
    let bestSnippet = '';

    for (const token of cleanTokens) {
      if (title.includes(token)) {
        score += 20;
        if (!matchedTokens.includes(token)) matchedTokens.push(token);
      }
      if (chapter.includes(token)) {
        score += 15;
        if (!matchedTokens.includes(token)) matchedTokens.push(token);
      }
      if (moduleName.includes(token)) {
        score += 10;
        if (!matchedTokens.includes(token)) matchedTokens.push(token);
      }

      const tIdx = transcript.indexOf(token);
      if (tIdx !== -1) {
        score += 25;
        if (!matchedTokens.includes(token)) matchedTokens.push(token);

        // Find the closest preceding timestamp before the keyword occurrence
        const textBefore = transcript.substring(0, tIdx + token.length);
        const allTimestamps = [...textBefore.matchAll(/\[(\d{1,2}:\d{2})\]/g)];
        if (allTimestamps.length > 0 && bestTimestamp === '00:00') {
          bestTimestamp = allTimestamps[allTimestamps.length - 1][1];
        }

        if (!bestSnippet) {
          const start = Math.max(0, tIdx - 60);
          const end = Math.min(transcript.length, tIdx + 120);
          bestSnippet = '...' + (lesson.transcript || '').substring(start, end).replace(/\n/g, ' ').trim() + '...';
        }
      }
    }

    if (score >= 20 && matchedTokens.length >= 1) {
      scoredLessons.push({
        id: lesson.id || lesson._id,
        title: lesson.title,
        courseId: lesson.courseId,
        chapter: lesson.chapter || lesson.module || '',
        duration: lesson.duration || '',
        youtubeId: lesson.youtubeId,
        youtubeUrl: lesson.youtubeUrl,
        score,
        timestamp: bestTimestamp,
        matchedKeywords: matchedTokens,
        snippet: bestSnippet
      });
    }
  }

  scoredLessons.sort((a, b) => b.score - a.score);
  return scoredLessons.slice(0, maxResults);
}

module.exports = {
  fetchYoutubeTranscript,
  parseSrtOrVtt,
  extractYoutubeId,
  searchLessonsForQuery,
  formatSecondsToTimestamp,
  decodeHtmlEntities
};
