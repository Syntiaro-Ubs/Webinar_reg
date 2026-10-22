-- Additive schema for the Webinar Registration System.
-- Select the intended application database before running this file.
-- All statements are safe to run on an existing database: no tables are dropped,
-- truncated, or seeded with personal registration data.

CREATE TABLE IF NOT EXISTS app_config (
  id TINYINT NOT NULL,
  data JSON NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS registrations (
  id VARCHAR(64) NOT NULL,
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
  roll_number VARCHAR(50) DEFAULT NULL,
  amount DECIMAL(10,2) DEFAULT 0.00,
  upi_id_paid_to VARCHAR(100) DEFAULT '',
  utr_number VARCHAR(64) DEFAULT '',
  payer_upi_app VARCHAR(50) DEFAULT '',
  screenshot_url LONGTEXT NULL,
  cashfree_order_id VARCHAR(100) DEFAULT NULL,
  payment_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  registered_at VARCHAR(40) NOT NULL,
  email_sent TINYINT(1) NOT NULL DEFAULT 0,
  payment_receipt_sent TINYINT(1) NOT NULL DEFAULT 0,
  payment_receipt_claimed_at DATETIME DEFAULT NULL,
  notes TEXT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
