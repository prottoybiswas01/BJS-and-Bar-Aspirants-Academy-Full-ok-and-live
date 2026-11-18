/**
 * Bangladesh Standard Time (BST - Asia/Dhaka, UTC+6) Utility for Frontend
 * Formatted in English with zero "(বাংলাদেশ সময়)" clutter.
 */

export function toBangladeshDigits(num) {
  if (num === null || num === undefined) return '';
  return String(num);
}

export function formatBangladeshTime(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';

  try {
    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
    return formatted.replace(/([ap]m)$/i, (m) => m.toUpperCase());
  } catch (e) {
    return d.toLocaleString('en-US');
  }
}

export function formatBangladeshDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';

  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(d);
  } catch (e) {
    return d.toLocaleDateString('en-US');
  }
}
