// src/pages/QuotesPage.jsx
// Quotes & Invoices overview: list all documents, create new, open detail view.

import { useState, useEffect, useCallback } from 'react';
import { quotesApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { QuoteView }   from '../components/QuoteView';

const QUOTE_TYPES = ['Angebot', 'Rechnung', 'Gutschrift'];
const STATUSES    = ['Entwurf', 'Gesendet', 'Angenommen', 'Abgelehnt', 'Bezahlt', 'Storniert'];

function fmtDate(str) {
  if (!str) return '–';
  return new Date(str).toLocaleDateString('de-DE', { dateStyle: 'short' });
}

export function QuotesPage() {
  const [quotes,     setQuotes]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [filters,    setFilters]    = useState({ quote_type: '', status: '' });
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setQuotes(await quotesApi.list(filters));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const handleUpdated = (updated) => {
    setQuotes(prev => prev.map(q => q.id === updated.id ? { ...q, ...updated } : q));
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Dokument wirklich löschen?')) return;
    try {
      await quotesApi.delete(id);
      setQuotes(prev => prev.filter(q => q.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  // Stats
  const stats = {
    total:    quotes.length,
    angebote: quotes.filter(q => q.quote_type === 'Angebot').length,
    rechnungen: quotes.filter(q => q.quote_type === 'Rechnung').length,
    offen:    quotes.filter(q => q.status === 'Gesendet' || q.status === 'Angenommen').length,
    umsatz:   quotes.filter(q => q.quote_type === 'Rechnung' && q.status !== 'Storniert')
                    .reduce((s, q) => s + (Number(q.total) || 0), 0)
  };

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Dokumente gesamt</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{stats.angebote}</div>
          <div className="stat-label">Angebote</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.rechnungen}</div>
          <div className="stat-label">Rechnungen</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{stats.offen}</div>
          <div className="stat-label">Ausstehend</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-success)', fontSize: '1.3rem' }}>
            {stats.umsatz.toFixed(0)} €
          </div>
          <div className="stat-label">Rechnungssumme</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <select className="form-select" value={filters.quote_type}
          onChange={e => setFilter('quote_type', e.target.value)}>
          <option value="">Alle Typen</option>
          {QUOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="form-select" value={filters.status}
          onChange={e => setFilter('status', e.target.value)}>
          <option value="">Alle Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm"
          onClick={() => setFilters({ quote_type: '', status: '' })}>✕ Reset</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="centered"><div className="spinner" /></div>
        ) : quotes.length === 0 ? (
          <div className="centered">
            <p className="text-muted">Keine Dokumente. Erstelle ein Angebot über einen Event!</p>
          </div>
        ) : (
          <table className="ticket-table">
            <thead>
              <tr>
                <th>Nummer</th>
                <th>Typ</th>
                <th>Kunde</th>
                <th>Datum</th>
                <th>Positionen</th>
                <th style={{ textAlign: 'right' }}>Gesamt</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id} onClick={() => setSelectedId(q.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '.85rem' }}>{q.quote_number}</td>
                  <td><StatusBadge value={q.quote_type} /></td>
                  <td className="text-muted">{q.client_name || '–'}</td>
                  <td className="text-muted">{fmtDate(q.issue_date)}</td>
                  <td className="text-muted">{q.item_count}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(q.total).toFixed(2)} €</td>
                  <td><StatusBadge value={q.status} /></td>
                  <td>
                    <button className="btn btn-ghost btn-sm"
                      onClick={e => handleDelete(q.id, e)} title="Löschen">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedId && (
        <QuoteView quoteId={selectedId} onClose={() => setSelectedId(null)} onUpdated={handleUpdated} />
      )}
    </div>
  );
}
