import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isPostgres = Boolean(process.env.DATABASE_URL);
let sqliteDb = null;
let pgPool = null;

if (isPostgres) {
  console.log('[Banco Online] Conectando ao PostgreSQL na nuvem (DATABASE_URL)...');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });
} else {
  console.log('[Banco Online] Conectando ao SQLite local (data/gerente_lavagem.db)...');
  const { DatabaseSync } = await import('node:sqlite');
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'gerente_lavagem.db');
  sqliteDb = new DatabaseSync(dbPath);
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
  sqliteDb.exec('PRAGMA synchronous = NORMAL;');
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
}

function convertPlaceholders(sql) {
  let idx = 1;
  return sql.replace(/\?/g, () => `$${idx++}`);
}

function sanitizeParams(params = []) {
  return params.map((p) => (p === undefined ? null : p));
}

export async function query(sql, params = []) {
  const safeParams = sanitizeParams(params);
  if (isPostgres) {
    const pgSql = convertPlaceholders(sql);
    const res = await pgPool.query(pgSql, safeParams);
    return res.rows;
  }
  return sqliteDb.prepare(sql).all(...safeParams);
}

export async function queryOne(sql, params = []) {
  const safeParams = sanitizeParams(params);
  if (isPostgres) {
    const pgSql = convertPlaceholders(sql);
    const res = await pgPool.query(pgSql, safeParams);
    return res.rows[0] || null;
  }
  return sqliteDb.prepare(sql).get(...safeParams) || null;
}

export async function execute(sql, params = []) {
  const safeParams = sanitizeParams(params);
  if (isPostgres) {
    const pgSql = convertPlaceholders(sql);
    return await pgPool.query(pgSql, safeParams);
  }
  return sqliteDb.prepare(sql).run(...safeParams);
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  const calculatedHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(calculatedHash, 'hex'));
}

export async function getCurrentQuinzenaId() {
  const row = await queryOne('SELECT value FROM settings WHERE key = ?', ['current_quinzena_id']);
  return row ? row.value : 'q_default';
}

export async function setNextQuinzenaId() {
  const nextQId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await execute('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value', ['current_quinzena_id', nextQId]);
  return nextQId;
}

export async function initDatabase() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      acronym TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ceo', 'gerente', 'funcionario')),
      employee_id TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS washes (
      id TEXT PRIMARY KEY,
      quinzena_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      service_date TEXT,
      plate TEXT,
      company TEXT,
      payment_method TEXT NOT NULL,
      total_value REAL NOT NULL,
      product_fee REAL NOT NULL,
      base_value REAL NOT NULL,
      house_value REAL NOT NULL,
      team_value REAL NOT NULL,
      employee_ids TEXT NOT NULL,
      employee_acronyms TEXT NOT NULL,
      value_per_employee REAL NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS advances (
      id TEXT PRIMARY KEY,
      quinzena_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      advance_date TEXT,
      employee_id TEXT NOT NULL,
      employee_acronym TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      value REAL NOT NULL,
      note TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS closed_quinzenas (
      id TEXT PRIMARY KEY,
      closed_at TEXT NOT NULL,
      total_revenue REAL NOT NULL,
      total_products REAL NOT NULL,
      total_house REAL NOT NULL,
      total_team REAL NOT NULL,
      total_advances REAL NOT NULL,
      total_net_payable REAL NOT NULL,
      wash_count INTEGER NOT NULL,
      employees_summary TEXT NOT NULL
    )`
  ];

  for (const sql of tables) {
    await execute(sql);
  }

  // Migra coluna service_date caso a tabela já existisse
  try {
    await execute('ALTER TABLE washes ADD COLUMN service_date TEXT');
  } catch {}
  try {
    await execute('ALTER TABLE advances ADD COLUMN advance_date TEXT');
  } catch {}

  // Cria índices
  try {
    await execute('CREATE INDEX IF NOT EXISTS idx_washes_quinzena ON washes(quinzena_id)');
    await execute('CREATE INDEX IF NOT EXISTS idx_advances_quinzena ON advances(quinzena_id)');
    await execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
  } catch {}

  // Quinzena ativa inicial
  const qRow = await queryOne('SELECT value FROM settings WHERE key = ?', ['current_quinzena_id']);
  if (!qRow) {
    const initialQId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await execute('INSERT INTO settings (key, value) VALUES (?, ?)', ['current_quinzena_id', initialQId]);
  }

  // Inicializa funcionários padrão se tabela estiver vazia
  const empCountRow = await queryOne('SELECT COUNT(*) as count FROM employees');
  const empCount = Number(empCountRow?.count || 0);
  if (empCount === 0) {
    await execute('INSERT INTO employees (id, name, acronym, active) VALUES (?, ?, ?, ?)', ['emp_1', 'Carlos Silva', 'CS', 1]);
    await execute('INSERT INTO employees (id, name, acronym, active) VALUES (?, ?, ?, ?)', ['emp_2', 'João Santos', 'JO', 1]);
    await execute('INSERT INTO employees (id, name, acronym, active) VALUES (?, ?, ?, ?)', ['emp_3', 'Marcelo Andrade', 'MA', 1]);
    await execute('INSERT INTO employees (id, name, acronym, active) VALUES (?, ?, ?, ?)', ['emp_4', 'Roberto Lima', 'RL', 1]);
  }

  // Remove logins de teste antigos
  await execute("DELETE FROM users WHERE username IN ('ceo', 'gerente', 'carlos')");
  await execute("DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users)");

  // Garante a conta do CEO: drluis22 / 8698
  const ceoUser = await queryOne('SELECT id FROM users WHERE username = ?', ['drluis22']);
  const ceoAuth = hashPassword('8698');

  if (!ceoUser) {
    await execute(`
      INSERT INTO users (id, username, password_hash, salt, name, role, employee_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['usr_drluis', 'drluis22', ceoAuth.hash, ceoAuth.salt, 'Dr. Luis', 'ceo', null, new Date().toISOString()]);
  } else {
    await execute(`
      UPDATE users SET password_hash = ?, salt = ?, role = 'ceo', name = 'Dr. Luis'
      WHERE username = 'drluis22'
    `, [ceoAuth.hash, ceoAuth.salt]);
  }

  console.log('[Banco Online] Inicializado com sucesso! CEO: drluis22 configurado.');
}
