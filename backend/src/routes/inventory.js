// src/routes/inventory.js
// REST API for the Equipment Inventory Catalog (EasyJob-style "Geräteverwaltung").
//
// Endpoints:
//   GET    /inventory                       – list items (filter: category, search)
//   GET    /inventory/categories            – distinct category values
//   GET    /inventory/:id                   – get one item
//   POST   /inventory                       – create item
//   PUT    /inventory/:id                   – update item
//   DELETE /inventory/:id                   – delete item
//   GET    /inventory/:id/availability      – check free qty for a date range
//   GET    /events/:eventId/inventory-items – items booked to an event
//   POST   /events/:eventId/inventory-items – add item to an event
//   PUT    /events/:eventId/inventory-items/:lineId  – update line
//   DELETE /events/:eventId/inventory-items/:lineId  – remove line

const express  = require('express');
const router   = express.Router({ mergeParams: true });
const rateLimit = require('express-rate-limit');
const db       = require('../db/database');

const lim = rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false });
router.use(lim);

// ============================================================================
// Catalog CRUD
// ============================================================================

// GET /inventory
router.get('/', (req, res) => {
  const { category, search } = req.query;
  let q = 'SELECT * FROM inventory_items WHERE 1=1';
  const p = [];
  if (category) { q += ' AND category = ?'; p.push(category); }
  if (search)   { q += ' AND (name LIKE ? OR description LIKE ? OR barcode LIKE ?)'; p.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  q += ' ORDER BY category ASC, name ASC';
  res.json(db.prepare(q).all(...p));
});

// GET /inventory/categories
router.get('/categories', (_req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM inventory_items ORDER BY category').all();
  res.json(rows.map(r => r.category));
});

// GET /inventory/:id
router.get('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// POST /inventory
router.post('/', (req, res) => {
  const { name, category = 'Sonstiges', description, quantity = 1,
          purchase_price, rental_rate = 0, barcode, notes } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  if (quantity < 0)  return res.status(400).json({ error: 'quantity must be >= 0' });

  const result = db.prepare(`
    INSERT INTO inventory_items (name, category, description, quantity, purchase_price, rental_rate, barcode, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name.trim(), category, description || null, quantity,
         purchase_price || null, rental_rate, barcode || null, notes || null);

  res.status(201).json(db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /inventory/:id
router.put('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const n = (v, old) => v !== undefined ? v : old;
  const { name, category, description, quantity, purchase_price, rental_rate, barcode, notes } = req.body;

  db.prepare(`
    UPDATE inventory_items SET
      name = ?, category = ?, description = ?, quantity = ?,
      purchase_price = ?, rental_rate = ?, barcode = ?, notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name !== undefined ? name.trim() : item.name,
    n(category,       item.category),
    n(description,    item.description),
    quantity !== undefined ? quantity : item.quantity,
    n(purchase_price, item.purchase_price),
    n(rental_rate,    item.rental_rate),
    n(barcode,        item.barcode),
    n(notes,          item.notes),
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id));
});

// DELETE /inventory/:id
router.delete('/:id', (req, res) => {
  const item = db.prepare('SELECT id FROM inventory_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  db.prepare('DELETE FROM inventory_items WHERE id = ?').run(req.params.id);
  res.json({ message: 'Item deleted' });
});

// GET /inventory/:id/availability?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
router.get('/:id/availability', (req, res) => {
  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const { date_from, date_to, exclude_event_id } = req.query;

  // Sum of qty booked by events that overlap the requested date range
  let conflictQuery = `
    SELECT COALESCE(SUM(ei.quantity), 0) as booked
    FROM event_inventory_items ei
    JOIN events e ON e.id = ei.event_id
    WHERE ei.inventory_item_id = ?
      AND e.status NOT IN ('abgeschlossen')
  `;
  const cParams = [item.id];

  if (date_from && date_to) {
    // overlap: event period overlaps [date_from, date_to]
    // Use setup_date/teardown_date if present, otherwise event_date
    conflictQuery += `
      AND (
        COALESCE(e.teardown_date, e.event_date) >= ?
        AND COALESCE(e.setup_date, e.event_date) <= ?
      )
    `;
    cParams.push(date_from, date_to);
  }

  if (exclude_event_id) {
    conflictQuery += ' AND ei.event_id != ?';
    cParams.push(exclude_event_id);
  }

  const { booked } = db.prepare(conflictQuery).get(...cParams);
  const available = item.quantity - booked;

  res.json({
    item_id:   item.id,
    name:      item.name,
    quantity:  item.quantity,
    booked,
    available: Math.max(0, available)
  });
});

module.exports = router;
