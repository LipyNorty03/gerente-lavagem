import React, { useState, useMemo } from 'react';
import { CheckCircle2, AlertCircle, History, Calendar, Check, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '../services/calculations';

export function ClosingView({
  employees,
  washes,
  advances,
  closedQuinzenas,
  onCloseQuinzena,
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Memoização cirúrgica de performance para suportar centenas de lavagens sem engasgo
  const totals = useMemo(() => {
    const totalRevenue = washes.reduce((sum, w) => sum + (w.totalValue || 0), 0);
    const totalProducts = washes.reduce((sum, w) => sum + (w.productFee || 0), 0);
    const totalHouse = washes.reduce((sum, w) => sum + (w.houseValue || 0), 0);
    const totalTeam = washes.reduce((sum, w) => sum + (w.teamValue || 0), 0);
    const totalAdvances = advances.reduce((sum, a) => sum + (a.value || 0), 0);
    const totalNetPayable = Math.max(0, totalTeam - totalAdvances);

    return {
      totalRevenue,
      totalProducts,
      totalHouse,
      totalTeam,
      totalAdvances,
      totalNetPayable,
    };
  }, [washes, advances]);

  const employeesSummary = useMemo(() => {
    return employees
      .filter((emp) => emp.active)
      .map((emp) => {
        const empWashes = washes.filter((w) => w.employeeIds?.includes(emp.id));
        const washCount = empWashes.length;

        const commissionTotal = empWashes.reduce(
          (sum, w) => sum + (w.valuePerEmployee || 0),
          0
        );

        const empAdvances = advances.filter((a) => a.employeeId === emp.id);
        const advanceTotal = empAdvances.reduce((sum, a) => sum + (a.value || 0), 0);
        const netToPay = Math.max(0, commissionTotal - advanceTotal);

        return {
          employeeId: emp.id,
          name: emp.name,
          acronym: emp.acronym,
          washCount,
          commissionTotal,
          advanceTotal,
          netToPay,
        };
      });
  }, [employees, washes, advances]);

  const {
    totalRevenue,
    totalProducts,
    totalHouse,
    totalTeam,
    totalAdvances,
    totalNetPayable,
  } = totals;

  const handleConfirmClosing = () => {
    const summary = {
      totalRevenue,
      totalProducts,
      totalHouse,
      totalTeam,
      totalAdvances,
      totalNetPayable,
      washCount: washes.length,
      employeesSummary,
    };
    onCloseQuinzena(summary);
    setShowConfirmModal(false);
  };

  return (
    <div>
      {/* Botão de Alternar entre Quinzena Atual e Histórico */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img
            src="/icons/nav-closing.png"
            alt="Fechamento"
            style={{ width: 24, height: 24, objectFit: 'contain' }}
          />
          {showHistory ? 'Histórico de Fechamentos' : 'Fechamento da Quinzena'}
        </h2>
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          style={{
            background: 'none',
            border: '1px solid #24334d',
            color: '#38bdf8',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <History size={15} />
          {showHistory ? 'Ver Quinzena Aberta' : `Histórico (${closedQuinzenas.length})`}
        </button>
      </div>

      {showHistory ? (
        /* VISUALIZAÇÃO DO HISTÓRICO DE QUINZENAS ANTERIORES */
        <div>
          {closedQuinzenas.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <History size={40} color="#475569" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#94a3b8', fontWeight: 600 }}>Nenhum fechamento arquivado ainda.</p>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 4 }}>
                Ao fechar uma quinzena na segunda-feira, os valores pagos ficarão salvos aqui.
              </p>
            </div>
          ) : (
            closedQuinzenas.map((closed, index) => (
              <div key={closed.id || index} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 800 }}>
                    <CheckCircle2 size={18} />
                    <span>Fechamento Pago</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {formatDate(closed.closedAt)}
                  </div>
                </div>

                <div className="split-grid" style={{ marginBottom: 12 }}>
                  <div className="split-item">
                    <div className="split-label">Caminhões</div>
                    <div className="split-value">{closed.washCount || 0}</div>
                  </div>
                  <div className="split-item">
                    <div className="split-label">Casa (50%)</div>
                    <div className="split-value" style={{ color: '#38bdf8' }}>
                      {formatCurrency(closed.totalHouse)}
                    </div>
                  </div>
                  <div className="split-item">
                    <div className="split-label">Equipe Total</div>
                    <div className="split-value" style={{ color: '#34d399' }}>
                      {formatCurrency(closed.totalNetPayable)}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #24334d', paddingTop: 10 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                    Valores Pagos por Funcionário:
                  </div>
                  {closed.employeesSummary?.map((emp) => (
                    <div
                      key={emp.employeeId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem',
                        padding: '4px 0',
                      }}
                    >
                      <span style={{ color: '#f8fafc' }}>
                        <strong>[{emp.acronym}]</strong> {emp.name}
                      </span>
                      <span style={{ color: '#34d399', fontWeight: 800 }}>
                        {formatCurrency(emp.netToPay)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* VISUALIZAÇÃO DA QUINZENA ATUAL EM ABERTO */
        <div>
          {/* Resumo Financeiro Geral do Pátio */}
          <div className="card" style={{ background: 'linear-gradient(145deg, #16243b 0%, #0f192b 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                  Faturamento Bruto
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>
                  {formatCurrency(totalRevenue)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                  Caminhões
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8' }}>
                  {washes.length}
                </div>
              </div>
            </div>

            <div className="split-grid">
              <div className="split-item">
                <div className="split-label">Produtos (R$10)</div>
                <div className="split-value" style={{ color: '#f59e0b' }}>
                  {formatCurrency(totalProducts)}
                </div>
              </div>
              <div className="split-item">
                <div className="split-label">Parte Casa</div>
                <div className="split-value" style={{ color: '#38bdf8' }}>
                  {formatCurrency(totalHouse)}
                </div>
              </div>
              <div className="split-item">
                <div className="split-label">Total Equipe</div>
                <div className="split-value" style={{ color: '#34d399' }}>
                  {formatCurrency(totalTeam)}
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Pagamento por Funcionário */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              Resumo Líquido a Pagar (Por Funcionário)
            </div>

            {employeesSummary.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Nenhum funcionário cadastrado.</p>
            ) : (
              employeesSummary.map((emp) => (
                <div key={emp.employeeId} className="closing-emp-card">
                  <div className="closing-emp-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="closing-emp-badge">{emp.acronym}</span>
                      <span className="closing-emp-name">{emp.name}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {emp.washCount} caminhões
                    </span>
                  </div>

                  <div className="closing-lines">
                    <div className="closing-line">
                      <span>Total de Comissões (+)</span>
                      <span style={{ color: '#fff', fontWeight: 700 }}>
                        {formatCurrency(emp.commissionTotal)}
                      </span>
                    </div>
                    <div className="closing-line">
                      <span>Vales / Adiantamentos (-)</span>
                      <span style={{ color: '#f87171', fontWeight: 700 }}>
                        - {formatCurrency(emp.advanceTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="closing-net-box">
                    <span className="closing-net-label">Líquido a Pagar:</span>
                    <span className="closing-net-val">{formatCurrency(emp.netToPay)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Botão de Fechamento Quinzenal */}
          <div style={{ marginTop: 20 }}>
            <button
              type="button"
              className="btn-primary"
              disabled={washes.length === 0 && advances.length === 0}
              onClick={() => setShowConfirmModal(true)}
            >
              <CheckCircle2 size={24} />
              FECHAR QUINZENA / MARCAR COMO PAGO
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#64748b', marginTop: 8 }}>
              Clique na segunda-feira após conferir os valores para arquivar e iniciar o novo ciclo.
            </p>
          </div>
        </div>
      )}

      {/* Modal de Confirmação do Fechamento */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={24} color="#10b981" />
              Confirmar Fechamento
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.92rem', marginBottom: 14 }}>
              Deseja marcar esta quinzena como <strong>Paga</strong>?
            </p>
            <div style={{ background: '#0f172a', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>Caminhões lavados:</span>
                <strong style={{ color: '#fff' }}>{washes.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>Total líquido p/ equipe:</span>
                <strong style={{ color: '#34d399' }}>{formatCurrency(totalNetPayable)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#94a3b8' }}>Faturamento retido Casa:</span>
                <strong style={{ color: '#38bdf8' }}>{formatCurrency(totalHouse)}</strong>
              </div>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
              Ao confirmar, esta quinzena será salva no histórico e a tela será zerada para a próxima quinzena.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmClosing}
              >
                Confirmar e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
