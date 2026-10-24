import React, { useEffect, useState } from 'react';
import { createBackendRegistration, getCashfreePaymentStatus } from '../../utils/api';
import confetti from 'canvas-confetti';
import { Mail, Calendar as CalendarIcon, AlertCircle, ShieldCheck, ArrowRight, ArrowLeft, Building2, Clock, Lock } from 'lucide-react';

function loadCashfreeSdk() {
    if (window.Cashfree) return Promise.resolve(window.Cashfree);
    return new Promise((resolve, reject) => {
        let script = document.querySelector('script[data-cashfree-sdk]');
        if (!script) {
            script = document.createElement('script');
            script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
            script.async = true;
            script.dataset.cashfreeSdk = 'true';
            document.head.appendChild(script);
        }
        script.addEventListener('load', () => window.Cashfree ? resolve(window.Cashfree) : reject(new Error('Cashfree checkout could not be loaded.')) , { once: true });
        script.addEventListener('error', () => reject(new Error('Cashfree checkout could not be loaded. Please check your connection.')), { once: true });
    });
}

export const StudentRegistrationForm = ({ config, onSubmitSuccess }) => {
    // Page step: 1 = Student Details, 2 = Cashfree checkout
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
    // Form submission & validation states
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);
    const [checkoutSession, setCheckoutSession] = useState(null);
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
        setCheckoutSession(null);
        setServerError(null);
        setCurrentPage(1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    // Create a server-priced Cashfree order, then trust only server-side payment verification.
    const handleCompletePayment = async () => {
        setServerError(null);
        setIsSubmitting(true);
        try {
            let session = checkoutSession;
            if (!session) {
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
                };
                session = await createBackendRegistration(payload);
                setCheckoutSession(session);
                try {
                    sessionStorage.setItem(`cashfree-registration:${session.registration.cashfreeOrderId}`, JSON.stringify(session.registration));
                } catch {
                    // Checkout can continue if browser storage is unavailable.
                }
            }

            const Cashfree = await loadCashfreeSdk();
            const cashfree = Cashfree({ mode: session.cashfreeMode || 'production' });
            let checkoutResult;
            try {
                checkoutResult = await cashfree.checkout({
                    paymentSessionId: session.paymentSessionId,
                    redirectTarget: '_modal',
                });
            } catch (checkoutError) {
                checkoutResult = { error: { message: checkoutError.message } };
            }

            let paymentStatus = null;
            const statusAttempts = checkoutResult?.error ? 1 : 12;
            for (let attempt = 0; attempt < statusAttempts; attempt += 1) {
                try {
                    paymentStatus = await getCashfreePaymentStatus(session.registration.cashfreeOrderId);
                    if (paymentStatus.data?.paymentStatus === 'verified') break;
                } catch (statusError) {
                    if (attempt === statusAttempts - 1) throw statusError;
                }
                if (attempt < statusAttempts - 1) await new Promise((resolve) => window.setTimeout(resolve, 2000));
            }

            if (checkoutResult?.error && paymentStatus?.data?.paymentStatus !== 'verified') {
                setServerError(checkoutResult.error.message || 'Payment was not confirmed. You can try checkout again.');
                setIsSubmitting(false);
                return;
            }

            const createdRecord = {
                ...session.registration,
                paymentStatus: paymentStatus?.data?.paymentStatus || 'pending',
                paymentReceiptSent: Boolean(paymentStatus?.data?.paymentReceiptSent),
            };
            try {
                if (createdRecord.paymentStatus === 'verified') {
                    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
                }
            }
            catch (e) {
                // Safe fallback
            }
            setIsSubmitting(false);
            onSubmitSuccess(createdRecord);
        }
        catch (err) {
            setIsSubmitting(false);
            setServerError(err.message || 'Could not start payment. Please try again.');
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
        closedMessage = `Registration has not started yet. It opens on ${new Date(config.registrationStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} at ${new Date(config.registrationStartDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`;
    } else if (isAfterEnd) {
        closedMessage = `The registration deadline has passed. It closed on ${new Date(config.registrationEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} at ${new Date(config.registrationEndDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`;
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
      {/* PAGE 2: CASHFREE CHECKOUT                                */}
      {/* ======================================================== */}
      {currentPage === 2 && (<div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm max-w-lg mx-auto">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
              <ShieldCheck className="w-6 h-6 text-indigo-600"/>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Secure payment</h2>
            <p className="text-sm text-slate-500 mt-1">Complete your registration fee using Cashfree checkout.</p>
            <div className="w-full mt-5 p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-sm text-slate-600">Registration fee</span>
              <strong className="text-xl text-slate-950">₹{Number(config.feeAmount).toFixed(2)}</strong>
            </div>
            <p className="text-xs leading-5 text-slate-500 mt-4">
              Your receipt and WhatsApp community invite will be emailed after Cashfree confirms the payment.
            </p>
          </div>

          {serverError && <div role="alert" className="w-full mt-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{serverError}</div>}

          <div className="w-full pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
            <button type="button" onClick={handleBackPage} disabled={isSubmitting} className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50">
              <ArrowLeft className="w-3.5 h-3.5"/>
              <span>Back</span>
            </button>

            <button type="button" onClick={handleCompletePayment} disabled={isSubmitting} className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75">
              {isSubmitting ? (<>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  <span>Opening checkout...</span>
                </>) : (<>
                  <span>{checkoutSession ? 'Resume payment' : 'Pay securely'}</span>
                  <ArrowRight className="w-4 h-4"/>
                </>)}
            </button>
          </div>
        </div>)}
    </div>);
};
