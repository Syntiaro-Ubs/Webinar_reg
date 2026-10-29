import React, { useState, useRef, useEffect } from 'react';
import { downloadReceiptPdf } from '../utils/api';
import { OFFICIAL_EVENT_TITLE } from '../../data/eventTitle.js';
import QRCode from 'qrcode';
import {
  MessageCircle, Mail, Printer, ShieldCheck, Building2,
  Calendar, Clock, Check, ExternalLink, ArrowRight, X, FileText, Download
} from 'lucide-react';

/* ─────────────────────────────────────────────
   COMPACT RECEIPT MODAL  (shown on "View Receipt")
───────────────────────────────────────────── */
function CompactReceiptModal({ registration, config, onClose }) {
  const receiptQrRef = useRef(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const fullName = [registration.firstName, registration.middleName, registration.lastName]
    .filter(Boolean).join(' ');

  useEffect(() => {
    if (receiptQrRef.current) {
      const paymentReference = registration.cashfreeOrderId || registration.utrNumber;
      const payload = `ID:${registration.regNumber}${paymentReference ? `|REF:${paymentReference}` : ''}|NAME:${fullName}|AMT:${registration.amount}`;
      QRCode.toCanvas(receiptQrRef.current, payload, {
        width: 72, margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' }
      }).catch(console.error);
    }
  }, [registration]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white rounded-2xl w-full max-w-lg max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2.5rem)] my-0 sm:my-4 shadow-2xl border border-slate-200 overflow-hidden flex flex-col">

          {/* Header */}
          <div className="bg-slate-950 text-white px-5 py-3.5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold uppercase tracking-wider mb-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{registration.paymentStatus === 'verified' ? 'Official Receipt' : 'Registration Status'}</span>
              </div>
              <h2 className="text-base font-semibold text-white">{registration.paymentStatus === 'verified' ? 'Registration Confirmed' : registration.paymentStatus === 'rejected' ? 'Payment Not Verified' : 'Payment Processing'}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-3 shrink-0 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className={`px-5 py-2.5 text-xs ${registration.paymentStatus === 'verified' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100' : registration.paymentStatus === 'rejected' ? 'bg-red-50 text-red-800 border-b border-red-100' : 'bg-amber-50 text-amber-800 border-b border-amber-100'}`}>
            {registration.paymentStatus === 'verified'
              ? registration.paymentReceiptSent
                ? 'Payment successful. Your receipt and WhatsApp community link have been emailed.'
                : 'Payment successful. The receipt email could not be confirmed; please contact the organizer.'
              : registration.paymentStatus === 'rejected'
                ? 'We could not verify this payment. Please contact the organizer.'
                : 'We are waiting for Cashfree to confirm your payment. The paid receipt and community invite will be emailed after confirmation.'}
          </div>

          {/* Receipt Body */}
          <div id="printable-receipt" className="min-h-0 flex-1 p-3 sm:p-5 space-y-3 overflow-y-auto">

            {/* College Letterhead */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center p-1 shrink-0">
                  {config.collegeLogoUrl
                    ? <img src={config.collegeLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                    : <Building2 className="w-5 h-5 text-slate-700" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-950 uppercase tracking-tight leading-tight">{config.collegeName}</h3>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[9px] font-mono uppercase text-slate-400 block">Receipt No.</span>
                <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 inline-block mt-0.5">
                  {registration.regNumber}
                </span>
                <span className="text-[9px] font-mono text-slate-500 block mt-0.5">
                  {new Date(registration.registeredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Banner */}
            <div className="bg-slate-100 border border-slate-300 py-1 px-3 rounded text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900">Official Fee Receipt & Delegate Admission Pass</span>
            </div>

            {/* Event */}
            <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 flex items-center justify-between gap-2">
              <div>
                <span className="text-[9px] font-mono uppercase text-slate-400 block">Event</span>
                <h4 className="text-xs font-bold text-slate-900">{OFFICIAL_EVENT_TITLE}</h4>
                <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-0.5">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-indigo-600"/>{config.webinarDate}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-indigo-600"/>{config.webinarTime}</span>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded shrink-0 ${registration.paymentStatus === 'verified' ? 'text-emerald-800 bg-emerald-50 border border-emerald-300' : registration.paymentStatus === 'rejected' ? 'text-red-800 bg-red-50 border border-red-300' : 'text-amber-800 bg-amber-50 border border-amber-300'}`}>
                <ShieldCheck className="w-3 h-3"/>{registration.paymentStatus === 'verified' ? 'PAID' : registration.paymentStatus === 'rejected' ? 'REJECTED' : 'REGISTERED'}
              </span>
            </div>

            {/* Participant Table */}
            <div>
              <div className="text-[10px] font-bold text-slate-900 uppercase tracking-wider mb-1 border-b border-slate-200 pb-1">Participant Details</div>
              <div className="border border-slate-200 rounded-lg overflow-x-auto text-[11px]">
                <table className="w-full min-w-[510px] border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="px-2.5 py-1.5 bg-slate-50 text-slate-500 font-medium border-r border-slate-200 w-1/4">Name</td>
                      <td className="px-2.5 py-1.5 font-bold text-slate-900 uppercase border-r border-slate-200">{fullName}</td>
                      <td className="px-2.5 py-1.5 bg-slate-50 text-slate-500 font-medium border-r border-slate-200 w-1/6">Email</td>
                      <td className="px-2.5 py-1.5 text-slate-900 truncate">{registration.email}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-2.5 py-1.5 bg-slate-50 text-slate-500 font-medium border-r border-slate-200">Mobile</td>
                      <td className="px-2.5 py-1.5 text-slate-900 font-mono border-r border-slate-200">+91 {registration.phone}</td>
                      <td className="px-2.5 py-1.5 bg-slate-50 text-slate-500 font-medium border-r border-slate-200">Stream</td>
                      <td className="px-2.5 py-1.5 text-slate-900">{registration.stream}</td>
                    </tr>
                    <tr>
                      <td className="px-2.5 py-1.5 bg-slate-50 text-slate-500 font-medium border-r border-slate-200">Year / Sem</td>
                      <td className="px-2.5 py-1.5 text-slate-900 border-r border-slate-200">{registration.year} · {registration.semester}</td>
                      <td className="px-2.5 py-1.5 bg-slate-50 text-slate-500 font-medium border-r border-slate-200">Roll No</td>
                      <td className="px-2.5 py-1.5 font-mono text-slate-900">{registration.rollNumber || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment */}
            <div>
              <div className="text-[10px] font-bold text-slate-900 uppercase tracking-wider mb-1 border-b border-slate-200 pb-1">Payment Ledger</div>
              <div className="border border-slate-200 rounded-lg overflow-x-auto text-[11px]">
                <table className="w-full min-w-[440px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-left font-semibold text-[10px]">
                      <th className="py-1.5 px-2.5 border-r border-slate-200">Description</th>
                      <th className="py-1.5 px-2.5 border-r border-slate-200">Payment Mode</th>
                      <th className="py-1.5 px-2.5 text-right w-24">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200 bg-white">
                      <td className="py-1.5 px-2.5 border-r border-slate-200">
                        <span className="font-semibold text-slate-900 block">Webinar Registration & E-Certificate</span>
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200">
                        <span className="block">{registration.payerUpiApp || 'UPI'}</span>
                        {(registration.cashfreeOrderId || registration.utrNumber) && <span className="font-mono text-[10px] text-slate-500">Ref: {registration.cashfreeOrderId || registration.utrNumber}</span>}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-medium text-slate-900">₹{Number(registration.amount).toFixed(2)}</td>
                    </tr>
                    <tr className="bg-slate-50 font-semibold">
                      <td colSpan="2" className="py-1.5 px-2.5 text-right border-r border-slate-200 text-slate-700">{registration.paymentStatus === 'verified' ? 'Total Paid:' : 'Amount:'}</td>
                      <td className="py-1.5 px-2.5 text-right font-bold text-slate-950 font-mono">₹{Number(registration.amount).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="bg-slate-50/90 px-2.5 py-1 text-[10px] text-slate-700 border-t border-slate-200 flex items-center justify-between">
                  <span><strong>Amount:</strong> ₹{Number(registration.amount).toLocaleString('en-IN')}</span>
                  <span className="text-emerald-700 font-semibold">{registration.paymentStatus === 'verified' ? 'Confirmed & Settled' : registration.paymentStatus === 'rejected' ? 'Payment Not Verified' : 'Payment Not Confirmed'}</span>
                </div>
              </div>
            </div>

            {/* QR + Seal */}
            <div className="flex items-center gap-3 border border-slate-200 rounded-lg p-2.5 bg-slate-50/40">
              <div className="bg-white p-1 rounded border border-slate-300 shrink-0">
                <canvas ref={receiptQrRef} className="w-[56px] h-[56px]"/>
              </div>
              <div className="text-[10px] text-slate-600 flex-1">
                <span className="font-bold text-slate-900 block uppercase font-mono text-[9px]">Digital Security QR</span>
                <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">Scan to verify delegate credentials.</span>
                {(registration.cashfreeOrderId || registration.utrNumber) && <span className="font-mono text-[9px] text-slate-500 block mt-0.5">Ref: <strong className="text-slate-800">{registration.cashfreeOrderId || registration.utrNumber}</strong></span>}
              </div>
              <div className="shrink-0 border border-indigo-200 bg-indigo-50/50 rounded-lg px-2 py-1.5 text-center">
                <div className="text-[8px] font-mono uppercase tracking-wider text-indigo-700 font-bold">Certified by</div>
                <div className="text-[9px] font-serif font-bold text-slate-900 mt-0.5 max-w-[100px] leading-tight">{config.collegeName}</div>
                <div className="text-[8px] text-emerald-700 font-semibold flex items-center justify-center gap-0.5 mt-0.5">
                  <Check className="w-2.5 h-2.5"/>Verified
                </div>
              </div>
            </div>

            {/* Footnote */}
            <div className="text-[9px] text-slate-400 border-t border-slate-200 pt-1.5 space-y-0.5">
              <p><strong>Note:</strong> Computer-generated receipt. No physical signature required.</p>
              <p>Quote Reg. No. <strong className="text-slate-600 font-mono">{registration.regNumber}</strong> for attendance & certificate issuance.</p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-all cursor-pointer">
              <Printer className="w-3.5 h-3.5"/>
              <span>Print</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setIsDownloadingPdf(true);
                  await downloadReceiptPdf(registration.id, registration.regNumber);
                  setIsDownloadingPdf(false);
                }}
                disabled={isDownloadingPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
              >
                {isDownloadingPdf ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"/>
                    <span>Generating…</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5"/>
                    <span>PDF</span>
                  </>
                )}
              </button>
              <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer">
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}

/* ─────────────────────────────────────────────
   PAYMENT SUCCESS SCREEN  (shown after submit)
───────────────────────────────────────────── */
export const SuccessReceiptModal = ({ registration, config, isOpen, onClose, onNewRegistration }) => {
  const [showReceipt, setShowReceipt] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      {/* Full-screen overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
        <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">

          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment confirmation"
            className="absolute top-3 right-3 z-10 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Success content */}
          <div className="flex flex-col items-center text-center px-6 py-8 sm:px-8 sm:py-10">

            {/* Green checkmark circle */}
              <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center mb-5 shadow-lg ${registration.paymentStatus === 'verified' ? 'bg-emerald-50 border-emerald-400' : 'bg-amber-50 border-amber-300'}`}>
                {registration.paymentStatus === 'verified'
                  ? <Check className="w-10 h-10 text-emerald-500" strokeWidth={3}/>
                  : <Clock className="w-9 h-9 text-amber-500"/>}
            </div>

            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {registration.paymentStatus === 'verified'
                ? 'Payment Successful!'
                : registration.paymentStatus === 'rejected'
                  ? 'Payment Not Verified'
                  : 'Payment Processing'}
            </h2>
            <p className="text-sm text-slate-600 mt-1.5 max-w-xs">
              Hey <strong>{registration.firstName}</strong>, {registration.paymentStatus === 'verified'
                ? <>your seat for <strong>{OFFICIAL_EVENT_TITLE}</strong> is confirmed.</>
                : registration.paymentStatus === 'rejected'
                  ? <>we could not verify your payment. Please contact support.</>
                  : <>your payment for <strong>{OFFICIAL_EVENT_TITLE}</strong> is still being confirmed by Cashfree. Your receipt and community invite will be emailed after confirmation.</>}
            </p>

            {/* Reg number badge */}
            <div className="mt-4 inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 shadow-sm text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-500"/>
              <span className="text-slate-500">Registration No:</span>
              <span className="font-mono font-bold text-slate-900">{registration.regNumber}</span>
            </div>

            {/* Email notice */}
            <p className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400"/>
              {(registration.paymentStatus === 'verified' ? registration.paymentReceiptSent : registration.emailSent)
                ? <>{registration.paymentStatus === 'verified' ? 'Payment receipt' : 'Registration confirmation'} emailed to <span className="font-mono text-slate-600">{registration.email}</span></>
                : registration.paymentStatus === 'verified'
                  ? <>Payment verified. Receipt email is pending; it will be retried automatically.</>
                  : <>Cashfree is still confirming payment. Please keep this registration number.</>}
            </p>

            {/* ── Action Buttons ── */}
            <div className="mt-7 w-full flex flex-col gap-2.5">

              {registration.paymentStatus === 'verified' && <button
                onClick={() => setShowReceipt(true)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-md transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4"/>
                <span>View Receipt</span>
              </button>}

              {/* Show the community invite only after Cashfree confirms payment. */}
              {registration.paymentStatus === 'verified' && config.whatsappGroupLink && (
                <a
                  href={config.whatsappGroupLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-sm font-semibold shadow-md transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4"/>
                  <span>Join WhatsApp Community</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-75"/>
                </a>
              )}
            </div>

            {/* Register another */}
            {onNewRegistration && (
              <button
                onClick={onNewRegistration}
                className="mt-5 text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors cursor-pointer flex items-center gap-1"
              >
                Register another student <ArrowRight className="w-3 h-3"/>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Compact Receipt Modal (layered on top) */}
      {showReceipt && (
        <CompactReceiptModal
          registration={registration}
          config={config}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </>
  );
};
