// src/routes/events.js
// REST API endpoints for DJ/tech events and bookings.
//
// Endpoints:
//   GET    /events               – list events (filter: status, event_type, date_from, date_to, search)
//   GET    /events/upcoming      – next 10 upcoming events sorted by event_date
//   GET    /events/:id           – full event with equipment list, attachments, history
//   POST   /events               – create event
//   PUT    /events/:id           – update event (any field)
//   DELETE /events/:id           – delete event
//   GET    /events/:id/history   – change history
//   POST   /events/:id/equipment – add equipment item
//   PUT    /events/:id/equipment/:eqId  – update equipment (reserved flag)
//   DELETE /events/:id/equipment/:eqId  – remove equipment item
//   POST   /events/:id/attachments – upload files
//   DELETE /events/:id/attachments/:attId – remove file

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const db = require('../db/database');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

const routerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
router.use(routerLimiter);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function logHistory(eventId, action, detail) {
  db.prepare(
    'INSERT INTO event_history (event_id, action, detail) VALUES (?, ?, ?)'
  ).run(eventId, action, detail || null);
}

function loadFullEvent(id) {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!event) return null;

  event.equipment = db.prepare(
    'SELECT * FROM event_equipment WHERE event_id = ?'
  ).all(id);

  event.attachments = db.prepare(
    `SELECT id, event_id, filename, mime_type, size, uploaded_at
     FROM attachments WHERE event_id = ?`
  ).all(id);

  return event;
}

// ---------------------------------------------------------------------------
// GET /events/upcoming  (must be before /:id to avoid clash)
// ---------------------------------------------------------------------------
router.get('/upcoming', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const events = db.prepare(`
    SELECT * FROM events
    WHERE event_date >= ? AND status NOT IN ('abgeschlossen')
    ORDER BY event_date ASC, start_time ASC
    LIMIT 10
  `).all(today);
  res.json(events);
});

// ---------------------------------------------------------------------------
// GET /events
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  const { status, event_type, date_from, date_to, search } = req.query;

  let query = 'SELECT * FROM events WHERE 1=1';
  const params = [];

  if (status)     { query += ' AND status = ?';      params.push(status); }
  if (event_type) { query += ' AND event_type = ?';  params.push(event_type); }
  if (date_from)  { query += ' AND event_date >= ?'; params.push(date_from); }
  if (date_to)    { query += ' AND event_date <= ?'; params.push(date_to); }
  if (search) {
    query += ' AND (title LIKE ? OR client_name LIKE ? OR location LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY event_date ASC, start_time ASC';

  const events = db.prepare(query).all(...params);
  res.json(events);
});

// ---------------------------------------------------------------------------
// GET /events/:id
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  const event = loadFullEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// ---------------------------------------------------------------------------
// GET /events/:id/history
// ---------------------------------------------------------------------------
router.get('/:id/history', (req, res) => {
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const history = db.prepare(
    'SELECT * FROM event_history WHERE event_id = ? ORDER BY changed_at DESC'
  ).all(req.params.id);

  res.json(history);
});

// ---------------------------------------------------------------------------
// POST /events
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  const {
    title,
    event_type = 'DJ',
    client_name,
    client_contact,
    location,
    event_date,
    start_time,
    end_time,
    materials_needed,
    price_estimate,
    payment_status = 'offen',
    status = 'angefragt',
    notes,
    equipment = []
  } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  const validTypes    = ['DJ', 'Technik', 'Netzwerk-Setup', 'Hybrid'];
  const validPayment  = ['offen', 'angezahlt', 'bezahlt'];
  const validStatuses = ['angefragt', 'bestätigt', 'vorbereitet', 'durchgeführt', 'abgeschlossen'];

  if (!validTypes.includes(event_type))
    return res.status(400).json({ error: `Invalid event_type. Must be one of: ${validTypes.join(', ')}` });
  if (!validPayment.includes(payment_status))
    return res.status(400).json({ error: `Invalid payment_status. Must be one of: ${validPayment.join(', ')}` });
  if (!validStatuses.includes(status))
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });

  const insertAll = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO events
        (title, event_type, client_name, client_contact, location,
         event_date, start_time, end_time, materials_needed,
         price_estimate, payment_status, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(), event_type, client_name || null, client_contact || null,
      location || null, event_date || null, start_time || null, end_time || null,
      materials_needed || null, price_estimate || null, payment_status, status, notes || null
    );

    const eventId = result.lastInsertRowid;

    for (const eq of equipment) {
      if (eq.asset_name && eq.asset_name.trim()) {
        db.prepare(
          'INSERT INTO event_equipment (event_id, asset_id, asset_name, reserved) VALUES (?, ?, ?, ?)'
        ).run(eventId, eq.asset_id || null, eq.asset_name.trim(), eq.reserved ? 1 : 0);
      }
    }

    logHistory(eventId, 'created',
      `Event "${title.trim()}" created – type: ${event_type}, status: ${status}`);

    return eventId;
  });

  try {
    const eventId = insertAll();
    res.status(201).json(loadFullEvent(eventId));
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// ---------------------------------------------------------------------------
// PUT /events/:id
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  const eventId = req.params.id;
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!existing) return res.status(404).json({ error: 'Event not found' });

  const {
    title, event_type, client_name, client_contact, location,
    event_date, start_time, end_time, materials_needed,
    price_estimate, payment_status, status, notes, equipment
  } = req.body;

  const validTypes    = ['DJ', 'Technik', 'Netzwerk-Setup', 'Hybrid'];
  const validPayment  = ['offen', 'angezahlt', 'bezahlt'];
  const validStatuses = ['angefragt', 'bestätigt', 'vorbereitet', 'durchgeführt', 'abgeschlossen'];

  if (event_type    && !validTypes.includes(event_type))
    return res.status(400).json({ error: `Invalid event_type` });
  if (payment_status && !validPayment.includes(payment_status))
    return res.status(400).json({ error: `Invalid payment_status` });
  if (status        && !validStatuses.includes(status))
    return res.status(400).json({ error: `Invalid status` });

  const updateAll = db.transaction(() => {
    const changes = [];

    const n = (val, old) => val !== undefined ? val : old;
    const newTitle   = title !== undefined ? title.trim() : existing.title;
    const newStatus  = n(status, existing.status);
    const newPayment = n(payment_status, existing.payment_status);

    if (newStatus  !== existing.status)         changes.push(`Status: "${existing.status}" → "${newStatus}"`);
    if (newPayment !== existing.payment_status) changes.push(`Zahlung: "${existing.payment_status}" → "${newPayment}"`);
    if (newTitle   !== existing.title)          changes.push(`Titel geändert zu "${newTitle}"`);

    db.prepare(`
      UPDATE events SET
        title = ?, event_type = ?, client_name = ?, client_contact = ?,
        location = ?, event_date = ?, start_time = ?, end_time = ?,
        materials_needed = ?, price_estimate = ?, payment_status = ?,
        status = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      newTitle,
      n(event_type,       existing.event_type),
      n(client_name,      existing.client_name),
      n(client_contact,   existing.client_contact),
      n(location,         existing.location),
      n(event_date,       existing.event_date),
      n(start_time,       existing.start_time),
      n(end_time,         existing.end_time),
      n(materials_needed, existing.materials_needed),
      n(price_estimate,   existing.price_estimate),
      newPayment,
      newStatus,
      n(notes,            existing.notes),
      eventId
    );

    if (equipment !== undefined) {
      db.prepare('DELETE FROM event_equipment WHERE event_id = ?').run(eventId);
      for (const eq of equipment) {
        if (eq.asset_name && eq.asset_name.trim()) {
          db.prepare(
            'INSERT INTO event_equipment (event_id, asset_id, asset_name, reserved) VALUES (?, ?, ?, ?)'
          ).run(eventId, eq.asset_id || null, eq.asset_name.trim(), eq.reserved ? 1 : 0);
        }
      }
      changes.push('Equipment-Liste aktualisiert');
    }

    if (changes.length > 0) {
      logHistory(eventId, 'updated', changes.join('; '));
    }
  });

  try {
    updateAll();
    res.json(loadFullEvent(eventId));
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /events/:id
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  const eventId = req.params.id;
  const existing = db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
  if (!existing) return res.status(404).json({ error: 'Event not found' });

  const uploadDir = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(__dirname, '..', '..', 'uploads');

  const attachments = db.prepare(
    'SELECT stored_name FROM attachments WHERE event_id = ?'
  ).all(eventId);

  for (const att of attachments) {
    const filePath = path.join(uploadDir, att.stored_name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM events WHERE id = ?').run(eventId);
  res.json({ message: 'Event deleted successfully' });
});

// ---------------------------------------------------------------------------
// POST /events/:id/equipment  – add one equipment item
// ---------------------------------------------------------------------------
router.post('/:id/equipment', (req, res) => {
  const eventId = req.params.id;
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { asset_id, asset_name, reserved = false } = req.body;
  if (!asset_name || asset_name.trim() === '')
    return res.status(400).json({ error: 'asset_name is required' });

  const result = db.prepare(
    'INSERT INTO event_equipment (event_id, asset_id, asset_name, reserved) VALUES (?, ?, ?, ?)'
  ).run(eventId, asset_id || null, asset_name.trim(), reserved ? 1 : 0);

  res.status(201).json(db.prepare('SELECT * FROM event_equipment WHERE id = ?').get(result.lastInsertRowid));
});

// ---------------------------------------------------------------------------
// PUT /events/:id/equipment/:eqId  – update reserved flag / name
// ---------------------------------------------------------------------------
router.put('/:id/equipment/:eqId', (req, res) => {
  const { id: eventId, eqId } = req.params;
  const eq = db.prepare('SELECT * FROM event_equipment WHERE id = ? AND event_id = ?').get(eqId, eventId);
  if (!eq) return res.status(404).json({ error: 'Equipment item not found' });

  const { asset_name, asset_id, reserved } = req.body;
  db.prepare(
    `UPDATE event_equipment SET
      asset_name = ?, asset_id = ?, reserved = ?
     WHERE id = ?`
  ).run(
    asset_name !== undefined ? asset_name : eq.asset_name,
    asset_id   !== undefined ? asset_id   : eq.asset_id,
    reserved   !== undefined ? (reserved ? 1 : 0) : eq.reserved,
    eqId
  );

  if (reserved !== undefined) {
    logHistory(eventId, 'equipment_updated',
      `"${eq.asset_name}" ${reserved ? 'als reserviert markiert' : 'Reservierung aufgehoben'}`);
  }

  res.json(db.prepare('SELECT * FROM event_equipment WHERE id = ?').get(eqId));
});

// ---------------------------------------------------------------------------
// DELETE /events/:id/equipment/:eqId
// ---------------------------------------------------------------------------
router.delete('/:id/equipment/:eqId', (req, res) => {
  const { id: eventId, eqId } = req.params;
  const eq = db.prepare('SELECT * FROM event_equipment WHERE id = ? AND event_id = ?').get(eqId, eventId);
  if (!eq) return res.status(404).json({ error: 'Equipment item not found' });

  db.prepare('DELETE FROM event_equipment WHERE id = ?').run(eqId);
  res.json({ message: 'Equipment item removed' });
});

// ---------------------------------------------------------------------------
// POST /events/:id/attachments
// ---------------------------------------------------------------------------
router.post('/:id/attachments', upload.array('files', 10), (req, res) => {
  const eventId = req.params.id;
  const event = db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  if (!req.files || req.files.length === 0)
    return res.status(400).json({ error: 'No files uploaded' });

  const insertAttachment = db.prepare(`
    INSERT INTO attachments (event_id, filename, stored_name, mime_type, size)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((files) => {
    const inserted = [];
    for (const file of files) {
      const result = insertAttachment.run(
        eventId, file.originalname, file.filename, file.mimetype, file.size
      );
      inserted.push({
        id: result.lastInsertRowid, event_id: parseInt(eventId),
        filename: file.originalname, stored_name: file.filename,
        mime_type: file.mimetype, size: file.size
      });
    }
    logHistory(eventId, 'attachment_added',
      `${files.length} Datei(en) angehängt: ${files.map(f => f.originalname).join(', ')}`);
    return inserted;
  });

  try {
    res.status(201).json(insertMany(req.files));
  } catch (err) {
    console.error('Error saving event attachments:', err);
    res.status(500).json({ error: 'Failed to save attachments' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /events/:id/attachments/:attId
// ---------------------------------------------------------------------------
router.delete('/:id/attachments/:attId', (req, res) => {
  const { id: eventId, attId } = req.params;
  const att = db.prepare('SELECT * FROM attachments WHERE id = ? AND event_id = ?').get(attId, eventId);
  if (!att) return res.status(404).json({ error: 'Attachment not found' });

  const uploadDir = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(__dirname, '..', '..', 'uploads');

  const filePath = path.join(uploadDir, att.stored_name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM attachments WHERE id = ?').run(attId);
  logHistory(eventId, 'attachment_removed', `Datei "${att.filename}" entfernt`);
  res.json({ message: 'Attachment deleted successfully' });
});

module.exports = router;
