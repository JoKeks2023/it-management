// src/components/TicketForm.jsx
// Modal form for creating or editing a ticket.
// Props:
//   ticket      – existing ticket object for editing (null for new)
//   onSave(data) – called with the saved ticket after successful API call
//   onClose()   – called when the user closes the modal

import { useState, useEffect } from 'react';
import { ticketsApi, assetsApi } from '../services/api';

const STATUSES = ['geplant', 'bestellt', 'installiert', 'fertig'];
const PRIORITIES = ['hoch', 'mittel', 'niedrig'];

export function TicketForm({ ticket, onSave, onClose }) {
  const isEdit = !!ticket;

  const [form, setForm] = useState({
    title: '',
    description: '',
    asset_id: '',
    asset_name: '',
    status: 'geplant',
    priority: 'mittel',
    notes: '',
    materials: []
  });

  const [assets, setAssets] = useState([]);
  const [assetsConfigured, setAssetsConfigured] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill form when editing
  useEffect(() => {
    if (ticket) {
      setForm({
        title: ticket.title || '',
        description: ticket.description || '',
        asset_id: ticket.asset_id || '',
        asset_name: ticket.asset_name || '',
        status: ticket.status || 'geplant',
        priority: ticket.priority || 'mittel',
        notes: ticket.notes || '',
        materials: (ticket.materials || []).map(m => ({
          name: m.name,
          ordered: !!m.ordered,
          installed: !!m.installed
        }))
      });
    }
  }, [ticket]);

  // Load assets from Shelf API (if configured)
  useEffect(() => {
    assetsApi.list()
      .then(data => {
        setAssetsConfigured(data.configured !== false);
        setAssets(data.assets || data.items || []);
      })
      .catch(() => setAssetsConfigured(false));
  }, []);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // When an asset is selected from the dropdown, also fill the asset_name
  const handleAssetChange = (assetId) => {
    const found = assets.find(a => String(a.id) === assetId);
    set('asset_id', assetId);
    set('asset_name', found ? (found.name || found.title || assetId) : assetId);
  };

  // Materials management
  const addMaterial = () =>
    setForm(f => ({ ...f, materials: [...f.materials, { name: '', ordered: false, installed: false }] }));

  const updateMaterial = (idx, field, value) =>
    setForm(f => ({
      ...f,
      materials: f.materials.map((m, i) => i === idx ? { ...m, [field]: value } : m)
    }));

  const removeMaterial = (idx) =>
    setForm(f => ({ ...f, materials: f.materials.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        materials: form.materials.filter(m => m.name.trim() !== '')
      };
      const saved = isEdit
        ? await ticketsApi.update(ticket.id, payload)
        : await ticketsApi.create(payload);
      onSave(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? 'Ticket bearbeiten' : 'Neues Ticket'}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label className="form-label">Titel *</label>
              <input
                className="form-input"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="z.B. Router installieren"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Beschreibung</label>
              <textarea
                className="form-textarea"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Was soll gemacht werden?"
                rows={3}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Priorität</label>
                <select
                  className="form-select"
                  value={form.priority}
                  onChange={e => set('priority', e.target.value)}
                >
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Asset {assetsConfigured ? '(aus Shelf)' : '(Shelf nicht konfiguriert – ID manuell eingeben)'}
              </label>
              {assetsConfigured && assets.length > 0 ? (
                <select
                  className="form-select"
                  value={form.asset_id}
                  onChange={e => handleAssetChange(e.target.value)}
                >
                  <option value="">– kein Asset –</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name || a.title || a.id}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="form-input"
                  value={form.asset_id}
                  onChange={e => set('asset_id', e.target.value)}
                  placeholder="Asset ID (optional)"
                />
              )}
            </div>

            {form.asset_id && (
              <div className="form-group">
                <label className="form-label">Asset Name (optional)</label>
                <input
                  className="form-input"
                  value={form.asset_name}
                  onChange={e => set('asset_name', e.target.value)}
                  placeholder="Asset-Bezeichnung"
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Notizen</label>
              <textarea
                className="form-textarea"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Freitext-Notizen"
                rows={2}
              />
            </div>

            {/* ── Materials ───────────────────────────── */}
            <div className="form-group">
              <label className="form-label">Materialien</label>
              {form.materials.map((m, idx) => (
                <div key={idx} className="material-input-row">
                  <input
                    className="form-input"
                    value={m.name}
                    onChange={e => updateMaterial(idx, 'name', e.target.value)}
                    placeholder="z.B. Kabel Cat6"
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={!!m.ordered}
                      onChange={e => updateMaterial(idx, 'ordered', e.target.checked)}
                    />
                    Bestellt
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={!!m.installed}
                      onChange={e => updateMaterial(idx, 'installed', e.target.checked)}
                    />
                    Eingesetzt
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeMaterial(idx)}
                    aria-label="Material entfernen"
                  >✕</button>
                </div>
              ))}
              <button type="button" className="btn btn-ghost btn-sm mt-4" onClick={addMaterial}>
                + Material hinzufügen
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Speichern…' : isEdit ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
