// src/db/database.js
// Initializes and manages the SQLite database connection.
// Uses better-sqlite3 for synchronous, high-performance database access.

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Determine database path from environment or use default
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', '..', 'data', 'tickets.db');

// Ensure the directory for the database file exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Open (or create) the SQLite database
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
// Enable foreign key enforcement
db.pragma('foreign_keys = ON');

/**
 * Initialize all database tables.
 * Runs once at startup. Safe to re-run (uses IF NOT EXISTS).
 */
function initializeDatabase() {
  db.exec(`
    -- ----------------------------------------------------------------
    -- tickets table
    -- Core entity for every IT task / project.
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS tickets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      description TEXT,
      asset_id    TEXT,                  -- Shelf asset ID (external)
      asset_name  TEXT,                  -- Cached name from Shelf API
      status      TEXT    NOT NULL DEFAULT 'geplant'
                          CHECK(status IN ('geplant','bestellt','installiert','fertig')),
      priority    TEXT    NOT NULL DEFAULT 'mittel'
                          CHECK(priority IN ('hoch','mittel','niedrig')),
      notes       TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ----------------------------------------------------------------
    -- materials table
    -- Each row is one item (cable, router, etc.) linked to a ticket.
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS materials (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL,
      ordered    INTEGER NOT NULL DEFAULT 0,  -- 0 = false, 1 = true
      installed  INTEGER NOT NULL DEFAULT 0   -- 0 = false, 1 = true
    );

    -- ----------------------------------------------------------------
    -- attachments table
    -- Files (invoices, manuals) attached to a ticket.
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS attachments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      filename     TEXT    NOT NULL,   -- original file name shown to user
      stored_name  TEXT    NOT NULL,   -- name on disk (UUID-based, unique)
      mime_type    TEXT,
      size         INTEGER,            -- bytes
      uploaded_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ----------------------------------------------------------------
    -- history table
    -- Append-only log of every change made to a ticket.
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      action     TEXT    NOT NULL,  -- e.g. 'created', 'status_changed', 'note_added'
      detail     TEXT,              -- human-readable description of the change
      changed_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

initializeDatabase();

module.exports = db;
