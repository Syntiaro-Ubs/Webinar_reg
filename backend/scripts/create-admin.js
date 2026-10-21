import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import {
  closeDatabase,
  createFirstAdmin,
  initAdminDatabase,
} from "../db.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(projectRoot, ".env") });

function setupError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function askLine(prompt) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  return rl.question(prompt).finally(() => rl.close());
}

function askHidden(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    return Promise.reject(setupError("ADMIN_SETUP_REQUIRES_TTY"));
  }

  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          finish(setupError("ADMIN_SETUP_CANCELLED"));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u0008" || character === "\u007f") {
          value = value.slice(0, -1);
          continue;
        }
        if (character >= " ") value += character;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const host = process.env.DB_HOST || "127.0.0.1";
  const database = process.env.DB_NAME || "webinar_reg";
  stdout.write(`Target MySQL database: ${database} on ${host}\n`);
  const confirmation = (await askLine("Type the database name to continue: ")).trim();
  if (confirmation !== database) {
    throw setupError("ADMIN_SETUP_DATABASE_CONFIRMATION_FAILED");
  }

  const username = (await askLine("Admin username (3-191 letters, numbers, @, dots, dashes, or underscores): "))
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9@._-]{3,191}$/.test(username)) {
    throw setupError("ADMIN_SETUP_INVALID_USERNAME");
  }

  const password = await askHidden("Admin password (hidden, at least 12 characters): ");
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw setupError("ADMIN_SETUP_INVALID_PASSWORD_LENGTH");
  }
  const confirmationPassword = await askHidden("Confirm admin password: ");
  if (password !== confirmationPassword) {
    throw setupError("ADMIN_SETUP_PASSWORD_MISMATCH");
  }

  await initAdminDatabase();
  const passwordHash = await bcrypt.hash(password, 12);
  await createFirstAdmin(username, passwordHash);
  console.log(`Initial admin account '${username}' created for database '${database}'. The password was not displayed.`);
}

try {
  await main();
} catch (error) {
  process.exitCode = 1;
  if (error.code === "ADMIN_ALREADY_EXISTS") {
    console.error("An admin account already exists. No changes were made.");
  } else if (error.code === "ER_DUP_ENTRY") {
    console.error("That username already exists. No changes were made.");
  } else {
    const safeMessages = {
      ADMIN_SETUP_REQUIRES_TTY: "Run this script in an interactive terminal so the password can be hidden.",
      ADMIN_SETUP_CANCELLED: "Admin creation cancelled.",
      ADMIN_SETUP_DATABASE_CONFIRMATION_FAILED: "Database name did not match. No admin account was created.",
      ADMIN_SETUP_INVALID_USERNAME: "Username must be 3-191 characters and use only letters, numbers, @, dots, dashes, or underscores.",
      ADMIN_SETUP_INVALID_PASSWORD_LENGTH: "Password must be at least 12 characters and no more than 72 UTF-8 bytes.",
      ADMIN_SETUP_PASSWORD_MISMATCH: "Passwords did not match. No admin account was created.",
      ADMIN_SETUP_LOCK_FAILED: "Could not acquire the admin setup lock. No admin account was created.",
    };
    console.error(safeMessages[error.code] || "Admin creation failed. Check database connectivity and permissions; sensitive error details were omitted.");
    if (error.code && !error.code.startsWith("ADMIN_SETUP_")) console.error(`Error code: ${error.code}`);
    process.exitCode = 1;
  }
} finally {
  await closeDatabase().catch(() => {});
}
