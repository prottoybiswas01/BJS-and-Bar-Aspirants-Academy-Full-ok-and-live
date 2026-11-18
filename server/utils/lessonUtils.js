/**
 * BJS & Bar Aspirants Academy - Canonical Lesson Ordering & Serial Utilities (Backend)
 * Ensures consistent, deterministic natural sorting (#1, #2, ... #24, #25)
 */

function toEnDigits(str) {
  if (!str) return '';
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(str).replace(/[০-৯]/g, (d) => bn.indexOf(d));
}

const ORDINAL_PATTERNS = [
  // 50s to 30s
  { num: 50, pattern: /\b(?:fiftieth|50th|৫০তম)\b/i },
  { num: 49, pattern: /\b(?:forty[\s-]ninth|49th|৪৯তম)\b/i },
  { num: 48, pattern: /\b(?:forty[\s-]eighth|48th|৪৮তম)\b/i },
  { num: 47, pattern: /\b(?:forty[\s-]seventh|47th|৪৭তম)\b/i },
  { num: 46, pattern: /\b(?:forty[\s-]sixth|46th|৪৬তম)\b/i },
  { num: 45, pattern: /\b(?:forty[\s-]fifth|45th|৪৫তম)\b/i },
  { num: 44, pattern: /\b(?:forty[\s-]fourth|44th|৪৪তম)\b/i },
  { num: 43, pattern: /\b(?:forty[\s-]third|43rd|৪৩তম)\b/i },
  { num: 42, pattern: /\b(?:forty[\s-]second|42nd|৪২তম)\b/i },
  { num: 41, pattern: /\b(?:forty[\s-]first|41st|৪১তম)\b/i },
  { num: 40, pattern: /\b(?:fortieth|40th|৪০তম)\b/i },
  { num: 39, pattern: /\b(?:thirty[\s-]ninth|39th|৩৯তম)\b/i },
  { num: 38, pattern: /\b(?:thirty[\s-]eighth|38th|৩৮তম)\b/i },
  { num: 37, pattern: /\b(?:thirty[\s-]seventh|37th|৩৭তম)\b/i },
  { num: 36, pattern: /\b(?:thirty[\s-]sixth|36th|৩৬তম)\b/i },
  { num: 35, pattern: /\b(?:thirty[\s-]fifth|35th|৩৫তম)\b/i },
  { num: 34, pattern: /\b(?:thirty[\s-]fourth|34th|৩৪তম)\b/i },
  { num: 33, pattern: /\b(?:thirty[\s-]third|33rd|৩৩তম)\b/i },
  { num: 32, pattern: /\b(?:thirty[\s-]second|32nd|৩২তম)\b/i },
  { num: 31, pattern: /\b(?:thirty[\s-]first|31st|৩১তম)\b/i },
  { num: 30, pattern: /\b(?:thirtieth|30th|৩০তম|ত্রিশতম|বিংশতি)\b/i },

  // 29 to 20 (Compound matched FIRST before single digits)
  { num: 29, pattern: /\b(?:twenty[\s-]ninth|29th|২৯তম|ঊনত্রিশতম|ঊনবিংশ)\b/i },
  { num: 28, pattern: /\b(?:twenty[\s-]eighth|28th|২৮তম|আঠাশতম|অষ্টাবিংশ)\b/i },
  { num: 27, pattern: /\b(?:twenty[\s-]seventh|27th|২৭তম|সাতাশতম|সপ্তবিংশ)\b/i },
  { num: 26, pattern: /\b(?:twenty[\s-]sixth|26th|২৬তম|ছাব্বিশতম|ষড়বিংশ)\b/i },
  { num: 25, pattern: /\b(?:twenty[\s-]fifth|25th|২৫তম|পঁচিশতম|পঞ্চবিংশ)\b/i },
  { num: 24, pattern: /\b(?:twenty[\s-]fourth|24th|২৪তম|চব্বিশতম|চতুর্বিংশ)\b/i },
  { num: 23, pattern: /\b(?:twenty[\s-]third|23rd|২৩তম|তেইশতম|ত্রয়োবিংশ)\b/i },
  { num: 22, pattern: /\b(?:twenty[\s-]second|22nd|২২তম|বাইশতম|দ্বাবিংশ)\b/i },
  { num: 21, pattern: /\b(?:twenty[\s-]first|21st|২১তম|একুশতম|একবিংশ)\b/i },
  { num: 20, pattern: /\b(?:twentieth|20th|২০তম|বিশতম|বিংশ)\b/i },

  // 19 to 11
  { num: 19, pattern: /\b(?:nineteenth|19th|১৯তম|ঊনিশতম)\b/i },
  { num: 18, pattern: /\b(?:eighteenth|18th|১৮তম|আঠারোতম|অষ্টাদশ)\b/i },
  { num: 17, pattern: /\b(?:seventeenth|17th|১৭তম|সতেরোতম|সপ্তদশ)\b/i },
  { num: 16, pattern: /\b(?:sixteenth|16th|১৬তম|ষোলতম|ষোড়শ)\b/i },
  { num: 15, pattern: /\b(?:fifteenth|15th|১৫তম|পনেরোতম|পঞ্চদশ)\b/i },
  { num: 14, pattern: /\b(?:fourteenth|14th|১৪তম|চৌদ্দতম|চতুর্দশ)\b/i },
  { num: 13, pattern: /\b(?:thirteenth|13th|১৩তম|তেরোতম|ত্রয়োদশ)\b/i },
  { num: 12, pattern: /\b(?:twelfth|12th|১২তম|বারোতম|দ্বাদশ)\b/i },
  { num: 11, pattern: /\b(?:eleventh|11th|১১তম|এগারোতম|একাদশ)\b/i },

  // 10 to 1
  { num: 10, pattern: /\b(?:tenth|10th|১০ম|১০তম|দশম)\b/i },
  { num: 9, pattern: /\b(?:ninth|9th|৯ম|৯তম|নবম)\b/i },
  { num: 8, pattern: /\b(?:eighth|8th|৮ম|৮তম|অষ্টম)\b/i },
  { num: 7, pattern: /\b(?:seventh|7th|৭ম|৭তম|সপ্তম)\b/i },
  { num: 6, pattern: /\b(?:sixth|6th|৬ষ্ঠ|৬তম|ষষ্ঠ)\b/i },
  { num: 5, pattern: /\b(?:fifth|5th|৫ম|৫তম|পঞ্চম)\b/i },
  { num: 4, pattern: /\b(?:fourth|forth|4th|৪র্থ|৪তম|চতুর্থ)\b/i },
  { num: 3, pattern: /\b(?:third|3rd|৩য়|৩তম|তৃতীয়)\b/i },
  { num: 2, pattern: /\b(?:second|secend|2nd|২য়|২তম|দ্বিতীয়)\b/i },
  { num: 1, pattern: /\b(?:first|fast|1st|১ম|১তম|প্রথম)\b/i },
];

/**
 * Extracts a normalized sequence number for a lesson.
 * Orientation always returns -1 (to be top of the list).
 */
function getLessonNum(l) {
  if (!l) return 999999;

  const rawStr = ((l?.title || '') + ' ' + (l?.chapter || '') + ' ' + (l?.module || '') + ' ' + (l?.id || '')).toLowerCase();
  const str = toEnDigits(rawStr);

  // 1. Orientation / Intro is ALWAYS first (#1)
  if (
    str.includes('orientation') ||
    str.includes('অরিয়েন্টেশন') ||
    str.includes('ইনট্রো') ||
    str.includes('intro') ||
    str.includes('গাইডলাইন') ||
    str.includes('guideline')
  ) {
    return -1;
  }

  // 2. Check explicit order attribute if provided and valid
  const explicitOrder = (l?.order !== undefined && l?.order !== null && !isNaN(Number(l?.order)) && Number(l?.order) > 0)
    ? Number(l.order)
    : null;

  // 3. Search title/chapter for compound and single ordinals
  for (const item of ORDINAL_PATTERNS) {
    if (item.pattern.test(str)) {
      return item.num;
    }
  }

  // 4. Prefix match (e.g. Class 23, লেকচার ৫, Part 3)
  const prefixMatch = str.match(/(?:class|lecture|lesson|module|video|part|পর্ব|ক্লাস|পাঠ|লেকচার|অধ্যায়|\#)[-_\s]*(\d+)/i);
  if (prefixMatch) {
    return parseInt(prefixMatch[1], 10);
  }

  // 5. Ordinal suffix match (e.g. 23rd, 24th, ২৫তম)
  const ordinalMatch = str.match(/(\d+)\s*(?:st|nd|rd|th|ম|য়|র্থ|ষ্ঠ|তম)/i);
  if (ordinalMatch) {
    return parseInt(ordinalMatch[1], 10);
  }

  // 6. Explicit order takes priority if no title number was found
  if (explicitOrder !== null) {
    return explicitOrder;
  }

  // 7. Standalone number not in year range (1800-2099)
  const allNums = [...str.matchAll(/\b(\d+)\b/g)].map(m => parseInt(m[1], 10));
  const candidateNums = allNums.filter(n => n < 1800 || n > 2099);
  if (candidateNums.length > 0) {
    return candidateNums[0];
  }

  // Unnumbered lessons are placed at the bottom
  return 999999;
}

/**
 * Stable, natural ascending lesson sort (#1, #2, ... #24)
 */
function sortLessons(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const numA = getLessonNum(a);
    const numB = getLessonNum(b);
    if (numA !== numB) return numA - numB;

    const dateA = new Date(a?.createdAt || a?.releaseDate || 0).getTime();
    const dateB = new Date(b?.createdAt || b?.releaseDate || 0).getTime();
    if (dateA !== dateB) return dateA - dateB;

    return (a?.title || '').localeCompare(b?.title || '');
  });
}

/**
 * Calculates the next available serial number for a course.
 */
function getNextSerial(lessonList) {
  if (!Array.isArray(lessonList) || lessonList.length === 0) return 1;
  let maxNum = 0;
  for (const l of lessonList) {
    const num = getLessonNum(l);
    if (num && num > 0 && num < 999999) {
      maxNum = Math.max(maxNum, num);
    }
  }
  return Math.max(maxNum + 1, lessonList.length + 1);
}

module.exports = {
  toEnDigits,
  getLessonNum,
  parseLessonNum: getLessonNum,
  sortLessons,
  getNextSerial,
  ORDINAL_PATTERNS
};
