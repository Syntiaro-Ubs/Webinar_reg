import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { OFFICIAL_EVENT_TITLE } from '../data/eventTitle.js';

/**
 * Generate a professional PDF receipt for a student registration.
 * Returns a Buffer containing the PDF bytes.
 *
 * @param {object} registration - The student registration record.
 * @param {object} config       - The webinar/college configuration.
 * @returns {Promise<Buffer>}   - PDF file as a Buffer.
 */
export async function generateReceiptPdf(registration, config) {
  const fullName = [registration.firstName, registration.middleName, registration.lastName]
    .filter(Boolean)
    .join(' ');

  // Generate QR code as a data-URL PNG
  const paymentReference = registration.cashfreeOrderId || registration.utrNumber;
  const qrPayload = `ID:${registration.regNumber}${paymentReference ? `|REF:${paymentReference}` : ''}|NAME:${fullName}|AMT:${registration.amount}`;
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 120,
    margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' },
  });
  // Convert data-URL to a Buffer for PDFKit
  const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

  const receiptDate = new Date(registration.registeredAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Amount in words (simple helper for Indian Rupees)
  const amountInWords = numberToWords(Number(registration.amount));

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
      info: {
        Title: `${registration.paymentStatus === 'verified' ? 'Payment Receipt' : 'Registration Confirmation'} - ${registration.regNumber}`,
        Author: config.collegeName || 'Webinar Registration System',
        Subject: `${registration.paymentStatus === 'verified' ? 'Payment Receipt' : 'Registration Confirmation'} for ${fullName}`,
      },
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 100; // 50px margins on each side
    const leftMargin = 50;
    let y = 40;

    // ─────────── HEADER BAR (dark background) ───────────
    doc.rect(0, 0, pageWidth, 85).fill('#020617');

    // Green tag
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#34d399');
    doc.text(registration.paymentStatus === 'verified' ? 'OFFICIAL DELEGATE PASS & PAYMENT RECEIPT' : registration.paymentStatus === 'rejected' ? 'PAYMENT NOT APPROVED' : 'REGISTRATION SUCCESSFUL', leftMargin, 18, { width: contentWidth });

    // Title
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff');
    doc.text(registration.paymentStatus === 'verified' ? 'Registration Confirmed' : registration.paymentStatus === 'rejected' ? 'Payment Rejected' : 'Registration Successful', leftMargin, 34, { width: contentWidth });

    // Subtitle
    doc.font('Helvetica').fontSize(9).fillColor('#cbd5e1');
    doc.text(
      registration.paymentStatus === 'verified'
        ? `Hello ${registration.firstName}, your seat for "${OFFICIAL_EVENT_TITLE}" is secured.`
        : registration.paymentStatus === 'rejected'
          ? `Hello ${registration.firstName}, the submitted payment was not approved. Please contact the organizer.`
          : `Hello ${registration.firstName}, your registration for "${OFFICIAL_EVENT_TITLE}" is successful. Payment confirmation is pending from Cashfree.`,
      leftMargin, 58, { width: contentWidth }
    );

    y = 100;

    // ─────────── COLLEGE LETTERHEAD ───────────
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a');
    doc.text((config.collegeName || 'Institution').toUpperCase(), leftMargin, y, { width: contentWidth - 140 });

    // Receipt number (right side)
    const rightBlockX = pageWidth - 50 - 120;
    doc.font('Helvetica').fontSize(7).fillColor('#94a3b8');
    doc.text('Receipt No.', rightBlockX, 100, { width: 120, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a');
    doc.text(registration.regNumber, rightBlockX, 112, { width: 120, align: 'right' });
    doc.font('Helvetica').fontSize(7).fillColor('#64748b');
    doc.text(receiptDate, rightBlockX, 126, { width: 120, align: 'right' });

    y = Math.max(y + 14, 142);

    // Divider
    doc.moveTo(leftMargin, y).lineTo(pageWidth - 50, y).lineWidth(1.5).strokeColor('#0f172a').stroke();
    y += 8;

    // ─────────── BANNER ───────────
    doc.rect(leftMargin, y, contentWidth, 22).fillAndStroke('#f1f5f9', '#cbd5e1');
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a');
    doc.text(registration.paymentStatus === 'verified' ? 'OFFICIAL FEE RECEIPT & DELEGATE ADMISSION PASS' : registration.paymentStatus === 'rejected' ? 'PAYMENT REJECTED' : 'REGISTRATION SUCCESSFUL', leftMargin, y + 6, {
      width: contentWidth,
      align: 'center',
    });
    y += 32;

    // ─────────── EVENT DETAILS BOX ───────────
    doc.roundedRect(leftMargin, y, contentWidth, 50, 4).fillAndStroke('#f8fafc', '#e2e8f0');

    doc.font('Helvetica').fontSize(7).fillColor('#94a3b8');
    doc.text('EVENT', leftMargin + 12, y + 8);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a');
    doc.text(OFFICIAL_EVENT_TITLE, leftMargin + 12, y + 19, { width: contentWidth - 130 });
    doc.font('Helvetica').fontSize(8).fillColor('#475569');
    doc.text(
      `${config.webinarDate || '—'}  ·  ${config.webinarTime || '—'}`,
      leftMargin + 12, y + 34
    );

    // PAID badge
    const badgeX = pageWidth - 50 - 60;
    const badgeColors = registration.paymentStatus === 'verified'
      ? ['#ecfdf5', '#a7f3d0', '#065f46']
      : registration.paymentStatus === 'rejected'
        ? ['#fef2f2', '#fecaca', '#991b1b']
        : ['#eef2ff', '#c7d2fe', '#3730a3'];
    doc.roundedRect(badgeX, y + 14, 48, 22, 4).fillAndStroke(badgeColors[0], badgeColors[1]);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(badgeColors[2]);
    doc.text(registration.paymentStatus === 'verified' ? 'PAID' : registration.paymentStatus === 'rejected' ? 'REJECTED' : 'REGISTERED', badgeX, y + 20, { width: 48, align: 'center' });

    y += 62;

    // ─────────── PARTICIPANT DETAILS TABLE ───────────
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a');
    doc.text('PARTICIPANT DETAILS', leftMargin, y);
    y += 14;

    const tableRows = [
      ['Name', fullName.toUpperCase(), 'Email', registration.email],
      ['Mobile', `+91 ${registration.phone}`, 'Stream', registration.stream || '—'],
      ['Year / Sem', `${registration.year || '—'} · ${registration.semester || '—'}`, 'Roll No', registration.rollNumber || 'N/A'],
      ['DOB', registration.dob || '—', 'Gender', registration.gender || '—'],
    ];

    const colWidths = [80, 155, 70, contentWidth - 80 - 155 - 70];
    const rowHeight = 22;

    tableRows.forEach((row, rowIdx) => {
      const rowY = y + rowIdx * rowHeight;

      // Row background alternation
      if (rowIdx % 2 === 0) {
        doc.rect(leftMargin, rowY, contentWidth, rowHeight).fill('#f8fafc');
      }

      // Row border
      doc.rect(leftMargin, rowY, contentWidth, rowHeight).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

      let cellX = leftMargin;
      row.forEach((cell, colIdx) => {
        // Vertical divider
        if (colIdx > 0) {
          doc.moveTo(cellX, rowY).lineTo(cellX, rowY + rowHeight).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        }

        const isLabel = colIdx === 0 || colIdx === 2;
        doc.font(isLabel ? 'Helvetica' : 'Helvetica-Bold')
          .fontSize(8)
          .fillColor(isLabel ? '#64748b' : '#0f172a');
        doc.text(cell, cellX + 8, rowY + 6, { width: colWidths[colIdx] - 16, lineBreak: false });
        cellX += colWidths[colIdx];
      });
    });

    y += tableRows.length * rowHeight + 12;

    // ─────────── PAYMENT LEDGER TABLE ───────────
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a');
    doc.text(registration.paymentStatus === 'verified' ? 'PAYMENT LEDGER' : 'REGISTRATION FEE', leftMargin, y);
    y += 14;

    // Header row
    const ledgerCols = [240, 140, contentWidth - 240 - 140];
    doc.rect(leftMargin, y, contentWidth, 20).fill('#f1f5f9');
    doc.rect(leftMargin, y, contentWidth, 20).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

    doc.font('Helvetica-Bold').fontSize(7).fillColor('#475569');
    doc.text('DESCRIPTION', leftMargin + 8, y + 6, { width: ledgerCols[0] - 16 });

    let colX = leftMargin + ledgerCols[0];
    doc.moveTo(colX, y).lineTo(colX, y + 20).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.text('PAYMENT STATUS', colX + 8, y + 6, { width: ledgerCols[1] - 16 });

    colX += ledgerCols[1];
    doc.moveTo(colX, y).lineTo(colX, y + 20).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.text('AMOUNT (INR)', colX + 8, y + 6, { width: ledgerCols[2] - 16, align: 'right' });
    y += 20;

    // Data row
    doc.rect(leftMargin, y, contentWidth, 30).fill('#ffffff');
    doc.rect(leftMargin, y, contentWidth, 30).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a');
    doc.text('Webinar Registration & E-Certificate', leftMargin + 8, y + 5, { width: ledgerCols[0] - 16 });

    colX = leftMargin + ledgerCols[0];
    doc.moveTo(colX, y).lineTo(colX, y + 30).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(8).fillColor('#0f172a');
    doc.text(registration.paymentStatus === 'verified' ? `${registration.payerUpiApp || 'UPI'} - Confirmed` : registration.paymentStatus === 'rejected' ? 'Rejected' : 'Unverified', colX + 8, y + 5, { width: ledgerCols[1] - 16 });
    doc.font('Helvetica').fontSize(7).fillColor('#64748b');
    if (paymentReference) doc.text(`Ref: ${paymentReference}`, colX + 8, y + 17, { width: ledgerCols[1] - 16 });

    colX += ledgerCols[1];
    doc.moveTo(colX, y).lineTo(colX, y + 30).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a');
    doc.text(`₹${Number(registration.amount).toFixed(2)}`, colX + 8, y + 8, { width: ledgerCols[2] - 16, align: 'right' });
    y += 30;

    // Total row
    doc.rect(leftMargin, y, contentWidth, 22).fill('#f8fafc');
    doc.rect(leftMargin, y, contentWidth, 22).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    const totalLabelWidth = ledgerCols[0] + ledgerCols[1];
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569');
    doc.text(registration.paymentStatus === 'verified' ? 'Total Paid:' : 'Fee:', leftMargin + 8, y + 6, { width: totalLabelWidth - 16, align: 'right' });

    colX = leftMargin + totalLabelWidth;
    doc.moveTo(colX, y).lineTo(colX, y + 22).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a');
    doc.text(`₹${Number(registration.amount).toFixed(2)}`, colX + 8, y + 5, { width: ledgerCols[2] - 16, align: 'right' });
    y += 22;

    // Amount in words row
    doc.rect(leftMargin, y, contentWidth, 18).fill('#f8fafc');
    doc.rect(leftMargin, y, contentWidth, 18).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(7).fillColor('#475569');
    doc.text(`In Words: ${amountInWords} Only`, leftMargin + 8, y + 5, { width: contentWidth * 0.65 });
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#065f46');
    doc.text(registration.paymentStatus === 'verified' ? 'Confirmed & Settled' : registration.paymentStatus === 'rejected' ? 'Payment rejected' : 'Payment confirmation pending from Cashfree', leftMargin + 8, y + 5, { width: contentWidth - 16, align: 'right' });
    y += 28;

    // ─────────── QR CODE + VERIFICATION SEAL ───────────
    doc.roundedRect(leftMargin, y, contentWidth, 72, 4).fillAndStroke('#f8fafc', '#e2e8f0');

    // QR code image
    doc.image(qrBuffer, leftMargin + 12, y + 10, { width: 52, height: 52 });

    // QR text
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#0f172a');
    doc.text('REGISTRATION QR', leftMargin + 76, y + 12);
    doc.font('Helvetica').fontSize(7).fillColor('#64748b');
    doc.text('Scan to verify delegate credentials.', leftMargin + 76, y + 24);
    doc.font('Helvetica').fontSize(7).fillColor('#64748b');
    doc.text(`Registration no: ${registration.regNumber}`, leftMargin + 76, y + 36, { width: contentWidth - 135 });
    doc.font('Helvetica').fontSize(7).fillColor('#64748b');
    doc.text(registration.paymentStatus === 'verified' ? `Payment via ${registration.payerUpiApp || 'UPI'}` : 'Payment is not confirmed', leftMargin + 76, y + 48);

    // Verification seal (right side)
    const sealX = pageWidth - 50 - 110;
    doc.roundedRect(sealX, y + 8, 98, 56, 4).fillAndStroke('#eef2ff', '#c7d2fe');
    doc.font('Helvetica').fontSize(6).fillColor('#4338ca');
    doc.text('CERTIFIED BY', sealX, y + 14, { width: 98, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#0f172a');
    doc.text(config.collegeName || 'Institution', sealX + 6, y + 26, { width: 86, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#065f46');
    doc.text('✓ Verified', sealX, y + 46, { width: 98, align: 'center' });

    y += 82;

    // ─────────── WHATSAPP CTA ───────────
    if (registration.paymentStatus === 'verified' && config.whatsappGroupLink) {
      doc.roundedRect(leftMargin, y, contentWidth, 42, 4).fillAndStroke('#ecfdf5', '#a7f3d0');
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#065f46');
      doc.text('Next step: Join the WhatsApp Community', leftMargin + 12, y + 8, { width: contentWidth - 24 });
      doc.font('Helvetica').fontSize(7).fillColor('#047857');
      doc.text(
        'Event updates, slides, and certificates will be shared in this group.',
        leftMargin + 12, y + 22, { width: contentWidth - 24 }
      );
      doc.font('Helvetica').fontSize(7).fillColor('#059669');
      doc.text(config.whatsappGroupLink, leftMargin + 12, y + 33, {
        width: contentWidth - 24,
        link: config.whatsappGroupLink,
        underline: true,
      });
      y += 52;
    }

    // ─────────── FOOTNOTE ───────────
    doc.font('Helvetica').fontSize(7).fillColor('#94a3b8');
    doc.text(
      registration.paymentStatus === 'verified'
        ? 'Note: Computer-generated payment receipt. No physical signature required.'
        : registration.paymentStatus === 'rejected'
          ? 'Note: Payment was not approved. Contact the organizer for help.'
          : 'Note: Registration confirmation only; payment has not been confirmed.',
      leftMargin, y
    );
    y += 12;
    doc.text(
      `Quote Reg. No. ${registration.regNumber} for attendance & certificate issuance.`,
      leftMargin, y
    );
    y += 12;

    if (config.supportEmail || config.supportPhone) {
      doc.text(
        `Questions: ${config.supportEmail || ''} · ${config.supportPhone || ''}`,
        leftMargin, y
      );
    }

    doc.end();
  });
}

/**
 * Simple number-to-words converter for Indian Rupees (up to 99,999).
 */
function numberToWords(num) {
  if (num === 0) return 'Zero Rupees';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const intPart = Math.floor(num);
  let words = '';

  if (intPart >= 10000) {
    words += ones[Math.floor(intPart / 10000)] + ' ';
  }
  if (intPart >= 1000) {
    const thousands = Math.floor((intPart % 10000) / 1000);
    if (thousands > 0) words += ones[thousands] + ' ';
    words += 'Thousand ';
  }
  if (intPart >= 100) {
    const hundreds = Math.floor((intPart % 1000) / 100);
    if (hundreds > 0) words += ones[hundreds] + ' Hundred ';
  }

  const remainder = intPart % 100;
  if (remainder > 0) {
    if (words) words += 'and ';
    if (remainder < 20) {
      words += ones[remainder];
    } else {
      words += tens[Math.floor(remainder / 10)];
      if (remainder % 10 > 0) {
        words += ' ' + ones[remainder % 10];
      }
    }
  }

  return words.trim() + ' Rupees';
}
