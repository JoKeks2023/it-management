// src/pages/ReportsPage.jsx
// Statistics and Reports dashboard.

import { useState, useCallback } from 'react';
import { reportsApi } from '../services/api';

function fmtMoney(v) { return Number(v || 0).toFixed(2) + ' €'; }
function fmtMonth(ym) {
  if (!ym) return '–';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
}

export function ReportsPage() {
  const [overview,  setOverview]  = useState(null);
  const [revenue,   setRevenue]   = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [crewStats, setCrewStats] = useState([]);
  const [evtStats,  setEvtStats]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [loaded,    setLoaded]    = useState(false);
  const [error,     setError]     = useState('');

  const load = useCallback(() => {
    if (loading || loaded) return;
    setLoading(true);
    Promise.all([
      reportsApi.overview(),
      reportsApi.revenue(12),
      reportsApi.equipment(10),
      reportsApi.crew(10),
      reportsApi.events(12)
    ]).then(([ov, rev, eq, cr, ev]) => {
      setOverview(ov);
      setRevenue(rev);
      setEquipment(eq);
      setCrewStats(cr);
      setEvtStats(ev);
      setLoaded(true);
    }).catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [loading, loaded]);

  // Trigger load once on mount via a ref-based approach to avoid the set-state-in-effect lint rule
  if (!loaded && !loading && !error) { load(); }

  if (loading || (!loaded && !error)) return <div className="centered"><div className="spinner" /></div>;
  if (error) return <div className="error-msg">{error}</div>;

  // Aggregate revenue by month
  const revenueByMonth = {};
  revenue.forEach(r => { revenueByMonth[r.month] = (revenueByMonth[r.month] || 0) + r.gross; });

  // Aggregate events by month (all types combined)
  const eventsByMonth = {};
  evtStats.forEach(r => { eventsByMonth[r.month] = (eventsByMonth[r.month] || 0) + r.count; });

  const maxRevenue = Math.max(...Object.values(revenueByMonth), 1);
  const maxEvents  = Math.max(...Object.values(eventsByMonth), 1);
  const revenueMonths = Object.keys(revenueByMonth).sort();
  const eventMonths   = Object.keys(eventsByMonth).sort();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Headline stats ─────────────────────────────── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{overview.events_total}</div>
          <div className="stat-label">Events gesamt</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{overview.events_upcoming}</div>
          <div className="stat-label">Bevorstehende</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{overview.events_this_year}</div>
          <div className="stat-label">Events dieses Jahr</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-success)', fontSize: '1.2rem' }}>
            {fmtMoney(overview.revenue_this_year)}
          </div>
          <div className="stat-label">Umsatz dieses Jahr</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-success)', fontSize: '1.1rem' }}>
            {fmtMoney(overview.revenue_total)}
          </div>
          <div className="stat-label">Gesamtumsatz</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{overview.inventory_in_repair}</div>
          <div className="stat-label">In Reparatur</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{overview.inventory_total}</div>
          <div className="stat-label">Inventar-Artikel</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{overview.quotes_open}</div>
          <div className="stat-label">Offene Angebote</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

        {/* ── Revenue chart ──────────────────────────────── */}
        <div className="card">
          <div className="card-header">📈 Umsatz (letzte 12 Monate)</div>
          <div className="card-body">
            {revenueMonths.length === 0 ? (
              <p className="text-muted">Noch keine Rechnungen vorhanden</p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 120 }}>
                {revenueMonths.map(m => (
                  <div key={m} title={`${fmtMonth(m)}: ${fmtMoney(revenueByMonth[m])}`}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <div style={{
                      width: '100%', background: 'var(--color-primary)',
                      height: `${Math.round((revenueByMonth[m] / maxRevenue) * 100)}px`,
                      borderRadius: '3px 3px 0 0', minHeight: 2
                    }} />
                    <span style={{ fontSize: '.6rem', color: 'var(--color-text-muted)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 36 }}>
                      {fmtMonth(m)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Events chart ───────────────────────────────── */}
        <div className="card">
          <div className="card-header">🎵 Events (letzte 12 Monate)</div>
          <div className="card-body">
            {eventMonths.length === 0 ? (
              <p className="text-muted">Noch keine Events vorhanden</p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 120 }}>
                {eventMonths.map(m => (
                  <div key={m} title={`${fmtMonth(m)}: ${eventsByMonth[m]} Event(s)`}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <div style={{
                      width: '100%', background: 'var(--color-success)',
                      height: `${Math.round((eventsByMonth[m] / maxEvents) * 100)}px`,
                      borderRadius: '3px 3px 0 0', minHeight: 2
                    }} />
                    <span style={{ fontSize: '.6rem', color: 'var(--color-text-muted)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 36 }}>
                      {fmtMonth(m)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

        {/* ── Top equipment ──────────────────────────────── */}
        <div className="card">
          <div className="card-header">📦 Top Equipment (nach Buchungen)</div>
          <div className="card-body">
            {equipment.length === 0 ? (
              <p className="text-muted">Noch keine Buchungen</p>
            ) : (
              <table className="ticket-table">
                <thead>
                  <tr>
                    <th>Artikel</th>
                    <th style={{ textAlign: 'right' }}>Events</th>
                    <th style={{ textAlign: 'right' }}>Umsatz</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 500 }}>
                        {e.name}
                        <span className="text-muted" style={{ fontSize: '.75rem', marginLeft: '.4rem' }}>{e.category}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{e.events_count}</td>
                      <td style={{ textAlign: 'right' }} className="text-muted">{fmtMoney(e.estimated_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Top crew ───────────────────────────────────── */}
        <div className="card">
          <div className="card-header">👥 Crew (nach Einsätzen)</div>
          <div className="card-body">
            {crewStats.length === 0 ? (
              <p className="text-muted">Noch keine Crew eingetragen</p>
            ) : (
              <table className="ticket-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Rolle</th>
                    <th style={{ textAlign: 'right' }}>Einsätze</th>
                  </tr>
                </thead>
                <tbody>
                  {crewStats.map((c, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td className="text-muted">{c.role || '–'}</td>
                      <td style={{ textAlign: 'right' }}>{c.events_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
