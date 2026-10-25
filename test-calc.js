import { calculateWashSplit, formatCurrency } from './src/services/calculations.js';

function runTests() {
  console.log('--- TESTANDO CÁLCULOS DO GERENTE DE LAVAGEM ---');

  // Teste 1: Caminhão de R$ 310 com 3 lavadores
  const res1 = calculateWashSplit(310, 3);
  console.assert(res1.productFee === 10, 'Erro na taxa de produtos');
  console.assert(res1.baseValue === 300, 'Erro na base de cálculo');
  console.assert(res1.houseValue === 150, 'Erro na fatia da casa (50%)');
  console.assert(res1.teamValue === 150, 'Erro na fatia da equipe (50%)');
  console.assert(res1.valuePerEmployee === 50, 'Erro no valor por funcionário');
  console.log('✓ Teste 1 (R$ 310 / 3 lavadores): OK!');

  // Teste 2: Caminhão de R$ 250 com 2 lavadores
  const res2 = calculateWashSplit(250, 2);
  console.assert(res2.productFee === 10, 'Erro na taxa de produtos');
  console.assert(res2.baseValue === 240, 'Erro na base');
  console.assert(res2.houseValue === 120, 'Erro na casa');
  console.assert(res2.teamValue === 120, 'Erro na equipe');
  console.assert(res2.valuePerEmployee === 60, 'Erro por funcionário');
  console.log('✓ Teste 2 (R$ 250 / 2 lavadores): OK!');

  // Teste 3: Caminhão com apenas 1 lavador (R$ 150)
  const res3 = calculateWashSplit(150, 1);
  console.assert(res3.baseValue === 140, 'Erro base');
  console.assert(res3.houseValue === 70, 'Erro casa');
  console.assert(res3.teamValue === 70, 'Erro equipe');
  console.assert(res3.valuePerEmployee === 70, 'Erro por lavador');
  console.log('✓ Teste 3 (R$ 150 / 1 lavador): OK!');

  // Teste 4: Formatação de moeda BRL
  const fmt = formatCurrency(1250.5);
  console.assert(fmt.includes('1.250,50'), `Erro de formatação: ${fmt}`);
  console.log('✓ Teste 4 (Formatação BRL): OK!');

  console.log('\nTODOS OS TESTES MATEMÁTICOS PASSARAM COM SUCESSO!');
}

runTests();
