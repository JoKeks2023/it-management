// src/routes/templates.js
// REST API endpoints for reusable project/event templates.
//
// Endpoints:
//   GET    /templates         – list all templates
//   GET    /templates/:id     – get one template
//   POST   /templates         – create template
//   PUT    /templates/:id     – update template
//   DELETE /templates/:id     – delete template

const express = require('express');
const router = express.Router();
const db = require('../db/database');

// ---------------------------------------------------------------------------
// GET /templates
// ---------------------------------------------------------------------------
router.get('/', (_req, res) => {
  try {
    const templates = db.prepare(
      'SELECT * FROM templates ORDER BY created_at DESC'
    ).all();
    // Parse JSON fields
    templates.forEach(t => {
      try { t.checklist = JSON.parse(t.checklist || '[]'); } catch { t.checklist = []; }
      try { t.equipment = JSON.parse(t.equipment || '[]'); } catch { t.equipment = []; }
    });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /templates/:id
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  try {
    const tmpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
    if (!tmpl) return res.status(404).json({ error: 'Template not found' });
    try { tmpl.checklist = JSON.parse(tmpl.checklist || '[]'); } catch { tmpl.checklist = []; }
    try { tmpl.equipment = JSON.parse(tmpl.equipment || '[]'); } catch { tmpl.equipment = []; }
    res.json(tmpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /templates
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const { name, category, description, checklist, equipment, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const result = db.prepare(`
      INSERT INTO templates (name, category, description, checklist, equipment, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      category || 'event',
      description || null,
      JSON.stringify(Array.isArray(checklist) ? checklist : []),
      JSON.stringify(Array.isArray(equipment) ? equipment : []),
      notes || null
    );

    const tmpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(result.lastInsertRowid);
    try { tmpl.checklist = JSON.parse(tmpl.checklist || '[]'); } catch { tmpl.checklist = []; }
    try { tmpl.equipment = JSON.parse(tmpl.equipment || '[]'); } catch { tmpl.equipment = []; }
    res.status(201).json(tmpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /templates/:id
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM templates WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    const { name, category, description, checklist, equipment, notes } = req.body;
    const updates = {};
    if (name !== undefined)        updates.name = name;
    if (category !== undefined)    updates.category = category;
    if (description !== undefined) updates.description = description;
    if (notes !== undefined)       updates.notes = notes;
    if (checklist !== undefined)   updates.checklist = JSON.stringify(Array.isArray(checklist) ? checklist : []);
    if (equipment !== undefined)   updates.equipment = JSON.stringify(Array.isArray(equipment) ? equipment : []);

    const sets = Object.keys(updates).map(k => `${k} = ?`);
    const params = Object.values(updates);

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

    sets.push("updated_at = datetime('now')");
    params.push(req.params.id);
    db.prepare(`UPDATE templates SET ${sets.join(', ')} WHERE id = ?`).run(...params);

    const tmpl = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
    try { tmpl.checklist = JSON.parse(tmpl.checklist || '[]'); } catch { tmpl.checklist = []; }
    try { tmpl.equipment = JSON.parse(tmpl.equipment || '[]'); } catch { tmpl.equipment = []; }
    res.json(tmpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /templates/:id
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM templates WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Template not found' });
    db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
