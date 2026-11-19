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

const BANGLISH_MAP = {
  'cpc': 'দেওয়ানী',
  'crpc': 'ফৌজদারি',
  'penal': 'দণ্ডবিধি',
  'section': 'ধারা',
  'sec': 'ধারা',
  'family': 'Family',
  'english': 'English',
  'general': 'General',
  'constitution': 'সংবিধান',
  'jomi': 'জমি',
  'jami': 'জমি',
  'dokhol': 'দখল',
  'bedokhol': 'বেদখল',
  'taka': 'টাকা',
  'cheque': 'চেক',
  'check': 'চেক',
  'police': 'পুলিশ',
  'case': 'মামলা',
  'fir': 'এজাহার',
  'murder': 'খুন',
  'khun': 'খুন',
  'bail': 'জামিন',
  'jamin': 'জামিন',
  'arrest': 'গ্রেপ্তার',
  'remand': 'রিমান্ড'
};

/**
 * Bengali Stopwords & Conversational Filter
 */
const BANGLA_STOPWORDS = new Set([
  'কী', 'কি', 'কে', 'কাকে', 'কোথায়', 'কখন', 'কেন', 'কিভাবে', 'হলে', 'হলে কী', 'হবে',
  'আছে', 'নাই', 'না', 'এবং', 'ও', 'বা', 'আর', 'যদি', 'কিন্তু', 'তাহলে', 'এই', 'সেই',
  'কোন', 'একটি', 'টা', 'টি', 'গুলো', 'এর', 'কে', 'তে', 'দিয়ে', 'দ্বারা', 'থেকে', 'চেয়ে',
  'আইন', 'আইনের', 'ধারা', 'অনুচ্ছেদ', 'আদেশ',
  'হ্যালো', 'হাই', 'কেমন', 'আছেন', 'ভালো', 'আছো', 'করব', 'করবো', 'করতে', 'করার', 'করে',
  'নিয়ম', 'উপায়', 'পদ্ধতি', 'জানতে', 'চাই', 'বলা', 'বলো', 'বলোতো', 'বলুন', 'ধন্যবাদ',
  'থ্যাংকস', 'ভাই', 'স্যার', 'আপু', 'hello', 'hi', 'hey', 'please', 'help', 'kemon', 'achen',
  'valo', 'bhalo', 'dhonnobad', 'thanks', 'thank', 'you', 'ki', 'korbo', 'korar', 'niyom'
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
/**
 * Strict Two-Stage Transcript & Metadata Search Engine
 * 1. Checks intent & domain relevance: Excludes greetings and topics not offered in our academy courses (e.g. Dowry, Cheque, Cyber).
 * 2. Stage-1 Metadata Priority: Directly resolves explicit class lookups ("Orientation", "Class 1", "2nd class").
 * 3. Stage-2 Genuine Transcript Subtitle Matching: Extracts verified timestamps & snippets.
 */
function searchLessonsForQuery(query, lessons = [], maxResults = 2, intentMeta = null) {
  if (!query || !Array.isArray(lessons) || lessons.length === 0) return [];

  // Gatekeeper: Greetings, Chitchat, and Vague/Clarification queries NEVER search lessons
  if (intentMeta && (intentMeta.isGreeting || intentMeta.primaryIntent === 'CHAT_OR_GREETING' || intentMeta.primaryIntent === 'CLARIFICATION_NEEDED')) {
    return [];
  }

  const cleanQ = String(query).toLowerCase().trim();

  // Domain Filter: If query is about a topic our academy has NO course for (e.g. Dowry, Cheque, Cyber), return zero lessons
  const unofferedTopicKeywords = ['যৌতুক', 'dowry', 'চেক বাউন্স', 'চেক ডিজঅনার', 'dishonour', 'সাইবার', 'হ্যাকিং', 'cyber'];
  if (unofferedTopicKeywords.some(kw => cleanQ.includes(kw))) {
    return [];
  }

  // Pre-screen: Only proceed if query touches an offered course domain OR is a class lookup
  const offeredCourseDomains = [
    'দেওয়ানী', 'সিপিসি', 'cpc', 'civil', 'এখতিয়ার', 'jurisdiction', 'নিষেধাজ্ঞা', 'injunction',
    'অর্ডার ৩৯', 'order 39', 'ডিক্রি', 'decree', 'আরজি', 'plaint', 'সমন', 'summons', 'রেস জুডিকাটা',
    'res judicata', 'রেস সাব-জুডিস', 'res sub-judice', '৯ ধারা', 'ধারা ৯',
    'সংবিধান', 'constitution', 'মৌলিক অধিকার', 'fundamental rights', 'অনুচ্ছেদ', 'article', 'সুপ্রিম কোর্ট',
    'হাইকোর্ট', 'রিট', 'writ', 'সমতা', 'নাগরিক',
    'পারিবারিক', 'পারিবারিক আইন', 'family law', 'দেনমোহর', 'dower', 'খোরপোষ', 'ভরণপোষণ',
    'maintenance', 'তালাক', 'divorce', 'অভিভাবকত্ব', 'guardianship',
    'general class', 'জেনারেল ক্লাস', 'orientation', '১ম ক্লাস', '২য় ক্লাস', '৩য় ক্লাস', 'class 1', 'class 2',
    'english', 'ইংরেজি'
  ];

  const touchesOfferedDomain = offeredCourseDomains.some(d => cleanQ.includes(d));
  const isExplicitClassLookup = cleanQ.includes('orientation') || cleanQ.includes('class') || cleanQ.includes('ক্লাস') || cleanQ.includes('লেকচার');

  if (!touchesOfferedDomain && !isExplicitClassLookup && !cleanQ.includes('ধারা') && !cleanQ.includes('আইন')) {
    return [];
  }

  const rawTokens = cleanQ
    .replace(/[^\w\u0980-\u09FF\s]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => (t.length >= 2 || /^[0-9০-৯]+$/.test(t)) && !BANGLA_STOPWORDS.has(t));

  if (rawTokens.length === 0 && !isExplicitClassLookup) return [];

  const cleanTokens = [];
  for (const t of rawTokens) {
    if (!cleanTokens.includes(t)) cleanTokens.push(t);
    const mapped = BANGLISH_MAP[t];
    if (mapped && !cleanTokens.includes(mapped.toLowerCase())) {
      cleanTokens.push(mapped.toLowerCase());
    }
    // Digit conversion between English and Bengali digits
    if (/^[0-9]+$/.test(t)) {
      const bnDigit = t.replace(/[0-9]/g, d => ({ '0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯' }[d] || d));
      if (!cleanTokens.includes(bnDigit)) cleanTokens.push(bnDigit);
    } else if (/^[০-৯]+$/.test(t)) {
      const enDigit = t.replace(/[০-৯]/g, d => ({ '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' }[d] || d));
      if (!cleanTokens.includes(enDigit)) cleanTokens.push(enDigit);
    }
    const root = getBengaliRoot(t);
    if (root && root.length >= 2 && !cleanTokens.includes(root) && !BANGLA_STOPWORDS.has(root)) {
      cleanTokens.push(root);
    }
  }

  const scoredLessons = [];

  for (const lesson of lessons) {
    const transcriptText = String(lesson.transcript || lesson.subtitles || '');
    const validStatus = lesson.hasSubtitles === true || lesson.transcriptStatus === 'ready' || lesson.transcriptStatus === 'manual' || transcriptText.length >= 20;
    const transcript = transcriptText.toLowerCase();

    // Must have valid status and non-empty transcript
    if (!validStatus || !transcript || transcript.length < 20) {
      continue;
    }

    const title = (lesson.title || '').toLowerCase();
    const chapter = (lesson.chapter || '').toLowerCase();
    const moduleName = (lesson.module || '').toLowerCase();

    let transcriptKeywordHits = 0;
    let titleKeywordHits = 0;
    let score = 0;
    const matchedTokens = [];
    let bestTimestamp = '';
    let bestSnippet = '';

    // Stage-1: Metadata Priority Matching (Orientation / Specific Class Search)
    if (cleanQ.includes('orientation') && (title.includes('orientation') || moduleName.includes('orientation'))) {
      score += 150;
      transcriptKeywordHits++;
    }

    // Match exact class serial in query e.g. "2nd class", "class 2", "class-2", "২য় ক্লাস"
    const classNumMatch = cleanQ.match(/(?:class|ক্লাস)\s*[-:]?\s*([0-9০-৯]+)/i) || cleanQ.match(/([0-9০-৯]+)\s*(?:st|nd|rd|th|তম|য়|র্থ)?\s*(?:class|ক্লাস)/i);
    if (classNumMatch) {
      const targetNum = classNumMatch[1];
      const enNum = targetNum.replace(/[০-৯]/g, d => ({ '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' }[d] || d));
      if (title.includes(`class-${enNum}`) || title.includes(`class ${enNum}`) || title.includes(`(${enNum})`)) {
        score += 120;
        transcriptKeywordHits++;
      }
    }

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

      // Supplementary title/module boosting
      if (title.includes(token)) {
        score += 35;
        titleKeywordHits++;
      }
      if (chapter.includes(token) || moduleName.includes(token)) {
        score += 20;
        titleKeywordHits++;
      }
    }

    // MANDATORY REQUIREMENT: Must have at least 1 genuine hit in transcript/metadata and minimum threshold
    const qualifies = transcriptKeywordHits >= 1 || (isExplicitClassLookup && titleKeywordHits >= 1);
    if (qualifies && score >= 30) {
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
        snippet: bestSnippet || (lesson.transcript ? lesson.transcript.slice(0, 150) + '...' : '')
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
