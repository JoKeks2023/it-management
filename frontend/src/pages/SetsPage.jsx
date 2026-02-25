// src/pages/SetsPage.jsx
// Equipment Sets / Packages page – create, edit, delete sets and apply them to events.

import { useState, useEffect, useCallback } from 'react';
import { setsApi } from '../services/api';
import { SetForm } from '../components/SetForm';

export function SetsPage() {
  const [sets,       setSets]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editSet,    setEditSet]    = useState(null);  // full set object (with items)

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSets(await setsApi.list());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (s) => {
    setShowCreate(false);
    // Open it immediately in edit mode so user can add items right away
    setsApi.get(s.id).then(full => setEditSet(full)).catch(() => {});
    setSets(prev => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleUpdated = (s) => {
    setEditSet(null);
    setSets(prev => prev.map(x => x.id === s.id ? { ...x, ...s } : x));
    load(); // refresh item_count
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Set wirklich löschen?')) return;
    try {
      await setsApi.delete(id);
      setSets(prev => prev.filter(s => s.id !== id));
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  const handleRowClick = async (s) => {
    try {
      const full = await setsApi.get(s.id);
      setEditSet(full);
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{sets.length}</div>
          <div className="stat-label">Sets gesamt</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-primary)' }}>
            {sets.reduce((s, x) => s + (x.item_count || 0), 0)}
          </div>
          <div className="stat-label">Artikel gesamt</div>
        </div>
      </div>

      <div className="filter-bar">
        <button className="btn btn-primary ml-auto" onClick={() => setShowCreate(true)}>
          + Neues Set
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="centered"><div className="spinner" /></div>
        ) : sets.length === 0 ? (
          <div className="centered">
            <p className="text-muted">Keine Sets. Erstelle dein erstes Equipment-Set!</p>
            <p className="text-muted" style={{ fontSize: '.85rem', marginTop: '.5rem' }}>
              Sets sind vordefinierte Gruppen von Artikeln (z.B. &quot;DJ Standard-Set&quot;), die du mit einem Klick einem Event hinzufügen kannst.
            </p>
          </div>
        ) : (
          <table className="ticket-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Beschreibung</th>
                <th style={{ textAlign: 'right' }}>Artikel</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sets.map(s => (
                <tr key={s.id} onClick={() => handleRowClick(s)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500 }}>📦 {s.name}</td>
                  <td className="text-muted">{s.description || '–'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{s.item_count || 0}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '.3rem' }}>
                      <button className="btn btn-ghost btn-sm"
                        onClick={e => { e.stopPropagation(); handleRowClick(s); }} title="Bearbeiten">✏️</button>
                      <button className="btn btn-ghost btn-sm"
                        onClick={e => handleDelete(s.id, e)} title="Löschen">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <SetForm set={null} onSave={handleCreated} onClose={() => setShowCreate(false)} />
      )}
      {editSet && (
        <SetForm set={editSet} onSave={handleUpdated} onClose={() => setEditSet(null)} />
      )}
    </div>
  );
}
