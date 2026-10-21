import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;
const SESSION_COOKIE = "webinar_admin_session";

function getCookie(req, name) {
  const cookies = req.headers.cookie || "";
  const item = cookies
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}

export async function createAdminAuth({ findAdminByUsername, logger = console, isProduction = () => process.env.NODE_ENV === "production" }) {
  const sessions = new Map();
  const loginAttempts = new Map();
  const dummyPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

  function hasAdminSession(req) {
    const token = getCookie(req, SESSION_COOKIE);
    const expiresAt = token ? sessions.get(token) : 0;
    if (!expiresAt) return false;
    if (expiresAt <= Date.now()) {
      sessions.delete(token);
      return false;
    }
    return true;
  }

  function requireAdmin(req, res, next) {
    res.set("Cache-Control", "no-store");
    if (!hasAdminSession(req)) {
      return res.status(401).json({ success: false, error: "Admin login required" });
    }
    next();
  }

  async function login(req, res) {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    for (const [attemptIp, attempt] of loginAttempts) {
      if (now - attempt.startedAt >= LOGIN_WINDOW_MS) loginAttempts.delete(attemptIp);
    }
    const attempt = loginAttempts.get(ip);
    if (attempt && attempt.count >= MAX_LOGIN_ATTEMPTS) {
      logger.warn(`[Admin Login] Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({ success: false, error: "Too many login attempts. Try again in 15 minutes." });
    }

    const username = typeof req.body?.username === "string"
      ? req.body.username.trim().toLowerCase()
      : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    try {
      const admin = /^[a-z0-9._-]{3,191}$/.test(username)
        ? await findAdminByUsername(username)
        : null;
      const storedHash = admin?.password_hash || dummyPasswordHash;
      const passwordMatches = await bcrypt.compare(password, storedHash);
      const passwordTruncated = bcrypt.truncates(password);

      if (!admin || !passwordMatches || passwordTruncated) {
        const next = attempt
          ? { startedAt: attempt.startedAt, count: attempt.count + 1 }
          : { startedAt: now, count: 1 };
        loginAttempts.set(ip, next);
        logger.warn(`[Admin Login] Failed login attempt from IP: ${ip} (attempt ${next.count}/${MAX_LOGIN_ATTEMPTS})`);
        return res.status(401).json({ success: false, error: "Invalid username or password." });
      }

      loginAttempts.delete(ip);
      for (const [token, expiresAt] of sessions) {
        if (expiresAt <= now) sessions.delete(token);
      }
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, now + SESSION_TTL_MS);
      const secure = isProduction() ? "; Secure" : "";
      res.set("Cache-Control", "no-store");
      res.set("Set-Cookie", `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`);
      logger.log(`[Admin Login] Successful login from IP: ${ip}`);
      return res.json({ success: true, data: { authenticated: true } });
    } catch (error) {
      logger.error(`[Admin Login] Authentication lookup failed (${error.code || "unknown error"}).`);
      return res.status(500).json({ success: false, error: "Unable to sign in right now. Please try again later." });
    }
  }

  function session(req, res) {
    res.set("Cache-Control", "no-store");
    return res.json({ success: true, data: { authenticated: hasAdminSession(req) } });
  }

  function logout(req, res) {
    const token = getCookie(req, SESSION_COOKIE);
    if (token) sessions.delete(token);
    const secure = isProduction() ? "; Secure" : "";
    res.set("Cache-Control", "no-store");
    res.set("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
    return res.json({ success: true });
  }

  return { login, session, logout, requireAdmin };
}
