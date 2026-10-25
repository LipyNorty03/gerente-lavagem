// Gerenciamento de persistência local 100% offline (LocalStorage)

const STORAGE_KEYS = {
  EMPLOYEES: 'gl_employees',
  CURRENT_QUINZENA_ID: 'gl_current_quinzena_id',
  WASHES: 'gl_washes',
  ADVANCES: 'gl_advances',
  CLOSED_QUINZENAS: 'gl_closed_quinzenas',
};

// Funcionários iniciais de exemplo para uso imediato
const DEFAULT_EMPLOYEES = [
  { id: 'emp_1', name: 'Carlos Silva', acronym: 'CS', active: true },
  { id: 'emp_2', name: 'João Santos', acronym: 'JO', active: true },
  { id: 'emp_3', name: 'Marcelo Andrade', acronym: 'MA', active: true },
  { id: 'emp_4', name: 'Roberto Lima', acronym: 'RL', active: true },
];

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function getCurrentQuinzenaId() {
  let id = localStorage.getItem(STORAGE_KEYS.CURRENT_QUINZENA_ID);
  if (!id) {
    id = generateId('q');
    localStorage.setItem(STORAGE_KEYS.CURRENT_QUINZENA_ID, id);
  }
  return id;
}

// EMPLOYEES
export function getEmployees() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(DEFAULT_EMPLOYEES));
      return DEFAULT_EMPLOYEES;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Erro ao ler funcionários:', err);
    return DEFAULT_EMPLOYEES;
  }
}

export function saveEmployee(employee) {
  const employees = getEmployees();
  if (employee.id) {
    // Atualização
    const updated = employees.map((e) => (e.id === employee.id ? { ...e, ...employee } : e));
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updated));
    return employee;
  } else {
    // Novo
    const newEmp = {
      id: generateId('emp'),
      name: employee.name.trim(),
      acronym: employee.acronym.trim().toUpperCase(),
      active: true,
    };
    employees.push(newEmp);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    return newEmp;
  }
}

export function toggleEmployeeActive(id) {
  const employees = getEmployees();
  const updated = employees.map((e) => (e.id === id ? { ...e, active: !e.active } : e));
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updated));
  return updated;
}

export function deleteEmployee(id) {
  const employees = getEmployees();
  const updated = employees.filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(updated));
  return updated;
}

// WASHES
export function getAllWashes() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.WASHES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getCurrentWashes() {
  const qId = getCurrentQuinzenaId();
  const all = getAllWashes();
  return all.filter((w) => w.quinzenaId === qId);
}

export function saveWash(washData) {
  const all = getAllWashes();
  const qId = getCurrentQuinzenaId();

  if (washData.id) {
    // Atualização
    const index = all.findIndex((w) => w.id === washData.id);
    if (index !== -1) {
      all[index] = { ...all[index], ...washData };
    }
    localStorage.setItem(STORAGE_KEYS.WASHES, JSON.stringify(all));
    return all[index];
  } else {
    // Nova lavagem
    const newWash = {
      id: generateId('wash'),
      quinzenaId: qId,
      createdAt: new Date().toISOString(),
      ...washData,
    };
    all.unshift(newWash); // mais recente primeiro
    localStorage.setItem(STORAGE_KEYS.WASHES, JSON.stringify(all));
    return newWash;
  }
}

export function deleteWash(id) {
  const all = getAllWashes();
  const filtered = all.filter((w) => w.id !== id);
  localStorage.setItem(STORAGE_KEYS.WASHES, JSON.stringify(filtered));
  return filtered;
}

// ADVANCES (VALES)
export function getAllAdvances() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ADVANCES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getCurrentAdvances() {
  const qId = getCurrentQuinzenaId();
  const all = getAllAdvances();
  return all.filter((a) => a.quinzenaId === qId);
}

export function saveAdvance(advanceData) {
  const all = getAllAdvances();
  const qId = getCurrentQuinzenaId();

  if (advanceData.id) {
    const index = all.findIndex((a) => a.id === advanceData.id);
    if (index !== -1) {
      all[index] = { ...all[index], ...advanceData };
    }
    localStorage.setItem(STORAGE_KEYS.ADVANCES, JSON.stringify(all));
    return all[index];
  } else {
    const newAdvance = {
      id: generateId('adv'),
      quinzenaId: qId,
      createdAt: new Date().toISOString(),
      ...advanceData,
    };
    all.unshift(newAdvance);
    localStorage.setItem(STORAGE_KEYS.ADVANCES, JSON.stringify(all));
    return newAdvance;
  }
}

export function deleteAdvance(id) {
  const all = getAllAdvances();
  const filtered = all.filter((a) => a.id !== id);
  localStorage.setItem(STORAGE_KEYS.ADVANCES, JSON.stringify(filtered));
  return filtered;
}

// FECHAMENTO DA QUINZENA
export function getClosedQuinzenas() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CLOSED_QUINZENAS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function closeCurrentQuinzena(summary) {
  const currentQId = getCurrentQuinzenaId();
  const closedList = getClosedQuinzenas();

  const closedRecord = {
    id: currentQId,
    closedAt: new Date().toISOString(),
    ...summary,
  };

  closedList.unshift(closedRecord);
  localStorage.setItem(STORAGE_KEYS.CLOSED_QUINZENAS, JSON.stringify(closedList));

  // Gera novo ID para a próxima quinzena
  const nextQId = generateId('q');
  localStorage.setItem(STORAGE_KEYS.CURRENT_QUINZENA_ID, nextQId);

  return closedRecord;
}

// SUGESTÕES DE EMPRESAS FREQUENTES
export function getRecentCompanies() {
  const washes = getAllWashes();
  const companies = new Set();
  washes.forEach((w) => {
    if (w.company && w.company.trim()) {
      companies.add(w.company.trim());
    }
  });
  return Array.from(companies).slice(0, 15);
}
