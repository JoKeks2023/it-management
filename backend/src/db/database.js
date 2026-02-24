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
    -- Files (invoices, manuals, contracts) attached to a ticket or event.
    -- ticket_id and event_id are mutually exclusive; exactly one is set.
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS attachments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id    INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
      event_id     INTEGER REFERENCES events(id)  ON DELETE CASCADE,
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

    -- ================================================================
    -- EVENTS MODULE
    -- DJ bookings, tech events, network setups, hybrid events.
    -- ================================================================

    -- ----------------------------------------------------------------
    -- events table
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS events (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      title           TEXT    NOT NULL,
      event_type      TEXT    NOT NULL DEFAULT 'DJ'
                              CHECK(event_type IN ('DJ','Technik','Netzwerk-Setup','Hybrid')),
      client_name     TEXT,
      client_contact  TEXT,               -- phone or email
      location        TEXT,
      event_date      TEXT,               -- ISO date YYYY-MM-DD
      start_time      TEXT,               -- HH:MM
      end_time        TEXT,               -- HH:MM
      materials_needed TEXT,              -- free-text list of needed materials
      price_estimate  REAL,
      payment_status  TEXT    NOT NULL DEFAULT 'offen'
                              CHECK(payment_status IN ('offen','angezahlt','bezahlt')),
      status          TEXT    NOT NULL DEFAULT 'angefragt'
                              CHECK(status IN ('angefragt','bestätigt','vorbereitet','durchgeführt','abgeschlossen')),
      notes           TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ----------------------------------------------------------------
    -- event_equipment table
    -- Shelf Asset IDs (or free-text names) assigned to an event.
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS event_equipment (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      asset_id    TEXT,                -- Shelf asset ID (optional)
      asset_name  TEXT    NOT NULL,    -- display name
      reserved    INTEGER NOT NULL DEFAULT 0  -- 0 = needed, 1 = confirmed reserved
    );

    -- ----------------------------------------------------------------
    -- event_history table
    -- Append-only change log for events.
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS event_history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      action     TEXT    NOT NULL,
      detail     TEXT,
      changed_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ================================================================
    -- NETWORK MODULE
    -- Devices, ports, racks for network topology management.
    -- ================================================================

    -- ----------------------------------------------------------------
    -- racks table
    -- Physical rack units in server rooms or venues.
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS racks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      location   TEXT,
      size_u     INTEGER,             -- rack units (e.g. 42)
      notes      TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ----------------------------------------------------------------
    -- network_devices table
    -- Routers, switches, APs, patch panels, firewalls, servers.
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS network_devices (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      device_type   TEXT    NOT NULL DEFAULT 'Switch'
                            CHECK(device_type IN (
                              'Router','Switch','Access Point',
                              'Patchpanel','Firewall','Server','Sonstiges'
                            )),
      manufacturer  TEXT,
      model         TEXT,
      asset_id      TEXT,             -- optional Shelf asset ID
      ip_address    TEXT,
      mac_address   TEXT,
      location      TEXT,
      rack_id       INTEGER REFERENCES racks(id) ON DELETE SET NULL,
      rack_position TEXT,             -- e.g. "U12-U14"
      pos_x         REAL DEFAULT 0,   -- canvas X position for topology view
      pos_y         REAL DEFAULT 0,   -- canvas Y position for topology view
      notes         TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ----------------------------------------------------------------
    -- ports table
    -- Individual ports on a network device.
    -- Connections are modelled as port-to-port references.
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS ports (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id             INTEGER NOT NULL REFERENCES network_devices(id) ON DELETE CASCADE,
      port_number           INTEGER NOT NULL,
      port_label            TEXT,
      connected_to_device_id INTEGER REFERENCES network_devices(id) ON DELETE SET NULL,
      connected_to_port_id   INTEGER REFERENCES ports(id) ON DELETE SET NULL,
      vlan                  TEXT,
      poe_enabled           INTEGER NOT NULL DEFAULT 0,  -- 0/1
      poe_consumption       REAL,                        -- watts
      speed                 TEXT DEFAULT '1G'
                            CHECK(speed IN ('100M','1G','2.5G','10G','25G','40G','100G')),
      status                TEXT    NOT NULL DEFAULT 'aktiv'
                            CHECK(status IN ('aktiv','inaktiv','reserviert')),
      notes                 TEXT
    );

    -- ================================================================
    -- CONTACTS / CRM MODULE
    -- Client, organiser, supplier, and crew member contacts.
    -- ================================================================

    -- ----------------------------------------------------------------
    -- contacts table
    -- Central address book / CRM for all persons and companies.
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS contacts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      company      TEXT,
      email        TEXT,
      phone        TEXT,
      address      TEXT,
      contact_type TEXT    NOT NULL DEFAULT 'Kunde'
                           CHECK(contact_type IN ('Kunde','Veranstalter','Lieferant','Techniker','Sonstiges')),
      notes        TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ----------------------------------------------------------------
    -- event_crew table
    -- Staff / crew members assigned to a specific event.
    -- contact_id is optional – crew can also be entered as free text.
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS event_crew (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name        TEXT    NOT NULL,
      role        TEXT,               -- e.g. 'DJ', 'Techniker', 'Aufbau', 'Abbau'
      contact_id  INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      confirmed   INTEGER NOT NULL DEFAULT 0  -- 0 = angefragt, 1 = bestätigt
    );
  `);
}

initializeDatabase();

module.exports = db;
