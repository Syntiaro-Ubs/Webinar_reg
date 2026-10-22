import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load the project-root .env when running locally.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import express from 'express';
import http from 'http';
import os from 'os';
import crypto from 'crypto';
import {
    initDatabase,
    loadConfig,
    saveConfig,
    loadRegistrations,
    insertRegistration,
    findRegistrationById,
    findRegistrationByCashfreeOrderId,
    updateRegistrationPaymentStatus,
    claimPaymentReceipt,
    markPaymentReceiptSent,
    releasePaymentReceiptClaim,
} from './backend/db.js';
import { sendRegistrationEmail } from './backend/email.js';
import { generateReceiptPdf } from './backend/receipt-pdf.js';
import {
    buildCashfreeOrderMeta,
    getCashfreeConfig,
    verifyCashfreeWebhookSignature,
} from './backend/cashfree-config.js';

// Initial default configuration
const DEFAULT_CONFIG = {
    collegeName: '',
    collegeSubtitle: '',
    collegeLogoUrl: '',
    webinarTitle: '',
    webinarSubtitle: '',
    webinarDate: '',
    webinarTime: '',
    feeAmount: 0,
    upiId: 'Q021076100@ybl',
    payeeName: '',
    upiTerminalText: '',
    whatsappGroupLink: '',
    supportEmail: '',
    supportPhone: '',
    bannerNotice: '',
    registrationOpen: true,
    registrationStartDate: '',
    registrationEndDate: '',
    availableStreams: [],
    availableYears: [
        '1st Year',
        '2nd Year',
        '3rd Year',
        '4th Year',
        'Post Graduate'
    ],
    availableSemesters: [
        'Semester 1',
        'Semester 2',
        'Semester 3',
        'Semester 4',
        'Semester 5',
        'Semester 6',
        'Semester 7',
        'Semester 8'
    ]
};
const INITIAL_REGISTRATIONS = [];
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const adminSessions = new Map();
const adminLoginAttempts = new Map();
const CASHFREE_API_VERSION = '2025-01-01';
let activeCashfreeConfig;

async function requestCashfree(pathname, options = {}) {
    const settings = activeCashfreeConfig;
    if (!settings) throw new Error('Cashfree configuration was not initialized.');
    const response = await fetch(`${settings.apiBase}${pathname}`, {
        ...options,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'x-api-version': CASHFREE_API_VERSION,
            'x-client-id': settings.appId,
            'x-client-secret': settings.secretKey,
            ...options.headers,
        },
    });
    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) {
        const detail = responseBody.message || responseBody.type || `HTTP ${response.status}`;
        throw new Error(`Cashfree API request failed: ${detail}`);
    }
    return responseBody;
}

function getCookie(req, name) {
    const cookies = req.headers.cookie || '';
    const item = cookies.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
    return item ? decodeURIComponent(item.slice(name.length + 1)) : '';
}

function hasAdminSession(req) {
    const token = getCookie(req, 'webinar_admin_session');
    const expiresAt = token ? adminSessions.get(token) : 0;
    if (!expiresAt) return false;
    if (expiresAt <= Date.now()) {
        adminSessions.delete(token);
        return false;
    }
    return true;
}

function requireAdmin(req, res, next) {
    res.set('Cache-Control', 'no-store');
    if (!hasAdminSession(req)) {
        return res.status(401).json({ success: false, error: 'Admin login required' });
    }
    next();
}

function passwordsMatch(provided, expected) {
    const providedHash = crypto.createHash('sha256').update(provided).digest();
    const expectedHash = crypto.createHash('sha256').update(expected).digest();
    return crypto.timingSafeEqual(providedHash, expectedHash);
}

async function startServer() {
    if (process.env.NODE_ENV === 'production' && (
        !process.env.ADMIN_USERNAME?.trim()
        || !process.env.ADMIN_PASSWORD?.trim()
        || process.env.ADMIN_PASSWORD.trim().length < 10
    )) {
        console.error('Production startup requires ADMIN_USERNAME and ADMIN_PASSWORD with at least 10 characters.');
        process.exit(1);
    }
    activeCashfreeConfig = getCashfreeConfig();
    if (activeCashfreeConfig.modeWasDefaulted) {
        console.warn('Invalid CASHFREE_ENV; defaulting to sandbox. Set it to sandbox or production explicitly.');
    }
    console.log(activeCashfreeConfig.environment === 'sandbox'
        ? '[Cashfree] TEST MODE: sandbox payments are enabled.'
        : '[Cashfree] LIVE MODE: production payments are enabled.');
    try {
        await initDatabase({
            defaultConfig: DEFAULT_CONFIG,
            initialRegistrations: INITIAL_REGISTRATIONS,
        });
    }
    catch (err) {
        console.error('Failed to connect to MySQL. Check DB_HOST / DB_USER / DB_PASSWORD in .env');
        console.error(err.message);
        process.exit(1);
    }
    const app = express();
    const httpServer = http.createServer(app);
    const PORT = process.env.PORT || 3000;
    if (!Number.isInteger(Number(PORT)) || Number(PORT) < 1 || Number(PORT) > 65535) {
        throw new Error(`Invalid PORT value: ${process.env.PORT}`);
    }
    const apiOnly = process.argv.includes('--api-only');
    const standaloneFrontend = apiOnly;
    const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || (standaloneFrontend ? 5173 : PORT));
    function lanStudentUrls() {
        const ips = [];
        for (const addrs of Object.values(os.networkInterfaces())) {
            for (const net of addrs || []) {
                const isV4 = net.family === 'IPv4' || net.family === 4;
                if (!isV4 || net.internal) continue;
                const ip = net.address;
                if (ip.startsWith('169.254.')) continue;
                ips.push(ip);
            }
        }
        ips.sort((a, b) => Number(b.startsWith('192.168.')) - Number(a.startsWith('192.168.')));
        return ips.map((ip) => `http://${ip}:${FRONTEND_PORT}/register`);
    }
    function getStudentShareLinks(req) {
        const lanUrls = lanStudentUrls();
        const configuredAppUrl = process.env.APP_URL ? process.env.APP_URL.trim().replace(/\/+$/, '') : '';
        const isProduction = process.env.NODE_ENV === 'production';
        const baseAppUrl = isProduction ? configuredAppUrl : '';
        const hostUrl = req ? `${req.protocol}://${req.get('host')}` : '';
        let developmentOrigin = `http://localhost:${FRONTEND_PORT}`;
        if (!isProduction && hostUrl) {
            const url = new URL(hostUrl);
            url.port = String(FRONTEND_PORT);
            developmentOrigin = url.origin;
        }
        const publicOrigin = baseAppUrl || (isProduction ? hostUrl : '');
        const primaryUrl = `${publicOrigin || developmentOrigin}/register`;
        return {
            studentUrl: primaryUrl,
            publicUrl: publicOrigin ? `${publicOrigin}/register` : '',
            localUrl: `http://localhost:${FRONTEND_PORT}/register`,
            lanUrls,
        };
    }
    app.use(express.json({
        limit: '1mb',
        verify: (req, res, buffer) => {
            if (req.originalUrl.split('?')[0] === '/api/webhooks/cashfree') {
                req.rawBody = buffer.toString('utf8');
            }
        },
    }));
    // ================= API ROUTES =================
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok' });
    });

    // Keep configuration diagnostics available only during local development.
    app.get('/api/check-env', (req, res) => {
        if (process.env.NODE_ENV !== 'development') {
            return res.sendStatus(404);
        }
        res.json({
            success: true,
            data: {
                nodeEnv: process.env.NODE_ENV || 'not set',
                appUrl: process.env.APP_URL || 'not set',
                dbHost: process.env.DB_HOST || 'not set',
                smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
            }
        });
    });
    if (apiOnly) {
        app.get('/', (req, res) => {
            res.json({ success: true, message: 'Webinar registration API is running', health: '/api/health' });
        });
    }
    app.get('/api/health', (req, res) => {
        res.json({ success: true, data: { status: 'ok', database: process.env.DB_NAME || 'webinar_reg' } });
    });
    app.get('/api/share-link', (req, res) => {
        res.json({ success: true, data: getStudentShareLinks(req) });
    });
    app.get('/config', (req, res) => {
        res.status(200).json({
            status: 'ok',
            apiUrl: '/',
        });
    });
    app.post('/api/admin/login', (req, res) => {
        const configuredUsername =
            typeof process.env.ADMIN_USERNAME === 'string'
                ? process.env.ADMIN_USERNAME.trim().toLowerCase()
                : '';
        const configuredPassword =
            typeof process.env.ADMIN_PASSWORD === 'string'
                ? process.env.ADMIN_PASSWORD.trim()
                : '';
        if (!configuredUsername || configuredPassword.length < 10) {
            console.error('[Admin Login] ADMIN_USERNAME or ADMIN_PASSWORD is not configured correctly');
            return res.status(503).json({ success: false, error: 'Admin login is not configured.' });
        }
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const attempt = adminLoginAttempts.get(ip);
        if (attempt && now - attempt.startedAt < 15 * 60 * 1000 && attempt.count >= 10) {
            console.warn(`[Admin Login] Rate limit exceeded for IP: ${ip}`);
            return res.status(429).json({ success: false, error: 'Too many login attempts. Try again in 15 minutes.' });
        }
        const providedUsername = typeof req.body?.username === 'string'
            ? req.body.username.trim().toLowerCase()
            : '';
        const providedPassword = typeof req.body?.password === 'string'
            ? req.body.password
            : '';
        const usernameMatches = passwordsMatch(providedUsername, configuredUsername);
        const passwordMatches = passwordsMatch(providedPassword, configuredPassword);
        if (!(usernameMatches && passwordMatches)) {
            const next = attempt && now - attempt.startedAt < 15 * 60 * 1000
                ? { startedAt: attempt.startedAt, count: attempt.count + 1 }
                : { startedAt: now, count: 1 };
            adminLoginAttempts.set(ip, next);
            console.warn(`[Admin Login] Failed login attempt from IP: ${ip} (attempt ${next.count}/10)`);
            return res.status(401).json({ success: false, error: 'Invalid username or password.' });
        }
        adminLoginAttempts.delete(ip);
        for (const [token, expiresAt] of adminSessions) {
            if (expiresAt <= now) adminSessions.delete(token);
        }
        const token = crypto.randomBytes(32).toString('hex');
        adminSessions.set(token, now + ADMIN_SESSION_TTL_MS);
        const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
        res.set('Cache-Control', 'no-store');
        res.set('Set-Cookie', `webinar_admin_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(ADMIN_SESSION_TTL_MS / 1000)}${secure}`);
        console.log(`[Admin Login] Successful login from IP: ${ip}`);
        res.json({ success: true, data: { authenticated: true } });
    });
    app.get('/api/admin/session', (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.json({ success: true, data: { authenticated: hasAdminSession(req) } });
    });
    app.post('/api/admin/logout', (req, res) => {
        const token = getCookie(req, 'webinar_admin_session');
        if (token) adminSessions.delete(token);
        const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
        res.set('Cache-Control', 'no-store');
        res.set('Set-Cookie', `webinar_admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
        res.json({ success: true });
    });
    // Dynamic application configuration used by the frontend.
    const sendPublicConfig = async (req, res) => {
        try {
            const config = await loadConfig();
            res.status(200).json({ success: true, data: config, apiUrl: '/', status: 'ok' });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    };
    app.get('/api/config', sendPublicConfig);
    // 2. PUT /api/config (Admin updates form & college details)
    app.put('/api/config', requireAdmin, async (req, res) => {
        try {
            const incoming = req.body;
            if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
                return res.status(400).json({ success: false, error: 'Configuration must be a JSON object' });
            }
            if (incoming.feeAmount !== undefined && (!Number.isFinite(Number(incoming.feeAmount)) || Number(incoming.feeAmount) < 0)) {
                return res.status(400).json({ success: false, error: 'Fee must be a non-negative number' });
            }
            for (const key of ['availableStreams', 'availableYears', 'availableSemesters']) {
                if (incoming[key] !== undefined && (!Array.isArray(incoming[key]) || incoming[key].some((value) => typeof value !== 'string'))) {
                    return res.status(400).json({ success: false, error: `${key} must be a list of text values` });
                }
            }
            for (const key of ['registrationOpen']) {
                if (incoming[key] !== undefined && typeof incoming[key] !== 'boolean') {
                    return res.status(400).json({ success: false, error: `${key} must be true or false` });
                }
            }
            const current = await loadConfig();
            const updated = { ...current, ...incoming, feeAmount: incoming.feeAmount === undefined ? current.feeAmount : Number(incoming.feeAmount) };
            await saveConfig(updated);
            res.json({ success: true, data: updated, message: 'Configuration saved successfully' });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    // 3. GET /api/registrations
    app.get('/api/registrations', requireAdmin, async (req, res) => {
        try {
            const regs = await loadRegistrations();
            res.json({ success: true, data: regs });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    const confirmCashfreePayment = async (orderId) => {
        const registration = await findRegistrationByCashfreeOrderId(orderId);
        if (!registration) throw Object.assign(new Error('Cashfree order is not linked to a registration.'), { status: 404 });

        const payments = await requestCashfree(`/orders/${encodeURIComponent(orderId)}/payments`, { method: 'GET' });
        const successfulPayment = Array.isArray(payments)
            ? payments.find((payment) => payment.payment_status === 'SUCCESS')
            : null;
        if (!successfulPayment) return { verified: false, registration };

        const paidCents = Math.round(Number(successfulPayment.payment_amount) * 100);
        const expectedCents = Math.round(Number(registration.amount) * 100);
        if (successfulPayment.payment_currency !== 'INR' || paidCents !== expectedCents) {
            throw new Error('Cashfree payment amount or currency does not match this registration.');
        }

        await updateRegistrationPaymentStatus(registration.id, 'verified');
        registration.paymentStatus = 'verified';
        registration.payerUpiApp = 'Cashfree';

        let receiptError = '';
        if (!registration.paymentReceiptSent) {
            const claimed = await claimPaymentReceipt(registration.id);
            if (claimed) {
                try {
                    const config = await loadConfig();
                    await sendRegistrationEmail(registration, config);
                    await markPaymentReceiptSent(registration.id);
                    registration.paymentReceiptSent = true;
                }
                catch (emailError) {
                    await releasePaymentReceiptClaim(registration.id);
                    console.error(`[Email] Cashfree payment receipt failed for ${registration.email}:`, emailError.message);
                    receiptError = 'Payment was confirmed, but the receipt email could not be sent yet.';
                }
            }
        }
        return { verified: true, registration, receiptError };
    };

    // Cashfree calls this signed endpoint after payment events. Browser redirects are verified separately below.
    app.post('/api/webhooks/cashfree', async (req, res) => {
        try {
            const settings = activeCashfreeConfig;
            const signature = req.get('x-webhook-signature') || '';
            const timestamp = req.get('x-webhook-timestamp') || '';
            const rawBody = req.rawBody;
            if (!signature || !timestamp || !rawBody) {
                return res.status(400).json({ success: false, error: 'Missing Cashfree webhook signature data.' });
            }
            if (!verifyCashfreeWebhookSignature(settings, { signature, timestamp, rawBody })) {
                return res.status(401).json({ success: false, error: 'Invalid Cashfree webhook signature.' });
            }

            const event = req.body;
            if (event?.type === 'PAYMENT_SUCCESS_WEBHOOK' && event?.data?.payment?.payment_status === 'SUCCESS') {
                const orderId = event?.data?.order?.order_id;
                if (!orderId) return res.status(400).json({ success: false, error: 'Webhook has no order id.' });
                const result = await confirmCashfreePayment(orderId);
                if (result.receiptError) {
                    return res.status(500).json({ success: false, error: 'Payment is confirmed, but the receipt email is pending.' });
                }
            }
            return res.status(200).json({ success: true });
        }
        catch (err) {
            console.error('[Cashfree] Webhook processing failed:', err.message);
            return res.status(err.status || 500).json({ success: false, error: 'Cashfree payment event could not be processed.' });
        }
    });

    // Called when the student returns from checkout. Payment is confirmed with Cashfree's API.
    app.get('/api/payments/cashfree/:orderId/status', async (req, res) => {
        try {
            const result = await confirmCashfreePayment(req.params.orderId);
            res.set('Cache-Control', 'no-store');
            res.json({
                success: true,
                data: {
                    paymentStatus: result.verified ? 'verified' : 'pending',
                    paymentReceiptSent: result.registration.paymentReceiptSent,
                    regNumber: result.registration.regNumber,
                },
            });
        }
        catch (err) {
            console.error('[Cashfree] Status verification failed:', err.message);
            res.status(err.status || 502).json({ success: false, error: err.message });
        }
    });

    // Create a Cashfree order for a new student registration.
    app.post('/api/registrations', async (req, res) => {
        try {
            const { firstName, middleName, lastName, email, phone, dob, gender, stream, year, semester, rollNumber } = req.body;
            // Check registration time window
            const configCheck = await loadConfig();
            const now = new Date();
            if (configCheck.registrationOpen === false) {
                return res.status(403).json({ success: false, error: 'Registration is currently closed by the administrator.' });
            }
            if (configCheck.registrationStartDate && new Date(configCheck.registrationStartDate) > now) {
                return res.status(403).json({ success: false, error: `Registration has not started yet. It opens on ${new Date(configCheck.registrationStartDate).toLocaleString()}.` });
            }
            if (configCheck.registrationEndDate && new Date(configCheck.registrationEndDate) < now) {
                return res.status(403).json({ success: false, error: `Registration deadline has passed. It closed on ${new Date(configCheck.registrationEndDate).toLocaleString()}.` });
            }
            if (typeof firstName !== 'string' || !firstName.trim() || typeof lastName !== 'string' || !lastName.trim()) {
                return res.status(400).json({ success: false, error: 'First and Last name are required' });
            }
            if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                return res.status(400).json({ success: false, error: 'A valid email address is required' });
            }
            if (typeof phone !== 'string' || phone.replace(/\D/g, '').length < 10) {
                return res.status(400).json({ success: false, error: 'A valid phone number is required' });
            }
            if (typeof dob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(`${dob}T00:00:00Z`)) || dob > now.toISOString().slice(0, 10)) {
                return res.status(400).json({ success: false, error: 'Enter a valid date of birth that is not in the future' });
            }
            if (!Array.isArray(configCheck.availableStreams) || !configCheck.availableStreams.includes(stream)) {
                return res.status(400).json({ success: false, error: 'Select a valid stream from the current registration options' });
            }
            if (!configCheck.availableYears?.includes(year) || !configCheck.availableSemesters?.includes(semester)) {
                return res.status(400).json({ success: false, error: 'Select a valid academic year and semester from the current options' });
            }
            const config = configCheck;
            const amount = Math.round(Number(config.feeAmount) * 100) / 100;
            if (!Number.isFinite(amount) || amount < 1) {
                return res.status(400).json({ success: false, error: 'The registration fee must be at least ₹1 to accept Cashfree payments.' });
            }
            const settings = activeCashfreeConfig;
            const timestamp = new Date().toISOString();
            const regNumber = `REG-${new Date().getFullYear()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
            const id = crypto.randomUUID();
            const cashfreeOrderId = `CF_${crypto.randomBytes(12).toString('hex')}`;
            const customerPhone = phone.replace(/\D/g, '').slice(-10);
            const cashfreeOrder = await requestCashfree('/orders', {
                method: 'POST',
                body: JSON.stringify({
                    order_id: cashfreeOrderId,
                    order_amount: amount,
                    order_currency: 'INR',
                    customer_details: {
                        customer_id: id,
                        customer_name: [firstName.trim(), middleName?.trim(), lastName.trim()].filter(Boolean).join(' ').slice(0, 100),
                        customer_email: email.trim().toLowerCase(),
                        customer_phone: customerPhone,
                    },
                    order_meta: buildCashfreeOrderMeta(settings),
                    order_note: `Registration for ${(config.webinarTitle || 'webinar').slice(0, 100)}`,
                }),
            });
            if (!cashfreeOrder.payment_session_id) {
                throw new Error('Cashfree did not return a payment session.');
            }
            const newRegistration = {
                id,
                regNumber,
                collegeName: config.collegeName || '',
                firstName: firstName.trim(),
                middleName: typeof middleName === 'string' ? middleName.trim() : '',
                lastName: lastName.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                dob: dob || '',
                gender: gender || 'Male',
                stream,
                year,
                semester,
                rollNumber: typeof rollNumber === 'string' && rollNumber.trim() ? rollNumber.trim() : undefined,
                amount,
                upiIdPaidTo: config.upiId || '',
                utrNumber: '',
                cashfreeOrderId,
                payerUpiApp: 'Cashfree',
                paymentStatus: 'pending',
                registeredAt: timestamp,
                emailSent: false,
                paymentReceiptSent: false,
                notes: 'Awaiting Cashfree payment confirmation.'
            };
            await insertRegistration(newRegistration);
            res.status(201).json({
                success: true,
                data: {
                    registration: newRegistration,
                    paymentSessionId: cashfreeOrder.payment_session_id,
                    cashfreeMode: settings.environment,
                },
                message: 'Registration created. Complete payment in Cashfree checkout to confirm your seat.'
            });
        }
        catch (err) {
            console.error('[Cashfree] Could not create checkout order:', err.message);
            const isConfigurationError = /Missing Cashfree .*credentials|CASHFREE_ENV|CASHFREE_(?:TEST|LIVE)_|APP_URL/i.test(err.message);
            const isDevelopment = process.env.NODE_ENV !== 'production';
            res.status(isConfigurationError ? 503 : 502).json({
                success: false,
                error: isConfigurationError || isDevelopment
                    ? err.message
                    : 'Could not start Cashfree checkout. Please try again or contact support.',
            });
        }
    });
    // 5. GET /api/registrations/:id/receipt — Download PDF receipt
    app.get('/api/registrations/:id/receipt', async (req, res) => {
        try {
            const { id } = req.params;
            const student = await findRegistrationById(id);
            if (!student) {
                return res.status(404).json({ success: false, error: 'Student not found' });
            }
            const config = await loadConfig();
            const pdfBuffer = await generateReceiptPdf(student, config);
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Receipt_${student.regNumber}.pdf"`,
                'Content-Length': pdfBuffer.length,
            });
            res.send(pdfBuffer);
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    // 6. GET /api/stats
    app.get('/api/stats', requireAdmin, async (req, res) => {
        try {
            const regs = await loadRegistrations();
            const total = regs.length;
            const verified = regs.filter((r) => r.paymentStatus === 'verified').length;
            const pending = regs.filter((r) => r.paymentStatus === 'pending').length;
            const revenue = regs
                .filter((r) => r.paymentStatus === 'verified')
                .reduce((sum, r) => sum + (r.amount || 0), 0);
            const streamBreakdown = {};
            regs.forEach((r) => {
                streamBreakdown[r.stream] = (streamBreakdown[r.stream] || 0) + 1;
            });
            res.json({
                success: true,
                data: {
                    total,
                    verified,
                    pending,
                    revenue,
                    streamBreakdown
                }
            });
        }
        catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });
    // ================= FRONTEND MIDDLEWARE =================
    // Use --api-only to run the backend separately from the standalone Vite dev server.
    if (!apiOnly && process.env.NODE_ENV !== 'production') {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
            root: __dirname,
            server: {
                middlewareMode: true,
                allowedHosts: true,
                hmr: { server: httpServer },
            },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    }
    else if (!apiOnly) {
        app.use(express.static(path.resolve(__dirname, 'dist')));
        app.get('*', (req, res) => {
            res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
        });
    }
    const useViteHttpServer = !apiOnly && process.env.NODE_ENV !== 'production';
    await new Promise((resolve, reject) => {
        const onError = (err) => reject(err);
        const onListening = () => {
            listener.off('error', onError);
            resolve();
        };
        let listener;
        if (useViteHttpServer) {
            listener = httpServer;
            listener.once('error', onError);
            listener.listen(PORT, '0.0.0.0', onListening);
        }
        else {
            listener = app.listen(PORT, '0.0.0.0', onListening);
            listener.once('error', onError);
        }
    });
    const links = getStudentShareLinks();
    console.log(`Server running at http://localhost:${PORT}`);
    if (process.env.NODE_ENV === 'production' && process.env.APP_URL) {
        console.log(`Live deployed URL: ${process.env.APP_URL}`);
    }
    console.log(`Student registration link: ${links.studentUrl}`);
    console.log(`Admin console: http://localhost:${PORT}/admin`);
}
startServer().catch((err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${process.env.PORT || 3000} is already in use. Stop the existing server or set PORT to a free port in .env.`);
    } else {
        console.error('Backend failed to start:', err.message);
    }
    process.exit(1);
});
