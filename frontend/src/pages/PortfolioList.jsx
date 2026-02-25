// src/pages/PortfolioList.jsx
// Portfolio overview page: filter bar, card grid, detail modal, create form.

import { useState, useEffect, useCallback } from 'react';
import { portfolioApi }    from '../services/api';
import { PortfolioCard }   from '../components/PortfolioCard';
import { PortfolioDetail } from '../components/PortfolioDetail';

// Predefined category options
const CATEGORIES = ['IT', 'DJing', 'Eventtechnik', 'Videography', 'Photography', 'Musikproduktion'];

export function PortfolioList() {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [filters,    setFilters]    = useState({ category: '', search: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  // -------------------------------------------------------------------------
  // Load items from API
  // -------------------------------------------------------------------------
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await portfolioApi.list(filters);
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------
  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const handleCreated = (item) => {
    setShowCreate(false);
    setItems(prev => [item, ...prev]);
  };

  const handleDeleted = (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setSelectedId(null);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div>
      {/* Page heading + create button */}
      <div className="flex items-center mb-4 gap-3">
        <h1 className="font-semibold" style={{ fontSize: '1.25rem' }}>🗂 Portfolio</h1>
        <button
          className="btn btn-primary btn-sm ml-auto"
          onClick={() => setShowCreate(true)}
        >
          + Neues Projekt
        </button>
      </div>

      {/* Filter bar */}
      <div className="filter-bar mb-4">
        <input
          className="form-input"
          placeholder="Suche…"
          value={filters.search}
          onChange={e => setFilter('search', e.target.value)}
        />
        <select
          className="form-select"
          value={filters.category}
          onChange={e => setFilter('category', e.target.value)}
        >
          <option value="">Alle Kategorien</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {(filters.category || filters.search) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setFilters({ category: '', search: '' })}
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {/* States */}
      {error   && <p className="error-msg">{error}</p>}
      {loading && <div className="centered"><div className="spinner" /></div>}

      {/* Card grid */}
      {!loading && !error && items.length === 0 && (
        <p className="text-muted" style={{ textAlign: 'center', padding: '3rem' }}>
          Noch keine Portfolio-Einträge vorhanden.
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="portfolio-grid">
          {items.map(item => (
            <PortfolioCard
              key={item.id}
              item={item}
              onSelect={i => setSelectedId(i.id)}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedId && (
        <PortfolioDetail
          itemId={selectedId}
          onClose={() => setSelectedId(null)}
          onDeleted={handleDeleted}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <PortfolioCreateModal
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline create modal
// ---------------------------------------------------------------------------
function PortfolioCreateModal({ onCreated, onClose }) {
  const [form,    setForm]    = useState({
    title: '', category: 'IT', tags: '', description: '', date_from: '', date_to: '', link: ''
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Titel ist erforderlich.'); return; }
    setSaving(true);
    setError('');
    try {
      // Convert comma-separated tags string into array
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const item = await portfolioApi.create({ ...form, tags });
      onCreated(item);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>Neues Portfolio-Projekt</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <p className="error-msg">{error}</p>}

            <div className="form-group">
              <label className="form-label">Titel *</label>
              <input
                className="form-input"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Projektname"
                required
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Kategorie</label>
                <select
                  className="form-select"
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tags (kommagetrennt)</label>
                <input
                  className="form-input"
                  value={form.tags}
                  onChange={e => set('tags', e.target.value)}
                  placeholder="z.B. DJ, Techno, Club"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Beschreibung</label>
              <textarea
                className="form-textarea"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Kurzbeschreibung des Projekts…"
                rows={3}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Von</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.date_from}
                  onChange={e => set('date_from', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Bis</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.date_to}
                  onChange={e => set('date_to', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Link (optional)</label>
              <input
                className="form-input"
                type="url"
                value={form.link}
                onChange={e => set('link', e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Abbrechen
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
