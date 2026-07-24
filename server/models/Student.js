const mongoose = require("mongoose");

const courseRuleSchema = new mongoose.Schema({
  courseId: { type: String, required: true },
  unlimitedAccess: { type: Boolean, default: false },
  accessStartDate: { type: String, default: "" },
  accessEndDate: { type: String, default: "" },
  videoAccessUntil: { type: String, default: "" },
  lastPaymentDate: { type: String, default: "" },
  paymentDueDate: { type: String, default: "" },
  monthlyFee: { type: String, default: "1000" },
  enrollmentStatus: { type: String, enum: ["Active", "Expired", "Suspended"], default: "Active" },
  paidMonths: { type: String, default: "" }
}, { _id: false });

const studentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true }, // e.g. STU-2026-001
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, index: true }, // e.g. 01800077663
  email: { type: String, required: true, unique: true, index: true }, // e.g. prottoy@gmail.com
  batch: { type: String, default: "Judiciary 2026" },
  session: { type: String, default: "Weekend Intensive" },
  password: { type: String, required: true }, // Hashed bcrypt password
  isTemporaryPassword: { type: Boolean, default: false },
  status: { type: String, enum: ["Active", "Inactive", "Blocked"], default: "Active" },
  loginApproval: { type: String, enum: ["Approved", "Pending", "Preview", "Rejected"], default: "Approved" },
  portalAccessMode: { type: String, default: "Full Access" },
  enrolledCourseIds: [{ type: String }],
  allowedCourseIds: [{ type: String }],
  completedLessonIds: [{ type: String }],
  courseRules: [courseRuleSchema],
  maxDeviceCount: { type: Number, default: 2 },
  highlight: { type: String, default: "" },
  popupMessage: {
    title: { type: String, default: "" },
    body: { type: String, default: "" },
    sentAt: { type: Date },
  },
  joinedOn: { type: String, default: () => new Date().toISOString().split("T")[0] },
}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);
