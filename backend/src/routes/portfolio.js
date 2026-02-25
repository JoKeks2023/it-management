// src/routes/portfolio.js
// REST API endpoints for portfolio items (projects, jobs, creative works).
//
// Endpoints:
//   GET    /portfolio              – list all items (filter: category, tag, search)
//   GET    /portfolio/:id          – get single item with media
//   POST   /portfolio              – create item
//   PUT    /portfolio/:id          – update item
//   DELETE /portfolio/:id          – delete item + media files
//   POST   /portfolio/:id/media    – upload media files (images, video, audio)
//   DELETE /portfolio/:id/media/:mediaId – remove a media file

const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const db      = require('../db/database');
const upload  = require('../middleware/upload');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Load a portfolio item together with its media list. */
function loadFullItem(id) {
  const item = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(id);
  if (!item) return null;

  item.media = db.prepare(
    'SELECT id, portfolio_id, filename, mime_type, size, uploaded_at FROM portfolio_media WHERE portfolio_id = ?'
  ).all(id);

  // Parse tags into an array for convenience
  item.tags = item.tags ? item.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  return item;
}

/** Resolve the upload directory (mirrors events.js / tickets.js). */
function uploadDir() {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(__dirname, '..', '..', 'uploads');
}

// ---------------------------------------------------------------------------
// GET /portfolio  – list with optional filters
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  const { category, tag, search } = req.query;

  let query  = 'SELECT * FROM portfolio_items WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (tag) {
    // Tags are stored as comma-separated values; use LIKE for simple substring match
    query += ' AND (tags LIKE ? OR tags = ?)';
    params.push(`%${tag}%`, tag);
  }
  if (search) {
    query += ' AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY date_from DESC, created_at DESC';

  const items = db.prepare(query).all(...params);

  // Normalise tags for every item in the list
  const result = items.map(item => ({
    ...item,
    tags: item.tags ? item.tags.split(',').map(t => t.trim()).filter(Boolean) : []
  }));

  res.json(result);
});

// ---------------------------------------------------------------------------
// GET /portfolio/:id
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  const item = loadFullItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'Portfolio item not found' });
  res.json(item);
});

// ---------------------------------------------------------------------------
// POST /portfolio  – create
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  const {
    title,
    category = 'IT',
    tags     = [],
    description,
    date_from,
    date_to,
    link
  } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  // Normalise tags: accept array or comma-separated string
  const tagsStr = Array.isArray(tags)
    ? tags.map(t => t.trim()).filter(Boolean).join(',')
    : String(tags);

  try {
    const result = db.prepare(`
      INSERT INTO portfolio_items (title, category, tags, description, date_from, date_to, link)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(), category, tagsStr,
      description || null, date_from || null, date_to || null, link || null
    );

    res.status(201).json(loadFullItem(result.lastInsertRowid));
  } catch (err) {
    console.error('Error creating portfolio item:', err);
    res.status(500).json({ error: 'Failed to create portfolio item' });
  }
});

// ---------------------------------------------------------------------------
// PUT /portfolio/:id  – update (partial)
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  const itemId   = req.params.id;
  const existing = db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(itemId);
  if (!existing) return res.status(404).json({ error: 'Portfolio item not found' });

  const { title, category, tags, description, date_from, date_to, link } = req.body;

  const n = (val, old) => val !== undefined ? val : old;

  // Normalise tags: accept array or comma-separated string; fall back to existing
  let tagsStr = existing.tags;
  if (tags !== undefined) {
    tagsStr = Array.isArray(tags)
      ? tags.map(t => t.trim()).filter(Boolean).join(',')
      : String(tags);
  }

  try {
    db.prepare(`
      UPDATE portfolio_items SET
        title = ?, category = ?, tags = ?, description = ?,
        date_from = ?, date_to = ?, link = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title !== undefined ? title.trim() : existing.title,
      n(category,    existing.category),
      tagsStr,
      n(description, existing.description),
      n(date_from,   existing.date_from),
      n(date_to,     existing.date_to),
      n(link,        existing.link),
      itemId
    );

    res.json(loadFullItem(itemId));
  } catch (err) {
    console.error('Error updating portfolio item:', err);
    res.status(500).json({ error: 'Failed to update portfolio item' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /portfolio/:id
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  const itemId   = req.params.id;
  const existing = db.prepare('SELECT id FROM portfolio_items WHERE id = ?').get(itemId);
  if (!existing) return res.status(404).json({ error: 'Portfolio item not found' });

  // Delete physical media files before removing DB rows (CASCADE handles DB)
  const dir   = uploadDir();
  const media = db.prepare('SELECT stored_name FROM portfolio_media WHERE portfolio_id = ?').all(itemId);
  for (const m of media) {
    const filePath = path.join(dir, m.stored_name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM portfolio_items WHERE id = ?').run(itemId);
  res.json({ message: 'Portfolio item deleted successfully' });
});

// ---------------------------------------------------------------------------
// POST /portfolio/:id/media  – upload media files
// ---------------------------------------------------------------------------
router.post('/:id/media', upload.array('files', 10), (req, res) => {
  const itemId = req.params.id;
  const item   = db.prepare('SELECT id FROM portfolio_items WHERE id = ?').get(itemId);
  if (!item) return res.status(404).json({ error: 'Portfolio item not found' });

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const insert = db.prepare(`
    INSERT INTO portfolio_media (portfolio_id, filename, stored_name, mime_type, size)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((files) => {
    return files.map(file => {
      const result = insert.run(itemId, file.originalname, file.filename, file.mimetype, file.size);
      return {
        id: result.lastInsertRowid,
        portfolio_id: parseInt(itemId),
        filename: file.originalname,
        stored_name: file.filename,
        mime_type: file.mimetype,
        size: file.size
      };
    });
  });

  try {
    res.status(201).json(insertMany(req.files));
  } catch (err) {
    console.error('Error saving portfolio media:', err);
    res.status(500).json({ error: 'Failed to save media' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /portfolio/:id/media/:mediaId
// ---------------------------------------------------------------------------
router.delete('/:id/media/:mediaId', (req, res) => {
  const { id: itemId, mediaId } = req.params;
  const media = db.prepare(
    'SELECT * FROM portfolio_media WHERE id = ? AND portfolio_id = ?'
  ).get(mediaId, itemId);
  if (!media) return res.status(404).json({ error: 'Media file not found' });

  const filePath = path.join(uploadDir(), media.stored_name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM portfolio_media WHERE id = ?').run(mediaId);
  res.json({ message: 'Media file deleted successfully' });
});

module.exports = router;
