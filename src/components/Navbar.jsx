import React from 'react';

export function Navbar({ activeTab, setActiveTab, washCount, advanceCount, isCeo }) {
  const tabs = [
    { id: 'wash', label: 'Lançar', png: '/icons/nav-wash.png' },
    { id: 'advance', label: 'Vales', png: '/icons/nav-advance.png' },
    {
      id: 'entries',
      label: 'Registros',
      png: '/icons/nav-records.png',
      badge: washCount + advanceCount,
    },
    { id: 'closing', label: 'Fechamento', png: '/icons/nav-closing.png' },
    { id: 'team', label: 'Equipe', png: '/icons/nav-team.png' },
  ];

  if (isCeo) {
    tabs.push({ id: 'users', label: 'Acessos', png: '/icons/nav-security.png' });
  }

  return (
    <nav className="bottom-dock" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`dock-item ${isActive ? 'active' : ''}`}
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10);
              setActiveTab(tab.id);
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={tab.png}
                alt={tab.label}
                style={{
                  width: 24,
                  height: 24,
                  objectFit: 'contain',
                  filter: isActive ? 'drop-shadow(0 2px 8px rgba(16, 185, 129, 0.6))' : 'grayscale(35%) opacity(0.75)',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                }}
              />
              {tab.badge > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    backgroundColor: '#10b981',
                    color: '#fff',
                    fontSize: '0.6rem',
                    fontWeight: 900,
                    borderRadius: '999px',
                    padding: '1px 5px',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="dock-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
