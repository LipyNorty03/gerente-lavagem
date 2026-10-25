import React, { useState, useEffect, useMemo } from 'react';
import { Truck, Check, Sparkles, Building, CreditCard, RotateCcw } from 'lucide-react';
import { calculateWashSplit, formatCurrency } from '../services/calculations';
import { getRecentCompanies } from '../services/storage';

const PAYMENT_METHODS = [
  { id: 'pix', label: 'Pix', png: '/icons/payment-pix.png' },
  { id: 'dinheiro', label: 'Dinheiro', png: '/icons/payment-cash.png' },
  { id: 'cartao', label: 'Cartão', png: '/icons/payment-card.png' },
  { id: 'prazo', label: 'A Prazo', png: '/icons/payment-invoice.png' },
];

export function WashForm({ employees, onSaveWash, editingWash, onCancelEdit }) {
  const [plate, setPlate] = useState('');
  const [company, setCompany] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [totalValue, setTotalValue] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [recentCompanies, setRecentCompanies] = useState([]);

  useEffect(() => {
    setRecentCompanies(getRecentCompanies());
  }, []);

  // Se estiver em modo de edição
  useEffect(() => {
    if (editingWash) {
      setPlate(editingWash.plate || '');
      setCompany(editingWash.company || '');
      setPaymentMethod(editingWash.paymentMethod || 'pix');
      setTotalValue(String(editingWash.totalValue || ''));
      setSelectedEmpIds(editingWash.employeeIds || []);
    } else {
      // Se tiver funcionários ativos e nenhum selecionado, começa vazio para o gerente escolher
      setSelectedEmpIds([]);
    }
  }, [editingWash]);

  // Alterna funcionário ao tocar na sigla
  const toggleEmployee = (empId) => {
    if (navigator.vibrate) navigator.vibrate(15);
    setSelectedEmpIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  // Selecionar todos os funcionários ativos com um toque
  const selectAllEmployees = () => {
    const activeIds = employees.filter((e) => e.active).map((e) => e.id);
    setSelectedEmpIds(activeIds);
  };

  // Limpar seleção
  const clearSelection = () => {
    setSelectedEmpIds([]);
  };

  // Adicionar valor rápido
  const addQuickValue = (val) => {
    const current = Number(totalValue) || 0;
    setTotalValue(String(current + val));
  };

  // Cálculo em tempo real memoizado
  const split = useMemo(
    () => calculateWashSplit(totalValue, selectedEmpIds.length),
    [totalValue, selectedEmpIds.length]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const valueNum = Number(totalValue);

    if (!valueNum || valueNum <= 0) {
      alert('Por favor, informe o valor da lavagem.');
      return;
    }

    if (selectedEmpIds.length === 0) {
      alert('Por favor, selecione pelo menos uma sigla de funcionário que participou.');
      return;
    }

    const selectedEmployees = employees.filter((e) => selectedEmpIds.includes(e.id));
    const acronyms = selectedEmployees.map((e) => e.acronym);

    const washData = {
      plate: plate.trim().toUpperCase(),
      company: company.trim(),
      paymentMethod,
      totalValue: valueNum,
      productFee: split.productFee,
      baseValue: split.baseValue,
      houseValue: split.houseValue,
      teamValue: split.teamValue,
      employeeIds: selectedEmpIds,
      employeeAcronyms: acronyms,
      valuePerEmployee: split.valuePerEmployee,
    };

    if (editingWash) {
      washData.id = editingWash.id;
      washData.createdAt = editingWash.createdAt;
    }

    onSaveWash(washData);

    // Limpa para a próxima lavagem
    if (!editingWash) {
      setPlate('');
      setCompany('');
      setTotalValue('');
      setSelectedEmpIds([]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="card-title">
        <img
          src="/icons/logo-truck.png"
          alt="Caminhão"
          style={{ width: 28, height: 28, objectFit: 'contain' }}
        />
        {editingWash ? 'Editar Lavagem' : 'Registrar Nova Lavagem'}
      </div>

      {/* Placa do Caminhão */}
      <div className="form-group">
        <label className="form-label">Placa do Caminhão</label>
        <input
          type="text"
          className="input-field plate-input"
          placeholder="ABC-1234 / BRA2E19"
          value={plate}
          maxLength={8}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          autoCapitalize="characters"
        />
      </div>

      {/* Empresa / Frotista */}
      <div className="form-group">
        <label className="form-label">Empresa / Frotista</label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Ex: Transportadora Sol, Autônomo..."
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        {recentCompanies.length > 0 && !company && (
          <div className="quick-values" style={{ marginTop: 6 }}>
            {recentCompanies.slice(0, 4).map((comp) => (
              <button
                key={comp}
                type="button"
                className="quick-value-btn"
                onClick={() => setCompany(comp)}
              >
                {comp}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Forma de Pagamento */}
      <div className="form-group">
        <label className="form-label">Forma de Pagamento</label>
        <div className="payment-methods-grid">
          {PAYMENT_METHODS.map((pm) => (
            <button
              key={pm.id}
              type="button"
              className={`payment-btn ${paymentMethod === pm.id ? 'selected' : ''}`}
              onClick={() => setPaymentMethod(pm.id)}
            >
              <img
                src={pm.png}
                alt={pm.label}
                style={{ width: 20, height: 20, objectFit: 'contain' }}
              />
              {pm.label}
            </button>
          ))}
        </div>
      </div>

      {/* Valor Total da Lavagem */}
      <div className="form-group">
        <label className="form-label">Valor Cobrado (R$)</label>
        <div className="money-input-wrapper">
          <span className="money-prefix">R$</span>
          <input
            type="number"
            step="any"
            className="input-field money-input"
            placeholder="0,00"
            value={totalValue}
            onChange={(e) => setTotalValue(e.target.value)}
            inputMode="decimal"
          />
        </div>
        <div className="quick-values">
          <button type="button" className="quick-value-btn" onClick={() => addQuickValue(50)}>
            + R$ 50
          </button>
          <button type="button" className="quick-value-btn" onClick={() => addQuickValue(100)}>
            + R$ 100
          </button>
          <button type="button" className="quick-value-btn" onClick={() => addQuickValue(200)}>
            + R$ 200
          </button>
          <button type="button" className="quick-value-btn" onClick={() => setTotalValue('')}>
            Limpar
          </button>
        </div>
      </div>

      {/* Seleção por Siglas dos Funcionários */}
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>
            Lavadores (Toque na Sigla)
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={selectAllEmployees}
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Todos
            </button>
            <span style={{ color: '#475569' }}>|</span>
            <button
              type="button"
              onClick={clearSelection}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Limpar
            </button>
          </div>
        </div>

        {employees.length === 0 ? (
          <p style={{ color: '#f59e0b', fontSize: '0.85rem', marginTop: 8 }}>
            Nenhum funcionário cadastrado. Vá na aba "Equipe" para cadastrar as siglas.
          </p>
        ) : (
          <div className="acronyms-grid">
            {employees
              .filter((e) => e.active)
              .map((emp) => {
                const isSelected = selectedEmpIds.includes(emp.id);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    className={`acronym-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleEmployee(emp.id)}
                  >
                    <span className="acronym-badge">{emp.acronym}</span>
                    <span className="acronym-name">{emp.name.split(' ')[0]}</span>
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* Preview do Cálculo em Tempo Real */}
      <div className="split-preview-card">
        <div className="split-header">
          <span>Rateio da Lavagem</span>
          <span>{selectedEmpIds.length} lavador(es) selecionado(s)</span>
        </div>

        <div className="split-grid">
          <div className="split-item">
            <div className="split-label">Produtos</div>
            <div className="split-value" style={{ color: '#f59e0b' }}>
              {formatCurrency(split.productFee)}
            </div>
          </div>
          <div className="split-item">
            <div className="split-label">Casa (50%)</div>
            <div className="split-value" style={{ color: '#38bdf8' }}>
              {formatCurrency(split.houseValue)}
            </div>
          </div>
          <div className="split-item">
            <div className="split-label">Equipe (50%)</div>
            <div className="split-value" style={{ color: '#a7f3d0' }}>
              {formatCurrency(split.teamValue)}
            </div>
          </div>
        </div>

        <div className="split-highlight">
          <span className="split-highlight-text">Comissão p/ cada lavador:</span>
          <span className="split-highlight-value">{formatCurrency(split.valuePerEmployee)}</span>
        </div>
      </div>

      {/* Botões de Submissão */}
      <button type="submit" className="btn-primary">
        <Check size={22} />
        {editingWash ? 'SALVAR ALTERAÇÕES' : 'REGISTRAR LAVAGEM'}
      </button>

      {editingWash && (
        <button
          type="button"
          onClick={onCancelEdit}
          className="btn-secondary"
          style={{ marginTop: 10 }}
        >
          <RotateCcw size={18} /> Cancelar Edição
        </button>
      )}
    </form>
  );
}
