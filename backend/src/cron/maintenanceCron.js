// src/cron/maintenanceCron.js
// Daily cron job that checks for maintenance tasks due or overdue.
// When a job is due (next_service <= today), it:
//   1. Updates status to 'due' or 'overdue'
//   2. Creates a corresponding ticket in the tickets table
//   3. Logs to console (and optionally sends email if MAIL_* env vars are set)
//
// Schedule: every day at 08:00 (configurable via MAINTENANCE_CRON env)

const cron = require('node-cron');
const db   = require('../db/database');

// Optional: simple email notification via nodemailer if configured
let transporter = null;
if (process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS) {
  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      }
    });
    console.log('[MaintenanceCron] Email notifications enabled');
  } catch (_) {
    console.warn('[MaintenanceCron] nodemailer not available, email disabled');
  }
}

/**
 * Run the maintenance check synchronously.
 * Returns an array of jobs that were processed.
 * @returns {Array<Object>} processed jobs
 */
function runMaintenanceCheck() {
  const today = new Date().toISOString().split('T')[0];

  // Find all jobs due or overdue
  const dueJobs = db.prepare(`
    SELECT * FROM maintenance_jobs
    WHERE next_service <= ?
      AND status NOT IN ('completed')
  `).all(today);

  if (dueJobs.length === 0) {
    console.log('[MaintenanceCron] No maintenance jobs due today.');
    return [];
  }

  console.log(`[MaintenanceCron] Found ${dueJobs.length} due/overdue maintenance job(s).`);

  const processed = [];

  for (const job of dueJobs) {
    const isOverdue = job.next_service < today;
    const newStatus = isOverdue ? 'overdue' : 'due';

    // Update job status
    db.prepare(`
      UPDATE maintenance_jobs
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, job.id);

    // Create a maintenance ticket if one doesn't already exist for today
    const existingTicket = db.prepare(`
      SELECT id FROM tickets
      WHERE title = ? AND date(created_at) = ?
    `).get(`[Wartung] ${job.asset_name}`, today);

    let ticketId = null;
    if (!existingTicket) {
      const result = db.prepare(`
        INSERT INTO tickets (title, description, status, priority, notes)
        VALUES (?, ?, 'geplant', 'hoch', ?)
      `).run(
        `[Wartung] ${job.asset_name}`,
        `Wartungsaufgabe fällig: ${job.description || job.asset_name}. Status: ${newStatus}.`,
        job.notes || null
      );
      ticketId = result.lastInsertRowid;
      console.log(`[MaintenanceCron] Created ticket #${ticketId} for job "${job.asset_name}" (${newStatus})`);
    } else {
      ticketId = existingTicket.id;
      console.log(`[MaintenanceCron] Ticket already exists for "${job.asset_name}" today (id: ${ticketId})`);
    }

    // Send email notification if configured
    if (transporter && process.env.MAIL_TO) {
      transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.MAIL_USER,
        to: process.env.MAIL_TO,
        subject: `[IT Management] Wartung fällig: ${job.asset_name}`,
        text: [
          `Wartungsaufgabe ${newStatus}: ${job.asset_name}`,
          `Fällig seit: ${job.next_service}`,
          `Beschreibung: ${job.description || '-'}`,
          `Ticket #${ticketId} wurde erstellt.`
        ].join('\n')
      }).catch(err => {
        console.warn(`[MaintenanceCron] Email send failed: ${err.message}`);
      });
    }

    processed.push({ job, ticketId, status: newStatus });
  }

  return processed;
}

/**
 * Start the maintenance cron job.
 * Schedule defaults to '0 8 * * *' (daily at 08:00).
 * Override with MAINTENANCE_CRON env variable (cron expression).
 */
function startMaintenanceCron() {
  const schedule = process.env.MAINTENANCE_CRON || '0 8 * * *';

  if (!cron.validate(schedule)) {
    console.error(`[MaintenanceCron] Invalid cron expression: "${schedule}"`);
    return null;
  }

  const task = cron.schedule(schedule, () => {
    console.log(`[MaintenanceCron] Running maintenance check at ${new Date().toISOString()}`);
    try {
      runMaintenanceCheck();
    } catch (err) {
      console.error('[MaintenanceCron] Error during check:', err.message);
    }
  }, { timezone: process.env.TZ || 'Europe/Berlin' });

  console.log(`[MaintenanceCron] Scheduled (${schedule})`);
  return task;
}

module.exports = { startMaintenanceCron, runMaintenanceCheck };
