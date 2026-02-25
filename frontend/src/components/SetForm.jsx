// src/components/SetForm.jsx
// Modal form for creating/editing an equipment set and managing its items.

import { useState, useEffect } from 'react';
import { setsApi, inventoryApi } from '../services/api';

export function SetForm({ set, onSave, onClose }) {
  const isEdit = !!set;

  const [form,    setForm]    = useState({ name: '', description: '', notes: '' });
  const [items,   setItems]   = useState([]); // current items if editing
  const [catalog, setCatalog] = useState([]);
  const [newItem, setNewItem] = useState({ inventory_item_id: '', quantity: 1 });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    inventoryApi.list().then(setCatalog).catch(() => {});
    if (set) {
      setForm({ name: set.name || '', description: set.description || '', notes: set.notes || '' });
      setItems(set.items || []);
    }
  }, [set]);

  const set_ = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name ist erforderlich'); return; }
    setError('');
    setSaving(true);
    try {
      const saved = isEdit
        ? await setsApi.update(set.id, form)
        : await setsApi.create(form);
      onSave(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.inventory_item_id) return;
    try {
      const si = await setsApi.addItem(isEdit ? set.id : null, {
        inventory_item_id: newItem.inventory_item_id,
        quantity: Number(newItem.quantity)
      });
      // Reload full set to get item_name etc.
      if (isEdit) {
        const updated = await setsApi.get(set.id);
        setItems(updated.items);
      }
      setNewItem({ inventory_item_id: '', quantity: 1 });
      void si;
    } catch (err) { setError(err.message); }
  };

  const handleRemoveItem = async (siId) => {
    if (!isEdit) return;
    try {
      await setsApi.deleteItem(set.id, siId);
      setItems(prev => prev.filter(i => i.id !== siId));
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>{isEdit ? 'Set bearbeiten' : 'Neues Equipment-Set'}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Schließen">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name}
                onChange={e => set_('name', e.target.value)} placeholder="z.B. DJ Standard-Set" required />
            </div>
            <div className="form-group">
              <label className="form-label">Beschreibung</label>
              <input className="form-input" value={form.description}
                onChange={e => set_('description', e.target.value)} placeholder="Kurze Beschreibung…" />
            </div>
            <div className="form-group">
              <label className="form-label">Notizen</label>
              <textarea className="form-textarea" rows={2} value={form.notes}
                onChange={e => set_('notes', e.target.value)} />
            </div>

            {/* Items – only when editing an existing set */}
            {isEdit && (
              <div style={{ marginTop: '1rem' }}>
                <p className="section-title">Enthaltene Artikel</p>
                {items.length === 0 && <p className="text-muted" style={{ marginBottom: '.5rem' }}>Noch keine Artikel</p>}
                {items.length > 0 && (
                  <ul className="materials-list" style={{ marginBottom: '.75rem' }}>
                    {items.map(si => (
                      <li key={si.id} className="material-item">
                        <span style={{ flex: 1 }}>{si.item_name} <span className="text-muted">× {si.quantity}</span></span>
                        <button type="button" className="btn btn-ghost btn-sm"
                          onClick={() => handleRemoveItem(si.id)}>✕</button>
                      </li>
                    ))}
                  </ul>
                )}
                <form onSubmit={handleAddItem} style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                  <select className="form-select" style={{ flex: '2 1 180px', fontSize: '.85rem' }}
                    value={newItem.inventory_item_id}
                    onChange={e => setNewItem(n => ({ ...n, inventory_item_id: e.target.value }))}>
                    <option value="">– Artikel wählen –</option>
                    {catalog.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                  <input className="form-input" type="number" min="1" style={{ flex: '0 1 65px', fontSize: '.85rem' }}
                    placeholder="Stk" value={newItem.quantity}
                    onChange={e => setNewItem(n => ({ ...n, quantity: e.target.value }))} />
                  <button type="submit" className="btn btn-ghost btn-sm">+ Hinzufügen</button>
                </form>
              </div>
            )}
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
