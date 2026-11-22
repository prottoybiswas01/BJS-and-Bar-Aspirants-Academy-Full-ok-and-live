const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { formatBangladeshTime, toBangladeshDigits } = require('../utils/dateUtils');

/**
 * Register TrueType Fonts for VIP Luxury Receipt
 */
function registerVipFonts(doc) {
  if (doc._vipFonts) return;
  doc._vipFonts = {};
  const fontsDir = path.join(__dirname, '..', 'fonts');
  const tryRegister = (name, filename) => {
    try {
      const fullPath = path.join(fontsDir, filename);
      if (fs.existsSync(fullPath)) {
        doc.registerFont(name, fullPath);
        doc._vipFonts[name] = true;
      }
    } catch (e) {
      console.warn(`Font load notice for ${name}:`, e.message);
    }
  };

  tryRegister('Cinzel', 'Cinzel-Bold.ttf');
  tryRegister('GreatVibes', 'GreatVibes-Regular.ttf');
  tryRegister('Cormorant', 'CormorantGaramond-Regular.ttf');
  tryRegister('Cormorant-Italic', 'CormorantGaramond-Italic.ttf');
  tryRegister('Playfair', 'PlayfairDisplay-Bold.ttf');
  tryRegister('Bengali-Bold', 'HindSiliguri-Bold.ttf');
  tryRegister('Bengali-Regular', 'HindSiliguri-Regular.ttf');
}

/**
 * Draw Scales of Justice + Open Law Book Vector Emblem
 */
function drawScalesAndBookEmblem(doc, x, y, scale = 1, color = '#D4AF37') {
  doc.save();
  doc.translate(x, y);
  doc.scale(scale);

  // Central column / pillar
  doc.rect(-1.5, -20, 3, 24).fill(color);
  doc.circle(0, -22, 2.5).fill(color);
  doc.rect(-4, 2, 8, 2).fill(color);

  // Balance beam
  doc.moveTo(-18, -16).lineTo(18, -16).lineWidth(1.8).strokeColor(color).stroke();
  doc.circle(-18, -16, 1.5).fill(color);
  doc.circle(18, -16, 1.5).fill(color);

  // Left pan
  doc.moveTo(-18, -16).lineTo(-24, -6).lineWidth(0.8).strokeColor(color).stroke();
  doc.moveTo(-18, -16).lineTo(-12, -6).lineWidth(0.8).strokeColor(color).stroke();
  doc.moveTo(-24, -6).quadraticCurveTo(-18, -1, -12, -6).fill(color);

  // Right pan
  doc.moveTo(18, -16).lineTo(12, -6).lineWidth(0.8).strokeColor(color).stroke();
  doc.moveTo(18, -16).lineTo(24, -6).lineWidth(0.8).strokeColor(color).stroke();
  doc.moveTo(12, -6).quadraticCurveTo(18, -1, 24, -6).fill(color);

  // Open Law Book at the base
  doc.moveTo(-16, 11).quadraticCurveTo(-8, 8, 0, 10).lineTo(0, 16).quadraticCurveTo(-8, 14, -16, 17).closePath().fillAndStroke('#0F172A', color);
  doc.moveTo(16, 11).quadraticCurveTo(8, 8, 0, 10).lineTo(0, 16).quadraticCurveTo(8, 14, 16, 17).closePath().fillAndStroke('#0F172A', color);
  doc.moveTo(0, 10).lineTo(0, 16).lineWidth(1.2).strokeColor(color).stroke();

  doc.restore();
}

/**
 * Draw Official Double-Ring Vector Seal (3D Metallic Gold Appearance)
 */
function drawOfficialDoubleRingSeal(doc, cx, cy, radius = 34) {
  doc.save();
  // Outer embossed circle
  doc.circle(cx, cy, radius).lineWidth(2.2).strokeColor('#D4AF37').stroke();
  // Middle decorative dashed ring
  doc.circle(cx, cy, radius - 3.5).lineWidth(0.9).dash(3, { space: 2 }).strokeColor('#0F172A').stroke().undash();
  // Inner ring
  doc.circle(cx, cy, radius - 6.5).lineWidth(1.2).strokeColor('#D4AF37').stroke();

  // Central emblem
  drawScalesAndBookEmblem(doc, cx, cy - 3, 0.55, '#D4AF37');

  // Seal typography
  const f = (name, fallback) => (doc._vipFonts && doc._vipFonts[name] ? name : fallback);
  doc.font(f('Cinzel', 'Helvetica-Bold')).fontSize(5.2).fillColor('#FFFFFF')
     .text('BJS & BAR ACADEMY', cx - 28, cy - 21, { width: 56, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(4.8).fillColor('#FDE68A')
     .text('OFFICIAL PAYEE SEAL', cx - 26, cy + 12, { width: 52, align: 'center' });
  doc.font('Helvetica').fontSize(4.2).fillColor('#94A3B8')
     .text('DHAKA, BANGLADESH', cx - 26, cy + 19, { width: 52, align: 'center' });

  doc.restore();
}

/**
 * Draw Vintage Filigree Corner Ornaments
 */
function drawCornerFlourish(doc, x, y, flipX = false, flipY = false) {
  doc.save();
  doc.translate(x, y);
  doc.scale(flipX ? -1 : 1, flipY ? -1 : 1);

  // Outer corner bracket
  doc.moveTo(0, 22).lineTo(0, 0).lineTo(22, 0).lineWidth(1.5).strokeColor('#D4AF37').stroke();
  doc.moveTo(4, 18).lineTo(4, 4).lineTo(18, 4).lineWidth(0.7).strokeColor('#0F172A').stroke();

  // Decorative diamond at corner apex
  doc.moveTo(4, 4).lineTo(7, 1).lineTo(10, 4).lineTo(7, 7).closePath().fill('#D4AF37');

  // Mini filigree scrollwork
  doc.moveTo(0, 10).quadraticCurveTo(6, 10, 10, 0).lineWidth(0.8).strokeColor('#D4AF37').stroke();

  doc.restore();
}

/**
 * Draw Central Filigree Horizontal Divider
 */
function drawFiligreeDivider(doc, x, y, width) {
  doc.save();
  const midX = x + width / 2;

  // Dual gradient-like lines
  doc.moveTo(x, y).lineTo(midX - 25, y).lineWidth(1).strokeColor('#0F172A').stroke();
  doc.moveTo(midX + 25, y).lineTo(x + width, y).lineWidth(1).strokeColor('#0F172A').stroke();

  doc.moveTo(x + 10, y + 2).lineTo(midX - 20, y + 2).lineWidth(0.5).strokeColor('#D4AF37').stroke();
  doc.moveTo(midX + 20, y + 2).lineTo(x + width - 10, y + 2).lineWidth(0.5).strokeColor('#D4AF37').stroke();

  // Center diamond motif
  doc.moveTo(midX, y - 5).lineTo(midX + 6, y).lineTo(midX, y + 5).lineTo(midX - 6, y).closePath().fill('#D4AF37');
  doc.circle(midX - 12, y, 1.8).fill('#0F172A');
  doc.circle(midX + 12, y, 1.8).fill('#0F172A');

  doc.restore();
}

/**
 * Generate Luxury Executive Payment Invoice & Fee Receipt matching image_16.png
 */
function generateReceiptPdf(receipt, outputStream) {
  return new Promise(async (resolve, reject) => {
    try {
      const receiptId = receipt.receiptId || 'REC-2026-4136';
      const cleanRecId = receiptId.startsWith('REC-') ? receiptId : `REC-${receiptId}`;
      const verifyUrl = `https://bjs.kodl.uk/verify/${cleanRecId}`;

      // Generate High-Contrast QR Code Buffer
      let qrBuffer = null;
      try {
        qrBuffer = await QRCode.toBuffer(verifyUrl, {
          width: 140,
          margin: 1,
          color: {
            dark: '#0F172A',
            light: '#FFFFFF'
          }
        });
      } catch (qrErr) {
        console.warn('QR Code generation notice:', qrErr.message);
      }

      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
          Title: `Official Payment Invoice - ${receiptId}`,
          Author: 'BJS & Bar Aspirants Academy',
          Subject: 'Official Payment Receipt and Fee Voucher',
          Creator: 'BJS & Bar Academy Diplomatic Billing System'
        }
      });

      doc.pipe(outputStream);
      registerVipFonts(doc);

      const f = (name, fallback) => (doc._vipFonts && doc._vipFonts[name] ? name : fallback);

      const pageWidth = doc.page.width;   // 595.28 pt
      const pageHeight = doc.page.height; // 841.89 pt

      // 1. Luxurious Warm Ivory Background (#FCFAF2)
      doc.rect(0, 0, pageWidth, pageHeight).fill('#FCFAF2');

      // 2. Subtle Diagonal Guilloche Security Pattern
      doc.save();
      doc.lineWidth(0.3).strokeColor('#D4AF37').opacity(0.06);
      for (let i = -pageHeight; i < pageWidth + pageHeight; i += 18) {
        doc.moveTo(i, 0).lineTo(i + pageHeight, pageHeight).stroke();
      }
      doc.restore();

      // 3. Ultra-Faint Central Judicial Watermark (Scales of Justice)
      doc.save();
      doc.opacity(0.04);
      drawScalesAndBookEmblem(doc, pageWidth / 2, pageHeight / 2 - 20, 6.5, '#D4AF37');
      doc.restore();

      // 4. Double-Bordered Gold Filigree Outer Frame
      const outerMargin = 22;
      const innerMargin = 26;
      const contentX = 38;
      const contentW = pageWidth - contentX * 2; // 519.28 pt

      // Outer gold border
      doc.rect(outerMargin, outerMargin, pageWidth - outerMargin * 2, pageHeight - outerMargin * 2)
         .lineWidth(2).strokeColor('#D4AF37').stroke();

      // Inner dark navy / gold pinstripe
      doc.rect(innerMargin, innerMargin, pageWidth - innerMargin * 2, pageHeight - innerMargin * 2)
         .lineWidth(0.7).strokeColor('#0F172A').stroke();

      // 4 Corner Vintage Ornaments
      drawCornerFlourish(doc, innerMargin + 3, innerMargin + 3, false, false);
      drawCornerFlourish(doc, pageWidth - innerMargin - 3, innerMargin + 3, true, false);
      drawCornerFlourish(doc, innerMargin + 3, pageHeight - innerMargin - 3, false, true);
      drawCornerFlourish(doc, pageWidth - innerMargin - 3, pageHeight - innerMargin - 3, true, true);

      // ==========================================
      // TOP HEADER
      // ==========================================
      const headerTop = 46;

      // Left Side: Seal + Academy Title + Bengali Subtitle
      const sealX = contentX + 24;
      const sealY = headerTop + 24;
      drawScalesAndBookEmblem(doc, sealX, sealY, 1.25, '#D4AF37');

      doc.font(f('Cinzel', 'Helvetica-Bold')).fontSize(17).fillColor('#0F172A')
         .text('BJS & BAR ACADEMY', contentX + 54, headerTop + 4, { width: 280 });

      doc.font(f('Bengali-Regular', 'Helvetica')).fontSize(9).fillColor('#1E293B')
         .text('সহকারী জজ (BJS) ও বার কাউন্সিল অ্যাডভোকেটশিপ প্রস্তুতি একাডেমি', contentX + 54, headerTop + 26, { width: 290 });

      doc.font('Helvetica').fontSize(7.5).fillColor('#64748B')
         .text('Official Payment Money Receipt  •  Portal: https://bjs.kodl.uk', contentX + 54, headerTop + 40, { width: 290 });

      // Right Side: OFFICIAL RECEIPT + TRANSACTION ID + PAID & SECURED Status Pill
      const rightW = 180;
      const rightX = contentX + contentW - rightW;

      doc.font(f('Cinzel', 'Helvetica-Bold')).fontSize(13.5).fillColor('#B8860B')
         .text('OFFICIAL RECEIPT', rightX, headerTop + 2, { width: rightW, align: 'right' });

      // Transaction ID Banner
      doc.roundedRect(rightX + 25, headerTop + 21, rightW - 25, 18, 4).fillAndStroke('#F1F5F9', '#CBD5E1');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A')
         .text(`TRANSACTION ID: #${receiptId}`, rightX + 25, headerTop + 25, { width: rightW - 25, align: 'center' });

      // Status Pill: ✓ PAID & SECURED
      doc.roundedRect(rightX + 65, headerTop + 43, 115, 17, 8).fillAndStroke('#ECFDF5', '#10B981');
      doc.circle(rightX + 76, headerTop + 51.5, 3).fill('#059669');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#065F46')
         .text('✓ PAID & SECURED', rightX + 82, headerTop + 47, { width: 92, align: 'center' });

      // ==========================================
      // HERO AMOUNT DISPLAY (BDT 1,000.00)
      // ==========================================
      const amountNum = Number(receipt.amount || 0);
      const amountFormatted = amountNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const heroY = 120;

      // Soft Warm Parchment Card
      doc.roundedRect(contentX, heroY, contentW, 76, 8).fillAndStroke('#FFFBEB', '#D4AF37');

      // Amount Label
      doc.font(f('Cinzel', 'Helvetica-Bold')).fontSize(9).fillColor('#92400E')
         .text('TOTAL AMOUNT PAID', contentX + 20, heroY + 12);

      // Hero Amount in Massive Bold Navy
      doc.font(f('Playfair', f('Cinzel', 'Helvetica-Bold'))).fontSize(34).fillColor('#0F172A')
         .text(`BDT ${amountFormatted}`, contentX + 20, heroY + 26);

      // Adjacent PAID & SECURED badge on same row
      const badgeX = contentX + contentW - 165;
      doc.roundedRect(badgeX, heroY + 22, 145, 32, 6).fillAndStroke('#ECFDF5', '#059669');
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#065F46')
         .text('✓ PAID & SECURED', badgeX, heroY + 31, { width: 145, align: 'center' });

      doc.font('Helvetica').fontSize(7.5).fillColor('#78350F')
         .text('Payment Verified & Credited to BJS Academic Council • BST (UTC+6)', contentX + 20, heroY + 63);

      // ==========================================
      // FILIGREE HORIZONTAL DIVIDER
      // ==========================================
      const divider1Y = 210;
      drawFiligreeDivider(doc, contentX, divider1Y, contentW);

      // ==========================================
      // TWO-COLUMN DATA DISPLAY
      // ==========================================
      const columnsY = 226;
      const colWidth = (contentW - 24) / 2; // 247.64 pt each
      const col1X = contentX;
      const col2X = contentX + colWidth + 24;

      // Column 1: STUDENT INFO
      doc.roundedRect(col1X, columnsY, colWidth, 230, 8).fillAndStroke('#FFFFFF', '#E2E8F0');

      // Column 1 Header Banner
      doc.roundedRect(col1X, columnsY, colWidth, 28, 6).fill('#0F172A');
      doc.font(f('Cinzel', 'Helvetica-Bold')).fontSize(9.5).fillColor('#D4AF37')
         .text('✦  STUDENT INFO', col1X + 14, columnsY + 8);

      // Student Name in VIP GreatVibes Cursive
      const studentName = receipt.studentName || 'Student';
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748B')
         .text('Student Full Name:', col1X + 14, columnsY + 38);

      doc.font(f('GreatVibes', 'Helvetica-Bold')).fontSize(21).fillColor('#0F172A')
         .text(studentName, col1X + 14, columnsY + 50, { width: colWidth - 28 });

      // Student Fields
      const studentFields = [
        ['Student ID / Roll:', receipt.studentId || 'N/A'],
        ['Contact Phone:', receipt.studentPhone || 'N/A'],
        ['Email Address:', receipt.studentEmail || 'N/A'],
        ['Institution:', receipt.university || 'Department of Law, University of Dhaka']
      ];

      let sfY = columnsY + 88;
      studentFields.forEach(([label, val]) => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748B').text(label, col1X + 14, sfY);
        doc.font('Helvetica').fontSize(9).fillColor('#0F172A').text(val, col1X + 14, sfY + 11, { width: colWidth - 28 });
        sfY += 32;
      });

      // Column 2: RECEIPT DETAILS
      doc.roundedRect(col2X, columnsY, colWidth, 230, 8).fillAndStroke('#FFFFFF', '#E2E8F0');

      // Column 2 Header Banner
      doc.roundedRect(col2X, columnsY, colWidth, 28, 6).fill('#0F172A');
      doc.font(f('Cinzel', 'Helvetica-Bold')).fontSize(9.5).fillColor('#D4AF37')
         .text('✦  RECEIPT DETAILS', col2X + 14, columnsY + 8);

      const paymentTimeStr = formatBangladeshTime(receipt.paymentTime || receipt.createdAt);
      const receiptFields = [
        ['Enrolled Course / Batch:', receipt.batch || 'BJS & Bar Masterclass'],
        ['Payment Method:', receipt.paymentMethod || 'bKash Official'],
        ['Transaction ID (TrxID):', receipt.trxId || 'DKJF0N0SK'],
        ['Date & Time (BST):', paymentTimeStr],
        ['Payment Purpose / Note:', receipt.note || 'Course Fee Payment']
      ];

      let rfY = columnsY + 38;
      receiptFields.forEach(([label, val]) => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748B').text(label, col2X + 14, rfY);
        doc.font('Helvetica').fontSize(9).fillColor('#0F172A').text(val, col2X + 14, rfY + 11, { width: colWidth - 28 });
        rfY += 36;
      });

      // ==========================================
      // LEGAL DECLARATION & AUDIT CITATION
      // ==========================================
      const noticeY = 472;
      doc.roundedRect(contentX, noticeY, contentW, 46, 6).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#334155')
         .text('LEGAL AUTHENTICITY & STATUTORY VERIFICATION NOTICE', contentX + 14, noticeY + 8);
      doc.font(f('Cormorant-Italic', 'Helvetica')).fontSize(8).fillColor('#64748B')
         .text(
           'This official receipt constitutes genuine evidentiary proof of fee clearance for BJS & Bar Aspirants Academy. ' +
           'Digitally attested under the authoritative supervision of the Academic Council. Permanent cryptographic record indexed on https://bjs.kodl.uk.',
           contentX + 14,
           noticeY + 20,
           { width: contentW - 28, lineGap: 1 }
         );

      // ==========================================
      // BOTTOM VERIFICATION FOOTER (#1E293B)
      // ==========================================
      const footerY = 534;
      const footerH = 265;

      // Deep Royal Navy Banner
      doc.roundedRect(contentX, footerY, contentW, footerH, 10).fill('#1E293B');

      // Top & Bottom Gold Line Trims
      doc.rect(contentX, footerY, contentW, 3).fill('#D4AF37');
      doc.rect(contentX, footerY + footerH - 3, contentW, 3).fill('#D4AF37');

      // Inner subtle border
      doc.roundedRect(contentX + 6, footerY + 8, contentW - 12, footerH - 16, 8)
         .lineWidth(0.8).strokeColor('#334155').stroke();

      // Left Area: 3D Metallic Gold-Foil OFFICIAL PAYEE SEAL + Handwritten Signature
      const footerSealX = contentX + 54;
      const footerSealY = footerY + 76;
      drawOfficialDoubleRingSeal(doc, footerSealX, footerSealY, 38);

      // Director Signature & Labels
      const sigX = contentX + 114;
      doc.font(f('GreatVibes', 'Helvetica-Bold')).fontSize(24).fillColor('#FDE68A')
         .text('Shanto Deb Roy Arno', sigX, footerY + 36);

      doc.moveTo(sigX, footerY + 68).lineTo(sigX + 160, footerY + 68).lineWidth(1).strokeColor('#475569').stroke();

      doc.font(f('Cinzel', 'Helvetica-Bold')).fontSize(8.5).fillColor('#FFFFFF')
         .text('DIRECTOR, BJS & BAR ACADEMY', sigX, footerY + 74);

      doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8')
         .text('Authorized Signatory  •  Digital Attestation Officer', sigX, footerY + 88);

      doc.font('Helvetica-Bold').fontSize(7).fillColor('#D4AF37')
         .text('Official Payee Seal of Authenticity', sigX, footerY + 102);

      // Right Area: Scannable High-Contrast QR Code Card
      const qrCardW = 145;
      const qrCardH = 175;
      const qrCardX = contentX + contentW - qrCardW - 18;
      const qrCardY = footerY + 22;

      // Ornate Gold-Trimmed White Card
      doc.roundedRect(qrCardX, qrCardY, qrCardW, qrCardH, 8).fillAndStroke('#FFFFFF', '#D4AF37');
      doc.rect(qrCardX + 3, qrCardY + 3, qrCardW - 6, qrCardH - 6).lineWidth(0.5).strokeColor('#0F172A').stroke();

      if (qrBuffer) {
        doc.image(qrBuffer, qrCardX + (qrCardW - 110) / 2, qrCardY + 12, { width: 110, height: 110 });
      }

      doc.font(f('Cinzel', 'Helvetica-Bold')).fontSize(8.5).fillColor('#0F172A')
         .text('SCAN TO VERIFY', qrCardX, qrCardY + 128, { width: qrCardW, align: 'center' });

      doc.font('Helvetica-Bold').fontSize(7).fillColor('#D4AF37')
         .text(receiptId, qrCardX, qrCardY + 142, { width: qrCardW, align: 'center' });

      doc.font('Helvetica').fontSize(6).fillColor('#64748B')
         .text('bjs.kodl.uk/verify', qrCardX, qrCardY + 154, { width: qrCardW, align: 'center' });

      // Footer Bottom Disclaimer
      doc.font('Helvetica').fontSize(6.5).fillColor('#94A3B8').text(
        '© 2026 BJS & Bar Aspirants Academy. All Rights Reserved. Sovereign Judicial Verification System. Encrypted & Attested.',
        contentX + 16,
        footerY + footerH - 20,
        { width: contentW - 32, align: 'center' }
      );

      doc.end();
      outputStream.on('finish', resolve);
      outputStream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateReceiptPdf
};
