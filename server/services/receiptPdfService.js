const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const { formatBangladeshTime, toBangladeshDigits } = require('../utils/dateUtils');

/**
 * Draw Scales of Justice + Open Law Book Vector Emblem
 */
function drawScalesAndBookEmblem(doc, x, y, scale = 1) {
  doc.save();
  doc.translate(x, y);
  doc.scale(scale);

  // Central column / pillar
  doc.rect(-1.5, -20, 3, 24).fill('#D97706');
  doc.circle(0, -22, 2.5).fill('#D97706');
  doc.rect(-4, 2, 8, 2).fill('#D97706');

  // Balance beam
  doc.moveTo(-18, -16).lineTo(18, -16).lineWidth(1.8).strokeColor('#D97706').stroke();
  doc.circle(-18, -16, 1.5).fill('#D97706');
  doc.circle(18, -16, 1.5).fill('#D97706');

  // Left pan
  doc.moveTo(-18, -16).lineTo(-24, -6).lineWidth(0.8).strokeColor('#D97706').stroke();
  doc.moveTo(-18, -16).lineTo(-12, -6).lineWidth(0.8).strokeColor('#D97706').stroke();
  doc.moveTo(-24, -6).quadraticCurveTo(-18, -1, -12, -6).fill('#D97706');

  // Right pan
  doc.moveTo(18, -16).lineTo(12, -6).lineWidth(0.8).strokeColor('#D97706').stroke();
  doc.moveTo(18, -16).lineTo(24, -6).lineWidth(0.8).strokeColor('#D97706').stroke();
  doc.moveTo(12, -6).quadraticCurveTo(18, -1, 24, -6).fill('#D97706');

  // Open Law Book at the base
  doc.moveTo(-16, 11).quadraticCurveTo(-8, 8, 0, 10).lineTo(0, 16).quadraticCurveTo(-8, 14, -16, 17).closePath().fillAndStroke('#0F172A', '#D97706');
  doc.moveTo(16, 11).quadraticCurveTo(8, 8, 0, 10).lineTo(0, 16).quadraticCurveTo(8, 14, 16, 17).closePath().fillAndStroke('#0F172A', '#D97706');
  doc.moveTo(0, 10).lineTo(0, 16).lineWidth(1.2).strokeColor('#D97706').stroke();

  doc.restore();
}

/**
 * Draw Official Double-Ring Vector Seal
 */
function drawOfficialDoubleRingSeal(doc, cx, cy, radius = 34) {
  doc.save();
  // Outer circle
  doc.circle(cx, cy, radius).lineWidth(2).strokeColor('#D97706').stroke();
  // Middle decorative dashed ring
  doc.circle(cx, cy, radius - 3.5).lineWidth(0.8).dash(3, { space: 2 }).strokeColor('#0F172A').stroke().undash();
  // Inner ring
  doc.circle(cx, cy, radius - 6.5).lineWidth(1.2).strokeColor('#D97706').stroke();

  // Central emblem
  drawScalesAndBookEmblem(doc, cx, cy - 3, 0.55);

  // Seal typography
  doc.font('Helvetica-Bold').fontSize(5.5).fillColor('#0F172A')
     .text('BJS & BAR ACADEMY', cx - 28, cy - 21, { width: 56, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(5).fillColor('#D97706')
     .text('PAID & VERIFIED', cx - 26, cy + 12, { width: 52, align: 'center' });
  doc.font('Helvetica').fontSize(4.5).fillColor('#64748B')
     .text('DHAKA, BANGLADESH', cx - 26, cy + 19, { width: 52, align: 'center' });

  doc.restore();
}

/**
 * Generate International Standard Digital Money Receipt PDF
 */
function generateReceiptPdf(receipt, outputStream) {
  return new Promise(async (resolve, reject) => {
    try {
      const receiptId = receipt.receiptId || 'REC-2026-0000';
      const verifyUrl = `https://bjs.kodl.uk/verify/receipt-${receiptId}`;

      // Generate QR Code Buffer
      let qrBuffer = null;
      try {
        qrBuffer = await QRCode.toBuffer(verifyUrl, {
          width: 100,
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
        margin: 40,
        info: {
          Title: `Money Receipt - ${receiptId}`,
          Author: 'BJS & Bar Academy',
          Subject: 'Official Payment Receipt',
          Creator: 'BJS & Bar Academy Billing System'
        }
      });

      doc.pipe(outputStream);

      const boldFont = path.join(__dirname, '..', 'fonts', 'HindSiliguri-Bold.ttf');
      const regularFont = path.join(__dirname, '..', 'fonts', 'HindSiliguri-Regular.ttf');

      const width = doc.page.width;
      const startX = 40;
      const contentWidth = 515;

      // Top Dual-Tone Brand Accent Stripe (Midnight Navy & Sovereign Gold)
      doc.rect(startX, 35, contentWidth, 5).fill('#0F172A');
      doc.rect(startX, 40, contentWidth, 3).fill('#D97706');

      // Top Emblem and Header Block
      drawScalesAndBookEmblem(doc, startX + 35, 78, 1.1);

      doc.font(boldFont).fontSize(20).fillColor('#0F172A')
         .text('BJS & Bar Academy', startX + 75, 58, { width: 340 });
      doc.font(regularFont).fontSize(10).fillColor('#475569')
         .text('সহকারী জজ (BJS) ও বার কাউন্সিল অ্যাডভোকেটশিপ প্রস্তুতি একাডেমি', startX + 75, 78, { width: 340 });
      doc.font(regularFont).fontSize(8.5).fillColor('#0284C7')
         .text('অফিসিয়াল পোর্টাল: https://bjs.kodl.uk  |  ইমেইল: info@kodl.uk', startX + 75, 93, { width: 340 });

      // Receipt Title & Badge on Right
      doc.roundedRect(startX + 370, 56, 145, 46, 6).fillAndStroke('#FFFBEB', '#D97706');
      doc.font(boldFont).fontSize(9).fillColor('#B45309')
         .text('OFFICIAL MONEY RECEIPT', startX + 370, 64, { width: 145, align: 'center' });
      doc.font(boldFont).fontSize(11).fillColor('#0F172A')
         .text(`#${receiptId}`, startX + 370, 77, { width: 145, align: 'center' });
      doc.font(regularFont).fontSize(7.5).fillColor('#059669')
         .text('● VERIFIED & APPROVED', startX + 370, 91, { width: 145, align: 'center' });

      doc.y = 118;

      // Divider Line
      doc.moveTo(startX, 116).lineTo(startX + contentWidth, 116).lineWidth(1).strokeColor('#E2E8F0').stroke();

      // Bangladesh Standard Time formatted date
      const paymentTimeFormatted = formatBangladeshTime(receipt.paymentTime || receipt.createdAt);
      const amountVal = Number(receipt.amount || 0);

      // Two-Column Key-Value Grid
      const rows = [
        ['রসিদ নম্বর (Receipt ID)', receiptId],
        ['পরিশোধের সময় (Payment Time)', paymentTimeFormatted],
        ['শিক্ষার্থীর নাম (Student Name)', receipt.studentName || 'N/A'],
        ['শিক্ষার্থী আইডি (Student ID)', receipt.studentId || 'N/A'],
        ['মোবাইল নম্বর (Phone)', receipt.studentPhone || 'N/A'],
        ['ইমেইল (Email)', receipt.studentEmail || 'N/A'],
        ['কোর্স / ব্যাচ (Course / Batch)', receipt.batch || 'BJS & Bar Masterclass'],
        ['পেমেন্ট মেথড (Payment Method)', receipt.paymentMethod || 'bKash'],
        ['ট্রানজেকশন আইডি (TrxID)', receipt.trxId || 'N/A'],
        ['পরিশোধের বিবরণ (Note)', receipt.note || 'Course Fee Payment'],
        ['পেমেন্ট স্ট্যাটাস (Status)', 'পরিশোধিত (PAID - Verified)']
      ];

      let tableY = 126;
      const col1Width = 185;
      const col2Width = contentWidth - col1Width;
      const rowHeight = 23;

      rows.forEach((row, idx) => {
        const bg = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
        doc.rect(startX, tableY, contentWidth, rowHeight).fill(bg);
        doc.rect(startX, tableY, contentWidth, rowHeight).strokeColor('#E2E8F0').lineWidth(0.8).stroke();

        // Label
        doc.font(boldFont).fontSize(9).fillColor('#334155').text(row[0], startX + 12, tableY + 6, { width: col1Width - 16 });

        // Value
        const isStatus = idx === rows.length - 1;
        doc.font(isStatus ? boldFont : regularFont).fontSize(9)
           .fillColor(isStatus ? '#059669' : '#0F172A')
           .text(row[1], startX + col1Width + 10, tableY + 6, { width: col2Width - 20 });

        tableY += rowHeight;
      });

      // Total Amount Highlight Box
      tableY += 12;
      doc.roundedRect(startX, tableY, contentWidth, 44, 8).fillAndStroke('#FFFBEB', '#D97706');

      doc.font(boldFont).fontSize(10.5).fillColor('#92400E').text(
        'মোট পরিশোধিত ফি (Total Amount Paid):',
        startX + 16,
        tableY + 15
      );

      const amountText = `৳ ${toBangladeshDigits(amountVal.toLocaleString('en-IN'))} /-  (BDT ${amountVal.toLocaleString('en-IN')})`;
      doc.font(boldFont).fontSize(15).fillColor('#B45309').text(
        amountText,
        startX + 200,
        tableY + 12,
        { width: contentWidth - 215, align: 'right' }
      );

      // Bottom Section: Left Official Seal, Right QR Code & Signature
      tableY += 60;

      // 1. Official Vector Double-Ring Seal
      const sealX = startX + 65;
      const sealY = tableY + 30;
      drawOfficialDoubleRingSeal(doc, sealX, sealY, 36);

      // 2. Middle Authentication Notice
      doc.font(regularFont).fontSize(8.5).fillColor('#475569')
         .text('অনলাইন সত্যতা যাচাই ও অফিসিয়াল ভেরিফিকেশন', startX + 130, tableY + 8, { width: 230 });
      doc.font(regularFont).fontSize(7.5).fillColor('#64748B')
         .text('ডানপাশের QR কোড স্ক্যান করে অথবা ভেরিফিকেশন পোর্টালে গিয়ে এই রসিদের সত্যতা সরাসরি যাচাই করতে পারবেন। এটি BJS Academy-র অফিসিয়াল ডাটাবেজে চিরস্থায়ীভাবে সংরক্ষিত।', startX + 130, tableY + 22, { width: 230, lineGap: 1.5 });
      doc.font(regularFont).fontSize(7).fillColor('#94A3B8')
         .text(`ইস্যুকারী: ${receipt.issuedBy || 'Super Admin'} | BST (UTC+6) | bjs.kodl.uk`, startX + 130, tableY + 54, { width: 230 });

      // 3. Right QR Code & Paid Stamp
      if (qrBuffer) {
        doc.image(qrBuffer, startX + 375, tableY + 2, { width: 62, height: 62 });
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#0F172A')
           .text('SCAN TO VERIFY', startX + 442, tableY + 18, { width: 70 });
        doc.font('Helvetica').fontSize(6).fillColor('#D97706')
           .text(receiptId, startX + 442, tableY + 28, { width: 70 });
      }

      // Bottom Footer Rule
      const footerY = tableY + 85;
      doc.rect(startX, footerY, contentWidth, 1).fill('#E2E8F0');
      doc.font(regularFont).fontSize(7.5).fillColor('#94A3B8').text(
        '© 2026 BJS & Bar Academy. All Rights Reserved. Protected by Sovereign Digital Security.',
        startX,
        footerY + 8,
        { align: 'center', width: contentWidth }
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
