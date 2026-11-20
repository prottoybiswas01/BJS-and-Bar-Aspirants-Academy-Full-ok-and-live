const { notifyLessonEmailDispatched } = require('./alertService');
const { renderAcademyEmailTemplate } = require('./emailTemplateService');

/**
 * Durable Video Notification Outbox & Idempotent Email Dispatcher
 * Implements Phase 2 Requirements
 */
async function dispatchNewLessonNotifications({
  lesson,
  course,
  NotificationLogModel,
  StudentModel,
  isMongoConnected,
  memoryDb,
  sendEmailFn,
  adminEmail
}) {
  if (!lesson || !course) {
    return { ok: false, sentCount: 0, reason: 'MISSING_DATA' };
  }

  // 1. Zero emails for Draft videos
  if (lesson.isDraft === true || lesson.status === 'draft') {
    console.log(`[Video Notification] Lesson "${lesson.title}" (${lesson.id}) is a DRAFT. Zero emails dispatched.`);
    return { ok: true, sentCount: 0, reason: 'DRAFT_VIDEO' };
  }

  // 2. Prevent duplicate notifications on edits or retries
  const lessonId = lesson.id;
  const courseId = course.id;
  const courseTitle = course.title || course.shortTitle || courseId;
  const eventId = `pub-${lessonId}`;

  // Robust multi-alias course identifier resolution
  const allCourseIds = Array.from(new Set([
    course.id,
    course._id ? String(course._id) : null,
    ...(Array.isArray(course.legacyIds) ? course.legacyIds : []),
    lesson.courseId
  ].filter(Boolean)));

  // 3. Find genuinely eligible active students with valid canonical course access
  let eligibleStudents = [];
  const now = new Date();

  if (isMongoConnected && StudentModel) {
    try {
      const candidates = await StudentModel.find({
        status: { $in: ["Active", "Pending"] },
        $or: [
          { allowedCourseIds: { $in: allCourseIds } },
          { enrolledCourseIds: { $in: allCourseIds } },
          { "courseRules.courseId": { $in: allCourseIds } }
        ]
      }).lean();

      eligibleStudents = candidates.filter(st => {
        // Exclude blocked or suspended accounts
        if (st.status === 'Blocked' || st.status === 'Inactive') return false;

        // Check explicit course lists
        const stAllowed = Array.isArray(st.allowedCourseIds) ? st.allowedCourseIds : [];
        const stEnrolled = Array.isArray(st.enrolledCourseIds) ? st.enrolledCourseIds : [];
        const hasExplicit = allCourseIds.some(cid => stAllowed.includes(cid) || stEnrolled.includes(cid));

        // Check courseRules for suspension and expiry
        if (Array.isArray(st.courseRules)) {
          const rule = st.courseRules.find(r => r && allCourseIds.includes(r.courseId));
          if (rule) {
            if (rule.enrollmentStatus === 'Suspended') return false;
            if (rule.accessExpiryDate && new Date(rule.accessExpiryDate) < now) return false;
            return true;
          }
        }

        return hasExplicit;
      });
    } catch (err) {
      console.warn('[Video Notification] Error querying eligible students:', err.message);
    }
  } else if (memoryDb) {
    eligibleStudents = (memoryDb.students || []).filter(st => {
      if (st.status === 'Blocked' || st.status === 'Inactive') return false;
      const stAllowed = Array.isArray(st.allowedCourseIds) ? st.allowedCourseIds : [];
      const stEnrolled = Array.isArray(st.enrolledCourseIds) ? st.enrolledCourseIds : [];
      const hasExplicit = allCourseIds.some(cid => stAllowed.includes(cid) || stEnrolled.includes(cid));
      if (Array.isArray(st.courseRules)) {
        const rule = st.courseRules.find(r => r && allCourseIds.includes(r.courseId));
        if (rule) {
          if (rule.enrollmentStatus === 'Suspended') return false;
          if (rule.accessExpiryDate && new Date(rule.accessExpiryDate) < now) return false;
          return true;
        }
      }
      return hasExplicit;
    });
  }

  // 4. Automatic Class Upload Email Dispatch to Enrolled Students
  // Active by default for enrolled students. Can be globally paused via DISABLE_CLASS_EMAILS=true
  const isClassEmailDisabled = process.env.DISABLE_CLASS_EMAILS === 'true';
  if (isClassEmailDisabled) {
    console.log(`[Video Notification] Class upload emails explicitly disabled via DISABLE_CLASS_EMAILS.`);
    return { ok: true, sentCount: 0, skippedCount: 0, failedCount: 0, totalEligible: eligibleStudents.length, adminNotified: false, reason: 'CLASS_EMAILS_DISABLED' };
  }

  const adminNotified = false;

  if (eligibleStudents.length === 0) {
    console.log(`[Video Notification] No eligible enrolled students found for course "${courseTitle}" (${courseId}).`);
    return { ok: true, sentCount: 0, skippedCount: 0, failedCount: 0, totalEligible: 0, adminNotified, reason: 'NO_ELIGIBLE_STUDENTS' };
  }

  console.log(`[Video Notification] Dispatching publication event ${eventId} to ${eligibleStudents.length} eligible enrolled students...`);

  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const student of eligibleStudents) {
    const email = (student.email || '').trim().toLowerCase();
    if (!email || !email.includes('@') || email === 'admin@bjs.com' || email.endsWith('@bjs.com') || email.endsWith('@bjs.test')) {
      skippedCount++;
      continue;
    }

    // Smart Bounce Protection: only skip if student.emailStatus === 'bounced' or 'suppressed' (default/undefined treated as 'active')
    const isBouncedOrSuppressed = student.emailStatus === 'bounced' || student.emailStatus === 'suppressed';
    if (isBouncedOrSuppressed) {
      console.log(`🛡️ [Video Notification Auto-Guard] Skipped bounced/suppressed recipient: ${email} (${student.emailStatus})`);
      skippedCount++;
      continue;
    }

    // Check Outbox record in MongoDB to guarantee idempotency across concurrent/retry attempts
    let alreadySent = false;
    let outboxDoc = null;

    if (isMongoConnected && NotificationLogModel) {
      try {
        outboxDoc = await NotificationLogModel.findOne({ lessonId, recipientEmail: email });
        if (outboxDoc && outboxDoc.status === 'sent') {
          alreadySent = true;
        } else if (!outboxDoc) {
          try {
            outboxDoc = await NotificationLogModel.create({
              eventId,
              lessonId,
              courseId,
              recipientEmail: email,
              recipientName: student.name || 'শিক্ষার্থী',
              status: 'pending',
              attemptCount: 0
            });
          } catch (dupErr) {
            // Concurrent insert caught by unique index
            outboxDoc = await NotificationLogModel.findOne({ lessonId, recipientEmail: email });
            if (outboxDoc && outboxDoc.status === 'sent') alreadySent = true;
          }
        }
      } catch (dbErr) {
        console.warn('[Video Notification] Outbox check notice:', dbErr.message);
      }
    } else if (memoryDb) {
      memoryDb.notificationLogs = memoryDb.notificationLogs || [];
      const memDoc = memoryDb.notificationLogs.find(l => l.lessonId === lessonId && l.recipientEmail === email);
      if (memDoc && memDoc.status === 'sent') alreadySent = true;
    }

    if (alreadySent) {
      continue; // Skip: already delivered to this recipient
    }

    // Build cohesive executive email notification via unified template engine
    const subject = `🎥 [নতুন ভিডিও ক্লাস নোটিশ] ${courseTitle}: ${lesson.title} আপলোড সম্পন্ন!`;
    const summaryRows = [
      ['📚 কোর্স:', courseTitle],
      ['📖 ক্লাস শিরোনাম:', lesson.title],
      ...(lesson.chapter ? [['📑 অধ্যায়/বিষয়:', lesson.chapter]] : []),
      ['📅 প্রকাশের তারিখ:', lesson.releaseDate || new Date().toISOString().split('T')[0]]
    ];

    const htmlContent = renderAcademyEmailTemplate({
      title: subject,
      subtitle: 'নতুন ভিডিও ক্লাস নোটিফিকেশন',
      preheader: `${courseTitle} কোর্সে নতুন ক্লাস আপলোড করা হয়েছে: ${lesson.title}`,
      greeting: `প্রিয় ${student.name || 'শিক্ষার্থী'},`,
      messageHtml: `আপনার কোর্স <strong>"${courseTitle}"</strong>-এ একটি নতুন লেকচার ভিডিও সফলভাবে আপলোড ও প্রকাশ করা হয়েছে। নিয়মিত পড়াশোনার ধারাবাহিকতা বজায় রাখতে আজই ক্লাসটি সম্পন্ন করুন।`,
      summaryRows,
      ctaButton: {
        text: '▶️ ড্যাশবোর্ডে গিয়ে ক্লাসটি দেখুন',
        url: 'https://bjs.kodl.uk/dashboard'
      },
      footerNote: 'আপনি এই কোর্সে নিবন্ধিত সক্রিয় শিক্ষার্থী হিসেবে এই নোটিফিকেশনটি পেয়েছেন।'
    });

    // Attempt external delivery
    try {
      if (typeof sendEmailFn === 'function') {
        const sendRes = await sendEmailFn(email, subject, htmlContent);
        if (sendRes && sendRes.ok) {
          sentCount++;
          if (isMongoConnected && outboxDoc) {
            outboxDoc.status = 'sent';
            outboxDoc.sentAt = new Date();
            outboxDoc.attemptCount = (outboxDoc.attemptCount || 0) + 1;
            await outboxDoc.save();
          } else if (memoryDb) {
            memoryDb.notificationLogs = memoryDb.notificationLogs || [];
            memoryDb.notificationLogs.push({
              eventId,
              lessonId,
              courseId,
              recipientEmail: email,
              status: 'sent',
              sentAt: new Date()
            });
          }
        } else {
          // Delivery failed
          failedCount++;
          if (isMongoConnected && outboxDoc) {
            outboxDoc.status = 'failed';
            outboxDoc.error = sendRes?.error || 'Provider rejected email';
            outboxDoc.attemptCount = (outboxDoc.attemptCount || 0) + 1;
            await outboxDoc.save();
          }
        }
      }
    } catch (sendErr) {
      failedCount++;
      console.warn(`[Video Notification] Delivery failure for ${email}:`, sendErr.message);
      if (isMongoConnected && outboxDoc) {
        outboxDoc.status = 'failed';
        outboxDoc.error = sendErr.message;
        outboxDoc.attemptCount = (outboxDoc.attemptCount || 0) + 1;
        await outboxDoc.save();
      }
    }
  }

  console.log(`[Video Notification] Complete: ${sentCount} sent, ${skippedCount} skipped, ${failedCount} failed of ${eligibleStudents.length} eligible students.`);

  // Send real-time summary to Telegram (Chat ID: 7630488220)
  try {
    notifyLessonEmailDispatched({
      courseTitle,
      lessonTitle: lesson.title,
      sentCount,
      skippedCount,
      failedCount,
      totalEligible: eligibleStudents.length
    });
  } catch (tgErr) {
    console.warn('[Video Notification] Telegram alert notice:', tgErr.message);
  }

  return { ok: true, sentCount, skippedCount, failedCount, totalEligible: eligibleStudents.length, adminNotified, eventId };
}

module.exports = {
  dispatchNewLessonNotifications
};
