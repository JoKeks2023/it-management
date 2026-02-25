// src/components/SetlistManager.jsx
// Create setlists with tracks (BPM/Key/duration), export JSON or CSV.

import { useState, useEffect } from 'react';
import { setlistsApi } from '../services/api';

const KEY_OPTIONS = ['Am', 'Bm', 'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'A', 'B', 'C', 'D', 'E', 'F', 'G',
  'A#', 'Bb', 'Db', 'Eb', 'F#', 'Ab', 'C#', 'D#', 'G#'];

function formatDuration(s) {
  if (!s) return '–';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function TrackRow({ track, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...track });

  function save() {
    onUpdate && onUpdate(form);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="setlist-track" style={{ gridTemplateColumns: '1fr' }}>
        <div className="form-grid" style={{ gap: '.4rem' }}>
          <input className="form-input" style={{ fontSize: '.8rem' }} placeholder="Titel *" value={form.title}
                 onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <input className="form-input" style={{ fontSize: '.8rem' }} placeholder="Artist" value={form.artist || ''}
                 onChange={e => setForm(f => ({ ...f, artist: e.target.value }))} />
          <input className="form-input" style={{ fontSize: '.8rem' }} type="number" placeholder="BPM" value={form.bpm || ''}
                 onChange={e => setForm(f => ({ ...f, bpm: e.target.value ? Number(e.target.value) : null }))} />
          <select className="form-select" style={{ fontSize: '.8rem' }} value={form.key_sig || ''}
                  onChange={e => setForm(f => ({ ...f, key_sig: e.target.value }))}>
            <option value="">– Key –</option>
            {KEY_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <input className="form-input" style={{ fontSize: '.8rem' }} type="number" placeholder="Dauer (s)" value={form.duration_s || ''}
                 onChange={e => setForm(f => ({ ...f, duration_s: e.target.value ? Number(e.target.value) : null }))} />
        </div>
        <div style={{ display: 'flex', gap: '.35rem', marginTop: '.4rem' }}>
          <button className="btn btn-sm btn-primary" onClick={save}>✓ Speichern</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="setlist-track">
      <span className="track-pos">{track.position}</span>
      <div>
        <div className="track-title">{track.title}</div>
        <div className="track-meta">{track.artist || '–'}</div>
      </div>
      <span className="track-meta">{track.bpm ? `${track.bpm} BPM` : '–'}</span>
      <span className="track-meta">{track.key_sig || '–'}</span>
      <span className="track-meta">{formatDuration(track.duration_s)}</span>
      <div style={{ display: 'flex', gap: '.2rem' }}>
        <button className="btn-icon" onClick={() => setEditing(true)}>✏️</button>
        <button className="btn-icon" onClick={() => onDelete(track.id)}>🗑️</button>
      </div>
    </div>
  );
}

function SetlistDetail({ setlist, onBack, onUpdated }) {
  const [tracks, setTracks] = useState(setlist.tracks || []);
  const [newTrack, setNewTrack] = useState({ title: '', artist: '', bpm: '', key_sig: '', duration_s: '' });
  const [adding, setAdding] = useState(false);

  const totalDuration = tracks.reduce((s, t) => s + (t.duration_s || 0), 0);

  async function addTrack() {
    if (!newTrack.title.trim()) return;
    setAdding(true);
    try {
      const track = await setlistsApi.addTrack(setlist.id, {
        ...newTrack,
        bpm: newTrack.bpm ? Number(newTrack.bpm) : null,
        duration_s: newTrack.duration_s ? Number(newTrack.duration_s) : null
      });
      setTracks(prev => [...prev, track]);
      setNewTrack({ title: '', artist: '', bpm: '', key_sig: '', duration_s: '' });
    } catch (err) {
      alert(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function deleteTrack(trackId) {
    if (!confirm('Track entfernen?')) return;
    try {
      await setlistsApi.deleteTrack(setlist.id, trackId);
      setTracks(prev => prev.filter(t => t.id !== trackId));
    } catch (err) {
      alert(err.message);
    }
  }

  async function updateTrack(updatedTrack) {
    try {
      const result = await setlistsApi.updateTrack(setlist.id, updatedTrack.id, updatedTrack);
      setTracks(prev => prev.map(t => t.id === result.id ? result : t));
    } catch (err) {
      alert(err.message);
    }
  }

  function handleExport(format) {
    window.open(setlistsApi.exportUrl(setlist.id, format), '_blank');
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Zurück</button>
        <h3 style={{ flex: 1 }}>🎧 {setlist.name}</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => handleExport('json')}>⬇️ JSON</button>
        <button className="btn btn-ghost btn-sm" onClick={() => handleExport('csv')}>⬇️ CSV</button>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '.85rem', color: 'var(--color-text-muted)' }}>
        <span>{tracks.length} Tracks</span>
        <span>⏱ {formatDuration(totalDuration)}</span>
        {tracks.length > 0 && (
          <span>Ø {Math.round(tracks.reduce((s,t)=>s+(t.bpm||0),0)/tracks.filter(t=>t.bpm).length || 0)} BPM</span>
        )}
      </div>

      {/* Track column headers */}
      {tracks.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr auto auto auto 60px', gap: '.5rem 1rem', padding: '.35rem .6rem', fontSize: '.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
          <span>#</span><span>Titel / Artist</span><span>BPM</span><span>Key</span><span>Dauer</span><span />
        </div>
      )}

      <div className="setlist-tracks">
        {tracks.map(track => (
          <TrackRow
            key={track.id}
            track={track}
            onDelete={deleteTrack}
            onUpdate={updateTrack}
          />
        ))}
      </div>

      {tracks.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '.85rem', fontStyle: 'italic', margin: '.5rem 0' }}>
          Noch keine Tracks. Füge den ersten hinzu!
        </p>
      )}

      {/* Add track form */}
      <div style={{ marginTop: '1rem', padding: '.75rem', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
        <div className="form-grid" style={{ gap: '.4rem', marginBottom: '.5rem' }}>
          <input className="form-input" style={{ fontSize: '.8rem' }} placeholder="Titel *"
                 value={newTrack.title} onChange={e => setNewTrack(f => ({ ...f, title: e.target.value }))} />
          <input className="form-input" style={{ fontSize: '.8rem' }} placeholder="Artist"
                 value={newTrack.artist} onChange={e => setNewTrack(f => ({ ...f, artist: e.target.value }))} />
          <input className="form-input" style={{ fontSize: '.8rem' }} type="number" placeholder="BPM"
                 value={newTrack.bpm} onChange={e => setNewTrack(f => ({ ...f, bpm: e.target.value }))} />
          <select className="form-select" style={{ fontSize: '.8rem' }} value={newTrack.key_sig}
                  onChange={e => setNewTrack(f => ({ ...f, key_sig: e.target.value }))}>
            <option value="">– Key –</option>
            {KEY_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <input className="form-input" style={{ fontSize: '.8rem' }} type="number" placeholder="Dauer (s)"
                 value={newTrack.duration_s} onChange={e => setNewTrack(f => ({ ...f, duration_s: e.target.value }))} />
        </div>
        <button
          className="btn btn-sm btn-primary"
          onClick={addTrack}
          disabled={adding || !newTrack.title.trim()}
        >
          {adding ? '⏳' : '+ Track hinzufügen'}
        </button>
      </div>
    </div>
  );
}

export function SetlistManager() {
  const [setlists, setSetlists]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]     = useState('');
  const [creating, setCreating]   = useState(false);

  async function load() {
    setLoading(true);
    try { setSetlists(await setlistsApi.list()); } catch (_) {}
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function createSetlist() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const sl = await setlistsApi.create({ name: newName.trim() });
      setSetlists(prev => [sl, ...prev]);
      setNewName('');
      setShowCreate(false);
      // open new setlist detail
      const full = await setlistsApi.get(sl.id);
      setSelected(full);
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function openSetlist(sl) {
    try {
      const full = await setlistsApi.get(sl.id);
      setSelected(full);
    } catch (_) {
      setSelected(sl);
    }
  }

  async function deleteSetlist(id) {
    if (!confirm('Setlist löschen?')) return;
    try {
      await setlistsApi.delete(id);
      setSetlists(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  if (selected) {
    return (
      <SetlistDetail
        setlist={selected}
        onBack={() => setSelected(null)}
        onUpdated={updated => setSelected(updated)}
      />
    );
  }

  if (loading) return <p style={{ textAlign: 'center', padding: '2rem' }}>⏳ Lade Setlists...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>🎧 Setlists ({setlists.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
          + Neue Setlist
        </button>
      </div>

      {showCreate && (
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
          <input
            className="form-input"
            placeholder="Setlist-Name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createSetlist()}
          />
          <button className="btn btn-primary btn-sm" onClick={createSetlist} disabled={creating || !newName.trim()}>
            {creating ? '⏳' : 'Erstellen'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {setlists.map(sl => (
          <div
            key={sl.id}
            className="card card-body"
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
            onClick={() => openSetlist(sl)}
          >
            <div style={{ flex: 1 }}>
              <strong>{sl.name}</strong>
              {sl.notes && <span style={{ fontSize: '.8rem', color: 'var(--color-text-muted)', marginLeft: '.5rem' }}>{sl.notes}</span>}
            </div>
            <button
              className="btn-icon"
              onClick={e => { e.stopPropagation(); deleteSetlist(sl.id); }}
              title="Löschen"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      {setlists.length === 0 && (
        <div className="card card-body" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Noch keine Setlists. Erstelle deine erste!
        </div>
      )}
    </div>
  );
}
