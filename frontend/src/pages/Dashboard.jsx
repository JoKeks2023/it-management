// src/pages/Dashboard.jsx
// Main page of the IT Management System.
// Shows summary stats, a filter bar, and the full ticket table.

import { useState, useEffect, useCallback } from 'react';
import { ticketsApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { TicketForm } from '../components/TicketForm';
import { TicketDetail } from '../components/TicketDetail';

const STATUSES = ['geplant', 'bestellt', 'installiert', 'fertig'];
const PRIORITIES = ['hoch', 'mittel', 'niedrig'];

function formatDate(str) {
  if (!str) return '–';
  return new Date(str).toLocaleDateString('de-DE');
}

export function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await ticketsApi.list(filters);
      setTickets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const handleCreated = (ticket) => {
    setShowCreate(false);
    setTickets(prev => [ticket, ...prev]);
  };

  const handleUpdated = (updated) => {
    setTickets(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Ticket wirklich löschen?')) return;
    try {
      await ticketsApi.delete(id);
      setTickets(prev => prev.filter(t => t.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      alert('Fehler: ' + err.message);
    }
  };

  // ── Stats ──────────────────────────────────────────────
  const stats = {
    total: tickets.length,
    offen: tickets.filter(t => t.status !== 'fertig').length,
    ausstehend: tickets.filter(t => t.materials_ordered < t.material_count && t.material_count > 0).length,
    fertig: tickets.filter(t => t.status === 'fertig').length
  };

  return (
    <div>
      {/* ── Stats ─────────────────────────────────────── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Tickets gesamt</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.offen}</div>
          <div className="stat-label">Tickets offen</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{stats.ausstehend}</div>
          <div className="stat-label">Bestellungen ausstehend</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>{stats.fertig}</div>
          <div className="stat-label">Erledigt</div>
        </div>
      </div>

      {/* ── Filter + New button ────────────────────────── */}
      <div className="filter-bar">
        <input
          className="form-input"
          placeholder="🔍 Suchen…"
          value={filters.search}
          onChange={e => setFilter('search', e.target.value)}
        />
        <select
          className="form-select"
          value={filters.status}
          onChange={e => setFilter('status', e.target.value)}
        >
          <option value="">Alle Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="form-select"
          value={filters.priority}
          onChange={e => setFilter('priority', e.target.value)}
        >
          <option value="">Alle Prioritäten</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setFilters({ status: '', priority: '', search: '' })}
        >
          ✕ Reset
        </button>
        <button
          className="btn btn-primary ml-auto"
          onClick={() => setShowCreate(true)}
        >
          + Neues Ticket
        </button>
      </div>

      {/* ── Ticket table ──────────────────────────────── */}
      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="centered"><div className="spinner" /></div>
        ) : tickets.length === 0 ? (
          <div className="centered">
            <p className="text-muted">Keine Tickets gefunden. Erstelle dein erstes Ticket!</p>
          </div>
        ) : (
          <table className="ticket-table">
            <thead>
              <tr>
                <th>Titel</th>
                <th>Status</th>
                <th>Priorität</th>
                <th>Asset</th>
                <th>Materialien</th>
                <th>Erstellt</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id} onClick={() => setSelectedId(t.id)}>
                  <td style={{ fontWeight: 500 }}>{t.title}</td>
                  <td><StatusBadge value={t.status} /></td>
                  <td><StatusBadge value={t.priority} /></td>
                  <td className="text-muted">{t.asset_name || t.asset_id || '–'}</td>
                  <td className="text-muted">
                    {t.material_count > 0
                      ? `${t.materials_ordered}/${t.material_count} bestellt`
                      : '–'}
                  </td>
                  <td className="text-muted">{formatDate(t.created_at)}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={e => handleDelete(t.id, e)}
                      aria-label="Ticket löschen"
                    >🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create form modal ─────────────────────────── */}
      {showCreate && (
        <TicketForm
          ticket={null}
          onSave={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* ── Ticket detail modal ───────────────────────── */}
      {selectedId && (
        <TicketDetail
          ticketId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
