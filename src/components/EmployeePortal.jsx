import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Truck, DollarSign, LogOut, RefreshCw, Calendar, CheckCircle2, Users } from 'lucide-react';
import { fetchMyPortalData } from '../services/api';
import { formatCurrency, formatDateTime, formatDayHeader, groupWashesByWeekAndDay } from '../services/calculations';

export function EmployeePortal({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return localStorage.getItem('gl_emp_tab') || 'washes';
    } catch {
      return 'washes';
    }
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('gl_emp_tab', tab);
    } catch {}
  };

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

  // Agrupamento por Semana (Semana 1 e 2) e Dias em ordem CRESCENTE (segunda 23, terça 24...)
  const weekGroups = useMemo(() => groupWashesByWeekAndDay(washes), [washes]);

  // Vales ordenados em ordem CRESCENTE
  const sortedAdvancesAsc = useMemo(() => {
    return [...advances].sort((a, b) => {
      const dateA = a.advanceDate || a.createdAt || '';
      const dateB = b.advanceDate || b.createdAt || '';
      return dateA.localeCompare(dateB);
    });
  }, [advances]);

  return (
    <div className="app-container" style={{ paddingBottom: 24 }}>
      {/* Header do Funcionário */}
      <header className="app-header">
        <div className="brand-badge">
          <div
            style={{
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
            }}
          >
            {user.employeeAcronym || 'LV'}
          </div>
          <div>
            <div className="brand-title" style={{ fontSize: '1.05rem' }}>
              {user.name}
            </div>
            <div className="brand-subtitle" style={{ color: '#38bdf8' }}>
              Lavador [{user.employeeAcronym}] • Quinzena Atual
            </div>
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
        <div
          className="card"
          style={{
            background: 'linear-gradient(145deg, #064e3b 0%, #0f1f2e 100%)',
            border: '2px solid #10b981',
            padding: 22,
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
          }}
        >
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: '#a7f3d0',
              letterSpacing: '0.05em',
            }}
          >
            Meu Saldo Líquido nesta Quinzena
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ffffff', margin: '8px 0' }}>
            {formatCurrency(summary.netToPay)}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
            Cálculo: Minhas comissões menos meus vales retirados
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                borderRadius: 10,
                padding: 10,
                border: '1px solid rgba(52, 211, 153, 0.25)',
              }}
            >
              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                Minhas Comissões (+)
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399', marginTop: 2 }}>
                {formatCurrency(summary.totalCommission)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                {summary.washCount} {summary.washCount === 1 ? 'caminhão' : 'caminhões'}
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                borderRadius: 10,
                padding: 10,
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
            >
              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
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
            Meus Serviços ({washes.length})
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

        {/* 1. LISTA DE SERVIÇOS DO FUNCIONÁRIO (Separados em Semana 1 e Semana 2, datas crescentes) */}
        {activeTab === 'washes' && (
          <div>
            {weekGroups.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '36px 16px' }}>
                <img
                  src="/icons/empty-truck.png"
                  alt="Sem caminhões"
                  style={{ width: 64, height: 64, objectFit: 'contain', margin: '0 auto 10px', opacity: 0.85 }}
                />
                <p style={{ color: '#cbd5e1', fontWeight: 700 }}>Nenhum caminhão registrado ainda.</p>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 4 }}>
                  Assim que o gerente lançar um caminhão incluindo sua sigla [{user.employeeAcronym}], ele
                  aparecerá aqui com quem lavou com você e sua comissão.
                </p>
              </div>
            ) : (
              weekGroups.map((week) => (
                <div key={week.id} style={{ marginBottom: 24 }}>
                  {/* Divisor / Destaque de Semana (Semana 1 e Semana 2) */}
                  <div
                    style={{
                      background:
                        week.id === 'semana_1'
                          ? 'linear-gradient(135deg, #0c2d48 0%, #143e66 100%)'
                          : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                      border: week.id === 'semana_1' ? '2px solid #38bdf8' : '2px solid #818cf8',
                      borderRadius: 14,
                      padding: '12px 16px',
                      marginBottom: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          backgroundColor: week.id === 'semana_1' ? '#0284c7' : '#4f46e5',
                          color: '#ffffff',
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontWeight: 900,
                          fontSize: '0.82rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {week.label}
                      </span>
                      <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: 4 }}>
                        {week.washCount} {week.washCount === 1 ? 'serviço' : 'serviços'} com sua participação
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: '#cbd5e1', textTransform: 'uppercase', fontWeight: 700 }}>
                        Minha Comissão
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34d399' }}>
                        {formatCurrency(week.totalCommission)}
                      </div>
                    </div>
                  </div>

                  {/* Dias da Semana em Ordem Crescente (segunda 23, terça 24...) */}
                  {week.days.map((group) => {
                    const headerTitle =
                      group.date === 'Sem Data' ? 'Data Não Informada' : formatDayHeader(group.date);

                    return (
                      <div key={group.date} style={{ marginBottom: 14 }}>
                        {/* Cabeçalho do Dia */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            backgroundColor: '#151f32',
                            borderRadius: '12px 12px 0 0',
                            border: '1px solid #24334d',
                            borderBottom: '2px solid #10b981',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.92rem',
                              fontWeight: 900,
                              color: '#34d399',
                              textTransform: 'uppercase',
                              letterSpacing: '-0.01em',
                            }}
                          >
                            📅 {headerTitle}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#a7f3d0', fontWeight: 800 }}>
                            {formatCurrency(group.totalCommission)}
                          </div>
                        </div>

                        {/* Lista de Caminhões do Dia */}
                        <div
                          style={{
                            backgroundColor: '#0b1120',
                            border: '1px solid #24334d',
                            borderTop: 'none',
                            borderRadius: '0 0 12px 12px',
                            padding: '10px 10px 4px 10px',
                          }}
                        >
                          {group.washes.map((w) => {
                            const acronymsList =
                              w.employeeAcronyms && w.employeeAcronyms.length > 0
                                ? w.employeeAcronyms.join(', ')
                                : user.employeeAcronym;

                            return (
                              <div
                                key={w.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  backgroundColor: '#131d2e',
                                  borderRadius: '10px',
                                  border: '1px solid #1e293b',
                                  marginBottom: 8,
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                                  {/* Formato Solicitado: 350 — SIGLAS (CL, PA, JO) */}
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                    <span
                                      style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 900,
                                        color: '#34d399',
                                        letterSpacing: '-0.02em',
                                      }}
                                    >
                                      {w.totalValue}
                                    </span>
                                    <span style={{ color: '#64748b', fontWeight: 800 }}>—</span>
                                    <span
                                      style={{
                                        fontSize: '1.05rem',
                                        fontWeight: 800,
                                        color: '#f8fafc',
                                        letterSpacing: '0.02em',
                                      }}
                                    >
                                      {acronymsList}
                                    </span>
                                  </div>

                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      marginTop: 4,
                                      fontSize: '0.72rem',
                                      color: '#94a3b8',
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <span
                                      style={{
                                        backgroundColor: '#0c2d48',
                                        color: '#38bdf8',
                                        border: '1px solid #0284c7',
                                        fontWeight: 800,
                                        padding: '2px 8px',
                                        borderRadius: 6,
                                        fontSize: '0.74rem',
                                        textTransform: 'uppercase',
                                      }}
                                    >
                                      🏢 {w.company || 'Veículo / Cliente Avulso'}
                                    </span>
                                    {w.plate && (
                                      <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600 }}>
                                        Placa: {w.plate}
                                      </span>
                                    )}
                                    <span style={{ color: '#64748b' }}>•</span>
                                    <span style={{ textTransform: 'uppercase' }}>{w.paymentMethod}</span>
                                  </div>
                                </div>

                                {/* Valor da Comissão do Lavador */}
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                                    Minha Parte
                                  </div>
                                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#38bdf8' }}>
                                    +{formatCurrency(w.valuePerEmployee)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}

        {/* 2. LISTA DE VALES DO FUNCIONÁRIO (Ordenados em ordem crescente) */}
        {activeTab === 'advances' && (
          <div>
            {sortedAdvancesAsc.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '36px 16px' }}>
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px' }} />
                <p style={{ color: '#cbd5e1', fontWeight: 700 }}>Você não possui nenhum vale nesta quinzena.</p>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 4 }}>
                  Sua comissão será paga integralmente sem descontos.
                </p>
              </div>
            ) : (
              sortedAdvancesAsc.map((adv) => (
                <div key={adv.id} className="entry-card" style={{ borderLeft: '4px solid #f59e0b', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.95rem' }}>
                      {adv.note || 'Vale / Adiantamento'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 4 }}>
                      {adv.advanceDate ? `📅 ${formatDayHeader(adv.advanceDate)}` : formatDateTime(adv.createdAt)}
                    </div>
                  </div>

                  <div className="entry-value-box">
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                      Desconto
                    </div>
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
