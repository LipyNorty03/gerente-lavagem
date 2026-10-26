import React, { useState } from 'react';
import { DollarSign, Check, Calendar } from 'lucide-react';
import { formatCurrency, getTodayDateString, formatWeekday } from '../services/calculations';

export function AdvanceForm({ employees, onSaveAdvance }) {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [advanceDate, setAdvanceDate] = useState(() => getTodayDateString());

  const addQuickValue = (val) => {
    const current = Number(value) || 0;
    setValue(String(current + val));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const valNum = Number(value);

    if (!selectedEmpId) {
      alert('Por favor, selecione o funcionário.');
      return;
    }

    if (!valNum || valNum <= 0) {
      alert('Por favor, informe o valor do vale.');
      return;
    }

    const emp = employees.find((e) => e.id === selectedEmpId);

    onSaveAdvance({
      employeeId: selectedEmpId,
      employeeAcronym: emp?.acronym || '?',
      employeeName: emp?.name || '',
      value: valNum,
      note: note.trim(),
      advanceDate: advanceDate || getTodayDateString(),
    });

    setValue('');
    setNote('');
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="card-title">
        <img
          src="/icons/nav-advance.png"
          alt="Vale"
          style={{ width: 26, height: 26, objectFit: 'contain' }}
        />
        Lançar Vale / Adiantamento
      </div>

      {/* Data do Vale */}
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>
            Data do Vale
          </label>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fbbf24' }}>
            📅 {formatWeekday(advanceDate)}
          </span>
        </div>
        <div style={{ position: 'relative', marginTop: 6 }}>
          <input
            type="date"
            className="input-field"
            value={advanceDate}
            onChange={(e) => setAdvanceDate(e.target.value)}
            required
            style={{
              paddingLeft: 40,
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 700,
            }}
          />
          <Calendar
            size={18}
            color="#fbbf24"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* Seleção do Funcionário por Sigla */}
      <div className="form-group">
        <label className="form-label">Funcionário</label>
        <div className="acronyms-grid">
          {employees
            .filter((e) => e.active)
            .map((emp) => {
              const isSelected = selectedEmpId === emp.id;
              return (
                <button
                  key={emp.id}
                  type="button"
                  className={`acronym-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedEmpId(emp.id)}
                >
                  <span className="acronym-badge">{emp.acronym}</span>
                  <span className="acronym-name">{emp.name.split(' ')[0]}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Valor do Vale */}
      <div className="form-group">
        <label className="form-label">Valor do Vale (R$)</label>
        <div className="money-input-wrapper">
          <span className="money-prefix">R$</span>
          <input
            type="number"
            step="any"
            className="input-field money-input"
            style={{ color: '#f59e0b' }}
            placeholder="0,00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
          />
        </div>
        <div className="quick-values">
          <button type="button" className="quick-value-btn" onClick={() => addQuickValue(20)}>
            + R$ 20
          </button>
          <button type="button" className="quick-value-btn" onClick={() => addQuickValue(50)}>
            + R$ 50
          </button>
          <button type="button" className="quick-value-btn" onClick={() => addQuickValue(100)}>
            + R$ 100
          </button>
          <button type="button" className="quick-value-btn" onClick={() => setValue('')}>
            Limpar
          </button>
        </div>
      </div>

      {/* Observação / Motivo */}
      <div className="form-group">
        <label className="form-label">Motivo (Opcional)</label>
        <input
          type="text"
          className="input-field"
          placeholder="Ex: Almoço, Passagem, Farmácia..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="btn-primary"
        style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
      >
        <Check size={20} />
        REGISTRAR VALE
      </button>
    </form>
  );
}
