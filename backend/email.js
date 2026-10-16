import nodemailer from 'nodemailer';
import { generateReceiptPdf } from './receipt-pdf.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildReceiptHtml(registration, config) {
  const name = escapeHtml([registration.firstName, registration.middleName, registration.lastName].filter(Boolean).join(' '));
  const title = escapeHtml(config.webinarTitle);
  const college = escapeHtml(config.collegeName);
  const whatsapp = escapeHtml(config.whatsappGroupLink);
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:#020617;color:#fff;padding:24px 28px;">
        <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#34d399;font-weight:bold;">Official Delegate Pass &amp; Receipt</div>
        <h1 style="margin:8px 0 0;font-size:22px;">Registration Confirmed</h1>
        <p style="margin:8px 0 0;color:#cbd5e1;font-size:14px;">Hello ${escapeHtml(registration.firstName)}, your seat for <strong style="color:#fff;">${title}</strong> is secured.</p>
      </div>
      <div style="padding:24px 28px;">
        <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
          Thank you for registering through ${college}. Your payment of <strong>₹${escapeHtml(registration.amount)}</strong>
          via ${escapeHtml(registration.payerUpiApp || 'UPI')} has been recorded.
        </p>
        <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:16px 18px;margin-bottom:18px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:bold;color:#312e81;text-transform:uppercase;margin-bottom:12px;">
            <span>Webinar Pass</span>
            <span style="font-family:monospace;background:#fff;border:1px solid #c7d2fe;padding:2px 8px;border-radius:6px;">${escapeHtml(registration.regNumber)}</span>
          </div>
          <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <tr><td style="color:#64748b;padding:4px 0;">Participant</td><td style="font-weight:bold;">${name}</td></tr>
            <tr><td style="color:#64748b;padding:4px 0;">Email</td><td>${escapeHtml(registration.email)}</td></tr>
            <tr><td style="color:#64748b;padding:4px 0;">Phone</td><td>${escapeHtml(registration.phone)}</td></tr>
            <tr><td style="color:#64748b;padding:4px 0;">Stream</td><td>${escapeHtml(registration.stream)}</td></tr>
            <tr><td style="color:#64748b;padding:4px 0;">Year / Semester</td><td>${escapeHtml(registration.year)} · ${escapeHtml(registration.semester)}</td></tr>
            <tr><td style="color:#64748b;padding:4px 0;">UPI UTR</td><td style="font-family:monospace;font-weight:bold;">${escapeHtml(registration.utrNumber)}</td></tr>
            <tr><td style="color:#64748b;padding:4px 0;">Paid to</td><td>${escapeHtml(registration.upiIdPaidTo)}</td></tr>
            <tr><td style="color:#64748b;padding:4px 0;">Event</td><td>${escapeHtml(config.webinarDate)} · ${escapeHtml(config.webinarTime)}</td></tr>
          </table>
        </div>
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:16px 18px;margin-bottom:18px;">
          <div style="font-size:14px;font-weight:bold;color:#065f46;margin-bottom:6px;">Next step: join the WhatsApp community</div>
          <p style="margin:0 0 10px;font-size:13px;color:#047857;">Event updates, slides, and certificates will be shared in this group.</p>
          <a href="${whatsapp}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;font-size:13px;font-weight:bold;padding:10px 14px;border-radius:8px;">Join WhatsApp Group</a>
        </div>
        <p style="margin:0;font-size:12px;color:#64748b;">Please keep this email and your registration number for entry and certificates.</p>
        <p style="margin:8px 0 0;font-size:12px;color:#64748b;">Questions: ${escapeHtml(config.supportEmail)} · ${escapeHtml(config.supportPhone)}</p>
      </div>
    </div>
  </body>
</html>`;
}

function createTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error('SMTP is not configured. Set SMTP_USER and SMTP_PASS in .env (Gmail App Password).');
  }
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendReceiptEmail(registration, config) {
  const transporter = createTransporter();
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  const college = config.collegeName || 'Webinar Registration';

  // Generate PDF receipt to attach
  let pdfBuffer;
  try {
    pdfBuffer = await generateReceiptPdf(registration, config);
    console.log(`[PDF] Receipt generated for ${registration.regNumber} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
  } catch (pdfErr) {
    console.error(`[PDF] Failed to generate receipt PDF for ${registration.regNumber}:`, pdfErr.message);
    // Continue sending the email without the attachment
  }

  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      filename: `Receipt_${registration.regNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  const info = await transporter.sendMail({
    from: `"vedhaAI" <${fromAddress}>`,
    to: registration.email,
    subject: `Registration Confirmed & Payment Receipt: ${config.webinarTitle} (${registration.regNumber})`,
    html: buildReceiptHtml(registration, config),
    text: [
      `Hello ${registration.firstName},`,
      `Your registration is confirmed for ${config.webinarTitle}.`,
      `Registration number: ${registration.regNumber}`,
      `Amount: ₹${registration.amount}`,
      `UTR: ${registration.utrNumber}`,
      `WhatsApp: ${config.whatsappGroupLink}`,
    ].join('\n'),
    attachments,
  });
  console.log(`[Email] Receipt sent to ${registration.email} (${info.messageId})${pdfBuffer ? ' with PDF attachment' : ''}`);
  return info;
}
