import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Garante que o diretório de dados exista
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'gerente_lavagem.db');
const db = new DatabaseSync(dbPath);

// Configurações de performance do SQLite (WAL mode)
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Criação cirúrgica das tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    acronym TEXT NOT NULL UNIQUE,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('ceo', 'gerente', 'funcionario')),
    employee_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS washes (
    id TEXT PRIMARY KEY,
    quinzena_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
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
  );

  CREATE TABLE IF NOT EXISTS advances (
    id TEXT PRIMARY KEY,
    quinzena_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    employee_acronym TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    value REAL NOT NULL,
    note TEXT,
    FOREIGN KEY(employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS closed_quinzenas (
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
  );

  CREATE INDEX IF NOT EXISTS idx_washes_quinzena ON washes(quinzena_id);
  CREATE INDEX IF NOT EXISTS idx_advances_quinzena ON advances(quinzena_id);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`);

// Funções utilitárias de criptografia e senhas (Node.js nativo)
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  const calculatedHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(calculatedHash, 'hex'));
}

// Inicializa Quinzena Ativa se não existir
const getSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
const setSettingStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

let currentQuinzenaRow = getSettingStmt.get('current_quinzena_id');
if (!currentQuinzenaRow) {
  const initialQId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  setSettingStmt.run('current_quinzena_id', initialQId);
}

// Inicializa funcionários padrão se a tabela estiver vazia
const countEmployeesStmt = db.prepare('SELECT COUNT(*) as count FROM employees');
const empCount = countEmployeesStmt.get().count;

if (empCount === 0) {
  const insertEmpStmt = db.prepare(
    'INSERT INTO employees (id, name, acronym, active) VALUES (?, ?, ?, ?)'
  );
  insertEmpStmt.run('emp_1', 'Carlos Silva', 'CS', 1);
  insertEmpStmt.run('emp_2', 'João Santos', 'JO', 1);
  insertEmpStmt.run('emp_3', 'Marcelo Andrade', 'MA', 1);
  insertEmpStmt.run('emp_4', 'Roberto Lima', 'RL', 1);
}

// Remove contas de teste antigas
db.prepare("DELETE FROM users WHERE username IN ('ceo', 'gerente', 'carlos')").run();
db.prepare("DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users)").run();

// Garante o login exclusivo do CEO: drluis22 / 8698
const ceoUser = db.prepare('SELECT id FROM users WHERE username = ?').get('drluis22');
const ceoAuth = hashPassword('8698');

if (!ceoUser) {
  const insertUserStmt = db.prepare(`
    INSERT INTO users (id, username, password_hash, salt, name, role, employee_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertUserStmt.run('usr_drluis', 'drluis22', ceoAuth.hash, ceoAuth.salt, 'Dr. Luis', 'ceo', null, new Date().toISOString());
} else {
  db.prepare(`
    UPDATE users SET password_hash = ?, salt = ?, role = 'ceo', name = 'Dr. Luis'
    WHERE username = 'drluis22'
  `).run(ceoAuth.hash, ceoAuth.salt);
}

export function getCurrentQuinzenaId() {
  const row = getSettingStmt.get('current_quinzena_id');
  return row ? row.value : 'q_default';
}

export function setNextQuinzenaId() {
  const nextQId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  setSettingStmt.run('current_quinzena_id', nextQId);
  return nextQId;
}

export { db };
