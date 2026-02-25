// src/components/TemplatesManager.jsx
// CRUD UI for project/event templates (festival, club, 1man, etc.)

import { useState, useEffect } from 'react';
import { templatesApi } from '../services/api';
import { QuickChecklist } from './QuickChecklist';

const CATEGORIES = ['event', 'installation', 'service', 'other'];

function TemplateForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    category: initial?.category || 'event',
    description: initial?.description || '',
    notes: initial?.notes || '',
    checklist: initial?.checklist || [],
    equipment: initial?.equipment || []
  });
  const [newEquip, setNewEquip] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function addEquip() {
    const e = newEquip.trim();
    if (!e) return;
    set('equipment', [...form.equipment, e]);
    setNewEquip('');
  }

  function removeEquip(idx) {
    set('equipment', form.equipment.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = { ...form };
      // checklist items stored as array of strings or objects
      const savedChecklist = form.checklist.map(it => (typeof it === 'string' ? it : it.label));
      data.checklist = savedChecklist;
      let result;
      if (initial?.id) {
        result = await templatesApi.update(initial.id, data);
      } else {
        result = await templatesApi.create(data);
      }
      onSave && onSave(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Convert checklist for QuickChecklist format
  const checklistItems = form.checklist.map((it, idx) => ({
    id: `cl-${idx}`,
    label: typeof it === 'string' ? it : it.label,
    done: false
  }));

  function handleChecklistChange(items) {
    set('checklist', items.map(it => it.label));
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Kategorie</label>
          <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Beschreibung</label>
        <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
      </div>

      <div className="form-group">
        <label className="form-label">Checkliste</label>
        <div className="card" style={{ padding: '.75rem' }}>
          <QuickChecklist
            items={checklistItems}
            onChange={handleChecklistChange}
            title="Template-Checkliste"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Standard-Equipment</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', marginBottom: '.5rem' }}>
          {form.equipment.map((eq, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span className="badge badge-active" style={{ flex: 1 }}>{eq}</span>
              <button type="button" className="btn-icon" onClick={() => removeEquip(idx)}>✕</button>
            </div>
          ))}
        </div>
        <div className="checklist-add">
          <input
            type="text"
            className="form-input"
            placeholder="z.B. CDJ-3000 x2"
            value={newEquip}
            onChange={e => setNewEquip(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEquip(); }}}
          />
          <button type="button" className="btn btn-sm btn-ghost" onClick={addEquip}>+ Add</button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Notizen</label>
        <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
      </div>

      {error && <p style={{ color: 'var(--color-danger)', fontSize: '.85rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Abbrechen</button>}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Speichern...' : (initial?.id ? 'Aktualisieren' : 'Erstellen')}
        </button>
      </div>
    </form>
  );
}

export function TemplatesManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [error, setError] = useState('');

  async function loadTemplates() {
    setLoading(true);
    try {
      setTemplates(await templatesApi.list());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTemplates(); }, []);

  function handleSaved(tmpl) {
    setTemplates(prev => {
      const idx = prev.findIndex(t => t.id === tmpl.id);
      return idx >= 0 ? prev.map(t => t.id === tmpl.id ? tmpl : t) : [tmpl, ...prev];
    });
    setShowForm(false);
    setEditTemplate(null);
  }

  async function handleDelete(id) {
    if (!confirm('Template wirklich löschen?')) return;
    try {
      await templatesApi.delete(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <p style={{ padding: '2rem', textAlign: 'center' }}>⏳ Lade Templates...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>📋 Templates ({templates.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(true); setEditTemplate(null); }}>
          + Neues Template
        </button>
      </div>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {(showForm || editTemplate) && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">{editTemplate ? `✏️ ${editTemplate.name} bearbeiten` : '+ Neues Template'}</div>
          <div className="card-body">
            <TemplateForm
              initial={editTemplate}
              onSave={handleSaved}
              onCancel={() => { setShowForm(false); setEditTemplate(null); }}
            />
          </div>
        </div>
      )}

      <div className="templates-grid">
        {templates.map(tmpl => (
          <div key={tmpl.id} className="template-card">
            <div className="template-card-header">
              <div>
                <strong>{tmpl.name}</strong>
                <span className="badge badge-active" style={{ marginLeft: '.5rem', fontSize: '.7rem' }}>{tmpl.category}</span>
              </div>
              <div style={{ display: 'flex', gap: '.25rem' }}>
                <button className="btn-icon" onClick={() => setEditTemplate(tmpl)} title="Bearbeiten">✏️</button>
                <button className="btn-icon" onClick={() => handleDelete(tmpl.id)} title="Löschen">🗑️</button>
              </div>
            </div>
            {tmpl.description && (
              <p style={{ fontSize: '.82rem', color: 'var(--color-text-muted)', marginBottom: '.5rem' }}>
                {tmpl.description}
              </p>
            )}
            {tmpl.checklist?.length > 0 && (
              <p style={{ fontSize: '.8rem', color: 'var(--color-text-muted)' }}>
                ✅ {tmpl.checklist.length} Checklisten-Punkte
              </p>
            )}
            {tmpl.equipment?.length > 0 && (
              <div style={{ marginTop: '.4rem', display: 'flex', flexWrap: 'wrap', gap: '.25rem' }}>
                {tmpl.equipment.slice(0, 3).map((eq, i) => (
                  <span key={i} className="badge badge-planning" style={{ fontSize: '.7rem' }}>{eq}</span>
                ))}
                {tmpl.equipment.length > 3 && (
                  <span className="badge badge-planning" style={{ fontSize: '.7rem' }}>+{tmpl.equipment.length - 3} mehr</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {templates.length === 0 && !showForm && (
        <div className="card card-body" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Noch keine Templates. Erstelle dein erstes Template!
        </div>
      )}
    </div>
  );
}
