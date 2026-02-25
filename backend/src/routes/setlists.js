// src/routes/setlists.js
// REST API endpoints for DJ/live setlists.
//
// Endpoints:
//   GET    /setlists              – list all setlists
//   GET    /setlists/:id          – get setlist with tracks
//   POST   /setlists              – create setlist
//   PUT    /setlists/:id          – update setlist metadata
//   DELETE /setlists/:id          – delete setlist
//   POST   /setlists/:id/tracks   – add a track
//   PUT    /setlists/:id/tracks/:trackId  – update a track
//   DELETE /setlists/:id/tracks/:trackId  – remove a track
//   GET    /setlists/:id/export   – export as JSON (Rekordbox/Traktor) or CSV (Ableton)

const express = require('express');
const router = express.Router();
const db = require('../db/database');

// ---------------------------------------------------------------------------
// Helper: load setlist with tracks
// ---------------------------------------------------------------------------
function loadSetlist(id) {
  const setlist = db.prepare('SELECT * FROM setlists WHERE id = ?').get(id);
  if (!setlist) return null;
  setlist.tracks = db.prepare(
    'SELECT * FROM setlist_tracks WHERE setlist_id = ? ORDER BY position ASC'
  ).all(id);
  return setlist;
}

// ---------------------------------------------------------------------------
// GET /setlists
// ---------------------------------------------------------------------------
router.get('/', (_req, res) => {
  try {
    const setlists = db.prepare('SELECT * FROM setlists ORDER BY created_at DESC').all();
    res.json(setlists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /setlists/:id
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  try {
    const setlist = loadSetlist(req.params.id);
    if (!setlist) return res.status(404).json({ error: 'Setlist not found' });
    res.json(setlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /setlists
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const { name, event_id, project_id, notes, tracks } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const result = db.prepare(`
      INSERT INTO setlists (name, event_id, project_id, notes)
      VALUES (?, ?, ?, ?)
    `).run(
      name.trim(),
      event_id || null,
      project_id || null,
      notes || null
    );

    const setlistId = result.lastInsertRowid;

    // Insert tracks if provided
    if (Array.isArray(tracks) && tracks.length > 0) {
      const insertTrack = db.prepare(`
        INSERT INTO setlist_tracks
          (setlist_id, position, title, artist, bpm, key_sig, duration_s, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      tracks.forEach((t, idx) => {
        insertTrack.run(
          setlistId,
          t.position != null ? Number(t.position) : idx + 1,
          t.title || 'Untitled',
          t.artist || null,
          t.bpm ? Number(t.bpm) : null,
          t.key_sig || null,
          t.duration_s ? Number(t.duration_s) : null,
          t.notes || null
        );
      });
    }

    res.status(201).json(loadSetlist(setlistId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /setlists/:id
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM setlists WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Setlist not found' });

    const { name, event_id, project_id, notes } = req.body;
    const sets = [];
    const params = [];
    if (name !== undefined)       { sets.push('name = ?');       params.push(name); }
    if (event_id !== undefined)   { sets.push('event_id = ?');   params.push(event_id); }
    if (project_id !== undefined) { sets.push('project_id = ?'); params.push(project_id); }
    if (notes !== undefined)      { sets.push('notes = ?');      params.push(notes); }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
    sets.push("updated_at = datetime('now')");
    params.push(req.params.id);
    db.prepare(`UPDATE setlists SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    res.json(loadSetlist(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /setlists/:id
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM setlists WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Setlist not found' });
    db.prepare('DELETE FROM setlists WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /setlists/:id/tracks
// ---------------------------------------------------------------------------
router.post('/:id/tracks', (req, res) => {
  try {
    const setlist = db.prepare('SELECT id FROM setlists WHERE id = ?').get(req.params.id);
    if (!setlist) return res.status(404).json({ error: 'Setlist not found' });

    const { title, artist, bpm, key_sig, duration_s, notes, position } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });

    // Auto-assign position if not provided
    const maxPos = db.prepare(
      'SELECT COALESCE(MAX(position), 0) AS maxPos FROM setlist_tracks WHERE setlist_id = ?'
    ).get(req.params.id).maxPos;

    const result = db.prepare(`
      INSERT INTO setlist_tracks
        (setlist_id, position, title, artist, bpm, key_sig, duration_s, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.params.id,
      position != null ? Number(position) : maxPos + 1,
      title.trim(),
      artist || null,
      bpm ? Number(bpm) : null,
      key_sig || null,
      duration_s ? Number(duration_s) : null,
      notes || null
    );

    res.status(201).json(
      db.prepare('SELECT * FROM setlist_tracks WHERE id = ?').get(result.lastInsertRowid)
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /setlists/:id/tracks/:trackId
// ---------------------------------------------------------------------------
router.put('/:id/tracks/:trackId', (req, res) => {
  try {
    const track = db.prepare(
      'SELECT id FROM setlist_tracks WHERE id = ? AND setlist_id = ?'
    ).get(req.params.trackId, req.params.id);
    if (!track) return res.status(404).json({ error: 'Track not found' });

    const fields = ['position', 'title', 'artist', 'bpm', 'key_sig', 'duration_s', 'notes'];
    const sets = [];
    const params = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        sets.push(`${f} = ?`);
        params.push(req.body[f]);
      }
    });
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(req.params.trackId);
    db.prepare(`UPDATE setlist_tracks SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    res.json(db.prepare('SELECT * FROM setlist_tracks WHERE id = ?').get(req.params.trackId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /setlists/:id/tracks/:trackId
// ---------------------------------------------------------------------------
router.delete('/:id/tracks/:trackId', (req, res) => {
  try {
    const track = db.prepare(
      'SELECT id FROM setlist_tracks WHERE id = ? AND setlist_id = ?'
    ).get(req.params.trackId, req.params.id);
    if (!track) return res.status(404).json({ error: 'Track not found' });
    db.prepare('DELETE FROM setlist_tracks WHERE id = ?').run(req.params.trackId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /setlists/:id/export?format=json|csv
// Exports setlist for Rekordbox/Traktor (JSON) or Ableton markers (CSV)
// ---------------------------------------------------------------------------
router.get('/:id/export', (req, res) => {
  try {
    const setlist = loadSetlist(req.params.id);
    if (!setlist) return res.status(404).json({ error: 'Setlist not found' });

    const format = (req.query.format || 'json').toLowerCase();

    if (format === 'csv') {
      // Ableton marker format: time (seconds), name
      let csv = 'Time (s),Title,Artist,BPM,Key\n';
      let cursor = 0;
      setlist.tracks.forEach(t => {
        csv += `${cursor},"${t.title || ''}","${t.artist || ''}",${t.bpm || ''},${t.key_sig || ''}\n`;
        cursor += t.duration_s || 0;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="setlist-${setlist.id}.csv"`);
      return res.send(csv);
    }

    // Default: JSON (Rekordbox/Traktor style)
    const exportData = {
      name: setlist.name,
      exported_at: new Date().toISOString(),
      total_duration_s: setlist.tracks.reduce((s, t) => s + (t.duration_s || 0), 0),
      track_count: setlist.tracks.length,
      tracks: setlist.tracks.map(t => ({
        position: t.position,
        title: t.title,
        artist: t.artist,
        bpm: t.bpm,
        key: t.key_sig,
        duration_s: t.duration_s,
        notes: t.notes
      }))
    };

    res.setHeader('Content-Disposition', `attachment; filename="setlist-${setlist.id}.json"`);
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
