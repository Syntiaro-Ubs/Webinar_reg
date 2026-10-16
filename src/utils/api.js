import { DEFAULT_WEBINAR_CONFIG } from '../data/defaultConfig';
// Helper to interact with the Express backend
export async function fetchBackendConfig() {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Failed to fetch config');
    const json = await res.json();
    return { ...DEFAULT_WEBINAR_CONFIG, ...json.data };
}
export async function fetchAdminSession() {
    const res = await fetch('/api/admin/session', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Could not check admin login');
    const json = await res.json();
    return Boolean(json.data?.authenticated);
}
export async function loginAdmin(password) {
    const res = await fetch('/api/admin/login', {
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
    const res = await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    if (!res.ok) throw new Error('Admin logout failed');
}
export async function saveBackendConfig(config) {
    const res = await fetch('/api/config', {
        method: 'PUT',
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
    const res = await fetch('/api/registrations');
    if (!res.ok) throw new Error('Failed to fetch registrations');
    const json = await res.json();
    return json.data;
}
export async function createBackendRegistration(payload) {
    const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Registration failed');
    return json.data;
}
export async function fetchBackendRegistrationStatus(id) {
    const res = await fetch(`/api/registrations/${encodeURIComponent(id)}/status`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to check payment status');
    return json.data;
}
export async function updateBackendStatus(id, status, notes) {
    try {
        const res = await fetch(`/api/registrations/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, notes })
        });
        if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.error || 'Failed to update registration status');
        }
        const json = await res.json().catch(() => ({}));
        return json.data || { status, emailSent: false };
    }
    catch (err) {
        console.error('Error updating status on backend:', err);
        throw err;
    }
}
export async function deleteBackendRegistration(id) {
    try {
        const res = await fetch(`/api/registrations/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.error || 'Failed to delete registration');
        }
        return true;
    }
    catch (err) {
        console.error('Error deleting registration on backend:', err);
        throw err;
    }
}
export async function resendEmailReceipt(id) {
    try {
        const res = await fetch(`/api/registrations/${id}/resend-email`, {
            method: 'POST'
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(json.error || 'Failed to resend receipt email');
        }
        return true;
    }
    catch (err) {
        console.error('Error resending email:', err);
        return false;
    }
}
export async function downloadReceiptPdf(id, regNumber) {
    try {
        const res = await fetch(`/api/registrations/${id}/receipt`);
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
