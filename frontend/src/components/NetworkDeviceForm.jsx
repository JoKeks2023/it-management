// src/components/NetworkDeviceForm.jsx
// Modal form for creating or editing a network device.

import { useState, useEffect } from 'react';
import { networkApi } from '../services/api';

const DEVICE_TYPES = ['Router', 'Switch', 'Access Point', 'Patchpanel', 'Firewall', 'Server', 'Sonstiges'];

export function NetworkDeviceForm({ device, racks, onSave, onClose }) {
  const isEdit = !!device;

  const [form, setForm] = useState({
    name: '', device_type: 'Switch', manufacturer: '', model: '',
    asset_id: '', ip_address: '', mac_address: '',
    location: '', rack_id: '', rack_position: '', notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (device) {
      setForm({
        name:          device.name          || '',
        device_type:   device.device_type   || 'Switch',
        manufacturer:  device.manufacturer  || '',
        model:         device.model         || '',
        asset_id:      device.asset_id      || '',
        ip_address:    device.ip_address    || '',
        mac_address:   device.mac_address   || '',
        location:      device.location      || '',
        rack_id:       device.rack_id       != null ? String(device.rack_id) : '',
        rack_position: device.rack_position || '',
        notes:         device.notes         || ''
      });
    }
  }, [device]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        rack_id: form.rack_id !== '' ? parseInt(form.rack_id) : null
      };
      const saved = isEdit
        ? await networkApi.updateDevice(device.id, payload)
        : await networkApi.createDevice(payload);
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
          <h2>{isEdit ? 'Gerät bearbeiten' : 'Neues Netzwerkgerät'}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Schließen">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="z.B. Switch Büro, UDM SE Keller" required />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Gerätetyp</label>
                <select className="form-select" value={form.device_type}
                  onChange={e => set('device_type', e.target.value)}>
                  {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">IP-Adresse</label>
                <input className="form-input" value={form.ip_address}
                  onChange={e => set('ip_address', e.target.value)}
                  placeholder="192.168.1.1" />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Hersteller</label>
                <input className="form-input" value={form.manufacturer}
                  onChange={e => set('manufacturer', e.target.value)}
                  placeholder="z.B. UniFi, Cisco, TP-Link" />
              </div>
              <div className="form-group">
                <label className="form-label">Modell</label>
                <input className="form-input" value={form.model}
                  onChange={e => set('model', e.target.value)}
                  placeholder="z.B. USW-24-POE" />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">MAC-Adresse</label>
                <input className="form-input" value={form.mac_address}
                  onChange={e => set('mac_address', e.target.value)}
                  placeholder="AA:BB:CC:DD:EE:FF" />
              </div>
              <div className="form-group">
                <label className="form-label">Shelf Asset ID</label>
                <input className="form-input" value={form.asset_id}
                  onChange={e => set('asset_id', e.target.value)}
                  placeholder="Optional" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Standort</label>
              <input className="form-input" value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="z.B. Serverraum EG, Büro 1.OG" />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Rack</label>
                <select className="form-select" value={form.rack_id}
                  onChange={e => set('rack_id', e.target.value)}>
                  <option value="">– kein Rack –</option>
                  {(racks || []).map(r => (
                    <option key={r.id} value={r.id}>{r.name}{r.location ? ` (${r.location})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Position im Rack</label>
                <input className="form-input" value={form.rack_position}
                  onChange={e => set('rack_position', e.target.value)}
                  placeholder="z.B. U12-U14" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notizen</label>
              <textarea className="form-textarea" value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Konfigurationshinweise, Seriennummer…" rows={2} />
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
