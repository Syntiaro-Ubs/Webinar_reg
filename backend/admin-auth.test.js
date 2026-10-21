import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import express from "express";
import bcrypt from "bcryptjs";
import { createAdminAuth } from "./admin-auth.js";

const username = "test.admin";
const password = "test-only-password-123";
let server;
let origin;
let auth;
let databaseUnavailable = false;
let passwordHashForTest;
const logLines = [];

before(async () => {
  passwordHashForTest = await bcrypt.hash(password, 4);
  auth = await createAdminAuth({
    findAdminByUsername: async (requestedUsername) => {
      if (databaseUnavailable) throw Object.assign(new Error("sensitive database detail"), { code: "ER_TEST_FAILURE" });
      return requestedUsername === username ? { id: 1, username, password_hash: passwordHashForTest } : null;
    },
    logger: {
      log: (line) => logLines.push(line),
      warn: (line) => logLines.push(line),
      error: (line) => logLines.push(line),
    },
    isProduction: () => true,
  });

  const app = express();
  app.use(express.json());
  app.post("/api/admin/login", auth.login);
  app.get("/api/admin/session", auth.session);
  app.post("/api/admin/logout", auth.logout);
  app.get("/api/registrations", auth.requireAdmin, (_req, res) => res.json({ data: [] }));
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("valid username and password create a protected session that logout invalidates", async () => {
  const loginResponse = await fetch(`${origin}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: " Test.Admin ", password }),
  });
  assert.equal(loginResponse.status, 200);
  assert.deepEqual(await loginResponse.json(), { success: true, data: { authenticated: true } });
  const setCookie = loginResponse.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=Strict/);
  const cookie = setCookie.split(";", 1)[0];

  const protectedResponse = await fetch(`${origin}/api/registrations`, { headers: { Cookie: cookie } });
  assert.equal(protectedResponse.status, 200);

  const logoutResponse = await fetch(`${origin}/api/admin/logout`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert.equal(logoutResponse.status, 200);
  assert.match(logoutResponse.headers.get("set-cookie"), /Max-Age=0/);

  const sessionResponse = await fetch(`${origin}/api/admin/session`, { headers: { Cookie: cookie } });
  assert.deepEqual(await sessionResponse.json(), { success: true, data: { authenticated: false } });
  const rejectedResponse = await fetch(`${origin}/api/registrations`, { headers: { Cookie: cookie } });
  assert.equal(rejectedResponse.status, 401);
});

test("wrong passwords and unknown usernames return the same generic login error", async () => {
  const attempts = await Promise.all([
    fetch(`${origin}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: "wrong-password-value" }),
    }),
    fetch(`${origin}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "unknown.admin", password }),
    }),
  ]);
  assert.equal(attempts[0].status, 401);
  assert.equal(attempts[1].status, 401);
  const bodies = await Promise.all(attempts.map((response) => response.json()));
  assert.deepEqual(bodies[0], bodies[1]);
});

test("unauthenticated protected requests are rejected and logs contain no credentials", async () => {
  const response = await fetch(`${origin}/api/registrations`);
  assert.equal(response.status, 401);
  assert.equal(logLines.some((line) => line.includes(password)), false);
  assert.equal(logLines.some((line) => line.includes("password_hash")), false);
  assert.equal(logLines.some((line) => line.includes(passwordHashForTest)), false);
});

test("database errors return a generic response and do not log credentials", async () => {
  databaseUnavailable = true;
  const response = await fetch(`${origin}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  databaseUnavailable = false;
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    success: false,
    error: "Unable to sign in right now. Please try again later.",
  });
  assert.equal(logLines.some((line) => line.includes("sensitive database detail")), false);
  assert.equal(logLines.some((line) => line.includes(password)), false);
});

test("login attempts are rate limited after ten failures", async () => {
  const resetResponse = await fetch(`${origin}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(resetResponse.status, 200);

  for (let index = 0; index < 10; index += 1) {
    const response = await fetch(`${origin}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: "incorrect-test-password" }),
    });
    assert.equal(response.status, 401);
  }
  const response = await fetch(`${origin}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: "incorrect-test-password" }),
  });
  assert.equal(response.status, 429);
});
