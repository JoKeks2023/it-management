// Root application component with tab navigation:
//   Tickets | Events | Netzwerk | Portfolio | Inventory | Sets | Quotes | Contacts | Reports
//   | Projekte | Templates | Wartung | Setlists

import { useState, useEffect } from 'react';
import { Dashboard }            from './pages/Dashboard';
import { EventsDashboard }      from './pages/EventsDashboard';
import { NetworkDashboard }     from './pages/NetworkDashboard';
import { PortfolioList }        from './pages/PortfolioList';
import { ContactsPage }         from './pages/ContactsPage';
import { InventoryPage }        from './pages/InventoryPage';
import { QuotesPage }           from './pages/QuotesPage';
import { SetsPage }             from './pages/SetsPage';
import { ReportsPage }          from './pages/ReportsPage';
import { Projects }             from './pages/Projects';
import { Templates }            from './pages/Templates';
import { MaintenanceDashboard } from './pages/MaintenanceDashboard';
import { Setlist }              from './pages/Setlist';
import { ConnectionStatus }     from './components/ConnectionStatus';

const TABS = [
  { id: 'tickets',     label: '🎫 Tickets'   },
  { id: 'events',      label: '🎵 Events'    },
  { id: 'projects',    label: '🏗️ Projekte'  },
  { id: 'maintenance', label: '🔧 Wartung'   },
  { id: 'setlists',    label: '🎧 Setlists'  },
  { id: 'templates',   label: '📋 Templates' },
  { id: 'network',     label: '🌐 Netzwerk'  },
  { id: 'portfolio',   label: '🗂 Portfolio'  },
  { id: 'inventory',   label: '📦 Inventar'  },
  { id: 'sets',        label: '📋 Sets'      },
  { id: 'quotes',      label: '📄 Angebote'  },
  { id: 'contacts',    label: '👥 Kontakte'  },
  { id: 'reports',     label: '📊 Berichte'  }
];

// Easter egg: tap header logo 7x to open mini-sampler
let headerTaps = 0;
let headerTimer = null;

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    // Restore last active tab from localStorage
    return localStorage.getItem('activeTab') || 'tickets';
  });
  const [easterEgg, setEasterEgg] = useState(false);

  // Save active tab to localStorage
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  function handleLogoClick() {
    headerTaps++;
    clearTimeout(headerTimer);
    headerTimer = setTimeout(() => { headerTaps = 0; }, 2000);
    if (headerTaps >= 7) {
      headerTaps = 0;
      setEasterEgg(true);
    }
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="logo" onClick={handleLogoClick} style={{ cursor: 'pointer', userSelect: 'none' }}>
          🖥️ IT Management
        </div>
        <nav className="tab-nav">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <span className="text-muted text-sm" style={{ minWidth: 160, textAlign: 'right' }}>
          Persönliches IT-System
        </span>
      </header>
      <main className="app-main">
        {activeTab === 'tickets'     && <Dashboard />}
        {activeTab === 'events'      && <EventsDashboard />}
        {activeTab === 'projects'    && <Projects />}
        {activeTab === 'maintenance' && <MaintenanceDashboard />}
        {activeTab === 'setlists'    && <Setlist />}
        {activeTab === 'templates'   && <Templates />}
        {activeTab === 'network'     && <NetworkDashboard />}
        {activeTab === 'portfolio'   && <PortfolioList />}
        {activeTab === 'inventory'   && <InventoryPage />}
        {activeTab === 'sets'        && <SetsPage />}
        {activeTab === 'quotes'      && <QuotesPage />}
        {activeTab === 'contacts'    && <ContactsPage />}
        {activeTab === 'reports'     && <ReportsPage />}
      </main>

      <ConnectionStatus />

      {/* Easter egg: Mini-Sampler modal (7x logo tap) */}
      {easterEgg && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}
          onClick={() => setEasterEgg(false)}
        >
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '2rem', textAlign: 'center', maxWidth: 420, border: '2px solid var(--color-primary)', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>🎹</div>
            <h3 style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-info))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1rem' }}>Mini-Sampler</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '.9rem' }}>Du hast das Easter Egg gefunden! 🎉</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {['🥁 Kick', '🔔 Hi-Hat', '🎸 Bass', '🎷 Lead', '🔊 Clap', '🎵 Synth', '💥 FX', '🎤 Vox'].map(s => (
                <button
                  key={s}
                  className="btn btn-ghost btn-sm"
                  style={{ transition: 'all .1s' }}
                  onMouseDown={e => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(0.95)'; }}
                  onMouseUp={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = ''; e.currentTarget.style.transform = ''; }}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              className="btn btn-ghost"
              style={{ marginTop: '1.5rem' }}
              onClick={() => setEasterEgg(false)}
            >
              ✕ Schließen
            </button>
          </div>
        </div>
      )}

      {/* Mobile quick bar */}
      <div className="quick-bar">
        <button className="quick-bar-btn" onClick={() => setActiveTab('tickets')}>
          <span className="quick-bar-icon">🎫</span>
          <span>Tickets</span>
        </button>
        <button className="quick-bar-btn" onClick={() => setActiveTab('projects')}>
          <span className="quick-bar-icon">🏗️</span>
          <span>Projekte</span>
        </button>
        <button className="quick-bar-btn" onClick={() => setActiveTab('maintenance')}>
          <span className="quick-bar-icon">🔧</span>
          <span>Wartung</span>
        </button>
        <button className="quick-bar-btn" onClick={() => setActiveTab('setlists')}>
          <span className="quick-bar-icon">🎧</span>
          <span>Sets</span>
        </button>
        <button className="quick-bar-btn" onClick={() => setActiveTab('events')}>
          <span className="quick-bar-icon">🎵</span>
          <span>Events</span>
        </button>
      </div>
    </div>
  );
}