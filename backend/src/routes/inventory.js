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

  // Count how many units are currently in repair (defekt / in-reparatur)
  const { in_repair } = db.prepare(`
    SELECT COALESCE(SUM(quantity_affected), 0) AS in_repair
    FROM repair_logs
    WHERE inventory_item_id = ? AND status IN ('defekt','in-reparatur')
  `).get(item.id);

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
  const usable    = item.quantity - in_repair;
  const available = Math.max(0, usable - booked);

  res.json({
    item_id:   item.id,
    name:      item.name,
    quantity:  item.quantity,
    in_repair,
    usable,
    booked,
    available
  });
});

// ---------------------------------------------------------------------------
// Repair / Maintenance log
// GET    /inventory/:id/repairs       – list repair logs for an item
// POST   /inventory/:id/repairs       – report a defect / start repair
// PUT    /inventory/:id/repairs/:rId  – update repair (e.g. mark resolved)
// DELETE /inventory/:id/repairs/:rId  – delete repair entry
// ---------------------------------------------------------------------------
const REPAIR_STATUSES = ['defekt','in-reparatur','repariert','abgeschrieben'];

router.get('/:id/repairs', (req, res) => {
  const item = db.prepare('SELECT id FROM inventory_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const rows = db.prepare(
    'SELECT * FROM repair_logs WHERE inventory_item_id = ? ORDER BY reported_at DESC'
  ).all(req.params.id);

  res.json(rows);
});

router.post('/:id/repairs', (req, res) => {
  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const { quantity_affected = 1, issue_description, status = 'defekt',
          repair_cost, notes } = req.body;

  if (!issue_description || !issue_description.trim())
    return res.status(400).json({ error: 'issue_description is required' });
  if (!REPAIR_STATUSES.includes(status))
    return res.status(400).json({ error: `Invalid status. Must be one of: ${REPAIR_STATUSES.join(', ')}` });
  if (quantity_affected > item.quantity)
    return res.status(400).json({ error: `quantity_affected cannot exceed item quantity (${item.quantity})` });

  const result = db.prepare(`
    INSERT INTO repair_logs (inventory_item_id, quantity_affected, issue_description, status, repair_cost, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(item.id, quantity_affected, issue_description.trim(), status,
         repair_cost || null, notes || null);

  res.status(201).json(db.prepare('SELECT * FROM repair_logs WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id/repairs/:rId', (req, res) => {
  const r = db.prepare('SELECT * FROM repair_logs WHERE id = ? AND inventory_item_id = ?').get(req.params.rId, req.params.id);
  if (!r) return res.status(404).json({ error: 'Repair log not found' });

  const { status, issue_description, quantity_affected, repair_cost, notes, resolved_at } = req.body;
  if (status && !REPAIR_STATUSES.includes(status))
    return res.status(400).json({ error: 'Invalid status' });

  const n = (v, old) => v !== undefined ? v : old;
  const newStatus = n(status, r.status);
  const isResolved = ['repariert','abgeschrieben'].includes(newStatus);

  db.prepare(`
    UPDATE repair_logs SET
      status = ?, issue_description = ?, quantity_affected = ?,
      repair_cost = ?, notes = ?,
      resolved_at = ?
    WHERE id = ?
  `).run(
    newStatus,
    issue_description !== undefined ? issue_description.trim() : r.issue_description,
    n(quantity_affected, r.quantity_affected),
    n(repair_cost, r.repair_cost),
    n(notes, r.notes),
    resolved_at !== undefined ? resolved_at : (isResolved && !r.resolved_at ? new Date().toISOString() : r.resolved_at),
    req.params.rId
  );

  res.json(db.prepare('SELECT * FROM repair_logs WHERE id = ?').get(req.params.rId));
});

router.delete('/:id/repairs/:rId', (req, res) => {
  const r = db.prepare('SELECT id FROM repair_logs WHERE id = ? AND inventory_item_id = ?').get(req.params.rId, req.params.id);
  if (!r) return res.status(404).json({ error: 'Repair log not found' });
  db.prepare('DELETE FROM repair_logs WHERE id = ?').run(req.params.rId);
  res.json({ message: 'Repair log deleted' });
});

module.exports = router;
