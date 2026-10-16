import React from 'react';
import { Mail, ExternalLink, X, Printer, MessageSquare } from 'lucide-react';
export const EmailPreviewModal = ({ registration, config, isOpen, onClose }) => {
    if (!isOpen)
        return null;
    const fullName = [registration.firstName, registration.middleName, registration.lastName].filter(Boolean).join(' ');
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
        {/* Email Client Header bar */}
        <div className="bg-slate-900 text-white p-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-400"/>
            <div>
              <h3 className="text-sm font-bold">Email Inbox Preview (Automated Notification)</h3>
              <p className="text-[11px] text-slate-300">
                Dispatched to <span className="text-amber-300 font-mono">{registration.email}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Email Message Meta */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 text-xs space-y-1.5 text-slate-600">
          <div className="flex">
            <span className="w-16 font-semibold text-slate-500">From:</span>
            <span className="font-medium text-slate-900">
              {config.collegeName} &lt;{config.supportEmail}&gt;
            </span>
          </div>
          <div className="flex">
            <span className="w-16 font-semibold text-slate-500">To:</span>
            <span className="font-medium text-slate-900">
              {fullName} &lt;{registration.email}&gt;
            </span>
          </div>
          <div className="flex">
            <span className="w-16 font-semibold text-slate-500">Subject:</span>
            <span className="font-bold text-slate-900">
              {registration.paymentStatus === 'verified' ? 'Registration Confirmed & Payment Receipt' : 'Registration Received'}: {config.webinarTitle} ({registration.regNumber})
            </span>
          </div>
          <div className="flex">
            <span className="w-16 font-semibold text-slate-500">Date:</span>
            <span>{new Date(registration.registeredAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Email Body Content */}
        <div className="p-6 space-y-6 text-sm text-slate-800 font-sans">
          
          <div className="border-b border-slate-200 pb-4">
            <div className="text-xs uppercase font-bold tracking-wider text-indigo-600 mb-1">
              {config.collegeName}
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Hello {registration.firstName}, {registration.paymentStatus === 'verified' ? 'your registration and payment are confirmed.' : 'we received your registration. Payment is pending verification.'}
            </h2>
            <p className="text-slate-600 text-xs mt-1 leading-relaxed">
              Thank you for registering for <strong className="text-slate-900">{config.webinarTitle}</strong>. Your payment of <strong className="text-slate-900">₹{registration.amount}</strong> via UPI has been recorded and verified.
            </p>
          </div>

          {/* Webinar Pass Summary Card */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                Webinar Pass &amp; Entry Badge
              </span>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                {registration.regNumber}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Participant Name:</span>
                <span className="font-semibold text-slate-900">{fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Stream:</span>
                <span className="font-semibold text-slate-900">{registration.stream}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Year &amp; Semester:</span>
                <span className="font-semibold text-slate-900">{registration.year} · {registration.semester}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">UPI UTR / Ref:</span>
                <span className="font-mono font-semibold text-slate-900">{registration.utrNumber}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block text-[11px]">Event Date &amp; Timing:</span>
                <span className="font-semibold text-slate-900">{config.webinarDate} · {config.webinarTime}</span>
              </div>
            </div>
          </div>

          {/* Crucial Next Step: WhatsApp Community */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-950">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5"/>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-emerald-900">
                  Step 2: Join the Official WhatsApp Community
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed font-normal">
                  Event updates, lecture slide decks, syllabus materials, and certificates will be distributed through this WhatsApp community.
                </p>
                <div>
                  <a href={config.whatsappGroupLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
                    <span>Click Here to Join WhatsApp Group</span>
                    <ExternalLink className="w-3.5 h-3.5"/>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 border-t border-slate-200 pt-4 space-y-1">
            <p><strong>Note:</strong> Please save this email and your registration number for entry and certificate retrieval.</p>
            <p>For questions, contact the organizing team at <span className="font-mono text-slate-700">{config.supportEmail}</span> or <span className="font-mono text-slate-700">{config.supportPhone}</span>.</p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 rounded-b-2xl flex items-center justify-end gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium">
            <Printer className="w-4 h-4"/>
            <span>Print Receipt</span>
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold">
            Close Preview
          </button>
        </div>
      </div>
    </div>);
};
