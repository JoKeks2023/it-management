// src/pages/EventsDashboard.jsx
// Events / Booking dashboard: stats, filter bar, event table, detail/create modals.

import { useState, useEffect, useCallback } from 'react';
import { eventsApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { EventForm }   from '../components/EventForm';
import { EventDetail } from '../components/EventDetail';

const EVENT_TYPES      = ['DJ', 'Technik', 'Netzwerk-Setup', 'Hybrid'];
const STATUSES         = ['angefragt', 'bestätigt', 'vorbereitet', 'durchgeführt', 'abgeschlossen'];
const PAYMENT_STATUSES = ['offen', 'angezahlt', 'bezahlt'];

function formatDate(str) {
  if (!str) return '–';
  return new Date(str).toLocaleDateString('de-DE', { dateStyle: 'short' });
}

export function EventsDashboard() {
  const [events,     setEvents]     = useState([]);
  const [upcoming,   setUpcoming]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [filters,    setFilters]    = useState({ status: '', event_type: '', search: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [evs, up] = await Promise.all([
        eventsApi.list(filters),
        eventsApi.upcoming()
      ]);
      setEvents(evs);
      setUpcoming(up);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const handleCreated = (event) => {
    setShowCreate(false);
    setEvents(prev => [...prev, event].sort((a, b) =>
      (a.event_date || '').localeCompare(b.event_date || '')));
  };

  const handleUpdated = (updated) => {
    setEvents(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
  };

  const handleDelete = async (id, ev) => {
    ev.stopPropagation();
    if (!confirm('Event wirklich löschen?')) return;
    try {
      await eventsApi.delete(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  // Stats
  const stats = {
    total:      events.length,
    angefragt:  events.filter(e => e.status === 'angefragt').length,
    bestätigt:  events.filter(e => e.status === 'bestätigt').length,
    offen:      events.filter(e => e.payment_status === 'offen').length,
    umsatz:     events.filter(e => e.price_estimate != null)
                      .reduce((s, e) => s + (Number(e.price_estimate) || 0), 0)
  };

  return (
    <div>
      {/* ── Upcoming banner ─────────────────────────── */}
      {upcoming.length > 0 && (
        <div className="card mb-4" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div className="card-header" style={{ fontSize: '.85rem' }}>
            📅 Nächste Events
          </div>
          <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '.75rem 1.25rem' }}>
            {upcoming.slice(0, 4).map(e => (
              <div key={e.id}
                onClick={() => setSelectedId(e.id)}
                style={{ cursor: 'pointer', padding: '.4rem .75rem', borderRadius: 6,
                         background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                         fontSize: '.8rem' }}>
                <div style={{ fontWeight: 600 }}>{e.title}</div>
                <div className="text-muted">{formatDate(e.event_date)}{e.start_time ? ` · ${e.start_time}` : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats ────────────────────────────────────── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Events gesamt</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.angefragt}</div>
          <div className="stat-label">Angefragt</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{stats.bestätigt}</div>
          <div className="stat-label">Bestätigt</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{stats.offen}</div>
          <div className="stat-label">Zahlung offen</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-success)', fontSize: '1.4rem' }}>
            {stats.umsatz.toFixed(0)} €
          </div>
          <div className="stat-label">Geschätzter Umsatz</div>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────── */}
      <div className="filter-bar">
        <input className="form-input" placeholder="🔍 Suchen (Titel, Kunde, Ort)…"
          value={filters.search} onChange={e => setFilter('search', e.target.value)} />
        <select className="form-select" value={filters.event_type}
          onChange={e => setFilter('event_type', e.target.value)}>
          <option value="">Alle Typen</option>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="form-select" value={filters.status}
          onChange={e => setFilter('status', e.target.value)}>
          <option value="">Alle Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-select" value={filters.payment_status || ''}
          onChange={e => setFilter('payment_status', e.target.value)}>
          <option value="">Alle Zahlungen</option>
          {PAYMENT_STATUSES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm"
          onClick={() => setFilters({ status: '', event_type: '', search: '', payment_status: '' })}>
          ✕ Reset
        </button>
        <button className="btn btn-primary ml-auto" onClick={() => setShowCreate(true)}>
          + Neues Event
        </button>
      </div>

      {/* ── Event table ──────────────────────────────── */}
      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="centered"><div className="spinner" /></div>
        ) : events.length === 0 ? (
          <div className="centered">
            <p className="text-muted">Keine Events gefunden. Erstelle dein erstes Event!</p>
          </div>
        ) : (
          <table className="ticket-table">
            <thead>
              <tr>
                <th>Titel</th>
                <th>Typ</th>
                <th>Datum</th>
                <th>Ort</th>
                <th>Kunde</th>
                <th>Status</th>
                <th>Zahlung</th>
                <th>Preis</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => (
                <tr key={e.id} onClick={() => setSelectedId(e.id)}>
                  <td style={{ fontWeight: 500 }}>{e.title}</td>
                  <td><StatusBadge value={e.event_type} /></td>
                  <td className="text-muted">{formatDate(e.event_date)}{e.start_time ? ` ${e.start_time}` : ''}</td>
                  <td className="text-muted">{e.location || '–'}</td>
                  <td className="text-muted">{e.client_name || '–'}</td>
                  <td><StatusBadge value={e.status} /></td>
                  <td><StatusBadge value={e.payment_status} /></td>
                  <td className="text-muted">{e.price_estimate != null ? `${Number(e.price_estimate).toFixed(0)} €` : '–'}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm"
                      onClick={ev => handleDelete(e.id, ev)} aria-label="Event löschen">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <EventForm event={null} onSave={handleCreated} onClose={() => setShowCreate(false)} />
      )}
      {selectedId && (
        <EventDetail eventId={selectedId} onClose={() => setSelectedId(null)} onUpdated={handleUpdated} />
      )}
    </div>
  );
}
