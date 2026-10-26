import React, { useState, useMemo } from 'react';
import { Truck, DollarSign, Edit2, Trash2, Calendar, FileText, Copy, Check } from 'lucide-react';
import { formatCurrency, formatDateTime, formatDayHeader } from '../services/calculations';

export function EntriesList({
  washes,
  advances,
  onEditWash,
  onDeleteWash,
  onDeleteAdvance,
}) {
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return localStorage.getItem('gl_entries_tab') || 'by_day';
    } catch {
      return 'by_day';
    }
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('gl_entries_tab', tab);
    } catch {}
  };
  const [copiedDate, setCopiedDate] = useState(null);

  // Agrupamento de lavagens por data do serviço (ou data de criação)
  const groupedWashes = useMemo(() => {
    const groups = {};
    washes.forEach((w) => {
      const rawDate =
        w.serviceDate ||
        (w.date ? w.date.substring(0, 10) : '') ||
        (w.createdAt ? w.createdAt.substring(0, 10) : 'Sem Data');

      if (!groups[rawDate]) {
        groups[rawDate] = [];
      }
      groups[rawDate].push(w);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => {
      if (a === 'Sem Data') return 1;
      if (b === 'Sem Data') return -1;
      return b.localeCompare(a); // Mais recente no topo
    });

    return sortedDates.map((dateKey) => ({
      date: dateKey,
      washes: groups[dateKey],
      totalValue: groups[dateKey].reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0),
    }));
  }, [washes]);

  const handleCopyDayList = (group) => {
    const header = group.date === 'Sem Data' ? 'Serviços' : formatDayHeader(group.date);
    const lines = group.washes.map((w) => {
      const acronyms = w.employeeAcronyms && w.employeeAcronyms.length > 0 ? w.employeeAcronyms.join(', ') : 'SEM SIGLA';
      return `${w.totalValue} - ${acronyms}`;
    });
    const text = `${header}\n${lines.join('\n')}\nTotal: ${formatCurrency(group.totalValue)}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedDate(group.date);
      setTimeout(() => setCopiedDate(null), 2000);
    }
  };

  return (
    <div>
      {/* Abas Superiores de Visualização */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setActiveTab('by_day')}
          style={{
            flex: 1.2,
            padding: '10px 8px',
            backgroundColor: activeTab === 'by_day' ? '#10b981' : '#151f32',
            color: activeTab === 'by_day' ? '#fff' : '#94a3b8',
            border: activeTab === 'by_day' ? '1.5px solid #34d399' : '1px solid #24334d',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
          }}
        >
          <Calendar size={16} />
          Por Dia ({washes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('washes')}
          style={{
            flex: 1,
            padding: '10px 8px',
            backgroundColor: activeTab === 'washes' ? '#0284c7' : '#151f32',
            color: activeTab === 'washes' ? '#fff' : '#94a3b8',
            border: activeTab === 'washes' ? '1.5px solid #38bdf8' : '1px solid #24334d',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
          }}
        >
          <Truck size={16} />
          Detalhado
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('advances')}
          style={{
            flex: 1,
            padding: '10px 8px',
            backgroundColor: activeTab === 'advances' ? '#f59e0b' : '#151f32',
            color: activeTab === 'advances' ? '#fff' : '#94a3b8',
            border: activeTab === 'advances' ? '1.5px solid #fbbf24' : '1px solid #24334d',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
          }}
        >
          <DollarSign size={16} />
          Vales ({advances.length})
        </button>
      </div>

      {/* 1. ABA: LISTA DE SERVIÇOS POR DIA (Ex: Segunda-Feira 350 - CL, PA) */}
      {activeTab === 'by_day' && (
        <div>
          {groupedWashes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <img
                src="/icons/empty-truck.png"
                alt="Sem lavagens"
                style={{ width: 68, height: 68, objectFit: 'contain', margin: '0 auto 12px', opacity: 0.85 }}
              />
              <p style={{ color: '#94a3b8', fontWeight: 600 }}>Nenhum serviço registrado nesta quinzena.</p>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 4 }}>
                Toque em "Lançar" para registrar serviços com data e siglas.
              </p>
            </div>
          ) : (
            groupedWashes.map((group) => {
              const headerTitle =
                group.date === 'Sem Data' ? 'Data Não Informada' : formatDayHeader(group.date);

              return (
                <div key={group.date} style={{ marginBottom: 20 }}>
                  {/* Cabeçalho do Dia */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 14px',
                      backgroundColor: '#151f32',
                      borderRadius: '12px 12px 0 0',
                      border: '1px solid #24334d',
                      borderBottom: '2px solid #10b981',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '0.98rem',
                          fontWeight: 900,
                          color: '#34d399',
                          letterSpacing: '-0.01em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {headerTitle}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 2 }}>
                        {group.washes.length} {group.washes.length === 1 ? 'serviço' : 'serviços'} • Subtotal:{' '}
                        <strong style={{ color: '#ffffff' }}>{formatCurrency(group.totalValue)}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyDayList(group)}
                      title="Copiar lista deste dia"
                      style={{
                        backgroundColor: '#1e293b',
                        color: copiedDate === group.date ? '#34d399' : '#cbd5e1',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {copiedDate === group.date ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                      <span>{copiedDate === group.date ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>

                  {/* Lista de Serviços do Dia */}
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
                          : 'SEM SIGLA';

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
                            {/* Formato Exato: 350 - SIGLAS Separadas por virgulas (CL, PA) */}
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

                            {/* Informações adicionais discretas */}
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
                              {w.plate && (
                                <span
                                  style={{
                                    backgroundColor: '#1e293b',
                                    color: '#38bdf8',
                                    fontWeight: 700,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    fontSize: '0.7rem',
                                  }}
                                >
                                  {w.plate}
                                </span>
                              )}
                              {w.company && <span>{w.company}</span>}
                              <span style={{ color: '#64748b' }}>•</span>
                              <span style={{ textTransform: 'uppercase' }}>{w.paymentMethod}</span>
                              <span style={{ color: '#64748b' }}>•</span>
                              <span style={{ color: '#a7f3d0' }}>
                                {formatCurrency(w.valuePerEmployee)} / lavador
                              </span>
                            </div>
                          </div>

                          {/* Ações: Editar e Excluir */}
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button
                              type="button"
                              className="action-btn"
                              title="Editar"
                              onClick={() => onEditWash(w)}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              className="action-btn delete"
                              title="Excluir"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Deseja excluir a lavagem de R$ ${w.totalValue} (${w.plate || 'sem placa'})?`
                                  )
                                ) {
                                  onDeleteWash(w.id);
                                }
                              }}
                            >
                              <Trash2 size={14} color="#f87171" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. ABA: VISÃO DETALHADA EM CARDS */}
      {activeTab === 'washes' && (
        <div>
          {washes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <img
                src="/icons/empty-truck.png"
                alt="Sem lavagens"
                style={{ width: 68, height: 68, objectFit: 'contain', margin: '0 auto 12px', opacity: 0.85 }}
              />
              <p style={{ color: '#94a3b8', fontWeight: 600 }}>Nenhuma lavagem registrada nesta quinzena.</p>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 4 }}>
                Toque em "Lançar" para registrar os primeiros caminhões.
              </p>
            </div>
          ) : (
            washes.map((w) => (
              <div key={w.id} className="entry-card">
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="entry-plate">{w.plate || 'SEM PLACA'}</span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        backgroundColor: '#1e293b',
                        color: '#94a3b8',
                        padding: '2px 6px',
                        borderRadius: 4,
                        textTransform: 'uppercase',
                      }}
                    >
                      {w.paymentMethod}
                    </span>
                  </div>

                  <div className="entry-company">{w.company || 'Cliente Avulso'}</div>

                  <div className="entry-acronyms">
                    {w.employeeAcronyms?.map((acr, i) => (
                      <span key={i} className="entry-acronym-tag">
                        {acr}
                      </span>
                    ))}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
                    {w.serviceDate ? `📅 ${formatDayHeader(w.serviceDate)}` : formatDateTime(w.createdAt)}
                  </div>
                </div>

                <div className="entry-value-box">
                  <div className="entry-total">{formatCurrency(w.totalValue)}</div>
                  <div className="entry-each">
                    {formatCurrency(w.valuePerEmployee)} / lavador
                  </div>

                  <div className="entry-actions">
                    <button
                      type="button"
                      className="action-btn"
                      title="Editar"
                      onClick={() => onEditWash(w)}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      className="action-btn delete"
                      title="Excluir"
                      onClick={() => {
                        if (confirm(`Deseja excluir a lavagem da placa ${w.plate || ''}?`)) {
                          onDeleteWash(w.id);
                        }
                      }}
                    >
                      <Trash2 size={14} color="#f87171" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. ABA: LISTA DE VALES */}
      {activeTab === 'advances' && (
        <div>
          {advances.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <img
                src="/icons/nav-advance.png"
                alt="Sem vales"
                style={{ width: 60, height: 60, objectFit: 'contain', margin: '0 auto 12px', opacity: 0.85 }}
              />
              <p style={{ color: '#94a3b8', fontWeight: 600 }}>Nenhum vale registrado nesta quinzena.</p>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 4 }}>
                Os adiantamentos lançados aparecerão aqui e serão abatidos no fechamento.
              </p>
            </div>
          ) : (
            advances.map((adv) => (
              <div key={adv.id} className="entry-card">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        backgroundColor: '#78350f',
                        color: '#fef3c7',
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        padding: '2px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {adv.employeeAcronym}
                    </span>
                    <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                      {adv.employeeName}
                    </span>
                  </div>

                  {adv.note && (
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                      {adv.note}
                    </div>
                  )}

                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
                    {adv.advanceDate ? `📅 ${formatDayHeader(adv.advanceDate)}` : formatDateTime(adv.createdAt)}
                  </div>
                </div>

                <div className="entry-value-box">
                  <div className="entry-total" style={{ color: '#f59e0b' }}>
                    - {formatCurrency(adv.value)}
                  </div>

                  <div className="entry-actions">
                    <button
                      type="button"
                      className="action-btn delete"
                      title="Excluir"
                      onClick={() => {
                        if (confirm(`Deseja excluir o vale de ${formatCurrency(adv.value)}?`)) {
                          onDeleteAdvance(adv.id);
                        }
                      }}
                    >
                      <Trash2 size={14} color="#f87171" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
