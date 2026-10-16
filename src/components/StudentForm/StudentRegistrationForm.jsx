import React, { useEffect, useState } from 'react';
import { QRCodeCard } from '../QRCodeCard';
import { createBackendRegistration } from '../../utils/api';
import confetti from 'canvas-confetti';
import { Mail, Calendar as CalendarIcon, AlertCircle, ShieldCheck, Check, ArrowRight, ArrowLeft, Building2, Clock, Lock, Timer } from 'lucide-react';
export const StudentRegistrationForm = ({ config, onSubmitSuccess }) => {
    // Page step: 1 = Student Details, 2 = Payment via QR & UPI
    const [currentPage, setCurrentPage] = useState(1);
    // Page 1: Personal Details
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('Male');
    // Page 1: Academic Details
    const [stream, setStream] = useState(config.availableStreams[0] || '');
    const [year, setYear] = useState(config.availableYears[0] || '');
    const [semester, setSemester] = useState(config.availableSemesters[0] || '');
    const [rollNumber, setRollNumber] = useState('');
    const [utrNumber, setUtrNumber] = useState('');
    // Selected UPI App
    const [payerUpiApp, setPayerUpiApp] = useState('PhonePe');
    // Form submission & validation states
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);
    useEffect(() => {
        if (!config.availableStreams.includes(stream)) setStream(config.availableStreams[0] || '');
        if (!config.availableYears.includes(year)) setYear(config.availableYears[0] || '');
        if (!config.availableSemesters.includes(semester)) setSemester(config.availableSemesters[0] || '');
    }, [config.availableStreams, config.availableYears, config.availableSemesters]);
    // Validate Page 1 before proceeding to Page 2
    const validatePage1 = () => {
        const err = {};
        if (!firstName.trim())
            err.firstName = 'First name is required';
        if (!lastName.trim())
            err.lastName = 'Last name is required';
        if (!email.trim()) {
            err.email = 'Email address is required';
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            err.email = 'Please provide a valid email format';
        }
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (!cleanPhone) {
            err.phone = 'Mobile number is required';
        }
        else if (cleanPhone.length < 10) {
            err.phone = 'Enter a valid 10-digit phone number';
        }
        if (!dob) {
            err.dob = 'Date of birth is required';
        }
        if (!stream)
            err.stream = 'Please select your stream';
        if (!year)
            err.year = 'Please select your year';
        if (!semester)
            err.semester = 'Please select your semester';
        setErrors(err);
        return Object.keys(err).length === 0;
    };
    const handleNextPage = () => {
        if (validatePage1()) {
            setCurrentPage(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        else {
            window.scrollTo({ top: 120, behavior: 'smooth' });
        }
    };
    const handleBackPage = () => {
        setCurrentPage(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    // Submit the registration with the UTR entered by the student.
    const handleCompletePayment = async (selectedApp) => {
        setServerError(null);
        if (!utrNumber.trim() || utrNumber.trim().length < 6) {
            setServerError('Enter the UPI transaction reference shown by your payment app.');
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                firstName: firstName.trim(),
                middleName: middleName.trim(),
                lastName: lastName.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                dob,
                gender,
                stream,
                year,
                semester,
                rollNumber: rollNumber.trim() || undefined,
                utrNumber: utrNumber.trim(),
                payerUpiApp: selectedApp || payerUpiApp || 'UPI'
            };
            const createdRecord = await createBackendRegistration(payload);
            try {
                confetti({
                    particleCount: 70,
                    spread: 60,
                    origin: { y: 0.6 }
                });
            }
            catch (e) {
                // Safe fallback
            }
            setIsSubmitting(false);
            onSubmitSuccess(createdRecord);
        }
        catch (err) {
            setIsSubmitting(false);
            setServerError(err.message || 'Failed to record registration. Please try again.');
        }
    };
    // Check registration time window
    const now = new Date();
    const isManualClosed = config.registrationOpen === false;
    const isBeforeStart = config.registrationStartDate && new Date(config.registrationStartDate) > now;
    const isAfterEnd = config.registrationEndDate && new Date(config.registrationEndDate) < now;
    const isRegistrationClosed = isManualClosed || isBeforeStart || isAfterEnd;

    let closedMessage = '';
    if (isManualClosed) {
        closedMessage = 'Registration is currently closed by the administrator.';
    } else if (isBeforeStart) {
        closedMessage = `Registration has not started yet. It opens on ${new Date(config.registrationStartDate).toLocaleString()}.`;
    } else if (isAfterEnd) {
        closedMessage = `The registration deadline has passed. It closed on ${new Date(config.registrationEndDate).toLocaleString()}.`;
    }

    if (isRegistrationClosed) {
        return (<div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <Lock className="w-8 h-8 text-red-500"/>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Registration Closed
            </h1>
            <p className="text-sm text-slate-500">{closedMessage}</p>
          </div>
        </div>);
    }

    return (<div className="max-w-xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-5">
      
      {/* ======================================================== */}
      {/* COLLEGE BRANDING & WEBINAR HEADER (Only on Form Page 1)  */}
      {/* ======================================================== */}
      {currentPage === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">


          <div className="p-5 sm:p-6">
            {/* College Name & Logo */}
            <div className="flex items-start gap-3.5 pb-5 border-b border-slate-100">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                {config.collegeLogoUrl ? (<img src={config.collegeLogoUrl} alt={config.collegeName} className="w-full h-full object-contain" onError={(e) => {
                  e.target.style.display = 'none';
              }}/>) : (<Building2 className="w-6 h-6 text-slate-700"/>)}
              </div>

              <div className="min-w-0 flex-1">
                {config.collegeSubtitle && (<span className="text-[11px] font-medium text-indigo-600 block truncate">
                    {config.collegeSubtitle}
                  </span>)}
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight leading-snug">
                  {config.collegeName}
                </h1>
              </div>

              {/* Fee Badge (₹1,000) */}
              <div className="shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-right">
                <span className="text-[9px] uppercase font-mono text-slate-400 block font-normal">
                  Fee
                </span>
                <div className="text-base font-semibold text-slate-900">
                  ₹{config.feeAmount}
                </div>
              </div>
            </div>

            {/* Webinar Title & Schedule (NO Google Meet Live) */}
            <div className="pt-4">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
                {config.webinarTitle}
              </h2>
              {config.webinarSubtitle && (<p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {config.webinarSubtitle}
                </p>)}

              <div className="grid grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <CalendarIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0"/>
                  <div className="truncate">
                    <span className="text-[9px] uppercase font-mono text-slate-400 block font-normal">Date</span>
                    <span className="font-medium text-slate-800 truncate block">{config.webinarDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0"/>
                  <div className="truncate">
                    <span className="text-[9px] uppercase font-mono text-slate-400 block font-normal">Timing</span>
                    <span className="font-medium text-slate-800 truncate block">{config.webinarTime}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {serverError && (<div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600"/>
          <span>{serverError}</span>
        </div>)}

      {/* ======================================================== */}
      {/* PAGE 1: STUDENT REGISTRATION FORM                        */}
      {/* ======================================================== */}
      {currentPage === 1 && (<div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
          
          {/* Section: Student Enrollment Header & Personal Details */}
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Student Enrollment
            </h2>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
              Personal Details
            </p>
          </div>

          <div className="space-y-3.5">
            {/* First Name, Middle Name & Last Name (In One Line) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" className={`w-full px-3 py-2 text-xs rounded-lg border ${errors.firstName ? 'border-red-400 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'} focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-colors text-slate-900`}/>
                {errors.firstName && (<p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3"/> {errors.firstName}
                  </p>)}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Middle Name
                </label>
                <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Middle Name (Optional)" className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-colors text-slate-900"/>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" className={`w-full px-3 py-2 text-xs rounded-lg border ${errors.lastName ? 'border-red-400 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'} focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-colors text-slate-900`}/>
                {errors.lastName && (<p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3"/> {errors.lastName}
                  </p>)}
              </div>
            </div>

            {/* Email Address & Phone Number (In One Line) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Registered Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none"/>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border ${errors.email ? 'border-red-400 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'} focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-colors text-slate-900`}/>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Official payment receipt and pass will be dispatched to this email.
                </p>
                {errors.email && (<p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3"/> {errors.email}
                  </p>)}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phone Number (WhatsApp) <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-600 text-xs font-mono">
                    +91
                  </span>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" maxLength={10} className={`w-full px-3 py-2 text-xs rounded-r-lg border ${errors.phone ? 'border-red-400 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'} focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-colors text-slate-900`}/>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  For WhatsApp community updates &amp; alerts.
                </p>
                {errors.phone && (<p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3"/> {errors.phone}
                  </p>)}
              </div>
            </div>

            {/* Date of Birth & Gender (Gender is now a clean Dropdown) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Date of Birth (DOB) <span className="text-red-500">*</span>
                </label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} className={`w-full px-3 py-2 text-xs rounded-lg border ${errors.dob ? 'border-red-400 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'} focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-colors bg-white text-slate-900`}/>
                {errors.dob && (<p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3"/> {errors.dob}
                  </p>)}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-colors text-slate-800 cursor-pointer">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Academic Background */}
          <div className="pt-3 border-t border-slate-100">
            <div className="border-b border-slate-100 pb-2 mb-3.5">
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                2. Academic Details
              </h3>
            </div>

            <div className="space-y-3.5">
              {/* Education Stream */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Education Stream / Branch <span className="text-red-500">*</span>
                </label>
                <select value={stream} onChange={(e) => setStream(e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-colors text-slate-800 cursor-pointer">
                  {config.availableStreams.map((s) => (<option key={s} value={s}>
                      {s}
                    </option>))}
                </select>
              </div>

              {/* Year & Semester (Side by Side) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-colors text-slate-800 cursor-pointer">
                    {config.availableYears.map((y) => (<option key={y} value={y}>
                        {y}
                      </option>))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Semester <span className="text-red-500">*</span>
                  </label>
                  <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-colors text-slate-800 cursor-pointer">
                    {config.availableSemesters.map((sem) => (<option key={sem} value={sem}>
                        {sem}
                      </option>))}
                  </select>
                </div>
              </div>

              {/* Roll Number / PRN (Optional) */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  College Roll No / PRN <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input type="text" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="Roll Number / PRN (Optional)" className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-colors text-slate-900"/>
              </div>
            </div>
          </div>

          {/* Action: Proceed to Payment */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">
              Registration Fee: <strong className="text-slate-900">₹{config.feeAmount}</strong>
            </span>

            <button type="button" onClick={handleNextPage} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer">
              <span>Continue to Payment</span>
              <ArrowRight className="w-4 h-4"/>
            </button>
          </div>
        </div>)}

      {/* ======================================================== */}
      {/* PAGE 2: QR CODE & SUBMIT                                 */}
      {/* ======================================================== */}
      {currentPage === 2 && (<div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col items-center max-w-lg mx-auto">
          {/* Centered QR Standee */}
          <div className="w-full flex flex-col items-center">
            <QRCodeCard upiId={config.upiId} payeeName={config.payeeName} terminalText={config.upiTerminalText} amount={config.feeAmount} webinarTitle={config.webinarTitle} onUpiAppClick={(app) => setPayerUpiApp(app)} showAppButtons={true}/>
          </div>

          <div className="w-full max-w-[310px] mt-4 space-y-3">
            <label className="block text-xs font-medium text-slate-700">
              UPI transaction reference (UTR) <span className="text-red-500">*</span>
              <input value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} maxLength={64} required placeholder="Enter the reference from your payment app" className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600" />
            </label>
          </div>

          {serverError && <div className="w-full max-w-[310px] mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">{serverError}</div>}

          {/* Action: Back & Submit */}
          <div className="w-full max-w-[310px] pt-4 mt-2 border-t border-slate-100 flex items-center gap-2">
            <button type="button" onClick={handleBackPage} className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5"/>
              <span>Back</span>
            </button>

            <button type="button" onClick={() => handleCompletePayment()} disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75">
              {isSubmitting ? (<>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  <span>Submitting...</span>
                </>) : (<>
                  <span>Submit</span>
                  <ArrowRight className="w-4 h-4"/>
                </>)}
            </button>
          </div>
        </div>)}
    </div>);
};
