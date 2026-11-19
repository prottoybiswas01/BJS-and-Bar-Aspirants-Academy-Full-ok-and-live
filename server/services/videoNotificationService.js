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

  // 4. Admin upload confirmation email is explicitly removed per request to preserve Resend quota
  const adminNotified = false;

  if (eligibleStudents.length === 0) {
    console.log(`[Video Notification] No eligible enrolled students found for course "${courseTitle}" (${courseId}).`);
    return { ok: true, sentCount: 0, adminNotified, reason: 'NO_ELIGIBLE_STUDENTS' };
  }

  console.log(`[Video Notification] Dispatching publication event ${eventId} to ${eligibleStudents.length} eligible students...`);

  let sentCount = 0;

  for (const student of eligibleStudents) {
    const email = (student.email || '').trim().toLowerCase();
    if (!email || !email.includes('@') || email === 'admin@bjs.com' || email.endsWith('@bjs.com') || email.endsWith('@bjs.test')) continue;

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

    // Build clean email notification without manual duration row
    const subject = `🎥 [নতুন ভিডিও ক্লাস নোটিশ] ${courseTitle}: ${lesson.title} আপলোড সম্পন্ন!`;
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0b1325; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
        <div style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 24px; text-align: center; color: #0f172a;">
          <div style="font-size: 34px; margin-bottom: 4px;">🎬</div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: 0.5px; color: #0f172a;">
            BJS & BAR ASPIRANTS ACADEMY
          </h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 700; opacity: 0.9;">
            নতুন লেকচার ভিডিও আপলোড ইমেইল নোটিফিকেশন
          </p>
        </div>
        <div style="padding: 24px; line-height: 1.6;">
          <p style="font-size: 15px; font-weight: 700; color: #f59e0b; margin-top: 0;">
            প্রিয় ${student.name || 'শিক্ষার্থী'},
          </p>
          <p style="font-size: 13px; color: #cbd5e1; margin-bottom: 20px;">
            আপনার কোর্স <strong>"${courseTitle}"</strong>-এ একটি নতুন লেকচার ভিডিও সফলভাবে আপলোড ও প্রকাশ করা হয়েছে।
          </p>
          <div style="background-color: #1e293b; border-radius: 12px; padding: 18px; border-left: 4px solid #f59e0b; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-weight: 600; width: 120px;">📚 কোর্স:</td>
                <td style="padding: 6px 0; color: #fbbf24; font-weight: 700;">${courseTitle}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-weight: 600;">📖 ক্লাস শিরোনাম:</td>
                <td style="padding: 6px 0; color: #ffffff; font-weight: 600;">${lesson.title}</td>
              </tr>
              ${lesson.chapter ? `
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-weight: 600;">📑 অধ্যায়/বিষয়:</td>
                <td style="padding: 6px 0; color: #e2e8f0;">${lesson.chapter}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 6px 0; color: #94a3b8; font-weight: 600;">📅 প্রকাশের তারিখ:</td>
                <td style="padding: 6px 0; color: #93c5fd;">${lesson.releaseDate || new Date().toISOString().split('T')[0]}</td>
              </tr>
            </table>
          </div>
          <div style="text-align: center; margin: 30px 0 10px 0;">
            <a href="https://bjs.kodl.uk/dashboard" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #0f172a; font-weight: 800; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
              ▶️ ড্যাশবোর্ডে গিয়ে ক্লাসটি দেখুন
            </a>
          </div>
        </div>
        <div style="background-color: #050b14; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b;">
          &copy; ${new Date().getFullYear()} BJS & Bar Aspirants Academy. All rights reserved.
        </div>
      </div>
    `;

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
          if (isMongoConnected && outboxDoc) {
            outboxDoc.status = 'failed';
            outboxDoc.error = sendRes?.error || 'Provider rejected email';
            outboxDoc.attemptCount = (outboxDoc.attemptCount || 0) + 1;
            await outboxDoc.save();
          }
        }
      }
    } catch (sendErr) {
      console.warn(`[Video Notification] Delivery failure for ${email}:`, sendErr.message);
      if (isMongoConnected && outboxDoc) {
        outboxDoc.status = 'failed';
        outboxDoc.error = sendErr.message;
        outboxDoc.attemptCount = (outboxDoc.attemptCount || 0) + 1;
        await outboxDoc.save();
      }
    }
  }

  return { ok: true, sentCount, adminNotified, eventId };
}

module.exports = {
  dispatchNewLessonNotifications
};
