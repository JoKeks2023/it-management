-- Migration 001: Projects module
-- Adds tables for projects, project_media, templates, maintenance_jobs,
-- maintenance_logs, light_presets, setlists, automations, and badges.

-- ================================================================
-- PROJECTS
-- A "project" is a higher-level container for events/jobs.
-- ================================================================

CREATE TABLE IF NOT EXISTS projects (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT    NOT NULL,
  description     TEXT,
  project_type    TEXT    NOT NULL DEFAULT 'event'
                          CHECK(project_type IN ('event','installation','service','other')),
  template_id     INTEGER REFERENCES templates(id) ON DELETE SET NULL,
  client_name     TEXT,
  client_contact  TEXT,
  location        TEXT,
  start_date      TEXT,               -- ISO date YYYY-MM-DD
  end_date        TEXT,
  status          TEXT    NOT NULL DEFAULT 'planning'
                          CHECK(status IN ('planning','active','completed','cancelled')),
  invoice_status  TEXT    NOT NULL DEFAULT 'none'
                          CHECK(invoice_status IN ('none','draft','sent','paid')),
  invoice_path    TEXT,               -- path to generated PDF
  clientsite_token TEXT,              -- URL token for client mini-site
  clientsite_path  TEXT,              -- path to generated HTML
  price_estimate  REAL,
  notes           TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ================================================================
-- PROJECT MEDIA
-- Images/videos/audio attached to a project.
-- ================================================================

CREATE TABLE IF NOT EXISTS project_media (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename     TEXT    NOT NULL,
  stored_name  TEXT    NOT NULL,
  mime_type    TEXT,
  size         INTEGER,
  thumbnail    TEXT,                   -- path to thumbnail (images only)
  uploaded_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ================================================================
-- TEMPLATES
-- Reusable project/event templates (festival, club, 1man, etc.)
-- ================================================================

CREATE TABLE IF NOT EXISTS templates (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  category     TEXT    NOT NULL DEFAULT 'event'
                       CHECK(category IN ('event','installation','service','other')),
  description  TEXT,
  checklist    TEXT,   -- JSON array of checklist items
  equipment    TEXT,   -- JSON array of default equipment
  notes        TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ================================================================
-- MAINTENANCE JOBS
-- Scheduled maintenance tasks for assets/equipment.
-- ================================================================

CREATE TABLE IF NOT EXISTS maintenance_jobs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_name      TEXT    NOT NULL,
  asset_id        TEXT,               -- optional Shelf asset ID
  description     TEXT,
  interval_days   INTEGER NOT NULL DEFAULT 90,
  last_service    TEXT,               -- ISO date of last service
  next_service    TEXT,               -- ISO date of next due service
  status          TEXT    NOT NULL DEFAULT 'scheduled'
                          CHECK(status IN ('scheduled','due','overdue','completed')),
  assigned_to     TEXT,
  notes           TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ================================================================
-- MAINTENANCE LOGS
-- Log entries for completed maintenance tasks.
-- ================================================================

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id        INTEGER NOT NULL REFERENCES maintenance_jobs(id) ON DELETE CASCADE,
  performed_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  performed_by  TEXT,
  notes         TEXT,
  cost          REAL
);

-- ================================================================
-- LIGHT PRESETS
-- DMX lighting presets for events.
-- ================================================================

CREATE TABLE IF NOT EXISTS light_presets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  description TEXT,
  dmx_json    TEXT,   -- JSON: { duration_ms, fps, channels:[{channel, values:[]},...] }
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ================================================================
-- SETLISTS
-- DJ/live setlists with tracks and metadata.
-- ================================================================

CREATE TABLE IF NOT EXISTS setlists (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  event_id    INTEGER REFERENCES events(id) ON DELETE SET NULL,
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS setlist_tracks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  setlist_id  INTEGER NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 1,
  title       TEXT    NOT NULL,
  artist      TEXT,
  bpm         REAL,
  key_sig     TEXT,       -- musical key (e.g. "Am", "C#")
  duration_s  INTEGER,    -- duration in seconds
  notes       TEXT
);

-- ================================================================
-- AUTOMATIONS / RULES ENGINE
-- Simple if-then automation rules.
-- ================================================================

CREATE TABLE IF NOT EXISTS automations (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  trigger_type TEXT    NOT NULL DEFAULT 'event_update'
                       CHECK(trigger_type IN ('event_update','daily_cron','manual')),
  condition    TEXT    NOT NULL, -- JSON: {field, operator, value}
  action       TEXT    NOT NULL, -- JSON: {type, payload}
  enabled      INTEGER NOT NULL DEFAULT 1,
  last_run     TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ================================================================
-- BADGES (Gamification)
-- Achievement badges awarded to users.
-- ================================================================

CREATE TABLE IF NOT EXISTS badges (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL UNIQUE,
  description  TEXT,
  icon         TEXT    DEFAULT '🏆',
  criteria     TEXT,   -- JSON: {type, threshold}
  awarded_at   TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ================================================================
-- PANNEN BINGO
-- Random issue bingo cards for events.
-- ================================================================

CREATE TABLE IF NOT EXISTS bingo_cards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id    INTEGER REFERENCES events(id) ON DELETE CASCADE,
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  items       TEXT    NOT NULL, -- JSON array of {issue, resolved}
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
