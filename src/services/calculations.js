// Regras de negócio e cálculos da lavagem de caminhões

export const PRODUCT_FEE = 10.0; // R$ 10,00 fixo por caminhão

/**
 * Trunca um número para 2 casas decimais sem arredondar para cima.
 * Ex: 5.6799999999 -> 5.67 | 56.6666666667 -> 56.66
 */
export function truncateToTwoDecimals(value) {
  const n = Number(value);
  if (isNaN(n) || n === 0) return 0;
  const isNegative = n < 0;
  const absN = Math.abs(n);
  const s = String(absN);

  let result = absN;
  if (s.includes('.')) {
    const [integ, dec] = s.split('.');
    result = Number(`${integ}.${dec.slice(0, 2)}`);
  }
  return isNegative ? -result : result;
}

/**
 * Calcula a divisão da lavagem
 * @param {number} totalValue - Valor bruto cobrado da lavagem
 * @param {number} employeeCount - Quantidade de funcionários participantes
 */
export function calculateWashSplit(totalValue, employeeCount) {
  const total = Number(totalValue) || 0;
  if (total <= 0) {
    return {
      totalValue: 0,
      productFee: PRODUCT_FEE,
      baseValue: 0,
      houseValue: 0,
      teamValue: 0,
      valuePerEmployee: 0,
    };
  }

  // Subtrai taxa de produtos de R$ 10,00
  const productFee = Math.min(PRODUCT_FEE, total);
  const baseValue = Math.max(0, total - productFee);

  // 50% Casa, 50% Equipe (truncado para 2 casas decimais sem arredondar)
  const houseValue = truncateToTwoDecimals(baseValue * 0.5);
  const teamValue = truncateToTwoDecimals(baseValue * 0.5);

  const count = Number(employeeCount) || 0;
  const rawPerEmp = count > 0 ? teamValue / count : 0;
  const valuePerEmployee = truncateToTwoDecimals(rawPerEmp);

  return {
    totalValue: total,
    productFee,
    baseValue,
    houseValue,
    teamValue,
    valuePerEmployee,
  };
}

/**
 * Formata valor para moeda brasileira (R$) mantendo os primeiros centavos sem arredondar para cima.
 * Ex: 5,6799999999 = R$ 5,67 | 56,6666666667 = R$ 56,66
 */
export function formatCurrency(value) {
  const n = Number(value);
  if (isNaN(n) || n === 0) return 'R$ 0,00';
  const isNegative = n < 0;
  const absN = Math.abs(n);
  const s = String(absN);

  let integerStr = '0';
  let decimalStr = '00';

  if (s.includes('.')) {
    const [integ, dec] = s.split('.');
    integerStr = Number(integ).toLocaleString('pt-BR');
    decimalStr = (dec + '00').slice(0, 2);
  } else {
    integerStr = absN.toLocaleString('pt-BR');
    decimalStr = '00';
  }

  return `${isNegative ? '- ' : ''}R$ ${integerStr},${decimalStr}`;
}

/**
 * Formata data no formato brasileiro
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formata data e hora
 */
export function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Retorna a data no formato YYYY-MM-DD local
 */
export function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retorna o dia da semana formatado em português (ex: "Segunda-feira")
 */
export function formatWeekday(dateInput) {
  if (!dateInput) return '';
  let d;
  if (typeof dateInput === 'string' && dateInput.includes('-') && !dateInput.includes('T')) {
    const [y, m, day] = dateInput.split('-').map(Number);
    d = new Date(y, m - 1, day, 12, 0, 0);
  } else {
    d = new Date(dateInput);
  }
  const name = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Formata cabeçalho completo do dia: "Segunda-feira, 20/10/2026"
 */
export function formatDayHeader(dateInput) {
  if (!dateInput) return '';
  let d;
  if (typeof dateInput === 'string' && dateInput.includes('-') && !dateInput.includes('T')) {
    const [y, m, day] = dateInput.split('-').map(Number);
    d = new Date(y, m - 1, day, 12, 0, 0);
  } else {
    d = new Date(dateInput);
  }
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  const weekdayCapitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const formattedDate = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `${weekdayCapitalized}, ${formattedDate}`;
}

/**
 * Agrupa lavagens por Semana (Semana 1 e Semana 2) e por Dia em ordem CRESCENTE.
 */
export function groupWashesByWeekAndDay(washes = []) {
  if (!washes || washes.length === 0) return [];

  const getDateKey = (w) =>
    w.serviceDate ||
    (w.date ? w.date.substring(0, 10) : '') ||
    (w.createdAt ? w.createdAt.substring(0, 10) : 'Sem Data');

  const validDates = washes
    .map(getDateKey)
    .filter((d) => d && d !== 'Sem Data' && d.includes('-'));

  // Menor data registrada na quinzena para determinar o marco inicial
  const minDateStr = validDates.length > 0 ? [...validDates].sort()[0] : null;

  const getWeekId = (dateStr) => {
    if (!dateStr || dateStr === 'Sem Data') return 'semana_1';

    if (minDateStr) {
      const d = new Date(dateStr + 'T12:00:00');
      const minD = new Date(minDateStr + 'T12:00:00');
      const diffDays = Math.floor((d - minD) / (1000 * 60 * 60 * 24));
      if (diffDays >= 7) return 'semana_2';
      return 'semana_1';
    }

    const day = parseInt(dateStr.split('-')[2], 10);
    if ((day >= 8 && day <= 15) || day >= 23) {
      return 'semana_2';
    }
    return 'semana_1';
  };

  const dayGroups = {};
  washes.forEach((w) => {
    const rawDate = getDateKey(w);
    if (!dayGroups[rawDate]) {
      dayGroups[rawDate] = [];
    }
    dayGroups[rawDate].push(w);
  });

  // Ordenação CRESCENTE (ascendente): segunda 23, terça 24, quarta 25...
  const sortedDatesAsc = Object.keys(dayGroups).sort((a, b) => {
    if (a === 'Sem Data') return 1;
    if (b === 'Sem Data') return -1;
    return a.localeCompare(b);
  });

  const week1Days = [];
  const week2Days = [];

  sortedDatesAsc.forEach((dateKey) => {
    const dayWashes = dayGroups[dateKey];
    const dayTotal = dayWashes.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);
    const dayCommission = dayWashes.reduce((sum, item) => sum + (Number(item.valuePerEmployee) || 0), 0);

    const dayObj = {
      date: dateKey,
      washes: dayWashes,
      totalValue: dayTotal,
      totalCommission: dayCommission,
      washCount: dayWashes.length,
    };

    if (getWeekId(dateKey) === 'semana_2') {
      week2Days.push(dayObj);
    } else {
      week1Days.push(dayObj);
    }
  });

  const result = [];

  if (week1Days.length > 0) {
    result.push({
      id: 'semana_1',
      label: 'Semana 1',
      days: week1Days,
      totalValue: week1Days.reduce((sum, d) => sum + d.totalValue, 0),
      totalCommission: week1Days.reduce((sum, d) => sum + d.totalCommission, 0),
      washCount: week1Days.reduce((sum, d) => sum + d.washCount, 0),
    });
  }

  if (week2Days.length > 0) {
    result.push({
      id: 'semana_2',
      label: 'Semana 2',
      days: week2Days,
      totalValue: week2Days.reduce((sum, d) => sum + d.totalValue, 0),
      totalCommission: week2Days.reduce((sum, d) => sum + d.totalCommission, 0),
      washCount: week2Days.reduce((sum, d) => sum + d.washCount, 0),
    });
  }

  return result;
}

/**
 * Calcula o status de uma meta diária ou acumulada
 * @param {number} total - Valor total de comissão realizada
 * @param {number} meta - Meta estabelecida em reais
 * Regras aprovadas:
 * - Verde: Bateu com folga (> Meta + R$ 30)
 * - Amarelo: Passou até R$ 30 da meta (Meta <= Total <= Meta + R$ 30)
 * - Vermelho: Não bateu (< Meta)
 */
export function calculateGoalStatus(total, meta) {
  const t = Number(total) || 0;
  const m = Number(meta) || 0;

  if (m <= 0) {
    return {
      status: 'none',
      label: 'Definir Meta',
      shortLabel: 'Sem Meta',
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.1)',
      border: '#334155',
      diff: 0,
      missing: 0,
    };
  }

  const diff = truncateToTwoDecimals(t - m);

  if (t < m) {
    const missing = truncateToTwoDecimals(m - t);
    return {
      status: 'red',
      label: `Não bateu (Faltou ${formatCurrency(missing)})`,
      shortLabel: `Faltou ${formatCurrency(missing)}`,
      color: '#f87171',
      bg: 'rgba(239, 68, 68, 0.18)',
      border: '#ef4444',
      diff,
      missing,
    };
  }

  if (t <= m + 30) {
    return {
      status: 'yellow',
      label: `Passou até R$ 30 (+${formatCurrency(diff)})`,
      shortLabel: `Meta batida (+${formatCurrency(diff)})`,
      color: '#fbbf24',
      bg: 'rgba(245, 158, 11, 0.2)',
      border: '#f59e0b',
      diff,
      missing: 0,
    };
  }

  return {
    status: 'green',
    label: `Bateu com folga (+${formatCurrency(diff)})`,
    shortLabel: `Bateu com folga (+${formatCurrency(diff)})`,
    color: '#34d399',
    bg: 'rgba(16, 185, 129, 0.2)',
    border: '#10b981',
    diff,
    missing: 0,
  };
}

