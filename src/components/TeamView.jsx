import React, { useState } from 'react';
import { Users, UserPlus, Check, Power, Edit3, Trash2 } from 'lucide-react';

export function TeamView({ employees, onSaveEmployee, onToggleActive, onDeleteEmployee }) {
  const [name, setName] = useState('');
  const [acronym, setAcronym] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Sugere sigla a partir do nome se o campo de sigla estiver vazio
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setName(newName);
    if (!editingId && !acronym) {
      const parts = newName.trim().split(' ');
      if (parts.length >= 2) {
        setAcronym((parts[0][0] + parts[1][0]).toUpperCase());
      } else if (parts[0] && parts[0].length >= 2) {
        setAcronym(parts[0].substring(0, 2).toUpperCase());
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Informe o nome do funcionário.');
      return;
    }
    if (!acronym.trim()) {
      alert('Informe a sigla do funcionário.');
      return;
    }

    onSaveEmployee({
      id: editingId,
      name: name.trim(),
      acronym: acronym.trim().toUpperCase(),
    });

    setName('');
    setAcronym('');
    setEditingId(null);
  };

  const handleEdit = (emp) => {
    setEditingId(emp.id);
    setName(emp.name);
    setAcronym(emp.acronym);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setAcronym('');
  };

  return (
    <div>
      {/* Formulário de Adicionar / Editar */}
      <form onSubmit={handleSubmit} className="card">
        <div className="card-title">
          <img
            src="/icons/role-worker.png"
            alt="Novo Funcionário"
            style={{ width: 26, height: 26, objectFit: 'contain' }}
          />
          {editingId ? 'Editar Funcionário' : 'Novo Funcionário'}
        </div>

        <div className="form-group">
          <label className="form-label">Nome Completo</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ex: Carlos Silva"
            value={name}
            onChange={handleNameChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Sigla Identificadora (2 a 3 letras)</label>
          <input
            type="text"
            className="input-field plate-input"
            style={{ width: '140px', textAlign: 'center', fontSize: '1.2rem' }}
            placeholder="CS"
            maxLength={3}
            value={acronym}
            onChange={(e) => setAcronym(e.target.value.toUpperCase())}
          />
          <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 4 }}>
            Esta sigla aparecerá nos botões de lançamento rápido no pátio.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {editingId && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancelEdit}
            >
              Cancelar
            </button>
          )}
          <button type="submit" className="btn-primary">
            <Check size={20} />
            {editingId ? 'SALVAR ALTERAÇÃO' : 'CADASTRAR FUNCIONÁRIO'}
          </button>
        </div>
      </form>

      {/* Lista de Funcionários Cadastrados */}
      <div className="card">
        <div className="card-title">
          <img
            src="/icons/nav-team.png"
            alt="Equipe"
            style={{ width: 26, height: 26, objectFit: 'contain' }}
          />
          Equipe Cadastrada ({employees.length})
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {employees.map((emp) => (
            <div
              key={emp.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                backgroundColor: '#0f172a',
                borderRadius: '12px',
                border: '1px solid #24334d',
                opacity: emp.active ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    backgroundColor: emp.active ? '#064e3b' : '#334155',
                    color: emp.active ? '#34d399' : '#94a3b8',
                    border: `1px solid ${emp.active ? '#10b981' : '#475569'}`,
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    minWidth: '50px',
                    textAlign: 'center',
                  }}
                >
                  {emp.acronym}
                </span>

                <div>
                  <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                    {emp.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: emp.active ? '#10b981' : '#64748b' }}>
                    {emp.active ? '● Ativo no pátio' : '○ Inativo'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="action-btn"
                  title="Editar dados"
                  onClick={() => handleEdit(emp)}
                >
                  <Edit3 size={15} />
                </button>
                <button
                  type="button"
                  className="action-btn"
                  title={emp.active ? 'Desativar' : 'Ativar'}
                  style={{ color: emp.active ? '#10b981' : '#94a3b8' }}
                  onClick={() => onToggleActive(emp.id)}
                >
                  <Power size={15} />
                </button>
                <button
                  type="button"
                  className="action-btn delete"
                  title="Excluir funcionário"
                  onClick={() => {
                    if (confirm(`Deseja realmente excluir "${emp.name}" [${emp.acronym}] da equipe?`)) {
                      onDeleteEmployee(emp.id);
                    }
                  }}
                >
                  <Trash2 size={15} color="#f87171" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
