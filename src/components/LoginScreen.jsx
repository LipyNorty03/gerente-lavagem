import React, { useState } from 'react';
import { Truck, Lock, User, AlertCircle, ArrowRight, Settings, Globe, Download } from 'lucide-react';
import { apiLogin } from '../services/api';

export function LoginScreen({ onLoginSuccess, installPrompt, onInstallApp }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('gl_server_url') || 'https://gentle-crabs-change.loca.lt');

  const handleSaveServer = (e) => {
    e.preventDefault();
    if (serverUrl.trim()) {
      localStorage.setItem('gl_server_url', serverUrl.trim());
    } else {
      localStorage.removeItem('gl_server_url');
    }
    setShowServerConfig(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Por favor, informe seu usuário e senha.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await apiLogin(username.trim(), password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Usuário ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px 20px', maxWidth: '440px', margin: '0 auto' }}>
      {/* Topo / Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 80,
          height: 80,
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
          borderRadius: 24,
          border: '2px solid rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
        }}>
          <img
            src="/icons/logo-truck.png"
            alt="Gerente Virtual"
            style={{ width: 56, height: 56, objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
          />
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
          GERENTE VIRTUAL
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Lavagem de Caminhões
        </p>
      </div>

      {/* Banner de Instalação Nativa */}
      {installPrompt && (
        <div style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          borderRadius: 14,
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Download size={22} color="#ffffff" />
            <div>
              <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.86rem' }}>
                Baixar App no Celular
              </div>
              <div style={{ fontSize: '0.72rem', color: '#e0f2fe' }}>
                Usar nativo sem navegador
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onInstallApp}
            style={{
              backgroundColor: '#ffffff',
              color: '#0369a1',
              border: 'none',
              borderRadius: 8,
              padding: '8px 14px',
              fontWeight: 900,
              fontSize: '0.78rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}
          >
            INSTALAR
          </button>
        </div>
      )}

      {/* Card de Login */}
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginBottom: 18, textAlign: 'center' }}>
          Acesso ao Sistema
        </h2>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1.5px solid #ef4444',
            borderRadius: 10,
            padding: '10px 14px',
            color: '#fca5a5',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}>
            <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Usuário</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: 42 }}
                placeholder="Ex: ceo, gerente, carlos"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                disabled={loading}
              />
              <User size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="input-field"
                style={{ paddingLeft: 42 }}
                placeholder="Sua senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Entrando...' : (
              <>
                <span>ENTRAR NO SISTEMA</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Rodapé Seguro */}
      <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Lock size={12} color="#10b981" />
        <span>Acesso restrito e criptografado • Gerente Virtual</span>
      </div>

      {/* Configuração de Servidor no APK */}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button
          type="button"
          onClick={() => setShowServerConfig(!showServerConfig)}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '0.74rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Settings size={12} />
          <span>Configurar IP/Servidor do Banco</span>
        </button>

        {showServerConfig && (
          <div style={{ marginTop: 10, background: '#0f172a', padding: 12, borderRadius: 10, border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 700 }}>
              Endereço do Servidor do Banco:
            </div>
            <input
              type="text"
              className="input-field"
              style={{ fontSize: '0.85rem', padding: '8px 10px', marginBottom: 8 }}
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="Ex: http://192.168.1.18:3001"
            />
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '8px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              onClick={handleSaveServer}
            >
              Salvar Endereço
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
