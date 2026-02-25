// src/components/InventoryForm.jsx
// Modal form for creating or editing an inventory item.

import { useState, useEffect } from 'react';
import { inventoryApi } from '../services/api';

const CATEGORIES = ['Audio', 'Licht', 'Video', 'Rigging', 'Strom', 'Transport', 'Sonstiges'];

export function InventoryForm({ item, onSave, onClose }) {
  const isEdit = !!item;

  const [form, setForm] = useState({
    name: '', category: 'Sonstiges', description: '', quantity: 1,
    purchase_price: '', rental_rate: 0, barcode: '', notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (item) {
      setForm({
        name:           item.name           || '',
        category:       item.category        || 'Sonstiges',
        description:    item.description     || '',
        quantity:       item.quantity        ?? 1,
        purchase_price: item.purchase_price  != null ? String(item.purchase_price) : '',
        rental_rate:    item.rental_rate     ?? 0,
        barcode:        item.barcode         || '',
        notes:          item.notes          || ''
      });
    }
  }, [item]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity:       Number(form.quantity),
        rental_rate:    Number(form.rental_rate),
        purchase_price: form.purchase_price !== '' ? Number(form.purchase_price) : null
      };
      const saved = isEdit
        ? await inventoryApi.update(item.id, payload)
        : await inventoryApi.create(payload);
      onSave(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>{isEdit ? 'Artikel bearbeiten' : 'Neuer Artikel'}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Schließen">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg">{error}</div>}

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="z.B. CDJ-3000" required />
              </div>
              <div className="form-group">
                <label className="form-label">Kategorie</label>
                <select className="form-select" value={form.category}
                  onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Beschreibung</label>
              <textarea className="form-textarea" value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Kurze Beschreibung des Geräts…" rows={2} />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Bestand (Stück)</label>
                <input className="form-input" type="number" min="0" value={form.quantity}
                  onChange={e => set('quantity', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Tagessatz (€)</label>
                <input className="form-input" type="number" min="0" step="0.01" value={form.rental_rate}
                  onChange={e => set('rental_rate', e.target.value)} />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Kaufpreis (€, optional)</label>
                <input className="form-input" type="number" min="0" step="0.01" value={form.purchase_price}
                  onChange={e => set('purchase_price', e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Barcode / SKU</label>
                <input className="form-input" value={form.barcode}
                  onChange={e => set('barcode', e.target.value)} placeholder="optional" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notizen</label>
              <textarea className="form-textarea" value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Seriennummern, Zustand, Lagerort…" rows={2} />
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
