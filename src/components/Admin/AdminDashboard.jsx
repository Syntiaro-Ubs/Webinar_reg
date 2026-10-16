import React, { useEffect, useState } from 'react';
import { DEFAULT_WEBINAR_CONFIG } from '../../data/defaultConfig';
import { SuccessReceiptModal } from '../SuccessReceiptModal';
import { apiUrl, saveBackendConfig, updateBackendStatus, deleteBackendRegistration, resendEmailReceipt, fetchAdminSession, loginAdmin, logoutAdmin } from '../../utils/api';
import { Settings, Users, Search, Plus, Trash2, CheckCircle, Calendar, Clock, XCircle, Save, RotateCcw, Eye, FileSpreadsheet, QrCode, Building2, BookOpen, MessageCircle, ShieldCheck, Check, Send, BarChart3, X, Copy, Share2, Link2, Timer, ToggleLeft, ToggleRight } from 'lucide-react';
export const AdminDashboard = ({ config, onUpdateConfig, registrations, onRefreshRegistrations, onAdminLogout }) => {
    const [activeTab, setActiveTab] = useState('submissions');
    // Customizer state
    const [formConfig, setFormConfig] = useState({ ...config });
    const [newStreamInput, setNewStreamInput] = useState('');
    const [showStreamPicker, setShowStreamPicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveNotice, setSaveNotice] = useState(null);
    // Submissions search & filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [streamFilter, setStreamFilter] = useState('all');
    const [collegeFilter, setCollegeFilter] = useState('all');
    // Modals
    const [inspectRegistration, setInspectRegistration] = useState(null);
    const [actionNotice, setActionNotice] = useState(null);
    const [shareLink, setShareLink] = useState(`${window.location.origin}/register`);
    const [linkCopied, setLinkCopied] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    useEffect(() => setFormConfig({ ...config }), [config]);
    useEffect(() => {
        let mounted = true;
        fetchAdminSession()
            .then(async (authenticated) => {
                if (!mounted) return;
                setIsAuthenticated(authenticated);
                if (authenticated) {
                    try {
                        await onRefreshRegistrations();
                    } catch (err) {
                        setLoginError(err.message || 'Could not load registrations.');
                    }
                }
            })
            .catch(() => {
                if (mounted) setLoginError('Could not connect to the admin service.');
            })
            .finally(() => {
                if (mounted) setAuthChecked(true);
            });
        return () => { mounted = false; };
    }, []);
    useEffect(() => {
        fetch(apiUrl('/api/share-link'))
            .then((res) => res.json())
            .then((json) => {
                if (json.success && json.data?.studentUrl) {
                    setShareLink(json.data.studentUrl);
                }
            })
            .catch(() => { });
    }, []);
    const handleCopyShareLink = async () => {
        try {
            await navigator.clipboard.writeText(shareLink);
            setLinkCopied(true);
            showTempNotice('Student registration link copied');
            setTimeout(() => setLinkCopied(false), 2000);
        }
        catch (err) {
            showTempNotice('Could not copy link');
        }
    };
    const handleWhatsAppShare = () => {
        const message = `Register for ${config.webinarTitle}\n${shareLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    };
    const showTempNotice = (msg) => {
        setActionNotice(msg);
        setTimeout(() => setActionNotice(null), 3000);
    };
    // Save config to Backend
    const handleSaveConfig = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveNotice(null);
        try {
            await saveBackendConfig(formConfig);
            onUpdateConfig(formConfig);
            setSaveNotice('Settings updated and persisted on backend successfully.');
            setTimeout(() => setSaveNotice(null), 3500);
        } catch (err) {
            setSaveNotice(err.message || 'Could not save settings. Check the backend connection.');
        } finally {
            setIsSaving(false);
        }
    };
    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setLoginError('');
        try {
            await loginAdmin(adminPassword);
            setAdminPassword('');
            setIsAuthenticated(true);
            await onRefreshRegistrations();
        } catch (err) {
            setLoginError(err.message || 'Could not sign in.');
        } finally {
            setIsLoggingIn(false);
        }
    };
    const handleAdminLogout = async () => {
        try {
            await logoutAdmin();
        } finally {
            setIsAuthenticated(false);
            onAdminLogout?.();
        }
    };
    const handleResetDefaults = async () => {
        if (window.confirm('Reset all college branding and webinar form settings to default?')) {
            try {
                await saveBackendConfig(DEFAULT_WEBINAR_CONFIG);
                setFormConfig({ ...DEFAULT_WEBINAR_CONFIG });
                onUpdateConfig(DEFAULT_WEBINAR_CONFIG);
                showTempNotice('Reset to default configuration.');
            } catch (err) {
                showTempNotice(err.message || 'Could not reset settings.');
            }
        }
    };
    // Add / remove streams
    const handleAddStream = () => {
        if (newStreamInput.trim() && !formConfig.availableStreams.includes(newStreamInput.trim())) {
            setFormConfig((prev) => ({
                ...prev,
                availableStreams: [...prev.availableStreams, newStreamInput.trim()]
            }));
            setNewStreamInput('');
        }
    };
    const handleRemoveStream = (streamToRemove) => {
        setFormConfig((prev) => ({
            ...prev,
            availableStreams: prev.availableStreams.filter((s) => s !== streamToRemove)
        }));
    };
    // Status updates
    const handleStatusChange = async (id, status, note) => {
        try {
            const result = await updateBackendStatus(id, status, note);
            await onRefreshRegistrations();
            if (status === 'verified') {
                showTempNotice(result.emailSent
                    ? 'Payment verified. Receipt and WhatsApp group link emailed.'
                    : 'Payment verified, but receipt email failed. Check SMTP settings and resend.');
            } else {
                showTempNotice(`Status marked as ${status.toUpperCase()}`);
            }
        } catch (err) {
            showTempNotice(err.message || 'Could not update the registration status.');
        }
    };
    // Delete registration
    const handleDelete = async (id, name) => {
        if (window.confirm(`Permanently delete registration for ${name}?`)) {
            try {
                await deleteBackendRegistration(id);
                await onRefreshRegistrations();
                showTempNotice(`Registration for ${name} removed.`);
            } catch (err) {
                showTempNotice(err.message || 'Could not delete the registration.');
            }
        }
    };
    // Resend email
    const handleResendEmail = async (id, email) => {
        const ok = await resendEmailReceipt(id);
        showTempNotice(ok
            ? `Receipt emailed to ${email}`
            : `Could not email receipt to ${email}. Check SMTP settings.`);
    };
    // Filter registrations
    const filteredRegistrations = registrations.filter((reg) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q ||
            reg.firstName.toLowerCase().includes(q) ||
            (reg.middleName && reg.middleName.toLowerCase().includes(q)) ||
            reg.lastName.toLowerCase().includes(q) ||
            reg.email.toLowerCase().includes(q) ||
            reg.phone.includes(q) ||
            reg.utrNumber.toLowerCase().includes(q) ||
            reg.regNumber.toLowerCase().includes(q) ||
            (reg.collegeName && reg.collegeName.toLowerCase().includes(q));
        const matchesStatus = statusFilter === 'all' || reg.paymentStatus === statusFilter;
        const matchesStream = streamFilter === 'all' || reg.stream === streamFilter;
        const matchesCollege = collegeFilter === 'all' || reg.collegeName === collegeFilter;
        return matchesSearch && matchesStatus && matchesStream && matchesCollege;
    });
    // Extract unique college names for the filter dropdown
    const uniqueColleges = [...new Set(registrations.map((r) => r.collegeName).filter(Boolean))].sort();
    // Analytics Metrics
    const totalStudents = registrations.length;
    const verifiedCount = registrations.filter((r) => r.paymentStatus === 'verified').length;
    const pendingCount = registrations.filter((r) => r.paymentStatus === 'pending').length;
    const totalTarget = registrations.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const pendingAmount = registrations
        .filter((r) => r.paymentStatus === 'pending')
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalRevenue = registrations
        .filter((r) => r.paymentStatus === 'verified')
        .reduce((sum, r) => sum + r.amount, 0);
    // CSV Export
    const handleExportCSV = () => {
        const headers = [
            'Registration ID',
            'College Name',
            'First Name',
            'Middle Name',
            'Last Name',
            'Email',
            'Phone',
            'DOB',
            'Gender',
            'Stream',
            'Year',
            'Semester',
            'Roll Number',
            'Amount (INR)',
            'UPI ID Paid To',
            'UTR Number',
            'Payment App',
            'Payment Status',
            'Registration Time',
            'Notes'
        ];
        const rows = filteredRegistrations.map((r) => [
            `"${r.regNumber}"`,
            `"${r.collegeName || ''}"`,
            `"${r.firstName}"`,
            `"${r.middleName || ''}"`,
            `"${r.lastName}"`,
            `"${r.email}"`,
            `"${r.phone}"`,
            `"${r.dob}"`,
            `"${r.gender}"`,
            `"${r.stream}"`,
            `"${r.year}"`,
            `"${r.semester}"`,
            `"${r.rollNumber || ''}"`,
            r.amount,
            `"${r.upiIdPaidTo}"`,
            `"${r.utrNumber}"`,
            `"${r.payerUpiApp || ''}"`,
            `"${r.paymentStatus}"`,
            `"${r.registeredAt}"`,
            `"${(r.notes || '').replace(/"/g, '""')}"`
        ]);
        const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Webinar_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    if (!authChecked) {
        return <div className="py-16 text-center text-sm text-slate-500">Checking admin session…</div>;
    }
    if (!isAuthenticated) {
        return (<div className="max-w-md mx-auto px-4 py-16">
          <form onSubmit={handleAdminLogin} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center"><ShieldCheck className="w-5 h-5"/></div>
              <div><h1 className="text-lg font-semibold text-slate-900">Admin sign in</h1><p className="text-sm text-slate-500">Enter the admin password to manage registrations.</p></div>
            </div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="admin-password">Admin password</label>
            <input id="admin-password" type="password" autoComplete="current-password" required value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            {loginError && <p role="alert" className="text-sm text-red-700">{loginError}</p>}
            <button type="submit" disabled={isLoggingIn} className="w-full rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60">{isLoggingIn ? 'Signing in…' : 'Sign in'}</button>
          </form>
        </div>);
    }
    return (<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Toast Notice */}
      {actionNotice && (<div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 border border-slate-700 sm:max-w-md">
          <CheckCircle className="w-4 h-4 text-emerald-400"/>
          <span>{actionNotice}</span>
        </div>)}

      {/* Admin Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600"/>
              <span>Institutional Administration Control</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight break-words">
              Webinar &amp; Form Management Center
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-normal">
              Customize form fields, college name at the top, UPI parameters, and review student registrations.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-3 w-full lg:w-auto items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
            <button onClick={() => setActiveTab('submissions')} className={`flex min-w-0 items-center justify-center gap-1.5 px-2 sm:px-3.5 py-2 text-[11px] sm:text-xs text-center font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'submissions'
            ? 'bg-white text-slate-900 shadow-2xs'
            : 'text-slate-600 hover:text-slate-900'}`}>
              <Users className="w-3.5 h-3.5 text-indigo-600"/>
              <span>Registrations ({registrations.length})</span>
            </button>

            <button onClick={() => setActiveTab('customizer')} className={`flex min-w-0 items-center justify-center gap-1.5 px-2 sm:px-3.5 py-2 text-[11px] sm:text-xs text-center font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'customizer'
            ? 'bg-white text-slate-900 shadow-2xs'
            : 'text-slate-600 hover:text-slate-900'}`}>
              <Settings className="w-3.5 h-3.5 text-indigo-600"/>
              <span>Form &amp; College Customizer</span>
            </button>

            <button onClick={() => setActiveTab('analytics')} className={`flex min-w-0 items-center justify-center gap-1.5 px-2 sm:px-3.5 py-2 text-[11px] sm:text-xs text-center font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'analytics'
            ? 'bg-white text-slate-900 shadow-2xs'
            : 'text-slate-600 hover:text-slate-900'}`}>
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600"/>
              <span>Live Metrics</span>
            </button>
          </div>
          <button type="button" onClick={handleAdminLogout} className="self-end lg:self-auto text-xs font-semibold text-slate-600 hover:text-red-700 border border-slate-200 rounded-lg px-3 py-2">Sign out</button>
        </div>

        <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-800 mb-1">
              <Share2 className="w-3.5 h-3.5"/>
              <span>Share registration link with students</span>
            </div>
            <div className="flex items-center gap-2 bg-white border border-indigo-200 rounded-lg px-3 py-2">
              <Link2 className="w-3.5 h-3.5 text-indigo-500 shrink-0"/>
              <span className="text-xs font-mono text-slate-800 truncate">{shareLink}</span>
            </div>
            <p className="text-[11px] text-indigo-800/80 mt-1.5 font-normal">
              Copy or share this official registration link with students via WhatsApp, email, or social media.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" onClick={handleCopyShareLink} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer">
              {linkCopied ? <Check className="w-3.5 h-3.5"/> : <Copy className="w-3.5 h-3.5"/>}
              <span>{linkCopied ? 'Copied' : 'Copy link'}</span>
            </button>
            <button type="button" onClick={handleWhatsAppShare} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold cursor-pointer">
              <MessageCircle className="w-3.5 h-3.5"/>
              <span>WhatsApp</span>
            </button>
            <a href={shareLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-indigo-300 bg-white text-indigo-800 text-xs font-semibold hover:bg-indigo-50">
              Open form
            </a>
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
            <span className="text-[10px] font-mono uppercase font-medium text-slate-400">Total Registered</span>
            <div className="text-xl font-semibold text-slate-900 mt-0.5">{totalStudents} Students</div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
            <span className="text-[10px] font-mono uppercase font-medium text-slate-400">Verified Payments</span>
            <div className="text-xl font-semibold text-emerald-700 mt-0.5">{verifiedCount} Verified</div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
            <span className="text-[10px] font-mono uppercase font-medium text-slate-400">Pending Review</span>
            <div className="text-xl font-semibold text-amber-700 mt-0.5">{pendingCount} Pending</div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
            <span className="text-[10px] font-mono uppercase font-medium text-slate-400">Total Fees Collected</span>
            <div className="text-xl font-semibold text-slate-900 mt-0.5">₹{totalRevenue}</div>
          </div>
        </div>
      </div>

      {/* TAB 1: Submissions Table */}
      {activeTab === 'submissions' && (<div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-2xs flex flex-col gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none"/>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by student name, email, phone, UTR or Reg ID..." className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"/>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full min-w-0 text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-3 py-2 text-slate-700 font-medium focus:outline-none">
                <option value="all">All Statuses</option>
                <option value="verified">Verified Only</option>
                <option value="pending">Pending Only</option>
                <option value="rejected">Rejected Only</option>
              </select>

              <select value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)} className="w-full min-w-0 text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-3 py-2 text-slate-700 font-medium focus:outline-none lg:max-w-[180px] truncate">
                <option value="all">All Streams</option>
                {config.availableStreams.map((s) => (<option key={s} value={s}>
                    {s}
                  </option>))}
              </select>

              <select value={collegeFilter} onChange={(e) => setCollegeFilter(e.target.value)} className="w-full min-w-0 text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-3 py-2 text-slate-700 font-medium focus:outline-none lg:max-w-[200px] truncate">
                <option value="all">All Colleges</option>
                {uniqueColleges.map((c) => (<option key={c} value={c}>
                    {c}
                  </option>))}
              </select>

              <button type="button" onClick={handleExportCSV} className="flex items-center justify-center gap-1.5 px-2 sm:px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all min-w-0 shadow-2xs cursor-pointer">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400"/>
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Registrations Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] font-mono tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Reg ID &amp; Date</th>
                    <th className="py-3 px-4">College</th>
                    <th className="py-3 px-4">Student Details</th>
                    <th className="py-3 px-4">Stream &amp; Year</th>
                    <th className="py-3 px-4">Payment &amp; UTR</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRegistrations.length === 0 ? (<tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No registrations found matching your query.
                      </td>
                    </tr>) : (filteredRegistrations.map((reg) => (<tr key={reg.id} className="hover:bg-slate-50/60 transition-colors">
                        
                        {/* Reg ID */}
                        <td className="py-3.5 px-4 font-mono">
                          <span className="font-bold text-slate-900 block">{reg.regNumber}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(reg.registeredAt).toLocaleDateString()}
                          </span>
                        </td>

                        {/* College */}
                        <td className="py-3.5 px-4 max-w-[180px]">
                          <span className="font-medium text-slate-800 block truncate" title={reg.collegeName || 'N/A'}>
                            {reg.collegeName || <span className="text-slate-400 italic">Not tagged</span>}
                          </span>
                        </td>

                        {/* Student Details */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">
                            {[reg.firstName, reg.middleName, reg.lastName].filter(Boolean).join(' ')}
                          </span>
                          <span className="text-slate-500 block text-[11px]">{reg.email}</span>
                          <span className="text-slate-500 block text-[11px]">{reg.phone}</span>
                        </td>

                        {/* Stream */}
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <span className="font-medium text-slate-800 block truncate" title={reg.stream}>
                            {reg.stream}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {reg.year} · {reg.semester}
                          </span>
                          {reg.rollNumber && (<span className="text-[10px] text-slate-400 block font-mono">
                              Roll: {reg.rollNumber}
                            </span>)}
                        </td>

                        {/* Payment */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <span>₹{reg.amount}</span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              via {reg.payerUpiApp || 'UPI'}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 block w-fit mt-0.5">
                            UTR: {reg.utrNumber}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {reg.paymentStatus === 'verified' && (<span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle className="w-3 h-3 text-emerald-600"/>
                              Verified
                            </span>)}
                          {reg.paymentStatus === 'pending' && (<span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600"/>
                              Pending
                            </span>)}
                          {reg.paymentStatus === 'rejected' && (<span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                              <XCircle className="w-3 h-3 text-red-600"/>
                              Rejected
                            </span>)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Pass / Receipt */}
                            <button type="button" onClick={() => setInspectRegistration(reg)} title="Inspect E-Receipt" className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer">
                              <Eye className="w-3.5 h-3.5"/>
                            </button>

                            {/* Resend email */}
                            <button type="button" onClick={() => handleResendEmail(reg.id, reg.email)} title="Resend email receipt" className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors cursor-pointer">
                              <Send className="w-3.5 h-3.5"/>
                            </button>

                            {/* Verify button */}
                            {reg.paymentStatus !== 'verified' && (<button type="button" onClick={() => handleStatusChange(reg.id, 'verified', 'Verified by admin')} title="Approve Payment" className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer">
                                <Check className="w-3.5 h-3.5"/>
                              </button>)}

                            {/* Reject button */}
                            {reg.paymentStatus !== 'rejected' && (<button type="button" onClick={() => handleStatusChange(reg.id, 'rejected', 'UTR not found in bank ledger')} title="Reject Payment" className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors cursor-pointer">
                                <XCircle className="w-3.5 h-3.5"/>
                              </button>)}

                            {/* Delete button */}
                            <button type="button" onClick={() => handleDelete(reg.id, [reg.firstName, reg.middleName, reg.lastName].filter(Boolean).join(' '))} title="Delete registration" className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                        </td>
                      </tr>)))}
                </tbody>
              </table>
            </div>
          </div>
        </div>)}

      {/* TAB 2: Form & College Customizer */}
      {activeTab === 'customizer' && (<form onSubmit={handleSaveConfig} className="space-y-6 max-w-3xl">
          
          {saveNotice && (<div className="bg-emerald-700 text-white px-4 py-3 rounded-xl flex items-center justify-between text-xs font-bold shadow-2xs">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4"/>
                {saveNotice}
              </span>
            </div>)}

          {/* Section 0: Registration Duration & Access Control */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <Timer className="w-5 h-5 text-indigo-600"/>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Registration Duration & Access Control
                </h3>
                <p className="text-xs text-slate-500">
                  Set the time window during which students can register. Form auto-closes after the deadline.
                </p>
              </div>
            </div>

            {/* Toggle: Registration Open / Closed */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Registration Status</span>
                <span className="text-[11px] text-slate-500">
                  {formConfig.registrationOpen !== false ? 'Form is currently accepting submissions' : 'Form is closed — students cannot register'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFormConfig({ ...formConfig, registrationOpen: !formConfig.registrationOpen })}
                className="flex items-center gap-2 cursor-pointer"
              >
                {formConfig.registrationOpen !== false ? (
                  <ToggleRight className="w-8 h-8 text-emerald-600"/>
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-400"/>
                )}
                <span className={`text-xs font-bold ${formConfig.registrationOpen !== false ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formConfig.registrationOpen !== false ? 'OPEN' : 'CLOSED'}
                </span>
              </button>
            </div>

            {/* Start & End Date/Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Registration Opens (Start Date & Time)
                </label>
                <input
                  type="datetime-local"
                  value={formConfig.registrationStartDate || ''}
                  onChange={(e) => setFormConfig({ ...formConfig, registrationStartDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium text-slate-900 bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Leave empty for no start restriction (opens immediately).
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Registration Closes (End Date & Time) <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formConfig.registrationEndDate || ''}
                  onChange={(e) => setFormConfig({ ...formConfig, registrationEndDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium text-slate-900 bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Leave empty for no deadline (stays open indefinitely).
                </span>
              </div>
            </div>

            {/* Live Status Indicator */}
            {(() => {
              const now = new Date();
              const start = formConfig.registrationStartDate ? new Date(formConfig.registrationStartDate) : null;
              const end = formConfig.registrationEndDate ? new Date(formConfig.registrationEndDate) : null;
              const isManuallyClosed = formConfig.registrationOpen === false;
              const isBeforeStart = start && now < start;
              const isAfterEnd = end && now > end;
              const isActive = !isManuallyClosed && !isBeforeStart && !isAfterEnd;

              return (
                <div className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold ${
                  isActive
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}/>
                  {isActive && <span>● Registration is LIVE and accepting students</span>}
                  {isManuallyClosed && <span>● Registration is manually CLOSED by admin</span>}
                  {!isManuallyClosed && isBeforeStart && <span>● Registration has not started yet — opens {start.toLocaleString()}</span>}
                  {!isManuallyClosed && !isBeforeStart && isAfterEnd && <span>● Registration EXPIRED — closed on {end.toLocaleString()}</span>}
                </div>
              );
            })()}
          </div>

          {/* Section 1: College Header on Top of the Form */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <Building2 className="w-5 h-5 text-indigo-600"/>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  College Header Details (Top of the Form)
                </h3>
                <p className="text-xs text-slate-500">
                  Customizes the institution name displayed at the very top of the registration portal.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  College / University Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={formConfig.collegeName} onChange={(e) => setFormConfig({ ...formConfig, collegeName: e.target.value })} placeholder="e.g. Pune Institute of Computer Technology (PICT)" required className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-900"/>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Department / Organizing Cell Subtitle
                </label>
                <input type="text" value={formConfig.collegeSubtitle} onChange={(e) => setFormConfig({ ...formConfig, collegeSubtitle: e.target.value })} placeholder="e.g. Department of Computer Engineering" className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"/>
              </div>
            </div>
          </div>

          {/* Section 2: Webinar Overview */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <Calendar className="w-5 h-5 text-indigo-600"/>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Webinar Details &amp; Schedule (Date &amp; Time)
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  Customize the webinar title, description, event date, and timing.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-700 mb-1.5">
                  Webinar / Program Title <span className="text-red-500">*</span>
                </label>
                <input type="text" value={formConfig.webinarTitle} onChange={(e) => setFormConfig({ ...formConfig, webinarTitle: e.target.value })} required className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium text-slate-900"/>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-700 mb-1.5">
                  Webinar Description / Agenda
                </label>
                <textarea rows={2} value={formConfig.webinarSubtitle} onChange={(e) => setFormConfig({ ...formConfig, webinarSubtitle: e.target.value })} className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800"/>
              </div>

              {/* Event Date (Fully customizable by Admin) */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  Event Date <span className="text-red-500">*</span>
                </label>
                <input type="text" value={formConfig.webinarDate} onChange={(e) => setFormConfig({ ...formConfig, webinarDate: e.target.value })} placeholder="e.g. Saturday, October 24, 2026" required className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium text-slate-900 bg-white"/>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Displayed on the form header and student receipts.
                </span>
              </div>

              {/* Event Timing (Fully customizable by Admin) */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  Event Timing / Schedule <span className="text-red-500">*</span>
                </label>
                <input type="text" value={formConfig.webinarTime} onChange={(e) => setFormConfig({ ...formConfig, webinarTime: e.target.value })} placeholder="e.g. 10:00 AM - 01:30 PM IST" required className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium text-slate-900 bg-white"/>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  e.g. session hours or duration.
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-700 mb-1.5">
                  Top Announcement Banner (Optional)
                </label>
                <input type="text" value={formConfig.bannerNotice} onChange={(e) => setFormConfig({ ...formConfig, bannerNotice: e.target.value })} placeholder="e.g. ⚡ Limited Seats Available · E-Certificates Provided" className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800"/>
              </div>
            </div>
          </div>

          {/* Section 3: Direct UPI Settings */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <QrCode className="w-5 h-5 text-indigo-600"/>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Direct UPI Payment Settings (No Payment Gateway)
                </h3>
                <p className="text-xs text-slate-500">
                  Direct funds to your PhonePe / BHIM merchant terminal with zero commissions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  UPI ID (VPA) <span className="text-red-500">*</span>
                </label>
                <input type="text" value={formConfig.upiId} onChange={(e) => setFormConfig({ ...formConfig, upiId: e.target.value })} placeholder="Q021076100@ybl" required className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"/>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Payee Display Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={formConfig.payeeName} onChange={(e) => setFormConfig({ ...formConfig, payeeName: e.target.value })} placeholder="VedhaAI" required className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"/>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Terminal Reference Text
                </label>
                <input type="text" value={formConfig.upiTerminalText} onChange={(e) => setFormConfig({ ...formConfig, upiTerminalText: e.target.value })} placeholder="Terminal 6-Q021076100" className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"/>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Registration Pass Fee (INR ₹) <span className="text-red-500">*</span>
                </label>
                <input type="number" min="0" value={formConfig.feeAmount} onChange={(e) => setFormConfig({ ...formConfig, feeAmount: Number(e.target.value) })} required className="w-full px-3.5 py-2 text-xs font-black rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"/>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  WhatsApp Community Link (Mandatory Join Target) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MessageCircle className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5 pointer-events-none"/>
                  <input type="url" value={formConfig.whatsappGroupLink} onChange={(e) => setFormConfig({ ...formConfig, whatsappGroupLink: e.target.value })} placeholder="https://chat.whatsapp.com/..." required className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"/>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Academic Streams Customizer */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <BookOpen className="w-5 h-5 text-indigo-600"/>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Customizable Education Streams
                </h3>
                <p className="text-xs text-slate-500">
                  Modify available departments in the student registration dropdown.
                </p>
              </div>
            </div>

            {/* Add Stream Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button type="button" onClick={() => setShowStreamPicker(!showStreamPicker)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0">
                <Plus className="w-3.5 h-3.5"/>
                <span>{showStreamPicker ? 'Close Picker' : 'Add Stream'}</span>
              </button>
              <span className="text-[10px] text-slate-400">Select from predefined departments or type a custom one below.</span>
            </div>

            {/* Predefined Stream Picker Grid */}
            {showStreamPicker && (() => {
              const PREDEFINED_STREAMS = [
                'Computer Engineering (CS/CE)',
                'Computer Science & Engineering (CSE)',
                'Information Technology (IT)',
                'Artificial Intelligence & Data Science (AI & DS)',
                'Artificial Intelligence & Machine Learning (AI & ML)',
                'Data Science (DS)',
                'Cyber Security',
                'Internet of Things (IoT)',
                'Cloud Computing & DevOps',
                'Blockchain Technology',
                'Software Engineering',
                'Electronics & Telecommunication (E&TC)',
                'Electronics & Communication Engineering (ECE)',
                'Electrical Engineering (EE)',
                'Electrical & Electronics Engineering (EEE)',
                'Instrumentation Engineering',
                'Mechanical Engineering',
                'Civil Engineering',
                'Chemical Engineering',
                'Biomedical Engineering',
                'Robotics & Automation',
                'Mechatronics Engineering',
                'Automobile Engineering',
                'Aerospace Engineering',
                'Bachelor of Computer Applications (BCA)',
                'Master of Computer Applications (MCA)',
                'B.Sc Computer Science / IT',
                'M.Sc Computer Science / IT',
                'B.Sc Information Technology',
                'B.Sc Data Science',
                'BBA / MBA (IT Management)',
                'B.Tech / M.Tech (General)',
                'Diploma in Computer Engineering',
                'Diploma in Information Technology',
                'Other / Multidisciplinary'
              ];
              const unaddedStreams = PREDEFINED_STREAMS.filter(s => !formConfig.availableStreams.includes(s));
              return (
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Select Streams to Add</span>
                    {unaddedStreams.length > 0 && (
                      <button type="button" onClick={() => {
                        setFormConfig(prev => ({ ...prev, availableStreams: [...new Set([...prev.availableStreams, ...PREDEFINED_STREAMS])] }));
                      }} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                        + Add All
                      </button>
                    )}
                  </div>
                  {unaddedStreams.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">All predefined streams have been added.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-60 overflow-y-auto">
                      {unaddedStreams.map(s => (
                        <button key={s} type="button" onClick={() => {
                          setFormConfig(prev => ({ ...prev, availableStreams: [...prev.availableStreams, s] }));
                        }} className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg text-xs text-left font-medium text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition-all cursor-pointer">
                          <Plus className="w-3 h-3 text-slate-400 shrink-0"/>
                          <span className="truncate">{s}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Custom Stream Input (Fallback) */}
            <div className="flex items-center gap-2 max-w-md">
              <input type="text" value={newStreamInput} onChange={(e) => setNewStreamInput(e.target.value)} onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddStream();
                }
            }} placeholder="Type custom stream name..." className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"/>
              <button type="button" onClick={handleAddStream} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0">
                <Plus className="w-3.5 h-3.5"/>
                <span>Add Custom</span>
              </button>
            </div>

            {/* Currently Added Streams */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
              {formConfig.availableStreams.map((s) => (<div key={s} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                  <span className="font-semibold text-slate-800 truncate pr-2">{s}</span>
                  <button type="button" onClick={() => handleRemoveStream(s)} className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-emerald-700 font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-600"/>
              <span>Students submit their UPI transaction reference. Verify the payment before sending a receipt.</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2">
            <button type="button" onClick={handleResetDefaults} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer">
              <RotateCcw className="w-4 h-4"/>
              <span>Reset to Defaults</span>
            </button>

            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-75">
              <Save className="w-4 h-4 text-emerald-400"/>
              <span>{isSaving ? 'Persisting to Backend...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>)}

      {/* TAB 3: Analytics */}
      {activeTab === 'analytics' && (<div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Stream Distribution Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Registrations by Academic Stream
              </h3>
              <div className="space-y-3">
                {formConfig.availableStreams.map((s) => {
                const count = registrations.filter((r) => r.stream === s).length;
                const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
                return (<div key={s} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700 truncate pr-2">{s}</span>
                        <span className="font-mono text-slate-500 font-semibold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-slate-900 h-full rounded-full transition-all" style={{ width: `${pct}%` }}/>
                      </div>
                    </div>);
            })}
              </div>
            </div>

            {/* Payment Verification Health */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Payment Verification Health
              </h3>
              <div className="p-4 bg-slate-50 rounded-xl space-y-3 border border-slate-100">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Total Settlement Target:</span>
                  <span className="font-mono font-bold text-slate-900">₹{totalTarget.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Verified Revenue:</span>
                  <span className="font-mono font-bold text-emerald-700">₹{totalRevenue}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Pending Review Amount:</span>
                  <span className="font-mono font-bold text-amber-700">₹{pendingAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">UPI Terminal Address:</span>
                  <span className="font-mono text-slate-800">{formConfig.upiId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>)}

      {/* Inspect E-Receipt Modal */}
      {inspectRegistration && (<SuccessReceiptModal registration={inspectRegistration} config={config} isOpen={true} onClose={() => setInspectRegistration(null)}/>)}

    </div>);
};
