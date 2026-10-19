import crypto from 'node:crypto';
import { isIP } from 'node:net';

const CASHFREE_API_BASES = Object.freeze({
  sandbox: 'https://sandbox.cashfree.com/pg',
  production: 'https://api.cashfree.com/pg',
});

function isPrivateIpv4(address) {
  const [first, second, third] = address.split('.').map(Number);
  return first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 192 && second === 0 && third === 2)
    || (first === 192 && second === 0 && third === 0)
    || (first === 198 && (second === 18 || second === 19))
    || (first === 198 && second === 51 && third === 100)
    || (first === 203 && second === 0 && third === 113)
    || first >= 224;
}

function isPrivateIpv6(address) {
  const normalized = address.toLowerCase();
  const isGlobalUnicast = normalized.startsWith('2') || normalized.startsWith('3');
  return !isGlobalUnicast || /^2001:db8(?::|$)/.test(normalized);
}

function isLocalHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return host === 'localhost'
    || host.endsWith('.localhost')
    || host.endsWith('.local')
    || host.endsWith('.internal')
    || host.endsWith('.lan')
    || host.endsWith('.home.arpa')
    || host.endsWith('.test')
    || host.endsWith('.invalid')
    || host.endsWith('.example');
}

function isPublicHostname(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '');
  const family = isIP(host);
  if (family === 4) return !isPrivateIpv4(host);
  if (family === 6) return !isPrivateIpv6(host);
  return !isLocalHostname(host) && host.includes('.');
}

function parseAppUrl(value, environment) {
  const rawUrl = typeof value === 'string' ? value.trim() : '';
  if (!rawUrl) {
    throw new Error('Set APP_URL to the browser-facing application origin. Sandbox can use http://localhost:3000.');
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('APP_URL must be a valid absolute http or https origin.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)
    || parsed.username
    || parsed.password
    || !['', '/'].includes(parsed.pathname)
    || parsed.search
    || parsed.hash) {
    throw new Error('APP_URL must be an http or https origin without credentials, a path, query, or fragment.');
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  const addressFamily = isIP(hostname);
  const isPrivateAddress = addressFamily === 4
    ? isPrivateIpv4(hostname)
    : addressFamily === 6 && isPrivateIpv6(hostname);

  if (environment === 'production'
    && (parsed.protocol !== 'https:' || isPrivateAddress || isLocalHostname(hostname) || !isPublicHostname(hostname))) {
    throw new Error('Production requires APP_URL to be a public HTTPS origin with no localhost or private IP address. Set CASHFREE_ENV=sandbox for local HTTP testing.');
  }

  return {
    origin: parsed.origin.replace(/\/+$/, ''),
    publicHttps: parsed.protocol === 'https:' && !isPrivateAddress && !isLocalHostname(hostname) && isPublicHostname(hostname),
  };
}

export function getCashfreeConfig(env = process.env) {
  const requestedMode = typeof env.CASHFREE_ENV === 'string' ? env.CASHFREE_ENV.trim().toLowerCase() : '';
  const validMode = requestedMode === 'sandbox' || requestedMode === 'production';
  const environment = requestedMode === 'production' ? 'production' : 'sandbox';
  const appIdVariable = environment === 'sandbox' ? 'CASHFREE_TEST_APP_ID' : 'CASHFREE_LIVE_APP_ID';
  const secretVariable = environment === 'sandbox' ? 'CASHFREE_TEST_SECRET_KEY' : 'CASHFREE_LIVE_SECRET_KEY';
  const appId = typeof env[appIdVariable] === 'string' ? env[appIdVariable].trim() : '';
  const secretKey = typeof env[secretVariable] === 'string' ? env[secretVariable].trim() : '';
  const missingVariables = [];
  if (!appId) missingVariables.push(appIdVariable);
  if (!secretKey) missingVariables.push(secretVariable);
  if (missingVariables.length) {
    throw new Error(`Missing Cashfree ${environment} credentials. Set ${missingVariables.join(' and ')} on the server.`);
  }

  const appUrl = parseAppUrl(env.APP_URL, environment);
  return Object.freeze({
    environment,
    modeWasDefaulted: Boolean(requestedMode) && !validMode,
    appId,
    secretKey,
    apiBase: CASHFREE_API_BASES[environment],
    appUrl: appUrl.origin,
    notifyUrl: appUrl.publicHttps ? `${appUrl.origin}/api/webhooks/cashfree` : '',
  });
}

export function buildCashfreeOrderMeta(config) {
  const orderMeta = {
    return_url: `${config.appUrl}/register?order_id={order_id}`,
  };
  if (config.notifyUrl) orderMeta.notify_url = config.notifyUrl;
  return orderMeta;
}

export function verifyCashfreeWebhookSignature(config, { signature, timestamp, rawBody }) {
  if (typeof signature !== 'string' || typeof timestamp !== 'string' || typeof rawBody !== 'string') {
    return false;
  }
  const expected = crypto.createHmac('sha256', config.secretKey).update(timestamp + rawBody).digest('base64');
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);
  return expectedBuffer.length === receivedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
