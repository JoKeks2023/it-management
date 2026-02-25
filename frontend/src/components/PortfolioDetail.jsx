// src/components/PortfolioDetail.jsx
// Modal detail view for a single portfolio item.
// Shows all fields, a media gallery, and an external link if present.

import { useState, useEffect } from 'react';
import { portfolioApi } from '../services/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * @param {Object}   props
 * @param {number}   props.itemId    – ID of the portfolio item to display
 * @param {Function} props.onClose   – called when the modal should close
 * @param {Function} props.onDeleted – called with itemId after successful deletion
 */
export function PortfolioDetail({ itemId, onClose, onDeleted }) {
  const [item,    setItem]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    let cancelled = false;
    portfolioApi.get(itemId)
      .then(data => { if (!cancelled) { setItem(data); setLoading(false); } })
      .catch(err  => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [itemId]);

  // Close when clicking the backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleDelete = async () => {
    if (!confirm('Portfolio-Eintrag wirklich löschen?')) return;
    try {
      await portfolioApi.delete(itemId);
      onDeleted(itemId);
    } catch (err) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal portfolio-detail" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header">
          <h2>{item?.title ?? '…'}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {loading && <div className="centered"><div className="spinner" /></div>}
          {error   && <p className="error-msg">{error}</p>}

          {item && (
            <>
              {/* Meta info */}
              <dl className="detail-meta">
                <dt>Kategorie</dt>
                <dd>
                  <span className={`badge portfolio-badge portfolio-badge--${slug(item.category)}`}>
                    {item.category}
                  </span>
                </dd>

                {item.date_from && (
                  <>
                    <dt>Zeitraum</dt>
                    <dd>{formatDateRange(item.date_from, item.date_to)}</dd>
                  </>
                )}

                {item.link && (
                  <>
                    <dt>Link</dt>
                    <dd>
                      <a href={item.link} target="_blank" rel="noopener noreferrer">
                        {item.link}
                      </a>
                    </dd>
                  </>
                )}
              </dl>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="portfolio-card__tags">
                  {item.tags.map(tag => (
                    <span key={tag} className="portfolio-tag">{tag}</span>
                  ))}
                </div>
              )}

              {/* Description */}
              {item.description && (
                <div>
                  <p className="section-title">Beschreibung</p>
                  <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{item.description}</p>
                </div>
              )}

              {/* Media gallery */}
              {item.media && item.media.length > 0 && (
                <div>
                  <p className="section-title">Medien</p>
                  <div className="portfolio-media-grid">
                    {item.media.map(m => (
                      <MediaTile key={m.id} media={m} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={!item}>
            🗑 Löschen
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MediaTile – renders image / video / audio inline, or a download link
// ---------------------------------------------------------------------------
function MediaTile({ media }) {
  const src = `${BASE_URL}/uploads/${media.stored_name}`;
  const { mime_type: mime, filename } = media;

  if (mime?.startsWith('image/')) {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" className="portfolio-media-tile">
        <img src={src} alt={filename} loading="lazy" />
      </a>
    );
  }
  if (mime?.startsWith('video/')) {
    return (
      <div className="portfolio-media-tile portfolio-media-tile--video">
        {/* Video element – captions not applicable for user-uploaded recordings */}
        <video controls src={src} />
        <span className="text-muted text-sm">{filename}</span>
      </div>
    );
  }
  if (mime?.startsWith('audio/')) {
    return (
      <div className="portfolio-media-tile portfolio-media-tile--audio">
        {/* Audio element – captions not applicable for user-uploaded recordings */}
        <audio controls src={src} />
        <span className="text-muted text-sm">{filename}</span>
      </div>
    );
  }
  // Fallback: download link
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="portfolio-media-tile portfolio-media-tile--file">
      📎 {filename}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatDateRange(from, to) {
  const fmt = (d) => new Date(d).toLocaleDateString('de-DE', { dateStyle: 'short' });
  if (!to || from === to) return fmt(from);
  return `${fmt(from)} – ${fmt(to)}`;
}

function slug(str) {
  return str ? str.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'other';
}
