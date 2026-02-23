// src/App.jsx
// Root application component. Renders the header and the Dashboard page.

import { Dashboard } from './pages/Dashboard';

export default function App() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="logo">
          🖥️ IT Management
        </div>
        <span className="text-muted text-sm">Persönliches Ticket- &amp; Asset-System</span>
      </header>
      <main className="app-main">
        <Dashboard />
      </main>
    </div>
  );
}
