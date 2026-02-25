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
      setup_date      TEXT,               -- ISO date: load-in / setup day
      teardown_date   TEXT,               -- ISO date: teardown / return day
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
    -- PORTFOLIO MODULE
    -- Projects, jobs, and creative works with media attachments.
    -- ================================================================

    -- ----------------------------------------------------------------
    -- portfolio_items table
    -- Core entity for every portfolio project / job.
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS portfolio_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      category    TEXT    NOT NULL DEFAULT 'IT',  -- e.g. DJing, Eventtechnik, IT
      tags        TEXT,                            -- comma-separated tags
      description TEXT,
      date_from   TEXT,                            -- ISO date YYYY-MM-DD
      date_to     TEXT,                            -- ISO date YYYY-MM-DD (optional)
      link        TEXT,                            -- optional external URL
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ----------------------------------------------------------------
    -- portfolio_media table
    -- Images, videos, or audio files attached to a portfolio item.
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS portfolio_media (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id    INTEGER NOT NULL REFERENCES portfolio_items(id) ON DELETE CASCADE,
      filename        TEXT    NOT NULL,   -- original file name
      stored_name     TEXT    NOT NULL,   -- UUID-based name on disk
      mime_type       TEXT,
      size            INTEGER,            -- bytes
      uploaded_at     TEXT    NOT NULL DEFAULT (datetime('now'))
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
      status        TEXT DEFAULT 'aktiv' CHECK(status IN ('aktiv','inaktiv')),  -- online/offline status
      unifi_id      TEXT,             -- Unifi controller device ID (NULL if not synced)
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

    -- ================================================================
    -- INVENTORY / EQUIPMENT CATALOG
    -- Owned items with quantities, rental rates, and categories.
    -- ================================================================

    -- ----------------------------------------------------------------
    -- inventory_items table
    -- Each row is one type of equipment you own (e.g. "CDJ-3000").
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS inventory_items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      category      TEXT    NOT NULL DEFAULT 'Sonstiges',
      description   TEXT,
      quantity       INTEGER NOT NULL DEFAULT 1 CHECK(quantity >= 0),
      purchase_price REAL,                    -- buying cost (optional)
      rental_rate    REAL    NOT NULL DEFAULT 0, -- price per day
      barcode       TEXT,                    -- optional barcode / SKU
      notes         TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ----------------------------------------------------------------
    -- event_inventory_items table
    -- Links specific inventory items to an event booking.
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS event_inventory_items (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id         INTEGER NOT NULL REFERENCES events(id)         ON DELETE CASCADE,
      inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      quantity         INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
      rental_days      INTEGER NOT NULL DEFAULT 1 CHECK(rental_days > 0),
      unit_price       REAL    NOT NULL DEFAULT 0,  -- price per day at booking time
      notes            TEXT
    );

    -- ================================================================
    -- QUOTES / INVOICES
    -- Financial documents tied to events (Angebote & Rechnungen).
    -- ================================================================

    -- ----------------------------------------------------------------
    -- quotes table
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS quotes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id     INTEGER REFERENCES events(id) ON DELETE SET NULL,
      quote_number TEXT    NOT NULL,
      quote_type   TEXT    NOT NULL DEFAULT 'Angebot'
                           CHECK(quote_type IN ('Angebot','Rechnung','Gutschrift')),
      issue_date   TEXT    NOT NULL DEFAULT (date('now')),
      valid_until  TEXT,
      client_name  TEXT,
      client_address TEXT,
      status       TEXT    NOT NULL DEFAULT 'Entwurf'
                           CHECK(status IN ('Entwurf','Gesendet','Angenommen','Abgelehnt','Bezahlt','Storniert')),
      subtotal     REAL    NOT NULL DEFAULT 0,
      tax_rate     REAL    NOT NULL DEFAULT 19,
      tax_amount   REAL    NOT NULL DEFAULT 0,
      total        REAL    NOT NULL DEFAULT 0,
      notes        TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- ----------------------------------------------------------------
    -- quote_items table
    -- Line items within a quote / invoice.
    -- ----------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS quote_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_id    INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      position    INTEGER NOT NULL DEFAULT 1,
      description TEXT    NOT NULL,
      quantity    REAL    NOT NULL DEFAULT 1,
      unit        TEXT    DEFAULT 'Tag',
      unit_price  REAL    NOT NULL DEFAULT 0,
      total       REAL    NOT NULL DEFAULT 0
    );

    -- ================================================================
    -- EQUIPMENT SETS / PACKAGES  (Artikel-Sets)
    -- Predefined bundles of inventory items (e.g. "DJ Standard Set").
    -- ================================================================

    CREATE TABLE IF NOT EXISTS equipment_sets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      description TEXT,
      notes       TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Items within a set (references the inventory catalog)
    CREATE TABLE IF NOT EXISTS equipment_set_items (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      set_id            INTEGER NOT NULL REFERENCES equipment_sets(id) ON DELETE CASCADE,
      inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      quantity          INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0)
    );

    -- ================================================================
    -- SUB-RENTAL / FREMDMIETE
    -- Items borrowed from an external supplier for a specific event.
    -- ================================================================

    CREATE TABLE IF NOT EXISTS subrental_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id     INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      supplier_id  INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      item_name    TEXT    NOT NULL,
      quantity     INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
      rental_cost  REAL    NOT NULL DEFAULT 0,  -- cost per unit per day
      rental_days  INTEGER NOT NULL DEFAULT 1,
      status       TEXT    NOT NULL DEFAULT 'angefragt'
                           CHECK(status IN ('angefragt','bestätigt','geliefert','zurückgegeben')),
      notes        TEXT
    );

    -- ================================================================
    -- REPAIR / MAINTENANCE LOG  (Reparaturverwaltung)
    -- Tracks defective / in-repair inventory, reduces available qty.
    -- ================================================================

    CREATE TABLE IF NOT EXISTS repair_logs (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      quantity_affected INTEGER NOT NULL DEFAULT 1 CHECK(quantity_affected > 0),
      issue_description TEXT    NOT NULL,
      status            TEXT    NOT NULL DEFAULT 'defekt'
                                CHECK(status IN ('defekt','in-reparatur','repariert','abgeschrieben')),
      reported_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      resolved_at       TEXT,
      repair_cost       REAL,
      notes             TEXT
    );
  `);

  // -------------------------------------------------------------------
  // Migrations: safely add columns introduced after the initial schema.
  // SQLite does not support IF NOT EXISTS on ALTER TABLE, so we catch
  // the "duplicate column" error and ignore it.
  // -------------------------------------------------------------------
  const safeAddColumn = (table, column, definition) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch (_) { /* column already exists – ignore */ }
  };

  safeAddColumn('events', 'setup_date',    'TEXT');
  safeAddColumn('events', 'teardown_date', 'TEXT');
  safeAddColumn('event_inventory_items', 'packed', 'INTEGER NOT NULL DEFAULT 0');

  // -------------------------------------------------------------------
  // Migration 001: New feature tables (projects, templates, maintenance,
  // light presets, setlists, automations, badges, bingo).
  // -------------------------------------------------------------------
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      category     TEXT    NOT NULL DEFAULT 'event'
                           CHECK(category IN ('event','installation','service','other')),
      description  TEXT,
      checklist    TEXT,
      equipment    TEXT,
      notes        TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      title            TEXT    NOT NULL,
      description      TEXT,
      project_type     TEXT    NOT NULL DEFAULT 'event'
                               CHECK(project_type IN ('event','installation','service','other')),
      template_id      INTEGER REFERENCES templates(id) ON DELETE SET NULL,
      client_name      TEXT,
      client_contact   TEXT,
      location         TEXT,
      start_date       TEXT,
      end_date         TEXT,
      status           TEXT    NOT NULL DEFAULT 'planning'
                               CHECK(status IN ('planning','active','completed','cancelled')),
      invoice_status   TEXT    NOT NULL DEFAULT 'none'
                               CHECK(invoice_status IN ('none','draft','sent','paid')),
      invoice_path     TEXT,
      clientsite_token TEXT,
      clientsite_path  TEXT,
      price_estimate   REAL,
      notes            TEXT,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_media (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      filename     TEXT    NOT NULL,
      stored_name  TEXT    NOT NULL,
      mime_type    TEXT,
      size         INTEGER,
      thumbnail    TEXT,
      uploaded_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS maintenance_jobs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_name    TEXT    NOT NULL,
      asset_id      TEXT,
      description   TEXT,
      interval_days INTEGER NOT NULL DEFAULT 90,
      last_service  TEXT,
      next_service  TEXT,
      status        TEXT    NOT NULL DEFAULT 'scheduled'
                            CHECK(status IN ('scheduled','due','overdue','completed')),
      assigned_to   TEXT,
      notes         TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS maintenance_logs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id       INTEGER NOT NULL REFERENCES maintenance_jobs(id) ON DELETE CASCADE,
      performed_at TEXT    NOT NULL DEFAULT (datetime('now')),
      performed_by TEXT,
      notes        TEXT,
      cost         REAL
    );

    CREATE TABLE IF NOT EXISTS light_presets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      description TEXT,
      dmx_json    TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS setlists (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      event_id   INTEGER REFERENCES events(id) ON DELETE SET NULL,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      notes      TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS setlist_tracks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      setlist_id INTEGER NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
      position   INTEGER NOT NULL DEFAULT 1,
      title      TEXT    NOT NULL,
      artist     TEXT,
      bpm        REAL,
      key_sig    TEXT,
      duration_s INTEGER,
      notes      TEXT
    );

    CREATE TABLE IF NOT EXISTS automations (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      trigger_type TEXT    NOT NULL DEFAULT 'event_update'
                           CHECK(trigger_type IN ('event_update','daily_cron','manual')),
      condition    TEXT    NOT NULL,
      action       TEXT    NOT NULL,
      enabled      INTEGER NOT NULL DEFAULT 1,
      last_run     TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS badges (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL UNIQUE,
      description TEXT,
      icon        TEXT   DEFAULT '🏆',
      criteria    TEXT,
      awarded_at  TEXT,
      created_at  TEXT   NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bingo_cards (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id   INTEGER REFERENCES events(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      items      TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

initializeDatabase();

module.exports = db;
