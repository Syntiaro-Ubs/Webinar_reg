import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from parent directory (root)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const REGISTRATIONS_FILE = path.join(DATA_DIR, 'registrations.json');

const dbSettings = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME || 'webinar_reg',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z',
};

let pool;

function parseJsonColumn(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function rowToRegistration(row) {
  return {
    id: row.id,
    regNumber: row.reg_number,
    collegeName: row.college_name || '',
    firstName: row.first_name,
    middleName: row.middle_name || '',
    lastName: row.last_name,
    email: row.email,
    phone: row.phone || '',
    dob: row.dob || '',
    gender: row.gender || 'Male',
    stream: row.stream || '',
    year: row.year || '',
    semester: row.semester || '',
    rollNumber: row.roll_number || undefined,
    amount: Number(row.amount) || 0,
    upiIdPaidTo: row.upi_id_paid_to || '',
    utrNumber: row.utr_number || '',
    payerUpiApp: row.payer_upi_app || '',
    paymentStatus: row.payment_status,
    registeredAt: row.registered_at,
    emailSent: Boolean(row.email_sent),
    notes: row.notes || undefined,
  };
}

export async function initDatabase({ defaultConfig, initialRegistrations }) {
  const { database, waitForConnections, connectionLimit, timezone, ...serverConfig } = dbSettings;

  const bootstrap = await mysql.createConnection(serverConfig);
  await bootstrap.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await bootstrap.end();

  pool = mysql.createPool({
    ...serverConfig,
    database,
    waitForConnections,
    connectionLimit,
    timezone,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_config (
      id TINYINT PRIMARY KEY,
      data JSON NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id VARCHAR(64) PRIMARY KEY,
      reg_number VARCHAR(64) NOT NULL,
      college_name VARCHAR(255) DEFAULT '',
      first_name VARCHAR(100) NOT NULL,
      middle_name VARCHAR(100) DEFAULT '',
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50) DEFAULT '',
      dob VARCHAR(32) DEFAULT '',
      gender VARCHAR(32) DEFAULT '',
      stream VARCHAR(255) DEFAULT '',
      year VARCHAR(100) DEFAULT '',
      semester VARCHAR(50) DEFAULT '',
      roll_number VARCHAR(50) NULL,
      amount DECIMAL(10,2) DEFAULT 0,
      upi_id_paid_to VARCHAR(100) DEFAULT '',
      utr_number VARCHAR(64) DEFAULT '',
      payer_upi_app VARCHAR(50) DEFAULT '',
      screenshot_url LONGTEXT NULL,
      payment_status VARCHAR(32) NOT NULL DEFAULT 'pending',
      registered_at VARCHAR(40) NOT NULL,
      email_sent TINYINT(1) NOT NULL DEFAULT 0,
      notes TEXT NULL
    )
  `);

  try {
    await pool.query("ALTER TABLE registrations ADD COLUMN middle_name VARCHAR(100) DEFAULT '' AFTER first_name");
  } catch {
    // Column already exists or table is fresh
  }

  try {
    await pool.query("ALTER TABLE registrations ADD COLUMN college_name VARCHAR(255) DEFAULT '' AFTER reg_number");
  } catch {
    // Column already exists or table is fresh
  }

  await pool.query('ALTER TABLE registrations MODIFY COLUMN screenshot_url LONGTEXT NULL');

  const [configRows] = await pool.query('SELECT id FROM app_config WHERE id = 1');
  if (configRows.length === 0) {
    let seedConfig = defaultConfig;
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        seedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      }
    } catch (err) {
      console.warn('Could not read existing config.json, using defaults:', err.message);
    }
    await pool.query('INSERT INTO app_config (id, data) VALUES (1, ?)', [JSON.stringify(seedConfig)]);
  }

  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM registrations');
  if (Number(count) === 0) {
    let seedRegs = initialRegistrations;
    try {
      if (fs.existsSync(REGISTRATIONS_FILE)) {
        seedRegs = JSON.parse(fs.readFileSync(REGISTRATIONS_FILE, 'utf-8'));
      }
    } catch (err) {
      console.warn('Could not read existing registrations.json, using sample data:', err.message);
    }
    for (const reg of seedRegs) {
      await insertRegistration(reg);
    }
  }

  const [ping] = await pool.query('SELECT DATABASE() AS db');
  console.log(`MySQL connected: ${dbSettings.user}@${dbSettings.host}:${dbSettings.port}/${ping[0].db}`);
}

export async function loadConfig() {
  const [rows] = await pool.query('SELECT data FROM app_config WHERE id = 1');
  const config = parseJsonColumn(rows[0]?.data, {});
  delete config.requireProofUpload;
  return config;
}

export async function saveConfig(cfg) {
  const config = { ...cfg };
  delete config.requireProofUpload;
  await pool.query('UPDATE app_config SET data = ? WHERE id = 1', [JSON.stringify(config)]);
}

export async function loadRegistrations() {
  const [rows] = await pool.query('SELECT * FROM registrations ORDER BY registered_at DESC');
  return rows.map(rowToRegistration);
}

export async function insertRegistration(reg) {
  await pool.query(
    `INSERT INTO registrations (
      id, reg_number, college_name, first_name, middle_name, last_name, email, phone, dob, gender, stream, year, semester,
      roll_number, amount, upi_id_paid_to, utr_number, payer_upi_app, screenshot_url,
      payment_status, registered_at, email_sent, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reg.id,
      reg.regNumber,
      reg.collegeName || '',
      reg.firstName,
      reg.middleName || '',
      reg.lastName,
      reg.email,
      reg.phone || '',
      reg.dob || '',
      reg.gender || '',
      reg.stream || '',
      reg.year || '',
      reg.semester || '',
      reg.rollNumber || null,
      Number(reg.amount) || 0,
      reg.upiIdPaidTo || '',
      reg.utrNumber || '',
      reg.payerUpiApp || '',
      reg.screenshotUrl || null,
      reg.paymentStatus || 'pending',
      reg.registeredAt,
      reg.emailSent ? 1 : 0,
      reg.notes || null,
    ]
  );
}

export async function updateRegistrationStatus(id, status, notes) {
  if (notes !== undefined) {
    const [result] = await pool.query(
      'UPDATE registrations SET payment_status = ?, notes = ? WHERE id = ?',
      [status, notes, id]
    );
    return result.affectedRows > 0;
  }
  const [result] = await pool.query(
    'UPDATE registrations SET payment_status = ? WHERE id = ?',
    [status, id]
  );
  return result.affectedRows > 0;
}

export async function deleteRegistration(id) {
  const [result] = await pool.query('DELETE FROM registrations WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function findRegistrationById(id) {
  const [rows] = await pool.query('SELECT * FROM registrations WHERE id = ?', [id]);
  return rows[0] ? rowToRegistration(rows[0]) : null;
}

export async function setRegistrationEmailSent(id, emailSent) {
  const [result] = await pool.query(
    'UPDATE registrations SET email_sent = ? WHERE id = ?',
    [emailSent ? 1 : 0, id]
  );
  return result.affectedRows > 0;
}
