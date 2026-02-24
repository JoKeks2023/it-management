// src/components/EventDetail.jsx
// Modal showing full event details with inline status/payment updates,
// equipment reservation management, file attachments, and change history.

import { useState, useEffect, useRef } from 'react';
import { eventsApi } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { EventForm } from './EventForm';

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

                {/* Materials needed */}
                {event.materials_needed && (
                  <div>
                    <p className="section-title">Benötigte Materialien</p>
                    <p style={{ fontSize: '.9rem', whiteSpace: 'pre-wrap' }}>{event.materials_needed}</p>
                  </div>
                )}

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
    </>
  );
}
