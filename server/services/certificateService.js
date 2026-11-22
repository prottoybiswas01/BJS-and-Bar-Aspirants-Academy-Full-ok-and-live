const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const { generateUnifiedAiResponse } = require("./unifiedAiClient");

const FONT_DIR = path.join(__dirname, "..", "fonts");

// Curated high-impact legal syllabuses for core Bangladeshi law subjects
const CURATED_SYLLABUS = {
  cpc: "having demonstrated academic rigor and professional mastery across Sections 1–158 and Orders I–XXI of the Code of Civil Procedure, 1908; encompassing pecuniary and territorial jurisdiction, res judicata, pleadings and amendments, temporary injunctions, and execution of decrees in judicial practice.",
  family: "having demonstrated comprehensive legal proficiency in the substantive and procedural aspects of Muslim Family Laws, the Dissolution of Muslim Marriages Act 1939, Family Courts Ordinance 1985, Hindu Law, Dower (Mahr), Maintenance, Child Custody & Guardianship, and Intestate Succession.",
  clauses: "having demonstrated thorough legal mastery of statutory interpretation under the General Clauses Act, fundamental civil jurisprudence, statutory definitions, computation of time, and the legislative rules governing the construction and application of laws in Bangladesh.",
  penal: "having demonstrated comprehensive legal knowledge across the General Principles of Criminal Law, General Exceptions (Sections 76–106), Offences Against the Human Body including Culpable Homicide & Murder (Sections 299–302), and Offences Against Property under the Penal Code, 1860.",
  crpc: "having mastered the procedural framework under the Code of Criminal Procedure, 1898; including Investigation, FIR & GD, Remand (Section 167), Framing of Charge & Discharge (Section 241A), Bail Jurisprudence (Sections 497–498), Appeals, Revisions, and Inherent Powers (Section 561A).",
  evidence: "having attained rigorous mastery in the Law of Evidence under the Evidence Act, 1872; including Relevancy of Facts, Admissions & Confessions, Dying Declarations, Expert Opinion, Burden of Proof, Estoppel (Section 115), and the Examination of Witnesses.",
  sr: "having demonstrated profound knowledge across Recovery of Possession, Specific Performance of Contracts, Rectification & Cancellation of Instruments, Declaratory Decrees, Injunctions under the Specific Relief Act 1877, and Condonation of Delay (Section 5) under the Limitation Act 1908.",
  constitution: "having demonstrated deep jurisprudential understanding of the Supremacy of the Constitution (Article 7), Fundamental Rights & Enforcement (Articles 26–44), Writ Jurisdiction (Article 102), Independence of the Judiciary, and Landmark Constitutional Precedents."
};

/**
 * Returns a high-caliber curated legal syllabus description based on course title and content
 */
function getCuratedSyllabus(title = '', description = '') {
  const text = (title + ' ' + description).toLowerCase();
  if (text.includes('cpc') || text.includes('civil procedure') || text.includes('দেওয়ানী কার্যবিধি')) return CURATED_SYLLABUS.cpc;
  if (text.includes('family') || text.includes('পারিবারিক')) return CURATED_SYLLABUS.family;
  if (text.includes('general clauses') || text.includes('সাধারণ দফা')) return CURATED_SYLLABUS.clauses;
  if (text.includes('penal') || text.includes('দণ্ডবিধি')) return CURATED_SYLLABUS.penal;
  if (text.includes('crpc') || text.includes('criminal procedure') || text.includes('ফৌজদারী কার্যবিধি')) return CURATED_SYLLABUS.crpc;
  if (text.includes('evidence') || text.includes('সাক্ষ্য')) return CURATED_SYLLABUS.evidence;
  if (text.includes('specific relief') || text.includes('limitation') || text.includes('সুনির্দিষ্ট প্রতিকার') || text.includes('তামাদি')) return CURATED_SYLLABUS.sr;
  if (text.includes('constitution') || text.includes('সংবিধান')) return CURATED_SYLLABUS.constitution;
  return "having fulfilled all rigorous academic curriculum requirements, demonstrated comprehensive proficiency in core statutory enactments, procedural jurisprudence, case analysis, and judicial mock assessments under the authoritative supervision of the Academic Council.";
}

/**
 * AI-powered Course Syllabus Generator using course titles, modules & transcripts
 */
async function generateCourseSyllabusWithAi({ courseTitle, courseDescription = '', lessons = [] }) {
  const fallback = getCuratedSyllabus(courseTitle, courseDescription);
  try {
    const lessonSummary = lessons.slice(0, 30).map((l, i) => {
      const parts = [l.title || `Class ${i + 1}`];
      if (l.chapter) parts.push(`[${l.chapter}]`);
      if (l.module) parts.push(`(${l.module})`);
      return parts.join(' ');
    }).join('\n');

    const systemPrompt = `You are the Senior Judicial Academic Council Director of BJS & Bar Academy (Dhaka, Bangladesh).
Your task is to write a prestigious, tailored 3 to 4 line formal academic citation block in formal English for a Course Completion Certificate Diploma.
The citation must begin with "having demonstrated..." and concisely highlight the exact statutory sections, procedural orders, and substantive legal topics covered in the syllabus.
Output ONLY the single formal 3-4 sentence paragraph. Do not include markdown, bullet points, student names, or dates.`;

    const userPrompt = `Course Title: ${courseTitle}
Course Description: ${courseDescription}
Uploaded Class Titles and Chapters:
${lessonSummary || 'Comprehensive Judicial Syllabus and Statutory Sections'}

Generate the tailored certificate syllabus description paragraph:`;

    const aiResponse = await generateUnifiedAiResponse({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      timeoutMs: 4000
    });

    const cleaned = (aiResponse || '').trim().replace(/^["']|["']$/g, '');
    if (cleaned.length > 50 && /having/i.test(cleaned)) {
      return cleaned;
    }
    return fallback;
  } catch (err) {
    console.warn("AI syllabus generator fallback notice:", err.message);
    return fallback;
  }
}

/**
 * Draw Scales of Justice + Open Law Book Vector Emblem
 */
function drawScalesAndBookEmblem(doc, x, y, scale = 1) {
  doc.save();
  doc.translate(x, y);
  doc.scale(scale);

  // Central column / pillar
  doc.rect(-1.5, -20, 3, 24).fill('#B45309');
  doc.circle(0, -22, 2.5).fill('#B45309');
  doc.rect(-4, 2, 8, 2).fill('#B45309');

  // Balance beam
  doc.moveTo(-18, -16).lineTo(18, -16).lineWidth(1.8).strokeColor('#B45309').stroke();
  doc.circle(-18, -16, 1.5).fill('#B45309');
  doc.circle(18, -16, 1.5).fill('#B45309');

  // Left pan
  doc.moveTo(-18, -16).lineTo(-24, -6).lineWidth(0.8).strokeColor('#B45309').stroke();
  doc.moveTo(-18, -16).lineTo(-12, -6).lineWidth(0.8).strokeColor('#B45309').stroke();
  doc.moveTo(-24, -6).quadraticCurveTo(-18, -1, -12, -6).fill('#B45309');

  // Right pan
  doc.moveTo(18, -16).lineTo(12, -6).lineWidth(0.8).strokeColor('#B45309').stroke();
  doc.moveTo(18, -16).lineTo(24, -6).lineWidth(0.8).strokeColor('#B45309').stroke();
  doc.moveTo(12, -6).quadraticCurveTo(18, -1, 24, -6).fill('#B45309');

  // Open Law Book at the base
  doc.moveTo(-16, 11).quadraticCurveTo(-8, 8, 0, 10).lineTo(0, 16).quadraticCurveTo(-8, 14, -16, 17).closePath().fillAndStroke('#0F172A', '#B45309');
  doc.moveTo(16, 11).quadraticCurveTo(8, 8, 0, 10).lineTo(0, 16).quadraticCurveTo(8, 14, 16, 17).closePath().fillAndStroke('#0F172A', '#B45309');
  doc.moveTo(0, 10).lineTo(0, 16).lineWidth(1.2).strokeColor('#B45309').stroke();

  doc.restore();
}

/**
 * Draw Official Double-Ring Vector Seal
 */
function drawOfficialDoubleRingSeal(doc, cx, cy, radius = 34) {
  doc.save();
  // Outer circle
  doc.circle(cx, cy, radius).lineWidth(2).strokeColor('#B45309').stroke();
  // Middle decorative dashed ring
  doc.circle(cx, cy, radius - 3.5).lineWidth(0.8).dash(3, { space: 2 }).strokeColor('#0F172A').stroke().undash();
  // Inner ring
  doc.circle(cx, cy, radius - 6.5).lineWidth(1.2).strokeColor('#B45309').stroke();

  // Central emblem
  drawScalesAndBookEmblem(doc, cx, cy - 3, 0.55);

  // Seal typography
  const hasCinzel = doc._fontFamilies && doc._fontFamilies['Cinzel'];
  doc.font(hasCinzel ? 'Cinzel' : 'Helvetica-Bold').fontSize(5.5).fillColor('#0F172A')
    .text('BJS & BAR ACADEMY', cx - 28, cy - 21, { width: 56, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(5).fillColor('#B45309')
    .text('VERIFIED & CERTIFIED', cx - 26, cy + 12, { width: 52, align: 'center' });
  doc.font('Helvetica').fontSize(4.5).fillColor('#64748B')
    .text('DHAKA, BANGLADESH', cx - 26, cy + 19, { width: 52, align: 'center' });

  doc.restore();
}

/**
 * Draw Corner Ornamental Flourishes
 */
function drawCornerFlourishes(doc, width, height) {
  doc.save();
  doc.strokeColor('#B45309').lineWidth(1);

  const corners = [
    { x: 30, y: 30, dx: 1, dy: 1 },
    { x: width - 30, y: 30, dx: -1, dy: 1 },
    { x: 30, y: height - 30, dx: 1, dy: -1 },
    { x: width - 30, y: height - 30, dx: -1, dy: -1 }
  ];

  corners.forEach(({ x, y, dx, dy }) => {
    // Corner outer bracket
    doc.moveTo(x, y + 16 * dy).lineTo(x, y).lineTo(x + 16 * dx, y).stroke();
    // Inner diamond accent
    doc.moveTo(x + 5 * dx, y + 5 * dy)
      .lineTo(x + 9 * dx, y + 5 * dy)
      .lineTo(x + 5 * dx, y + 9 * dy)
      .closePath().fill('#B45309');
  });

  doc.restore();
}

/**
 * Register VIP Fonts on PDFKit document with graceful fallback
 */
function registerVipFonts(doc) {
  const fonts = {
    'Cinzel': path.join(FONT_DIR, 'Cinzel-Bold.ttf'),
    'GreatVibes': path.join(FONT_DIR, 'GreatVibes-Regular.ttf'),
    'Cormorant-Regular': path.join(FONT_DIR, 'CormorantGaramond-Regular.ttf'),
    'Cormorant-Italic': path.join(FONT_DIR, 'CormorantGaramond-Italic.ttf'),
    'Playfair-Bold': path.join(FONT_DIR, 'PlayfairDisplay-Bold.ttf'),
    'Playfair-Italic': path.join(FONT_DIR, 'PlayfairDisplay-Italic.ttf')
  };

  doc._vipFonts = {};

  for (const [name, filePath] of Object.entries(fonts)) {
    try {
      if (fs.existsSync(filePath)) {
        doc.registerFont(name, filePath);
        doc._vipFonts[name] = true;
      }
    } catch (e) {
      console.warn(`[Certificate PDF] Font registration notice (${name}):`, e.message);
    }
  }
}

/**
 * Generate a luxury VIP high-resolution PDF Certificate with embedded typography & QR Code
 */
async function generateCertificatePdf({
  certificateId,
  studentName,
  courseTitle,
  university,
  studentRoll,
  marksGrade,
  syllabusDescription,
  issueDate,
  verificationUrl
}) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Generate QR Code Data URL as PNG Buffer
      const targetUrl = verificationUrl || `https://bjs.kodl.uk/verify/${certificateId}`;
      const qrBuffer = await QRCode.toBuffer(targetUrl, {
        width: 130,
        margin: 1,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF'
        }
      });

      // Landscape A4: 841.89 x 595.28 points
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 20, bottom: 20, left: 20, right: 20 }
      });

      registerVipFonts(doc);

      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const width = doc.page.width;
      const height = doc.page.height;

      // Font resolve helpers with fallback
      const fCinzel = doc._vipFonts?.['Cinzel'] ? 'Cinzel' : 'Helvetica-Bold';
      const fGreatVibes = doc._vipFonts?.['GreatVibes'] ? 'GreatVibes' : 'Times-Italic';
      const fCormorantReg = doc._vipFonts?.['Cormorant-Regular'] ? 'Cormorant-Regular' : 'Times-Roman';
      const fCormorantItalic = doc._vipFonts?.['Cormorant-Italic'] ? 'Cormorant-Italic' : 'Times-Italic';
      const fPlayfairBold = doc._vipFonts?.['Playfair-Bold'] ? 'Playfair-Bold' : 'Helvetica-Bold';
      const fPlayfairItalic = doc._vipFonts?.['Playfair-Italic'] ? 'Playfair-Italic' : 'Times-Italic';

      // 1. Outer Golden Luxury Border
      doc.rect(18, 18, width - 36, height - 36)
        .lineWidth(3.5)
        .strokeColor('#B45309')
        .stroke();

      // 2. Middle Navy Regal Border
      doc.rect(24, 24, width - 48, height - 48)
        .lineWidth(1.2)
        .strokeColor('#0F172A')
        .stroke();

      // 3. Inner Fine Gold Pinstripe Border
      doc.rect(27, 27, width - 54, height - 54)
        .lineWidth(0.6)
        .strokeColor('#D97706')
        .stroke();

      // 4. Corner Accents & Filigree Flourishes
      drawCornerFlourishes(doc, width, height);

      // 5. Top Center Scales & Book Vector Emblem
      drawScalesAndBookEmblem(doc, width / 2, 46, 1.25);

      // 6. Header Academy Name (Cinzel Bold)
      doc.y = 66;
      doc.fontSize(21)
        .font(fCinzel)
        .fillColor('#0F172A')
        .text('BJS & BAR ACADEMY', { align: 'center', characterSpacing: 2.5 });

      // Sub-header
      doc.moveDown(0.15);
      doc.fontSize(8)
        .font(fPlayfairBold)
        .fillColor('#64748B')
        .text('PREMIER JUDICIARY & ADVOCACY EXCELLENCE PORTAL | BANGLADESH', { align: 'center', characterSpacing: 1.5 });

      // Diploma Title
      doc.moveDown(0.4);
      doc.fontSize(14)
        .font(fCinzel)
        .fillColor('#B45309')
        .text('CERTIFICATE OF COURSE COMPLETION', { align: 'center', characterSpacing: 2 });

      // Preamble Citation
      doc.moveDown(0.3);
      doc.fontSize(10.5)
        .font(fCormorantItalic)
        .fillColor('#475569')
        .text('This is to proudly certify that', { align: 'center' });

      // Student Name (VIP Cursive / Calligraphy Script)
      doc.moveDown(0.15);
      const studentDisplayName = (studentName || 'Student Name').trim();
      doc.fontSize(33)
        .font(fGreatVibes)
        .fillColor('#0F172A')
        .text(studentDisplayName, { align: 'center' });

      // Golden Flourish Underline under name
      const nameLineWidth = 320;
      const startX = (width - nameLineWidth) / 2;
      const underlineY = doc.y + 2;
      doc.moveTo(startX, underlineY).lineTo(startX + nameLineWidth, underlineY).lineWidth(1.2).strokeColor('#B45309').stroke();
      doc.circle(width / 2, underlineY, 2).fill('#B45309');

      // Academic Institution & Student ID / Roll Subtitle
      doc.y = underlineY + 6;
      const credParts = [];
      if (university && university.trim()) credParts.push(university.trim());
      if (studentRoll && studentRoll.trim()) credParts.push(`Roll / Student ID: ${studentRoll.trim()}`);
      if (credParts.length > 0) {
        doc.fontSize(9.5)
          .font(fCormorantReg)
          .fillColor('#334155')
          .text(credParts.join('   •   '), { align: 'center' });
        doc.moveDown(0.25);
      } else {
        doc.moveDown(0.35);
      }

      // Course Completion Lead
      doc.fontSize(10)
        .font(fCormorantItalic)
        .fillColor('#475569')
        .text('has successfully completed the comprehensive professional syllabus and academic assessments for:', { align: 'center' });

      // Course Name (Regal Serif Font - Playfair Bold)
      doc.moveDown(0.2);
      doc.fontSize(16)
        .font(fPlayfairBold)
        .fillColor('#1E3A8A')
        .text(courseTitle || 'Judiciary & Bar Council Masterclass', { align: 'center', characterSpacing: 1 });

      // Course-Specific Dynamic Syllabus Description
      const finalSyllabus = (syllabusDescription || getCuratedSyllabus(courseTitle)).trim();
      doc.moveDown(0.3);
      const sylBoxWidth = 560;
      doc.fontSize(9.2)
        .font(fCormorantItalic)
        .fillColor('#334155')
        .text(finalSyllabus, (width - sylBoxWidth) / 2, doc.y, {
          width: sylBoxWidth,
          align: 'center',
          lineGap: 2.2
        });

      // Marks / Score Achieved (if provided)
      if (marksGrade && marksGrade.trim()) {
        doc.moveDown(0.3);
        doc.fontSize(9.5)
          .font(fPlayfairBold)
          .fillColor('#B45309')
          .text(marksGrade.trim(), { align: 'center' });
      }

      // Bottom Area: Left Signature, Center Seal, Right QR Code
      const bottomY = height - 128;
      const dateStr = issueDate
        ? new Date(issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB');

      // Left: Authorized Academic Council Director
      doc.fontSize(8.5).font(fCormorantReg).fillColor('#64748B').text('Date of Issue: ' + dateStr, 58, bottomY + 2);
      doc.moveTo(58, bottomY + 32).lineTo(230, bottomY + 32).lineWidth(1).strokeColor('#94A3B8').stroke();
      doc.fontSize(9.5).font(fPlayfairBold).fillColor('#0F172A').text('Academic Council Director', 58, bottomY + 38);
      doc.fontSize(8.5).font(fCormorantReg).fillColor('#64748B').text('BJS & Bar Aspirants Academy', 58, bottomY + 50);

      // Center: Official Authenticity Seal
      const sealX = width / 2;
      drawOfficialDoubleRingSeal(doc, sealX, bottomY + 24, 34);

      // Right: High-Res QR Code + Certificate ID
      const qrX = width - 180;
      doc.image(qrBuffer, qrX, bottomY - 14, { width: 72, height: 72 });
      doc.fontSize(8).font(fPlayfairBold).fillColor('#0F172A').text('CERTIFICATE ID:', qrX + 80, bottomY + 5);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#B45309').text(certificateId, qrX + 80, bottomY + 18, { width: 95 });
      doc.fontSize(6.8).font('Helvetica').fillColor('#64748B').text('Scan QR to verify authenticity online at bjs.kodl.uk', qrX + 80, bottomY + 32, { width: 95 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateCertificatePdf,
  generateCourseSyllabusWithAi,
  getCuratedSyllabus,
  CURATED_SYLLABUS
};
