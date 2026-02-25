// src/components/Sidebar.jsx
// Persistent left sidebar for unified navigation across all modules.

import { useState } from 'react';

const MODULES = [
  { id: 'home',        icon: '🏠', label: 'Home' },
  { id: 'tickets',     icon: '🎫', label: 'Tickets' },
  { id: 'events',      icon: '🎵', label: 'Events' },
  { id: 'projects',    icon: '🏗️', label: 'Projekte' },
  { id: 'maintenance', icon: '🔧', label: 'Wartung' },
  { id: 'setlists',    icon: '🎧', label: 'Setlists' },
  { id: 'templates',   icon: '📋', label: 'Templates' },
  { id: 'network',     icon: '🌐', label: 'Netzwerk' },
  { id: 'portfolio',   icon: '🗂',  label: 'Portfolio' },
  { id: 'inventory',   icon: '📦', label: 'Inventar' },
  { id: 'sets',        icon: '📋', label: 'Sets' },
  { id: 'quotes',      icon: '📄', label: 'Angebote' },
  { id: 'contacts',    icon: '👥', label: 'Kontakte' },
  { id: 'reports',     icon: '📊', label: 'Berichte' },
  { id: 'unifi',       icon: '📡', label: 'Unifi' },
  { id: 'settings',    icon: '⚙️',  label: 'Einstellungen' },
];

export function Sidebar({ activeTab, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className="sidebar"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        width: collapsed ? '80px' : '240px',
        backgroundColor: 'var(--bg-sidebar, var(--bg-card))',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        zIndex: 100,
        overflowY: 'auto',
        paddingTop: '1rem'
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          alignSelf: 'flex-end',
          background: 'none',
          border: 'none',
          fontSize: '1.2rem',
          cursor: 'pointer',
          padding: '0.5rem',
          marginRight: '0.5rem',
          marginBottom: '1rem'
        }}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? '→' : '←'}
      </button>

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        {MODULES.map((mod) => (
          <button
            key={mod.id}
            onClick={() => onNavigate(mod.id)}
            className={`sidebar-nav-item ${activeTab === mod.id ? 'active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              width: '100%',
              padding: '0.75rem 1rem',
              border: 'none',
              backgroundColor: activeTab === mod.id ? 'var(--color-primary)' : 'transparent',
              color: activeTab === mod.id ? 'white' : 'inherit',
              fontSize: '0.95rem',
              fontWeight: activeTab === mod.id ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== mod.id) {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(0,0,0,0.05))';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== mod.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ fontSize: '1.3rem', minWidth: '25px' }}>{mod.icon}</span>
            {!collapsed && <span>{mod.label}</span>}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid var(--border-color)',
        padding: '1rem',
        textAlign: collapsed ? 'center' : 'left',
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)'
      }}>
        {!collapsed && <div>IT Management</div>}
        <div>v2.0</div>
      </div>
    </aside>
  );
}
