// src/pages/Projects.jsx
// Main Projects page: list, filter, create, edit, and manage projects.

import { useState, useEffect, useCallback } from 'react';
import { projectsApi } from '../services/api';
import { UnifiedJobCard } from '../components/UnifiedJobCard';
import { ProjectEditor } from '../components/ProjectEditor';

const STATUSES = ['', 'planning', 'active', 'completed', 'cancelled'];
const TYPES    = ['', 'event', 'installation', 'service', 'other'];

export function Projects() {
  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [filters, setFilters]     = useState({ status: '', project_type: '', search: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.status)       params.status = filters.status;
      if (filters.project_type) params.project_type = filters.project_type;
      if (filters.search)       params.search = filters.search;
      setProjects(await projectsApi.list(params));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  function setFilter(key, val) { setFilters(f => ({ ...f, [key]: val })); }

  function handleCreated(project) {
    setProjects(prev => [project, ...prev]);
    setShowCreate(false);
  }

  function handleUpdated(updated) {
    setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    setEditProject(null);
  }

  async function handleDelete(id) {
    try {
      await projectsApi.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  // Stats
  const stats = {
    total:     projects.length,
    active:    projects.filter(p => p.status === 'active').length,
    planning:  projects.filter(p => p.status === 'planning').length,
    completed: projects.filter(p => p.status === 'completed').length
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2>🏗️ Projekte</h2>
        <button className="btn btn-primary" onClick={() => { setShowCreate(true); setEditProject(null); }}>
          + Neues Projekt
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Gesamt</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{stats.active}</div>
          <div className="stat-label">Aktiv</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.planning}</div>
          <div className="stat-label">Planung</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>{stats.completed}</div>
          <div className="stat-label">Abgeschlossen</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <input
          className="form-input"
          placeholder="🔍 Suche..."
          value={filters.search}
          onChange={e => setFilter('search', e.target.value)}
          style={{ maxWidth: 240 }}
        />
        <select className="form-select" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">Alle Status</option>
          {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-select" value={filters.project_type} onChange={e => setFilter('project_type', e.target.value)}>
          <option value="">Alle Typen</option>
          {TYPES.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={loadProjects}>🔄 Aktualisieren</button>
      </div>

      {/* Create/Edit form */}
      {(showCreate || editProject) && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            {editProject ? `✏️ Projekt bearbeiten: ${editProject.title}` : '+ Neues Projekt'}
          </div>
          <div className="card-body">
            <ProjectEditor
              project={editProject}
              onSaved={editProject ? handleUpdated : handleCreated}
              onCancel={() => { setShowCreate(false); setEditProject(null); }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && <p style={{ color: 'var(--color-danger)', marginBottom: '.75rem' }}>{error}</p>}

      {/* Project list */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>⏳ Lade Projekte...</p>
      ) : (
        <div className="projects-grid">
          {projects.map(project => (
            <UnifiedJobCard
              key={project.id}
              project={project}
              onUpdate={updated => setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))}
              onEdit={p => { setEditProject(p); setShowCreate(false); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {!loading && projects.length === 0 && !showCreate && (
        <div className="card card-body" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem' }}>
          Keine Projekte gefunden. Erstelle dein erstes Projekt!
        </div>
      )}
    </div>
  );
}
