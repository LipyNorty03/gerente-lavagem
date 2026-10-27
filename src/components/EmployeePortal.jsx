import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Truck, DollarSign, LogOut, RefreshCw, Calendar, CheckCircle2, Users, Target, Coins } from 'lucide-react';
import { fetchMyPortalData } from '../services/api';
import { formatCurrency, formatDateTime, formatDayHeader, groupWashesByWeekAndDay, calculateGoalStatus } from '../services/calculations';

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

  // Metas diárias definidas individualmente pelo funcionário por dia (persistido por usuário)
  const [dailyTargets, setDailyTargets] = useState(() => {
    try {
      const saved = localStorage.getItem(`gl_targets_${user.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [quickTargetVal, setQuickTargetVal] = useState('');

  const handleTargetChange = (dateKey, value) => {
    const numVal = value === '' ? '' : Math.max(0, Number(value));
    const updated = { ...dailyTargets, [dateKey]: numVal };
    setDailyTargets(updated);
    try {
      localStorage.setItem(`gl_targets_${user.id}`, JSON.stringify(updated));
    } catch {}
  };

  const handleApplyQuickTarget = () => {
    if (quickTargetVal === '') return;
    const num = Math.max(0, Number(quickTargetVal));
    const updated = { ...dailyTargets };
    weekGroups.forEach((week) => {
      week.days.forEach((day) => {
        updated[day.date] = num;
      });
    });
    setDailyTargets(updated);
    try {
      localStorage.setItem(`gl_targets_${user.id}`, JSON.stringify(updated));
    } catch {}
  };

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

  // Cálculo consolidado das metas diárias e do valor total final
  const goalSummary = useMemo(() => {
    let totalCommission = 0;
    let totalTarget = 0;
    let greenCount = 0;
    let yellowCount = 0;
    let redCount = 0;
    let configuredDays = 0;

    weekGroups.forEach((week) => {
      week.days.forEach((day) => {
        const comm = Number(day.totalCommission) || 0;
        totalCommission += comm;
        const targetVal = dailyTargets[day.date];
        if (targetVal !== undefined && targetVal !== '' && Number(targetVal) > 0) {
          const target = Number(targetVal);
          configuredDays++;
          totalTarget += target;
          const st = calculateGoalStatus(comm, target);
          if (st.status === 'green') greenCount++;
          else if (st.status === 'yellow') yellowCount++;
          else if (st.status === 'red') redCount++;
        }
      });
    });

    const overallStatus = calculateGoalStatus(totalCommission, totalTarget);

    return {
      totalCommission,
      totalTarget,
      greenCount,
      yellowCount,
      redCount,
      configuredDays,
      overallStatus,
    };
  }, [weekGroups, dailyTargets]);

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

        {/* Abas: Meus Serviços vs Minhas Comissões vs Meus Vales */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setActiveTab('washes')}
            style={{
              padding: '10px 4px',
              backgroundColor: activeTab === 'washes' ? '#10b981' : '#151f32',
              color: activeTab === 'washes' ? '#fff' : '#94a3b8',
              border: activeTab === 'washes' ? '1.5px solid #34d399' : '1px solid #24334d',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Truck size={18} />
            <span>Serviços ({washes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('commissions')}
            style={{
              padding: '10px 4px',
              backgroundColor: activeTab === 'commissions' ? '#0284c7' : '#151f32',
              color: activeTab === 'commissions' ? '#fff' : '#94a3b8',
              border: activeTab === 'commissions' ? '1.5px solid #38bdf8' : '1px solid #24334d',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Coins size={18} />
            <span>Comissões</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('advances')}
            style={{
              padding: '10px 4px',
              backgroundColor: activeTab === 'advances' ? '#f59e0b' : '#151f32',
              color: activeTab === 'advances' ? '#fff' : '#94a3b8',
              border: activeTab === 'advances' ? '1.5px solid #fbbf24' : '1px solid #24334d',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <DollarSign size={18} />
            <span>Vales ({advances.length})</span>
          </button>
        </div>

        {/* 1. LISTA DE SERVIÇOS DO FUNCIONÁRIO (Caminhões lavados e parceiros) */}
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
                  aparecerá aqui com quem lavou com você.
                </p>
              </div>
            ) : (
              weekGroups.map((week) => (
                <div key={week.id} style={{ marginBottom: 24 }}>
                  {/* Divisor de Semana */}
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
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>
                            {group.washes.length} {group.washes.length === 1 ? 'caminhão' : 'caminhões'}
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
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {/* Formato: 350 — SIGLAS (CL, PA) */}
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

        {/* 2. ÁREA SEPARADA: LISTA DE COMISSÕES & METAS DIÁRIAS */}
        {activeTab === 'commissions' && (
          <div>
            {weekGroups.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '36px 16px' }}>
                <Coins size={48} color="#38bdf8" style={{ margin: '0 auto 10px', opacity: 0.85 }} />
                <p style={{ color: '#cbd5e1', fontWeight: 700 }}>Nenhuma comissão registrada ainda nesta quinzena.</p>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 4 }}>
                  Assim que os caminhões forem lançados, suas comissões e acompanhamento de metas aparecerão aqui.
                </p>
              </div>
            ) : (
              <>
                {/* Card de Metas Diárias e Valor Total Acumulado */}
                <div
                  className="card"
                  style={{
                    backgroundColor: '#0f172a',
                    border: `2px solid ${goalSummary.overallStatus.border || '#334155'}`,
                    borderRadius: 14,
                    padding: '16px',
                    marginBottom: 16,
                    boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Target size={20} color={goalSummary.overallStatus.color || '#38bdf8'} />
                      <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        Minhas Metas Diárias
                      </span>
                    </div>
                    {goalSummary.configuredDays > 0 && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor: goalSummary.overallStatus.bg,
                          color: goalSummary.overallStatus.color,
                          border: `1px solid ${goalSummary.overallStatus.border}`,
                        }}
                      >
                        {goalSummary.overallStatus.label}
                      </span>
                    )}
                  </div>

                  {/* Valores: Total Realizado vs Total das Metas */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div style={{ backgroundColor: '#162032', padding: 10, borderRadius: 10, border: '1px solid #1e293b' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                        Total de Comissões
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34d399', marginTop: 2 }}>
                        {formatCurrency(goalSummary.totalCommission)}
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#162032', padding: 10, borderRadius: 10, border: '1px solid #1e293b' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                        Total de Metas
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc', marginTop: 2 }}>
                        {formatCurrency(goalSummary.totalTarget)}
                      </div>
                    </div>
                  </div>

                  {/* Contadores dos status */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
                    <div
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid #10b981',
                        borderRadius: 8,
                        padding: '6px 4px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#34d399' }}>
                        {goalSummary.greenCount}
                      </div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a7f3d0' }}>
                        Com Folga
                      </div>
                      <div style={{ fontSize: '0.58rem', color: '#94a3b8' }}>(&gt; Meta + R$30)</div>
                    </div>

                    <div
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid #f59e0b',
                        borderRadius: 8,
                        padding: '6px 4px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fbbf24' }}>
                        {goalSummary.yellowCount}
                      </div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fde68a' }}>
                        Até R$ 30
                      </div>
                      <div style={{ fontSize: '0.58rem', color: '#94a3b8' }}>(Meta a Meta+30)</div>
                    </div>

                    <div
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef4444',
                        borderRadius: 8,
                        padding: '6px 4px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f87171' }}>
                        {goalSummary.redCount}
                      </div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fca5a5' }}>
                        Não Batidas
                      </div>
                      <div style={{ fontSize: '0.58rem', color: '#94a3b8' }}>(&lt; Meta)</div>
                    </div>
                  </div>

                  {/* Definidor rápido para todos os dias */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      backgroundColor: '#131d2e',
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid #1e293b',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 700 }}>
                      Definir meta padrão para todos os dias:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        placeholder="R$ 100"
                        value={quickTargetVal}
                        onChange={(e) => setQuickTargetVal(e.target.value)}
                        style={{
                          width: 80,
                          padding: '4px 8px',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          backgroundColor: '#0b1120',
                          color: '#ffffff',
                          border: '1px solid #334155',
                          borderRadius: 6,
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleApplyQuickTarget}
                        style={{
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '5px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de Comissões por Semana e Dia */}
                {weekGroups.map((week) => (
                  <div key={week.id} style={{ marginBottom: 24 }}>
                    {/* Divisor / Destaque de Semana */}
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
                          Comissões dos seus serviços
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: '#cbd5e1', textTransform: 'uppercase', fontWeight: 700 }}>
                          Total da Semana
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34d399' }}>
                          {formatCurrency(week.totalCommission)}
                        </div>
                      </div>
                    </div>

                    {/* Dias da Semana em Ordem Crescente com Meta Individual */}
                    {week.days.map((group) => {
                      const headerTitle =
                        group.date === 'Sem Data' ? 'Data Não Informada' : formatDayHeader(group.date);
                      const dayTarget = Number(dailyTargets[group.date]) || 0;
                      const goalStatus = calculateGoalStatus(group.totalCommission, dayTarget);

                      return (
                        <div key={group.date} style={{ marginBottom: 14 }}>
                          {/* Cabeçalho do Dia com Meta Diária Individual */}
                          <div
                            style={{
                              backgroundColor: '#151f32',
                              borderRadius: '12px 12px 0 0',
                              border: '1px solid #24334d',
                              borderBottom: `3px solid ${goalStatus.border || '#10b981'}`,
                              padding: '10px 14px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 8,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '0.92rem',
                                  fontWeight: 900,
                                  color: '#f8fafc',
                                  textTransform: 'uppercase',
                                  letterSpacing: '-0.01em',
                                }}
                              >
                                📅 {headerTitle}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                                  Comissão do Dia
                                </div>
                                <div style={{ fontSize: '1.05rem', color: '#34d399', fontWeight: 900 }}>
                                  {formatCurrency(group.totalCommission)}
                                </div>
                              </div>
                            </div>

                            {/* Linha de Definição da Meta e Status Colorido */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 8,
                                backgroundColor: '#0e1726',
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: `1px solid ${goalStatus.border || '#1e293b'}`,
                                flexWrap: 'wrap',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#cbd5e1' }}>
                                  🎯 Meta do Dia: R$
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="10"
                                  placeholder="Definir"
                                  value={dailyTargets[group.date] ?? ''}
                                  onChange={(e) => handleTargetChange(group.date, e.target.value)}
                                  style={{
                                    width: 75,
                                    padding: '3px 6px',
                                    fontSize: '0.82rem',
                                    fontWeight: 800,
                                    backgroundColor: '#1b273d',
                                    color: '#ffffff',
                                    border: '1px solid #334155',
                                    borderRadius: 6,
                                    outline: 'none',
                                  }}
                                />
                              </div>

                              {goalStatus.status !== 'none' ? (
                                <div
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 900,
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    color: goalStatus.color,
                                    backgroundColor: goalStatus.bg,
                                    border: `1px solid ${goalStatus.border}`,
                                    letterSpacing: '0.01em',
                                  }}
                                >
                                  {goalStatus.label}
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>
                                  Sem meta definida
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Lista das Comissões dos Caminhões do Dia */}
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
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                      <span
                                        style={{
                                          fontSize: '1.15rem',
                                          fontWeight: 900,
                                          color: '#34d399',
                                        }}
                                      >
                                        +{formatCurrency(w.valuePerEmployee)}
                                      </span>
                                      <span style={{ color: '#64748b', fontWeight: 800 }}>•</span>
                                      <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 700 }}>
                                        {w.totalValue} — {acronymsList}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 3 }}>
                                      🏢 {w.company || 'Veículo / Avulso'} {w.plate ? `(Placa: ${w.plate})` : ''}
                                    </div>
                                  </div>

                                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <span
                                      style={{
                                        backgroundColor: '#064e3b',
                                        color: '#34d399',
                                        border: '1px solid #10b981',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        padding: '3px 8px',
                                        borderRadius: 6,
                                      }}
                                    >
                                      Comissão
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </>
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
