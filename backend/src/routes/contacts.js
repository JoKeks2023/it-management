// src/routes/contacts.js
// REST API endpoints for the Contacts / CRM module.
//
// Endpoints:
//   GET    /contacts            – list contacts (filter: contact_type, search)
//   GET    /contacts/:id        – get a single contact
//   POST   /contacts            – create a contact
//   PUT    /contacts/:id        – update a contact
//   DELETE /contacts/:id        – delete a contact

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const db = require('../db/database');

const routerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
router.use(routerLimiter);

const VALID_TYPES = ['Kunde', 'Veranstalter', 'Lieferant', 'Techniker', 'Sonstiges'];

// ---------------------------------------------------------------------------
// GET /contacts
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  const { contact_type, search } = req.query;

  let query = 'SELECT * FROM contacts WHERE 1=1';
  const params = [];

  if (contact_type) { query += ' AND contact_type = ?'; params.push(contact_type); }
  if (search) {
    query += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY name ASC';

  res.json(db.prepare(query).all(...params));
});

// ---------------------------------------------------------------------------
// GET /contacts/:id
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
});

// ---------------------------------------------------------------------------
// POST /contacts
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  const { name, company, email, phone, address, contact_type = 'Kunde', notes } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!VALID_TYPES.includes(contact_type)) {
    return res.status(400).json({ error: `Invalid contact_type. Must be one of: ${VALID_TYPES.join(', ')}` });
  }

  const result = db.prepare(`
    INSERT INTO contacts (name, company, email, phone, address, contact_type, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(), company || null, email || null, phone || null,
    address || null, contact_type, notes || null
  );

  res.status(201).json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid));
});

// ---------------------------------------------------------------------------
// PUT /contacts/:id
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });

  const { name, company, email, phone, address, contact_type, notes } = req.body;

  if (contact_type && !VALID_TYPES.includes(contact_type)) {
    return res.status(400).json({ error: `Invalid contact_type. Must be one of: ${VALID_TYPES.join(', ')}` });
  }

  const n = (val, old) => val !== undefined ? val : old;
  const newName = name !== undefined ? name.trim() : existing.name;

  db.prepare(`
    UPDATE contacts SET
      name = ?, company = ?, email = ?, phone = ?, address = ?,
      contact_type = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    newName,
    n(company,      existing.company),
    n(email,        existing.email),
    n(phone,        existing.phone),
    n(address,      existing.address),
    n(contact_type, existing.contact_type),
    n(notes,        existing.notes),
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id));
});

// ---------------------------------------------------------------------------
// DELETE /contacts/:id
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });

  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Contact deleted successfully' });
});

module.exports = router;
