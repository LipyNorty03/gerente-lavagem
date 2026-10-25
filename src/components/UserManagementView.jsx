import React, { useState, useEffect, useCallback } from 'react';
import { Shield, UserPlus, Key, Trash2, Edit2, Check, UserCheck, AlertCircle } from 'lucide-react';
import { fetchUsers, apiSaveUser, apiDeleteUser } from '../services/api';

export function UserManagementView({ currentUser, employees }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Formulário
  const [editingId, setEditingId] = useState(null);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('funcionario');
  const [employeeId, setEmployeeId] = useState('');

  const loadUsersList = useCallback(async () => {
    try {
      const list = await fetchUsers();
      setUsers(list);
    } catch (err) {
      setError(err.message || 'Erro ao carregar usuários.');
    }
  }, []);

  useEffect(() => {
    loadUsersList();
  }, [loadUsersList]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || !name.trim()) {
      setError('Preencha nome e usuário.');
      return;
    }

    if (!editingId && !password) {
      setError('Informe a senha para o novo usuário.');
      return;
    }

    if (role === 'funcionario' && !employeeId) {
      setError('Selecione a qual funcionário da equipe esta conta pertence.');
      return;
    }

    setLoading(true);

    try {
      await apiSaveUser({
        id: editingId,
        username: username.trim().toLowerCase(),
        name: name.trim(),
        password: password || undefined,
        role,
        employeeId: role === 'funcionario' ? employeeId : null,
      });

      setSuccess(editingId ? 'Usuário e permissões atualizados!' : 'Novo usuário cadastrado!');
      setEditingId(null);
      setUsername('');
      setName('');
      setPassword('');
      setRole('funcionario');
      setEmployeeId('');
      await loadUsersList();
    } catch (err) {
      setError(err.message || 'Erro ao salvar usuário.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (u) => {
    setEditingId(u.id);
    setUsername(u.username);
    setName(u.name);
    setPassword('');
    setRole(u.role);
    setEmployeeId(u.employeeId || '');
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setUsername('');
    setName('');
    setPassword('');
    setRole('funcionario');
    setEmployeeId('');
    setError('');
    setSuccess('');
  };

  const handleDelete = async (u) => {
    if (confirm(`Deseja realmente excluir o acesso de "${u.name}" (${u.username})?`)) {
      try {
        await apiDeleteUser(u.id);
        setSuccess('Usuário excluído.');
        await loadUsersList();
      } catch (err) {
        setError(err.message || 'Erro ao excluir usuário.');
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          backgroundColor: '#1e3a8a',
          color: '#60a5fa',
          padding: 8,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Shield size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff' }}>
            Controle de Acessos & Cargos
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 700 }}>
            Painel Exclusivo do CEO
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1.5px solid #ef4444',
          borderRadius: 10,
          padding: '10px 14px',
          color: '#fca5a5',
          fontSize: '0.85rem',
          fontWeight: 700,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1.5px solid #10b981',
          borderRadius: 10,
          padding: '10px 14px',
          color: '#34d399',
          fontSize: '0.85rem',
          fontWeight: 700,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Formulário de Cadastro / Edição */}
      <form onSubmit={handleSubmit} className="card">
        <div className="card-title">
          <UserPlus size={20} color="#38bdf8" />
          {editingId ? 'Editar Credenciais & Cargo' : 'Cadastrar Novo Usuário'}
        </div>

        <div className="form-group">
          <label className="form-label">Nome Completo</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ex: Carlos Silva"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Nome de Usuário (Login)</label>
          <input
            type="text"
            className="input-field"
            placeholder="Ex: carlos, gerente1"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            {editingId ? 'Nova Senha (Deixe em branco para manter a atual)' : 'Senha de Acesso'}
          </label>
          <input
            type="text"
            className="input-field"
            placeholder={editingId ? 'Digite apenas se quiser alterar' : 'Senha para o funcionário'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Seleção do Cargo (RBAC) */}
        <div className="form-group">
          <label className="form-label">Cargo no Sistema</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <button
              type="button"
              className={`payment-btn ${role === 'funcionario' ? 'selected' : ''}`}
              onClick={() => setRole('funcionario')}
              style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 6px' }}
            >
              <img
                src="/icons/role-worker.png"
                alt="Funcionário"
                style={{ width: 28, height: 28, objectFit: 'contain' }}
              />
              <span>Funcionário</span>
            </button>

            <button
              type="button"
              className={`payment-btn ${role === 'gerente' ? 'selected' : ''}`}
              onClick={() => setRole('gerente')}
              style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 6px' }}
            >
              <img
                src="/icons/role-manager.png"
                alt="Gerente"
                style={{ width: 28, height: 28, objectFit: 'contain' }}
              />
              <span>Gerente</span>
            </button>

            <button
              type="button"
              className={`payment-btn ${role === 'ceo' ? 'selected' : ''}`}
              onClick={() => setRole('ceo')}
              style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 6px' }}
            >
              <img
                src="/icons/role-ceo.png"
                alt="CEO"
                style={{ width: 28, height: 28, objectFit: 'contain' }}
              />
              <span>CEO</span>
            </button>
          </div>
        </div>

        {/* Vínculo com a Equipe (obrigatório se for funcionário) */}
        {role === 'funcionario' && (
          <div className="form-group" style={{ backgroundColor: '#0f172a', padding: 14, borderRadius: 12, border: '1.5px dashed #2d456b' }}>
            <label className="form-label" style={{ color: '#38bdf8' }}>
              Vincular à Sigla da Equipe (Lavador):
            </label>
            <select
              className="input-field"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">Selecione quem é este funcionário...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  [{emp.acronym}] - {emp.name}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 6 }}>
              O funcionário só verá os caminhões em que a sigla dele foi marcada na lavagem.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          {editingId && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancelEdit}
            >
              Cancelar
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={loading}>
            <Check size={20} />
            {editingId ? 'SALVAR ALTERAÇÕES' : 'CRIAR ACESSO'}
          </button>
        </div>
      </form>

      {/* Lista de Usuários Existentes */}
      <div className="card">
        <div className="card-title">
          <UserCheck size={20} color="#10b981" />
          Usuários Cadastrados ({users.length})
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map((u) => {
            const isMe = u.id === currentUser?.id;
            const roleBadge = {
              ceo: { label: 'CEO (Dono)', color: '#f59e0b', bg: '#451a03', png: '/icons/role-ceo.png' },
              gerente: { label: 'Gerente', color: '#38bdf8', bg: '#082f49', png: '/icons/role-manager.png' },
              funcionario: { label: 'Funcionário', color: '#34d399', bg: '#064e3b', png: '/icons/role-worker.png' },
            }[u.role] || { label: u.role, color: '#94a3b8', bg: '#1e293b', png: '/icons/role-worker.png' };

            return (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: '#0f172a',
                  borderRadius: 12,
                  border: '1px solid #24334d',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.98rem' }}>
                      {u.name}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: '0.65rem', backgroundColor: '#334155', color: '#cbd5e1', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                        Você
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                    Login: <code style={{ color: '#38bdf8', fontWeight: 700 }}>{u.username}</code>
                    {u.employeeAcronym && (
                      <span style={{ marginLeft: 8, color: '#a7f3d0' }}>
                        (Sigla: <strong>[{u.employeeAcronym}]</strong>)
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 6 }}>
                    <span style={{
                      backgroundColor: roleBadge.bg,
                      color: roleBadge.color,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: `1px solid ${roleBadge.color}40`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}>
                      <img src={roleBadge.png} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                      {roleBadge.label}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="action-btn"
                    title="Editar cargo e senha"
                    onClick={() => handleEdit(u)}
                  >
                    <Edit2 size={15} />
                  </button>

                  {!isMe && (
                    <button
                      type="button"
                      className="action-btn delete"
                      title="Excluir acesso"
                      onClick={() => handleDelete(u)}
                    >
                      <Trash2 size={15} color="#f87171" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
