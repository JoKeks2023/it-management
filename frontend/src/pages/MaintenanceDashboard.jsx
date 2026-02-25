// src/pages/MaintenanceDashboard.jsx
// Maintenance overview: due/overdue jobs, history, run service.

import { useState, useEffect } from 'react';
import { maintenanceApi } from '../services/api';

const STATUS_BADGE = {
  overdue:   'badge-overdue',
  due:       'badge-due',
  scheduled: 'badge-scheduled',
  completed: 'badge-completed'
};

function formatDate(str) {
  if (!str) return '–';
  return new Date(str).toLocaleDateString('de-DE');
}

function JobRow({ job, onComplete, onDelete }) {
  const [showLogs, setShowLogs] = useState(false);
  const [completeNote, setCompleteNote] = useState('');
  const [completing, setCompleting] = useState(false);

  async function doComplete() {
    setCompleting(true);
    try {
      await onComplete(job.id, { notes: completeNote });
      setCompleteNote('');
    } finally {
      setCompleting(false);
    }
  }

  return (
    <>
      <tr>
        <td><strong>{job.asset_name}</strong></td>
        <td style={{ fontSize: '.82rem', color: 'var(--color-text-muted)' }}>{job.description || '–'}</td>
        <td>{formatDate(job.next_service)}</td>
        <td>
          <span className={`badge ${STATUS_BADGE[job.status] || 'badge-scheduled'}`}>
            {job.status}
          </span>
        </td>
        <td>{job.interval_days} Tage</td>
        <td>
          <div style={{ display: 'flex', gap: '.25rem' }}>
            {job.status !== 'completed' && (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setShowLogs(!showLogs)}
                disabled={completing}
                title="Service abschließen"
              >
                ✓ Service
              </button>
            )}
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setShowLogs(!showLogs)}
              title="Logs anzeigen"
            >
              📋 {job.logs?.length || 0}
            </button>
            <button className="btn-icon" onClick={() => onDelete(job.id)} title="Löschen">🗑️</button>
          </div>
        </td>
      </tr>
      {showLogs && (
        <tr>
          <td colSpan={6} style={{ background: 'var(--color-surface-hover)', padding: '.75rem 1rem' }}>
            {/* Complete form */}
            {job.status !== 'completed' && (
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.75rem' }}>
                <input
                  className="form-input"
                  placeholder="Notiz zum Service (optional)"
                  value={completeNote}
                  onChange={e => setCompleteNote(e.target.value)}
                  style={{ maxWidth: 300, fontSize: '.85rem' }}
                />
                <button
                  className="btn btn-sm btn-primary"
                  onClick={doComplete}
                  disabled={completing}
                >
                  {completing ? '⏳' : '✓ Als erledigt markieren'}
                </button>
              </div>
            )}

            {/* Log entries */}
            {(job.logs?.length > 0) ? (
              <div>
                <strong style={{ fontSize: '.8rem' }}>Service-Logs:</strong>
                <table style={{ width: '100%', marginTop: '.35rem', fontSize: '.8rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--color-text-muted)' }}>
                      <th style={{ textAlign: 'left', padding: '.2rem .5rem' }}>Datum</th>
                      <th style={{ textAlign: 'left', padding: '.2rem .5rem' }}>Durch</th>
                      <th style={{ textAlign: 'left', padding: '.2rem .5rem' }}>Notiz</th>
                      <th style={{ textAlign: 'left', padding: '.2rem .5rem' }}>Kosten</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.logs.map(log => (
                      <tr key={log.id}>
                        <td style={{ padding: '.2rem .5rem' }}>{formatDate(log.performed_at)}</td>
                        <td style={{ padding: '.2rem .5rem' }}>{log.performed_by || '–'}</td>
                        <td style={{ padding: '.2rem .5rem' }}>{log.notes || '–'}</td>
                        <td style={{ padding: '.2rem .5rem' }}>{log.cost ? `€${log.cost}` : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: '.8rem', color: 'var(--color-text-muted)' }}>Keine Logs vorhanden.</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function CreateJobForm({ onCreated }) {
  const [form, setForm] = useState({
    asset_name: '', description: '', interval_days: 90,
    last_service: '', next_service: '', assigned_to: '', notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const job = await maintenanceApi.create({
        ...form,
        interval_days: Number(form.interval_days) || 90
      });
      onCreated && onCreated(job);
      setForm({ asset_name: '', description: '', interval_days: 90, last_service: '', next_service: '', assigned_to: '', notes: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Asset-Name *</label>
          <input className="form-input" value={form.asset_name} onChange={e => set('asset_name', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Intervall (Tage)</label>
          <input className="form-input" type="number" value={form.interval_days} onChange={e => set('interval_days', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Beschreibung</label>
          <input className="form-input" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Nächste Wartung</label>
          <input className="form-input" type="date" value={form.next_service} onChange={e => set('next_service', e.target.value)} />
        </div>
      </div>
      {error && <p style={{ color: 'var(--color-danger)', fontSize: '.85rem', marginTop: '.5rem' }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '.75rem' }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? '⏳' : '+ Erstellen'}
        </button>
      </div>
    </form>
  );
}

export function MaintenanceDashboard() {
  const [jobs, setJobs]         = useState([]);
  const [dueJobs, setDueJobs]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab]           = useState('all');

  async function loadAll() {
    setLoading(true);
    try {
      const [all, due] = await Promise.all([maintenanceApi.list(), maintenanceApi.due()]);
      setJobs(all);
      setDueJobs(due);
    } catch (_) {}
    finally { setLoading(false); }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleComplete(jobId, data) {
    try {
      const updated = await maintenanceApi.complete(jobId, data);
      setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
      setDueJobs(prev => prev.filter(j => j.id !== updated.id));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(jobId) {
    if (!confirm('Wartungs-Job löschen?')) return;
    try {
      await maintenanceApi.delete(jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      setDueJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (err) {
      alert(err.message);
    }
  }

  function handleCreated(job) {
    setJobs(prev => [job, ...prev]);
    const today = new Date().toISOString().split('T')[0];
    if (job.next_service && job.next_service <= today) {
      setDueJobs(prev => [job, ...prev]);
    }
    setShowCreate(false);
  }

  const displayJobs = tab === 'due' ? dueJobs : jobs;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>🔧 Wartung</h2>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={loadAll}>🔄 Aktualisieren</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
            + Neuer Job
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '1rem' }}>
        <div className="stat-card">
          <div className="stat-value">{jobs.length}</div>
          <div className="stat-label">Gesamt</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
            {jobs.filter(j => j.status === 'overdue').length}
          </div>
          <div className="stat-label">Überfällig</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{dueJobs.length}</div>
          <div className="stat-label">Fällig</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>
            {jobs.filter(j => j.status === 'completed').length}
          </div>
          <div className="stat-label">Abgeschlossen</div>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: '.25rem', borderBottom: '2px solid var(--color-border)', marginBottom: '1rem' }}>
        <button
          className={`tab-btn${tab === 'all' ? ' active' : ''}`}
          onClick={() => setTab('all')}
        >
          Alle Jobs ({jobs.length})
        </button>
        <button
          className={`tab-btn${tab === 'due' ? ' active' : ''}`}
          onClick={() => setTab('due')}
        >
          🔴 Fällig ({dueJobs.length})
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header">+ Neuer Wartungs-Job</div>
          <div className="card-body">
            <CreateJobForm onCreated={handleCreated} />
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>⏳ Lade...</p>
      ) : (
        <div className="card">
          <table className="maintenance-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Beschreibung</th>
                <th>Nächste Wartung</th>
                <th>Status</th>
                <th>Intervall</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {displayJobs.map(job => (
                <JobRow
                  key={job.id}
                  job={job}
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
          {displayJobs.length === 0 && (
            <p style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)' }}>
              {tab === 'due' ? '✅ Keine fälligen Wartungen' : 'Keine Wartungs-Jobs vorhanden'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
