// src/routes/maintenance.js
// REST API endpoints for maintenance scheduling and logging.
//
// Endpoints:
//   GET    /maintenance           – list all maintenance jobs
//   GET    /maintenance/due       – list jobs with next_service <= today
//   GET    /maintenance/:id       – get one job with logs
//   POST   /maintenance           – create maintenance job
//   PUT    /maintenance/:id       – update maintenance job
//   DELETE /maintenance/:id       – delete maintenance job
//   POST   /maintenance/:id/log   – log a completed maintenance action
//   POST   /maintenance/:id/complete – mark as completed, update next_service

const express = require('express');
const router = express.Router();
const db = require('../db/database');

// ---------------------------------------------------------------------------
// Helper: compute status from next_service date (does not override 'completed')
// ---------------------------------------------------------------------------
function computeStatus(job) {
  if (job.status === 'completed') return 'completed';
  if (!job.next_service) return 'scheduled';
  const today = new Date().toISOString().split('T')[0];
  if (job.next_service < today) return 'overdue';
  if (job.next_service === today) return 'due';
  // within 7 days
  const diff = (new Date(job.next_service) - new Date(today)) / (1000 * 60 * 60 * 24);
  if (diff <= 7) return 'due';
  return 'scheduled';
}

/** Load full job with logs */
function loadFullJob(id) {
  const job = db.prepare('SELECT * FROM maintenance_jobs WHERE id = ?').get(id);
  if (!job) return null;
  job.logs = db.prepare(
    'SELECT * FROM maintenance_logs WHERE job_id = ? ORDER BY performed_at DESC'
  ).all(id);
  return job;
}

// ---------------------------------------------------------------------------
// GET /maintenance
// ---------------------------------------------------------------------------
router.get('/', (_req, res) => {
  try {
    const jobs = db.prepare('SELECT * FROM maintenance_jobs ORDER BY next_service ASC').all();
    // Update status dynamically
    jobs.forEach(j => { j.status = computeStatus(j); });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /maintenance/due – jobs due or overdue
// ---------------------------------------------------------------------------
router.get('/due', (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const jobs = db.prepare(
      'SELECT * FROM maintenance_jobs WHERE next_service <= ? ORDER BY next_service ASC'
    ).all(today);
    jobs.forEach(j => { j.status = computeStatus(j); });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /maintenance/:id
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  try {
    const job = loadFullJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Maintenance job not found' });
    job.status = computeStatus(job);
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /maintenance
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const {
      asset_name, asset_id, description, interval_days,
      last_service, next_service, assigned_to, notes
    } = req.body;

    if (!asset_name || !asset_name.trim()) {
      return res.status(400).json({ error: 'asset_name is required' });
    }

    // Auto-compute next_service if not provided
    let computedNext = next_service;
    if (!computedNext && last_service && interval_days) {
      const d = new Date(last_service);
      d.setDate(d.getDate() + Number(interval_days));
      computedNext = d.toISOString().split('T')[0];
    }

    const result = db.prepare(`
      INSERT INTO maintenance_jobs
        (asset_name, asset_id, description, interval_days, last_service,
         next_service, assigned_to, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      asset_name.trim(),
      asset_id || null,
      description || null,
      interval_days ? Number(interval_days) : 90,
      last_service || null,
      computedNext || null,
      assigned_to || null,
      notes || null
    );

    const job = loadFullJob(result.lastInsertRowid);
    job.status = computeStatus(job);
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /maintenance/:id
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM maintenance_jobs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Maintenance job not found' });

    const fields = [
      'asset_name', 'asset_id', 'description', 'interval_days',
      'last_service', 'next_service', 'status', 'assigned_to', 'notes'
    ];
    const sets = [];
    const params = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        sets.push(`${f} = ?`);
        params.push(req.body[f]);
      }
    });
    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
    sets.push("updated_at = datetime('now')");
    params.push(req.params.id);
    db.prepare(`UPDATE maintenance_jobs SET ${sets.join(', ')} WHERE id = ?`).run(...params);

    const job = loadFullJob(req.params.id);
    job.status = computeStatus(job);
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /maintenance/:id
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM maintenance_jobs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Maintenance job not found' });
    db.prepare('DELETE FROM maintenance_jobs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /maintenance/:id/log – add a maintenance log entry
// ---------------------------------------------------------------------------
router.post('/:id/log', (req, res) => {
  try {
    const job = db.prepare('SELECT id FROM maintenance_jobs WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Maintenance job not found' });

    const { performed_by, notes, cost } = req.body;
    const result = db.prepare(`
      INSERT INTO maintenance_logs (job_id, performed_by, notes, cost)
      VALUES (?, ?, ?, ?)
    `).run(req.params.id, performed_by || null, notes || null, cost ? Number(cost) : null);

    res.status(201).json({
      id: result.lastInsertRowid,
      job_id: Number(req.params.id),
      performed_by: performed_by || null,
      notes: notes || null,
      cost: cost ? Number(cost) : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /maintenance/:id/complete – mark completed, advance next_service date
// ---------------------------------------------------------------------------
router.post('/:id/complete', (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM maintenance_jobs WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Maintenance job not found' });

    const today = new Date().toISOString().split('T')[0];
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + (job.interval_days || 90));
    const nextService = nextDate.toISOString().split('T')[0];

    db.prepare(`
      UPDATE maintenance_jobs
      SET status = 'completed', last_service = ?, next_service = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(today, nextService, job.id);

    // Auto-create log entry
    const { performed_by, notes, cost } = req.body;
    db.prepare(`
      INSERT INTO maintenance_logs (job_id, performed_by, notes, cost)
      VALUES (?, ?, ?, ?)
    `).run(job.id, performed_by || null, notes || 'Service completed', cost ? Number(cost) : null);

    const updated = loadFullJob(req.params.id);
    updated.status = computeStatus(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
