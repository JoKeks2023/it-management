// src/pages/InventoryPage.jsx
// Equipment catalog page: list, create, edit, delete inventory items.

import { useState, useEffect, useCallback } from 'react';
import { inventoryApi } from '../services/api';
import { StatusBadge }   from '../components/StatusBadge';
import { InventoryForm } from '../components/InventoryForm';

export function InventoryPage() {
  const [items,      setItems]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [filters,    setFilters]    = useState({ category: '', search: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [editItem,   setEditItem]   = useState(null);

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
    </div>
  );
}
