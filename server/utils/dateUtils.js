/**
 * Bangladesh Standard Time (BST - Asia/Dhaka, UTC+6) Utility
 */

function parseBangladeshTimeToUtc(input) {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  let str = String(input).trim();
  if (!str) return new Date();

  // If already ends with Z or has offset like +06:00, parse directly
  if (/Z$/i.test(str) || /[+-]\d{2}:?\d{2}$/.test(str)) {
    return new Date(str);
  }

  // Handle YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm:ss or YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    str = str.replace(' ', 'T');
    if (str.length === 10) {
      str += 'T00:00:00+06:00';
    } else if (str.length === 16) {
      str += ':00+06:00';
    } else if (str.length === 19) {
      str += '+06:00';
    }
    return new Date(str);
  }

  return new Date(str);
}

function toBangladeshDigits(num) {
  if (num === null || num === undefined) return '';
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[d]);
}

function formatBangladeshTime(date, locale = 'bn-BD') {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';

  if (locale === 'bn-BD') {
    try {
      const formatted = new Intl.DateTimeFormat('bn-BD', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(d);
      return `${formatted} (বাংলাদেশ সময়)`;
    } catch (e) {
      // Fallback
    }
  }

  const formattedEn = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(d);
  return `${formattedEn} (BST)`;
}

module.exports = {
  parseBangladeshTimeToUtc,
  formatBangladeshTime,
  toBangladeshDigits
};
