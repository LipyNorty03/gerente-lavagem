// Serviço de Comunicação com o Banco Online com Autenticação e Perfis (CEO, Gerente, Funcionário)
import * as localFallback from './storage';

export function getApiBase() {
  // Se estiver rodando dentro do app nativo Android (Capacitor)
  const isCapacitor = typeof window !== 'undefined' && (
    window.location.protocol === 'capacitor:' || 
    (window.location.hostname === 'localhost' && window.location.port === '')
  );

  if (isCapacitor) {
    const custom = localStorage.getItem('gl_server_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/$/, '') + '/api';
    }
    return 'https://gentle-crabs-change.loca.lt/api';
  }

  // Em qualquer navegador web, PWA ou via túnel loca.lt: sempre use '/api' relativo ao próprio host
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

// 2. STATUS DO SERVIDOR
export async function checkServerStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
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
    // Logout local mesmo offline
  }
  clearSession();
}

// 4. PORTAL EXCLUSIVO DO FUNCIONÁRIO (Somente seus dados)
export async function fetchMyPortalData() {
  const res = await fetch(`${getApiBase()}/my-portal`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Erro ao carregar dados do funcionário.');
  }
  return res.json();
}

// 5. GESTÃO DE USUÁRIOS E CARGOS (EXCLUSIVO CEO)
export async function fetchUsers() {
  const res = await fetch(`${getApiBase()}/users`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json();
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
    const online = await checkServerStatus();
    if (online) {
      const res = await fetch(`${getApiBase()}/data`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('gl_employees', JSON.stringify(data.employees));
        localStorage.setItem('gl_washes', JSON.stringify(data.washes));
        localStorage.setItem('gl_advances', JSON.stringify(data.advances));
        localStorage.setItem('gl_closed_quinzenas', JSON.stringify(data.closedQuinzenas));
        localStorage.setItem('gl_current_quinzena_id', data.currentQuinzenaId);
        return { ...data, source: 'cloud' };
      }
    }
  } catch (err) {
    console.warn('Usando dados em cache local:', err);
  }

  // Fallback Local
  return {
    source: 'local',
    currentQuinzenaId: localFallback.getCurrentQuinzenaId(),
    employees: localFallback.getEmployees(),
    washes: localFallback.getCurrentWashes(),
    advances: localFallback.getCurrentAdvances(),
    closedQuinzenas: localFallback.getClosedQuinzenas(),
  };
}

// 7. AÇÕES OPERACIONAIS (LAVAGENS, VALES, EQUIPE, FECHAMENTO)
export async function apiSaveWash(washData) {
  let localWash = localFallback.saveWash(washData);
  try {
    const res = await fetch(`${getApiBase()}/washes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(localWash),
    });
    if (res.ok) {
      isOnline = true;
      const json = await res.json();
      if (json.wash) {
        localWash = localFallback.saveWash(json.wash);
      }
    }
  } catch (err) {
    console.warn('Salvo localmente (offline):', err);
  }
  return localWash;
}

export async function apiDeleteWash(id) {
  localFallback.deleteWash(id);
  try {
    const res = await fetch(`${getApiBase()}/washes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.ok) isOnline = true;
  } catch (err) {
    console.warn('Erro ao excluir no banco online:', err);
  }
}

export async function apiSaveAdvance(advData) {
  let localAdv = localFallback.saveAdvance(advData);
  try {
    const res = await fetch(`${getApiBase()}/advances`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(localAdv),
    });
    if (res.ok) {
      isOnline = true;
      const json = await res.json();
      if (json.advance) {
        localAdv = localFallback.saveAdvance(json.advance);
      }
    }
  } catch (err) {
    console.warn('Vale salvo localmente (offline):', err);
  }
  return localAdv;
}

export async function apiDeleteAdvance(id) {
  localFallback.deleteAdvance(id);
  try {
    const res = await fetch(`${getApiBase()}/advances/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.ok) isOnline = true;
  } catch (err) {
    console.warn('Erro ao excluir vale no banco online:', err);
  }
}

export async function apiSaveEmployee(empData) {
  let localEmp = localFallback.saveEmployee(empData);
  try {
    const res = await fetch(`${getApiBase()}/employees`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(localEmp),
    });
    if (res.ok) {
      isOnline = true;
      const json = await res.json();
      if (json.id) {
        localEmp.id = json.id;
      }
    }
  } catch (err) {
    console.warn('Funcionário salvo localmente (offline):', err);
  }
  return localEmp;
}

export async function apiToggleEmployeeActive(id) {
  const updated = localFallback.toggleEmployeeActive(id);
  try {
    const res = await fetch(`${getApiBase()}/employees/${id}/toggle`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (res.ok) isOnline = true;
  } catch (err) {
    console.warn('Status alternado localmente:', err);
  }
  return updated;
}

export async function apiDeleteEmployee(id) {
  const updated = localFallback.deleteEmployee(id);
  try {
    const res = await fetch(`${getApiBase()}/employees/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.ok) isOnline = true;
  } catch (err) {
    console.warn('Erro ao excluir funcionário no servidor:', err);
  }
  return updated;
}

export async function apiCloseQuinzena(summary) {
  const localRecord = localFallback.closeCurrentQuinzena(summary);
  try {
    const res = await fetch(`${getApiBase()}/quinzena/close`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(summary),
    });
    if (res.ok) isOnline = true;
  } catch (err) {
    console.warn('Quinzena fechada localmente:', err);
  }
  return localRecord;
}
