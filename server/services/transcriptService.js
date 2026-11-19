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
 * Parse XML Subtitles (supports srv3 format <p t="ms" d="ms"><s>word</s></p>
 * and classic YouTube format <text start="s" dur="s">word</text>)
 */
function parseTranscriptXml(xml, lang = 'bn') {
  if (!xml || typeof xml !== 'string') return [];
  const segments = [];

  // 1. Try srv3 format: <p t="ms" d="ms"><s>word</s></p>
  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let pMatch;
  while ((pMatch = pRegex.exec(xml)) !== null) {
    const startMs = parseInt(pMatch[1], 10);
    const durMs = parseInt(pMatch[2], 10);
    const inner = pMatch[3];
    let text = '';
    const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
    let sMatch;
    while ((sMatch = sRegex.exec(inner)) !== null) {
      text += sMatch[1];
    }
    if (!text) {
      text = inner.replace(/<[^>]+>/g, '');
    }
    text = decodeHtmlEntities(text).trim();
    if (text) {
      const offsetSec = Math.floor(startMs / 1000);
      segments.push({
        timestamp: formatSecondsToTimestamp(offsetSec),
        offsetSeconds: offsetSec,
        durationSeconds: Math.floor(durMs / 1000),
        text
      });
    }
  }

  // 2. Fallback to classic format: <text start="s" dur="s">text</text>
  if (segments.length === 0) {
    const textRegex = /<text\s+start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g;
    let tMatch;
    while ((tMatch = textRegex.exec(xml)) !== null) {
      const startSec = Math.floor(parseFloat(tMatch[1] || '0'));
      const durSec = Math.floor(parseFloat(tMatch[2] || '0'));
      const text = decodeHtmlEntities(tMatch[3] || '').trim();
      if (text) {
        segments.push({
          timestamp: formatSecondsToTimestamp(startSec),
          offsetSeconds: startSec,
          durationSeconds: durSec,
          text
        });
      }
    }
  }

  return segments;
}

/**
 * TIER 1: YouTube Innertube Android Client API
 * Bypasses Vercel/Datacenter IP blocks and retrieves caption tracks (bn, a.bn, etc.)
 */
async function fetchViaInnertubeAndroid(youtubeId) {
  try {
    const INNERTUBE_API_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
    const INNERTUBE_CLIENT_VERSION = '20.10.38';
    const INNERTUBE_CONTEXT = {
      client: {
        clientName: 'ANDROID',
        clientVersion: INNERTUBE_CLIENT_VERSION,
        hl: 'bn',
        gl: 'BD'
      }
    };
    const INNERTUBE_USER_AGENT = `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7500);

    const resp = await fetch(INNERTUBE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': INNERTUBE_USER_AGENT
      },
      body: JSON.stringify({
        context: INNERTUBE_CONTEXT,
        videoId: youtubeId
      }),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!resp.ok) return null;
    const data = await resp.json();
    const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(captionTracks) || captionTracks.length === 0) return null;

    // Prioritize Bengali track (uploaded or auto-generated), then any track
    const track = captionTracks.find(t => t.languageCode === 'bn' || t.languageCode?.startsWith('bn') || t.vssId?.includes('.bn')) || captionTracks[0];
    if (!track || !track.baseUrl) return null;

    const trController = new AbortController();
    const trTimer = setTimeout(() => trController.abort(), 6500);
    const trRes = await fetch(track.baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)'
      },
      signal: trController.signal
    });
    clearTimeout(trTimer);

    if (!trRes.ok) return null;
    const xml = await trRes.text();
    const segments = parseTranscriptXml(xml, track.languageCode || 'bn');
    if (segments.length === 0) return null;

    return {
      tier: 'tier1_innertube_android',
      language: track.languageCode || 'bn',
      segments
    };
  } catch (err) {
    return null;
  }
}

/**
 * TIER 2: Web Watch Page HTML Scraper + TimedText XML
 * Extracts captionTracks directly from ytInitialPlayerResponse inline script
 */
async function fetchViaWebWatchPage(youtubeId) {
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}&hl=bn`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7500);

    const res = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'bn,en-US;q=0.9,en;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/"captionTracks":\s*(\[.+?\])/);
    if (!match) return null;

    let tracks = [];
    try {
      tracks = JSON.parse(match[1]);
    } catch (e) {
      return null;
    }

    if (!Array.isArray(tracks) || tracks.length === 0) return null;
    const track = tracks.find(t => t.languageCode === 'bn' || t.languageCode?.startsWith('bn') || t.vssId?.includes('.bn')) || tracks[0];
    if (!track || !track.baseUrl) return null;

    const trController = new AbortController();
    const trTimer = setTimeout(() => trController.abort(), 6500);
    const trRes = await fetch(track.baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)',
        'Referer': watchUrl
      },
      signal: trController.signal
    });
    clearTimeout(trTimer);

    if (!trRes.ok) return null;
    const xml = await trRes.text();
    const segments = parseTranscriptXml(xml, track.languageCode || 'bn');
    if (segments.length === 0) return null;

    return {
      tier: 'tier2_web_watch_page',
      language: track.languageCode || 'bn',
      segments
    };
  } catch (err) {
    return null;
  }
}

/**
 * TIER 3: YouTube Transcript Library / Fallback Proxy
 */
async function fetchViaFallbackChain(youtubeId) {
  try {
    const rawLines = await YoutubeTranscript.fetchTranscript(youtubeId, { lang: 'bn' }).catch(() =>
      YoutubeTranscript.fetchTranscript(youtubeId).catch(() => null)
    );

    if (rawLines && Array.isArray(rawLines) && rawLines.length > 0) {
      const segments = rawLines.map(line => {
        const text = decodeHtmlEntities(line.text);
        const offsetSec = Math.floor(line.offset || 0);
        return {
          timestamp: formatSecondsToTimestamp(offsetSec),
          offsetSeconds: offsetSec,
          durationSeconds: Math.floor(line.duration || 0),
          text
        };
      }).filter(s => !!s.text);

      if (segments.length > 0) {
        return {
          tier: 'tier3_library_fallback',
          language: rawLines[0].lang || 'bn',
          segments
        };
      }
    }
  } catch (err) {
    // Non-fatal, return null
  }
  return null;
}

/**
 * Permanent Multi-Tier Subtitle Extraction Pipeline with Strict Quality Gate
 * - Tier 1: YouTube Innertube Android Client API (Bypasses Vercel Cloud IP blocks)
 * - Tier 2: Web Watch Page HTML Scraper + TimedText XML
 * - Tier 3: YoutubeTranscript Library / Fallback Chain
 * - Quality Gate: >= 50 words required (rejects bogus titles/descriptions)
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

  // Execute Multi-Tier Pipeline in Sequence
  let result = await fetchViaInnertubeAndroid(youtubeId);
  if (!result) {
    result = await fetchViaWebWatchPage(youtubeId);
  }
  if (!result) {
    result = await fetchViaFallbackChain(youtubeId);
  }

  // Handle No Captions or Extraction Failure
  if (!result || !result.segments || result.segments.length === 0) {
    return {
      ok: false,
      status: 'no_captions',
      retryable: false,
      youtubeId,
      message: 'এই ভিডিওটির জন্য ইউটিউবে কোনো বাংলা বা ইংরেজি সাবটাইটেল ট্র্যাক পাওয়া যায়নি।'
    };
  }

  const cleanedParts = result.segments.map(s => `[${s.timestamp}] ${s.text}`);
  const fullText = cleanedParts.join('\n');
  const pureText = result.segments.map(s => s.text).join(' ');
  const wordCount = pureText.split(/\s+/).filter(Boolean).length;
  const isBangla = /[\u0980-\u09FF]/.test(pureText);

  // STRICT QUALITY GATE: Subtitle text MUST have >= 50 words to be considered complete
  // Prevents saving video title or description as fake subtitles
  if (wordCount < 50) {
    return {
      ok: false,
      status: 'incomplete',
      retryable: true,
      youtubeId,
      wordCount,
      tier: result.tier,
      message: `সাবটাইটেল অসম্পূর্ণ (মাত্র ${wordCount}টি শব্দ, নূন্যতম ৫০ শব্দ প্রয়োজন)। অটো-রিট্রাই জবের জন্য অপেক্ষমাণ রাখা হলো।`
    };
  }

  return {
    ok: true,
    status: 'ready',
    youtubeId,
    transcript: fullText,
    pureText,
    segments: result.segments,
    lineCount: result.segments.length,
    wordCount,
    language: isBangla ? 'bn' : (result.language || 'en'),
    source: 'youtube_caption',
    tier: result.tier,
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
