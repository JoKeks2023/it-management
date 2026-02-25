// src/routes/quotes.js
// REST API for Quotes and Invoices (Angebote & Rechnungen).
//
// Endpoints:
//   GET    /quotes                     – list quotes (filter: event_id, status, quote_type)
//   GET    /quotes/:id                 – get quote with line items
//   POST   /quotes                     – create quote (optionally seed from event inventory)
//   PUT    /quotes/:id                 – update quote header fields
//   DELETE /quotes/:id                 – delete quote
//   POST   /quotes/:id/items           – add line item
//   PUT    /quotes/:id/items/:itemId   – update line item
//   DELETE /quotes/:id/items/:itemId   – remove line item
//   POST   /events/:eventId/quote      – generate quote from event (shortcut)

const express  = require('express');
const router   = express.Router();
const rateLimit = require('express-rate-limit');
const db       = require('../db/database');

const lim = rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false });
router.use(lim);

const VALID_TYPES    = ['Angebot', 'Rechnung', 'Gutschrift'];
const VALID_STATUSES = ['Entwurf', 'Gesendet', 'Angenommen', 'Abgelehnt', 'Bezahlt', 'Storniert'];

// ─── helpers ────────────────────────────────────────────────────────────────

function recalcTotals(quoteId) {
  const { subtotal } = db.prepare(
    'SELECT COALESCE(SUM(total), 0) AS subtotal FROM quote_items WHERE quote_id = ?'
  ).get(quoteId);

  const quote = db.prepare('SELECT tax_rate FROM quotes WHERE id = ?').get(quoteId);
  const tax_amount = subtotal * (quote.tax_rate / 100);
  const total = subtotal + tax_amount;

  db.prepare(
    `UPDATE quotes SET subtotal = ?, tax_amount = ?, total = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(subtotal, tax_amount, total, quoteId);
}

function loadFullQuote(id) {
  const q = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id);
  if (!q) return null;
  q.items = db.prepare('SELECT * FROM quote_items WHERE quote_id = ? ORDER BY position').all(id);
  return q;
}

function nextQuoteNumber(type) {
  const prefix = type === 'Rechnung' ? 'RE' : type === 'Gutschrift' ? 'GU' : 'AN';
  const year   = new Date().getFullYear();
  const { n }  = db.prepare(
    `SELECT COUNT(*) + 1 AS n FROM quotes WHERE quote_type = ? AND quote_number LIKE ?`
  ).get(type, `${prefix}-${year}-%`);
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`;
}

// ─── routes ─────────────────────────────────────────────────────────────────

// GET /quotes
router.get('/', (req, res) => {
  const { event_id, status, quote_type } = req.query;
  let q = 'SELECT * FROM quotes WHERE 1=1';
  const p = [];
  if (event_id)   { q += ' AND event_id = ?';   p.push(event_id); }
  if (status)     { q += ' AND status = ?';      p.push(status); }
  if (quote_type) { q += ' AND quote_type = ?';  p.push(quote_type); }
  q += ' ORDER BY created_at DESC';
  const quotes = db.prepare(q).all(...p);
  // Attach item count
  quotes.forEach(qr => {
    qr.item_count = db.prepare('SELECT COUNT(*) AS c FROM quote_items WHERE quote_id = ?').get(qr.id).c;
  });
  res.json(quotes);
});

// GET /quotes/:id
router.get('/:id', (req, res) => {
  const q = loadFullQuote(req.params.id);
  if (!q) return res.status(404).json({ error: 'Quote not found' });
  res.json(q);
});

// POST /quotes
router.post('/', (req, res) => {
  const {
    event_id, quote_type = 'Angebot', client_name, client_address,
    issue_date, valid_until, tax_rate = 19, notes, items = []
  } = req.body;

  if (!VALID_TYPES.includes(quote_type))
    return res.status(400).json({ error: `Invalid quote_type. Must be one of: ${VALID_TYPES.join(', ')}` });

  if (event_id) {
    const ev = db.prepare('SELECT id FROM events WHERE id = ?').get(event_id);
    if (!ev) return res.status(400).json({ error: 'Referenced event not found' });
  }

  const insertQuote = db.transaction(() => {
    const qn = nextQuoteNumber(quote_type);
    const result = db.prepare(`
      INSERT INTO quotes (event_id, quote_number, quote_type, client_name, client_address,
                          issue_date, valid_until, tax_rate, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event_id || null, qn, quote_type,
      client_name || null, client_address || null,
      issue_date || new Date().toISOString().slice(0, 10),
      valid_until || null, tax_rate, notes || null
    );
    const quoteId = result.lastInsertRowid;

    items.forEach((it, idx) => {
      if (!it.description) return;
      const lineTotal = (it.quantity || 1) * (it.unit_price || 0);
      db.prepare(`
        INSERT INTO quote_items (quote_id, position, description, quantity, unit, unit_price, total)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(quoteId, it.position ?? (idx + 1), it.description,
             it.quantity || 1, it.unit || 'Tag', it.unit_price || 0, lineTotal);
    });

    recalcTotals(quoteId);
    return quoteId;
  });

  try {
    const id = insertQuote();
    res.status(201).json(loadFullQuote(id));
  } catch (err) {
    console.error('Error creating quote:', err);
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// PUT /quotes/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Quote not found' });

  const { quote_type, status, client_name, client_address, issue_date, valid_until, tax_rate, notes } = req.body;
  if (quote_type && !VALID_TYPES.includes(quote_type))    return res.status(400).json({ error: 'Invalid quote_type' });
  if (status     && !VALID_STATUSES.includes(status))     return res.status(400).json({ error: 'Invalid status' });

  const n = (v, old) => v !== undefined ? v : old;
  db.prepare(`
    UPDATE quotes SET
      quote_type = ?, status = ?, client_name = ?, client_address = ?,
      issue_date = ?, valid_until = ?, tax_rate = ?, notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    n(quote_type, existing.quote_type), n(status, existing.status),
    n(client_name, existing.client_name), n(client_address, existing.client_address),
    n(issue_date, existing.issue_date), n(valid_until, existing.valid_until),
    n(tax_rate, existing.tax_rate), n(notes, existing.notes),
    req.params.id
  );

  if (tax_rate !== undefined) recalcTotals(req.params.id);
  res.json(loadFullQuote(req.params.id));
});

// DELETE /quotes/:id
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM quotes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Quote not found' });
  db.prepare('DELETE FROM quotes WHERE id = ?').run(req.params.id);
  res.json({ message: 'Quote deleted' });
});

// POST /quotes/:id/items
router.post('/:id/items', (req, res) => {
  const quote = db.prepare('SELECT id FROM quotes WHERE id = ?').get(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Quote not found' });

  const { description, quantity = 1, unit = 'Tag', unit_price = 0, position } = req.body;
  if (!description) return res.status(400).json({ error: 'description is required' });

  const maxPos = db.prepare('SELECT COALESCE(MAX(position), 0) AS m FROM quote_items WHERE quote_id = ?').get(req.params.id).m;
  const lineTotal = quantity * unit_price;

  const result = db.prepare(`
    INSERT INTO quote_items (quote_id, position, description, quantity, unit, unit_price, total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, position ?? (maxPos + 1), description, quantity, unit, unit_price, lineTotal);

  recalcTotals(req.params.id);
  res.status(201).json(db.prepare('SELECT * FROM quote_items WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /quotes/:id/items/:itemId
router.put('/:id/items/:itemId', (req, res) => {
  const it = db.prepare('SELECT * FROM quote_items WHERE id = ? AND quote_id = ?').get(req.params.itemId, req.params.id);
  if (!it) return res.status(404).json({ error: 'Line item not found' });

  const n = (v, old) => v !== undefined ? v : old;
  const { description, quantity, unit, unit_price, position } = req.body;
  const newQty   = n(quantity,   it.quantity);
  const newPrice = n(unit_price, it.unit_price);

  db.prepare(`UPDATE quote_items SET description = ?, quantity = ?, unit = ?, unit_price = ?, total = ?, position = ? WHERE id = ?`)
    .run(n(description, it.description), newQty, n(unit, it.unit), newPrice,
         newQty * newPrice, n(position, it.position), req.params.itemId);

  recalcTotals(req.params.id);
  res.json(db.prepare('SELECT * FROM quote_items WHERE id = ?').get(req.params.itemId));
});

// DELETE /quotes/:id/items/:itemId
router.delete('/:id/items/:itemId', (req, res) => {
  const it = db.prepare('SELECT id FROM quote_items WHERE id = ? AND quote_id = ?').get(req.params.itemId, req.params.id);
  if (!it) return res.status(404).json({ error: 'Line item not found' });
  db.prepare('DELETE FROM quote_items WHERE id = ?').run(req.params.itemId);
  recalcTotals(req.params.id);
  res.json({ message: 'Item removed' });
});

// POST /events/:eventId/quote  – generate Angebot from event's inventory items
router.post('/from-event/:eventId', (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { quote_type = 'Angebot', tax_rate = 19 } = req.body;
  if (!VALID_TYPES.includes(quote_type)) return res.status(400).json({ error: 'Invalid quote_type' });

  const inventoryLines = db.prepare(`
    SELECT ei.*, ii.name, ii.rental_rate
    FROM event_inventory_items ei
    JOIN inventory_items ii ON ii.id = ei.inventory_item_id
    WHERE ei.event_id = ?
  `).all(req.params.eventId);

  const crewLines = db.prepare('SELECT * FROM event_crew WHERE event_id = ?').all(req.params.eventId);

  const generateQuote = db.transaction(() => {
    const qn = nextQuoteNumber(quote_type);
    const result = db.prepare(`
      INSERT INTO quotes (event_id, quote_number, quote_type, client_name, issue_date, tax_rate, notes)
      VALUES (?, ?, ?, ?, date('now'), ?, ?)
    `).run(event.id, qn, quote_type, event.client_name || null, tax_rate,
           `Automatisch aus Event "${event.title}" generiert`);

    const quoteId = result.lastInsertRowid;
    let pos = 1;

    for (const line of inventoryLines) {
      const unitPrice = line.unit_price > 0 ? line.unit_price : line.rental_rate;
      const lineTotal = line.quantity * line.rental_days * unitPrice;
      db.prepare(`
        INSERT INTO quote_items (quote_id, position, description, quantity, unit, unit_price, total)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(quoteId, pos++,
             `${line.name} (${line.rental_days} Tag${line.rental_days > 1 ? 'e' : ''})`,
             line.quantity, 'Stk', unitPrice * line.rental_days, lineTotal);
    }

    // Add crew fees if any have a role listed (as a placeholder)
    for (const m of crewLines) {
      db.prepare(`
        INSERT INTO quote_items (quote_id, position, description, quantity, unit, unit_price, total)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(quoteId, pos++, `Personal: ${m.name}${m.role ? ` (${m.role})` : ''}`, 1, 'Pauschale', 0, 0);
    }

    // Equipment from the old free-text list
    const eqLines = db.prepare('SELECT * FROM event_equipment WHERE event_id = ?').all(event.id);
    for (const eq of eqLines) {
      if (!inventoryLines.find(l => l.notes === eq.asset_name)) {
        db.prepare(`
          INSERT INTO quote_items (quote_id, position, description, quantity, unit, unit_price, total)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(quoteId, pos++, eq.asset_name, 1, 'Stk', 0, 0);
      }
    }

    recalcTotals(quoteId);
    return quoteId;
  });

  try {
    const id = generateQuote();
    res.status(201).json(loadFullQuote(id));
  } catch (err) {
    console.error('Error generating quote:', err);
    res.status(500).json({ error: 'Failed to generate quote' });
  }
});

module.exports = router;
