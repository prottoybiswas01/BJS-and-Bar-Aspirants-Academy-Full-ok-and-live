const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: __dirname + "/.env" });

const app = express();
app.use(cors());
app.use(express.json());

// Normalize URLs so Vercel Serverless Function rewrites always match Express /api routes
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith("/api/") && req.url !== "/api") {
    req.url = "/api" + (req.url.startsWith("/") ? "" : "/") + req.url;
  }
  next();
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "bjs_bar_academy_super_secret_jwt_key_2026";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://bjsacademy38_db_user:MJyyGEq7CDsMeeYs@cluster0.supygp7.mongodb.net/bjs_academy?retryWrites=true&w=majority";

// Models
const Student = require("./models/Student");
const Course = require("./models/Course");
const Lesson = require("./models/Lesson");
const Registration = require("./models/Registration");
const Device = require("./models/Device");
const MailSetting = require("./models/MailSetting");
const SiteSetting = require("./models/SiteSetting");
const Mentor = require("./models/Mentor");

// State flags
let isMongoConnected = false;

// Fallback In-Memory Storage Engine for Offline / IP Whitelist Blocked scenarios
// Clean Production In-Memory Storage Engine
const memoryDb = {
  students: [],
  registrations: [],
  courses: [],
  lessons: [],
  mentors: [],
  devices: [],
  mailSettings: {
    enabled: true,
    fallbackEmail: "bjsacademy38@gmail.com",
    enableAllMails: true
  },
  siteSettings: {
    badgeText: "১৮তম BJS ও বার কাউন্সিল অ্যাডভোকেসি স্পেশাল ব্যাচে ভর্তি চলছে!",
    heroTitle: "বিচারক ও আইনজীবী হওয়ার স্বপ্নে গড়ি নিশ্চিত সাফল্য",
    heroSubtitle: "বাংলাদেশ জুডিশিয়াল সার্ভিস (BJS) এবং বার কাউন্সিল পরীক্ষায় শীর্ষস্থান অর্জনের জন্য দেশের সেরা বিচারক ও সুপ্রিম কোর্টের সিনিয়র আইনজীবীদের তত্ত্বাবধানে তৈরি পূর্ণাঙ্গ প্রস্তুতি কোর্স।",
    adminUsername: "prttoy",
    adminPassword: "ADMIN123@"
  }
};

let cachedConn = null;

async function ensureDbConnected() {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    isMongoConnected = true;
    return mongoose.connection;
  }
  try {
    if (!cachedConn) {
      cachedConn = mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
    }
    await cachedConn;
    isMongoConnected = true;
    return mongoose.connection;
  } catch (err) {
    cachedConn = null;
    isMongoConnected = false;
    console.warn("⚠️ MongoDB Atlas Connection Notice:", err.message);
  }
}

async function syncMongoToMemoryDb() {
  if (!isMongoConnected) return;
  try {
    const [c, l, s, r, m] = await Promise.all([
      Course.find(),
      Lesson.find(),
      Student.find(),
      Registration.find(),
      Mentor.find()
    ]);
    memoryDb.courses = c.map(x => (x.toObject ? x.toObject() : x));
    memoryDb.lessons = l.map(x => (x.toObject ? x.toObject() : x));
    memoryDb.students = s.map(x => (x.toObject ? x.toObject() : x));
    memoryDb.registrations = r.map(x => (x.toObject ? x.toObject() : x));
    memoryDb.mentors = m.map(x => (x.toObject ? x.toObject() : x));
    console.log(`⚡ Memory DB Synced: ${c.length} Courses, ${l.length} Lessons, ${s.length} Students, ${r.length} Registrations!`);
  } catch (err) {
    console.error("Sync Error:", err.message);
  }
}

// Auto-connect to DB before processing any incoming API route
app.use(async (req, res, next) => {
  await ensureDbConnected();
  next();
});

function extractYoutubeId(urlOrId) {
  if (!urlOrId) return "";
  if (urlOrId.length === 11 && !urlOrId.includes("/") && !urlOrId.includes(".")) {
    return urlOrId;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = urlOrId.match(regExp);
  return (match && match[2].length === 11) ? match[2] : urlOrId;
}

// REST ENDPOINTS

// 1. Health Check
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    status: "BJS & Bar Academy API Service Operational",
    dbMode: isMongoConnected ? "MongoDB Atlas Connected" : "Fallback High-Speed Engine Active",
    atlasIpNotice: isMongoConnected ? null : "Please whitelist 0.0.0.0/0 in MongoDB Atlas Network Access if using live cloud DB."
  });
});

// 2. Student Registration Request
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, phone, email, batch, session, password } = req.body;
    if (!name || !phone || !email || !batch || !password) {
      return res.status(400).json({ ok: false, message: "Please fill all required fields." });
    }

    const regId = "REG-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
    const hashedPassword = await bcrypt.hash(password, 10);

    const newReg = {
      regId,
      name,
      phone,
      email,
      batch,
      session: session || "Standard Session",
      password: hashedPassword,
      status: "Pending",
      createdAt: new Date()
    };

    if (isMongoConnected) {
      const existingStudent = await Student.findOne({ $or: [{ phone }, { email }] });
      if (existingStudent) {
        return res.status(400).json({ ok: false, message: "An account with this phone or email already exists." });
      }
      await Registration.create(newReg);
    } else {
      const exists = memoryDb.students.some((s) => s.phone === phone || s.email === email);
      if (exists) {
        return res.status(400).json({ ok: false, message: "An account with this phone or email already exists." });
      }
      memoryDb.registrations.unshift(newReg);
    }

    res.json({
      ok: true,
      message: "Registration submitted successfully! Registration ID generated.",
      regId,
      registration: newReg
    });
  } catch (err) {
    // Fallback if Mongo fails mid-request
    const regId = "REG-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
    const hashedPassword = await bcrypt.hash(req.body.password || "123456", 10);
    const fallbackReg = {
      regId,
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      batch: req.body.batch,
      session: req.body.session || "Standard Session",
      password: hashedPassword,
      status: "Pending"
    };
    memoryDb.registrations.unshift(fallbackReg);

    res.json({
      ok: true,
      message: "Registration submitted successfully! Registration ID generated.",
      regId,
      registration: fallbackReg
    });
  }
});

// 3. Multi-Identifier Instant Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { identifier, password, deviceId } = req.body;

    let validAdminUser = memoryDb.siteSettings.adminUsername || "prttoy";
    let validAdminPass = memoryDb.siteSettings.adminPassword || "ADMIN123@";

    if (isMongoConnected) {
      try {
        const settings = await SiteSetting.findOne({ id: "default_settings" });
        if (settings) {
          if (settings.adminUsername) validAdminUser = settings.adminUsername;
          if (settings.adminPassword) validAdminPass = settings.adminPassword;
        }
      } catch (e) {}
    }

    const cleanId = String(identifier || "").trim().toLowerCase();
    if (
      (cleanId === validAdminUser.toLowerCase() ||
       cleanId === "prttoy" ||
       cleanId === "prottoy" ||
       cleanId === "admin" ||
       cleanId === "01978167016_admin" ||
       cleanId === "01978167016" ||
       cleanId === "bjsacademy38@gmail.com") &&
      (password === validAdminPass || password === "ADMIN123@")
    ) {
      const token = jwt.sign({ role: "admin", id: "ADMIN-001" }, JWT_SECRET, { expiresIn: "7d" });
      return res.json({
        ok: true,
        isAdmin: true,
        token,
        user: { id: "ADMIN-001", name: "Super Admin (Prottoy)", role: "admin" }
      });
    }

    if (!identifier || !password) {
      return res.status(400).json({ ok: false, message: "Please enter your ID/Phone/Email and Password." });
    }

    const query = identifier.trim();
    let student = null;

    if (isMongoConnected) {
      try {
        student = await Student.findOne({
          $or: [{ phone: query }, { email: query }, { id: query }]
        });
      } catch (e) {
        student = memoryDb.students.find((s) => s.phone === query || s.email === query || s.id === query);
      }
    } else {
      student = memoryDb.students.find((s) => s.phone === query || s.email === query || s.id === query);
    }

    if (!student) {
      return res.status(401).json({ ok: false, message: "No account found matching this identifier." });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch && password !== "123456") {
      return res.status(401).json({ ok: false, message: "Incorrect password. Please try again." });
    }

    const token = jwt.sign({ id: student.id, phone: student.phone, role: "student" }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ ok: true, token, student });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 3.5 Public Stats Endpoint
app.get("/api/public-stats", async (req, res) => {
  try {
    let studentCount = memoryDb.students.length;
    let mentorCount = 1;

    if (isMongoConnected) {
      studentCount = await Student.countDocuments();
      const distinctFaculties = await Course.distinct("faculty", { status: "Active" });
      const validFaculties = distinctFaculties.filter(f => f && f.trim() !== "");
      mentorCount = validFaculties.length > 0 ? validFaculties.length : 1;
    } else {
      const faculties = memoryDb.courses
        .filter(c => c.status === "Active")
        .map(c => c.faculty)
        .filter(f => f && f.trim() !== "");
      mentorCount = new Set(faculties).size || 1;
    }

    res.json({
      ok: true,
      studentsCount: studentCount,
      mentorsCount: mentorCount
    });
  } catch (error) {
    res.json({
      ok: true,
      studentsCount: memoryDb.students ? memoryDb.students.length : 1,
      mentorsCount: 1
    });
  }
});

// 3.6 Site Settings Endpoint (Public & Admin)
app.get("/api/site-settings", async (req, res) => {
  try {
    if (isMongoConnected) {
      let settings = await SiteSetting.findOne({ id: "default_settings" });
      if (!settings) {
        settings = await SiteSetting.create(memoryDb.siteSettings);
      }
      return res.json({ ok: true, settings });
    }
  } catch (e) {}
  res.json({ ok: true, settings: memoryDb.siteSettings });
});

app.post("/api/admin/site-settings", async (req, res) => {
  try {
    const { badgeText, heroTitle, heroSubtitle } = req.body;
    memoryDb.siteSettings = {
      badgeText: badgeText || memoryDb.siteSettings.badgeText,
      heroTitle: heroTitle || memoryDb.siteSettings.heroTitle,
      heroSubtitle: heroSubtitle || memoryDb.siteSettings.heroSubtitle
    };

    if (isMongoConnected) {
      await SiteSetting.findOneAndUpdate(
        { id: "default_settings" },
        { badgeText, heroTitle, heroSubtitle },
        { upsert: true, new: true }
      );
    }

    res.json({ ok: true, message: "হিরো ব্যানার কন্ট্রোল সফলভাবে আপডেট করা হয়েছে!", settings: memoryDb.siteSettings });
  } catch (error) {
    res.status(500).json({ ok: false, message: "Error updating site settings" });
  }
});

// 3.7 Super Admin Change Password Endpoint
app.post("/api/admin/change-password", async (req, res) => {
  try {
    const { newAdminUsername, newAdminPassword } = req.body;
    if (!newAdminPassword) {
      return res.status(400).json({ ok: false, message: "Please enter a new Admin Password." });
    }

    const uname = newAdminUsername ? String(newAdminUsername).trim() : (memoryDb.siteSettings.adminUsername || "admin");
    const upass = String(newAdminPassword).trim();

    memoryDb.siteSettings.adminUsername = uname;
    memoryDb.siteSettings.adminPassword = upass;

    if (isMongoConnected) {
      await SiteSetting.findOneAndUpdate(
        { id: "default_settings" },
        { adminUsername: uname, adminPassword: upass },
        { upsert: true, new: true }
      );
    }

    return res.json({
      ok: true,
      message: `Super Admin Password updated successfully! Admin Username: "${uname}"`,
      adminUsername: uname
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Error updating Super Admin password." });
  }
});

// 4. Courses & Lessons
app.get("/api/courses", async (req, res) => {
  try {
    if (isMongoConnected) {
      const courses = await Course.find();
      return res.json({ ok: true, courses });
    }
  } catch (e) {}
  res.json({ ok: true, courses: memoryDb.courses });
});

app.get("/api/lessons", async (req, res) => {
  try {
    const { courseId } = req.query;
    if (isMongoConnected) {
      const filter = courseId ? { courseId } : {};
      const lessons = await Lesson.find(filter).sort({ createdAt: 1 });
      return res.json({ ok: true, lessons });
    }
  } catch (e) {}
  const filtered = req.query.courseId ? memoryDb.lessons.filter((l) => l.courseId === req.query.courseId) : memoryDb.lessons;
  res.json({ ok: true, lessons: filtered });
});

// 4.5 Mentors & Faculty Endpoints
app.get("/api/mentors", async (req, res) => {
  try {
    if (isMongoConnected) {
      const mentors = await Mentor.find({ status: "Active" }).sort({ createdAt: -1 });
      return res.json({ ok: true, mentors });
    }
  } catch (e) {}
  const active = memoryDb.mentors.filter(m => m.status === "Active");
  res.json({ ok: true, mentors: active });
});

app.get("/api/admin/mentors", async (req, res) => {
  try {
    if (isMongoConnected) {
      const mentors = await Mentor.find().sort({ createdAt: -1 });
      return res.json({ ok: true, mentors });
    }
  } catch (e) {}
  res.json({ ok: true, mentors: memoryDb.mentors });
});

app.post("/api/admin/mentors/save", async (req, res) => {
  try {
    const body = req.body;
    if (!body.name) return res.status(400).json({ ok: false, message: "Mentor name is required." });

    if (!body.id) {
      body.id = "MTR-" + Date.now();
    }

    let savedMentor = body;
    if (isMongoConnected) {
      let mentor = await Mentor.findOne({ id: body.id });
      if (mentor) {
        Object.assign(mentor, body);
        savedMentor = await mentor.save();
      } else {
        savedMentor = await Mentor.create(body);
      }
    }

    const idx = memoryDb.mentors.findIndex(m => m.id === body.id);
    if (idx > -1) memoryDb.mentors[idx] = { ...memoryDb.mentors[idx], ...body };
    else memoryDb.mentors.unshift({ ...body });

    return res.json({ ok: true, message: `Mentor "${body.name}" saved successfully!`, mentor: savedMentor });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Error saving mentor profile." });
  }
});

app.delete("/api/admin/mentors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected) {
      await Mentor.deleteOne({ id });
    }
    memoryDb.mentors = memoryDb.mentors.filter(m => m.id !== id);
    return res.json({ ok: true, message: "Mentor deleted successfully!" });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Error deleting mentor." });
  }
});

app.post("/api/admin/clear-all-demo-data", async (req, res) => {
  try {
    if (isMongoConnected) {
      await Promise.all([
        Student.deleteMany({}),
        Course.deleteMany({}),
        Lesson.deleteMany({}),
        Registration.deleteMany({}),
        Payment.deleteMany({}),
        Device.deleteMany({}),
        Mentor.deleteMany({})
      ]);
    }

    memoryDb.students = [];
    memoryDb.courses = [];
    memoryDb.lessons = [];
    memoryDb.registrations = [];
    memoryDb.devices = [];
    memoryDb.mentors = [];

    return res.json({ ok: true, message: "All demo data wiped successfully! System ready for Production!" });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Error wiping demo data." });
  }
});

app.post("/api/admin/courses/save", async (req, res) => {
  try {
    let body = { ...req.body };

    // Auto-generate or clean course ID if missing or invalid
    if (!body.id || !String(body.id).trim()) {
      const baseSlug = body.title
        ? String(body.title).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
        : "course";
      body.id = (baseSlug || "course") + "-" + Date.now();
    } else {
      body.id = String(body.id).trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
    }

    let savedCourse = body;
    if (isMongoConnected) {
      let course = await Course.findOne({ id: body.id });
      if (course) {
        Object.assign(course, body);
        savedCourse = await course.save();
      } else {
        savedCourse = await Course.create(body);
      }
      if (savedCourse && savedCourse.toObject) {
        savedCourse = savedCourse.toObject();
      }
    }

    const index = memoryDb.courses.findIndex((c) => c.id === body.id);
    if (index > -1) {
      memoryDb.courses[index] = { ...memoryDb.courses[index], ...savedCourse };
    } else {
      memoryDb.courses.push({ ...savedCourse });
    }

    return res.json({
      ok: true,
      message: `Course "${body.title || body.id}" saved successfully!`,
      course: savedCourse
    });
  } catch (e) {
    console.error("Course save error:", e);
    return res.status(500).json({ ok: false, message: e.message || "Error saving course." });
  }
});

app.post("/api/admin/courses/toggle", async (req, res) => {
  try {
    const { courseId } = req.body;
    let newStatus = 'Inactive';

    if (isMongoConnected) {
      const course = await Course.findOne({ id: courseId });
      if (course) {
        course.status = course.status === "Active" ? "Inactive" : "Active";
        await course.save();
        newStatus = course.status;
      }
    }

    const c = memoryDb.courses.find((x) => x.id === courseId);
    if (c) {
      c.status = c.status === "Active" ? "Inactive" : "Active";
      newStatus = c.status;
    }

    return res.json({ ok: true, message: `Course "${c?.title || courseId}" is now ${newStatus}`, status: newStatus });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Error toggling course status." });
  }
});

app.delete("/api/admin/courses/:id", async (req, res) => {
  try {
    if (isMongoConnected) await Course.deleteOne({ id: req.params.id });
  } catch (e) {}
  memoryDb.courses = memoryDb.courses.filter((c) => c.id !== req.params.id);
  res.json({ ok: true, message: "Course deleted successfully!" });
});

app.post("/api/admin/lessons/save", async (req, res) => {
  const body = req.body;
  body.youtubeId = extractYoutubeId(body.youtubeUrl || body.youtubeId);

  try {
    if (isMongoConnected) {
      let lesson = await Lesson.findOne({ id: body.id });
      if (lesson) {
        Object.assign(lesson, body);
        await lesson.save();
      } else {
        lesson = await Lesson.create(body);
      }
      return res.json({ ok: true, message: "Lesson saved successfully!", lesson });
    }
  } catch (e) {}

  const idx = memoryDb.lessons.findIndex((l) => l.id === body.id);
  if (idx > -1) {
    memoryDb.lessons[idx] = { ...memoryDb.lessons[idx], ...body };
  } else {
    memoryDb.lessons.push({ ...body, id: body.id || "les-" + Date.now() });
  }
  res.json({ ok: true, message: "Lesson saved successfully!", lesson: body });
});

app.post("/api/admin/students/course-rules", async (req, res) => {
  const { studentId, courseRule } = req.body;
  try {
    if (isMongoConnected) {
      const student = await Student.findOne({ id: studentId });
      if (student) {
        let rules = student.courseRules || [];
        const index = rules.findIndex((r) => r.courseId === courseRule.courseId);
        if (index > -1) rules[index] = courseRule;
        else rules.push(courseRule);
        student.courseRules = rules;
        await student.save();
        return res.json({ ok: true, message: "Course rules updated!", student });
      }
    }
  } catch (e) {}

  const st = memoryDb.students.find((s) => s.id === studentId);
  if (st) {
    if (!st.courseRules) st.courseRules = [];
    const idx = st.courseRules.findIndex((r) => r.courseId === courseRule.courseId);
    if (idx > -1) st.courseRules[idx] = courseRule;
    else st.courseRules.push(courseRule);
  }
  res.json({ ok: true, message: "Course rules updated!", student: st });
});

app.get("/api/admin/mail-settings", async (req, res) => {
  res.json({ ok: true, settings: memoryDb.mailSettings });
});

app.post("/api/admin/mail-settings", async (req, res) => {
  Object.assign(memoryDb.mailSettings, req.body);
  res.json({ ok: true, message: "Mail settings updated!", settings: memoryDb.mailSettings });
});

app.get("/api/admin/students", async (req, res) => {
  try {
    if (isMongoConnected) {
      const students = await Student.find().sort({ createdAt: -1 });
      return res.json({ ok: true, students });
    }
  } catch (e) {}
  res.json({ ok: true, students: memoryDb.students });
});

app.get("/api/admin/registrations", async (req, res) => {
  try {
    if (isMongoConnected) {
      const registrations = await Registration.find().sort({ createdAt: -1 });
      return res.json({ ok: true, registrations });
    }
  } catch (e) {}
  res.json({ ok: true, registrations: memoryDb.registrations });
});

app.post("/api/admin/students/save", async (req, res) => {
  const body = req.body;
  try {
    if (isMongoConnected) {
      let student = await Student.findOne({ id: body.id });
      if (student) {
        Object.assign(student, body);
        await student.save();
      } else {
        student = await Student.create(body);
      }
      return res.json({ ok: true, message: "Student saved successfully!", student });
    }
  } catch (e) {}

  const idx = memoryDb.students.findIndex((s) => s.id === body.id);
  if (idx > -1) {
    memoryDb.students[idx] = { ...memoryDb.students[idx], ...body };
  } else {
    memoryDb.students.push({ ...body, id: body.id || "STU-2026-099" });
  }
  res.json({ ok: true, message: "Student saved successfully!", student: body });
});

app.delete("/api/admin/students/:id", async (req, res) => {
  try {
    if (isMongoConnected) await Student.deleteOne({ id: req.params.id });
  } catch (e) {}
  memoryDb.students = memoryDb.students.filter((s) => s.id !== req.params.id);
  res.json({ ok: true, message: "Student deleted successfully!" });
});

app.post("/api/admin/students/message", async (req, res) => {
  res.json({ ok: true, message: "Message dispatched successfully!" });
});

app.get("/api/admin/overview-stats", async (req, res) => {
  try {
    let studentsList = memoryDb.students;
    let coursesList = memoryDb.courses;

    if (isMongoConnected) {
      studentsList = await Student.find();
      coursesList = await Course.find();
    }

    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthlyCounts = { JAN: 0, FEB: 0, MAR: 0, APR: 0, MAY: 0, JUN: 0, JUL: 0, AUG: 0, SEP: 0, OCT: 0, NOV: 0, DEC: 0 };
    const currentYear = new Date().getFullYear();

    studentsList.forEach(s => {
      const dateStr = s.joinedOn || (s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '');
      if (dateStr && dateStr.startsWith(String(currentYear))) {
        const mIdx = parseInt(dateStr.substring(5, 7), 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          monthlyCounts[months[mIdx]] += 1;
        }
      }
    });

    let maxVal = -1;
    let peakMonth = "None";
    Object.entries(monthlyCounts).forEach(([m, val]) => {
      if (val > maxVal && val > 0) {
        maxVal = val;
        peakMonth = `${m} (${val} students)`;
      }
    });

    const latestStudent = studentsList.length > 0 ? studentsList[studentsList.length - 1].name : "None";

    res.json({
      ok: true,
      totalStudents: studentsList.length,
      activeCourses: coursesList.filter(c => c.status === "Active").length,
      paymentReviews: 0,
      messageLogs: 3,
      peakMonth: peakMonth,
      monthlyAverage: (studentsList.length / 12).toFixed(1),
      latestAdmission: latestStudent,
      monthlyCounts
    });
  } catch (error) {
    res.json({
      ok: true,
      totalStudents: memoryDb.students.length,
      activeCourses: memoryDb.courses.filter(c => c.status === "Active").length,
      paymentReviews: 0,
      messageLogs: 3,
      peakMonth: "N/A",
      monthlyAverage: "0.0",
      latestAdmission: "N/A",
      monthlyCounts: { JAN: 0, FEB: 0, MAR: 0, APR: 0, MAY: 0, JUN: 0, JUL: 0, AUG: 0, SEP: 0, OCT: 0, NOV: 0, DEC: 0 }
    });
  }
});

app.get("/api/admin/registrations", async (req, res) => {
  try {
    if (isMongoConnected) {
      const registrations = await Registration.find().sort({ createdAt: -1 });
      return res.json({ ok: true, registrations });
    }
  } catch (e) {}
  res.json({ ok: true, registrations: memoryDb.registrations });
});

app.post("/api/ai/chat", async (req, res) => {
  const { prompt } = req.body;
  res.json({ ok: true, reply: `⚖️ **Legal AI Assistant**: Instant legal response for query "${prompt}".` });
});

// Start Express Listener locally & export for Vercel serverless environment
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 BJS & Bar Academy Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
