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
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\[♪[^\]]*\]/g, '') // remove music notes e.g. [♪♪♪]
    .replace(/\[Applause\]/gi, '')
    .replace(/\[Laughter\]/gi, '')
    .replace(/\[Music\]/gi, '')
    .trim();
}

/**
 * Robust YouTube Video ID extractor
 * Supports:
 * - standard watch: https://www.youtube.com/watch?v=7HNVqFCWZm4
 * - short link: https://youtu.be/7HNVqFCWZm4
 * - embed: https://www.youtube.com/embed/7HNVqFCWZm4
 * - shorts: https://www.youtube.com/shorts/7HNVqFCWZm4
 * - live: https://www.youtube.com/live/7HNVqFCWZm4
 * - mobile: https://m.youtube.com/watch?v=7HNVqFCWZm4
 * - query parameters (e.g. ?t=10s, &feature=share, ?si=...)
 * - raw 11-char ID
 */
function extractYoutubeId(input) {
  if (!input) return '';
  const str = String(input).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
  return match ? match[1] : '';
}

/**
 * Convert seconds into MM:SS or HH:MM:SS format
 */
function formatSecondsToTimestamp(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const remainingSec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(remainingSec)}`;
  }
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
  const bracketTimeRegex = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/;

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

    // Check bracketed format: [01:25] or [01:12:30]
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
      if (bracketMatch[3] !== undefined) {
        const hours = parseInt(bracketMatch[1], 10);
        const minutes = parseInt(bracketMatch[2], 10);
        const seconds = parseInt(bracketMatch[3], 10);
        currentOffsetSec = hours * 3600 + minutes * 60 + seconds;
      } else {
        const minutes = parseInt(bracketMatch[1], 10);
        const seconds = parseInt(bracketMatch[2], 10);
        currentOffsetSec = minutes * 60 + seconds;
      }
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

  const fullText = segments.map(s => `[${s.timestamp}] ${s.text}`).join('\n');
  const pureText = segments.map(s => s.text).join(' ');
  const wordCount = pureText.split(/\s+/).filter(Boolean).length;
  const isBangla = /[\u0980-\u09FF]/.test(pureText);

  return {
    ok: true,
    transcript: fullText || pureText,
    pureText,
    segments,
    wordCount,
    language: isBangla ? 'bn' : 'en',
    source: 'srt_vtt_upload'
  };
}

/**
 * Fetch YouTube transcript with accurate error differentiation
 * Supported Statuses:
 * - ready: transcript successfully extracted & parsed
 * - no_captions: captions disabled or not available on YouTube
 * - invalid_id: video ID is malformed or invalid
 * - private_or_restricted: video is private, geoblocked, or removed
 * - network_error: network timeout or connectivity failure
 * - rate_limited: YouTube rate limit / captcha encountered
 * - unsupported_language: language requested not available
 */
async function fetchYoutubeTranscript(videoIdOrUrl) {
  const youtubeId = extractYoutubeId(videoIdOrUrl);
  if (!youtubeId) {
    return {
      ok: false,
      status: 'invalid_id',
      retryable: false,
      youtubeId: '',
      message: 'অবৈধ ইউটিউব ভিডিও আইডি বা ইউআরএল।'
    };
  }

  let rawLines = null;
  let detectedLang = 'en';
  let recordedError = null;

  // Attempt 1: Fetch primary caption track (auto-detects language)
  try {
    rawLines = await YoutubeTranscript.fetchTranscript(youtubeId);
    if (rawLines && rawLines.length > 0 && rawLines[0].lang) {
      detectedLang = rawLines[0].lang;
    }
  } catch (err) {
    recordedError = err;
  }

  // Attempt 2: Explicit Bengali track preference if primary failed
  if (!rawLines || rawLines.length === 0) {
    try {
      rawLines = await YoutubeTranscript.fetchTranscript(youtubeId, { lang: 'bn' });
      detectedLang = 'bn';
    } catch (err) {
      if (!recordedError) recordedError = err;
    }
  }

  // Attempt 3: English fallback if Bengali failed
  if (!rawLines || rawLines.length === 0) {
    try {
      rawLines = await YoutubeTranscript.fetchTranscript(youtubeId, { lang: 'en' });
      detectedLang = 'en';
    } catch (err) {
      if (!recordedError) recordedError = err;
    }
  }

  // If captions could not be retrieved, categorize the error accurately
  if (!rawLines || rawLines.length === 0) {
    const errMsg = recordedError ? String(recordedError.message || recordedError) : '';
    const errName = recordedError ? String(recordedError.name || recordedError.constructor?.name || '') : '';

    if (errName.includes('TooManyRequest') || errMsg.includes('TooManyRequest') || errMsg.includes('captcha') || errMsg.includes('429')) {
      return {
        ok: false,
        status: 'rate_limited',
        retryable: true,
        youtubeId,
        message: 'ইউটিউব অতিরিক্ত রিকোয়েস্টের কারণে সাময়িকভাবে রেট লিমিট করেছে।'
      };
    }

    if (errName.includes('VideoUnavailable') || errMsg.includes('no longer available') || errMsg.includes('private')) {
      return {
        ok: false,
        status: 'private_or_restricted',
        retryable: false,
        youtubeId,
        message: 'ভিডিওটি প্রাইভেট, ব্লকড অথবা ইউটিউবে আর উপলব্ধ নেই।'
      };
    }

    if (errName.includes('Disabled') || errMsg.includes('Transcript is disabled')) {
      return {
        ok: false,
        status: 'no_captions',
        retryable: false,
        youtubeId,
        message: 'এই ভিডিওটিতে ক্রিয়েটর কর্তৃক সাবটাইটেল নিষ্ক্রিয় করা রয়েছে।'
      };
    }

    if (errName.includes('NotAvailableLanguage') || errMsg.includes('Available languages:')) {
      return {
        ok: false,
        status: 'unsupported_language',
        retryable: false,
        youtubeId,
        message: 'নির্দিষ্ট ভাষায় কোনো সাবটাইটেল পাওয়া যায়নি।'
      };
    }

    if (errMsg.includes('fetch failed') || errMsg.includes('ETIMEDOUT') || errMsg.includes('ECONNRESET') || errMsg.includes('ENOTFOUND') || errMsg.includes('network')) {
      return {
        ok: false,
        status: 'network_error',
        retryable: true,
        youtubeId,
        message: 'ইউটিউব সার্ভারের সাথে সংযোগে সাময়িক নেটওয়ার্ক ত্রুটি হয়েছে।'
      };
    }

    if (errMsg.includes('Impossible to retrieve') || errMsg.includes('invalid')) {
      return {
        ok: false,
        status: 'invalid_id',
        retryable: false,
        youtubeId,
        message: 'অবৈধ ইউটিউব ভিডিও আইডি।'
      };
    }

    // Default: captions truly not available on video
    return {
      ok: false,
      status: 'no_captions',
      retryable: false,
      youtubeId,
      message: 'এই ভিডিওর জন্য ইউটিউবে কোনো ক্যাপশন বা সাবটাইটেল ট্র্যাক পাওয়া যায়নি।'
    };
  }

  // Parse clean lines with segment preservation
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
  const isBangla = /[\u0980-\u09FF]/.test(fullText);

  return {
    ok: true,
    status: 'ready',
    youtubeId,
    transcript: fullText,
    segments,
    lineCount: segments.length,
    wordCount,
    language: isBangla ? 'bn' : (detectedLang || 'en'),
    source: 'youtube_caption',
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
 * Strict Transcript Search Engine (Phase 11 Compliance)
 * Requirements:
 * 1. MUST match real transcript content (never recommends based on title alone).
 * 2. Only considers lessons with valid ready/manual transcripts.
 * 3. Extracts genuine timestamps from matched segments.
 * 4. Never invents fictional videos or timestamps.
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
    // Phase 11: Only include lessons with authentic ready/manual transcripts
    const validStatus = lesson.transcriptStatus === 'ready' || lesson.transcriptStatus === 'manual';
    const transcript = (lesson.transcript || '').toLowerCase();

    if (!validStatus || !transcript || transcript.length < 25) {
      continue;
    }

    const title = (lesson.title || '').toLowerCase();
    const chapter = (lesson.chapter || '').toLowerCase();
    const moduleName = (lesson.module || '').toLowerCase();

    let transcriptKeywordHits = 0;
    let score = 0;
    const matchedTokens = [];
    let bestTimestamp = '';
    let bestSnippet = '';

    // Segment-level analysis for highest precision timestamp extraction
    const rawSegments = [...(lesson.transcript || '').matchAll(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^\[]+)/g)];
    let bestSegmentScore = 0;

    if (rawSegments.length > 0) {
      for (const seg of rawSegments) {
        const segTs = seg[1];
        const segText = seg[2].toLowerCase();
        let segHits = 0;
        for (const token of cleanTokens) {
          if (segText.includes(token)) segHits++;
        }
        if (segHits > bestSegmentScore) {
          bestSegmentScore = segHits;
          bestTimestamp = segTs;
          bestSnippet = '...' + seg[2].trim().replace(/\n/g, ' ') + '...';
        }
      }
    }

    for (const token of cleanTokens) {
      const tIdx = transcript.indexOf(token);
      if (tIdx !== -1) {
        transcriptKeywordHits++;
        score += 30; // Primary weight for genuine transcript match
        if (!matchedTokens.includes(token)) matchedTokens.push(token);

        // Fallback timestamp if no bracketed segment matched
        if (!bestTimestamp) {
          const textBefore = transcript.substring(0, tIdx + token.length);
          const allTimestamps = [...textBefore.matchAll(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g)];
          if (allTimestamps.length > 0) {
            bestTimestamp = allTimestamps[allTimestamps.length - 1][1];
          }
        }

        if (!bestSnippet) {
          const start = Math.max(0, tIdx - 50);
          const end = Math.min(transcript.length, tIdx + 110);
          bestSnippet = '...' + (lesson.transcript || '').substring(start, end).replace(/\n/g, ' ').trim() + '...';
        }
      }

      // Supplementary title/module boosting ONLY if transcript already matched
      if (title.includes(token)) {
        score += 15;
      }
      if (chapter.includes(token) || moduleName.includes(token)) {
        score += 10;
      }
    }

    // MANDATORY REQUIREMENT: Must have at least 1 genuine hit in the transcript
    if (transcriptKeywordHits >= 1 && score >= 30) {
      scoredLessons.push({
        id: lesson.id || lesson._id,
        title: lesson.title,
        courseId: lesson.courseId,
        chapter: lesson.chapter || lesson.module || '',
        youtubeId: lesson.youtubeId,
        youtubeUrl: lesson.youtubeUrl,
        score,
        timestamp: bestTimestamp || '00:00',
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
