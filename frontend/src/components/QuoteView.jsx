// src/components/QuoteView.jsx
// Modal for viewing and editing a quote / invoice with line items and totals.

import { useState, useEffect } from 'react';
import { quotesApi } from '../services/api';
import { StatusBadge } from './StatusBadge';

const STATUSES = ['Entwurf', 'Gesendet', 'Angenommen', 'Abgelehnt', 'Bezahlt', 'Storniert'];

function fmtMoney(v) {
  return Number(v || 0).toFixed(2) + ' €';
}

export function QuoteView({ quoteId, onClose, onUpdated }) {
  const [quote,   setQuote]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [newItem, setNewItem] = useState({ description: '', quantity: 1, unit: 'Tag', unit_price: 0 });
  const [addingItem, setAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // { id, description, quantity, unit, unit_price }

  const load = async () => {
    try {
      setQuote(await quotesApi.get(quoteId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [quoteId]);

  const handleStatusChange = async (status) => {
    try {
      const updated = await quotesApi.update(quoteId, { status });
      setQuote(updated);
      onUpdated && onUpdated(updated);
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.description.trim()) return;
    setAddingItem(true);
    try {
      await quotesApi.addItem(quoteId, {
        ...newItem,
        quantity: Number(newItem.quantity),
        unit_price: Number(newItem.unit_price)
      });
      setNewItem({ description: '', quantity: 1, unit: 'Tag', unit_price: 0 });
      await load();
    } catch (err) { alert('Fehler: ' + err.message); }
    finally { setAddingItem(false); }
  };

  const handleSaveEditItem = async () => {
    if (!editingItem) return;
    try {
      await quotesApi.updateItem(quoteId, editingItem.id, {
        description: editingItem.description,
        quantity: Number(editingItem.quantity),
        unit: editingItem.unit,
        unit_price: Number(editingItem.unit_price)
      });
      setEditingItem(null);
      await load();
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Position löschen?')) return;
    try {
      await quotesApi.deleteItem(quoteId, itemId);
      await load();
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  if (loading) return (
    <div className="modal-backdrop">
      <div className="modal"><div className="centered"><div className="spinner" /></div></div>
    </div>
  );

  if (error || !quote) return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal">
        <div className="card-body">
          <div className="error-msg">{error || 'Dokument nicht gefunden'}</div>
          <button className="btn btn-ghost" onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 820 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <StatusBadge value={quote.quote_type} />
            <StatusBadge value={quote.status} />
            <h2 style={{ fontWeight: 600, fontSize: '1rem' }}>{quote.quote_number}</h2>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        <div style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
          <div className="detail-grid">
            {/* Left: line items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Client */}
              {quote.client_name && (
                <div>
                  <p className="section-title">Empfänger</p>
                  <p style={{ fontSize: '.9rem' }}>{quote.client_name}</p>
                  {quote.client_address && <p style={{ fontSize: '.8rem', whiteSpace: 'pre-wrap', color: 'var(--color-text-muted)' }}>{quote.client_address}</p>}
                </div>
              )}

              {/* Dates */}
              <dl className="detail-meta">
                <dt>Datum</dt>          <dd>{quote.issue_date || '–'}</dd>
                <dt>Gültig bis</dt>     <dd>{quote.valid_until || '–'}</dd>
                <dt>Steuer</dt>         <dd>{quote.tax_rate}%</dd>
              </dl>

              {/* Items table */}
              <div>
                <p className="section-title">Positionen</p>
                <table className="ticket-table" style={{ marginBottom: '.75rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '2rem' }}>#</th>
                      <th>Beschreibung</th>
                      <th style={{ width: '5rem', textAlign: 'right' }}>Menge</th>
                      <th style={{ width: '4rem' }}>Einh.</th>
                      <th style={{ width: '6rem', textAlign: 'right' }}>EP (€)</th>
                      <th style={{ width: '6rem', textAlign: 'right' }}>GP (€)</th>
                      <th style={{ width: '4rem' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items.map((it, idx) => (
                      <tr key={it.id}>
                        {editingItem?.id === it.id ? (
                          <>
                            <td>{idx + 1}</td>
                            <td><input className="form-input" style={{ fontSize: '.8rem' }}
                              value={editingItem.description}
                              onChange={e => setEditingItem(ei => ({ ...ei, description: e.target.value }))} /></td>
                            <td><input className="form-input" type="number" style={{ fontSize: '.8rem', textAlign: 'right' }}
                              value={editingItem.quantity}
                              onChange={e => setEditingItem(ei => ({ ...ei, quantity: e.target.value }))} /></td>
                            <td><input className="form-input" style={{ fontSize: '.8rem' }}
                              value={editingItem.unit}
                              onChange={e => setEditingItem(ei => ({ ...ei, unit: e.target.value }))} /></td>
                            <td><input className="form-input" type="number" step="0.01" style={{ fontSize: '.8rem', textAlign: 'right' }}
                              value={editingItem.unit_price}
                              onChange={e => setEditingItem(ei => ({ ...ei, unit_price: e.target.value }))} /></td>
                            <td style={{ textAlign: 'right', fontSize: '.8rem' }}>
                              {fmtMoney(editingItem.quantity * editingItem.unit_price)}
                            </td>
                            <td>
                              <button className="btn btn-primary btn-sm" onClick={handleSaveEditItem}>✓</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="text-muted">{idx + 1}</td>
                            <td>{it.description}</td>
                            <td style={{ textAlign: 'right' }}>{it.quantity}</td>
                            <td className="text-muted">{it.unit}</td>
                            <td style={{ textAlign: 'right' }}>{fmtMoney(it.unit_price)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(it.total)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '.2rem' }}>
                                <button className="btn btn-ghost btn-sm"
                                  onClick={() => setEditingItem({ ...it })}>✏️</button>
                                <button className="btn btn-ghost btn-sm"
                                  onClick={() => handleDeleteItem(it.id)}>🗑</button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Add new item form */}
                <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <input className="form-input" style={{ flex: '2 1 200px', fontSize: '.85rem' }}
                    placeholder="Beschreibung" value={newItem.description}
                    onChange={e => setNewItem(n => ({ ...n, description: e.target.value }))} />
                  <input className="form-input" type="number" min="0" style={{ flex: '0 1 70px', fontSize: '.85rem' }}
                    placeholder="Menge" value={newItem.quantity}
                    onChange={e => setNewItem(n => ({ ...n, quantity: e.target.value }))} />
                  <input className="form-input" style={{ flex: '0 1 60px', fontSize: '.85rem' }}
                    placeholder="Einh." value={newItem.unit}
                    onChange={e => setNewItem(n => ({ ...n, unit: e.target.value }))} />
                  <input className="form-input" type="number" step="0.01" min="0" style={{ flex: '0 1 90px', fontSize: '.85rem' }}
                    placeholder="EP (€)" value={newItem.unit_price}
                    onChange={e => setNewItem(n => ({ ...n, unit_price: e.target.value }))} />
                  <button type="submit" className="btn btn-ghost btn-sm" disabled={addingItem}>
                    + Position
                  </button>
                </form>
              </div>

              {/* Notes */}
              {quote.notes && (
                <div>
                  <p className="section-title">Anmerkungen</p>
                  <p style={{ fontSize: '.9rem', whiteSpace: 'pre-wrap' }}>{quote.notes}</p>
                </div>
              )}
            </div>

            {/* Right: totals + status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Totals */}
              <div className="card">
                <div className="card-header">Betrag</div>
                <div className="card-body">
                  <table style={{ width: '100%', fontSize: '.9rem', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td className="text-muted" style={{ paddingBottom: '.25rem' }}>Netto</td>
                        <td style={{ textAlign: 'right', paddingBottom: '.25rem' }}>{fmtMoney(quote.subtotal)}</td>
                      </tr>
                      <tr>
                        <td className="text-muted" style={{ paddingBottom: '.25rem' }}>MwSt. ({quote.tax_rate}%)</td>
                        <td style={{ textAlign: 'right', paddingBottom: '.25rem' }}>{fmtMoney(quote.tax_amount)}</td>
                      </tr>
                      <tr style={{ borderTop: '2px solid var(--color-border)', fontWeight: 700 }}>
                        <td style={{ paddingTop: '.5rem' }}>Gesamt</td>
                        <td style={{ textAlign: 'right', paddingTop: '.5rem', fontSize: '1.1rem', color: 'var(--color-success)' }}>
                          {fmtMoney(quote.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status workflow */}
              <div className="card">
                <div className="card-header">Status</div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                  {STATUSES.map(s => (
                    <button key={s}
                      className={`btn btn-sm w-full ${quote.status === s ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => handleStatusChange(s)} disabled={quote.status === s}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
