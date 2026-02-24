// src/components/ContactForm.jsx
// Modal form for creating or editing a contact.

import { useState, useEffect } from 'react';
import { contactsApi } from '../services/api';

const CONTACT_TYPES = ['Kunde', 'Veranstalter', 'Lieferant', 'Techniker', 'Sonstiges'];

export function ContactForm({ contact, onSave, onClose }) {
  const isEdit = !!contact;

  const [form, setForm] = useState({
    name: '', company: '', email: '', phone: '',
    address: '', contact_type: 'Kunde', notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (contact) {
      setForm({
        name:         contact.name         || '',
        company:      contact.company       || '',
        email:        contact.email         || '',
        phone:        contact.phone         || '',
        address:      contact.address       || '',
        contact_type: contact.contact_type  || 'Kunde',
        notes:        contact.notes         || ''
      });
    }
  }, [contact]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const saved = isEdit
        ? await contactsApi.update(contact.id, form)
        : await contactsApi.create(form);
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
          <h2>{isEdit ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}</h2>
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
                  placeholder="Vor- und Nachname" required />
              </div>
              <div className="form-group">
                <label className="form-label">Typ</label>
                <select className="form-select" value={form.contact_type}
                  onChange={e => set('contact_type', e.target.value)}>
                  {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Firma / Organisation</label>
              <input className="form-input" value={form.company}
                onChange={e => set('company', e.target.value)}
                placeholder="Club XYZ GmbH" />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">E-Mail</label>
                <input className="form-input" type="email" value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="info@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Telefon</label>
                <input className="form-input" value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="0171-1234567" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Adresse</label>
              <input className="form-input" value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="Musterstraße 1, 10115 Berlin" />
            </div>

            <div className="form-group">
              <label className="form-label">Notizen</label>
              <textarea className="form-textarea" value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Interne Notizen…" rows={3} />
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
