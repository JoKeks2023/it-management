// src/components/ModuleLinks.jsx
// Contextual links to related modules - can be embedded in any page to facilitate navigation.

export function ModuleLinks({ currentModule, relatedModules, onNavigate }) {
  const MODULE_RELATIONSHIPS = {
    tickets: ['projects', 'inventory', 'contacts', 'reports'],
    events: ['tickets', 'contacts', 'inventory', 'quotes'],
    projects: ['tickets', 'maintenance', 'inventory', 'quotes'],
    maintenance: ['tickets', 'projects', 'inventory', 'network'],
    setlists: ['sets', 'events', 'inventory'],
    templates: ['tickets', 'events', 'quotes'],
    network: ['inventory', 'maintenance', 'unifi'],
    portfolio: ['projects', 'events', 'contacts'],
    inventory: ['tickets', 'events', 'network', 'sets'],
    sets: ['setlists', 'events', 'inventory'],
    quotes: ['events', 'contacts', 'tickets'],
    contacts: ['tickets', 'events', 'portfolio'],
    reports: ['tickets', 'events', 'projects'],
    unifi: ['network', 'inventory', 'maintenance']
  };

  const related = relatedModules || MODULE_RELATIONSHIPS[currentModule] || [];

  const MODULE_ICONS = {
    tickets: '🎫',
    events: '🎵',
    projects: '🏗️',
    maintenance: '🔧',
    setlists: '🎧',
    templates: '📋',
    network: '🌐',
    portfolio: '🗂',
    inventory: '📦',
    sets: '📋',
    quotes: '📄',
    contacts: '👥',
    reports: '📊',
    unifi: '📡'
  };

  const MODULE_LABELS = {
    tickets: 'Tickets',
    events: 'Events',
    projects: 'Projekte',
    maintenance: 'Wartung',
    setlists: 'Setlists',
    templates: 'Templates',
    network: 'Netzwerk',
    portfolio: 'Portfolio',
    inventory: 'Inventar',
    sets: 'Sets',
    quotes: 'Angebote',
    contacts: 'Kontakte',
    reports: 'Berichte',
    unifi: 'Unifi'
  };

  if (!related || related.length === 0) return null;

  return (
    <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid var(--border-color)' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
        🔗 Verwandte Module
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '0.5rem'
      }}>
        {related.map((moduleId) => (
          <button
            key={moduleId}
            onClick={() => onNavigate && onNavigate(moduleId)}
            style={{
              padding: '0.75rem',
              backgroundColor: 'var(--bg-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 500,
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.backgroundColor = 'var(--bg-main)';
              e.currentTarget.style.color = 'inherit';
            }}
          >
            <span style={{ fontSize: '1.3rem' }}>{MODULE_ICONS[moduleId] || '📌'}</span>
            <span>{MODULE_LABELS[moduleId] || moduleId}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ModuleCard - Quick action card that links to a module with action
// ────────────────────────────────────────────────────────────────────────────
export function ModuleCard({ icon, label, description, stats, onClick, style }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '1.5rem',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.3s',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-color)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ fontSize: '2rem' }}>{icon}</div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{label}</h3>
      {description && (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
          {description}
        </p>
      )}
      {stats && (
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '0.5rem' }}>
          {stats}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// QuickActionBar - Horizontal bar of quick action buttons
// ────────────────────────────────────────────────────────────────────────────
export function QuickActionBar({ actions, onAction, style }) {
  const MODULE_ICONS = {
    'new-ticket': '🎫➕',
    'new-event': '🎵➕',
    'new-project': '🏗️➕',
    'new-maintenance': '🔧➕',
    'new-contact': '👥➕',
    'sync-devices': '📡🔄',
    'view-reports': '📊👁️'
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.75rem',
        padding: '1rem',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '8px',
        overflowX: 'auto',
        ...style
      }}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction && onAction(action.id)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-primary)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.borderColor = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-main)';
            e.currentTarget.style.color = 'inherit';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          <span style={{ marginRight: '0.4rem' }}>{MODULE_ICONS[action.id] || action.icon}</span>
          {action.label}
        </button>
      ))}
    </div>
  );
}
