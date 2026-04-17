require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  console.log('🔄 Running migrations...');

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'bugembe_hciv'}\`;`);
  await conn.query(`USE \`${process.env.DB_NAME || 'bugembe_hciv'}\`;`);

  // ── Users ────────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         VARCHAR(36)  PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      username   VARCHAR(50)  NOT NULL UNIQUE,
      password   VARCHAR(255) NOT NULL,
      role       ENUM('admin','doctor','nurse','receptionist','accountant','pharmacist') NOT NULL,
      email      VARCHAR(100),
      phone      VARCHAR(30),
      department VARCHAR(100),
      status     ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // ── Refresh tokens ───────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         VARCHAR(36)  PRIMARY KEY,
      user_id    VARCHAR(36)  NOT NULL,
      token      TEXT         NOT NULL,
      expires_at DATETIME     NOT NULL,
      revoked    TINYINT(1)   NOT NULL DEFAULT 0,
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // ── Patients ─────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id              VARCHAR(36)  PRIMARY KEY,
      patient_number  VARCHAR(20)  NOT NULL UNIQUE,
      first_name      VARCHAR(100) NOT NULL,
      last_name       VARCHAR(100) NOT NULL,
      date_of_birth   DATE,
      gender          ENUM('male','female','other'),
      phone           VARCHAR(30),
      address         TEXT,
      next_of_kin     VARCHAR(100),
      next_of_kin_phone VARCHAR(30),
      blood_group     VARCHAR(5),
      allergies       TEXT,
      status          ENUM('active','inactive','deceased') NOT NULL DEFAULT 'active',
      created_by      VARCHAR(36),
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // ── Appointments ─────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id              VARCHAR(36)  PRIMARY KEY,
      patient_id      VARCHAR(36)  NOT NULL,
      doctor_id       VARCHAR(36)  NOT NULL,
      appointment_date DATE        NOT NULL,
      appointment_time TIME        NOT NULL,
      reason          TEXT,
      status          ENUM('scheduled','completed','cancelled','no-show') NOT NULL DEFAULT 'scheduled',
      notes           TEXT,
      created_by      VARCHAR(36),
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id)  REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id)   REFERENCES users(id)    ON DELETE RESTRICT,
      FOREIGN KEY (created_by)  REFERENCES users(id)    ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // ── OPD visits ───────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS opd_visits (
      id              VARCHAR(36)  PRIMARY KEY,
      patient_id      VARCHAR(36)  NOT NULL,
      doctor_id       VARCHAR(36),
      visit_date      DATE         NOT NULL,
      chief_complaint TEXT,
      diagnosis       TEXT,
      treatment_plan  TEXT,
      vitals          JSON,
      prescription    TEXT,
      follow_up_date  DATE,
      status          ENUM('waiting','in-progress','completed') NOT NULL DEFAULT 'waiting',
      created_by      VARCHAR(36),
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id)  REFERENCES users(id)    ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)    ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // ── IPD admissions ───────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS ipd_admissions (
      id              VARCHAR(36)  PRIMARY KEY,
      patient_id      VARCHAR(36)  NOT NULL,
      doctor_id       VARCHAR(36),
      ward            VARCHAR(100),
      bed_number      VARCHAR(20),
      admission_date  DATE         NOT NULL,
      discharge_date  DATE,
      diagnosis       TEXT,
      treatment_notes TEXT,
      discharge_notes TEXT,
      status          ENUM('admitted','discharged','transferred') NOT NULL DEFAULT 'admitted',
      created_by      VARCHAR(36),
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id)  REFERENCES users(id)    ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)    ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // ── Drugs / medicines ────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS drugs (
      id              VARCHAR(36)  PRIMARY KEY,
      name            VARCHAR(200) NOT NULL,
      generic_name    VARCHAR(200),
      category        VARCHAR(100),
      unit            VARCHAR(50),
      quantity_in_stock INT        NOT NULL DEFAULT 0,
      reorder_level   INT          NOT NULL DEFAULT 10,
      unit_price      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      expiry_date     DATE,
      supplier        VARCHAR(200),
      status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_by      VARCHAR(36),
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // ── Prescriptions ─────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id              VARCHAR(36)  PRIMARY KEY,
      patient_id      VARCHAR(36)  NOT NULL,
      doctor_id       VARCHAR(36),
      visit_id        VARCHAR(36),
      drug_id         VARCHAR(36)  NOT NULL,
      dosage          VARCHAR(100),
      frequency       VARCHAR(100),
      duration        VARCHAR(100),
      quantity        INT          NOT NULL DEFAULT 1,
      dispensed       TINYINT(1)   NOT NULL DEFAULT 0,
      dispensed_by    VARCHAR(36),
      dispensed_at    DATETIME,
      notes           TEXT,
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id)   REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id)    REFERENCES users(id)    ON DELETE SET NULL,
      FOREIGN KEY (drug_id)      REFERENCES drugs(id)    ON DELETE RESTRICT,
      FOREIGN KEY (dispensed_by) REFERENCES users(id)    ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // ── Billing ──────────────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS bills (
      id              VARCHAR(36)  PRIMARY KEY,
      patient_id      VARCHAR(36)  NOT NULL,
      visit_id        VARCHAR(36),
      bill_date       DATE         NOT NULL,
      total_amount    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      paid_amount     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      discount        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      status          ENUM('pending','partial','paid','cancelled') NOT NULL DEFAULT 'pending',
      payment_method  ENUM('cash','mobile_money','insurance','other'),
      notes           TEXT,
      created_by      VARCHAR(36),
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)    ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // ── Bill line items ──────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS bill_items (
      id          VARCHAR(36)  PRIMARY KEY,
      bill_id     VARCHAR(36)  NOT NULL,
      description VARCHAR(255) NOT NULL,
      quantity    INT          NOT NULL DEFAULT 1,
      unit_price  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      total       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('✅ All tables created successfully');
  await conn.end();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});