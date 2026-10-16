import React from 'react';
import { GraduationCap, ShieldCheck, UserCheck } from 'lucide-react';
export const Navbar = ({ config, currentView, onViewChange, registrationsCount }) => {
    return (<header className="sticky top-0 z-40 bg-slate-950 text-white border-b border-slate-800/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2 flex flex-col gap-2 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:py-0">
        
        {/* Brand & College Label */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
            <GraduationCap className="w-4 h-4"/>
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-sm sm:text-base text-white tracking-tight truncate max-w-[calc(100vw-5rem)] sm:max-w-xs md:max-w-md block">
              {config.collegeName}
            </span>
            <span className="text-[10px] font-mono text-slate-400 block tracking-tight">
            </span>
          </div>
        </div>

        {currentView === 'admin' && (<div className="w-full sm:w-auto sm:ml-auto">
          <div className="grid grid-cols-2 items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button type="button" onClick={() => onViewChange('student')} className="flex min-w-0 items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold text-slate-400 hover:text-white transition-all cursor-pointer">
              <UserCheck className="w-3.5 h-3.5"/>
              <span className="sm:hidden">Student</span><span className="hidden sm:inline">Student Registration</span>
            </button>

            <div className="flex min-w-0 items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold bg-white text-slate-950 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500"/>
              <span className="sm:hidden">Admin</span><span className="hidden sm:inline">Admin Console</span>
              <span className="ml-1 text-[10px] font-mono bg-slate-800 px-1.5 py-0.2 rounded-full text-slate-300 border border-slate-700">
                {registrationsCount}
              </span>
            </div>
          </div>
        </div>)}
      </div>
    </header>);
};
