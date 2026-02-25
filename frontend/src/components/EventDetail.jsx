// src/components/EventDetail.jsx
// Modal showing full event details with inline status/payment updates,
// equipment reservation management, file attachments, and change history.

import { useState, useEffect, useRef } from 'react';
import { eventsApi, contactsApi, inventoryApi, quotesApi } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { EventForm } from './EventForm';
import { QuoteView } from './QuoteView';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const STATUSES         = ['angefragt', 'bestätigt', 'vorbereitet', 'durchgeführt', 'abgeschlossen'];
const PAYMENT_STATUSES = ['offen', 'angezahlt', 'bezahlt'];

function fmt(str) {
  if (!str) return '–';
  return new Date(str).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

function formatDate(str) {
  if (!str) return '–';
  return new Date(str).toLocaleDateString('de-DE', { dateStyle: 'medium' });
}

export function EventDetail({ eventId, onClose, onUpdated }) {
  const [event,   setEvent]   = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newCrew, setNewCrew] = useState({ name: '', role: '' });
  const [addingCrew, setAddingCrew] = useState(false);
  // Inventory picker state
  const [catalogItems, setCatalogItems]   = useState([]);
  const [newInvLine,   setNewInvLine]     = useState({ inventory_item_id: '', quantity: 1, rental_days: 1 });
  const [addingInv,    setAddingInv]      = useState(false);
  const [availInfo,    setAvailInfo]      = useState(null); // { available, booked, quantity }
  // Quote
  const [generatingQuote, setGeneratingQuote] = useState(false);
  const [openQuoteId,     setOpenQuoteId]     = useState(null);
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const [ev, hist] = await Promise.all([
        eventsApi.get(eventId),
        eventsApi.history(eventId)
      ]);
      setEvent(ev);
      setHistory(hist);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [eventId]);

  // Load inventory catalog once
  useEffect(() => {
    inventoryApi.list().then(setCatalogItems).catch(() => {});
  }, []);

  const handleStatusChange = async (status) => {
    try {
      const updated = await eventsApi.update(eventId, { status });
      setEvent(updated);
      onUpdated && onUpdated(updated);
      eventsApi.history(eventId).then(setHistory);
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  const handlePaymentChange = async (payment_status) => {
    try {
      const updated = await eventsApi.update(eventId, { payment_status });
      setEvent(updated);
      onUpdated && onUpdated(updated);
      eventsApi.history(eventId).then(setHistory);
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  const handleToggleReserved = async (eq) => {
    try {
      const updated = await eventsApi.updateEquipment(eventId, eq.id, { reserved: !eq.reserved });
      setEvent(ev => ({
        ...ev,
        equipment: ev.equipment.map(e => e.id === eq.id ? updated : e)
      }));
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      await eventsApi.uploadAttachments(eventId, formData);
      await load();
    } catch (err) { alert('Upload fehlgeschlagen: ' + err.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleDeleteAttachment = async (attId) => {
    if (!confirm('Anhang wirklich löschen?')) return;
    try {
      await eventsApi.deleteAttachment(eventId, attId);
      setEvent(ev => ({ ...ev, attachments: ev.attachments.filter(a => a.id !== attId) }));
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  const handleEditSave = (updated) => {
    setEvent(updated);
    setShowEdit(false);
    onUpdated && onUpdated(updated);
    eventsApi.history(eventId).then(setHistory);
  };

  const handleAddCrew = async (e) => {
    e.preventDefault();
    if (!newCrew.name.trim()) return;
    setAddingCrew(true);
    try {
      const member = await contactsApi.addCrew(eventId, newCrew);
      setEvent(ev => ({ ...ev, crew: [...(ev.crew || []), member] }));
      setNewCrew({ name: '', role: '' });
    } catch (err) { alert('Fehler: ' + err.message); }
    finally { setAddingCrew(false); }
  };

  const handleToggleCrewConfirmed = async (member) => {
    try {
      const updated = await contactsApi.updateCrew(eventId, member.id, { confirmed: !member.confirmed });
      setEvent(ev => ({ ...ev, crew: ev.crew.map(m => m.id === member.id ? updated : m) }));
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  const handleRemoveCrew = async (memberId) => {
    try {
      await contactsApi.deleteCrew(eventId, memberId);
      setEvent(ev => ({ ...ev, crew: ev.crew.filter(m => m.id !== memberId) }));
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  // Check availability when the selected inventory item changes
  const handleInvItemSelect = async (itemId) => {
    setNewInvLine(l => ({ ...l, inventory_item_id: itemId }));
    setAvailInfo(null);
    if (!itemId || !event) return;
    try {
      const info = await inventoryApi.availability(itemId, {
        date_from: event.setup_date || event.event_date,
        date_to:   event.teardown_date || event.event_date,
        exclude_event_id: eventId
      });
      setAvailInfo(info);
    } catch (e) { void e; } /* availability check is non-critical */
  };

  const handleAddInventoryItem = async (e) => {
    e.preventDefault();
    if (!newInvLine.inventory_item_id) return;
    setAddingInv(true);
    try {
      const line = await inventoryApi.addEventItem(eventId, newInvLine);
      setEvent(ev => ({ ...ev, inventory_items: [...(ev.inventory_items || []), line] }));
      setNewInvLine({ inventory_item_id: '', quantity: 1, rental_days: 1 });
      setAvailInfo(null);
    } catch (err) { alert('Fehler: ' + err.message); }
    finally { setAddingInv(false); }
  };

  const handleRemoveInventoryItem = async (lineId) => {
    try {
      await inventoryApi.deleteEventItem(eventId, lineId);
      setEvent(ev => ({ ...ev, inventory_items: ev.inventory_items.filter(l => l.id !== lineId) }));
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  const handleGenerateQuote = async () => {
    setGeneratingQuote(true);
    try {
      const quote = await quotesApi.fromEvent(eventId, { tax_rate: 19 });
      setOpenQuoteId(quote.id);
    } catch (err) { alert('Fehler: ' + err.message); }
    finally { setGeneratingQuote(false); }
  };

  if (loading) {
    return (
      <div className="modal-backdrop">
        <div className="modal"><div className="centered"><div className="spinner" /></div></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal">
          <div className="card-body">
            <div className="error-msg">{error || 'Event nicht gefunden'}</div>
            <button className="btn btn-ghost" onClick={onClose}>Schließen</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 800 }}>
          {/* Header */}
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flex: 1, minWidth: 0 }}>
              <StatusBadge value={event.event_type} />
              <StatusBadge value={event.status} />
              <StatusBadge value={event.payment_status} />
              <h2 style={{ fontWeight: 600, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {event.title}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}>✏️ Bearbeiten</button>
              <button className="btn-icon" onClick={onClose} aria-label="Schließen">✕</button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
            <div className="detail-grid">
              {/* Left */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Meta */}
                <dl className="detail-meta">
                  <dt>Datum</dt>      <dd>{formatDate(event.event_date)}{event.start_time ? `, ${event.start_time}` : ''}{event.end_time ? ` – ${event.end_time}` : ''}</dd>
                  <dt>Location</dt>   <dd>{event.location || '–'}</dd>
                  <dt>Kunde</dt>      <dd>{event.client_name || '–'}</dd>
                  <dt>Kontakt</dt>    <dd>{event.client_contact || '–'}</dd>
                  <dt>Preis</dt>      <dd>{event.price_estimate != null ? `${Number(event.price_estimate).toFixed(2)} €` : '–'}</dd>
                  <dt>Erstellt</dt>   <dd>{fmt(event.created_at)}</dd>
                </dl>

                {/* Equipment */}
                <div>
                  <p className="section-title">Equipment</p>
                  {event.equipment && event.equipment.length > 0 ? (
                    <ul className="materials-list">
                      {event.equipment.map(eq => (
                        <li key={eq.id} className={`material-item${eq.reserved ? ' done' : ''}`}>
                          <span style={{ flex: 1 }}>{eq.asset_name}</span>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.8rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!eq.reserved}
                              onChange={() => handleToggleReserved(eq)} />
                            Reserviert
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-muted">Kein Equipment eingetragen</p>}
                </div>

                {/* Crew */}
                <div>
                  <p className="section-title">Crew / Personal</p>
                  {event.crew && event.crew.length > 0 ? (
                    <ul className="materials-list" style={{ marginBottom: '.75rem' }}>
                      {event.crew.map(m => (
                        <li key={m.id} className={`material-item${m.confirmed ? ' done' : ''}`}>
                          <span style={{ flex: 1 }}>
                            <strong>{m.name}</strong>
                            {m.role && <span className="text-muted"> · {m.role}</span>}
                          </span>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.8rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!m.confirmed}
                              onChange={() => handleToggleCrewConfirmed(m)} />
                            Bestätigt
                          </label>
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => handleRemoveCrew(m.id)} aria-label="Entfernen">✕</button>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-muted" style={{ marginBottom: '.75rem' }}>Noch keine Crew eingeteilt</p>}
                  <form onSubmit={handleAddCrew} style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                    <input className="form-input" style={{ maxWidth: 180 }}
                      placeholder="Name" value={newCrew.name}
                      onChange={e => setNewCrew(c => ({ ...c, name: e.target.value }))} />
                    <input className="form-input" style={{ maxWidth: 140 }}
                      placeholder="Rolle (z.B. DJ)" value={newCrew.role}
                      onChange={e => setNewCrew(c => ({ ...c, role: e.target.value }))} />
                    <button type="submit" className="btn btn-ghost btn-sm" disabled={addingCrew}>
                      + Hinzufügen
                    </button>
                  </form>
                </div>

                {/* Materials needed */}
                {event.materials_needed && (
                  <div>
                    <p className="section-title">Benötigte Materialien</p>
                    <p style={{ fontSize: '.9rem', whiteSpace: 'pre-wrap' }}>{event.materials_needed}</p>
                  </div>
                )}

                {/* Inventory items (catalog bookings) */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
                    <p className="section-title" style={{ margin: 0 }}>Equipment aus Inventar</p>
                    <button className="btn btn-ghost btn-sm" onClick={handleGenerateQuote} disabled={generatingQuote}>
                      {generatingQuote ? 'Generiere…' : '📄 Angebot erstellen'}
                    </button>
                  </div>
                  {event.inventory_items && event.inventory_items.length > 0 ? (
                    <ul className="materials-list" style={{ marginBottom: '.75rem' }}>
                      {event.inventory_items.map(line => (
                        <li key={line.id} className="material-item">
                          <span style={{ flex: 1 }}>
                            <strong>{line.item_name}</strong>
                            <span className="text-muted"> · {line.quantity}×, {line.rental_days} Tag(e) · {(line.unit_price * line.rental_days * line.quantity).toFixed(0)} €</span>
                          </span>
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => handleRemoveInventoryItem(line.id)} aria-label="Entfernen">✕</button>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-muted" style={{ marginBottom: '.75rem' }}>Noch kein Inventar gebucht</p>}
                  {catalogItems.length > 0 && (
                    <form onSubmit={handleAddInventoryItem} style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div style={{ flex: '2 1 200px' }}>
                        <select className="form-select" style={{ fontSize: '.85rem' }}
                          value={newInvLine.inventory_item_id}
                          onChange={e => handleInvItemSelect(e.target.value)}>
                          <option value="">– Artikel wählen –</option>
                          {catalogItems.map(i => (
                            <option key={i.id} value={i.id}>{i.name} ({i.quantity} St.)</option>
                          ))}
                        </select>
                        {availInfo && (
                          <div style={{ fontSize: '.72rem', marginTop: '.15rem', color: availInfo.available > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {availInfo.available > 0
                              ? `✓ ${availInfo.available} verfügbar (${availInfo.booked} reserviert)`
                              : `✗ Nicht verfügbar (${availInfo.booked}/${availInfo.quantity} reserviert)`}
                          </div>
                        )}
                      </div>
                      <input className="form-input" type="number" min="1" style={{ flex: '0 1 65px', fontSize: '.85rem' }}
                        placeholder="Stk" value={newInvLine.quantity}
                        onChange={e => setNewInvLine(l => ({ ...l, quantity: Number(e.target.value) }))} />
                      <input className="form-input" type="number" min="1" style={{ flex: '0 1 65px', fontSize: '.85rem' }}
                        placeholder="Tage" value={newInvLine.rental_days}
                        onChange={e => setNewInvLine(l => ({ ...l, rental_days: Number(e.target.value) }))} />
                      <button type="submit" className="btn btn-ghost btn-sm" disabled={addingInv || !newInvLine.inventory_item_id}>
                        + Buchen
                      </button>
                    </form>
                  )}
                </div>

                {/* Notes */}
                {event.notes && (
                  <div>
                    <p className="section-title">Notizen</p>
                    <p style={{ fontSize: '.9rem', whiteSpace: 'pre-wrap' }}>{event.notes}</p>
                  </div>
                )}

                {/* Attachments */}
                <div>
                  <p className="section-title">Anhänge (Vertrag, Setlist, Floorplan)</p>
                  {event.attachments && event.attachments.length > 0 ? (
                    <div className="attachments-list">
                      {event.attachments.map(att => (
                        <div key={att.id} className="attachment-item">
                          <span>📎</span>
                          <a href={`${API_URL}/uploads/${att.stored_name}`}
                            target="_blank" rel="noopener noreferrer">{att.filename}</a>
                          <span className="text-muted" style={{ marginLeft: 'auto', fontSize: '.75rem' }}>
                            {att.size ? `${Math.round(att.size / 1024)} KB` : ''}
                          </span>
                          <button className="btn-icon btn btn-ghost btn-sm"
                            onClick={() => handleDeleteAttachment(att.id)} aria-label="Löschen">🗑</button>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-muted">Keine Anhänge</p>}
                  <div style={{ marginTop: '.75rem' }}>
                    <input ref={fileRef} type="file" multiple id="event-file-upload"
                      style={{ display: 'none' }} onChange={handleFileUpload} />
                    <label htmlFor="event-file-upload">
                      <span className={`btn btn-ghost btn-sm${uploading ? ' btn-disabled' : ''}`} style={{ cursor: 'pointer' }}>
                        {uploading ? 'Wird hochgeladen…' : '📎 Datei anhängen'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right – Status + Payment + History */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Status */}
                <div className="card">
                  <div className="card-header">Workflow-Status</div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                    {STATUSES.map(s => (
                      <button key={s}
                        className={`btn btn-sm w-full ${event.status === s ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => handleStatusChange(s)} disabled={event.status === s}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment */}
                <div className="card">
                  <div className="card-header">Zahlung</div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                    {PAYMENT_STATUSES.map(p => (
                      <button key={p}
                        className={`btn btn-sm w-full ${event.payment_status === p ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => handlePaymentChange(p)} disabled={event.payment_status === p}>
                        💳 {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* History */}
                <div className="card">
                  <div className="card-header">Verlauf</div>
                  <div className="card-body">
                    {history.length === 0 ? (
                      <p className="text-muted">Kein Verlauf</p>
                    ) : (
                      <ul className="history-list">
                        {history.map(h => (
                          <li key={h.id} className="history-item">
                            <span className="history-dot" />
                            <span>
                              <span className="history-time">{fmt(h.changed_at)}</span>
                              {' – '}
                              <span>{h.detail || h.action}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <EventForm event={event} onSave={handleEditSave} onClose={() => setShowEdit(false)} />
      )}
      {openQuoteId && (
        <QuoteView quoteId={openQuoteId} onClose={() => setOpenQuoteId(null)} onUpdated={() => {}} />
      )}
    </>
  );
}
