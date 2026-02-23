// src/components/TicketDetail.jsx
// Slide-in panel (rendered as a modal) that shows all details of a ticket.
// Allows inline status/materials updates and file attachment management.

import { useState, useEffect, useRef } from 'react';
import { ticketsApi } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { MaterialsList } from './MaterialsList';
import { TicketForm } from './TicketForm';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const STATUSES = ['geplant', 'bestellt', 'installiert', 'fertig'];

function formatDate(str) {
  if (!str) return '–';
  return new Date(str).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

export function TicketDetail({ ticketId, onClose, onUpdated }) {
  const [ticket, setTicket] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const [t, h] = await Promise.all([
        ticketsApi.get(ticketId),
        ticketsApi.history(ticketId)
      ]);
      setTicket(t);
      setHistory(h);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [ticketId]);

  const handleStatusChange = async (status) => {
    try {
      const updated = await ticketsApi.update(ticketId, { status });
      setTicket(updated);
      onUpdated && onUpdated(updated);
      // Refresh history
      ticketsApi.history(ticketId).then(setHistory);
    } catch (err) {
      alert('Fehler beim Ändern des Status: ' + err.message);
    }
  };

  const handleMaterialsChange = async (materials) => {
    try {
      const updated = await ticketsApi.update(ticketId, { materials });
      setTicket(updated);
      onUpdated && onUpdated(updated);
    } catch (err) {
      alert('Fehler beim Speichern der Materialien: ' + err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      await ticketsApi.uploadAttachments(ticketId, formData);
      await load();
    } catch (err) {
      alert('Upload fehlgeschlagen: ' + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attId) => {
    if (!confirm('Anhang wirklich löschen?')) return;
    try {
      await ticketsApi.deleteAttachment(ticketId, attId);
      setTicket(t => ({ ...t, attachments: t.attachments.filter(a => a.id !== attId) }));
    } catch (err) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleEditSave = (updated) => {
    setTicket(updated);
    setShowEdit(false);
    onUpdated && onUpdated(updated);
    ticketsApi.history(ticketId).then(setHistory);
  };

  if (loading) {
    return (
      <div className="modal-backdrop">
        <div className="modal"><div className="centered"><div className="spinner" /></div></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal">
          <div className="card-body">
            <div className="error-msg">{error || 'Ticket nicht gefunden'}</div>
            <button className="btn btn-ghost" onClick={onClose}>Schließen</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 780 }}>
          {/* Header */}
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flex: 1, minWidth: 0 }}>
              <StatusBadge value={ticket.status} />
              <StatusBadge value={ticket.priority} />
              <h2 style={{ fontWeight: 600, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ticket.title}
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
              {/* Left column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Meta */}
                <dl className="detail-meta">
                  <dt>Erstellt</dt>   <dd>{formatDate(ticket.created_at)}</dd>
                  <dt>Geändert</dt>   <dd>{formatDate(ticket.updated_at)}</dd>
                  {ticket.asset_id && <><dt>Asset</dt><dd>{ticket.asset_name || ticket.asset_id}</dd></>}
                </dl>

                {/* Description */}
                {ticket.description && (
                  <div>
                    <p className="section-title">Beschreibung</p>
                    <p style={{ fontSize: '.9rem', whiteSpace: 'pre-wrap' }}>{ticket.description}</p>
                  </div>
                )}

                {/* Notes */}
                {ticket.notes && (
                  <div>
                    <p className="section-title">Notizen</p>
                    <p style={{ fontSize: '.9rem', whiteSpace: 'pre-wrap' }}>{ticket.notes}</p>
                  </div>
                )}

                {/* Materials */}
                <div>
                  <p className="section-title">Materialien</p>
                  <MaterialsList materials={ticket.materials} onChange={handleMaterialsChange} />
                </div>

                {/* Attachments */}
                <div>
                  <p className="section-title">Anhänge</p>
                  {ticket.attachments && ticket.attachments.length > 0 ? (
                    <div className="attachments-list">
                      {ticket.attachments.map(att => (
                        <div key={att.id} className="attachment-item">
                          <span>📎</span>
                          <a
                            href={`${API_URL}/uploads/${att.stored_name || att.filename}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {att.filename}
                          </a>
                          <span className="text-muted" style={{ marginLeft: 'auto', fontSize: '.75rem' }}>
                            {att.size ? `${Math.round(att.size / 1024)} KB` : ''}
                          </span>
                          <button
                            className="btn-icon btn btn-ghost btn-sm"
                            onClick={() => handleDeleteAttachment(att.id)}
                            aria-label="Löschen"
                          >🗑</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">Keine Anhänge</p>
                  )}
                  <div style={{ marginTop: '.75rem' }}>
                    <input
                      ref={fileRef}
                      type="file"
                      multiple
                      id="file-upload"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="file-upload">
                      <span className={`btn btn-ghost btn-sm${uploading ? ' btn-disabled' : ''}`} style={{ cursor: 'pointer' }}>
                        {uploading ? 'Wird hochgeladen…' : '📎 Datei anhängen'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right column – Status + History */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Quick status change */}
                <div className="card">
                  <div className="card-header">Status ändern</div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                    {STATUSES.map(s => (
                      <button
                        key={s}
                        className={`btn btn-sm w-full ${ticket.status === s ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => handleStatusChange(s)}
                        disabled={ticket.status === s}
                      >
                        <StatusBadge value={s} />
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
                              <span className="history-time">{formatDate(h.changed_at)}</span>
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

      {/* Edit form modal */}
      {showEdit && (
        <TicketForm
          ticket={ticket}
          onSave={handleEditSave}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
