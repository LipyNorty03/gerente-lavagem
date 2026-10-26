import React, { useState, useEffect, useCallback } from 'react';
import { Truck, DollarSign, LogOut, RefreshCw, Calendar, CheckCircle2 } from 'lucide-react';
import { fetchMyPortalData, apiLogout } from '../services/api';
import { formatCurrency, formatDateTime, formatDayHeader } from '../services/calculations';

export function EmployeePortal({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('washes');

  const loadPortalData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMyPortalData();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortalData();
  }, [loadPortalData]);

  const summary = data?.summary || { washCount: 0, totalCommission: 0, totalAdvances: 0, netToPay: 0 };
  const washes = data?.washes || [];
  const advances = data?.advances || [];

  return (
    <div className="app-container" style={{ paddingBottom: 24 }}>
      {/* Header do Funcionário */}
      <header className="app-header">
        <div className="brand-badge">
          <div style={{
            backgroundColor: '#064e3b',
            color: '#34d399',
            border: '2px solid #10b981',
            borderRadius: 12,
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '1.2rem',
          }}>
            {user.employeeAcronym || 'LV'}
          </div>
          <div>
            <div className="brand-title" style={{ fontSize: '1.05rem' }}>{user.name}</div>
            <div className="brand-subtitle" style={{ color: '#38bdf8' }}>Painel do Lavador</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="action-btn"
            title="Atualizar dados"
            onClick={loadPortalData}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            className="action-btn delete"
            title="Sair"
            onClick={onLogout}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="content-area">
        {/* Card Destaque: Líquido a Receber */}
        <div className="card" style={{
          background: 'linear-gradient(145deg, #064e3b 0%, #0f1f2e 100%)',
          border: '2px solid #10b981',
          padding: 22,
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
        }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#a7f3d0', letterSpacing: '0.05em' }}>
            Meu Saldo Líquido nesta Quinzena
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ffffff', margin: '8px 0' }}>
            {formatCurrency(summary.netToPay)}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
            Cálculo: Comissões ganhas menos vales retirados
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', borderRadius: 10, padding: 10, border: '1px solid rgba(52, 211, 153, 0.25)' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Minhas Comissões (+)
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399', marginTop: 2 }}>
                {formatCurrency(summary.totalCommission)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                {summary.washCount} caminhões
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', borderRadius: 10, padding: 10, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Meus Vales (-)
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f87171', marginTop: 2 }}>
                - {formatCurrency(summary.totalAdvances)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                {advances.length} adiantamentos
              </div>
            </div>
          </div>
        </div>

        {/* Abas: Meus Caminhões vs Meus Vales */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setActiveTab('washes')}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: activeTab === 'washes' ? '#10b981' : '#151f32',
              color: activeTab === 'washes' ? '#fff' : '#94a3b8',
              border: '1.5px solid #24334d',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <img
              src="/icons/nav-wash.png"
              alt="Caminhões"
              style={{ width: 22, height: 22, objectFit: 'contain' }}
            />
            Meus Caminhões ({washes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('advances')}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: activeTab === 'advances' ? '#f59e0b' : '#151f32',
              color: activeTab === 'advances' ? '#fff' : '#94a3b8',
              border: '1.5px solid #24334d',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <img
              src="/icons/nav-advance.png"
              alt="Vales"
              style={{ width: 22, height: 22, objectFit: 'contain' }}
            />
            Meus Vales ({advances.length})
          </button>
        </div>

        {/* Lista de Caminhões Lavados pelo Funcionário */}
        {activeTab === 'washes' && (
          <div>
            {washes.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '36px 16px' }}>
                <img
                  src="/icons/empty-truck.png"
                  alt="Sem caminhões"
                  style={{ width: 64, height: 64, objectFit: 'contain', margin: '0 auto 10px', opacity: 0.85 }}
                />
                <p style={{ color: '#cbd5e1', fontWeight: 700 }}>Nenhum caminhão registrado ainda.</p>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 4 }}>
                  Assim que o gerente lançar um caminhão com sua sigla [{user.employeeAcronym}], ele aparecerá aqui com sua comissão.
                </p>
              </div>
            ) : (
              washes.map((w) => (
                <div key={w.id} className="entry-card" style={{ borderLeft: '4px solid #10b981' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="entry-plate">{w.plate || 'SEM PLACA'}</span>
                    </div>
                    <div className="entry-company">{w.company || 'Cliente Avulso'}</div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 4 }}>
                      {w.serviceDate ? `📅 ${formatDayHeader(w.serviceDate)}` : formatDateTime(w.createdAt)}
                    </div>
                  </div>

                  <div className="entry-value-box">
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                      Minha Comissão
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#34d399' }}>
                      {formatCurrency(w.valuePerEmployee)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Lista de Vales do Funcionário */}
        {activeTab === 'advances' && (
          <div>
            {advances.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '36px 16px' }}>
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px' }} />
                <p style={{ color: '#cbd5e1', fontWeight: 700 }}>Você não possui nenhum vale nesta quinzena.</p>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 4 }}>
                  Sua comissão será paga integralmente sem descontos.
                </p>
              </div>
            ) : (
              advances.map((adv) => (
                <div key={adv.id} className="entry-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.95rem' }}>
                      {adv.note || 'Vale / Adiantamento'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 4 }}>
                      {adv.advanceDate ? `📅 ${formatDayHeader(adv.advanceDate)}` : formatDateTime(adv.createdAt)}
                    </div>
                  </div>

                  <div className="entry-value-box">
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#f87171' }}>
                      - {formatCurrency(adv.value)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
