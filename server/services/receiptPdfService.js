const PDFDocument = require('pdfkit');
const path = require('path');
const { formatBangladeshTime, toBangladeshDigits } = require('../utils/dateUtils');

function generateReceiptPdf(receipt, outputStream) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Money Receipt - ${receipt.receiptId || 'BJS-Academy'}`,
          Author: 'BJS & Bar Aspirants Academy',
          Subject: 'Official Payment Receipt',
          Creator: 'BJS & Bar Academy Billing System'
        }
      });

      doc.pipe(outputStream);

      const boldFont = path.join(__dirname, '..', 'fonts', 'HindSiliguri-Bold.ttf');
      const regularFont = path.join(__dirname, '..', 'fonts', 'HindSiliguri-Regular.ttf');

      // Top Header Decorative Banner
      doc.rect(40, 40, 515, 6).fill('#0f766e');

      // Academy Header
      doc.moveDown(0.8);
      doc.font(boldFont).fontSize(22).fillColor('#0f172a').text('BJS & Bar Aspirants Academy', { align: 'center' });
      doc.font(regularFont).fontSize(11).fillColor('#475569').text('সহকারী জজ (BJS) ও বার কাউন্সিল অ্যাডভোকেটশিপ প্রস্তুতি একাডেমি', { align: 'center' });
      doc.font(regularFont).fontSize(9).fillColor('#0284c7').text('অফিসিয়াল পোর্টাল: https://bjs.kodl.uk  |  ইমেইল: info@kodl.uk', { align: 'center' });

      doc.moveDown(0.8);

      // Receipt Title Box
      const receiptId = receipt.receiptId || 'REC-2026-0000';
      const boxY = doc.y;
      doc.roundedRect(40, boxY, 515, 34, 6).fillAndStroke('#f0fdf4', '#10b981');
      doc.font(boldFont).fontSize(13).fillColor('#047857').text(
        `অফিসিয়াল পেমেন্ট রিসিট (MONEY RECEIPT) — #${receiptId}`,
        40,
        boxY + 9,
        { align: 'center', width: 515 }
      );

      doc.y = boxY + 46;

      // Bangladesh Standard Time formatted date
      const paymentTimeFormatted = formatBangladeshTime(receipt.paymentTime || receipt.createdAt, 'bn-BD');
      const amountVal = Number(receipt.amount || 0);

      // Info Table Grid (Row by Row)
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

      let tableY = doc.y;
      const startX = 40;
      const col1Width = 190;
      const col2Width = 325;
      const rowHeight = 24;

      rows.forEach((row, idx) => {
        const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
        doc.rect(startX, tableY, col1Width + col2Width, rowHeight).fill(bg);
        doc.rect(startX, tableY, col1Width + col2Width, rowHeight).strokeColor('#e2e8f0').stroke();

        // Label
        doc.font(boldFont).fontSize(9.5).fillColor('#334155').text(row[0], startX + 10, tableY + 6, { width: col1Width - 15 });

        // Value
        const isStatus = idx === rows.length - 1;
        doc.font(isStatus ? boldFont : regularFont).fontSize(9.5).fillColor(isStatus ? '#059669' : '#0f172a').text(
          row[1],
          startX + col1Width + 10,
          tableY + 6,
          { width: col2Width - 20 }
        );

        tableY += rowHeight;
      });

      // Total Amount Highlight Card
      tableY += 14;
      doc.roundedRect(startX, tableY, col1Width + col2Width, 48, 8).fillAndStroke('#ecfdf5', '#059669');

      doc.font(boldFont).fontSize(11).fillColor('#065f46').text(
        'মোট পরিশোধিত ফি (Total Amount Paid):',
        startX + 16,
        tableY + 16
      );

      const amountText = `৳${toBangladeshDigits(amountVal.toLocaleString('en-IN'))} /-  (BDT ${amountVal.toLocaleString('en-IN')})`;
      doc.font(boldFont).fontSize(16).fillColor('#047857').text(
        amountText,
        startX + 220,
        tableY + 13,
        { width: 280, align: 'right' }
      );

      // Footer / Verification Seal
      tableY += 70;
      doc.rect(startX, tableY, col1Width + col2Width, 1).fill('#cbd5e1');
      tableY += 12;

      doc.font(regularFont).fontSize(8.5).fillColor('#64748b').text(
        '✓ এটি একটি কম্পিউটার জেনারেটেড ডিজিটাল রসিদ। BJS & Bar Aspirants Academy-র মূল ডাটাবেজে এর বৈধতা সম্পূর্ণভাবে সংরক্ষিত।',
        startX,
        tableY,
        { align: 'center', width: col1Width + col2Width }
      );
      tableY += 14;
      doc.font(regularFont).fontSize(8).fillColor('#94a3b8').text(
        'ইস্যুকারী: ' + (receipt.issuedBy || 'Super Admin') + '  |  টাইমজোন: Bangladesh Standard Time (Asia/Dhaka, UTC+6)  |  https://bjs.kodl.uk',
        startX,
        tableY,
        { align: 'center', width: col1Width + col2Width }
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
