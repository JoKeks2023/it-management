// src/pages/MainDashboard.jsx
// Home overview page – shows summary stats for all modules and navigation cards.

import { useState, useEffect } from 'react';
import { reportsApi } from '../services/api';

function fmtMoney(v) {
  return Number(v || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

const MODULES = [
  { id: 'tickets',     icon: '🎫', label: 'Tickets',     color: 'var(--color-primary)',  desc: 'IT-Aufgaben & Bestellungen' },
  { id: 'events',      icon: '🎵', label: 'Events',      color: 'var(--color-info)',     desc: 'Veranstaltungen & Bookings' },
  { id: 'projects',    icon: '🏗️', label: 'Projekte',    color: 'var(--color-warning)',  desc: 'Laufende Projekte' },
  { id: 'maintenance', icon: '🔧', label: 'Wartung',     color: 'var(--color-danger)',   desc: 'Wartungsaufgaben & Service' },
  { id: 'setlists',   icon: '🎧', label: 'Setlists',    color: 'var(--color-success)',  desc: 'Setlists & Tracks' },
  { id: 'templates',   icon: '📋', label: 'Templates',   color: 'var(--color-text-muted)', desc: 'Wiederverwendbare Vorlagen' },
  { id: 'network',     icon: '🌐', label: 'Netzwerk',    color: 'var(--color-info)',     desc: 'Geräte & Topologie' },
  { id: 'portfolio',   icon: '🗂',  label: 'Portfolio',   color: 'var(--color-primary)',  desc: 'Referenzen & Projekte' },
  { id: 'inventory',   icon: '📦', label: 'Inventar',    color: 'var(--color-warning)',  desc: 'Equipment-Katalog' },
  { id: 'sets',        icon: '📋', label: 'Sets',        color: 'var(--color-success)',  desc: 'Equipment-Pakete' },
  { id: 'quotes',      icon: '📄', label: 'Angebote',    color: 'var(--color-success)',  desc: 'Angebote & Rechnungen' },
  { id: 'contacts',    icon: '👥', label: 'Kontakte',    color: 'var(--color-primary)',  desc: 'Kunden & Crew' },
  { id: 'reports',     icon: '📊', label: 'Berichte',    color: 'var(--color-info)',     desc: 'Statistiken & Auswertungen' },
];

export function MainDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reportsApi.overview()
      .then(data => { setStats(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  // Map stats to module badges
  function getBadge(id) {
    if (!stats) return null;
    switch (id) {
      case 'tickets':     return stats.tickets_open > 0 ? { value: stats.tickets_open, label: 'offen', color: 'var(--color-warning)' } : { value: stats.tickets_total, label: 'gesamt', color: 'var(--color-text-muted)' };
      case 'events':      return stats.events_upcoming > 0 ? { value: stats.events_upcoming, label: 'bevorstehend', color: 'var(--color-primary)' } : { value: stats.events_total, label: 'gesamt', color: 'var(--color-text-muted)' };
      case 'projects':    return stats.projects_active > 0 ? { value: stats.projects_active, label: 'aktiv', color: 'var(--color-warning)' } : null;
      case 'maintenance': return stats.maintenance_due > 0 ? { value: stats.maintenance_due, label: 'fällig', color: 'var(--color-danger)' } : null;
      case 'setlists':   return stats.setlists_total > 0 ? { value: stats.setlists_total, label: 'gesamt', color: 'var(--color-text-muted)' } : null;
      case 'network':     return stats.network_devices > 0 ? { value: stats.network_devices, label: 'Geräte', color: 'var(--color-text-muted)' } : null;
      case 'inventory':   return stats.inventory_in_repair > 0 ? { value: stats.inventory_in_repair, label: 'in Reparatur', color: 'var(--color-danger)' } : { value: stats.inventory_total, label: 'Artikel', color: 'var(--color-text-muted)' };
      case 'quotes':      return stats.quotes_open > 0 ? { value: stats.quotes_open, label: 'offen', color: 'var(--color-warning)' } : null;
      case 'contacts':    return stats.contacts_total > 0 ? { value: stats.contacts_total, label: 'gesamt', color: 'var(--color-text-muted)' } : null;
      default: return null;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Welcome header ─────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '1rem 0 0' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-info))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '.5rem'
        }}>
          🖥️ IT Management
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>
          Persönliches IT-System – Alle Bereiche im Überblick
        </p>
      </div>

      {/* ── Key stats ──────────────────────────────────── */}
      {loading ? (
        <div className="centered"><div className="spinner" /></div>
      ) : error ? (
        <div className="error-msg">{error}</div>
      ) : stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.tickets_open}</div>
            <div className="stat-label">Tickets offen</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{stats.events_upcoming}</div>
            <div className="stat-label">Bevorstehende Events</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.projects_active}</div>
            <div className="stat-label">Aktive Projekte</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: stats.maintenance_due > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {stats.maintenance_due}
            </div>
            <div className="stat-label">Wartung fällig</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.inventory_total}</div>
            <div className="stat-label">Inventar-Artikel</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--color-success)', fontSize: '1.1rem' }}>
              {fmtMoney(stats.revenue_this_year)}
            </div>
            <div className="stat-label">Umsatz dieses Jahr</div>
          </div>
        </div>
      )}

      {/* ── Module navigation cards ─────────────────────── */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Alle Bereiche
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '1rem'
        }}>
          {MODULES.map(mod => {
            const badge = getBadge(mod.id);
            return (
              <button
                key={mod.id}
                onClick={() => onNavigate(mod.id)}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                  padding: '1.25rem 1rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'var(--transition)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '.5rem',
                  position: 'relative',
                  color: 'var(--color-text)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = mod.color;
                  e.currentTarget.style.background = 'var(--color-surface-hover)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.background = 'var(--color-surface)';
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <span style={{ fontSize: '1.75rem' }}>{mod.icon}</span>
                <span style={{ fontWeight: 600, fontSize: '.95rem' }}>{mod.label}</span>
                <span style={{ fontSize: '.8rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>{mod.desc}</span>
                {badge && (
                  <span style={{
                    position: 'absolute',
                    top: '.6rem',
                    right: '.6rem',
                    background: badge.color,
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '.1rem .5rem',
                    fontSize: '.75rem',
                    fontWeight: 700,
                    lineHeight: 1.6,
                  }}>
                    {badge.value} {badge.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
