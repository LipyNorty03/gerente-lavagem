import React, { useState, useEffect, useCallback } from 'react';
import { Truck, CheckCircle2, LogOut, Shield, User, Download } from 'lucide-react';
import {
  fetchAllData,
  apiSaveWash,
  apiDeleteWash,
  apiSaveAdvance,
  apiDeleteAdvance,
  apiSaveEmployee,
  apiToggleEmployeeActive,
  apiDeleteEmployee,
  apiCloseQuinzena,
  checkServerStatus,
  getStoredUser,
  apiLogout,
} from './services/api';

import { LoginScreen } from './components/LoginScreen';
import { EmployeePortal } from './components/EmployeePortal';
import { UserManagementView } from './components/UserManagementView';
import { WashForm } from './components/WashForm';
import { AdvanceForm } from './components/AdvanceForm';
import { EntriesList } from './components/EntriesList';
import { ClosingView } from './components/ClosingView';
import { TeamView } from './components/TeamView';
import { Navbar } from './components/Navbar';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [activeTab, setActiveTab] = useState('wash');
  const [employees, setEmployees] = useState([]);
  const [washes, setWashes] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [closedQuinzenas, setClosedQuinzenas] = useState([]);
  const [isOnlineDb, setIsOnlineDb] = useState(false);
  const [editingWash, setEditingWash] = useState(null);
  const [toast, setToast] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleLogout = async () => {
    await apiLogout();
    setCurrentUser(null);
  };

  // Carrega todos os dados se o usuário for Gerente ou CEO
  const loadData = useCallback(async () => {
    if (!currentUser || currentUser.role === 'funcionario') return;
    const data = await fetchAllData();
    setEmployees(data.employees || []);
    setWashes(data.washes || []);
    setAdvances(data.advances || []);
    setClosedQuinzenas(data.closedQuinzenas || []);
    setIsOnlineDb(data.source === 'cloud');
  }, [currentUser]);

  useEffect(() => {
    loadData();

    if (currentUser && currentUser.role !== 'funcionario') {
      const interval = setInterval(async () => {
        const online = await checkServerStatus();
        setIsOnlineDb(online);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [loadData, currentUser]);

  const showToast = useCallback((message) => {
    setToast(message);
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    setTimeout(() => {
      setToast(null);
    }, 2800);
  }, []);

  // 1. SE NÃO ESTIVER AUTENTICADO -> TELA DE LOGIN
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => setCurrentUser(user)}
        installPrompt={installPrompt}
        onInstallApp={handleInstallApp}
      />
    );
  }

  // 2. SE FOR FUNCIONÁRIO -> PORTAL EXCLUSIVO (Apenas seus serviços e vales)
  if (currentUser.role === 'funcionario') {
    return <EmployeePortal user={currentUser} onLogout={handleLogout} />;
  }

  // 3. SE FOR GERENTE OU CEO -> PAINEL OPERACIONAL COMPLETO
  const isCeo = currentUser.role === 'ceo';

  // 1. LAVAGENS
  const handleSaveWash = async (washData) => {
    const saved = await apiSaveWash(washData);
    setWashes((prev) => {
      const idx = prev.findIndex((w) => w.id === saved.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [saved, ...prev];
    });
    setEditingWash(null);
    showToast(washData.id ? 'Lavagem atualizada com sucesso!' : 'Lavagem registrada no banco!');
    setActiveTab('entries');
  };

  const handleEditWash = (wash) => {
    setEditingWash(wash);
    setActiveTab('wash');
  };

  const handleCancelEdit = () => {
    setEditingWash(null);
  };

  const handleDeleteWash = async (id) => {
    await apiDeleteWash(id);
    setWashes((prev) => prev.filter((w) => w.id !== id));
    showToast('Lavagem removida.');
  };

  // 2. VALES
  const handleSaveAdvance = async (advData) => {
    const saved = await apiSaveAdvance(advData);
    setAdvances((prev) => [saved, ...prev]);
    showToast(`Vale de R$ ${advData.value} registrado!`);
    setActiveTab('entries');
  };

  const handleDeleteAdvance = async (id) => {
    await apiDeleteAdvance(id);
    setAdvances((prev) => prev.filter((a) => a.id !== id));
    showToast('Vale removido.');
  };

  // 3. FUNCIONÁRIOS
  const handleSaveEmployee = async (empData) => {
    const saved = await apiSaveEmployee(empData);
    setEmployees((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [...prev, saved];
    });
    showToast(empData.id ? 'Funcionário atualizado!' : 'Funcionário cadastrado no banco!');
  };

  const handleToggleActive = async (id) => {
    const updated = await apiToggleEmployeeActive(id);
    setEmployees(updated);
  };

  const handleDeleteEmployee = async (id) => {
    await apiDeleteEmployee(id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    showToast('Funcionário removido da equipe.');
  };

  // 4. FECHAMENTO
  const handleCloseQuinzena = async (summary) => {
    await apiCloseQuinzena(summary);
    await loadData();
    showToast('Quinzena fechada e salva no banco de dados!');
    setActiveTab('closing');
  };

  return (
    <div className="app-container">
      {/* Toast Notificação */}
      {toast && (
        <div className="toast-msg">
          <CheckCircle2 size={18} color="#34d399" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="app-header">
        <div className="brand-badge">
          <div className="brand-icon" style={{ background: 'none', boxShadow: 'none' }}>
            <img
              src="/icons/logo-truck.png"
              alt="Logo Caminhão"
              style={{ width: 44, height: 44, objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(16, 185, 129, 0.4))' }}
            />
          </div>
          <div>
            <div className="brand-title">GERENTE VIRTUAL</div>
            <div className="brand-subtitle">
              {isCeo ? '👑 Modo CEO' : '💼 Modo Gerente'} • {currentUser.name}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Indicador de Status do Banco */}
          <div className={`status-pill ${isOnlineDb ? 'online' : 'offline'}`} title={isOnlineDb ? 'Banco SQLite Online' : 'Modo Offline'}>
            <span className="status-dot"></span>
            <span>{isOnlineDb ? 'Online' : 'Offline'}</span>
          </div>

          {/* Botão de Logout */}
          <button
            type="button"
            className="action-btn delete"
            title="Sair da conta"
            onClick={handleLogout}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Banner de Instalação de App Nativo */}
      {installPrompt && (
        <div style={{
          backgroundColor: '#0c2a4d',
          borderBottom: '2px solid #38bdf8',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Download size={22} color="#38bdf8" />
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff' }}>
                Instalar Aplicativo Nativo
              </div>
              <div style={{ fontSize: '0.72rem', color: '#93c5fd' }}>
                Abrir em tela cheia sem navegador
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallApp}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: 900,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            INSTALAR
          </button>
        </div>
      )}

      {/* Área de Conteúdo */}
      <main className="content-area">
        {activeTab === 'wash' && (
          <WashForm
            employees={employees}
            onSaveWash={handleSaveWash}
            editingWash={editingWash}
            onCancelEdit={handleCancelEdit}
          />
        )}

        {activeTab === 'advance' && (
          <AdvanceForm
            employees={employees}
            onSaveAdvance={handleSaveAdvance}
          />
        )}

        {activeTab === 'entries' && (
          <EntriesList
            washes={washes}
            advances={advances}
            onEditWash={handleEditWash}
            onDeleteWash={handleDeleteWash}
            onDeleteAdvance={handleDeleteAdvance}
          />
        )}

        {activeTab === 'closing' && (
          <ClosingView
            employees={employees}
            washes={washes}
            advances={advances}
            closedQuinzenas={closedQuinzenas}
            onCloseQuinzena={handleCloseQuinzena}
          />
        )}

        {activeTab === 'team' && (
          <TeamView
            employees={employees}
            onSaveEmployee={handleSaveEmployee}
            onToggleActive={handleToggleActive}
            onDeleteEmployee={handleDeleteEmployee}
          />
        )}

        {/* Aba Exclusiva do CEO: Gestão de Usuários e Cargos */}
        {activeTab === 'users' && isCeo && (
          <UserManagementView
            currentUser={currentUser}
            employees={employees}
          />
        )}
      </main>

      {/* Navegação Inferior Dock */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        washCount={washes.length}
        advanceCount={advances.length}
        isCeo={isCeo}
      />
    </div>
  );
}
