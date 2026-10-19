import React, { useState, useEffect } from 'react';
import { DEFAULT_WEBINAR_CONFIG } from './data/defaultConfig';
import { fetchBackendConfig, fetchBackendRegistrations, getCashfreePaymentStatus } from './utils/api';
import { Navbar } from './components/Navbar';
import { StudentRegistrationForm } from './components/StudentForm/StudentRegistrationForm';
import { SuccessReceiptModal } from './components/SuccessReceiptModal';
import { AdminDashboard } from './components/Admin/AdminDashboard';

function viewFromPath() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    return path === '/admin' ? 'admin' : 'student';
}

export default function App() {
    const [config, setConfig] = useState(DEFAULT_WEBINAR_CONFIG);
    const [registrations, setRegistrations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [currentView, setCurrentView] = useState(viewFromPath);
    const [activeReceipt, setActiveReceipt] = useState(null);
    const [registrationFormVersion, setRegistrationFormVersion] = useState(0);
    // Public webinar settings load for everyone; student records load only after admin login.
    const loadData = async () => {
        try {
            const backendConfig = await fetchBackendConfig();
            setConfig(backendConfig);
        }
        catch (err) {
            console.error('Error fetching backend data:', err);
            setLoadError('Could not connect to the registration backend. Check that the server and database are running, then reload.');
        }
        finally {
            setIsLoading(false);
        }
    };
    const refreshRegistrations = async () => {
        const backendRegs = await fetchBackendRegistrations();
        setRegistrations(backendRegs);
        return backendRegs;
    };
    useEffect(() => {
        loadData();
    }, []);
    useEffect(() => {
        const syncView = () => setCurrentView(viewFromPath());
        window.addEventListener('popstate', syncView);
        return () => window.removeEventListener('popstate', syncView);
    }, []);
    // Recover the pending registration if Cashfree returns through its hosted redirect URL.
    useEffect(() => {
        const orderId = new URLSearchParams(window.location.search).get('order_id');
        if (!orderId) return;
        try {
            const savedRegistration = sessionStorage.getItem(`cashfree-registration:${orderId}`);
            if (savedRegistration) {
                setActiveReceipt({ ...JSON.parse(savedRegistration), paymentStatus: 'pending' });
            }
        } catch (err) {
            console.error('Could not restore Cashfree checkout registration:', err);
        }
        window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
    }, []);
    // Keep checking until Cashfree confirms payment, including when its webhook is delayed.
    useEffect(() => {
        const orderId = activeReceipt?.cashfreeOrderId;
        if (!orderId || (activeReceipt.paymentStatus === 'verified' && activeReceipt.paymentReceiptSent)) return;
        let cancelled = false;
        let timer;
        let attempts = 0;
        const checkStatus = async () => {
            try {
                const result = await getCashfreePaymentStatus(orderId);
                if (cancelled) return;
                if (result.data?.paymentStatus === 'verified') {
                    setActiveReceipt((current) => current?.cashfreeOrderId === orderId
                        ? { ...current, paymentStatus: 'verified', paymentReceiptSent: Boolean(result.data.paymentReceiptSent) }
                        : current);
                    if (result.data.paymentReceiptSent) {
                        try { sessionStorage.removeItem(`cashfree-registration:${orderId}`); } catch { /* no-op */ }
                        return;
                    }
                }
            } catch {
                // Keep trying while the signed Cashfree webhook or status API catches up.
            }
            attempts += 1;
            if (!cancelled && attempts < 60) timer = window.setTimeout(checkStatus, attempts < 30 ? 4000 : 15000);
        };
        checkStatus();
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [activeReceipt?.cashfreeOrderId, activeReceipt?.paymentStatus, activeReceipt?.paymentReceiptSent]);
    const handleViewChange = (view) => {
        const path = view === 'admin' ? '/admin' : '/register';
        window.history.pushState({}, '', path);
        setCurrentView(view);
    };
    // Student completes registration
    const handleRegistrationSuccess = (newReg) => {
        setRegistrations((prev) => [newReg, ...prev]);
        setActiveReceipt(newReg);
    };
    // Config updated from admin
    const handleUpdateConfig = (newConfig) => {
        setConfig(newConfig);
    };
    return (<div className="min-h-screen bg-slate-100/70 flex flex-col font-sans antialiased text-slate-800 selection:bg-slate-900 selection:text-white">
      {/* Top Navbar */}
      <Navbar config={config} currentView={currentView} onViewChange={handleViewChange} registrationsCount={registrations.length}/>

      {/* Main Content Area */}
      <main className="flex-1 pb-6">
        {loadError ? <div role="alert" className="max-w-3xl mx-auto mt-4 px-4"><div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</div></div>
          : isLoading ? <div className="py-16 text-center text-sm text-slate-500">Loading webinar settings…</div>
            : currentView === 'student' ? (<StudentRegistrationForm key={registrationFormVersion} config={config} onSubmitSuccess={handleRegistrationSuccess}/>) : (<AdminDashboard config={config} onUpdateConfig={handleUpdateConfig} registrations={registrations} onRefreshRegistrations={refreshRegistrations} onAdminLogout={() => setRegistrations([])}/>)}
      </main>

      {/* Success Receipt Modal (shown upon registration or receipt inspect) */}
      {activeReceipt && (<SuccessReceiptModal registration={activeReceipt} config={config} isOpen={true} onClose={() => { setActiveReceipt(null); setRegistrationFormVersion((version) => version + 1); }} onNewRegistration={() => { setActiveReceipt(null); setRegistrationFormVersion((version) => version + 1); }}/>)}


    </div>);
}
