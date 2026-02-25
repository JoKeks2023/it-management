// src/components/PackingList.jsx
// Modal showing the packing list for an event.
// Allows checking off items as they are loaded onto the transport.

import { useState, useEffect } from 'react';
import { inventoryApi } from '../services/api';

export function PackingList({ eventId, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = async () => {
    try {
      const res = await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:3001') + `/events/${eventId}/packing-list`
      );
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [eventId]);

  const handleTogglePacked = async (line) => {
    try {
      await inventoryApi.updateEventItem(eventId, line.id, { packed: !line.packed });
      setData(d => ({
        ...d,
        items: d.items.map(i => i.id === line.id ? { ...i, packed: i.packed ? 0 : 1 } : i),
        summary: {
          ...d.summary,
          packed:   d.summary.packed   + (line.packed ? -1 : 1),
          unpacked: d.summary.unpacked + (line.packed ?  1 : -1)
        }
      }));
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  const handleMarkAll = async (packed) => {
    try {
      await Promise.all(
        data.items
          .filter(i => !!i.packed !== packed)
          .map(i => inventoryApi.updateEventItem(eventId, i.id, { packed }))
      );
      await load();
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  if (loading) return (
    <div className="modal-backdrop">
      <div className="modal"><div className="centered"><div className="spinner" /></div></div>
    </div>
  );

  if (error || !data) return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal">
        <div className="card-body">
          <div className="error-msg">{error || 'Fehler beim Laden'}</div>
          <button className="btn btn-ghost" onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>
  );

  const pct = data.summary.total > 0
    ? Math.round((data.summary.packed / data.summary.total) * 100)
    : 0;

  const grouped = {};
  data.items.forEach(i => {
    const cat = i.category || 'Sonstiges';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(i);
  });

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontWeight: 600, fontSize: '1rem' }}>📋 Packliste – {data.event_title}</h2>
            {data.setup_date && (
              <div className="text-muted" style={{ fontSize: '.8rem' }}>Aufbau: {data.setup_date}</div>
            )}
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
          {/* Progress bar */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.35rem', fontSize: '.85rem' }}>
              <span>{data.summary.packed} / {data.summary.total} eingepackt</span>
              <span style={{ color: pct === 100 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>{pct}%</span>
            </div>
            <div style={{ background: 'var(--color-border)', borderRadius: 4, height: 8 }}>
              <div style={{ background: pct === 100 ? 'var(--color-success)' : 'var(--color-primary)', width: `${pct}%`, height: '100%', borderRadius: 4, transition: 'width .3s' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => handleMarkAll(true)}>✓ Alle einpacken</button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleMarkAll(false)}>✗ Alle zurücksetzen</button>
          </div>

          {/* Grouped by category */}
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: '1rem' }}>
              <p className="section-title">{cat}</p>
              <ul className="materials-list">
                {items.map(item => (
                  <li key={item.id} className={`material-item${item.packed ? ' done' : ''}`}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flex: 1, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!item.packed}
                        onChange={() => handleTogglePacked(item)} />
                      <span style={{ flex: 1 }}>
                        <strong>{item.item_name}</strong>
                        {item.quantity > 1 && <span className="text-muted"> × {item.quantity}</span>}
                        {item.barcode && <span className="text-muted" style={{ fontFamily: 'monospace', fontSize: '.75rem', marginLeft: '.5rem' }}>{item.barcode}</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Sub-rentals */}
          {data.subrentals && data.subrentals.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <p className="section-title">Fremdmiete</p>
              <ul className="materials-list">
                {data.subrentals.map(sr => (
                  <li key={sr.id} className={`material-item${sr.subrental_status === 'zurückgegeben' ? ' done' : ''}`}>
                    <span style={{ flex: 1 }}>
                      {sr.item_name}
                      {sr.quantity > 1 && <span className="text-muted"> × {sr.quantity}</span>}
                      {sr.supplier_name && <span className="text-muted"> · {sr.supplier_name}</span>}
                    </span>
                    <span className="text-muted" style={{ fontSize: '.78rem' }}>{sr.subrental_status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.items.length === 0 && data.subrentals.length === 0 && (
            <p className="text-muted">Noch keine Artikel für diesen Event gebucht.</p>
          )}
        </div>
      </div>
    </div>
  );
}
