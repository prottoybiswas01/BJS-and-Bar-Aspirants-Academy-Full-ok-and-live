/**
 * Bangladesh Standard Time (BST - Asia/Dhaka, UTC+6) Utility for Frontend
 */

export function toBangladeshDigits(num) {
  if (num === null || num === undefined) return '';
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[d]);
}

export function formatBangladeshTime(date, locale = 'bn-BD') {
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

export function formatBangladeshDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';

  try {
    return new Intl.DateTimeFormat('bn-BD', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(d);
  } catch (e) {
    return d.toLocaleDateString();
  }
}
