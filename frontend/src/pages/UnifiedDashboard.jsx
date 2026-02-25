// src/pages/UnifiedDashboard.jsx
// Unified dashboard that replaces tab-based navigation.
// Shows overview of all modules with quick links and cross-module insights.

import { useState, useEffect } from 'react';
import { reportsApi, unifiApi } from '../services/api';

function fmtMoney(v) {
  return Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

const MODULES = [
  { id: 'tickets',     icon: '🎫', label: 'Tickets',     desc: 'IT-Aufgaben & Bestellungen' },
  { id: 'events',      icon: '🎵', label: 'Events',      desc: 'Veranstaltungen & Bookings' },
  { id: 'projects',    icon: '🏗️', label: 'Projekte',    desc: 'Laufende Projekte' },
  { id: 'maintenance', icon: '🔧', label: 'Wartung',     desc: 'Wartungsaufgaben & Service' },
  { id: 'setlists',   icon: '🎧', label: 'Setlists',    desc: 'Setlists & Tracks' },
  { id: 'templates',   icon: '📋', label: 'Templates',   desc: 'Wiederverwendbare Vorlagen' },
  { id: 'network',     icon: '🌐', label: 'Netzwerk',    desc: 'Geräte & Topologie' },
  { id: 'portfolio',   icon: '🗂',  label: 'Portfolio',   desc: 'Referenzen & Projekte' },
  { id: 'inventory',   icon: '📦', label: 'Inventar',    desc: 'Equipment-Katalog' },
  { id: 'sets',        icon: '📋', label: 'Sets',        desc: 'Equipment-Pakete' },
  { id: 'quotes',      icon: '📄', label: 'Angebote',    desc: 'Angebote & Rechnungen' },
  { id: 'contacts',    icon: '👥', label: 'Kontakte',    desc: 'Kunden & Crew' },
  { id: 'reports',     icon: '📊', label: 'Berichte',    desc: 'Statistiken & Auswertungen' },
];

export function UnifiedDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [unifiStats, setUnifiStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [reportData, unifiData] = await Promise.all([
          reportsApi.overview(),
          unifiApi?.status?.().catch(() => null) || Promise.resolve(null)
        ]);
        setStats(reportData);
        setUnifiStats(unifiData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleNavigate = (moduleId) => {
    if (onNavigate) onNavigate(moduleId);
  };

  // ── Quick Actions ──────────────────────────────────
  const quickActions = [
    { icon: '🎫', label: 'Neuen Ticket erstellen', module: 'tickets' },
    { icon: '📅', label: 'Event hinzufügen', module: 'events' },
    { icon: '🔧', label: 'Wartung planen', module: 'maintenance' },
    { icon: '📦', label: 'Equipment erfassen', module: 'inventory' },
    { icon: '📄', label: 'Angebot erstellen', module: 'quotes' },
    { icon: '👥', label: 'Kontakt hinzufügen', module: 'contacts' },
  ];

  return (
    <div className="unified-dashboard">
      {/* ── Hero Section ────────────────────────────────── */}
      <div className="dashboard-hero">
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-info))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '0.5rem'
        }}>
          🖥️ IT Management Portal
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>
          Persönliches IT-System – Alle Bereiche im Überblick
        </p>
      </div>

      {/* ── Key Stats ──────────────────────────────────── */}
      {loading ? (
        <div className="centered"><div className="spinner" /></div>
      ) : stats && (
        <div>
          {/* Primary Stats */}
          <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            <div 
              className="stat-card clickable" 
              onClick={() => handleNavigate('tickets')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
                {stats.tickets_open}
              </div>
              <div className="stat-label">🎫 Tickets offen</div>
            </div>
            <div 
              className="stat-card clickable" 
              onClick={() => handleNavigate('events')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="stat-value" style={{ color: 'var(--color-primary)' }}>
                {stats.events_upcoming}
              </div>
              <div className="stat-label">🎵 Bevorstehende Events</div>
            </div>
            <div 
              className="stat-card clickable" 
              onClick={() => handleNavigate('projects')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
                {stats.projects_active}
              </div>
              <div className="stat-label">🏗️ Aktive Projekte</div>
            </div>
            <div 
              className="stat-card clickable" 
              onClick={() => handleNavigate('maintenance')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="stat-value" style={{ color: stats.maintenance_due > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {stats.maintenance_due}
              </div>
              <div className="stat-label">🔧 Wartung fällig</div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            <div 
              className="stat-card clickable" 
              onClick={() => handleNavigate('network')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="stat-value" style={{ color: 'var(--color-info)' }}>
                {stats.network_devices}
              </div>
              <div className="stat-label">🌐 Netzwerk Geräte</div>
              {unifiStats && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                  Unifi: {unifiStats.device_count} Geräte
                </div>
              )}
            </div>
            <div 
              className="stat-card clickable" 
              onClick={() => handleNavigate('inventory')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="stat-value" style={{ color: stats.inventory_in_repair > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {stats.inventory_total}
              </div>
              <div className="stat-label">📦 Inventar Items</div>
            </div>
            <div 
              className="stat-card clickable" 
              onClick={() => handleNavigate('quotes')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                {fmtMoney(stats.revenue_total || 0)}
              </div>
              <div className="stat-label">💰 Gesamtumsatz</div>
            </div>
            <div 
              className="stat-card clickable" 
              onClick={() => handleNavigate('contacts')}
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div className="stat-value" style={{ color: 'var(--color-primary)' }}>
                {stats.contacts_total}
              </div>
              <div className="stat-label">👥 Kontakte</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Actions ──────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 600 }}>⚡ Schnelle Aktionen</h2>
        <div className="quick-actions">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              className="quick-action-btn"
              onClick={() => handleNavigate(action.module)}
              style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 500,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                e.currentTarget.style.color = 'inherit';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── All Modules Grid ────────────────────────────── */}
      <div>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 600 }}>📋 Alle Module</h2>
        <div className="modules-grid">
          {MODULES.map((mod) => (
            <div
              key={mod.id}
              className="module-card"
              onClick={() => handleNavigate(mod.id)}
              style={{
                padding: '1.5rem',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(-6px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{mod.icon}</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {mod.label}
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                {mod.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Inline Styles ──────────────────────────────── */}
      <style>{`
        .unified-dashboard {
          padding: 2rem;
          maxWidth: 1400px;
          margin: 0 auto;
        }

        .dashboard-hero {
          textAlign: center;
          marginBottom: 3rem;
          paddingBottom: 2rem;
          borderBottom: 2px solid var(--border-color);
        }

        .quick-actions {
          display: grid;
          gridTemplateColumns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          marginBottom: 2rem;
        }

        .modules-grid {
          display: grid;
          gridTemplateColumns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 1.5rem;
        }

        @media (max-width: 768px) {
          .unified-dashboard {
            padding: 1rem;
          }

          .modules-grid {
            gridTemplateColumns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 1rem;
          }

          .quick-actions {
            gridTemplateColumns: repeat(auto-fit, minmax(150px, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
