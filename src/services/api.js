// Serviço de Comunicação Direta com o Banco de Dados Central Online
// Centraliza todas as operações no servidor (Render / PostgreSQL / Node)

export function getApiBase() {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('gl_server_url') : null;
  if (custom && custom.trim() && !custom.includes('loca.lt')) {
    return custom.trim().replace(/\/$/, '') + '/api';
  }

  // Em qualquer navegador web, PWA ou Render: sempre usa '/api' relativo ao domínio atual
  return '/api';
}

const TOKEN_KEY = 'gl_auth_token';
const USER_KEY = 'gl_auth_user';

let isOnline = false;

// 1. GERENCIAMENTO DE TOKEN E SESSÃO
export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getAuthHeaders() {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// 2. STATUS DO SERVIDOR CENTRAL
export async function checkServerStatus() {
  try {
    const controller = new AbortController();
    // Timeout de 10s para permitir acordar instâncias em cold-start no Render
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${getApiBase()}/status`, { signal: controller.signal });
    clearTimeout(timeoutId);
    isOnline = res.ok;
    return isOnline;
  } catch {
    isOnline = false;
    return false;
  }
}

export function getIsOnline() {
  return isOnline;
}

// 3. LOGIN & LOGOUT
export async function apiLogin(username, password) {
  const res = await fetch(`${getApiBase()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao autenticar.');
  }

  setSession(data.token, data.user);
  return data.user;
}

export async function apiLogout() {
  try {
    await fetch(`${getApiBase()}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch {
    // Continua para limpar a sessão mesmo offline
  }
  clearSession();
}

// 4. PORTAL EXCLUSIVO DO FUNCIONÁRIO (Somente seus dados)
export async function fetchMyPortalData() {
  const res = await fetch(`${getApiBase()}/my-portal`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
      window.location.reload();
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao carregar dados do funcionário.');
  }
  return res.json();
}

// 5. GESTÃO DE USUÁRIOS E CARGOS (EXCLUSIVO CEO)
export async function fetchUsers() {
  const res = await fetch(`${getApiBase()}/users`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao carregar usuários.');
  }
  const data = await res.json();
  return data.users || [];
}

export async function apiSaveUser(userData) {
  const res = await fetch(`${getApiBase()}/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(userData),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao salvar usuário.');
  }
  return data;
}

export async function apiDeleteUser(id) {
  const res = await fetch(`${getApiBase()}/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao excluir usuário.');
  }
  return data;
}

// 6. CARREGAR DADOS OPERACIONAIS (Gerente e CEO)
export async function fetchAllData() {
  try {
    const res = await fetch(`${getApiBase()}/data`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      isOnline = true;
      // Salva cópia local apenas para leitura temporária em caso de queda de rede
      localStorage.setItem('gl_employees', JSON.stringify(data.employees || []));
      localStorage.setItem('gl_washes', JSON.stringify(data.washes || []));
      localStorage.setItem('gl_advances', JSON.stringify(data.advances || []));
      localStorage.setItem('gl_closed_quinzenas', JSON.stringify(data.closedQuinzenas || []));
      localStorage.setItem('gl_current_quinzena_id', data.currentQuinzenaId || 'q_default');
      return { ...data, source: 'cloud' };
    } else if (res.status === 401) {
      clearSession();
      window.location.reload();
      throw new Error('Sessão expirada. Faça login novamente.');
    }
  } catch (err) {
    console.warn('Banco central indisponível no momento:', err);
  }

  isOnline = false;
  // Fallback de cache local da última sincronização real
  try {
    const employees = JSON.parse(localStorage.getItem('gl_employees') || '[]');
    const washes = JSON.parse(localStorage.getItem('gl_washes') || '[]');
    const advances = JSON.parse(localStorage.getItem('gl_advances') || '[]');
    const closedQuinzenas = JSON.parse(localStorage.getItem('gl_closed_quinzenas') || '[]');
    const currentQuinzenaId = localStorage.getItem('gl_current_quinzena_id') || 'q_default';
    return {
      source: 'local',
      currentQuinzenaId,
      employees,
      washes,
      advances,
      closedQuinzenas,
    };
  } catch {
    return {
      source: 'local',
      currentQuinzenaId: 'q_default',
      employees: [],
      washes: [],
      advances: [],
      closedQuinzenas: [],
    };
  }
}

// 7. AÇÕES OPERACIONAIS (DIRETO NO BANCO CENTRAL)
export async function apiSaveWash(washData) {
  const res = await fetch(`${getApiBase()}/washes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(washData),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao registrar lavagem no banco central.');
  }

  isOnline = true;
  return json.wash || json;
}

export async function apiDeleteWash(id) {
  const res = await fetch(`${getApiBase()}/washes/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || 'Erro ao excluir lavagem no banco central.');
  }
  isOnline = true;
}

export async function apiSaveAdvance(advData) {
  const res = await fetch(`${getApiBase()}/advances`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(advData),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao registrar vale no banco central.');
  }

  isOnline = true;
  return json.advance || json;
}

export async function apiDeleteAdvance(id) {
  const res = await fetch(`${getApiBase()}/advances/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || 'Erro ao excluir vale no banco central.');
  }
  isOnline = true;
}

export async function apiSaveEmployee(empData) {
  const res = await fetch(`${getApiBase()}/employees`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(empData),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao registrar funcionário no banco central.');
  }

  isOnline = true;
  return json;
}

export async function apiToggleEmployeeActive(id) {
  const res = await fetch(`${getApiBase()}/employees/${id}/toggle`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao alterar status do funcionário.');
  }
  isOnline = true;
  return json.employees;
}

export async function apiDeleteEmployee(id) {
  const res = await fetch(`${getApiBase()}/employees/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || 'Erro ao remover funcionário no banco central.');
  }
  isOnline = true;
}

export async function apiCloseQuinzena(summary) {
  const res = await fetch(`${getApiBase()}/quinzena/close`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(summary),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao fechar quinzena no banco central.');
  }
  isOnline = true;
  return json;
}
