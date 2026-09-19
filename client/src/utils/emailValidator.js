// Utility to validate authentic personal and educational emails
// Blocks disposable, temporary, burner, and spam email domains

export const DISPOSABLE_OR_SPAM_DOMAINS = new Set([
  // Popular disposable / temp mail services
  "mailinator.com", "tempmail.com", "temp-mail.org", "temp-mail.io", "tempmail.net",
  "tempmail.ninja", "tempail.com", "10minutemail.com", "10minmail.com", "10minutemail.net",
  "guerrillamail.com", "guerrillamailblock.com", "guerrillamail.net", "guerrillamail.org",
  "guerrillamail.biz", "guerrillamail.de", "sharklasers.com", "grr.la", "trashmail.com",
  "trashmail.net", "trashmail.me", "trashmail.org", "yopmail.com", "yopmail.fr", "yopmail.net",
  "cool.fr.nf", "jetable.fr.nf", "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr",
  "courriel.fr.nf", "moncourrier.fr.nf", "dispostable.com", "throwawaymail.com",
  "throwawaymail2.com", "crazymailing.com", "mohmal.com", "burnermail.io", "burner.com",
  "dropmail.me", "emailfake.com", "fakeinbox.com", "getairmail.com", "inboxkitten.com",
  "nada.ltd", "nada.email", "generator.email", "crazymail.com", "mytemp.email", "tempinbox.com",
  "tempr.email", "discard.email", "discardmail.com", "spam4.me", "getnada.com", "maildrop.cc",
  "mytempmail.com", "tempmailaddress.com", "fakemailgenerator.com", "harakirimail.com",
  "minutemail.com", "internxt.com", "inboxbear.com", "privatemail.com", "pokemail.net",
  "spambox.us", "mytempemail.com", "fastmailtemp.com", "tempmailo.com", "emailondck.com",
  "emailondeck.com", "minuteinbox.com", "zillamail.com", "mailpoof.com", "burner.email",
  "temporarymail.com", "spamfree24.org", "trash-mail.com", "armyspy.com", "cuvox.de",
  "dayrep.com", "einrot.com", "fleckens.hu", "gustr.com", "jourrapide.com", "rhyta.com",
  "superrito.com", "teleworm.us", "disposablemail.com", "inboxclean.com", "trashmail.io",

  // Dummy / test domains
  "test.com", "example.com", "example.org", "example.net", "fake.com", "fakemail.com",
  "nowhere.com", "asdf.com", "xyz.com", "abc.com", "sample.com", "invalid.com", "testmail.com"
]);

const DISPOSABLE_PATTERNS = [
  /tempmail/i,
  /dispos/i,
  /trash/i,
  /throwaway/i,
  /10minute/i,
  /burner/i,
  /mailinator/i,
  /fakemail/i,
  /fakeinbox/i,
  /guerrilla/i,
  /yopmail/i,
  /dropmail/i,
  /sharklaser/i,
  /nada\.ltd/i,
  /nada\.email/i,
  /mohmal/i,
  /temp-mail/i
];

/**
 * Validates whether an email is authentic, personal or educational.
 * Blocks disposable, spam, or fake test emails.
 * @param {string} email
 * @returns {{ ok: boolean, message?: string, cleanEmail?: string }}
 */
export function validateRealEmail(email) {
  if (!email || typeof email !== "string") {
    return { ok: false, message: "অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা দিন।" };
  }

  const clean = email.trim().toLowerCase();

  // Basic RFC email format test
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) {
    return {
      ok: false,
      message: "সঠিক ফরম্যাটের ইমেইল প্রদান করুন (যেমন: student@gmail.com বা user@du.ac.bd)।"
    };
  }

  const parts = clean.split("@");
  if (parts.length !== 2) {
    return { ok: false, message: "অবৈধ ইমেইল ঠিকানা।" };
  }

  const [username, domain] = parts;

  if (username.length < 2) {
    return { ok: false, message: "ইমেইল ইউজারনেম অত্যন্ত ছোট।" };
  }

  if (username.length > 64) {
    return { ok: false, message: "ইমেইল ইউজারনেম অতিরিক্ত বড়।" };
  }

  if (domain.length < 4 || domain.length > 255) {
    return { ok: false, message: "ইমেইল ডোমেইনটি অবৈধ।" };
  }

  // Check known disposable domain set
  if (DISPOSABLE_OR_SPAM_DOMAINS.has(domain)) {
    return {
      ok: false,
      message: "স্প্যাম, অস্থায়ী বা ফেক ইমেইল গ্রহণযোগ্য নয়। অনুগ্রহ করে আপনার আসল ব্যক্তিগত (Gmail, Yahoo, Outlook) বা প্রাতিষ্ঠানিক (.edu/.ac.bd) ইমেইল ব্যবহার করুন।"
    };
  }

  // Check pattern matching in domain
  for (const pattern of DISPOSABLE_PATTERNS) {
    if (pattern.test(domain)) {
      return {
        ok: false,
        message: "অস্থায়ী বা স্প্যাম ইমেইল সার্ভিস গ্রহণযোগ্য নয়। আপনার আসল ব্যক্তিগত বা এডুকেশন ইমেইল ব্যবহার করুন।"
      };
    }
  }

  // Check domain structure & TLD
  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || /^\d+$/.test(tld)) {
    return { ok: false, message: "ইমেইল ডোমেইন বা TLD সঠিক নয়।" };
  }

  // Check segments
  for (const seg of domainParts) {
    if (!seg || seg.length === 0 || seg.startsWith("-") || seg.endsWith("-")) {
      return { ok: false, message: "ইমেইল ডোমেইন ফরম্যাটটি সঠিক নয়।" };
    }
  }

  return { ok: true, cleanEmail: clean };
}
