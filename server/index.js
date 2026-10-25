import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, getCurrentQuinzenaId, setNextQuinzenaId, hashPassword, verifyPassword } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');

const PORT = process.env.PORT || 3001;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function serveStaticFile(req, res, pathname) {
  if (!fs.existsSync(distDir)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Pasta dist não encontrada. Execute npm run build primeiro.');
  }

  let filePath = path.join(distDir, pathname === '/' ? 'index.html' : pathname);

  // Proteção contra path traversal
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    return res.end('Acesso negado');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  // Fallback para SPA (index.html)
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(indexPath).pipe(res);
  }

  res.writeHead(404);
  res.end('Arquivo não encontrado');
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Extrai o usuário da sessão a partir do cabeçalho Authorization
function getAuthenticatedUser(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  const sessionRow = db.prepare(`
    SELECT s.token, u.id, u.username, u.name, u.role, u.employee_id as employeeId, e.acronym as employeeAcronym
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN employees e ON u.employee_id = e.id
    WHERE s.token = ?
  `).get(token);

  return sessionRow || null;
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Servir arquivos estáticos do frontend PWA de produção (HTML, CSS, JS, Manifest, Service Worker)
  if (!pathname.startsWith('/api')) {
    return serveStaticFile(req, res, pathname);
  }

  try {
    // 1. Status / Health Check
    if (pathname === '/api/status' && req.method === 'GET') {
      return sendJson(res, 200, {
        status: 'online',
        database: 'SQLite (Node native)',
        currentQuinzenaId: getCurrentQuinzenaId(),
        timestamp: new Date().toISOString(),
      });
    }

    // 2. AUTENTICAÇÃO: LOGIN
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { username, password } = await parseJsonBody(req);
      if (!username || !password) {
        return sendJson(res, 400, { error: 'Informe usuário e senha.' });
      }

      const user = db.prepare(`
        SELECT u.id, u.username, u.password_hash, u.salt, u.name, u.role, u.employee_id as employeeId, e.acronym as employeeAcronym
        FROM users u
        LEFT JOIN employees e ON u.employee_id = e.id
        WHERE LOWER(u.username) = LOWER(?)
      `).get(username.trim());

      if (!user) {
        return sendJson(res, 401, { error: 'Usuário ou senha incorretos.' });
      }

      const isValid = verifyPassword(password, user.password_hash, user.salt);
      if (!isValid) {
        return sendJson(res, 401, { error: 'Usuário ou senha incorretos.' });
      }

      // Cria token de sessão
      const token = crypto.randomBytes(32).toString('hex');
      db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(
        token,
        user.id,
        new Date().toISOString()
      );

      return sendJson(res, 200, {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          employeeId: user.employeeId,
          employeeAcronym: user.employeeAcronym,
        },
      });
    }

    // 3. AUTENTICAÇÃO: ME (PERFIL ATUAL)
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        return sendJson(res, 401, { error: 'Não autenticado' });
      }
      return sendJson(res, 200, { user });
    }

    // 4. AUTENTICAÇÃO: LOGOUT
    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      }
      return sendJson(res, 200, { success: true });
    }

    // 5. PORTAL EXCLUSIVO DO FUNCIONÁRIO (Somente seus dados)
    if (pathname === '/api/my-portal' && req.method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user) {
        return sendJson(res, 401, { error: 'Acesso não autorizado' });
      }

      const currentQId = getCurrentQuinzenaId();
      const empId = user.employeeId;

      if (!empId) {
        return sendJson(res, 200, {
          user,
          washes: [],
          advances: [],
          summary: { washCount: 0, totalCommission: 0, totalAdvances: 0, netToPay: 0 },
        });
      }

      // Busca apenas as lavagens onde este funcionário participou
      const rawWashes = db.prepare('SELECT * FROM washes WHERE quinzena_id = ? ORDER BY created_at DESC').all(currentQId);
      const myWashes = rawWashes
        .filter((w) => {
          const ids = JSON.parse(w.employee_ids || '[]');
          return ids.includes(empId);
        })
        .map((w) => ({
          id: w.id,
          createdAt: w.created_at,
          plate: w.plate,
          company: w.company,
          paymentMethod: w.payment_method,
          totalValue: w.total_value,
          valuePerEmployee: w.value_per_employee,
        }));

      // Busca apenas os vales deste funcionário
      const myAdvances = db.prepare('SELECT id, created_at as createdAt, value, note FROM advances WHERE quinzena_id = ? AND employee_id = ? ORDER BY created_at DESC').all(currentQId, empId);

      const totalCommission = myWashes.reduce((sum, w) => sum + (w.valuePerEmployee || 0), 0);
      const totalAdvances = myAdvances.reduce((sum, a) => sum + (a.value || 0), 0);
      const netToPay = Math.max(0, totalCommission - totalAdvances);

      return sendJson(res, 200, {
        user,
        washes: myWashes,
        advances: myAdvances,
        summary: {
          washCount: myWashes.length,
          totalCommission,
          totalAdvances,
          netToPay,
        },
      });
    }

    // 6. GESTÃO DE USUÁRIOS E CARGOS (EXCLUSIVO CEO)
    if (pathname === '/api/users' && req.method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (!user || user.role !== 'ceo') {
        return sendJson(res, 403, { error: 'Acesso exclusivo para o CEO.' });
      }

      const users = db.prepare(`
        SELECT u.id, u.username, u.name, u.role, u.employee_id as employeeId, u.created_at as createdAt, e.acronym as employeeAcronym
        FROM users u
        LEFT JOIN employees e ON u.employee_id = e.id
        ORDER BY u.role = 'ceo' DESC, u.name ASC
      `).all();

      return sendJson(res, 200, { users });
    }

    // 7. CADASTRAR OU ATUALIZAR USUÁRIO (EXCLUSIVO CEO)
    if (pathname === '/api/users' && req.method === 'POST') {
      const caller = getAuthenticatedUser(req);
      if (!caller || caller.role !== 'ceo') {
        return sendJson(res, 403, { error: 'Somente o CEO pode cadastrar ou alterar usuários e cargos.' });
      }

      const data = await parseJsonBody(req);
      const { id, username, password, name, role, employeeId } = data;

      if (!username || !name || !role) {
        return sendJson(res, 400, { error: 'Preencha usuário, nome e cargo.' });
      }

      if (!['ceo', 'gerente', 'funcionario'].includes(role)) {
        return sendJson(res, 400, { error: 'Cargo inválido.' });
      }

      if (id) {
        // Atualização de usuário existente
        if (password && password.trim()) {
          const auth = hashPassword(password.trim());
          db.prepare(`
            UPDATE users SET username = ?, password_hash = ?, salt = ?, name = ?, role = ?, employee_id = ?
            WHERE id = ?
          `).run(username.trim().toLowerCase(), auth.hash, auth.salt, name.trim(), role, employeeId || null, id);
        } else {
          db.prepare(`
            UPDATE users SET username = ?, name = ?, role = ?, employee_id = ?
            WHERE id = ?
          `).run(username.trim().toLowerCase(), name.trim(), role, employeeId || null, id);
        }
        return sendJson(res, 200, { success: true, id });
      } else {
        // Novo Usuário
        if (!password || !password.trim()) {
          return sendJson(res, 400, { error: 'Senha obrigatória para novo usuário.' });
        }
        const auth = hashPassword(password.trim());
        const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        
        db.prepare(`
          INSERT INTO users (id, username, password_hash, salt, name, role, employee_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          newId,
          username.trim().toLowerCase(),
          auth.hash,
          auth.salt,
          name.trim(),
          role,
          employeeId || null,
          new Date().toISOString()
        );

        return sendJson(res, 201, { success: true, id: newId });
      }
    }

    // 8. EXCLUIR USUÁRIO (EXCLUSIVO CEO)
    if (pathname.startsWith('/api/users/') && req.method === 'DELETE') {
      const caller = getAuthenticatedUser(req);
      if (!caller || caller.role !== 'ceo') {
        return sendJson(res, 403, { error: 'Somente o CEO pode excluir usuários.' });
      }

      const id = pathname.replace('/api/users/', '');
      if (id === caller.id) {
        return sendJson(res, 400, { error: 'O CEO não pode excluir sua própria conta.' });
      }

      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      return sendJson(res, 200, { success: true, id });
    }

    // 9. LEITURA COMPLETA DE DADOS OPERACIONAIS (Gerente e CEO)
    if (pathname === '/api/data' && req.method === 'GET') {
      const user = getAuthenticatedUser(req);
      if (user && user.role === 'funcionario') {
        return sendJson(res, 403, { error: 'Funcionários devem usar o portal individual (/api/my-portal).' });
      }

      const currentQId = getCurrentQuinzenaId();
      const employees = db.prepare('SELECT id, name, acronym, active = 1 as active FROM employees ORDER BY name').all();
      
      const rawWashes = db.prepare('SELECT * FROM washes WHERE quinzena_id = ? ORDER BY created_at DESC').all(currentQId);
      const washes = rawWashes.map((w) => ({
        id: w.id,
        quinzenaId: w.quinzena_id,
        createdAt: w.created_at,
        plate: w.plate,
        company: w.company,
        paymentMethod: w.payment_method,
        totalValue: w.total_value,
        productFee: w.product_fee,
        baseValue: w.base_value,
        houseValue: w.house_value,
        teamValue: w.team_value,
        employeeIds: JSON.parse(w.employee_ids || '[]'),
        employeeAcronyms: JSON.parse(w.employee_acronyms || '[]'),
        valuePerEmployee: w.value_per_employee,
      }));

      const advances = db.prepare('SELECT id, quinzena_id as quinzenaId, created_at as createdAt, employee_id as employeeId, employee_acronym as employeeAcronym, employee_name as employeeName, value, note FROM advances WHERE quinzena_id = ? ORDER BY created_at DESC').all(currentQId);

      const rawClosed = db.prepare('SELECT * FROM closed_quinzenas ORDER BY closed_at DESC').all();
      const closedQuinzenas = rawClosed.map((c) => ({
        id: c.id,
        closedAt: c.closed_at,
        totalRevenue: c.total_revenue,
        totalProducts: c.total_products,
        totalHouse: c.total_house,
        totalTeam: c.total_team,
        totalAdvances: c.total_advances,
        totalNetPayable: c.total_net_payable,
        washCount: c.wash_count,
        employeesSummary: JSON.parse(c.employees_summary || '[]'),
      }));

      return sendJson(res, 200, {
        currentQuinzenaId: currentQId,
        employees,
        washes,
        advances,
        closedQuinzenas,
      });
    }

    // 10. OPERAÇÕES DE LANÇAMENTO (Gerente ou CEO)
    if (pathname === '/api/washes' && req.method === 'POST') {
      const user = getAuthenticatedUser(req);
      if (user && user.role === 'funcionario') {
        return sendJson(res, 403, { error: 'Funcionários não podem lançar lavagens.' });
      }

      const data = await parseJsonBody(req);
      const currentQId = getCurrentQuinzenaId();
      const id = data.id || `wash_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const createdAt = data.createdAt || new Date().toISOString();

      const stmt = db.prepare(`
        INSERT INTO washes (
          id, quinzena_id, created_at, plate, company, payment_method,
          total_value, product_fee, base_value, house_value, team_value,
          employee_ids, employee_acronyms, value_per_employee
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          plate = excluded.plate,
          company = excluded.company,
          payment_method = excluded.payment_method,
          total_value = excluded.total_value,
          product_fee = excluded.product_fee,
          base_value = excluded.base_value,
          house_value = excluded.house_value,
          team_value = excluded.team_value,
          employee_ids = excluded.employee_ids,
          employee_acronyms = excluded.employee_acronyms,
          value_per_employee = excluded.value_per_employee
      `);

      const totalVal = Number(data.totalValue) || 0;
      const prodFee = Number(data.productFee) || 10;
      const baseVal = Number(data.baseValue) || 0;
      const houseVal = Number(data.houseValue) || 0;
      const teamVal = Number(data.teamValue) || 0;
      const valPerEmp = Number(data.valuePerEmployee) || 0;

      stmt.run(
        id,
        currentQId, // Força a quinzena ativa do servidor
        createdAt,
        data.plate || '',
        data.company || '',
        data.paymentMethod || 'pix',
        totalVal,
        prodFee,
        baseVal,
        houseVal,
        teamVal,
        JSON.stringify(data.employeeIds || []),
        JSON.stringify(data.employeeAcronyms || []),
        valPerEmp
      );

      const savedWash = {
        id,
        quinzenaId: currentQId,
        createdAt,
        plate: data.plate || '',
        company: data.company || '',
        paymentMethod: data.paymentMethod || 'pix',
        totalValue: totalVal,
        productFee: prodFee,
        baseValue: baseVal,
        houseValue: houseVal,
        teamValue: teamVal,
        employeeIds: data.employeeIds || [],
        employeeAcronyms: data.employeeAcronyms || [],
        valuePerEmployee: valPerEmp,
      };

      return sendJson(res, 201, { success: true, wash: savedWash });
    }

    if (pathname.startsWith('/api/washes/') && req.method === 'DELETE') {
      const user = getAuthenticatedUser(req);
      if (user && user.role === 'funcionario') {
        return sendJson(res, 403, { error: 'Sem permissão.' });
      }
      const id = pathname.replace('/api/washes/', '');
      db.prepare('DELETE FROM washes WHERE id = ?').run(id);
      return sendJson(res, 200, { success: true, id });
    }

    if (pathname === '/api/advances' && req.method === 'POST') {
      const user = getAuthenticatedUser(req);
      if (user && user.role === 'funcionario') {
        return sendJson(res, 403, { error: 'Sem permissão.' });
      }

      const data = await parseJsonBody(req);
      const currentQId = getCurrentQuinzenaId();
      const id = data.id || `adv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const createdAt = data.createdAt || new Date().toISOString();

      const stmt = db.prepare(`
        INSERT INTO advances (id, quinzena_id, created_at, employee_id, employee_acronym, employee_name, value, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          employee_id = excluded.employee_id,
          employee_acronym = excluded.employee_acronym,
          employee_name = excluded.employee_name,
          value = excluded.value,
          note = excluded.note
      `);

      const val = Number(data.value) || 0;

      stmt.run(
        id,
        currentQId, // Força a quinzena ativa do servidor
        createdAt,
        data.employeeId,
        data.employeeAcronym || '?',
        data.employeeName || '',
        val,
        data.note || ''
      );

      const savedAdv = {
        id,
        quinzenaId: currentQId,
        createdAt,
        employeeId: data.employeeId,
        employeeAcronym: data.employeeAcronym || '?',
        employeeName: data.employeeName || '',
        value: val,
        note: data.note || '',
      };

      return sendJson(res, 201, { success: true, advance: savedAdv });
    }

    if (pathname.startsWith('/api/advances/') && req.method === 'DELETE') {
      const user = getAuthenticatedUser(req);
      if (user && user.role === 'funcionario') {
        return sendJson(res, 403, { error: 'Sem permissão.' });
      }
      const id = pathname.replace('/api/advances/', '');
      db.prepare('DELETE FROM advances WHERE id = ?').run(id);
      return sendJson(res, 200, { success: true, id });
    }

    if (pathname === '/api/employees' && req.method === 'POST') {
      const user = getAuthenticatedUser(req);
      if (user && user.role === 'funcionario') {
        return sendJson(res, 403, { error: 'Sem permissão.' });
      }

      const data = await parseJsonBody(req);
      const id = data.id || `emp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const active = data.active !== undefined ? (data.active ? 1 : 0) : 1;

      const stmt = db.prepare(`
        INSERT INTO employees (id, name, acronym, active)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          acronym = excluded.acronym,
          active = excluded.active
      `);

      stmt.run(id, data.name.trim(), data.acronym.trim().toUpperCase(), active);
      return sendJson(res, 201, { success: true, id });
    }

    // Exclusão definitiva de Funcionário
    if (pathname.startsWith('/api/employees/') && req.method === 'DELETE') {
      const user = getAuthenticatedUser(req);
      if (user && user.role === 'funcionario') {
        return sendJson(res, 403, { error: 'Sem permissão.' });
      }

      const id = pathname.replace('/api/employees/', '');
      // Desvincula contas de login associadas
      db.prepare('UPDATE users SET employee_id = NULL WHERE employee_id = ?').run(id);
      // Remove vales associados para não violar foreign key
      db.prepare('DELETE FROM advances WHERE employee_id = ?').run(id);
      // Remove da tabela de funcionários
      db.prepare('DELETE FROM employees WHERE id = ?').run(id);

      return sendJson(res, 200, { success: true, id });
    }

    if (pathname.match(/^\/api\/employees\/[^/]+\/toggle$/) && req.method === 'PATCH') {
      const user = getAuthenticatedUser(req);
      if (user && user.role === 'funcionario') {
        return sendJson(res, 403, { error: 'Sem permissão.' });
      }
      const id = pathname.split('/')[3];
      db.prepare('UPDATE employees SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
      return sendJson(res, 200, { success: true, id });
    }

    if (pathname === '/api/quinzena/close' && req.method === 'POST') {
      const user = getAuthenticatedUser(req);
      if (user && user.role === 'funcionario') {
        return sendJson(res, 403, { error: 'Sem permissão.' });
      }

      const summary = await parseJsonBody(req);
      const currentQId = getCurrentQuinzenaId();

      const stmt = db.prepare(`
        INSERT INTO closed_quinzenas (
          id, closed_at, total_revenue, total_products, total_house, total_team,
          total_advances, total_net_payable, wash_count, employees_summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        currentQId,
        new Date().toISOString(),
        Number(summary.totalRevenue) || 0,
        Number(summary.totalProducts) || 0,
        Number(summary.totalHouse) || 0,
        Number(summary.totalTeam) || 0,
        Number(summary.totalAdvances) || 0,
        Number(summary.totalNetPayable) || 0,
        Number(summary.washCount) || 0,
        JSON.stringify(summary.employeesSummary || [])
      );

      const nextQId = setNextQuinzenaId();
      return sendJson(res, 200, { success: true, closedId: currentQId, nextQuinzenaId: nextQId });
    }

    return sendJson(res, 404, { error: 'Endpoint não encontrado' });
  } catch (error) {
    console.error('Erro na API:', error);
    return sendJson(res, 500, { error: error.message || 'Erro interno no servidor' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Banco Online SQLite] Servidor com Autenticação e RBAC rodando em http://0.0.0.0:${PORT}`);
});
