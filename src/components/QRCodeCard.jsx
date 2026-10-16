import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Smartphone, ShieldCheck, ArrowUpRight, X } from 'lucide-react';
export const QRCodeCard = ({ upiId, payeeName, terminalText, amount, webinarTitle, onUpiAppClick, showAppButtons = false }) => {
    const [copied, setCopied] = useState(false);
    const [showRedirectModal, setShowRedirectModal] = useState(false);
    const canvasRef = useRef(null);
    // NPCI standard UPI URLs with exact ₹1,000 fee
    const encodedTitle = encodeURIComponent(`${webinarTitle || 'Webinar'} Registration Fee`);
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodedTitle}`;
    const gpayLink = `gpay://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodedTitle}`;
    const phonepeLink = `phonepe://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodedTitle}`;
    const paytmLink = `paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodedTitle}`;
    useEffect(() => {
        if (canvasRef.current) {
            QRCode.toCanvas(canvasRef.current, upiLink, {
                width: 190,
                margin: 1,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff'
                },
                errorCorrectionLevel: 'H'
            }).catch((err) => {
                console.error('Failed to generate QR code', err);
            });
        }
    }, [upiLink]);
    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(upiId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    const handleQRClick = (e) => {
        e.preventDefault();
        setShowRedirectModal(true);
    };
    return (<div className="w-full flex flex-col items-center">
      {/* Physical Terminal Style Card */}
      <div className="w-full max-w-[310px] bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col items-center text-center">
        
        {/* UPI payment methods */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-[#5f259f] flex items-center justify-center text-white text-xs font-semibold">
            पे
          </div>
          <span className="text-sm font-semibold text-slate-800 tracking-tight">UPI Payment</span>
          <span className="text-slate-300">|</span>
          <span className="text-xs font-medium text-slate-600">Merchant Pay</span>
        </div>

        {/* Payee Name */}
        <div className="w-full bg-slate-900 text-white text-xs font-medium py-1 px-3 rounded-md mb-3 tracking-wide">
          {payeeName}
        </div>

        {/* Scan with UPI or click to choose an installed app */}
        <div className="relative group">
          <a href={upiLink} onClick={handleQRClick} title="Choose a UPI app to pay" className="block p-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#5f259f] hover:shadow-md transition-all cursor-pointer">
            <canvas ref={canvasRef} className="rounded-lg w-[180px] h-[180px]"/>
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#5f259f] bg-purple-50 py-1 px-2 rounded-md group-hover:bg-[#5f259f] group-hover:text-white transition-colors">
              <Smartphone className="w-3.5 h-3.5"/>
              <span>Scan to pay or click to choose an app</span>
            </div>
          </a>
        </div>

        {/* Fixed Fee Amount */}
        <div className="mt-3">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-normal">
            Registration Fee
          </span>
          <div className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            ₹{amount}
          </div>
        </div>

        {/* BHIM UPI Identifier */}
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 w-full flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="font-semibold italic text-slate-800">BHIM</span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-emerald-600">UPI</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-0.5">
            {terminalText}
          </span>
        </div>

        {/* UPI ID with Copy Button */}
        <div className="mt-2.5 w-full bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center justify-between text-xs">
          <div className="text-left truncate pr-2">
            <span className="text-[9px] uppercase font-mono text-slate-400 block">UPI ID / VPA</span>
            <span className="font-mono text-xs text-slate-800 font-medium">{upiId}</span>
          </div>
          <button type="button" onClick={handleCopy} className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${copied
            ? 'bg-emerald-600 text-white'
            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
            {copied ? (<>
                <Check className="w-3 h-3"/>
                <span>Copied</span>
              </>) : (<>
                <Copy className="w-3 h-3"/>
                <span>Copy</span>
              </>)}
          </button>
        </div>
      </div>

      {/* 1-Tap App Payment Action Buttons */}
      {showAppButtons && (
        <div className="w-full max-w-[310px] mt-4 space-y-2">
          <div className="text-center">
            <span className="text-xs font-medium text-slate-700">
              Tap to Pay ₹{amount} Directly in App
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* PhonePe Button */}
            <a href={phonepeLink} onClick={() => onUpiAppClick?.('PhonePe')} className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/80 text-[#5f259f] font-medium text-xs transition-all shadow-xs">
              <span className="w-4 h-4 rounded-full bg-[#5f259f] text-white text-[9px] flex items-center justify-center font-bold">पे</span>
              <span>PhonePe</span>
              <ArrowUpRight className="w-3 h-3 opacity-60"/>
            </a>

            {/* Google Pay Button */}
            <a href={gpayLink} onClick={() => onUpiAppClick?.('Google Pay')} className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 text-blue-700 font-medium text-xs transition-all shadow-xs">
              <span className="font-bold text-blue-600 text-xs">G</span>
              <span>Google Pay</span>
              <ArrowUpRight className="w-3 h-3 opacity-60"/>
            </a>

            {/* Paytm Button */}
            <a href={paytmLink} onClick={() => onUpiAppClick?.('Paytm')} className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-all shadow-xs">
              <span className="font-bold text-[#00b9f5] text-xs">P</span>
              <span>Paytm UPI</span>
              <ArrowUpRight className="w-3 h-3 opacity-60"/>
            </a>

            {/* Other UPI */}
            <a href={upiLink} onClick={() => onUpiAppClick?.('Other UPI')} className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-all shadow-xs">
              <Smartphone className="w-3.5 h-3.5 text-slate-500"/>
              <span>Any UPI App</span>
              <ArrowUpRight className="w-3 h-3 opacity-60"/>
            </a>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600"/>
            <span>Pay in your UPI app, then submit the transaction reference shown there.</span>
          </div>
        </div>
      )}

      {/* Redirect Modal for Desktop */}
      {showRedirectModal && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Pay ₹{amount} via UPI App
                </h4>
                <p className="text-xs text-slate-500">
                  Select your installed UPI application
                </p>
              </div>
              <button onClick={() => setShowRedirectModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4"/>
              </button>
            </div>

            <div className="space-y-2">
              <a href={phonepeLink} onClick={() => {
                onUpiAppClick?.('PhonePe');
                setShowRedirectModal(false);
            }} className="w-full flex items-center justify-between p-3 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/80 text-purple-900 font-medium text-xs transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#5f259f] text-white flex items-center justify-center font-bold text-xs">पे</span>
                  <div>
                    <span className="block font-semibold">Pay with PhonePe</span>
                    <span className="text-[11px] text-purple-700">Open PhonePe application</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-purple-600"/>
              </a>

              <a href={gpayLink} onClick={() => {
                onUpiAppClick?.('Google Pay');
                setShowRedirectModal(false);
            }} className="w-full flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 text-blue-900 font-medium text-xs transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-white border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-xs">G</span>
                  <div>
                    <span className="block font-semibold">Pay with Google Pay</span>
                    <span className="text-[11px] text-blue-700">Open Google Pay application</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-blue-600"/>
              </a>

              <a href={upiLink} onClick={() => {
                onUpiAppClick?.('Other UPI');
                setShowRedirectModal(false);
            }} className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium text-xs transition-colors">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-slate-600"/>
                  <div>
                    <span className="block font-semibold">Any Other UPI App</span>
                    <span className="text-[11px] text-slate-500">Paytm, BHIM, Cred, etc.</span>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500"/>
              </a>
            </div>

            <div className="text-[11px] text-slate-400 text-center pt-1 border-t border-slate-100">
              UPI VPA: <span className="font-mono text-slate-700 font-medium">{upiId}</span>
            </div>
          </div>
        </div>)}
    </div>);
};
