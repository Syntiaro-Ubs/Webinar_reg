import { DEFAULT_WEBINAR_CONFIG } from '../data/defaultConfig';
import { INITIAL_REGISTRATIONS } from '../data/sampleRegistrations';
const CONFIG_KEY = 'webinar_portal_config_v1';
const REGISTRATIONS_KEY = 'webinar_portal_registrations_v1';
export function getStoredConfig() {
    try {
        const item = localStorage.getItem(CONFIG_KEY);
        if (!item)
            return DEFAULT_WEBINAR_CONFIG;
        const parsed = JSON.parse(item);
        return { ...DEFAULT_WEBINAR_CONFIG, ...parsed };
    }
    catch (err) {
        console.error('Failed to parse config from localStorage', err);
        return DEFAULT_WEBINAR_CONFIG;
    }
}
export function saveStoredConfig(config) {
    try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }
    catch (err) {
        console.error('Failed to save config to localStorage', err);
    }
}
export function getStoredRegistrations() {
    try {
        const item = localStorage.getItem(REGISTRATIONS_KEY);
        if (!item) {
            saveStoredRegistrations(INITIAL_REGISTRATIONS);
            return INITIAL_REGISTRATIONS;
        }
        return JSON.parse(item);
    }
    catch (err) {
        console.error('Failed to parse registrations from localStorage', err);
        return INITIAL_REGISTRATIONS;
    }
}
export function saveStoredRegistrations(registrations) {
    try {
        localStorage.setItem(REGISTRATIONS_KEY, JSON.stringify(registrations));
    }
    catch (err) {
        console.error('Failed to save registrations to localStorage', err);
    }
}
export function addRegistration(reg) {
    const existing = getStoredRegistrations();
    const updated = [reg, ...existing];
    saveStoredRegistrations(updated);
    return updated;
}
export function updateRegistrationStatus(id, status, notes) {
    const existing = getStoredRegistrations();
    const updated = existing.map(item => {
        if (item.id === id) {
            return {
                ...item,
                paymentStatus: status,
                notes: notes !== undefined ? notes : item.notes
            };
        }
        return item;
    });
    saveStoredRegistrations(updated);
    return updated;
}
export function generateRegistrationNumber() {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `REG-2026-${randomDigits}`;
}
