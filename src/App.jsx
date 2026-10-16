import React, { useState, useEffect } from 'react';
import { DEFAULT_WEBINAR_CONFIG } from './data/defaultConfig';
import { fetchBackendConfig, fetchBackendRegistrations, fetchBackendRegistrationStatus } from './utils/api';
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
    useEffect(() => {
        if (!activeReceipt?.id || activeReceipt.paymentStatus === 'verified' || activeReceipt.paymentStatus === 'rejected') return;
        const pollStatus = async () => {
            try {
                const status = await fetchBackendRegistrationStatus(activeReceipt.id);
                setActiveReceipt((current) => current?.id === activeReceipt.id
                    ? { ...current, paymentStatus: status.status, emailSent: status.emailSent }
                    : current);
            } catch {
                // Keep the pending view and try again while the receipt is open.
            }
        };
        const timer = window.setInterval(pollStatus, 5000);
        return () => window.clearInterval(timer);
    }, [activeReceipt?.id, activeReceipt?.paymentStatus]);
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
            : currentView === 'student' ? (<StudentRegistrationForm config={config} onSubmitSuccess={handleRegistrationSuccess}/>) : (<AdminDashboard config={config} onUpdateConfig={handleUpdateConfig} registrations={registrations} onRefreshRegistrations={refreshRegistrations} onAdminLogout={() => setRegistrations([])}/>)}
      </main>

      {/* Success Receipt Modal (shown upon registration or receipt inspect) */}
      {activeReceipt && (<SuccessReceiptModal registration={activeReceipt} config={config} isOpen={true} onClose={() => setActiveReceipt(null)} onNewRegistration={() => setActiveReceipt(null)}/>)}


    </div>);
}
