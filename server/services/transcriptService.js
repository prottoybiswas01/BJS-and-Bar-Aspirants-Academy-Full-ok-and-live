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
 * Fetch YouTube transcript for a video ID or URL (100% Free)
 */
async function fetchYoutubeTranscript(videoIdOrUrl) {
  const youtubeId = extractYoutubeId(videoIdOrUrl);
  if (!youtubeId) {
    return { ok: false, status: 'failed', message: 'অবৈধ ইউটিউব ভিডিও আইডি বা ইউআরএল।' };
  }

  let rawLines = null;
  let lastError = null;

  // Try 1: Default fetch (auto-detects language, works for Bengali & English)
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

  if (!rawLines || rawLines.length === 0) {
    return {
      ok: false,
      status: 'failed',
      youtubeId,
      message: lastError ? lastError.message : 'এই ভিডিওর জন্য ইউটিউবে কোনো ক্যাপশন বা সাবটাইটেল খুঁজে পাওয়া যায়নি।'
    };
  }

  // Assemble clean full transcript text
  const cleanedLines = rawLines
    .map(line => decodeHtmlEntities(line.text))
    .filter(text => text.length > 0);

  const fullText = cleanedLines.join(' ');
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;

  return {
    ok: true,
    status: 'ready',
    youtubeId,
    transcript: fullText,
    lineCount: cleanedLines.length,
    wordCount,
    updatedAt: new Date()
  };
}

/**
 * Bengali Stopwords to filter out of search queries
 */
const BANGLA_STOPWORDS = new Set([
  'কী', 'কি', 'কে', 'কাকে', 'কোথায়', 'কখন', 'কেন', 'কিভাবে', 'হলে', 'হলে কী', 'হবে',
  'আছে', 'নাই', 'না', 'এবং', 'ও', 'বা', 'আর', 'যদি', 'কিন্তু', 'তাহলে', 'এই', 'সেই',
  'কোন', 'একটি', 'টা', 'টি', 'গুলো', 'এর', 'কে', 'তে', 'দিয়ে', 'দ্বারা', 'থেকে', 'চেয়ে',
  'আইন', 'আইনের', 'ধারা', 'অনুচ্ছেদ'
]);

/**
 * Bengali Stemmer / Root-word extractor for inflectional suffixes (-এর, -কে, -তে, -দের, etc.)
 */
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
 * Search lessons by keywords in their transcript, title, chapter, or description
 * Returns top matching lessons with contextual snippet
 */
function searchLessonsForQuery(query, lessons = [], maxResults = 2) {
  if (!query || !Array.isArray(lessons) || lessons.length === 0) return [];

  // Extract clean keywords from query (both Bengali & English)
  const rawTokens = query
    .toLowerCase()
    .replace(/[^\w\u0980-\u09FF\s]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2 && !BANGLA_STOPWORDS.has(t));

  if (rawTokens.length === 0) return [];

  // Build tokens with Bengali root variations for high-precision semantic matching
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
    const description = (lesson.description || '').toLowerCase();

    let score = 0;
    const matchedTokens = [];
    let bestSnippet = '';

    for (const token of cleanTokens) {
      let tokenMatches = 0;

      // Heavy weight for title or chapter match
      if (title.includes(token)) {
        score += 25;
        tokenMatches += 1;
      }
      if (chapter.includes(token)) {
        score += 20;
        tokenMatches += 1;
      }
      if (moduleName.includes(token)) {
        score += 15;
        tokenMatches += 1;
      }
      if (description.includes(token)) {
        score += 15;
        tokenMatches += 1;
      }

      // Transcript search
      if (transcript.includes(token)) {
        // Count occurrences (capped at 5 to avoid skew)
        const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = transcript.match(regex);
        const count = matches ? Math.min(matches.length, 5) : 0;
        score += count * 8;
        tokenMatches += count;

        // Extract a nice preview snippet around first occurrence
        if (!bestSnippet) {
          const idx = transcript.indexOf(token);
          const start = Math.max(0, idx - 60);
          const end = Math.min(transcript.length, idx + 140);
          bestSnippet = '...' + (lesson.transcript || '').substring(start, end).trim() + '...';
        }
      }

      if (tokenMatches > 0 && !matchedTokens.includes(token)) {
        matchedTokens.push(token);
      }
    }

    // Minimum match threshold
    if (score >= 12 && matchedTokens.length >= 1) {
      scoredLessons.push({
        id: lesson.id || lesson._id,
        title: lesson.title,
        courseId: lesson.courseId,
        chapter: lesson.chapter || lesson.module || '',
        duration: lesson.duration || '',
        youtubeId: lesson.youtubeId,
        youtubeUrl: lesson.youtubeUrl || (lesson.youtubeId ? `https://youtu.be/${lesson.youtubeId}` : ''),
        score,
        matchedKeywords: matchedTokens,
        snippet: bestSnippet || (lesson.description ? lesson.description.substring(0, 150) + '...' : '')
      });
    }
  }

  // Sort descending by score
  scoredLessons.sort((a, b) => b.score - a.score);

  return scoredLessons.slice(0, maxResults);
}

module.exports = {
  fetchYoutubeTranscript,
  extractYoutubeId,
  searchLessonsForQuery,
  decodeHtmlEntities
};
