// Regras de negócio e cálculos da lavagem de caminhões

export const PRODUCT_FEE = 10.0; // R$ 10,00 fixo por caminhão

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

  // 50% Casa, 50% Equipe
  const houseValue = baseValue * 0.5;
  const teamValue = baseValue * 0.5;

  const count = Number(employeeCount) || 0;
  const valuePerEmployee = count > 0 ? teamValue / count : 0;

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
 * Formata valor para moeda brasileira (R$)
 */
export function formatCurrency(value) {
  return (Number(value) || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
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
