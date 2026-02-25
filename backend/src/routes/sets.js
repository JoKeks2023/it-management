// src/routes/sets.js
// REST API for Equipment Sets / Packages (Artikel-Sets).
//
// Endpoints:
//   GET    /sets                          – list all sets
//   GET    /sets/:id                      – get one set with items
//   POST   /sets                          – create set
//   PUT    /sets/:id                      – update set header
//   DELETE /sets/:id                      – delete set
//   POST   /sets/:id/items                – add item to set
//   PUT    /sets/:id/items/:itemId        – update item quantity
//   DELETE /sets/:id/items/:itemId        – remove item from set
//   POST   /sets/:id/apply/:eventId       – book all set items onto an event

const express   = require('express');
const router    = express.Router();
const rateLimit = require('express-rate-limit');
const db        = require('../db/database');

const lim = rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false });
router.use(lim);

// ─── helpers ────────────────────────────────────────────────────────────────

function loadFullSet(id) {
  const s = db.prepare('SELECT * FROM equipment_sets WHERE id = ?').get(id);
  if (!s) return null;
  s.items = db.prepare(`
    SELECT esi.*, ii.name AS item_name, ii.category, ii.rental_rate, ii.quantity AS stock_qty
    FROM equipment_set_items esi
    JOIN inventory_items ii ON ii.id = esi.inventory_item_id
    WHERE esi.set_id = ?
    ORDER BY ii.category, ii.name
  `).all(id);
  return s;
}

function logEventHistory(eventId, action, detail) {
  db.prepare('INSERT INTO event_history (event_id, action, detail) VALUES (?, ?, ?)').run(eventId, action, detail || null);
}

// ─── routes ─────────────────────────────────────────────────────────────────

// GET /sets
router.get('/', (_req, res) => {
  const sets = db.prepare('SELECT * FROM equipment_sets ORDER BY name').all();
  sets.forEach(s => {
    s.item_count = db.prepare('SELECT COUNT(*) AS c FROM equipment_set_items WHERE set_id = ?').get(s.id).c;
  });
  res.json(sets);
});

// GET /sets/:id
router.get('/:id', (req, res) => {
  const s = loadFullSet(req.params.id);
  if (!s) return res.status(404).json({ error: 'Set not found' });
  res.json(s);
});

// POST /sets
router.post('/', (req, res) => {
  const { name, description, notes } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

  const result = db.prepare(
    'INSERT INTO equipment_sets (name, description, notes) VALUES (?, ?, ?)'
  ).run(name.trim(), description || null, notes || null);

  res.status(201).json(loadFullSet(result.lastInsertRowid));
});

// PUT /sets/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM equipment_sets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Set not found' });

  const n = (v, old) => v !== undefined ? v : old;
  const { name, description, notes } = req.body;
  db.prepare(`UPDATE equipment_sets SET name = ?, description = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(name !== undefined ? name.trim() : existing.name,
         n(description, existing.description), n(notes, existing.notes), req.params.id);

  res.json(loadFullSet(req.params.id));
});

// DELETE /sets/:id
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM equipment_sets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Set not found' });
  db.prepare('DELETE FROM equipment_sets WHERE id = ?').run(req.params.id);
  res.json({ message: 'Set deleted' });
});

// POST /sets/:id/items
router.post('/:id/items', (req, res) => {
  const set = db.prepare('SELECT id FROM equipment_sets WHERE id = ?').get(req.params.id);
  if (!set) return res.status(404).json({ error: 'Set not found' });

  const { inventory_item_id, quantity = 1 } = req.body;
  if (!inventory_item_id) return res.status(400).json({ error: 'inventory_item_id is required' });

  const item = db.prepare('SELECT id FROM inventory_items WHERE id = ?').get(inventory_item_id);
  if (!item) return res.status(404).json({ error: 'Inventory item not found' });

  // Upsert: if the item already exists in this set, add quantities
  const existing = db.prepare(
    'SELECT * FROM equipment_set_items WHERE set_id = ? AND inventory_item_id = ?'
  ).get(req.params.id, inventory_item_id);

  let result;
  if (existing) {
    db.prepare('UPDATE equipment_set_items SET quantity = ? WHERE id = ?')
      .run(existing.quantity + quantity, existing.id);
    result = db.prepare('SELECT * FROM equipment_set_items WHERE id = ?').get(existing.id);
  } else {
    const r = db.prepare(
      'INSERT INTO equipment_set_items (set_id, inventory_item_id, quantity) VALUES (?, ?, ?)'
    ).run(req.params.id, inventory_item_id, quantity);
    result = db.prepare('SELECT * FROM equipment_set_items WHERE id = ?').get(r.lastInsertRowid);
  }

  res.status(201).json(result);
});

// PUT /sets/:id/items/:itemId
router.put('/:id/items/:itemId', (req, res) => {
  const si = db.prepare('SELECT * FROM equipment_set_items WHERE id = ? AND set_id = ?').get(req.params.itemId, req.params.id);
  if (!si) return res.status(404).json({ error: 'Set item not found' });

  const { quantity } = req.body;
  if (quantity !== undefined) {
    if (quantity < 1) return res.status(400).json({ error: 'quantity must be >= 1' });
    db.prepare('UPDATE equipment_set_items SET quantity = ? WHERE id = ?').run(quantity, req.params.itemId);
  }

  res.json(db.prepare('SELECT * FROM equipment_set_items WHERE id = ?').get(req.params.itemId));
});

// DELETE /sets/:id/items/:itemId
router.delete('/:id/items/:itemId', (req, res) => {
  const si = db.prepare('SELECT id FROM equipment_set_items WHERE id = ? AND set_id = ?').get(req.params.itemId, req.params.id);
  if (!si) return res.status(404).json({ error: 'Set item not found' });
  db.prepare('DELETE FROM equipment_set_items WHERE id = ?').run(req.params.itemId);
  res.json({ message: 'Item removed from set' });
});

// POST /sets/:id/apply/:eventId
// Books all items in the set onto the given event (with availability check).
router.post('/:id/apply/:eventId', (req, res) => {
  const set   = loadFullSet(req.params.id);
  if (!set) return res.status(404).json({ error: 'Set not found' });

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { rental_days = 1 } = req.body;
  const dateFrom = event.setup_date    || event.event_date;
  const dateTo   = event.teardown_date || event.event_date;

  const conflicts = [];
  const toInsert  = [];

  for (const si of set.items) {
    // Check availability
    let booked = 0;
    if (dateFrom && dateTo) {
      const row = db.prepare(`
        SELECT COALESCE(SUM(ei.quantity), 0) AS booked
        FROM event_inventory_items ei
        JOIN events e ON e.id = ei.event_id
        WHERE ei.inventory_item_id = ? AND e.id != ?
          AND e.status NOT IN ('abgeschlossen')
          AND COALESCE(e.teardown_date, e.event_date) >= ?
          AND COALESCE(e.setup_date,    e.event_date) <= ?
      `).get(si.inventory_item_id, event.id, dateFrom, dateTo);
      booked = row.booked;
    }

    const available = si.stock_qty - booked;
    const needed    = si.quantity;

    if (available < needed) {
      conflicts.push({ item_name: si.item_name, needed, available });
    } else {
      toInsert.push(si);
    }
  }

  const applySet = db.transaction(() => {
    const inserted = [];
    for (const si of toInsert) {
      // Avoid exact duplicates in the same event
      const existing = db.prepare(
        'SELECT * FROM event_inventory_items WHERE event_id = ? AND inventory_item_id = ?'
      ).get(event.id, si.inventory_item_id);

      if (existing) {
        db.prepare('UPDATE event_inventory_items SET quantity = ?, rental_days = ? WHERE id = ?')
          .run(existing.quantity + si.quantity, rental_days, existing.id);
        inserted.push({ ...existing, quantity: existing.quantity + si.quantity });
      } else {
        const r = db.prepare(`
          INSERT INTO event_inventory_items (event_id, inventory_item_id, quantity, rental_days, unit_price)
          VALUES (?, ?, ?, ?, ?)
        `).run(event.id, si.inventory_item_id, si.quantity, rental_days, si.rental_rate);
        inserted.push(db.prepare('SELECT * FROM event_inventory_items WHERE id = ?').get(r.lastInsertRowid));
      }
    }
    logEventHistory(event.id, 'set_applied', `Set "${set.name}" hinzugefügt (${toInsert.length} Artikel)`);
    return inserted;
  });

  try {
    const inserted = applySet();
    res.status(201).json({
      inserted: inserted.length,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      message: conflicts.length > 0
        ? `${inserted.length} Artikel hinzugefügt, ${conflicts.length} Konflikte`
        : `Alle ${inserted.length} Artikel hinzugefügt`
    });
  } catch (err) {
    console.error('Error applying set:', err);
    res.status(500).json({ error: 'Failed to apply set' });
  }
});

module.exports = router;
