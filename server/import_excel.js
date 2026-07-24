const mongoose = require("mongoose");
const XLSX = require("xlsx");
const bcrypt = require("bcryptjs");
const path = require("path");

const MONGODB_URI = "mongodb+srv://bjsacademy38_db_user:MJyyGEq7CDsMeeYs@cluster0.supygp7.mongodb.net/bjs_academy?retryWrites=true&w=majority&appName=Cluster0";

// Models
const Student = require("./models/Student");
const Course = require("./models/Course");
const Lesson = require("./models/Lesson");
const Registration = require("./models/Registration");
const Payment = require("./models/Payment");
const Device = require("./models/Device");

function extractYoutubeId(urlOrId) {
  if (!urlOrId) return "";
  const str = String(urlOrId).trim();
  if (str.length === 11 && !str.includes("/") && !str.includes(".")) {
    return str;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = str.match(regExp);
  return (match && match[2].length === 11) ? match[2] : str;
}

function formatExcelDate(val, defaultStr = "2026-04-01") {
  if (!val) return defaultStr;
  if (typeof val === 'number') {
    try {
      const dateObj = XLSX.SSF.parse_date_code(val);
      if (dateObj) {
        const y = dateObj.y;
        const m = String(dateObj.m).padStart(2, '0');
        const d = String(dateObj.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch (e) {}
  }
  return String(val);
}

async function runImport() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log("✅ Connected to MongoDB Atlas!");

    const excelPath = path.join(__dirname, "..", "BJS and Bar Aspirants Academy.xlsx");
    const wb = XLSX.readFile(excelPath);

    // 1. IMPORT COURSES
    console.log("\n--- 1. Importing Courses ---");
    const rawCourses = XLSX.utils.sheet_to_json(wb.Sheets["Courses"]);
    const coursesToInsert = [];
    for (const c of rawCourses) {
      if (!c.id) continue;
      const courseObj = {
        id: String(c.id).trim(),
        title: String(c.title || c.id).trim(),
        shortTitle: String(c.shortTitle || c.title || c.id).trim(),
        faculty: String(c.faculty || "Shanto Deb Roy Arno").trim(),
        category: String(c.category || "LAW").trim(),
        schedule: String(c.schedule || "Regular").trim(),
        batchRegText: String(c.batch || c.schedule || "Regular").trim(),
        sessionRegText: formatExcelDate(c.session),
        nextLive: String(c.nextLive || "8:30 PM").trim(),
        price: String(c.price || "1000").trim(),
        paymentType: String(c.paymentType || "Monthly").trim(),
        status: (c.status === "Inactive" || c.description === "Inactive") ? "Inactive" : "Active",
        description: String(c.description || c.title || "").trim()
      };
      coursesToInsert.push(courseObj);
    }
    await Course.deleteMany({});
    await Course.insertMany(coursesToInsert);
    console.log(`✅ Successfully imported ${coursesToInsert.length} Courses to MongoDB!`);

    // 2. IMPORT LESSONS
    console.log("\n--- 2. Importing Lessons ---");
    const rawLessons = XLSX.utils.sheet_to_json(wb.Sheets["Lessons"]);
    const lessonsToInsert = [];
    let lessonCounter = 1;
    let lastCourseId = "civil-laws-intensive";
    let lastModule = "General Module";

    for (const l of rawLessons) {
      const youtubeUrl = l.youtubeUrl || l.url;
      if (l.courseId) lastCourseId = String(l.courseId).trim();
      if (l.module) lastModule = String(l.module).trim();

      if (youtubeUrl) {
        const yId = extractYoutubeId(youtubeUrl);
        if (yId && yId.length >= 5) {
          const lessonObj = {
            id: `les-${lastCourseId}-${lessonCounter++}`,
            courseId: lastCourseId,
            module: lastModule || "Fast Class",
            title: String(l.title || `${lastModule} Lecture ${lessonCounter}`).trim(),
            duration: String(l.duration || "45min").trim(),
            youtubeUrl: String(youtubeUrl).trim(),
            youtubeId: yId,
            releaseDate: formatExcelDate(l.releaseDate),
            description: String(l.note || l.title || "").trim()
          };
          lessonsToInsert.push(lessonObj);
        }
      }
    }
    await Lesson.deleteMany({});
    await Lesson.insertMany(lessonsToInsert);
    console.log(`✅ Successfully imported ${lessonsToInsert.length} Lessons/Videos to MongoDB!`);

    // 3. IMPORT ENROLLMENTS (Course Access Rules per student)
    console.log("\n--- 3. Parsing Enrollments ---");
    const rawEnrollments = XLSX.utils.sheet_to_json(wb.Sheets["Enrollments"]);
    const studentRulesMap = {}; // studentId -> courseRules array

    for (const e of rawEnrollments) {
      if (!e.studentId || !e.courseId) continue;
      const sId = String(e.studentId).trim();
      if (!studentRulesMap[sId]) studentRulesMap[sId] = [];

      const rule = {
        courseId: String(e.courseId).trim(),
        unlimitedAccess: !!e.unlimitedAccess,
        accessStartDate: formatExcelDate(e.accessStartDate),
        accessEndDate: formatExcelDate(e.accessEndDate, "2026-12-31"),
        videoAccessUntil: formatExcelDate(e.videoAccessUntil, "2026-12-31"),
        lastPaymentDate: formatExcelDate(e.lastPaymentDate),
        paymentDueDate: formatExcelDate(e.paymentDueDate, "2026-12-31"),
        monthlyFee: String(e.monthlyFee || "1000").trim(),
        enrollmentStatus: e.status === "Inactive" ? "Inactive" : "Active",
        paidMonths: formatExcelDate(e.paidMonths)
      };
      studentRulesMap[sId].push(rule);
    }

    // 4. IMPORT STUDENTS
    console.log("\n--- 4. Importing Students ---");
    const rawStudents = XLSX.utils.sheet_to_json(wb.Sheets["Students"]);
    const studentsToInsert = [];
    const defaultPasswordHash = await bcrypt.hash("123456", 10);

    for (const s of rawStudents) {
      if (!s.id && !s.phone && !s.email) continue;
      const sId = String(s.id || `STU-2026-${Math.floor(100 + Math.random() * 900)}`).trim();
      const phone = String(s.phone || "").trim();
      const email = String(s.email || `${sId.toLowerCase()}@ainpathshala.com`).trim();
      const rawPass = s.password ? String(s.password).trim() : "123456";
      const passHash = (rawPass === "123456" || !rawPass) ? defaultPasswordHash : await bcrypt.hash(rawPass, 10);

      const enrolledIds = s.enrolledCourseIds ? String(s.enrolledCourseIds).split(",").map(x => x.trim()) : [];
      const rules = studentRulesMap[sId] || [];

      const studentObj = {
        id: sId,
        name: String(s.name || "Student").trim(),
        phone: phone,
        email: email,
        batch: String(s.batch || "Regular Batch").trim(),
        session: formatExcelDate(s.session),
        password: passHash,
        status: s.status === "Inactive" ? "Inactive" : "Active",
        loginApproval: s.loginApproval || "Approved",
        portalAccessMode: "Full Video Access",
        highlight: String(s.highlight || "").trim(),
        enrolledCourseIds: enrolledIds.length > 0 ? enrolledIds : (rules.length > 0 ? rules.map(r => r.courseId) : ["civil-laws-intensive"]),
        allowedCourseIds: enrolledIds.length > 0 ? enrolledIds : (rules.length > 0 ? rules.map(r => r.courseId) : ["civil-laws-intensive"]),
        courseRules: rules,
        joinedOn: formatExcelDate(s.joinedOn)
      };
      studentsToInsert.push(studentObj);
    }
    await Student.deleteMany({});
    await Student.insertMany(studentsToInsert);
    console.log(`✅ Successfully imported ${studentsToInsert.length} Student Profiles to MongoDB!`);

    // 5. IMPORT REGISTRATIONS
    console.log("\n--- 5. Importing Registrations ---");
    const rawRegs = XLSX.utils.sheet_to_json(wb.Sheets["Registrations"]);
    const regsToInsert = [];
    for (const r of rawRegs) {
      if (!r.name) continue;
      const regObj = {
        regId: String(r.id || `REG-${Date.now()}`).trim(),
        studentId: String(r.studentId || "").trim(),
        name: String(r.name).trim(),
        phone: String(r.phone || "").trim(),
        email: String(r.email || "").trim(),
        batch: String(r.batch || "Regular Batch").trim(),
        session: formatExcelDate(r.session),
        password: defaultPasswordHash,
        status: String(r.status || "Approved").trim(),
        requestedCourseIds: r.requestedCourseIds ? String(r.requestedCourseIds).split(",").map(x => x.trim()) : ["civil-laws-intensive"],
        createdAt: new Date()
      };
      regsToInsert.push(regObj);
    }
    await Registration.deleteMany({});
    await Registration.insertMany(regsToInsert);
    console.log(`✅ Successfully imported ${regsToInsert.length} Registrations to MongoDB!`);

    // 6. IMPORT PAYMENTS
    console.log("\n--- 6. Importing Payments ---");
    const rawPayments = XLSX.utils.sheet_to_json(wb.Sheets["Payments"]);
    const paymentsToInsert = [];
    for (const p of rawPayments) {
      if (!p.studentName && !p.studentPhone && !p.studentId) continue;
      const payObj = {
        paymentId: String(p.id || `PAY-${Date.now()}`).trim(),
        studentId: String(p.studentId || "STU-2026-001").trim(),
        courseId: String(p.courseId || "civil-laws-intensive").trim(),
        bkashNumber: String(p.paymentNumber || p.studentPhone || "01978167016").trim(),
        trxId: String(p.studentTransactionId || p.confirmedTransactionId || `TRX-${Date.now()}`).trim(),
        amount: String(p.amount || "1000").trim(),
        month: "2026-07",
        status: p.status === "Approved" ? "Confirmed" : (p.status || "Confirmed"),
        note: String(p.note || "Excel Imported").trim()
      };
      paymentsToInsert.push(payObj);
    }
    await Payment.deleteMany({});
    if (paymentsToInsert.length > 0) {
      await Payment.insertMany(paymentsToInsert);
    }
    console.log(`✅ Successfully imported ${paymentsToInsert.length} Payments to MongoDB!`);

    // 7. IMPORT DEVICES
    console.log("\n--- 7. Importing Devices ---");
    const rawDevices = XLSX.utils.sheet_to_json(wb.Sheets["Devices"]);
    const devicesToInsert = [];
    for (const d of rawDevices) {
      if (!d.studentId) continue;
      const devObj = {
        id: String(d.id || `dev-${Date.now()}`).trim(),
        studentId: String(d.studentId).trim(),
        deviceId: String(d.deviceId || "").trim(),
        deviceName: String(d.deviceName || "Device").trim(),
        publicIp: String(d.publicIp || "").trim(),
        status: String(d.status || "Active").trim(),
        lastSeenOn: new Date()
      };
      devicesToInsert.push(devObj);
    }
    await Device.deleteMany({});
    await Device.insertMany(devicesToInsert);
    console.log(`✅ Successfully imported ${devicesToInsert.length} Devices to MongoDB!`);

    console.log("\n==========================================");
    console.log("🎉 ALL EXCEL DATA SUCCESSFULLY IMPORTED TO MONGODB ATLAS!");
    console.log("==========================================");

  } catch (err) {
    console.error("Import Error:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runImport();
