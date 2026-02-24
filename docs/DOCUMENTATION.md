# IT Management System – Ausführliche Dokumentation

> Diese Dokumentation erklärt jeden Teil des Systems im Detail, sodass du es als alleiniger Entwickler vollständig verstehen, warten und erweitern kannst.

---

## Inhaltsverzeichnis

1. [Systemübersicht](#1-systemübersicht)
2. [Datenbankstruktur](#2-datenbankstruktur)
3. [Backend – API-Endpunkte](#3-backend--api-endpunkte)
4. [Backend – Datei-Upload](#4-backend--datei-upload)
5. [Shelf API Integration](#5-shelf-api-integration)
6. [Frontend – Komponenten](#6-frontend--komponenten)
7. [Frontend – API-Service](#7-frontend--api-service)
8. [Konfiguration & Umgebungsvariablen](#8-konfiguration--umgebungsvariablen)
9. [Deployment auf Raspberry Pi / Proxmox](#9-deployment-auf-raspberry-pi--proxmox)
10. [Neue Features hinzufügen](#10-neue-features-hinzufügen)
11. [Sicherheitshinweise](#11-sicherheitshinweise)
12. [Events-Modul](#12-events-modul)
13. [Netzwerk-Modul](#13-netzwerk-modul)

---

## 1. Systemübersicht

Das System besteht aus zwei unabhängigen Teilen:

```
Browser (React)  ←→  Express Backend (Node.js)  ←→  SQLite DB
                                ↓
                         Shelf API (optional)
```

- **Frontend** kommuniziert ausschließlich über REST-API mit dem Backend.
- **Backend** verwaltet die SQLite-Datenbank, proxied die Shelf API und speichert Datei-Uploads lokal.
- **SQLite** ist eine einzige Datei auf dem Server – kein separater Datenbankserver nötig.

### Warum SQLite?

SQLite ist ideal für persönliche / lokale Anwendungen:
- Keine Installation eines separaten DB-Servers
- Einfaches Backup (eine einzelne `.db`-Datei kopieren)
- Hohe Leseperformance dank WAL-Modus
- Perfekt für ein einzelnes Instanzsystem ohne Concurrent Writes

---

## 2. Datenbankstruktur

Die Datenbank wird automatisch beim ersten Start des Backends erstellt unter `backend/data/tickets.db`.

### Tabelle: `tickets`

| Spalte      | Typ     | Beschreibung                                       |
|-------------|---------|----------------------------------------------------|
| id          | INTEGER | Primärschlüssel, auto-increment                    |
| title       | TEXT    | Kurze Bezeichnung (z.B. „Router installieren")     |
| description | TEXT    | Ausführliche Beschreibung der Aufgabe              |
| asset_id    | TEXT    | Shelf Asset-ID (extern)                            |
| asset_name  | TEXT    | Gecachter Name des Assets aus der Shelf API        |
| status      | TEXT    | Enum: `geplant` / `bestellt` / `installiert` / `fertig` |
| priority    | TEXT    | Enum: `hoch` / `mittel` / `niedrig`                |
| notes       | TEXT    | Freitext-Notizen                                   |
| created_at  | TEXT    | ISO-Timestamp der Erstellung                       |
| updated_at  | TEXT    | ISO-Timestamp der letzten Änderung                 |

### Tabelle: `materials`

| Spalte    | Typ     | Beschreibung                          |
|-----------|---------|---------------------------------------|
| id        | INTEGER | Primärschlüssel                       |
| ticket_id | INTEGER | FK → tickets.id (CASCADE DELETE)      |
| name      | TEXT    | Bezeichnung des Materials             |
| ordered   | INTEGER | 0 = nicht bestellt, 1 = bestellt      |
| installed | INTEGER | 0 = nicht eingebaut, 1 = eingebaut    |

### Tabelle: `attachments`

| Spalte      | Typ     | Beschreibung                                      |
|-------------|---------|---------------------------------------------------|
| id          | INTEGER | Primärschlüssel                                   |
| ticket_id   | INTEGER | FK → tickets.id (CASCADE DELETE)                  |
| filename    | TEXT    | Originaler Dateiname (für Anzeige)                |
| stored_name | TEXT    | Name auf Disk (UUID-basiert, z.B. `uuid.pdf`)     |
| mime_type   | TEXT    | MIME-Typ (z.B. `application/pdf`)                 |
| size        | INTEGER | Dateigröße in Bytes                               |
| uploaded_at | TEXT    | ISO-Timestamp des Uploads                         |

### Tabelle: `history`

| Spalte     | Typ     | Beschreibung                                    |
|------------|---------|-------------------------------------------------|
| id         | INTEGER | Primärschlüssel                                 |
| ticket_id  | INTEGER | FK → tickets.id (CASCADE DELETE)                |
| action     | TEXT    | Art der Änderung (z.B. `created`, `updated`)    |
| detail     | TEXT    | Beschreibung der Änderung im Klartext           |
| changed_at | TEXT    | ISO-Timestamp der Änderung                      |

**Foreign Keys** sind aktiviert (`PRAGMA foreign_keys = ON`). Beim Löschen eines Tickets werden automatisch alle zugehörigen Materials, Attachments und History-Einträge gelöscht (CASCADE).

---

## 3. Backend – API-Endpunkte

Alle Endpunkte sind unter `http://localhost:3001` erreichbar.

### GET /health

Gibt den Status des Servers zurück.

```json
{ "status": "ok", "timestamp": "2024-01-01T10:00:00.000Z" }
```

---

### GET /tickets

Gibt eine Liste aller Tickets zurück. Jedes Ticket enthält zusätzlich `material_count` und `materials_ordered` für die Dashboard-Übersicht.

**Query Parameter (optional):**

| Parameter | Beschreibung                        | Beispiel                   |
|-----------|-------------------------------------|----------------------------|
| status    | Filtert nach Status                 | `?status=bestellt`         |
| priority  | Filtert nach Priorität              | `?priority=hoch`           |
| asset_id  | Filtert nach Asset-ID               | `?asset_id=shelf-123`      |
| search    | Sucht in Titel und Beschreibung     | `?search=router`           |

**Beispiel-Response:**

```json
[
  {
    "id": 1,
    "title": "Router installieren",
    "status": "bestellt",
    "priority": "hoch",
    "asset_id": "shelf-123",
    "asset_name": "Router XYZ",
    "material_count": 3,
    "materials_ordered": 2,
    "created_at": "2024-01-01T09:00:00",
    "updated_at": "2024-01-01T10:00:00"
  }
]
```

**Sortierung:** Tickets werden nach Priorität (hoch → mittel → niedrig) und dann nach Erstelldatum (neueste zuerst) sortiert.

---

### GET /tickets/:id

Gibt ein einzelnes Ticket mit allen Details zurück, inkl. Materials, Attachments und (ohne History – dafür separater Endpunkt).

**Beispiel-Response:**

```json
{
  "id": 1,
  "title": "Router installieren",
  "description": "Neuen Router im Serverraum einbauen",
  "status": "bestellt",
  "priority": "hoch",
  "notes": "Kabelführung beachten",
  "materials": [
    { "id": 1, "ticket_id": 1, "name": "Kabel Cat6", "ordered": 1, "installed": 0 },
    { "id": 2, "ticket_id": 1, "name": "Router XYZ", "ordered": 0, "installed": 0 }
  ],
  "attachments": [
    { "id": 1, "ticket_id": 1, "filename": "rechnung.pdf", "mime_type": "application/pdf", "size": 102400, "uploaded_at": "..." }
  ]
}
```

---

### POST /tickets

Erstellt ein neues Ticket.

**Request Body:**

```json
{
  "title": "Router installieren",
  "description": "Neuen Router im Serverraum einbauen",
  "asset_id": "shelf-123",
  "asset_name": "Router XYZ",
  "status": "geplant",
  "priority": "hoch",
  "notes": "Kabelführung beachten",
  "materials": [
    { "name": "Kabel Cat6", "ordered": false, "installed": false },
    { "name": "Router XYZ", "ordered": false, "installed": false }
  ]
}
```

**Pflichtfelder:** `title`

**Valide Status-Werte:** `geplant`, `bestellt`, `installiert`, `fertig`

**Valide Prioritäts-Werte:** `hoch`, `mittel`, `niedrig`

**Response:** `201 Created` mit dem vollständigen Ticket-Objekt.

---

### PUT /tickets/:id

Aktualisiert ein bestehendes Ticket. **Partial Update** – nur die angegebenen Felder werden geändert.

**Wichtig:** Wenn `materials` angegeben wird, wird die gesamte Materialliste **ersetzt** (nicht ergänzt).

**Beispiel – Status ändern:**

```json
{ "status": "installiert" }
```

**Beispiel – Materialien aktualisieren:**

```json
{
  "materials": [
    { "name": "Kabel Cat6", "ordered": true, "installed": true },
    { "name": "Router XYZ", "ordered": true, "installed": false }
  ]
}
```

**Response:** `200 OK` mit dem aktualisierten Ticket.

---

### DELETE /tickets/:id

Löscht ein Ticket und alle zugehörigen Daten (Materials, Attachments, History). Attachment-Dateien werden auch von der Festplatte gelöscht.

**Response:** `200 OK`

```json
{ "message": "Ticket deleted successfully" }
```

---

### GET /tickets/:id/history

Gibt den vollständigen Änderungsverlauf eines Tickets zurück (neueste zuerst).

**Beispiel-Response:**

```json
[
  {
    "id": 3,
    "ticket_id": 1,
    "action": "updated",
    "detail": "Status changed from \"geplant\" to \"bestellt\"; Materials list updated",
    "changed_at": "2024-01-02T10:00:00"
  },
  {
    "id": 1,
    "ticket_id": 1,
    "action": "created",
    "detail": "Ticket \"Router installieren\" created with status \"geplant\" and priority \"hoch\"",
    "changed_at": "2024-01-01T09:00:00"
  }
]
```

---

### POST /tickets/:id/attachments

Lädt eine oder mehrere Dateien zu einem Ticket hoch.

**Content-Type:** `multipart/form-data`

**Form-Feld:** `files` (multiple)

**Erlaubte Dateitypen:**
- PDF (`application/pdf`)
- Bilder (JPEG, PNG, GIF, WebP)
- Textdateien
- Word-Dokumente (`.doc`, `.docx`)
- Excel-Dateien (`.xls`, `.xlsx`)

**Maximale Dateigröße:** 10 MB (konfigurierbar via `MAX_FILE_SIZE`)

**Response:** `201 Created` mit Array der erstellten Attachment-Objekte.

---

### DELETE /tickets/:id/attachments/:attachmentId

Löscht einen Anhang (DB-Eintrag und Datei auf der Festplatte).

**Response:** `200 OK`

---

### GET /assets

Gibt eine Liste von Assets aus der Shelf API zurück.

```json
{
  "configured": true,
  "assets": [
    { "id": "shelf-123", "name": "Router XYZ", "type": "Network Equipment" }
  ]
}
```

Wenn keine Shelf API konfiguriert ist, wird `{ "configured": false, "assets": [] }` zurückgegeben (kein Fehler).

---

### GET /assets/:id

Gibt Details zu einem einzelnen Shelf Asset zurück.

---

## 4. Backend – Datei-Upload

Uploads werden via **Multer** verwaltet:

- Dateien werden in `backend/uploads/` gespeichert (konfigurierbar via `UPLOAD_DIR`)
- Jede Datei bekommt einen **UUID-basierten Dateinamen** (z.B. `550e8400-e29b-41d4-a716-446655440000.pdf`)
- Der **originale Dateiname** wird in der Datenbank gespeichert und dem Nutzer angezeigt
- Statische Dateiauslieferung über `/uploads/:filename`

### Dateien abrufen

Nach dem Upload ist eine Datei erreichbar unter:

```
http://localhost:3001/uploads/{stored_name}
```

### Konfiguration

```env
UPLOAD_DIR=./uploads       # Verzeichnis für Uploads
MAX_FILE_SIZE=10485760     # 10 MB in Bytes
```

---

## 5. Shelf API Integration

[Shelf.nu](https://shelf.nu) ist ein Asset-Management-System. Das Backend proxied Shelf-API-Anfragen, damit der API-Token nicht im Browser exponiert wird.

### Einrichtung

1. Registrierung auf [app.shelf.nu](https://app.shelf.nu)
2. **Settings → API → Generate Token**
3. Token in `backend/.env` eintragen:

```env
SHELF_API_TOKEN=sh_live_xxx...
SHELF_API_BASE_URL=https://api.shelf.nu
```

### Funktionsweise

Wenn du im Frontend ein Ticket erstellst oder bearbeitest:

1. Frontend ruft `GET /assets` auf (Backend-Proxy)
2. Backend leitet die Anfrage an `https://api.shelf.nu/assets` weiter
3. Asset-Liste wird als Dropdown angezeigt
4. Bei Auswahl wird `asset_id` und `asset_name` im Ticket gespeichert

### Ohne Shelf API

Wenn kein Token konfiguriert ist, wird das Asset-Feld als einfaches Textfeld angezeigt. Alle anderen Funktionen arbeiten normal.

---

## 6. Frontend – Komponenten

### `src/pages/Dashboard.jsx`

Die Hauptseite der Anwendung. Verantwortlich für:

- **Stats-Übersicht:** Gesamtanzahl, offene Tickets, ausstehende Bestellungen, erledigte Tickets
- **Filter-Bar:** Freitextsuche, Status-Filter, Prioritäts-Filter
- **Ticket-Tabelle:** Liste aller gefilterten Tickets mit Schnell-Actions
- **Modals:** Öffnet `TicketForm` (neu erstellen) und `TicketDetail` (Details anzeigen)

**State:**
- `tickets` – Array aller geladenen Tickets
- `filters` – Aktuell angewendete Filter
- `showCreate` – Boolean für Formular-Modal
- `selectedId` – ID des ausgewählten Tickets für Detail-Modal

---

### `src/components/TicketForm.jsx`

Modal-Formular für Erstellen und Bearbeiten von Tickets. 

**Props:**
- `ticket` – `null` für neues Ticket, Ticket-Objekt für Bearbeitung
- `onSave(ticket)` – Callback nach erfolgreichem Speichern
- `onClose()` – Callback zum Schließen

**Felder:**
- Titel (Pflichtfeld)
- Beschreibung (Textarea)
- Status (Select-Dropdown)
- Priorität (Select-Dropdown)
- Asset (Shelf-Dropdown oder manuelles Textfeld)
- Asset Name (optional, auto-fill aus Shelf)
- Notizen (Textarea)
- Materialien (dynamische Liste mit Bestellungs-/Einbau-Checkboxen)

---

### `src/components/TicketDetail.jsx`

Detail-Modal für ein geöffnetes Ticket. Zeigt:

- Alle Ticket-Metadaten
- Beschreibung und Notizen
- Materialien mit Checkboxen (sofortiges Speichern bei Änderung)
- Anhänge mit Download-Links und Lösch-Button
- Datei-Upload (mehrdeutige Dateien, max. 10 pro Upload)
- Schnell-Status-Änderung (Buttons für jeden Status)
- Änderungsverlauf (History)

**Inline bearbeitbar:** Status und Materialien können direkt im Detail-Modal geändert werden. Vollständige Bearbeitung über den „Bearbeiten"-Button (öffnet `TicketForm`).

---

### `src/components/MaterialsList.jsx`

Wiederverwendbare Materialliste.

**Props:**
- `materials` – Array von Material-Objekten
- `onChange(materials)` – Callback bei Checkbox-Änderung (optional; ohne Prop ist die Liste read-only)

**Strikeline:** Ein Material mit `installed: true` wird mit Durchstreichung dargestellt.

---

### `src/components/StatusBadge.jsx`

Einfache Komponente zur Anzeige eines farbigen Status- oder Prioritäts-Badge.

```jsx
<StatusBadge value="hoch" />     // rotes Badge
<StatusBadge value="fertig" />   // grünes Badge
```

---

### `src/services/api.js`

Zentrale API-Schicht. Alle HTTP-Requests laufen durch dieses Modul.

**Wichtig:** Die Backend-URL wird aus `VITE_API_URL` gelesen (Default: `http://localhost:3001`).

```js
import { ticketsApi, assetsApi } from '../services/api';

// Alle Tickets laden
const tickets = await ticketsApi.list({ status: 'geplant', priority: 'hoch' });

// Neues Ticket erstellen
const ticket = await ticketsApi.create({ title: 'Neuer Switch', priority: 'hoch' });

// Status ändern
const updated = await ticketsApi.update(1, { status: 'bestellt' });

// Datei hochladen
const formData = new FormData();
formData.append('files', file);
await ticketsApi.uploadAttachments(1, formData);
```

---

## 7. Frontend – API-Service

### Fehlerbehandlung

Alle API-Methoden werfen einen `Error` mit der Fehlermeldung aus dem Backend, wenn der HTTP-Statuscode nicht 2xx ist. Beispiel:

```js
try {
  const ticket = await ticketsApi.create({ title: '' });
} catch (err) {
  console.error(err.message); // "Title is required"
}
```

### Base URL

```js
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

Für Produktion in `frontend/.env.local` anpassen:

```env
VITE_API_URL=http://192.168.1.100:3001
```

---

## 8. Konfiguration & Umgebungsvariablen

### Backend (`backend/.env`)

```env
# Server
PORT=3001

# Shelf API
SHELF_API_TOKEN=your_token_here
SHELF_API_BASE_URL=https://api.shelf.nu

# Datenbank (Pfad relativ zum backend/-Verzeichnis)
DB_PATH=./data/tickets.db

# Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760   # 10 MB

# CORS
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env.local`)

```env
VITE_API_URL=http://localhost:3001
```

---

## 9. Deployment auf Raspberry Pi / Proxmox

### Voraussetzungen

```bash
# Node.js 18+ installieren (auf Debian/Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Backend als Service (systemd)

Erstelle `/etc/systemd/system/it-management.service`:

```ini
[Unit]
Description=IT Management Backend
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/it-management/backend
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/home/pi/it-management/backend/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable it-management
sudo systemctl start it-management
sudo systemctl status it-management
```

### Frontend bauen und als statische Dateien ausliefern

```bash
cd frontend
npm run build       # erstellt frontend/dist/

# Option A: Nginx als Reverse Proxy
# Option B: Backend liefert den dist-Ordner aus (statische Dateien)
```

#### Option B: Backend liefert Frontend mit aus

In `backend/src/server.js` folgendes hinzufügen:

```js
const path = require('path');

// Nach den Route-Registrierungen:
const distPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});
```

Dann reicht ein einziger Port (3001) für alles.

#### Option A: Nginx Konfiguration

```nginx
server {
    listen 80;
    server_name it-mgmt.local;

    # Frontend (statische Dateien)
    root /home/pi/it-management/frontend/dist;
    index index.html;

    # SPA: alle Routen auf index.html umleiten
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

> Wenn du Nginx als Proxy verwendest, musst du `VITE_API_URL=/api` im Frontend setzen und `FRONTEND_URL=http://it-mgmt.local` im Backend.

### Backup

```bash
# Datenbank sichern (einfach die Datei kopieren)
cp /home/pi/it-management/backend/data/tickets.db /backup/tickets_$(date +%Y%m%d).db

# Uploads sichern
tar -czf /backup/uploads_$(date +%Y%m%d).tar.gz /home/pi/it-management/backend/uploads/

# Cronjob für tägliches Backup
crontab -e
# Füge hinzu:
# 0 3 * * * cp /home/pi/it-management/backend/data/tickets.db /backup/tickets_$(date +\%Y\%m\%d).db
```

---

## 10. Neue Features hinzufügen

### Neues Ticket-Feld hinzufügen (Beispiel: `due_date`)

**1. Datenbank-Schema erweitern** (`backend/src/db/database.js`):

```sql
CREATE TABLE IF NOT EXISTS tickets (
  ...
  due_date TEXT,   -- Fälligkeitsdatum (ISO-8601)
  ...
);
```

Da `better-sqlite3` kein Migrations-Framework verwendet, musst du für bestehende Datenbanken manuell migrieren:

```bash
sqlite3 backend/data/tickets.db "ALTER TABLE tickets ADD COLUMN due_date TEXT;"
```

**2. Backend-Route anpassen** (`backend/src/routes/tickets.js`):

In `POST /tickets` und `PUT /tickets/:id` das neue Feld aus `req.body` lesen und in das SQL-Statement aufnehmen.

**3. Frontend-Formular erweitern** (`frontend/src/components/TicketForm.jsx`):

```jsx
<div className="form-group">
  <label className="form-label">Fälligkeitsdatum</label>
  <input
    type="date"
    className="form-input"
    value={form.due_date || ''}
    onChange={e => set('due_date', e.target.value)}
  />
</div>
```

**4. Dashboard-Tabelle** (`frontend/src/pages/Dashboard.jsx`):

Neue Spalte in der Tabelle hinzufügen.

---

### Neuen API-Endpunkt hinzufügen

Erstelle eine neue Datei in `backend/src/routes/` und registriere sie in `server.js`:

```js
const newRoutes = require('./routes/newFeature');
app.use('/new-feature', newRoutes);
```

---

### Authentifizierung hinzufügen (optional)

Das System ist für den Einzelnutzer konzipiert und hat keine Authentifizierung. Für einfache Absicherung im lokalen Netz:

**Basic Auth Middleware:**

```bash
cd backend && npm install express-basic-auth
```

```js
const basicAuth = require('express-basic-auth');

app.use(basicAuth({
  users: { 'admin': 'deinpasswort' },
  challenge: true
}));
```

---

### QR-Code Integration (optional)

Für jeden Asset-ID kannst du einen QR-Code generieren, der beim Scannen das Ticket öffnet:

```bash
cd frontend && npm install qrcode.react
```

```jsx
import QRCode from 'qrcode.react';

// Im TicketDetail:
<QRCode value={`http://it-mgmt.local/?ticket=${ticket.id}`} size={128} />
```

---

## 11. Sicherheitshinweise

- **Kein Passwortschutz** – das System ist für lokale Nutzung im Heimnetzwerk gedacht. Nicht ohne Authentifizierung ins Internet exponieren.
- **CORS** – nur die konfigurierte Frontend-URL darf Anfragen senden (s. `FRONTEND_URL`).
- **Datei-Uploads** – erlaubte MIME-Typen sind eingeschränkt. Ausführbare Dateien werden abgelehnt.
- **Dateinamen** – auf Disk werden UUID-basierte Namen verwendet (kein Path Traversal möglich).
- **SQLite-Injection** – alle Datenbankzugriffe nutzen Prepared Statements (kein SQL Injection möglich).
- **Shelf API Token** – wird nur server-seitig verwendet, nie an den Browser gesendet.

---

## 12. Events-Modul

### Überblick

Das Events-Modul erweitert das System um DJ-Bookings und Technik-Events. Events sind ähnlich wie Tickets, haben aber spezielle Felder für Veranstaltungsmanagement.

### Unterschiede: Tickets vs Events

| Merkmal             | Tickets (IT)                              | Events (DJ/Technik)                        |
|---------------------|-------------------------------------------|--------------------------------------------|
| Zweck               | IT-Projekte, Infrastruktur-Aufgaben       | DJ-Bookings, Technik-Events, Netzwerk-Setup |
| Status-Flow         | geplant → bestellt → installiert → fertig | angefragt → bestätigt → vorbereitet → durchgeführt → abgeschlossen |
| Priorität           | hoch / mittel / niedrig                   | –                                          |
| Materialien         | Strukturierte Liste mit Checkboxen        | Freitext `materials_needed`                |
| Equipment           | Asset-IDs aus Shelf                       | Equipment-Liste mit Reservierungsstatus    |
| Finanzen            | –                                         | `price_estimate` + `payment_status`        |
| Datum/Uhrzeit       | –                                         | `event_date`, `start_time`, `end_time`     |
| Kunde               | –                                         | `client_name`, `client_contact`            |

### Datenbankstruktur Events

```sql
-- Haupt-Event-Tabelle
events (
  id, title, event_type, client_name, client_contact,
  location, event_date, start_time, end_time,
  materials_needed, price_estimate, payment_status,
  status, notes, created_at, updated_at
)

-- Equipment-Liste für ein Event
event_equipment (
  id, event_id, asset_id, asset_name, reserved
)

-- Änderungshistorie
event_history (
  id, event_id, action, detail, changed_at
)
```

### API-Endpunkte Events

| Method | Endpoint                               | Beschreibung                          |
|--------|----------------------------------------|---------------------------------------|
| GET    | `/events`                              | Alle Events (Filter: status, event_type, date_from, date_to, search) |
| GET    | `/events/upcoming`                     | Nächste 10 bevorstehende Events       |
| GET    | `/events/:id`                          | Event mit Equipment, Anhängen, Verlauf |
| POST   | `/events`                              | Neues Event anlegen                   |
| PUT    | `/events/:id`                          | Event aktualisieren                   |
| DELETE | `/events/:id`                          | Event löschen                         |
| GET    | `/events/:id/history`                  | Änderungsverlauf                      |
| POST   | `/events/:id/equipment`                | Equipment-Item hinzufügen             |
| PUT    | `/events/:id/equipment/:eqId`          | Equipment aktualisieren (z.B. reserviert) |
| DELETE | `/events/:id/equipment/:eqId`          | Equipment-Item entfernen              |
| POST   | `/events/:id/attachments`              | Dateien anhängen (Vertrag, Setlist)   |
| DELETE | `/events/:id/attachments/:attId`       | Anhang löschen                        |

### Workflow-Beispiel: DJ-Event mit CDJs + Mixer + PA

```json
POST /events
{
  "title": "Techno Night Club Berlin",
  "event_type": "DJ",
  "client_name": "Club XYZ",
  "client_contact": "0171-9876543",
  "location": "Club Berlin, Mitte",
  "event_date": "2026-03-15",
  "start_time": "22:00",
  "end_time": "06:00",
  "price_estimate": 1800,
  "payment_status": "angezahlt",
  "status": "bestätigt",
  "equipment": [
    { "asset_name": "Pioneer CDJ-3000 (x2)", "reserved": true },
    { "asset_name": "DJM-900NXS2",           "reserved": true },
    { "asset_name": "PA-System 2kW",          "reserved": false }
  ]
}
```

Status-Änderung wenn Event beginnt:
```bash
PUT /events/1
{ "status": "durchgeführt" }
```

Zahlung bestätigen:
```bash
PUT /events/1
{ "payment_status": "bezahlt" }
```

### Workflow-Beispiel: Technik-Event (Netzwerk-Setup)

```json
POST /events
{
  "title": "Netzwerk-Aufbau Bürogebäude",
  "event_type": "Netzwerk-Setup",
  "client_name": "Firma AG",
  "location": "Bürogebäude Spandau",
  "event_date": "2026-04-01",
  "price_estimate": 600,
  "payment_status": "offen",
  "status": "angefragt",
  "materials_needed": "Patchkabel Cat6 (10x), Keystone-Module, Beschriftungsband",
  "equipment": [
    { "asset_name": "UniFi UDM SE",       "reserved": false },
    { "asset_name": "USW-24-POE",         "reserved": false },
    { "asset_name": "Patchpanel 24-Port", "reserved": false }
  ]
}
```

### Shelf API Integration für Equipment

Wenn `SHELF_API_TOKEN` konfiguriert ist, zeigt das EventForm-Modal ein Dropdown mit allen Shelf-Assets:

1. User öffnet „Neues Event"
2. Klickt „+ Equipment hinzufügen"
3. Wählt aus Shelf-Dropdown z.B. „CDJ-3000 #2" (mit Asset-ID)
4. Die `asset_id` wird in `event_equipment` gespeichert
5. Zukünftig kann man prüfen: Welche Shelf-Assets sind für welche Events reserviert?

### Zahlungsmodul (zukünftige Erweiterung)

Das `price_estimate` + `payment_status` Feld ist bewusst einfach gehalten. Für ein vollständiges Rechnungsmodul:

```sql
-- Zukünftige invoices-Tabelle
CREATE TABLE invoices (
  id          INTEGER PRIMARY KEY,
  event_id    INTEGER REFERENCES events(id),
  invoice_nr  TEXT,
  amount_net  REAL,
  tax_rate    REAL DEFAULT 19.0,
  amount_gross REAL,
  issued_date TEXT,
  due_date    TEXT,
  paid_date   TEXT,
  pdf_path    TEXT    -- gespeicherte PDF-Datei
);
```

---

## 13. Netzwerk-Modul

### Überblick

Das Netzwerk-Modul ermöglicht die Dokumentation und Visualisierung der gesamten Netzwerk-Infrastruktur: Geräte, Ports, Verbindungen und Racks.

### Datenbankstruktur Netzwerk

```sql
-- Rack-Einheiten (Serverschrank)
racks (
  id, name, location, size_u, notes,
  created_at, updated_at
)

-- Netzwerkgeräte
network_devices (
  id, name, device_type, manufacturer, model,
  asset_id, ip_address, mac_address, location,
  rack_id, rack_position,
  pos_x, pos_y,          -- Canvas-Position für Topologie-Ansicht
  notes, created_at, updated_at
)

-- Ports auf einem Gerät
ports (
  id, device_id, port_number, port_label,
  connected_to_device_id,  -- logische Verbindung zu anderem Gerät
  connected_to_port_id,    -- spezifischer Port am Zielgerät
  vlan, poe_enabled, poe_consumption,
  speed, status, notes
)
```

### Beziehungen zwischen Geräten und Ports

```
network_devices (1)
    ↓ has many
  ports (N)
    ↓ connected_to_device_id references
  network_devices (1)
    ↓ connected_to_port_id references
  ports (1)
```

Eine Verbindung wird durch `connected_to_device_id` auf einem Port modelliert (optional auch `connected_to_port_id` für den genauen Ziel-Port). Die Topologie-Ansicht dedupliziert Verbindungen automatisch (A→B = B→A).

### API-Endpunkte Netzwerk

| Method | Endpoint                                  | Beschreibung                             |
|--------|-------------------------------------------|------------------------------------------|
| GET    | `/network/topology`                       | Nodes + Edges für React Flow             |
| GET    | `/network/racks`                          | Alle Racks                               |
| POST   | `/network/racks`                          | Rack anlegen                             |
| PUT    | `/network/racks/:id`                      | Rack aktualisieren                       |
| DELETE | `/network/racks/:id`                      | Rack löschen                             |
| GET    | `/network/devices`                        | Alle Geräte (mit Port-Anzahl)            |
| GET    | `/network/devices/:id`                    | Gerät mit allen Ports                    |
| POST   | `/network/devices`                        | Neues Gerät anlegen                      |
| PUT    | `/network/devices/:id`                    | Gerät aktualisieren (inkl. Canvas-Pos.)  |
| DELETE | `/network/devices/:id`                    | Gerät löschen (Ports kaskadiert)         |
| GET    | `/network/devices/:id/ports`              | Ports eines Geräts                       |
| POST   | `/network/devices/:id/ports`              | Port hinzufügen                          |
| PUT    | `/network/devices/:id/ports/:pid`         | Port aktualisieren (VLAN, PoE, Status)   |
| DELETE | `/network/devices/:id/ports/:pid`         | Port löschen                             |

### Beispiel: UniFi Setup (UDM + 24-Port Switch + 3 APs)

```bash
# 1. UDM SE anlegen
POST /network/devices
{
  "name": "UDM SE",
  "device_type": "Router",
  "manufacturer": "UniFi",
  "model": "UDM-SE",
  "ip_address": "192.168.1.1",
  "location": "Serverraum EG",
  "pos_x": 100, "pos_y": 200
}

# 2. Core-Switch
POST /network/devices
{
  "name": "Core Switch 24P",
  "device_type": "Switch",
  "model": "USW-24-POE",
  "ip_address": "192.168.1.2"
}

# 3. Uplink-Port: UDM → Switch (Port 1, 10G)
POST /network/devices/1/ports
{
  "port_number": 1,
  "port_label": "Uplink → Core Switch",
  "speed": "10G",
  "status": "aktiv",
  "connected_to_device_id": 2
}

# 4. Access Points mit PoE
POST /network/devices/2/ports
{
  "port_number": 1,
  "port_label": "AP Büro 1.OG",
  "speed": "1G",
  "poe_enabled": true,
  "vlan": "10",
  "connected_to_device_id": 3
}
```

### Beispiel: VLAN-Struktur für Event

```bash
# Temporäre Ports für Event-VLAN dokumentieren
PUT /network/devices/2/ports/5
{
  "vlan": "100",
  "port_label": "Event DJ-Setup",
  "status": "reserviert",
  "notes": "Techno Night 2026-03-15, VLAN 100 nur für Event-Dauer"
}
```

Nach dem Event:
```bash
PUT /network/devices/2/ports/5
{ "vlan": null, "status": "inaktiv", "port_label": null }
```

### Topologie-Visualisierung (React Flow)

Der Endpunkt `GET /network/topology` liefert:
```json
{
  "nodes": [
    {
      "id": "1",
      "type": "networkDevice",
      "position": { "x": 100, "y": 200 },
      "data": { "label": "UDM SE", "device_type": "Router", "ip_address": "192.168.1.1", "portCount": 4, "activePorts": 3 }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "1",
      "target": "2",
      "label": "Uplink → Core Switch",
      "data": { "speed": "10G", "vlan": null }
    }
  ]
}
```

Das Frontend rendert diese Daten mit `@xyflow/react` als interaktiven Graph:
- **Drag & Drop** zum Positionieren der Geräte (Position wird per `PUT /devices/:id` gespeichert)
- **Klick auf Node** öffnet den Port-Manager für dieses Gerät
- **Zoom & Pan** für große Topologien
- **MiniMap** für die Übersicht

### Neue Gerätetypen hinzufügen

1. In `backend/src/db/database.js` die CHECK-Constraint erweitern:
   ```sql
   CHECK(device_type IN ('Router','Switch','Access Point','Patchpanel','Firewall','Server','Sonstiges','NAS'))
   ```

2. In `frontend/src/components/NetworkTopology.jsx` ein Icon hinzufügen:
   ```js
   const ICONS = {
     'NAS': '💾',
     // ...existing entries
   };
   ```

3. In `frontend/src/components/NetworkDeviceForm.jsx` den `DEVICE_TYPES`-Array erweitern:
   ```js
   const DEVICE_TYPES = [..., 'NAS'];
   ```

4. In `frontend/src/index.css` eine Badge-Farbe hinzufügen:
   ```css
   .badge-NAS { background: #fce7f3; color: #be185d; }
   ```

### Zukunftsideen

- **SNMP Monitoring** – Echtzeit-Status via `snmp-native` Library abfragen
- **Live Status Integration** – Ping/HTTP-Check alle 60s, Status-LED grün/rot
- **Auto-Import aus UniFi API** – Geräte automatisch aus UniFi Controller importieren
- **Export als PNG / PDF** – React Flow `toObject()` + html2canvas / jsPDF
- **Netzwerk-Diagram als SVG** – für Dokumentations-Exports
- **Alarme** – Email/Pushover wenn Gerät offline geht

---

*Letzte Aktualisierung: 2026*
