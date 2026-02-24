// src/pages/ContactsPage.jsx
// CRM / Contacts page: list, create, edit, and delete contacts.

import { useState, useEffect, useCallback } from 'react';
import { contactsApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { ContactForm } from '../components/ContactForm';

const CONTACT_TYPES = ['Kunde', 'Veranstalter', 'Lieferant', 'Techniker', 'Sonstiges'];

export function ContactsPage() {
  const [contacts,   setContacts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [filters,    setFilters]    = useState({ contact_type: '', search: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [editContact, setEditContact] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setContacts(await contactsApi.list(filters));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const handleCreated = (contact) => {
    setShowCreate(false);
    setContacts(prev => [...prev, contact].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleUpdated = (updated) => {
    setEditContact(null);
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Kontakt wirklich löschen?')) return;
    try {
      await contactsApi.delete(id);
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  // Stats
  const stats = {
    total:       contacts.length,
    kunden:      contacts.filter(c => c.contact_type === 'Kunde').length,
    veranstalter: contacts.filter(c => c.contact_type === 'Veranstalter').length,
    techniker:   contacts.filter(c => c.contact_type === 'Techniker').length
  };

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Kontakte gesamt</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{stats.kunden}</div>
          <div className="stat-label">Kunden</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.veranstalter}</div>
          <div className="stat-label">Veranstalter</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>{stats.techniker}</div>
          <div className="stat-label">Techniker</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <input className="form-input" placeholder="🔍 Name, Firma, E-Mail, Telefon…"
          value={filters.search} onChange={e => setFilter('search', e.target.value)} />
        <select className="form-select" value={filters.contact_type}
          onChange={e => setFilter('contact_type', e.target.value)}>
          <option value="">Alle Typen</option>
          {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm"
          onClick={() => setFilters({ contact_type: '', search: '' })}>✕ Reset</button>
        <button className="btn btn-primary ml-auto" onClick={() => setShowCreate(true)}>
          + Neuer Kontakt
        </button>
      </div>

      {/* Table */}
      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="centered"><div className="spinner" /></div>
        ) : contacts.length === 0 ? (
          <div className="centered">
            <p className="text-muted">Keine Kontakte gefunden. Lege deinen ersten Kontakt an!</p>
          </div>
        ) : (
          <table className="ticket-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Typ</th>
                <th>Firma</th>
                <th>E-Mail</th>
                <th>Telefon</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id} onClick={() => setEditContact(c)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td><StatusBadge value={c.contact_type} /></td>
                  <td className="text-muted">{c.company || '–'}</td>
                  <td className="text-muted">
                    {c.email
                      ? <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()}>{c.email}</a>
                      : '–'}
                  </td>
                  <td className="text-muted">
                    {c.phone
                      ? <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()}>{c.phone}</a>
                      : '–'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '.3rem' }}>
                      <button className="btn btn-ghost btn-sm"
                        onClick={e => { e.stopPropagation(); setEditContact(c); }}
                        title="Bearbeiten">✏️</button>
                      <button className="btn btn-ghost btn-sm"
                        onClick={e => handleDelete(c.id, e)}
                        title="Löschen">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <ContactForm contact={null} onSave={handleCreated} onClose={() => setShowCreate(false)} />
      )}
      {editContact && (
        <ContactForm contact={editContact} onSave={handleUpdated} onClose={() => setEditContact(null)} />
      )}
    </div>
  );
}
