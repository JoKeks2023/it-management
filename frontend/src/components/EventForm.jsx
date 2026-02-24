// src/components/EventForm.jsx
// Modal form for creating or editing an event (DJ booking, tech event, etc.)

import { useState, useEffect } from 'react';
import { eventsApi, assetsApi } from '../services/api';

const EVENT_TYPES     = ['DJ', 'Technik', 'Netzwerk-Setup', 'Hybrid'];
const STATUSES        = ['angefragt', 'bestätigt', 'vorbereitet', 'durchgeführt', 'abgeschlossen'];
const PAYMENT_STATUSES = ['offen', 'angezahlt', 'bezahlt'];

export function EventForm({ event, onSave, onClose }) {
  const isEdit = !!event;

  const [form, setForm] = useState({
    title: '', event_type: 'DJ', client_name: '', client_contact: '',
    location: '', event_date: '', start_time: '', end_time: '',
    materials_needed: '', price_estimate: '', payment_status: 'offen',
    status: 'angefragt', notes: '', equipment: []
  });

  const [assets, setAssets]           = useState([]);
  const [assetsConfigured, setAssetsConfigured] = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    if (event) {
      setForm({
        title:            event.title            || '',
        event_type:       event.event_type       || 'DJ',
        client_name:      event.client_name      || '',
        client_contact:   event.client_contact   || '',
        location:         event.location         || '',
        event_date:       event.event_date        || '',
        start_time:       event.start_time       || '',
        end_time:         event.end_time         || '',
        materials_needed: event.materials_needed || '',
        price_estimate:   event.price_estimate   != null ? String(event.price_estimate) : '',
        payment_status:   event.payment_status   || 'offen',
        status:           event.status           || 'angefragt',
        notes:            event.notes            || '',
        equipment:        (event.equipment || []).map(e => ({
          id:         e.id,
          asset_id:   e.asset_id   || '',
          asset_name: e.asset_name || '',
          reserved:   !!e.reserved
        }))
      });
    }
  }, [event]);

  useEffect(() => {
    assetsApi.list().then(data => {
      setAssetsConfigured(data.configured !== false);
      setAssets(data.assets || data.items || []);
    }).catch(() => setAssetsConfigured(false));
  }, []);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Equipment helpers
  const addEquipment = () =>
    setForm(f => ({ ...f, equipment: [...f.equipment, { asset_id: '', asset_name: '', reserved: false }] }));
  const updateEq = (idx, field, value) =>
    setForm(f => ({
      ...f,
      equipment: f.equipment.map((e, i) => i === idx ? { ...e, [field]: value } : e)
    }));
  const removeEq = (idx) =>
    setForm(f => ({ ...f, equipment: f.equipment.filter((_, i) => i !== idx) }));

  const handleAssetSelect = (idx, assetId) => {
    const found = assets.find(a => String(a.id) === assetId);
    updateEq(idx, 'asset_id', assetId);
    updateEq(idx, 'asset_name', found ? (found.name || found.title || assetId) : assetId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const priceVal = parseFloat(form.price_estimate);
      const payload = {
        ...form,
        price_estimate: (!isNaN(priceVal) && form.price_estimate !== '') ? priceVal : null,
        equipment: form.equipment.filter(eq => eq.asset_name.trim() !== '')
      };
      const saved = isEdit
        ? await eventsApi.update(event.id, payload)
        : await eventsApi.create(payload);
      onSave(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <h2>{isEdit ? 'Event bearbeiten' : 'Neues Event'}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
            {error && <div className="error-msg">{error}</div>}

            {/* Basic info */}
            <div className="form-group">
              <label className="form-label">Titel *</label>
              <input className="form-input" value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="z.B. Geburtstag Müller, Techno Night Club XYZ" required />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Event-Typ</label>
                <select className="form-select" value={form.event_type}
                  onChange={e => set('event_type', e.target.value)}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status}
                  onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Client */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Kunde / Veranstalter</label>
                <input className="form-input" value={form.client_name}
                  onChange={e => set('client_name', e.target.value)}
                  placeholder="Name des Kunden" />
              </div>
              <div className="form-group">
                <label className="form-label">Kontakt (Tel / Mail)</label>
                <input className="form-input" value={form.client_contact}
                  onChange={e => set('client_contact', e.target.value)}
                  placeholder="0171-123456 / mail@example.com" />
              </div>
            </div>

            {/* Location + date */}
            <div className="form-group">
              <label className="form-label">Location / Ort</label>
              <input className="form-input" value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="Club Berlin, Halle XYZ" />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Datum</label>
                <input className="form-input" type="date" value={form.event_date}
                  onChange={e => set('event_date', e.target.value)} />
              </div>
              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Von</label>
                  <input className="form-input" type="time" value={form.start_time}
                    onChange={e => set('start_time', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bis</label>
                  <input className="form-input" type="time" value={form.end_time}
                    onChange={e => set('end_time', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Financials */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Preisschätzung (€)</label>
                <input className="form-input" type="number" min="0" step="0.01"
                  value={form.price_estimate}
                  onChange={e => set('price_estimate', e.target.value)}
                  placeholder="1500.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Zahlungsstatus</label>
                <select className="form-select" value={form.payment_status}
                  onChange={e => set('payment_status', e.target.value)}>
                  {PAYMENT_STATUSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Equipment */}
            <div className="form-group">
              <label className="form-label">Equipment</label>
              {form.equipment.map((eq, idx) => (
                <div key={idx} className="material-input-row">
                  {assetsConfigured && assets.length > 0 ? (
                    <select className="form-select" style={{ maxWidth: 220 }}
                      value={eq.asset_id}
                      onChange={e => handleAssetSelect(idx, e.target.value)}>
                      <option value="">– Shelf Asset –</option>
                      {assets.map(a => (
                        <option key={a.id} value={String(a.id)}>
                          {a.name || a.title || a.id}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input className="form-input" value={eq.asset_name}
                      onChange={e => updateEq(idx, 'asset_name', e.target.value)}
                      placeholder="z.B. Pioneer CDJ-3000" />
                  )}
                  {assetsConfigured && assets.length > 0 && (
                    <input className="form-input" value={eq.asset_name}
                      onChange={e => updateEq(idx, 'asset_name', e.target.value)}
                      placeholder="Bezeichnung" style={{ maxWidth: 200 }} />
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={!!eq.reserved}
                      onChange={e => updateEq(idx, 'reserved', e.target.checked)} />
                    Reserviert
                  </label>
                  <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => removeEq(idx)}>✕</button>
                </div>
              ))}
              <button type="button" className="btn btn-ghost btn-sm mt-4" onClick={addEquipment}>
                + Equipment hinzufügen
              </button>
            </div>

            {/* Materials needed */}
            <div className="form-group">
              <label className="form-label">Benötigte Materialien (Freitext)</label>
              <textarea className="form-textarea" value={form.materials_needed}
                onChange={e => set('materials_needed', e.target.value)}
                placeholder="Kabel, Stative, Mikrofone…" rows={2} />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notizen</label>
              <textarea className="form-textarea" value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Interne Notizen, Setlist, Floorplan-Hinweise…" rows={2} />
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
