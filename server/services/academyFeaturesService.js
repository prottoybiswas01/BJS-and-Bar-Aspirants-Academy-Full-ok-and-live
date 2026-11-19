const mongoose = require('mongoose');
const QRCode = require('qrcode');
const { generateCertificatePdf } = require('./certificateService');
const { sendTelegramAlert, notifyNewLesson } = require('./alertService');

const DEFAULT_BJS_NOTES = [
  {
    id: 'note-bjs-cpc-sec-9',
    title: 'দেওয়ানী আদালতের সাধারণ এখতিয়ার ও ৯ ধারা (Section 9 CPC): দেওয়ানী প্রকৃতির মোকদ্দমা ও বর্জনীয় ক্ষেত্রসমূহ',
    slug: 'cpc-section-9-jurisdiction-of-civil-courts',
    category: 'দেওয়ানী কার্যবিধি (CPC)',
    summary: 'দেওয়ানী কার্যবিধির ৯ ধারা অনুযায়ী দেওয়ানী আদালত সব দেওয়ানী প্রকৃতির মোকদ্দমা বিচারের এখতিয়ার রাখে, যদি না তা স্পষ্টভাবে বা পরোক্ষভাবে বারিত থাকে।',
    readTime: '৬ মিনিট',
    order: 1,
    lawSections: ['CPC Section 9', 'Constitution Article 102'],
    content: `## ১. ৯ ধারার মূল ভিত্তি (Section 9 CPC)
দেওয়ানী কার্যবিধি ১৯০৮ (Code of Civil Procedure, 1908)-এর ধারা ৯ অনুযায়ী:
> "আদালতের এখতিয়ার থাকিবে—সকল দেওয়ানী প্রকৃতির মোকদ্দমা বিচার করিবার, তবে যে সকল মোকদ্দমার বিচার সুস্পষ্টভাবে বা পরোক্ষভাবে বারিত (expressly or impliedly barred) হইয়াছে, সে সকল মোকদ্দমা ইহার অন্তর্ভুক্ত হইবে না।"

### ২. দেওয়ানী প্রকৃতির মোকদ্দমা কী? (Suits of Civil Nature)
যে মোকদ্দমায় কোনো সম্পত্তি (Property) বা পদের (Office) অধিকার দাবি করা হয়, তাহা দেওয়ানী প্রকৃতির মোকদ্দমা।
* **অন্তর্ভুক্ত বিষয়সমূহ:**
  1. স্থাবর বা অস্থাবর সম্পত্তির স্বত্ব ও দখল পুনরুদ্ধারের মোকদ্দমা।
  2. চুক্তিভঙ্গের ক্ষতিপূরণ মোকদ্দমা।
  3. বিবাহবিচ্ছেদ, দেনমোহর ও ভরণপোষণের পারিবারিক মোকদ্দমা।
  4. ধর্মীয় বা সামাজিক পদের অধিকার ও সম্মানের অধিকার।
  5. ভোটার তালিকায় নাম অন্তর্ভুক্তি সংক্রান্ত নাগরিক অধিকার।

* **যা দেওয়ানী প্রকৃতির নয় (বর্জিত বিষয়):**
  1. বিশুদ্ধ রাজনৈতিক প্রশ্ন বা নীতিগত সিদ্ধান্ত।
  2. বিশুদ্ধ ধর্মীয় আচার-অনুষ্ঠান বা সামাজিক প্রথা যেখানে কোনো আর্থিক বা পদমর্যাদার অধিকার নেই।
  3. অপরাধমূলক কার্যধারা (ফৌজদারি আদালত কর্তৃক বিচার্য)।

### ৩. সুস্পষ্টভাবে ও পরোক্ষভাবে বারিত মোকদ্দমা (Expressly or Impliedly Barred)
- **সুস্পষ্টভাবে বারিত (Expressly Barred):** কোনো বিশেষ আইন (Special Law) দ্বারা সাধারণ দেওয়ানী আদালতের এখতিয়ার নিষিদ্ধ করা হলে। যেমন—মানিলোন কোর্ট অ্যাক্ট (Artha Rin Adalat Ain), প্রশাসনিক ট্রাইব্যুনাল (Administrative Tribunal), শ্রম আদালত (Labor Court)।
- **পরোক্ষভাবে বারিত (Impliedly Barred):** সাধারণ আইন বা পাবলিক পলিসির ভিত্তিতে যা গ্রহণযোগ্য নয়। যেমন—কোনো চূড়ান্ত দেওয়ানী আদেশের বিরুদ্ধে দোবারা দোষ বা Res Judicata (ধারা ১১)।

📌 **বিজেএস পরীক্ষার প্রস্তুতি টিপস:**
BJS প্রিলিমিনারি ও লিখিত পরীক্ষায় প্রায়ই প্রশ্ন আসে—"দেওয়ানী আদালতের এখতিয়ার সর্বব্যাপী কি না?" উত্তরে ৯ ধারার শর্ত এবং বিশেষ আদালতের ব্যতিক্রমগুলো উদ্ধৃত করতে হবে।`
  },
  {
    id: 'note-bjs-cpc-order-39',
    title: 'সিপিসি আদেশ ৩৯ (CPC Order 39): অস্থায়ী নিষেধাজ্ঞা পাওয়ার ৩টি স্বর্ণালী নীতি ও বাধ্যতামূলক উপাদান',
    slug: 'cpc-order-39-temporary-injunction-golden-rules',
    category: 'দেওয়ানী কার্যবিধি (CPC)',
    summary: 'দেওয়ানী মোকদ্দমায় বিরোধীয় সম্পত্তি হস্তান্তর, ধ্বংস বা অপচয় রোধে আদেশ ৩৯ নিয়ম ১ ও ২ অনুসারে অস্থায়ী নিষেধাজ্ঞার ৩টি গোল্ডেন প্রিন্সিপল।',
    readTime: '৭ মিনিট',
    order: 2,
    lawSections: ['CPC Order 39 Rule 1', 'CPC Order 39 Rule 2', 'Specific Relief Act Section 53'],
    content: `## ১. অস্থায়ী নিষেধাজ্ঞা কী? (Temporary Injunction)
দেওয়ানী কার্যবিধির আদেশ ৩৯ (Order 39) এবং সুনির্দিষ্ট প্রতিকার আইনের ৫৩ ধারা অনুসারে অস্থায়ী নিষেধাজ্ঞা হলো আদালতের একটি অন্তর্বর্তীকালীন আদেশ—যার মাধ্যমে মামলার চূড়ান্ত রায় না হওয়া পর্যন্ত কোনো পক্ষকে বিরোধীয় সম্পত্তির আকার-আকৃতি পরিবর্তন, অপচয়, হস্তান্তর বা বেদখল করা থেকে বিরত রাখা হয়।

### ২. অস্থায়ী নিষেধাজ্ঞা মঞ্জুরের ৩টি স্বর্ণালী নীতি (Three Golden Principles):
আদালতকে সন্তুষ্ট করতে আবেদনকারীকে নিচের ৩টি বিষয় অকাট্যভাবে প্রমাণ করতে হয়:

1. **আপাতদৃষ্টে গ্রহণযোগ্য মামলা (Prima Facie Case):**
   বাদীকে প্রমাণ করতে হবে যে তার পক্ষে একটি শক্তিশালী এবং বিচারযোগ্য দাবি রয়েছে, যা প্রাথমিক নথিপত্র দ্বারা প্রতিষ্ঠিত।
2. **অপূরণীয় ক্ষতি (Irreparable Loss / Injury):**
   বাদীকে প্রমাণ করতে হবে যে নিষেধাজ্ঞা মঞ্জুর না করলে তার এমন মারাত্মক ক্ষতি হবে যা পরবর্তীতে অর্থ বা অন্য কোনো ক্ষতিপূরণ দ্বারা মেটানো সম্ভব নয়।
3. **সুবিধার ভারসাম্য (Balance of Convenience and Inconvenience):**
   আদালত তুলনা করে দেখবেন—নিষেধাজ্ঞা মঞ্জুর করলে বাদীর চেয়ে বিবাদীর ক্ষতির পরিমাণ বেশি হবে কি না। বাদীর সুরক্ষার প্রয়োজনীয়তা বিবাদীর অসুবিধার চেয়ে বেশি হতে হবে।

### ৩. আদেশ ৩৯ নিয়ম ১ বনাম নিয়ম ২ এর পার্থক্য
* **নিয়ম ১ (Rule 1):** সম্পত্তি অপচয় (Waste), ক্ষতিসাধন (Damage), হস্তান্তর (Alienation) বা অবৈধ ডিক্রি জারিতে বিক্রয় রোধে জারি করা হয়।
* **নিয়ম ২ (Rule 2):** চুক্তিভঙ্গ বা অন্য কোনো ক্ষতিসাধনের পুনরাবৃত্তি রোধ করতে জারি করা হয়।

### ৪. নিষেধাজ্ঞা লঙ্ঘনের শাস্তি (Order 39 Rule 2A)
আদালতের নিষেধাজ্ঞা ইচ্ছাকৃতভাবে অমান্য করলে:
1. সংশ্লিষ্ট ব্যক্তির সম্পত্তি ক্রোক (Attachment) করা যেতে পারে।
2. সর্বোচ্চ ৬ মাস মেয়াদে দেওয়ানী কারাগারে (Civil Prison) আটক রাখার আদেশ দেওয়া যেতে পারে।`
  },
  {
    id: 'note-bjs-crpc-sec-167',
    title: 'পুলিশ রিমান্ড ও ফৌজদারি কার্যবিধির ১৬৭ ধারা (CrPC Section 167): ম্যাজিস্ট্রেটের আইনি দায়িত্ব ও সতর্কতাসমূহ',
    slug: 'crpc-section-167-police-remand-magistrate-duties',
    category: 'ফৌজদারি কার্যবিধি (CrPC)',
    summary: 'ফৌজদারি কার্যবিধির ১৬৭ ধারায় পুলিশ রিমান্ড প্রদানের বিধান, ব্লাস্ট বনাম বাংলাদেশ (BLAST Case) রায়ের গাইডলাইন ও ম্যাজিস্ট্রেটের পর্যবেক্ষণ।',
    readTime: '৮ মিনিট',
    order: 3,
    lawSections: ['CrPC Section 167', 'CrPC Section 61', 'Constitution Article 33'],
    content: `## ১. ২৪ ঘণ্টার বিধান ও ১৬৭ ধারার উৎপত্তি
ফৌজদারি কার্যবিধির ৬১ ধারা এবং বাংলাদেশ সংবিধানের ৩৩(২) অনুচ্ছেদ অনুযায়ী:
> পুলিশ কোনো ব্যক্তিকে বিনা পরোয়ানায় গ্রেপ্তার করলে তাকে ২৪ ঘণ্টার মধ্যে (যাতায়াতের সময় বাদে) নিকটস্থ ম্যাজিস্ট্রেটের আদালতে হাজির করতে হবে।

যদি ২৪ ঘণ্টার মধ্যে তদন্ত সম্পন্ন করা অসম্ভব হয় এবং আসামির বিরুদ্ধে অভিযোগের উপযুক্ত ভিত্তি থাকে, তবে তদন্তকারী কর্মকর্তা (IO) ফৌজদারি কার্যবিধির ১৬৭ ধারায় আসামিকে পুলিশ হেফাজতে (Police Remand) চেয়ে আবেদন করতে পারেন।

### ২. রিমান্ড মঞ্জুরের সর্বোচ্চ সীমা
- ম্যাজিস্ট্রেটের ক্ষমতাবলে আসামিকে সর্বমোট **সর্বোচ্চ ১৫ দিন** পর্যন্ত পুলিশ হেফাজতে রিমান্ড মঞ্জুর করা যেতে পারে (CrPC 167(2))।
- তৃতীয় শ্রেণির ম্যাজিস্ট্রেট বা রিমান্ড দেওয়ার ক্ষমতাবিহীন নির্বাহী ম্যাজিস্ট্রেট রিমান্ড মঞ্জুর করতে পারেন না।

### ৩. ম্যাজিস্ট্রেটের বিচারিক দায়িত্ব (Judicial Scrutiny)
* রিমান্ড কোনো যান্ত্রিক বা রুটিনমাফিক আদেশ নয়; এটি একটি বিচার বিভাগীয় ক্ষমতা (Judicial Discretion)।
* ম্যাজিস্ট্রেটের দায়িত্ব:
  1. সিডি (Case Diary) পুঙ্খানুপুঙ্খভাবে পরীক্ষা করা।
  2. শুধু আসামির স্বীকারোক্তি আদায়ের জন্য রিমান্ড দেওয়া আইনত নিষিদ্ধ।
  3. কেন পুলিশ হেফাজত একান্ত জরুরি তা লিখিত আদেশে রেকর্ড করতে হবে (CrPC 167(3))।
  4. আদেশের একটি অনুলিপি অবিলম্বে দায়রা জজ (Sessions Judge)-এর নিকট প্রেরণ করতে হবে (CrPC 167(4))।

### ৪. ঐতিহাসিক ব্লাস্ট বনাম বাংলাদেশ রায় (BLAST Guidelines - 55 DLR 363)
সুপ্রিম কোর্টের আপিল বিভাগ রিমান্ডের ক্ষেত্রে যুগান্তকারী নির্দেশনা প্রদান করেছে:
1. রিমান্ডে নেওয়ার পূর্বে ও পরে আসামির শারীরিক পরীক্ষার (Medical Examination) প্রত্যয়নপত্র রাখতে হবে।
2. আসামির ওপর কোনো প্রকার শারীরিক বা মানসিক নির্যাতন (Torture) সম্পূর্ণ নিষিদ্ধ।
3. জিজ্ঞাসাবাদ কাঁচঘেরা কক্ষে আইনজীবীর উপস্থিতিতে দৃশ্যমান দূরত্বে পরিচালনা করতে হবে।`
  },
  {
    id: 'note-bjs-penal-code-406-420',
    title: 'অপরাধমূলক বিশ্বাসভঙ্গ (Section 405/406) বনাম প্রতারণা (Section 415/420): মৌলিক আইনি পার্থক্য ও উপাদান',
    slug: 'penal-code-criminal-breach-of-trust-vs-cheating',
    category: 'দণ্ডবিধি (Penal Code)',
    summary: 'দণ্ডবিধির ৪০৫/৪০৬ ধারা (বিশ্বাসভঙ্গ) এবং ৪১৫/৪২০ ধারা (প্রতারণা)-র মধ্যে সূক্ষ্ম পার্থক্য, উপাদান এবং BJS পরীক্ষার বাস্তবমুখী সমস্যা সমাধান।',
    readTime: '৫ মিনিট',
    order: 4,
    lawSections: ['Penal Code Section 405', 'Penal Code Section 406', 'Penal Code Section 415', 'Penal Code Section 420'],
    content: `## ১. অপরাধমূলক বিশ্বাসভঙ্গ (Criminal Breach of Trust - Section 405 & 406)
* **সংজ্ঞা (ধারা ৪০৫):** কোনো ব্যক্তির ওপর সম্পত্তি অর্পণ (Entrustment) করার পর সে যদি সেই সম্পত্তি অসদুপায়ে আত্মসাৎ করে, নিজের ব্যবহারে রূপান্তর করে, অথবা আইনের কোনো অনুশাসন লঙ্ঘন করে।
* **শাস্তি (ধারা ৪০৬):** সর্বোচ্চ ৩ বছর পর্যন্ত কারাদণ্ড, বা অর্থদণ্ড, বা উভয় দণ্ড।
* **মূল উপাদান:**
  - সম্পত্তির ক্ষেত্রে বৈধ অর্পণ (Entrustment) বা জিম্মাদারি।
  - প্রাথমিক অবস্থায় কোনো অসৎ উদ্দেশ্য ছিল না; উদ্দেশ্যটি পরবর্তীতে অসৎ (Dishonest) হয়েছে।

## ২. প্রতারণা (Cheating - Section 415 & 420)
* **সংজ্ঞা (ধারা ৪১৫):** কোনো ব্যক্তিকে মিথ্যা বা প্রতারণামূলক কথা বলে বিভ্রান্ত করে কোনো সম্পত্তি হস্তান্তরে প্ররোচিত করা।
* **শাস্তি (ধারা ৪২০):** সর্বোচ্চ ৭ বছর পর্যন্ত সশ্রম কারাদণ্ড এবং অর্থদণ্ড।
* **মূল উপাদান:**
  - সূচনা মুহূর্ত থেকেই অসৎ উদ্দেশ্য (Dishonest Intention from the very beginning)।
  - প্রতারিত ব্যক্তি যদি সত্য জানতো, তবে সে সম্পত্তি হস্তান্তর করতো না।

## ৩. টেবিল পার্থক্য (Quick Comparison)

| বৈশিষ্ট্যাবলি | অপরাধমূলক বিশ্বাসভঙ্গ (৪০৬ ধারা) | প্রতারণা (৪২০ ধারা) |
| :--- | :--- | :--- |
| **অসৎ উদ্দেশ্যের সূচনা** | সম্পত্তি পাওয়ার সময় উদ্দেশ্য সৎ ছিল, পরে আত্মসাতের ইচ্ছা জন্মে। | লেনদেনের একেবারে শুরু থেকেই অসৎ উদ্দেশ্য (Dishonest Intention) বিদ্যমান ছিল। |
| **অর্পণ (Entrustment)** | সম্পত্তিতে বাদীর পূর্ণ আস্থা ও স্বেচ্ছায় অর্পণ থাকে। | মিথ্যা আশ্বাস বা ফাঁদে ফেলে সম্পত্তি হাতিয়ে নেওয়া হয়। |
| **সর্বোচ্চ শাস্তি** | ৩ বছর পর্যন্ত কারাদণ্ড বা অর্থদণ্ড। | ৭ বছর পর্যন্ত সশ্রম কারাদণ্ড এবং অর্থদণ্ড। |`
  },
  {
    id: 'note-bjs-constitution-27-31',
    title: 'বাংলাদেশ সংবিধানের ২৭ ও ৩১ অনুচ্ছেদ: আইনের দৃষ্টিতে সমতা ও আইনের আশ্রয়লাভের অলঙ্ঘনীয় অধিকার',
    slug: 'constitution-article-27-and-31-equality-and-protection-of-law',
    category: 'বাংলাদেশ সংবিধান',
    summary: 'সংবিধানের মৌলিক অধিকারের মূল ভিত্তি ২৭ অনুচ্ছেদ (সমতা) এবং ৩১ অনুচ্ছেদ (আইনানুযায়ী বিচার পাওয়ার অধিকার)-এর বিশ্লেষণ ও কেস ল।',
    readTime: '৬ মিনিট',
    order: 5,
    lawSections: ['Constitution Article 27', 'Constitution Article 31', 'Constitution Article 102'],
    content: `## ১. অনুচ্ছেদ ২৭: আইনের দৃষ্টিতে সমতা (Equality Before Law)
সংবিধানের ২৭ অনুচ্ছেদে বলা হয়েছে:
> "সকল নাগরিক আইনের দৃষ্টিতে সমান এবং আইনের সমান আশ্রয় লাভের অধিকারী।"

### দুটি মৌলিক ধারণা:
1. **আইনের দৃষ্টিতে সমতা (Equality before law):**
   আইনের চোখে ধনী-দরিদ্র, ক্ষমতাধর বা সাধারণ নাগরিকের কোনো ভেদাভেদ নেই। কোনো ব্যক্তি আইনের ঊর্ধ্বে নয়।
2. **আইনের সমান আশ্রয়লাভের অধিকার (Equal protection of the laws):**
   সমজাতীয় পরিস্থিতিতে অবস্থানরত সকল ব্যক্তির প্রতি সমব্যবহার নিশ্চিত করা। আদালত যৌক্তিক শ্রেণিবিন্যাস (Reasonable Classification) অনুমোদন করে—তবে তা খামখেয়ালি বা পক্ষপাতমূলক হওয়া চলবে না।

## ২. অনুচ্ছেদ ৩১: আইনের আশ্রয়লাভের অলঙ্ঘনীয় অধিকার
সংবিধানের ৩১ অনুচ্ছেদে বলা হয়েছে:
> "আইনের আশ্রয়লাভ এবং আইনানুযায়ী ব্যবহারলাভ যেকোনো নাগরিকের এবং যেকোনো ক্ষেত্রে সাময়িকভাবে বাংলাদেশে অবস্থানরত ব্যক্তির অবিচ্ছেদ্য অধিকার।"

* **গুরুত্বপূর্ণ বৈশিষ্ট্য:** ২৭ অনুচ্ছেদ শুধু বাংলাদেশি "নাগরিক"-দের জন্য প্রযোজ্য হলেও ৩১ অনুচ্ছেদ বিদেশি নাগরিক বা বাংলাদেশে অবস্থানরত যেকোনো ব্যক্তির ক্ষেত্রেও প্রযোজ্য।
* জীবন, স্বাধীনতা, দেহ, খ্যাতি বা সম্পত্তির কোনো ক্ষতি আইনসঙ্গত প্রক্রিয়া (Due Process) ছাড়া করা যাবে না।`
  },
  {
    id: 'note-bjs-limitation-act-5-14',
    title: 'তামাদি আইন ১৯০৮ (Limitation Act 1908): তামাদি বিলম্ব মওকুফ (ধারা ৫) ও সরল বিশ্বাসে আদালতে মোকদ্দমা (ধারা ১৪)',
    slug: 'limitation-act-section-5-and-14-condonation-of-delay',
    category: 'তামাদি আইন (Limitation Act)',
    summary: 'তামাদি আইনের ৫ ধারা অনুযায়ী আপিল ও দরখাস্তের বিলম্ব মওকুফের শর্তাবলী এবং ১৪ ধারা অনুযায়ী ভুল আদালতে মোকদ্দমা দায়েরের সময় বাদ দেওয়ার নিয়ম।',
    readTime: '৬ মিনিট',
    order: 6,
    lawSections: ['Limitation Act Section 5', 'Limitation Act Section 14', 'Limitation Act Section 3'],
    content: `## ১. মূল তামাদি নীতি (Section 3)
তামাদি আইনের ৩ ধারা অত্যন্ত কঠোর। নির্ধারিত তামাদি মেয়াদ উত্তীর্ণ হওয়ার পর দায়েরকৃত যেকোনো মোকদ্দমা, আপিল বা দরখাস্ত আদালত খারিজ করতে বাধ্য—এমনকি বিবাদী তামাদির আপত্তি না তুললেও।

## ২. তামাদি বিলম্ব মওকুফ (Section 5 - Condonation of Delay)
তামাদি আইনের ৫ ধারা অনুসারে:
> কোনো আপিল বা দরখাস্ত দায়ের করার তামাদির মেয়াদ শেষ হওয়ার পর আদালত সন্তুষ্ট হলে তা গ্রহণ করতে পারেন, যদি আবেদনকারী প্রমাণ করতে পারেন যে তার যথাসময়ে আপিল বা দরখাস্ত দায়ের না করার পেছনে "যৌক্তিক কারণ" (Sufficient Cause) ছিল।

⚠️ **সবচেয়ে গুরুত্বপূর্ণ ব্যতিক্রম:**
* ৫ ধারা শুধুমাত্র **আপিল (Appeal)** এবং **দরখাস্ত (Application)**-এর ক্ষেত্রে প্রযোজ্য।
* কোনো **মূল মোকদ্দমা বা আরজি (Original Suit / Plaint)** দায়েরের ক্ষেত্রে ৫ ধারা কোনোভাবেই প্রযোজ্য নয়!

### ৩. ভুল আদালতে সময় ব্যয়ের প্রতিকার (Section 14)
* যদি কোনো পক্ষ সরল বিশ্বাসে (in good faith) এখতিয়ারহীন আদালতে মামলা বা আপিল পরিচালনা করে সময় ব্যয় করে, তবে সেই সময়কাল তামাদির মেয়াদ হিসাবের সময় সম্পূর্ণ বাদ (Excluded) দিতে হবে।`
  }
];

async function seedDefaultStudyNotes(Model) {
  try {
    const StudyNote = Model || require('../models/StudyNote');
    const count = await StudyNote.countDocuments();
    if (count === 0) {
      await StudyNote.insertMany(DEFAULT_BJS_NOTES);
      console.log('✓ Successfully seeded 6 high-yield BJS Study Notes!');
    }
  } catch (err) {
    console.warn('⚠️ Study notes seed notice:', err.message);
  }
}

/**
 * AI Auto-MCQ Generator using Gemini API and Lesson Transcript
 */
async function generateAiMcqsFromTranscript({
  courseId,
  lessonIds,
  questionCount = 10,
  durationMinutes = 20,
  negativeMarks = 0.25,
  Lesson,
  McqExam,
  resolveOptimalGeminiModel
}) {
  const query = {};
  if (Array.isArray(lessonIds) && lessonIds.length > 0) {
    query.id = { $in: lessonIds };
  } else if (courseId) {
    query.courseId = courseId;
  }

  const lessons = await Lesson.find(query).limit(5).lean();
  if (!lessons || lessons.length === 0) {
    throw new Error('কোনো ক্লাস ভিডিও বা লেকচার ডাটা পাওয়া যায়নি।');
  }

  // Combine transcripts
  const transcriptText = lessons
    .map(l => `[${l.title}]: ${l.transcript || l.subtitles || ''}`)
    .join('\n\n')
    .slice(0, 15000); // safe limit for prompt

  if (transcriptText.length < 50) {
    throw new Error('নির্বাচিত ক্লাসে পর্যাপ্ত সাবটাইটেল বা ট্রান্সক্রিপ্ট টেক্সট পাওয়া যায়নি।');
  }

  const prompt = `You are a Bangladesh Judicial Service (BJS) and Bar Council Senior Exam Expert.
Based on the following lecture transcript from BJS Academy, generate exactly ${questionCount} multiple choice questions (MCQ) in Bengali adhering strictly to BJS preliminary examination standards.

Each question must test conceptual understanding of Bangladesh law (Penal Code, CPC, CrPC, Evidence Act, Constitution, Family Law, etc.) discussed in the transcript.
Output ONLY a valid JSON array of objects with the exact schema:
[
  {
    "questionText": "প্রশ্ন...",
    "options": ["বিকল্প ক", "বিকল্প খ", "বিকল্প গ", "বিকল্প ঘ"],
    "correctIndex": 0,
    "explanation": "আইনি ধারা ও ব্যাখ্যামূলক বিশ্লেষণ..."
  }
]

Transcript:
${transcriptText}`;

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY কনফিগার করা নেই।');
  }

  const optimalModel = resolveOptimalGeminiModel ? resolveOptimalGeminiModel() : 'gemini-flash-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${optimalModel}:generateContent?key=${geminiApiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorText.slice(0, 150)}`);
  }

  const resData = await response.json();
  const textOutput = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const jsonMatch = textOutput.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (!jsonMatch) {
    throw new Error('Gemini থেকে সঠিক MCQ ফরম্যাট তৈরি করা যায়নি।');
  }

  const rawQuestions = JSON.parse(jsonMatch[0]);
  const formattedQuestions = rawQuestions.map((q, idx) => ({
    id: `q-ai-${Date.now()}-${idx + 1}`,
    questionText: q.questionText,
    options: Array.isArray(q.options) ? q.options.slice(0, 4) : ['ক', 'খ', 'গ', 'ঘ'],
    correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
    explanation: q.explanation || ''
  }));

  const courseTitle = lessons[0]?.chapter || lessons[0]?.courseId || 'BJS Law Masterclass';
  const newExamId = `EXAM-AI-${Date.now()}`;
  const newExam = await McqExam.create({
    id: newExamId,
    title: `AI মডেল টেস্ট: ${lessons[0]?.title || 'BJS স্পেশাল'} (${formattedQuestions.length} প্রশ্ন)`,
    courseId: courseId || lessons[0]?.courseId || '',
    courseTitle,
    subject: lessons[0]?.chapter || 'আইন প্রস্তুতি',
    durationMinutes: Number(durationMinutes) || 20,
    totalMarks: formattedQuestions.length,
    passPercentage: 50,
    isPublic: true,
    isLiveModelTest: false,
    negativeMarks: Number(negativeMarks) || 0.25,
    questions: formattedQuestions,
    createdBy: 'Gemini AI Auto-Generator'
  });

  return newExam;
}

/**
 * Get Leaderboard for an MCQ Exam
 */
async function getExamLeaderboard(param) {
  let examId;
  let McqExam;
  let McqResult;

  if (typeof param === 'string') {
    examId = param;
  } else if (param && typeof param === 'object') {
    examId = param.examId || param.id;
    McqExam = param.McqExam;
    McqResult = param.McqResult;
  }

  if (!McqExam) McqExam = require('../models/McqExam');
  if (!McqResult) McqResult = require('../models/McqResult');

  const isObjectId = mongoose.isValidObjectId(examId);
  const examQuery = isObjectId
    ? { $or: [{ id: examId }, { _id: examId }] }
    : { id: examId };

  const exam = await McqExam.findOne(examQuery).lean();
  if (!exam) {
    throw new Error('পরীক্ষা খুঁজে পাওয়া যায়নি।');
  }

  const resultQuery = isObjectId
    ? { $or: [{ examId: exam.id }, { examId: exam._id.toString() }, { examId: String(examId) }] }
    : { examId: exam.id || examId };

  const results = await McqResult.find(resultQuery)
    .sort({ netScore: -1, score: -1, timeTakenSeconds: 1, submittedAt: 1 })
    .limit(100)
    .lean();

  const leaderboard = results.map((r, idx) => ({
    rank: idx + 1,
    studentName: r.studentName || r.candidateName || 'পরীক্ষার্থী',
    candidateName: r.candidateName || r.studentName || 'পরীক্ষার্থী',
    candidateUniversity: r.candidateUniversity || 'BJS পরীক্ষার্থী',
    studentPhone: r.studentPhone ? r.studentPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '***',
    score: r.score,
    netScore: r.netScore !== undefined && r.netScore !== null ? r.netScore : r.score,
    totalMarks: r.totalMarks,
    correctCount: r.correctCount || Math.round(r.score),
    wrongCount: r.wrongCount || 0,
    negativeDeduction: r.negativeDeduction || 0,
    percentage: r.percentage,
    grade: r.grade,
    timeTakenSeconds: r.timeTakenSeconds || 0,
    submittedAt: r.submittedAt
  }));

  return {
    ok: true,
    exam: {
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      totalQuestions: exam.totalQuestions,
      fullMarks: exam.totalMarks,
      negativeMarks: exam.negativeMarks,
      isLiveModelTest: exam.isLiveModelTest || false,
      liveStartTime: exam.liveStartTime,
      liveEndTime: exam.liveEndTime
    },
    examTitle: exam.title,
    isLiveModelTest: exam.isLiveModelTest || false,
    liveStartTime: exam.liveStartTime,
    liveEndTime: exam.liveEndTime,
    totalParticipants: results.length,
    totalCandidates: results.length,
    leaderboard
  };
}

module.exports = {
  seedDefaultStudyNotes,
  generateAiMcqsFromTranscript,
  getExamLeaderboard,
  DEFAULT_BJS_NOTES
};
