// src/routes/reports.js
// REST API for Reports & Statistics.
//
// Endpoints:
//   GET /reports/overview        – headline numbers across all modules
//   GET /reports/revenue         – monthly revenue from invoices (last 12 months)
//   GET /reports/equipment       – top items by booking frequency and revenue
//   GET /reports/crew            – crew member booking summary
//   GET /reports/events          – events by month (last 12 months)

const express   = require('express');
const router    = express.Router();
const rateLimit = require('express-rate-limit');
const db        = require('../db/database');

const lim = rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false });
router.use(lim);

// GET /reports/overview
router.get('/overview', (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const thisYear = new Date().getFullYear();

  const events_total      = db.prepare('SELECT COUNT(*) AS n FROM events').get().n;
  const events_upcoming   = db.prepare(`SELECT COUNT(*) AS n FROM events WHERE event_date >= ? AND status NOT IN ('abgeschlossen')`).get(today).n;
  const events_this_year  = db.prepare(`SELECT COUNT(*) AS n FROM events WHERE strftime('%Y', event_date) = ?`).get(String(thisYear)).n;

  const contacts_total    = db.prepare('SELECT COUNT(*) AS n FROM contacts').get().n;
  const inventory_total   = db.prepare('SELECT COUNT(*) AS n FROM inventory_items').get().n;
  const inventory_in_repair = db.prepare(`SELECT COALESCE(SUM(quantity_affected),0) AS n FROM repair_logs WHERE status IN ('defekt','in-reparatur')`).get().n;

  const quotes_open       = db.prepare(`SELECT COUNT(*) AS n FROM quotes WHERE status IN ('Entwurf','Gesendet','Angenommen')`).get().n;
  const revenue_total     = db.prepare(`SELECT COALESCE(SUM(total),0) AS n FROM quotes WHERE quote_type='Rechnung' AND status NOT IN ('Storniert')`).get().n;
  const revenue_this_year = db.prepare(`SELECT COALESCE(SUM(total),0) AS n FROM quotes WHERE quote_type='Rechnung' AND status NOT IN ('Storniert') AND strftime('%Y', issue_date) = ?`).get(String(thisYear)).n;

  const tickets_total     = db.prepare('SELECT COUNT(*) AS n FROM tickets').get().n;
  const tickets_open      = db.prepare(`SELECT COUNT(*) AS n FROM tickets WHERE status != 'fertig'`).get().n;
  const projects_active   = db.prepare(`SELECT COUNT(*) AS n FROM projects WHERE status NOT IN ('abgeschlossen','archiviert')`).get().n;
  const maintenance_due   = db.prepare(`SELECT COUNT(*) AS n FROM maintenance_jobs WHERE status IN ('due','overdue')`).get().n;
  const setlists_total    = db.prepare('SELECT COUNT(*) AS n FROM setlists').get().n;
  const network_devices   = db.prepare('SELECT COUNT(*) AS n FROM network_devices').get().n;

  res.json({
    events_total, events_upcoming, events_this_year,
    contacts_total,
    inventory_total, inventory_in_repair,
    quotes_open,
    revenue_total, revenue_this_year,
    tickets_total, tickets_open,
    projects_active,
    maintenance_due,
    setlists_total,
    network_devices
  });
});

// GET /reports/revenue?months=12
router.get('/revenue', (req, res) => {
  const months = Math.min(parseInt(req.query.months) || 12, 36);
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', issue_date) AS month,
           COALESCE(SUM(subtotal), 0)   AS net,
           COALESCE(SUM(tax_amount), 0) AS tax,
           COALESCE(SUM(total), 0)      AS gross,
           COUNT(*)                     AS count
    FROM quotes
    WHERE quote_type = 'Rechnung'
      AND status NOT IN ('Storniert')
      AND issue_date >= date('now', ?)
    GROUP BY month
    ORDER BY month ASC
  `).all(`-${months} months`);
  res.json(rows);
});

// GET /reports/equipment?limit=10
router.get('/equipment', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const rows = db.prepare(`
    SELECT ii.id, ii.name, ii.category, ii.rental_rate,
           COUNT(DISTINCT ei.event_id) AS events_count,
           COALESCE(SUM(ei.quantity), 0) AS total_qty_booked,
           COALESCE(SUM(ei.quantity * ei.unit_price * ei.rental_days), 0) AS estimated_revenue
    FROM inventory_items ii
    LEFT JOIN event_inventory_items ei ON ei.inventory_item_id = ii.id
    GROUP BY ii.id
    ORDER BY events_count DESC, estimated_revenue DESC
    LIMIT ?
  `).all(limit);
  res.json(rows);
});

// GET /reports/crew?limit=10
router.get('/crew', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const rows = db.prepare(`
    SELECT ec.name,
           ec.role,
           c.company,
           COUNT(DISTINCT ec.event_id) AS events_count,
           SUM(CASE WHEN ec.confirmed = 1 THEN 1 ELSE 0 END) AS confirmed_count
    FROM event_crew ec
    LEFT JOIN contacts c ON c.id = ec.contact_id
    GROUP BY ec.name, ec.role
    ORDER BY events_count DESC
    LIMIT ?
  `).all(limit);
  res.json(rows);
});

// GET /reports/events?months=12
router.get('/events', (req, res) => {
  const months = Math.min(parseInt(req.query.months) || 12, 36);
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', event_date) AS month,
           COUNT(*)                      AS count,
           event_type,
           COALESCE(SUM(price_estimate), 0) AS estimated_revenue
    FROM events
    WHERE event_date >= date('now', ?)
    GROUP BY month, event_type
    ORDER BY month ASC, event_type ASC
  `).all(`-${months} months`);
  res.json(rows);
});

module.exports = router;
