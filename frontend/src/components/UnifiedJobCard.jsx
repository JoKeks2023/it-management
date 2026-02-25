// src/components/UnifiedJobCard.jsx
// Displays a combined Project + Event card with status, media preview,
// invoice status, and quick actions (Generate Invoice, Client Site, etc.)

import { useState } from 'react';
import { projectsApi } from '../services/api';
import { StatusBadge } from './StatusBadge';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function formatDate(str) {
  if (!str) return null;
  return new Date(str).toLocaleDateString('de-DE');
}

/**
 * @param {Object} props
 * @param {Object} props.project   – project object from API
 * @param {Function} props.onUpdate – called after any update
 * @param {Function} props.onEdit  – called when edit is clicked
 * @param {Function} props.onDelete – called when delete is clicked
 */
export function UnifiedJobCard({ project, onUpdate, onEdit, onDelete }) {
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [clientsiteUrl, setClientsiteUrl] = useState(
    project.clientsite_token
      ? `${BASE_URL}/clientsite/${project.clientsite_token}`
      : null
  );

  async function handleGenerateInvoice() {
    if (!confirm('Rechnung für dieses Projekt generieren?')) return;
    setLoading('invoice');
    setError('');
    try {
      const result = await projectsApi.generateInvoice(project.id);
      onUpdate && onUpdate({ ...project, invoice_status: 'draft', invoice_path: result.filename });
      alert(`✅ Rechnung erstellt!\nTotal: €${result.total}\n${result.url}`);
      window.open(result.url, '_blank');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  async function handleGenerateClientsite() {
    setLoading('clientsite');
    setError('');
    try {
      const result = await projectsApi.generateClientsite(project.id);
      setClientsiteUrl(result.url);
      onUpdate && onUpdate({ ...project, clientsite_token: result.token });
      await navigator.clipboard.writeText(result.url).catch(() => {});
      alert(`✅ Client-Seite erstellt!\nLink (in Zwischenablage):\n${result.url}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  function copyClientLink() {
    if (!clientsiteUrl) return;
    navigator.clipboard.writeText(clientsiteUrl).then(() => alert('Link kopiert!'));
  }

  const images = (project.media || []).filter(m => m.mime_type && m.mime_type.startsWith('image/'));
  const statusMap = {
    planning: 'badge-planning',
    active:   'badge-active',
    completed:'badge-completed',
    cancelled:'badge-cancelled'
  };
  const invoiceMap = {
    none:  'badge-none',
    draft: 'badge-draft',
    sent:  'badge-sent',
    paid:  'badge-paid'
  };

  return (
    <div className="project-card">
      {/* Header row */}
      <div className="project-card-header">
        <div>
          <div className="project-card-title">{project.title}</div>
          <div className="project-card-meta">
            {project.client_name && <span>👤 {project.client_name}</span>}
            {project.location    && <span>📍 {project.location}</span>}
            {project.start_date  && <span>📅 {formatDate(project.start_date)}</span>}
            {project.price_estimate != null && (
              <span>💰 €{Number(project.price_estimate).toFixed(2)}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', alignItems: 'flex-end' }}>
          <span className={`badge ${statusMap[project.status] || 'badge-planning'}`}>
            {project.status}
          </span>
          <span className={`badge ${invoiceMap[project.invoice_status] || 'badge-none'}`} style={{ fontSize: '.7rem' }}>
            Rechnung: {project.invoice_status}
          </span>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p style={{ fontSize: '.85rem', color: 'var(--color-text-muted)', marginBottom: '.5rem' }}>
          {project.description}
        </p>
      )}

      {/* Media thumbnail strip */}
      {images.length > 0 && (
        <div style={{ display: 'flex', gap: '.35rem', marginBottom: '.5rem', flexWrap: 'wrap' }}>
          {images.slice(0, 4).map(img => (
            <img
              key={img.id}
              src={`${BASE_URL}/uploads/${img.stored_name}`}
              alt={img.filename}
              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--color-border)' }}
            />
          ))}
          {images.length > 4 && (
            <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: '.75rem', color: 'var(--color-text-muted)' }}>
              +{images.length - 4}
            </div>
          )}
        </div>
      )}

      {/* Client site link */}
      {clientsiteUrl && (
        <div style={{ fontSize: '.8rem', marginBottom: '.35rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <span>🔗</span>
          <a href={clientsiteUrl} target="_blank" rel="noopener noreferrer"
             style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
            {clientsiteUrl}
          </a>
          <button className="btn-icon" onClick={copyClientLink} title="Link kopieren">📋</button>
        </div>
      )}

      {error && <p style={{ color: 'var(--color-danger)', fontSize: '.8rem', marginBottom: '.35rem' }}>{error}</p>}

      {/* Quick actions */}
      <div className="project-card-actions">
        <button
          className="btn btn-sm btn-ghost"
          onClick={handleGenerateInvoice}
          disabled={loading === 'invoice'}
        >
          {loading === 'invoice' ? '⏳' : '📄'} Rechnung
        </button>

        <button
          className="btn btn-sm btn-ghost"
          onClick={handleGenerateClientsite}
          disabled={loading === 'clientsite'}
        >
          {loading === 'clientsite' ? '⏳' : '🌐'} Client-Seite
        </button>

        {project.invoice_path && (
          <a
            href={`${BASE_URL}/uploads/${project.invoice_path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-ghost"
          >
            ⬇️ PDF
          </a>
        )}

        {onEdit && (
          <button className="btn btn-sm btn-ghost" onClick={() => onEdit(project)}>
            ✏️ Bearbeiten
          </button>
        )}

        {onDelete && (
          <button
            className="btn btn-sm btn-danger"
            onClick={() => {
              if (confirm(`Projekt "${project.title}" löschen?`)) onDelete(project.id);
            }}
            style={{ marginLeft: 'auto' }}
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}
