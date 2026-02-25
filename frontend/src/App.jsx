// Root application component with tab navigation:
//   Tickets | Events | Netzwerk | Portfolio | Inventory | Sets | Quotes | Contacts | Reports
//   | Projekte | Templates | Wartung | Setlists

import { useState, useEffect } from 'react';
import { UnifiedDashboard }     from './pages/UnifiedDashboard';
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
import { UnifiDashboard }       from './pages/UnifiDashboard';
import { SettingsPage }         from './pages/SettingsPage';
import { ConnectionStatus }     from './components/ConnectionStatus';
import { Sidebar }              from './components/Sidebar';
import { OnboardingModal }      from './components/OnboardingModal';

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'home';
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Show onboarding first time only (if 'hasSeenOnboarding' is not set)
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    return !hasSeenOnboarding;
  });

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  return (
    <div className="app-layout-modern">
      <Sidebar activeTab={activeTab} onNavigate={setActiveTab} />
      
      <main className="app-main-modern">
        {activeTab === 'home'        && <UnifiedDashboard onNavigate={setActiveTab} />}
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
        {activeTab === 'unifi'       && <UnifiDashboard />}
        {activeTab === 'settings'    && <SettingsPage onShowOnboarding={() => setShowOnboarding(true)} />}
      </main>

      <ConnectionStatus />
      <OnboardingModal isOpen={showOnboarding} onClose={handleOnboardingClose} />

      <style>{`
        .app-layout-modern {
          display: flex;
          height: 100vh;
          width: 100%;
        }

        .app-main-modern {
          flex: 1;
          marginLeft: 240px;
          overflowY: auto;
          overflowX: hidden;
          transition: margin-left 0.3s ease;
          background-color: var(--bg-main);
        }

        /* When sidebar is collapsed (responsive) */
        @media (max-width: 768px) {
          .app-main-modern {
            marginLeft: 80px;
          }
        }

        @media (max-width: 480px) {
          .app-layout-modern {
            flexDirection: column;
          }

          .app-main-modern {
            marginLeft: 0;
            marginTop: 80px;
          }
        }
      `}</style>
    </div>
  );
}

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