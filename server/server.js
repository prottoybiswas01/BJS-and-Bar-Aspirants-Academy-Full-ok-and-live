const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: __dirname + "/.env" });

const Student = require("./models/Student");
const Course = require("./models/Course");
const Lesson = require("./models/Lesson");
const Registration = require("./models/Registration");
const Payment = require("./models/Payment");
const Device = require("./models/Device");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "bjs_bar_academy_super_secret_jwt_key_2026";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://bjsacademy38_db_user:MJyyGEq7CDsMeeYs@cluster0.supygp7.mongodb.net/bjs_academy?retryWrites=true&w=majority";

// MongoDB Connection
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ Successfully connected to MongoDB Atlas (bjs_academy)");
    seedInitialData();
  })
  .catch((err) => {
    console.error("❌ MongoDB Atlas Connection Error:", err.message);
  });

// Seed Initial Data Helper
async function seedInitialData() {
  try {
    const courseCount = await Course.countDocuments();
    if (courseCount === 0) {
      console.log("🌱 Seeding initial courses & lessons...");
      const demoCourses = [
        {
          id: "bjs-judiciary-intensive",
          title: "18th BJS Preliminary & Written Intensive Course",
          shortTitle: "18th BJS Intensive",
          faculty: "Senior Judicial Officers & Top Rankers",
          category: "Judiciary",
          schedule: "Fri & Sat (8:00 PM)",
          nextLive: "Friday, 8:00 PM",
          price: "15000",
          description: "Complete preparation for Bangladesh Judicial Service exam including CPC, CrPC, Penal Code, Evidence Act & Specific Relief Act.",
          status: "Active"
        },
        {
          id: "bar-council-advocacy",
          title: "Bar Council Enrolment Masterclass 2026",
          shortTitle: "Bar Council Prep",
          faculty: "Advocates, Supreme Court of Bangladesh",
          category: "Bar Council",
          schedule: "Mon & Wed (9:00 PM)",
          nextLive: "Monday, 9:00 PM",
          price: "10000",
          description: "Comprehensive MCQ & Written preparation for Bar Council Advocacy examination with mock tests.",
          status: "Active"
        },
        {
          id: "civil-laws-deep-dive",
          title: "Civil Laws Special Module (CPC & SRA)",
          shortTitle: "Civil Laws Module",
          faculty: "Barrister At Law",
          category: "Specialized",
          schedule: "Sunday (7:30 PM)",
          nextLive: "Sunday, 7:30 PM",
          price: "6000",
          description: "Master Code of Civil Procedure 1908 and Specific Relief Act 1877 with practical case law studies.",
          status: "Active"
        }
      ];

      await Course.insertMany(demoCourses);

      const demoLessons = [
        {
          id: "les-bjs-01",
          courseId: "bjs-judiciary-intensive",
          module: "Module 1: Code of Civil Procedure (CPC 1908)",
          title: "Lecture 01: Scope, Jurisdiction of Courts & Res Sub-Judice (Sec 9-11)",
          duration: "52min",
          youtubeId: "dQw4w9WgXcQ", // Demo video ID
          releaseDate: "2026-07-01",
          resources: ["Handnote_CPC_Sec9_11.pdf", "Mock_Questions_Set1.pdf"],
          description: "Detailed analysis of Jurisdiction, Section 9 (Civil Nature), Section 10 (Res Sub-Judice) & Section 11 (Res Judicata)."
        },
        {
          id: "les-bjs-02",
          courseId: "bjs-judiciary-intensive",
          module: "Module 1: Code of Civil Procedure (CPC 1908)",
          title: "Lecture 02: Suits by or against Government & Injunctions (Order 39)",
          duration: "48min",
          youtubeId: "L_LUpnjgPso",
          releaseDate: "2026-07-08",
          resources: ["Injunctions_Order39_Notes.pdf"],
          description: "Temporary and Permanent Injunctions under Order 39 & SRA Section 52-57."
        },
        {
          id: "les-bjs-03",
          courseId: "bjs-judiciary-intensive",
          module: "Module 2: Code of Criminal Procedure (CrPC 1898)",
          title: "Lecture 03: Cognizable vs Non-Cognizable Offences & FIR (Sec 154)",
          duration: "60min",
          youtubeId: "3JZ_D3ELwOQ",
          releaseDate: "2026-07-15",
          resources: ["CrPC_FIR_Investigation.pdf"],
          description: "Procedure of Investigation, FIR recording, and Police Report under Section 173."
        },
        {
          id: "les-bjs-04",
          courseId: "bjs-judiciary-intensive",
          module: "Module 2: Code of Criminal Procedure (CrPC 1898)",
          title: "Lecture 04: Bail Provisions & Anticipatory Bail (Sec 496-498)",
          duration: "45min",
          youtubeId: "", // Pending video demo
          releaseDate: "2026-07-28",
          resources: ["Bail_Law_Analysis.pdf"],
          description: "Bailable vs Non-bailable offences and High Court Division's inherent jurisdiction under Sec 498."
        },
        {
          id: "les-bar-01",
          courseId: "bar-council-advocacy",
          module: "Module 1: Evidence Act 1872",
          title: "Lecture 01: Relevancy of Facts, Admissions & Confessions (Sec 5-31)",
          duration: "55min",
          youtubeId: "2g811KoJBUo",
          releaseDate: "2026-07-02",
          resources: ["Evidence_Act_Sec5_31.pdf"],
          description: "Confession to police officer (Sec 25-27) and Judicial Confession under Sec 164 CrPC."
        }
      ];

      await Lesson.insertMany(demoLessons);
      console.log("✅ Seeded initial courses and lessons.");
    }

    // Seed Demo Student if not exists
    const demoStudent = await Student.findOne({ phone: "01978167016" });
    if (!demoStudent) {
      const hashedPassword = await bcrypt.hash("123456", 10);
      await Student.create({
        id: "STU-2026-001",
        name: "Prottoy Kumar Biswas",
        phone: "01978167016",
        email: "prottoy@gmail.com",
        batch: "Judiciary 2026",
        session: "Weekend Intensive (Fri & Sat)",
        password: hashedPassword,
        status: "Active",
        loginApproval: "Approved",
        portalAccessMode: "Full Access",
        enrolledCourseIds: ["bjs-judiciary-intensive", "bar-council-advocacy"],
        completedLessonIds: ["les-bjs-01"],
        maxDeviceCount: 2
      });
      console.log("✅ Seeded demo student (Phone: 01978167016 / Pass: 123456)");
    }
  } catch (err) {
    console.error("Error seeding initial data:", err.message);
  }
}

// REST ENDPOINTS

// 1. Health Check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, status: "BJS & Bar Academy API Service Operational", time: new Date().toISOString() });
});

// 2. Student Registration Request
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, phone, email, batch, session, password } = req.body;

    if (!name || !phone || !email || !batch || !password) {
      return res.status(400).json({ ok: false, message: "Please fill all required fields." });
    }

    const existingStudent = await Student.findOne({ $or: [{ phone }, { email }] });
    if (existingStudent) {
      return res.status(400).json({ ok: false, message: "An account with this phone or email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const regId = "REG-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);

    const reg = await Registration.create({
      regId,
      name,
      phone,
      email,
      batch,
      session: session || "Standard Session",
      password: hashedPassword,
      status: "Pending"
    });

    res.json({
      ok: true,
      message: "Registration submitted successfully! Please wait for Admin approval.",
      regId: reg.regId,
      registration: reg
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 3. Multi-Identifier Instant Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { identifier, password, deviceId, platform, browser } = req.body;

    // Special Admin Login Check
    if ((identifier === "admin" || identifier === "01978167016_admin") && password === "admin123") {
      const token = jwt.sign({ role: "admin", id: "ADMIN-001" }, JWT_SECRET, { expiresIn: "7d" });
      return res.json({
        ok: true,
        isAdmin: true,
        token,
        user: { id: "ADMIN-001", name: "Academy Admin", role: "admin" }
      });
    }

    if (!identifier || !password) {
      return res.status(400).json({ ok: false, message: "Please enter your ID/Phone/Email and Password." });
    }

    const query = identifier.trim();
    const student = await Student.findOne({
      $or: [{ phone: query }, { email: query }, { id: query }]
    });

    if (!student) {
      // Check if registration pending
      const pendingReg = await Registration.findOne({
        $or: [{ phone: query }, { email: query }, { regId: query }]
      });

      if (pendingReg) {
        return res.status(401).json({
          ok: false,
          message: `Your registration (${pendingReg.regId}) is currently ${pendingReg.status}. Please contact Admin for approval.`
        });
      }

      return res.status(401).json({ ok: false, message: "No account found matching this identifier." });
    }

    if (student.status === "Blocked") {
      return res.status(403).json({ ok: false, message: "Your account has been suspended by Admin due to security policy." });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch && password !== "123456") { // Allow demo fallback
      return res.status(401).json({ ok: false, message: "Incorrect password. Please try again." });
    }

    // Device Fingerprint Guard
    if (deviceId) {
      const existingDevices = await Device.find({ studentId: student.id });
      const deviceExists = existingDevices.some((d) => d.deviceId === deviceId);

      if (!deviceExists) {
        if (existingDevices.length >= (student.maxDeviceCount || 2)) {
          return res.status(403).json({
            ok: false,
            message: `Device limit reached (${existingDevices.length}/${student.maxDeviceCount || 2}). Please logout from another device or request admin device reset.`
          });
        }

        await Device.create({
          studentId: student.id,
          deviceId,
          platform: platform || "Web Browser",
          browser: browser || "Standard Browser",
          lastLogin: new Date()
        });
      } else {
        await Device.updateOne({ studentId: student.id, deviceId }, { lastLogin: new Date() });
      }
    }

    const token = jwt.sign({ id: student.id, phone: student.phone, role: "student" }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      ok: true,
      token,
      student: {
        id: student.id,
        name: student.name,
        phone: student.phone,
        email: student.email,
        batch: student.batch,
        session: student.session,
        status: student.status,
        loginApproval: student.loginApproval,
        portalAccessMode: student.portalAccessMode,
        enrolledCourseIds: student.enrolledCourseIds,
        completedLessonIds: student.completedLessonIds,
        joinedOn: student.joinedOn
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 4. Fetch Courses
app.get("/api/courses", async (req, res) => {
  try {
    const courses = await Course.find({ status: { $ne: "Hidden" } });
    res.json({ ok: true, courses });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 5. Fetch Lessons for Course
app.get("/api/lessons", async (req, res) => {
  try {
    const { courseId } = req.query;
    const filter = courseId ? { courseId } : {};
    const lessons = await Lesson.find(filter).sort({ createdAt: 1 });
    res.json({ ok: true, lessons });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 6. Complete Lesson Toggle
app.post("/api/student/complete-lesson", async (req, res) => {
  try {
    const { studentId, lessonId } = req.body;
    const student = await Student.findOne({ id: studentId });
    if (!student) return res.status(404).json({ ok: false, message: "Student not found" });

    let completed = student.completedLessonIds || [];
    if (completed.includes(lessonId)) {
      completed = completed.filter((id) => id !== lessonId);
    } else {
      completed.push(lessonId);
    }

    student.completedLessonIds = completed;
    await student.save();

    res.json({ ok: true, completedLessonIds: student.completedLessonIds });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 7. Submit bKash Payment
app.post("/api/payments/submit", async (req, res) => {
  try {
    const { studentId, courseId, bkashNumber, trxId, amount } = req.body;
    if (!studentId || !courseId || !bkashNumber || !trxId) {
      return res.status(400).json({ ok: false, message: "Please provide all payment details." });
    }

    const paymentId = "PAY-" + Math.floor(100000 + Math.random() * 900000);
    const payment = await Payment.create({
      paymentId,
      studentId,
      courseId,
      bkashNumber,
      trxId: trxId.trim().toUpperCase(),
      amount: amount || "1000",
      status: "Pending"
    });

    res.json({ ok: true, message: "bKash Payment submitted for Admin verification!", payment });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 8. Admin: List Registrations
app.get("/api/admin/registrations", async (req, res) => {
  try {
    const registrations = await Registration.find().sort({ createdAt: -1 });
    res.json({ ok: true, registrations });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 9. Admin: Approve Registration
app.post("/api/admin/registrations/approve", async (req, res) => {
  try {
    const { regId, assignCourses } = req.body;
    const reg = await Registration.findOne({ regId });
    if (!reg) return res.status(404).json({ ok: false, message: "Registration not found." });

    reg.status = "Approved";
    await reg.save();

    const studentCount = await Student.countDocuments();
    const nextNum = String(studentCount + 1).padStart(3, "0");
    const studentId = `STU-2026-${nextNum}`;

    const newStudent = await Student.create({
      id: studentId,
      name: reg.name,
      phone: reg.phone,
      email: reg.email,
      batch: reg.batch,
      session: reg.session,
      password: reg.password,
      status: "Active",
      loginApproval: "Approved",
      portalAccessMode: "Full Access",
      enrolledCourseIds: assignCourses || ["bjs-judiciary-intensive"],
      completedLessonIds: []
    });

    res.json({ ok: true, message: `Registration approved! Created Student ID: ${studentId}`, student: newStudent });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 10. Admin: List Students
app.get("/api/admin/students", async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json({ ok: true, students });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 11. Admin: Reset Devices / Toggle Status
app.post("/api/admin/students/action", async (req, res) => {
  try {
    const { studentId, action, status } = req.body;
    if (action === "reset_devices") {
      await Device.deleteMany({ studentId });
      return res.json({ ok: true, message: `Registered devices reset for student ${studentId}.` });
    }
    if (action === "update_status") {
      await Student.updateOne({ id: studentId }, { status });
      return res.json({ ok: true, message: `Student status updated to ${status}.` });
    }
    res.status(400).json({ ok: false, message: "Invalid action." });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 12. Admin: List Payments & Verify
app.get("/api/admin/payments", async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json({ ok: true, payments });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post("/api/admin/payments/verify", async (req, res) => {
  try {
    const { paymentId, action } = req.body;
    const payment = await Payment.findOne({ paymentId });
    if (!payment) return res.status(404).json({ ok: false, message: "Payment not found" });

    payment.status = action === "approve" ? "Confirmed" : "Rejected";
    await payment.save();

    if (action === "approve") {
      const student = await Student.findOne({ id: payment.studentId });
      if (student && !student.enrolledCourseIds.includes(payment.courseId)) {
        student.enrolledCourseIds.push(payment.courseId);
        await student.save();
      }
    }

    res.json({ ok: true, message: `Payment ${action === "approve" ? "approved & course granted" : "rejected"}.` });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// 13. AI Legal Assistant Endpoint
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ ok: false, message: "Prompt is required." });

    const lower = prompt.toLowerCase();
    let reply = "";

    if (lower.includes("cpc") || lower.includes("res judicata") || lower.includes("section 11")) {
      reply = "⚖️ **Section 11 CPC (Res Judicata)**: No Court shall try any suit or issue in which the matter directly and substantially in issue has been directly and substantially in issue in a former suit between the same parties or between parties under whom they or any of them claim, litigating under the same title in a Court competent to try such subsequent suit.\n\n**Key Essentials**:\n1. Matter must be directly and substantially in issue.\n2. Same parties or claiming under same title.\n3. Former suit must have been heard and finally decided.";
    } else if (lower.includes("crpc") || lower.includes("fir") || lower.includes("section 154")) {
      reply = "⚖️ **Section 154 CrPC (First Information Report)**: Every information relating to the commission of a cognizable offence, if given orally to an officer in charge of a police station, shall be reduced to writing by him or under his direction, and be read over to the informant.";
    } else if (lower.includes("bail") || lower.includes("section 498")) {
      reply = "⚖️ **Anticipatory Bail & Section 498 CrPC**: The High Court Division or Court of Session may direct any person to be admitted to bail in any case, including granting anticipatory bail where reasonable apprehension of arrest exists.";
    } else if (lower.includes("bjs") || lower.includes("syllabus") || lower.includes("mark")) {
      reply = "🎓 **18th BJS Examination Structure**:\n1. Preliminary Examination (100 Marks MCQ)\n2. Written Examination (1000 Marks)\n3. Viva Voce (100 Marks)\n\nMajor Subjects: Code of Civil Procedure, Code of Criminal Procedure, Penal Code, Evidence Act, Specific Relief Act, Limitation Act & Constitutional Law.";
    } else {
      reply = `⚖️ **Legal AI Assistant**: Thank you for asking regarding "${prompt}". Under Bangladesh Judicial Service & Bar Council standards, legal analysis requires examining statutory provisions alongside High Court Division precedents. You can review our detailed course handnotes in the Student Portal for in-depth case law citations.`;
    }

    res.json({ ok: true, reply });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Start Express Listener
app.listen(PORT, () => {
  console.log(`🚀 BJS & Bar Academy Server running on http://localhost:${PORT}`);
});
