// src/components/ProjectEditor.jsx
// Create/Edit a Project, attach Template, assign media, use Checklist.

import { useState, useEffect } from 'react';
import { projectsApi, templatesApi } from '../services/api';
import { QuickChecklist } from './QuickChecklist';

const STATUSES  = ['planning', 'active', 'completed', 'cancelled'];
const TYPES     = ['event', 'installation', 'service', 'other'];
const BASE_URL  = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * @param {Object}   props
 * @param {Object}   [props.project]  – existing project for editing, or null for creation
 * @param {Function} props.onSaved    – called with saved project
 * @param {Function} props.onCancel
 */
export function ProjectEditor({ project, onSaved, onCancel }) {
  const [form, setForm] = useState({
    title:          project?.title          || '',
    description:    project?.description    || '',
    project_type:   project?.project_type   || 'event',
    template_id:    project?.template_id    || '',
    client_name:    project?.client_name    || '',
    client_contact: project?.client_contact || '',
    location:       project?.location       || '',
    start_date:     project?.start_date     || '',
    end_date:       project?.end_date       || '',
    status:         project?.status         || 'planning',
    price_estimate: project?.price_estimate || '',
    notes:          project?.notes          || ''
  });
  const [checklist, setChecklist] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [uploading, setUploading] = useState(false);
  const [mediaList, setMediaList] = useState(project?.media || []);

  // Load templates for selector
  useEffect(() => {
    templatesApi.list().then(setTemplates).catch(() => {});
  }, []);

  // When template changes, pre-fill checklist from template
  async function handleTemplateChange(tmplId) {
    set('template_id', tmplId);
    if (!tmplId) return;
    try {
      const tmpl = await templatesApi.get(tmplId);
      if (tmpl.checklist?.length > 0) {
        setChecklist(tmpl.checklist.map((label, idx) => ({
          id: `tmpl-${idx}`, label, done: false
        })));
      }
    } catch (_) { /* ignore */ }
  }

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = {
        ...form,
        template_id: form.template_id || null,
        price_estimate: form.price_estimate ? Number(form.price_estimate) : null,
        // Store checklist in notes JSON field for simplicity
        notes: form.notes || ''
      };
      let result;
      if (project?.id) {
        result = await projectsApi.update(project.id, data);
      } else {
        result = await projectsApi.create(data);
      }
      onSaved && onSaved(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleMediaUpload(e) {
    const files = e.target.files;
    if (!files?.length || !project?.id) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('files', f));
    try {
      const uploaded = await projectsApi.uploadMedia(project.id, fd);
      setMediaList(prev => [...(uploaded || []), ...prev]);
    } catch (err) {
      alert('Upload fehlgeschlagen: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleMediaDelete(mediaId) {
    if (!confirm('Medien-Datei löschen?')) return;
    try {
      await projectsApi.deleteMedia(project.id, mediaId);
      setMediaList(prev => prev.filter(m => m.id !== mediaId));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Titel *</label>
          <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Typ</label>
          <select className="form-select" value={form.project_type} onChange={e => set('project_type', e.target.value)}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Template</label>
          <select className="form-select" value={form.template_id} onChange={e => handleTemplateChange(e.target.value)}>
            <option value="">– kein Template –</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Beschreibung</label>
        <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Kundenname</label>
          <input className="form-input" value={form.client_name} onChange={e => set('client_name', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Kontakt (E-Mail / Tel.)</label>
          <input className="form-input" value={form.client_contact} onChange={e => set('client_contact', e.target.value)} />
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Ort</label>
          <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Preis-Schätzung (€)</label>
          <input className="form-input" type="number" min="0" step="0.01" value={form.price_estimate}
                 onChange={e => set('price_estimate', e.target.value)} />
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Startdatum</label>
          <input className="form-input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Enddatum</label>
          <input className="form-input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </div>
      </div>

      {/* Checklist section */}
      {checklist.length > 0 && (
        <div className="form-group">
          <label className="form-label">Checkliste (vom Template)</label>
          <div className="card" style={{ padding: '.75rem' }}>
            <QuickChecklist items={checklist} onChange={setChecklist} title="Projekt-Checkliste" />
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Notizen</label>
        <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
      </div>

      {/* Media upload – only for existing projects */}
      {project?.id && (
        <div className="form-group">
          <label className="form-label">Medien hochladen</label>
          <input
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            onChange={handleMediaUpload}
            disabled={uploading}
            className="form-input"
          />
          {uploading && <p style={{ fontSize: '.8rem', color: 'var(--color-text-muted)' }}>⏳ Hochladen...</p>}

          {mediaList.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginTop: '.5rem' }}>
              {mediaList.map(m => (
                <div key={m.id} style={{ position: 'relative' }}>
                  {m.mime_type?.startsWith('image/') ? (
                    <img
                      src={`${BASE_URL}/uploads/${m.stored_name}`}
                      alt={m.filename}
                      style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--color-border)' }}
                    />
                  ) : (
                    <div style={{ width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: '1.4rem' }}>
                      📎
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleMediaDelete(m.id)}
                    style={{ position: 'absolute', top: -4, right: -4, background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: '.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p style={{ color: 'var(--color-danger)', fontSize: '.85rem' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Abbrechen</button>}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Speichern...' : (project?.id ? 'Aktualisieren' : 'Erstellen')}
        </button>
      </div>
    </form>
  );
}
