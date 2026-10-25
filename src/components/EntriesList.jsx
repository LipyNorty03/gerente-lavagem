import React, { useState } from 'react';
import { Truck, DollarSign, Edit2, Trash2, Calendar, FileText } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../services/calculations';

export function EntriesList({
  washes,
  advances,
  onEditWash,
  onDeleteWash,
  onDeleteAdvance,
}) {
  const [activeTab, setActiveTab] = useState('washes');

  return (
    <div>
      {/* Abas Superiores */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setActiveTab('washes')}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: activeTab === 'washes' ? '#10b981' : '#151f32',
            color: activeTab === 'washes' ? '#fff' : '#94a3b8',
            border: '1px solid #24334d',
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
            alt="Lavagens"
            style={{ width: 22, height: 22, objectFit: 'contain' }}
          />
          Lavagens ({washes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('advances')}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: activeTab === 'advances' ? '#f59e0b' : '#151f32',
            color: activeTab === 'advances' ? '#fff' : '#94a3b8',
            border: '1px solid #24334d',
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
          Vales ({advances.length})
        </button>
      </div>

      {/* Lista de Lavagens */}
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

                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>
                    {formatDateTime(w.createdAt)}
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

      {/* Lista de Vales */}
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

                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>
                    {formatDateTime(adv.createdAt)}
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
