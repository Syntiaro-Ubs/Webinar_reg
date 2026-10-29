import React from 'react';
import { Calendar, Clock, CheckCircle2, Building2, ShieldCheck } from 'lucide-react';
export const CollegeHeader = ({ config }) => {
    return (<div className="w-full bg-white border-b border-slate-200 shadow-2xs">
      {/* Top Announcement Banner */}
      {config.bannerNotice && (<div className="bg-slate-900 text-slate-200 text-xs font-normal py-2 px-4 text-center tracking-wide border-b border-slate-800">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 break-words text-center leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
            <span>{config.bannerNotice}</span>
          </div>
        </div>)}

      {/* Main College Institution Bar */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex min-w-0 flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-5 pb-5 border-b border-slate-100">
          
          {/* College Crest & Name */}
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2 shrink-0 overflow-hidden">
              {config.collegeLogoUrl ? (<img src={config.collegeLogoUrl} alt={config.collegeName} className="w-full h-full object-contain" onError={(e) => {
                e.target.style.display = 'none';
            }}/>) : (<Building2 className="w-7 h-7 text-slate-700"/>)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-0.5">
                <span>Accredited Academic Institution</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5"/> Official Portal
                </span>
              </div>

              {/* The College Name where registration is taking place */}
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight leading-snug break-words">
                {config.collegeName}
              </h1>
            </div>
          </div>

          {/* Fee Pass Badge */}
          <div className="self-start shrink-0 flex items-center sm:flex-col sm:items-end justify-between sm:justify-center p-3 sm:p-3.5 bg-slate-50 border border-slate-200 rounded-xl min-w-[150px]">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block font-normal">
                Delegate Pass
              </span>
              <div className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                ₹{config.feeAmount}
              </div>
            </div>
            <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5"/> Cashfree Payments
            </span>
          </div>
        </div>

        {/* Webinar Overview & Logistics (No Google Meet Live) */}
        <div className="pt-4">
          <div className="max-w-2xl">
            <span className="text-xs font-medium uppercase tracking-wider text-indigo-600 mb-1 block">
              National Webinar Registration
            </span>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight break-words">
              {config.webinarTitle}
            </h2>
            {config.webinarSubtitle && (<p className="text-xs sm:text-sm text-slate-600 mt-1 font-normal leading-relaxed">
                {config.webinarSubtitle}
              </p>)}
          </div>

          {/* Logistics Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 max-w-lg">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0">
                <Calendar className="w-4 h-4"/>
              </div>
              <div className="truncate">
                <span className="text-[10px] uppercase font-mono text-slate-400 block font-normal">Event Date</span>
                <span className="text-xs font-semibold text-slate-800">{config.webinarDate}</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0">
                <Clock className="w-4 h-4"/>
              </div>
              <div className="truncate">
                <span className="text-[10px] uppercase font-mono text-slate-400 block font-normal">Event Time</span>
                <span className="text-xs font-semibold text-slate-800">{config.webinarTime}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);
};
