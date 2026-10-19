import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Smartphone, ArrowUpRight, X } from 'lucide-react';
export const QRCodeCard = ({ upiId, payeeName, terminalText, amount, webinarTitle, onUpiAppClick, showAppButtons = false }) => {
    const [copied, setCopied] = useState(false);
    const [showRedirectModal, setShowRedirectModal] = useState(false);
    const canvasRef = useRef(null);
    const canLaunchUpiApp = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const encodedTitle = encodeURIComponent(`${webinarTitle || 'Webinar'} Registration Fee`);
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodedTitle}`;
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
    const handleUpiAppClick = (e) => {
        e.preventDefault();
        if (!canLaunchUpiApp) {
            setShowRedirectModal(true);
            return;
        }
        onUpiAppClick?.('UPI');
        setShowRedirectModal(false);
        window.location.assign(upiLink);
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

      {/* UPI App Payment Action */}
      {showAppButtons && (
        <div className="w-full max-w-[310px] mt-4 space-y-2">
          <div className="text-center">
            <span className="text-xs font-medium text-slate-700">
              Pay ₹{amount} with a UPI app
            </span>
          </div>

          <div className="flex justify-center">
            <a href={upiLink} onClick={handleUpiAppClick} className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/80 text-[#5f259f] font-medium text-xs transition-all shadow-xs">
              <Smartphone className="w-3.5 h-3.5"/>
              <span>Open UPI App</span>
              <ArrowUpRight className="w-3 h-3 opacity-60"/>
            </a>
          </div>

        </div>
      )}

      {/* UPI app launch fallback */}
      {showRedirectModal && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Pay ₹{amount} via UPI</h4>
                <p className="text-xs text-slate-500">{canLaunchUpiApp ? 'Continue with an installed UPI app' : 'This browser cannot open UPI apps'}</p>
              </div>
              <button onClick={() => setShowRedirectModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4"/>
              </button>
            </div>

            {canLaunchUpiApp ? (
              <a href={upiLink} onClick={handleUpiAppClick} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/80 text-purple-900 font-medium text-xs transition-colors">
                <Smartphone className="w-4 h-4"/>
                <span>Open UPI App</span>
                <ArrowUpRight className="w-4 h-4"/>
              </a>
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-xs text-slate-600">Close this dialog and scan the QR code with your phone, or copy the UPI ID to pay manually.</p>
                <button type="button" onClick={handleCopy} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium text-xs transition-colors">
                  {copied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                  <span>{copied ? 'UPI ID copied' : 'Copy UPI ID'}</span>
                </button>
              </div>
            )}

            <div className="text-[11px] text-slate-400 text-center pt-1 border-t border-slate-100">
              UPI VPA: <span className="font-mono text-slate-700 font-medium">{upiId}</span>
            </div>
          </div>
        </div>)}
    </div>);
};
