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