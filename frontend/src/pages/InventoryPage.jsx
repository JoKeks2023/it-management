// src/pages/InventoryPage.jsx
// Equipment catalog page: list, create, edit, delete inventory items + repair log.

import { useState, useEffect, useCallback } from 'react';
import { inventoryApi } from '../services/api';
import { StatusBadge }   from '../components/StatusBadge';
import { InventoryForm } from '../components/InventoryForm';

const REPAIR_STATUSES = ['defekt','in-reparatur','repariert','abgeschrieben'];
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function RepairModal({ item, onClose }) {
  const [logs,      setLogs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [newIssue,  setNewIssue]  = useState({ issue_description: '', quantity_affected: 1, status: 'defekt' });
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const load = useCallback(async () => {
    try {
      const r = await inventoryApi.getRepairs(item.id);
      setLogs(r);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [item.id]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newIssue.issue_description.trim()) return;
    setSaving(true);
    try {
      await inventoryApi.createRepair(item.id, newIssue);
      setNewIssue({ issue_description: '', quantity_affected: 1, status: 'defekt' });
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (log, status) => {
    try {
      await inventoryApi.updateRepair(item.id, log.id, { status });
      await load();
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  const handleDelete = async (logId) => {
    try {
      await inventoryApi.deleteRepair(item.id, logId);
      setLogs(prev => prev.filter(l => l.id !== logId));
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  const activeCount = logs.filter(l => l.status === 'defekt' || l.status === 'in-reparatur')
    .reduce((s, l) => s + l.quantity_affected, 0);

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontWeight: 600, fontSize: '1rem' }}>🔧 Reparatur – {item.name}</h2>
            {activeCount > 0 && (
              <div style={{ color: 'var(--color-danger)', fontSize: '.8rem' }}>
                {activeCount} Stk. aktuell defekt / in Reparatur
              </div>
            )}
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Schließen">✕</button>
        </div>
        <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', maxHeight: 'calc(100vh - 240px)' }}>
          {error && <div className="error-msg">{error}</div>}

          {/* Add new */}
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-end' }}>
            <input className="form-input" style={{ flex: '2 1 200px', fontSize: '.85rem' }}
              placeholder="Problem beschreiben…" value={newIssue.issue_description}
              onChange={e => setNewIssue(n => ({ ...n, issue_description: e.target.value }))} required />
            <input className="form-input" type="number" min="1" max={item.quantity}
              style={{ flex: '0 1 60px', fontSize: '.85rem' }}
              placeholder="Stk" value={newIssue.quantity_affected}
              onChange={e => setNewIssue(n => ({ ...n, quantity_affected: Number(e.target.value) }))} />
            <select className="form-select" style={{ flex: '0 1 120px', fontSize: '.85rem' }}
              value={newIssue.status}
              onChange={e => setNewIssue(n => ({ ...n, status: e.target.value }))}>
              {['defekt','in-reparatur'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="submit" className="btn btn-ghost btn-sm" disabled={saving}>+ Eintragen</button>
          </form>

          {/* Log list */}
          {loading ? <div className="spinner" /> : logs.length === 0 ? (
            <p className="text-muted">Keine Einträge</p>
          ) : (
            <ul className="materials-list">
              {logs.map(log => (
                <li key={log.id} className={`material-item${log.status === 'repariert' || log.status === 'abgeschrieben' ? ' done' : ''}`}>
                  <span style={{ flex: 1 }}>
                    <strong style={{ fontSize: '.85rem' }}>{log.issue_description}</strong>
                    <span className="text-muted" style={{ fontSize: '.75rem' }}> · {log.quantity_affected} Stk</span>
                    <span className="text-muted" style={{ fontSize: '.72rem', display: 'block' }}>
                      {new Date(log.reported_at).toLocaleDateString('de-DE')}
                      {log.resolved_at && ` → ${new Date(log.resolved_at).toLocaleDateString('de-DE')}`}
                    </span>
                  </span>
                  <select className="form-select" style={{ fontSize: '.78rem', padding: '2px 4px', height: 'auto' }}
                    value={log.status}
                    onChange={e => handleStatusChange(log, e.target.value)}>
                    {REPAIR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(log.id)}>🗑</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function InventoryPage() {
  const [items,      setItems]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [filters,    setFilters]    = useState({ category: '', search: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [editItem,   setEditItem]   = useState(null);
  const [repairItem, setRepairItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [its, cats] = await Promise.all([
        inventoryApi.list(filters),
        inventoryApi.categories()
      ]);
      setItems(its);
      setCategories(cats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const handleCreated = (item) => {
    setShowCreate(false);
    setItems(prev => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleUpdated = (updated) => {
    setEditItem(null);
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Artikel wirklich löschen? Bestehende Buchungen bleiben erhalten.')) return;
    try {
      await inventoryApi.delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  // Stats
  const totalValue = items.reduce((s, i) => s + (i.purchase_price || 0) * i.quantity, 0);
  const stats = {
    total:      items.length,
    quantity:   items.reduce((s, i) => s + i.quantity, 0),
    categories: categories.length,
    value:      totalValue
  };

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Artikel gesamt</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{stats.quantity}</div>
          <div className="stat-label">Gesamtbestand</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.categories}</div>
          <div className="stat-label">Kategorien</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-success)', fontSize: '1.3rem' }}>
            {stats.value.toFixed(0)} €
          </div>
          <div className="stat-label">Kaufwert gesamt</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <input className="form-input" placeholder="🔍 Name, Beschreibung, Barcode…"
          value={filters.search} onChange={e => setFilter('search', e.target.value)} />
        <select className="form-select" value={filters.category}
          onChange={e => setFilter('category', e.target.value)}>
          <option value="">Alle Kategorien</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm"
          onClick={() => setFilters({ category: '', search: '' })}>✕ Reset</button>
        <button className="btn btn-primary ml-auto" onClick={() => setShowCreate(true)}>
          + Neuer Artikel
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="centered"><div className="spinner" /></div>
        ) : items.length === 0 ? (
          <div className="centered">
            <p className="text-muted">Kein Equipment. Füge deinen ersten Artikel zum Inventar hinzu!</p>
          </div>
        ) : (
          <table className="ticket-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Kategorie</th>
                <th style={{ textAlign: 'right' }}>Bestand</th>
                <th style={{ textAlign: 'right' }}>Tagessatz</th>
                <th style={{ textAlign: 'right' }}>Kaufwert</th>
                <th>Barcode</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} onClick={() => setEditItem(item)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500 }}>
                    {item.name}
                    {item.description && <div className="text-muted" style={{ fontSize: '.75rem', fontWeight: 400 }}>{item.description}</div>}
                  </td>
                  <td><StatusBadge value={item.category} /></td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }} className="text-muted">
                    {item.rental_rate > 0 ? `${Number(item.rental_rate).toFixed(2)} €` : '–'}
                  </td>
                  <td style={{ textAlign: 'right' }} className="text-muted">
                    {item.purchase_price != null ? `${Number(item.purchase_price).toFixed(0)} €` : '–'}
                  </td>
                  <td className="text-muted" style={{ fontFamily: 'monospace', fontSize: '.78rem' }}>
                    {item.barcode || '–'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '.3rem' }}>
                      <button className="btn btn-ghost btn-sm"
                        onClick={e => { e.stopPropagation(); setEditItem(item); }} title="Bearbeiten">✏️</button>
                      <button className="btn btn-ghost btn-sm"
                        onClick={e => { e.stopPropagation(); setRepairItem(item); }} title="Reparatur">🔧</button>
                      <button className="btn btn-ghost btn-sm"
                        onClick={e => handleDelete(item.id, e)} title="Löschen">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <InventoryForm item={null} onSave={handleCreated} onClose={() => setShowCreate(false)} />
      )}
      {editItem && (
        <InventoryForm item={editItem} onSave={handleUpdated} onClose={() => setEditItem(null)} />
      )}
      {repairItem && (
        <RepairModal item={repairItem} onClose={() => setRepairItem(null)} />
      )}
    </div>
  );
}


