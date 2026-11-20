const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

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
     .text('VERIFIED & CERTIFIED', cx - 26, cy + 12, { width: 52, align: 'center' });
  doc.font('Helvetica').fontSize(4.5).fillColor('#64748B')
     .text('DHAKA, BANGLADESH', cx - 26, cy + 19, { width: 52, align: 'center' });

  doc.restore();
}

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

      // Top Center Scales & Book Emblem
      drawScalesAndBookEmblem(doc, width / 2, 60, 1.3);

      // Header Academy Name
      doc.y = 86;
      doc.fontSize(22)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text('BJS & BAR ACADEMY', { align: 'center', tracking: 1.5 });

      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#64748B')
        .text('PREMIER JUDICIARY & ADVOCACY EXCELLENCE PORTAL | BANGLADESH', { align: 'center', tracking: 1 });

      doc.moveDown(0.9);
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#D97706')
        .text('CERTIFICATE OF COURSE COMPLETION', { align: 'center', tracking: 2 });

      doc.moveDown(0.7);
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#475569')
        .text('This is to certify that', { align: 'center' });

      doc.moveDown(0.5);
      doc.fontSize(26)
        .font('Helvetica-Bold')
        .fillColor('#0F172A')
        .text(studentName || 'Student Name', { align: 'center' });

      // Golden Underline for student name
      const nameWidth = 350;
      const startX = (width - nameWidth) / 2;
      const currentY = doc.y + 4;
      doc.moveTo(startX, currentY).lineTo(startX + nameWidth, currentY).lineWidth(1.5).strokeColor('#D97706').stroke();

      doc.moveDown(1.1);
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#475569')
        .text('has successfully completed the comprehensive professional syllabus and model evaluations for:', { align: 'center' });

      doc.moveDown(0.5);
      doc.fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#1E3A8A')
        .text(courseTitle || 'Judiciary & Bar Council Masterclass', { align: 'center' });

      // Issue date & verification note
      const dateStr = issueDate ? new Date(issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB');

      // Bottom Area: Left Signature, Center Seal, Right QR Code
      const bottomY = height - 135;

      // Left: Authorized Director
      doc.fontSize(9).font('Helvetica').fillColor('#64748B').text('Date of Issue: ' + dateStr, 60, bottomY);
      doc.moveTo(60, bottomY + 30).lineTo(230, bottomY + 30).lineWidth(1).strokeColor('#94A3B8').stroke();
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0F172A').text('Academic Council Director', 60, bottomY + 37);
      doc.fontSize(9).font('Helvetica').fillColor('#64748B').text('BJS & Bar Academy', 60, bottomY + 50);

      // Center: Official Authenticity Seal
      const sealX = width / 2;
      drawOfficialDoubleRingSeal(doc, sealX, bottomY + 22, 36);

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
