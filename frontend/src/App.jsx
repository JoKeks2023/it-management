// Root application component with tab navigation:
//   Tickets | Events | Netzwerk | Portfolio | Inventory | Sets | Quotes | Contacts | Reports

import { useState } from 'react';
import { Dashboard }        from './pages/Dashboard';
import { EventsDashboard }  from './pages/EventsDashboard';
import { NetworkDashboard } from './pages/NetworkDashboard';
import { PortfolioList }    from './pages/PortfolioList';
import { ContactsPage }     from './pages/ContactsPage';
import { InventoryPage }    from './pages/InventoryPage';
import { QuotesPage }       from './pages/QuotesPage';
import { SetsPage }         from './pages/SetsPage';
import { ReportsPage }      from './pages/ReportsPage';

const TABS = [
  { id: 'tickets',   label: '🎫 Tickets'   },
  { id: 'events',    label: '🎵 Events'    },
  { id: 'network',   label: '🌐 Netzwerk'  },
  { id: 'portfolio', label: '🗂 Portfolio'  },
  { id: 'inventory', label: '📦 Inventar'  },
  { id: 'sets',      label: '📋 Sets'      },
  { id: 'quotes',    label: '📄 Angebote'  },
  { id: 'contacts',  label: '👥 Kontakte'  },
  { id: 'reports',   label: '📊 Berichte'  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('tickets');

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="logo">🖥️ IT Management</div>
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
        {activeTab === 'tickets'   && <Dashboard />}
        {activeTab === 'events'    && <EventsDashboard />}
        {activeTab === 'network'   && <NetworkDashboard />}
        {activeTab === 'portfolio' && <PortfolioList />}
        {activeTab === 'inventory' && <InventoryPage />}
        {activeTab === 'sets'      && <SetsPage />}
        {activeTab === 'quotes'    && <QuotesPage />}
        {activeTab === 'contacts'  && <ContactsPage />}
        {activeTab === 'reports'   && <ReportsPage />}
      </main>
    </div>
  );
}