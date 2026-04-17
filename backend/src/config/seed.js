require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const defaultUsers = [
  { name: 'Administrator',  username: 'admin',        password: 'admin123',        role: 'admin',         email: 'admin@bugembe.ug',        phone: '+256 700 123456', department: 'General' },
  { name: 'Dr. Test',       username: 'doctor',       password: 'doctor123',       role: 'doctor',        email: 'doctor@bugembe.ug',       phone: '+256 700 234567', department: 'OPD' },
  { name: 'Nurse One',      username: 'nurse1',       password: 'nurse123',        role: 'nurse',         email: 'nurse1@bugembe.ug',       phone: '+256 700 345678', department: 'IPD' },
  { name: 'Receptionist',   username: 'receptionist', password: 'receptionist123', role: 'receptionist',  email: 'front@bugembe.ug',        phone: '+256 700 456789', department: 'General' },
  { name: 'Accountant',     username: 'accountant',   password: 'accountant123',   role: 'accountant',    email: 'accounts@bugembe.ug',     phone: '+256 700 567890', department: 'Finance' },
  { name: 'Pharmacist',     username: 'pharmacist',   password: 'pharmacist123',   role: 'pharmacist',    email: 'pharmacy@bugembe.ug',     phone: '+256 700 678901', department: 'Pharmacy' },
];

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bugembe_hciv',
  });

  console.log('🌱 Seeding default users...');

  for (const u of defaultUsers) {
    const hashed = await bcrypt.hash(u.password, 10);
    await conn.query(`
      INSERT IGNORE INTO users (id, name, username, password, role, email, phone, department, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `, [uuidv4(), u.name, u.username, hashed, u.role, u.email, u.phone, u.department]);
    console.log(`  ✅ ${u.username} (${u.role})`);
  }

  console.log('✅ Seed complete');
  await conn.end();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});