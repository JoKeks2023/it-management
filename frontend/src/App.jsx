// Root application component with tab navigation:
//   Tickets | Events | Netzwerk | Portfolio | Inventory | Sets | Quotes | Contacts | Reports
//   | Projekte | Templates | Wartung | Setlists

import { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState('tickets');
  const [easterEgg, setEasterEgg] = useState(false);

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

      {/* Easter egg: Mini-Sampler modal (7x logo tap) */}
      {easterEgg && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setEasterEgg(false)}
        >
          <div style={{ background: '#1a1a2e', borderRadius: 16, padding: '2rem', textAlign: 'center', color: '#fff', maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>🎹</div>
            <h3 style={{ color: '#00d4ff', marginBottom: '1rem' }}>Mini-Sampler</h3>
            <p style={{ color: '#aaa', marginBottom: '1.5rem', fontSize: '.9rem' }}>Du hast das Easter Egg gefunden! 🎉</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {['🥁 Kick', '🔔 Hi-Hat', '🎸 Bass', '🎷 Lead', '🔊 Clap', '🎵 Synth', '💥 FX', '🎤 Vox'].map(s => (
                <button
                  key={s}
                  style={{ background: '#16213e', border: '1px solid #333', borderRadius: 8, padding: '.75rem .5rem', color: '#eee', cursor: 'pointer', fontSize: '.8rem', transition: 'all .1s' }}
                  onMouseDown={e => { e.currentTarget.style.background = '#00d4ff'; e.currentTarget.style.color = '#111'; }}
                  onMouseUp={e => { e.currentTarget.style.background = '#16213e'; e.currentTarget.style.color = '#eee'; }}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              style={{ marginTop: '1.5rem', background: 'transparent', border: '1px solid #333', color: '#aaa', padding: '.5rem 1rem', borderRadius: 8, cursor: 'pointer' }}
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