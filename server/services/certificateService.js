const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

/**
 * Generate a professional high-resolution PDF Certificate with QR Code
 */
async function generateCertificatePdf({ certificateId, studentName, courseTitle, issueDate, verificationUrl }) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Generate QR Code Data URL as PNG Buffer
      const qrBuffer = await QRCode.toBuffer(verificationUrl, {
        width: 120,
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
        margins: { top: 30, bottom: 30, left: 30, right: 30 }
      });

      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const width = doc.page.width;
      const height = doc.page.height;

      // Outer Golden Border
      doc.rect(20, 20, width - 40, height - 40)
        .lineWidth(4)
        .strokeColor('#D97706')
        .stroke();

      // Inner Navy Border
      doc.rect(26, 26, width - 52, height - 52)
        .lineWidth(1.5)
        .strokeColor('#0F172A')
        .stroke();

      // Top Corner Accents
      doc.rect(22, 22, 20, 20).fillColor('#D97706').fill();
      doc.rect(width - 42, 22, 20, 20).fillColor('#D97706').fill();
      doc.rect(22, height - 42, 20, 20).fillColor('#D97706').fill();
      doc.rect(width - 42, height - 42, 20, 20).fillColor('#D97706').fill();

      // Header Academy Name
      doc.moveDown(1.5);
      doc.fontSize(22)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('BJS & BAR ASPIRANTS ACADEMY', { align: 'center', tracking: 1.5 });

      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#64748B')
        .text('PREMIER JUDICIARY & ADVOCACY EXCELLENCE PORTAL | BANGLADESH', { align: 'center', tracking: 1 });

      doc.moveDown(1);
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#D97706')
        .text('CERTIFICATE OF COURSE COMPLETION', { align: 'center', tracking: 2 });

      doc.moveDown(0.8);
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#475569')
        .text('This is to certify that', { align: 'center' });

      doc.moveDown(0.6);
      doc.fontSize(26)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text(studentName || 'Student Name', { align: 'center' });

      // Golden Underline for student name
      const nameWidth = 350;
      const startX = (width - nameWidth) / 2;
      const currentY = doc.y + 4;
      doc.moveTo(startX, currentY).lineTo(startX + nameWidth, currentY).lineWidth(1.5).strokeColor('#D97706').stroke();

      doc.moveDown(1.2);
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#475569')
        .text('has successfully completed the comprehensive professional syllabus and model evaluations for:', { align: 'center' });

      doc.moveDown(0.6);
      doc.fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#1E3A8A')
        .text(courseTitle || 'Judiciary & Bar Council Masterclass', { align: 'center' });

      // Issue date & verification note
      const dateStr = issueDate ? new Date(issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB');
      doc.moveDown(1.5);

      // Bottom Area: Left Signature, Center Seal, Right QR Code
      const bottomY = height - 145;

      // Left: Authorized Director
      doc.text('Date of Issue: ' + dateStr, 60, bottomY);
      doc.moveTo(60, bottomY + 35).lineTo(230, bottomY + 35).lineWidth(1).strokeColor('#94A3B8').stroke();
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0F172A').text('Academic Council Director', 60, bottomY + 42);
      doc.fontSize(9).font('Helvetica').fillColor('#64748B').text('BJS & Bar Aspirants Academy', 60, bottomY + 55);

      // Center: Official Authenticity Seal
      const sealX = width / 2;
      doc.circle(sealX, bottomY + 25, 32).lineWidth(2).strokeColor('#D97706').stroke();
      doc.circle(sealX, bottomY + 25, 28).lineWidth(1).strokeColor('#0F172A').stroke();
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#D97706').text('OFFICIAL', sealX - 20, bottomY + 12);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F172A').text('SEAL', sealX - 12, bottomY + 24);
      doc.fontSize(7).font('Helvetica').fillColor('#64748B').text('VERIFIED', sealX - 17, bottomY + 36);

      // Right: QR Code + Certificate ID
      const qrX = width - 180;
      doc.image(qrBuffer, qrX, bottomY - 15, { width: 75, height: 75 });
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#0F172A').text('CERTIFICATE ID:', qrX + 85, bottomY + 5);
      doc.fontSize(8).font('Helvetica').fillColor('#D97706').text(certificateId, qrX + 85, bottomY + 18);
      doc.fontSize(7).font('Helvetica').fillColor('#64748B').text('Scan QR to verify authenticity online', qrX + 85, bottomY + 32, { width: 90 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateCertificatePdf
};
