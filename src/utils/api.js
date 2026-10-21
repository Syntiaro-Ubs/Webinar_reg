import { DEFAULT_WEBINAR_CONFIG } from '../data/defaultConfig';

// Leave this empty in local development so Vite can proxy requests to the local API.
// Production builds use VITE_API_URL, for example https://webinarenrollment.vedhaai.in.
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export const apiUrl = (path) => `${API_URL}${path}`;

// Helper to interact with the Express backend
export async function fetchBackendConfig() {
    const res = await fetch(apiUrl('/api/config'));
    if (!res.ok) throw new Error('Failed to fetch config');
    const json = await res.json();
    return { ...DEFAULT_WEBINAR_CONFIG, ...json.data };
}
export async function fetchAdminSession() {
    const res = await fetch(apiUrl('/api/admin/session'), { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Could not check admin login');
    const json = await res.json();
    return Boolean(json.data?.authenticated);
}
export async function loginAdmin(password) {
    const res = await fetch(apiUrl('/api/admin/login'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Admin login failed');
    return true;
}
export async function logoutAdmin() {
    const res = await fetch(apiUrl('/api/admin/logout'), { method: 'POST', credentials: 'same-origin' });
    if (!res.ok) throw new Error('Admin logout failed');
}
export async function saveBackendConfig(config) {
    const res = await fetch(apiUrl('/api/config'), {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
    if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to save config');
    }
    return true;
}
export async function fetchBackendRegistrations() {
    const res = await fetch(apiUrl('/api/registrations'), {
        credentials: 'same-origin'
    });
    if (!res.ok) throw new Error('Failed to fetch registrations');
    const json = await res.json();
    return json.data;
}
export async function getCashfreePaymentStatus(orderId) {
    const res = await fetch(apiUrl(`/api/payments/cashfree/${encodeURIComponent(orderId)}/status`), {
        cache: 'no-store'
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Could not check Cashfree payment status');
    return json;
}
export async function createBackendRegistration(payload) {
    const res = await fetch(apiUrl('/api/registrations'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Registration failed');
    return json.data;
}
export async function downloadReceiptPdf(id, regNumber) {
    try {
        const res = await fetch(apiUrl(`/api/registrations/${id}/receipt`));
        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || 'Failed to download receipt PDF');
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Receipt_${regNumber || 'download'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    }
    catch (err) {
        console.error('Error downloading receipt PDF:', err);
        return false;
    }
}
