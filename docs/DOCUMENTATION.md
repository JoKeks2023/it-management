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

*Letzte Aktualisierung: 2026*
