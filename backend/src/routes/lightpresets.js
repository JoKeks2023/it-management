// src/routes/lightpresets.js
// REST API endpoints for DMX light presets and audio analysis POC.
//
// Endpoints:
//   GET    /lightpresets              – list all presets
//   GET    /lightpresets/:id          – get one preset
//   POST   /lightpresets              – create preset
//   PUT    /lightpresets/:id          – update preset
//   DELETE /lightpresets/:id          – delete preset
//   POST   /lightpresets/analyze-audio – analyze uploaded audio, return DMX JSON (POC)
//   POST   /events/:id/apply-lightpreset – apply a preset to an event

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const upload = require('../middleware/upload');

// ---------------------------------------------------------------------------
// GET /lightpresets
// ---------------------------------------------------------------------------
router.get('/', (_req, res) => {
  try {
    const presets = db.prepare('SELECT * FROM light_presets ORDER BY created_at DESC').all();
    presets.forEach(p => {
      try { p.dmx_json = JSON.parse(p.dmx_json || 'null'); } catch { p.dmx_json = null; }
    });
    res.json(presets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /lightpresets/:id
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  try {
    const preset = db.prepare('SELECT * FROM light_presets WHERE id = ?').get(req.params.id);
    if (!preset) return res.status(404).json({ error: 'Light preset not found' });
    try { preset.dmx_json = JSON.parse(preset.dmx_json || 'null'); } catch { preset.dmx_json = null; }
    res.json(preset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /lightpresets
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const { name, description, dmx_json } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const result = db.prepare(`
      INSERT INTO light_presets (name, description, dmx_json)
      VALUES (?, ?, ?)
    `).run(
      name.trim(),
      description || null,
      dmx_json ? JSON.stringify(dmx_json) : null
    );
    const preset = db.prepare('SELECT * FROM light_presets WHERE id = ?').get(result.lastInsertRowid);
    try { preset.dmx_json = JSON.parse(preset.dmx_json || 'null'); } catch { preset.dmx_json = null; }
    res.status(201).json(preset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /lightpresets/:id
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM light_presets WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Light preset not found' });

    const { name, description, dmx_json } = req.body;
    const sets = [];
    const params = [];
    if (name !== undefined)        { sets.push('name = ?');        params.push(name); }
    if (description !== undefined) { sets.push('description = ?'); params.push(description); }
    if (dmx_json !== undefined)    { sets.push('dmx_json = ?');    params.push(JSON.stringify(dmx_json)); }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
    sets.push("updated_at = datetime('now')");
    params.push(req.params.id);
    db.prepare(`UPDATE light_presets SET ${sets.join(', ')} WHERE id = ?`).run(...params);

    const preset = db.prepare('SELECT * FROM light_presets WHERE id = ?').get(req.params.id);
    try { preset.dmx_json = JSON.parse(preset.dmx_json || 'null'); } catch { preset.dmx_json = null; }
    res.json(preset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /lightpresets/:id
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM light_presets WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Light preset not found' });
    db.prepare('DELETE FROM light_presets WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /lightpresets/analyze-audio
// POC: accepts an audio file upload and generates a simple DMX pattern.
// Algorithm:
//   1. Read file buffer, simulate energy per 50ms frame.
//   2. Map energy peaks to strobe channel (ch 1).
//   3. Map low-band simulation to bass lights (ch 2).
//   4. Map high-band simulation to color fades (ch 3-5).
// Output: { duration_ms, fps, channels: [{channel, values},...] }
// ---------------------------------------------------------------------------
router.post(
  '/analyze-audio',
  upload.single('audio'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded (field: audio)' });
      }

      // POC: we don't do real FFT analysis, but we simulate energy values
      // based on file size as a proxy for "loudness variance".
      const fileSize = req.file.size;
      const durationMs = Math.min(30000, Math.max(3000, fileSize / 50)); // 3-30s estimate
      const fps = 20;
      const frameCount = Math.floor((durationMs / 1000) * fps);

      /**
       * Generate pseudo-random energy values seeded by file content for determinism.
       * Uses a simple LCG random with seed based on file size.
       */
      function seededRandom(seed) {
        let s = seed;
        return function () {
          s = (s * 1664525 + 1013904223) & 0xffffffff;
          return (s >>> 0) / 0xffffffff;
        };
      }

      const rng = seededRandom(fileSize);

      // Channel 1: Strobe – high peaks map to full on
      const strobeValues = Array.from({ length: frameCount }, (_, i) => {
        const energy = rng();
        // Strobe: spike every ~0.5s (10 frames), otherwise 0
        return (i % 10 === 0 && energy > 0.5) ? 255 : 0;
      });

      // Channel 2: Bass lights – sinusoidal with random amplitude
      const bassValues = Array.from({ length: frameCount }, (_, i) => {
        const base = Math.sin((i / fps) * Math.PI * 2 * 1.5); // 1.5 Hz
        const energy = rng();
        return Math.round(Math.max(0, Math.min(255, (base * 0.5 + 0.5) * 200 * energy)));
      });

      // Channel 3: Red – mid-band color fade
      const redValues = Array.from({ length: frameCount }, (_, i) => {
        const energy = rng();
        return Math.round(Math.min(255, energy * 255 * Math.abs(Math.sin(i / fps))));
      });

      // Channel 4: Green – offset phase
      const greenValues = Array.from({ length: frameCount }, (_, i) => {
        const energy = rng();
        return Math.round(Math.min(255, energy * 255 * Math.abs(Math.sin(i / fps + 1))));
      });

      // Channel 5: Blue – offset phase
      const blueValues = Array.from({ length: frameCount }, (_, i) => {
        const energy = rng();
        return Math.round(Math.min(255, energy * 255 * Math.abs(Math.sin(i / fps + 2))));
      });

      const dmxJson = {
        duration_ms: durationMs,
        fps,
        source_file: req.file.originalname,
        channels: [
          { channel: 1, label: 'Strobe',      values: strobeValues },
          { channel: 2, label: 'Bass Lights', values: bassValues },
          { channel: 3, label: 'Red',          values: redValues },
          { channel: 4, label: 'Green',        values: greenValues },
          { channel: 5, label: 'Blue',         values: blueValues }
        ]
      };

      res.json(dmxJson);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
