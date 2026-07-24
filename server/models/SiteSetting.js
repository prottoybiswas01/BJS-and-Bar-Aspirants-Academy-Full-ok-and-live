const mongoose = require("mongoose");

const siteSettingSchema = new mongoose.Schema({
  id: { type: String, default: "default_settings", unique: true },
  badgeText: { 
    type: String, 
    default: "১৮তম BJS ও বার কাউন্সিল অ্যাডভোকেসি স্পেশাল ব্যাচে ভর্তি চলছে!" 
  },
  heroTitle: { 
    type: String, 
    default: "বিচারক ও আইনজীবী হওয়ার স্বপ্নে গড়ি নিশ্চিত সাফল্য" 
  },
  heroSubtitle: { 
    type: String, 
    default: "বাংলাদেশ জুডিশিয়াল সার্ভিস (BJS) এবং বার কাউন্সিল পরীক্ষায় শীর্ষস্থান অর্জনের জন্য দেশের সেরা বিচারক ও সুপ্রিম কোর্টের সিনিয়র আইনজীবীদের তত্ত্বাবধানে তৈরি পূর্ণাঙ্গ প্রস্তুতি কোর্স।" 
  },
  adminUsername: { type: String, default: "prttoy" },
  adminPassword: { type: String, default: "ADMIN123@" }
}, { timestamps: true });

module.exports = mongoose.model("SiteSetting", siteSettingSchema);
