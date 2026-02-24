// src/routes/tickets.js
// Express router handling all ticket-related REST API endpoints.
//
// Endpoints:
//   GET    /tickets            – list all tickets (with optional filters)
//   GET    /tickets/:id        – get one ticket with materials, attachments, history
//   POST   /tickets            – create a new ticket
//   PUT    /tickets/:id        – update a ticket (any field)
//   DELETE /tickets/:id        – delete a ticket (cascade to materials, attachments, history)
//   GET    /tickets/:id/history – get change history for a ticket

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const db = require('../db/database');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// Apply rate limiting to all routes in this router
const routerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
router.use(routerLimiter);

// ---------------------------------------------------------------------------
// Helper: log a history entry for a ticket
// ---------------------------------------------------------------------------
function logHistory(ticketId, action, detail) {
  db.prepare(
    'INSERT INTO history (ticket_id, action, detail) VALUES (?, ?, ?)'
  ).run(ticketId, action, detail || null);
}

// ---------------------------------------------------------------------------
// Helper: load a ticket with all related data
// ---------------------------------------------------------------------------
function loadFullTicket(id) {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
  if (!ticket) return null;

  ticket.materials = db.prepare(
    'SELECT * FROM materials WHERE ticket_id = ?'
  ).all(id);

  ticket.attachments = db.prepare(
    'SELECT id, ticket_id, filename, mime_type, size, uploaded_at FROM attachments WHERE ticket_id = ?'
  ).all(id);

  return ticket;
}

// ---------------------------------------------------------------------------
// GET /tickets
// Optional query params: status, priority, asset_id, search
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  const { status, priority, asset_id, search } = req.query;

  let query = 'SELECT * FROM tickets WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (priority) {
    query += ' AND priority = ?';
    params.push(priority);
  }
  if (asset_id) {
    query += ' AND asset_id = ?';
    params.push(asset_id);
  }
  if (search) {
    query += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY CASE priority WHEN \'hoch\' THEN 1 WHEN \'mittel\' THEN 2 ELSE 3 END, created_at DESC';

  const tickets = db.prepare(query).all(...params);

  // Attach material counts to each ticket for the dashboard view
  tickets.forEach(t => {
    const counts = db.prepare(
      'SELECT COUNT(*) as total, SUM(ordered) as ordered FROM materials WHERE ticket_id = ?'
    ).get(t.id);
    t.material_count = counts.total;
    t.materials_ordered = counts.ordered || 0;
  });

  res.json(tickets);
});

// ---------------------------------------------------------------------------
// GET /tickets/:id
// Returns full ticket details including materials, attachments, and history
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  const ticket = loadFullTicket(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

// ---------------------------------------------------------------------------
// GET /tickets/:id/history
// Returns the full change history for a ticket
// ---------------------------------------------------------------------------
router.get('/:id/history', (req, res) => {
  const ticket = db.prepare('SELECT id FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const history = db.prepare(
    'SELECT * FROM history WHERE ticket_id = ? ORDER BY changed_at DESC'
  ).all(req.params.id);

  res.json(history);
});

// ---------------------------------------------------------------------------
// POST /tickets
// Body: { title, description, asset_id, asset_name, status, priority, notes, materials[] }
// materials is an array of { name, ordered, installed }
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  const {
    title,
    description,
    asset_id,
    asset_name,
    status = 'geplant',
    priority = 'mittel',
    notes,
    materials = []
  } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  const validStatuses = ['geplant', 'bestellt', 'installiert', 'fertig'];
  const validPriorities = ['hoch', 'mittel', 'niedrig'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` });
  }

  // Use a transaction so ticket + materials are inserted atomically
  const insertTicketAndMaterials = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO tickets (title, description, asset_id, asset_name, status, priority, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      description || null,
      asset_id || null,
      asset_name || null,
      status,
      priority,
      notes || null
    );

    const ticketId = result.lastInsertRowid;

    for (const material of materials) {
      if (material.name && material.name.trim() !== '') {
        db.prepare(
          'INSERT INTO materials (ticket_id, name, ordered, installed) VALUES (?, ?, ?, ?)'
        ).run(
          ticketId,
          material.name.trim(),
          material.ordered ? 1 : 0,
          material.installed ? 1 : 0
        );
      }
    }

    logHistory(ticketId, 'created', `Ticket "${title.trim()}" created with status "${status}" and priority "${priority}"`);

    return ticketId;
  });

  try {
    const ticketId = insertTicketAndMaterials();
    const ticket = loadFullTicket(ticketId);
    res.status(201).json(ticket);
  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// ---------------------------------------------------------------------------
// PUT /tickets/:id
// Accepts any subset of ticket fields + optional materials array.
// If materials is provided it REPLACES the existing materials list.
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  const ticketId = req.params.id;
  const existing = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  if (!existing) return res.status(404).json({ error: 'Ticket not found' });

  const {
    title,
    description,
    asset_id,
    asset_name,
    status,
    priority,
    notes,
    materials
  } = req.body;

  const validStatuses = ['geplant', 'bestellt', 'installiert', 'fertig'];
  const validPriorities = ['hoch', 'mittel', 'niedrig'];

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` });
  }

  const updateTicketTransaction = db.transaction(() => {
    const changes = [];

    const newTitle = title !== undefined ? title.trim() : existing.title;
    const newDescription = description !== undefined ? description : existing.description;
    const newAssetId = asset_id !== undefined ? asset_id : existing.asset_id;
    const newAssetName = asset_name !== undefined ? asset_name : existing.asset_name;
    const newStatus = status !== undefined ? status : existing.status;
    const newPriority = priority !== undefined ? priority : existing.priority;
    const newNotes = notes !== undefined ? notes : existing.notes;

    if (newStatus !== existing.status) {
      changes.push(`Status changed from "${existing.status}" to "${newStatus}"`);
    }
    if (newPriority !== existing.priority) {
      changes.push(`Priority changed from "${existing.priority}" to "${newPriority}"`);
    }
    if (newTitle !== existing.title) {
      changes.push(`Title changed to "${newTitle}"`);
    }
    if (newNotes !== existing.notes) {
      changes.push('Notes updated');
    }
    if (newAssetId !== existing.asset_id) {
      changes.push(`Asset changed to "${newAssetName || newAssetId}"`);
    }

    db.prepare(`
      UPDATE tickets
      SET title = ?, description = ?, asset_id = ?, asset_name = ?,
          status = ?, priority = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newTitle, newDescription, newAssetId, newAssetName, newStatus, newPriority, newNotes, ticketId);

    if (materials !== undefined) {
      db.prepare('DELETE FROM materials WHERE ticket_id = ?').run(ticketId);
      for (const material of materials) {
        if (material.name && material.name.trim() !== '') {
          db.prepare(
            'INSERT INTO materials (ticket_id, name, ordered, installed) VALUES (?, ?, ?, ?)'
          ).run(
            ticketId,
            material.name.trim(),
            material.ordered ? 1 : 0,
            material.installed ? 1 : 0
          );
        }
      }
      changes.push('Materials list updated');
    }

    if (changes.length > 0) {
      logHistory(ticketId, 'updated', changes.join('; '));
    }
  });

  try {
    updateTicketTransaction();
    const ticket = loadFullTicket(ticketId);
    res.json(ticket);
  } catch (err) {
    console.error('Error updating ticket:', err);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /tickets/:id
// Deletes the ticket and (via CASCADE) all materials, attachments, and history
// Also removes attachment files from disk
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  const ticketId = req.params.id;
  const existing = db.prepare('SELECT id FROM tickets WHERE id = ?').get(ticketId);
  if (!existing) return res.status(404).json({ error: 'Ticket not found' });

  // Remove attachment files from disk before deleting DB records
  const attachments = db.prepare(
    'SELECT stored_name FROM attachments WHERE ticket_id = ?'
  ).all(ticketId);

  const uploadDir = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(__dirname, '..', '..', 'uploads');

  for (const att of attachments) {
    const filePath = path.join(uploadDir, att.stored_name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  db.prepare('DELETE FROM tickets WHERE id = ?').run(ticketId);
  res.json({ message: 'Ticket deleted successfully' });
});

// ---------------------------------------------------------------------------
// POST /tickets/:id/attachments
// Upload one or more files to a ticket
// ---------------------------------------------------------------------------
router.post('/:id/attachments', upload.array('files', 10), (req, res) => {
  const ticketId = req.params.id;
  const ticket = db.prepare('SELECT id FROM tickets WHERE id = ?').get(ticketId);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const insertAttachment = db.prepare(`
    INSERT INTO attachments (ticket_id, filename, stored_name, mime_type, size)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((files) => {
    const inserted = [];
    for (const file of files) {
      const result = insertAttachment.run(
        ticketId,
        file.originalname,
        file.filename,
        file.mimetype,
        file.size
      );
      inserted.push({
        id: result.lastInsertRowid,
        ticket_id: parseInt(ticketId),
        filename: file.originalname,
        stored_name: file.filename,
        mime_type: file.mimetype,
        size: file.size
      });
    }
    logHistory(
      ticketId,
      'attachment_added',
      `${files.length} file(s) attached: ${files.map(f => f.originalname).join(', ')}`
    );
    return inserted;
  });

  try {
    const inserted = insertMany(req.files);
    res.status(201).json(inserted);
  } catch (err) {
    console.error('Error saving attachments:', err);
    res.status(500).json({ error: 'Failed to save attachments' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /tickets/:id/attachments/:attachmentId
// Remove an attachment from a ticket
// ---------------------------------------------------------------------------
router.delete('/:id/attachments/:attachmentId', (req, res) => {
  const { id: ticketId, attachmentId } = req.params;

  const att = db.prepare(
    'SELECT * FROM attachments WHERE id = ? AND ticket_id = ?'
  ).get(attachmentId, ticketId);

  if (!att) return res.status(404).json({ error: 'Attachment not found' });

  const uploadDir = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(__dirname, '..', '..', 'uploads');

  const filePath = path.join(uploadDir, att.stored_name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM attachments WHERE id = ?').run(attachmentId);
  logHistory(ticketId, 'attachment_removed', `File "${att.filename}" removed`);

  res.json({ message: 'Attachment deleted successfully' });
});

module.exports = router;
