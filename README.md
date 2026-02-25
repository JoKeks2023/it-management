<div align="center">

# 🖥️ IT Management System

**Persönliches Ticket-, Event- und Netzwerk-Management für IT-Projekte und Infrastruktur**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-latest-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

</div>

---

## ✨ Features

| Modul | Beschreibung |
|-------|-------------|
| 🎫 **Ticket-System** | IT-Aufgaben planen, verfolgen und abschließen |
| 📦 **Materialverwaltung** | Bestelllisten mit Bestell- und Einbau-Status |
| 📎 **Datei-Anhänge** | PDFs, Bilder, Dokumente direkt am Ticket speichern |
| 🎵 **Events-Modul** | DJ-Bookings & Technik-Events mit Equipment-Verwaltung |
| 🌐 **Netzwerk-Topologie** | Interaktive Netzwerkplan-Visualisierung (React Flow) |
| 🔗 **Shelf API** | Optionale Integration für professionelles Asset-Management |
| 📜 **History** | Lückenloser Änderungsverlauf für jeden Datensatz |

---

## 🏗️ Tech Stack

| Schicht | Technologie |
|---------|-------------|
| 🔙 **Backend** | Node.js 18+ · Express · SQLite (`better-sqlite3`) |
| 🔜 **Frontend** | React 19 · Vite · React Flow (`@xyflow/react`) |
| 📁 **Upload** | Multer – lokale Dateispeicherung mit UUID-Namen |
| 🏷️ **Assets** | Shelf API (optional, für Asset-Management) |

> **Das Projekt besteht aus zwei Teilen:**
> - **`backend/`** – Node.js + Express REST API mit lokaler SQLite-Datenbank
> - **`frontend/`** – React (Vite) Single-Page-App, die mit der Backend-API kommuniziert

---

## 🚀 Schnellstart

### 1️⃣ Backend starten

```bash
cd backend
cp .env.example .env          # Konfiguration anpassen
npm install
npm start                     # Produktionsmodus
# oder
npm run dev                   # Entwicklungsmodus mit auto-reload (nodemon)
```

> Backend läuft auf **`http://localhost:3001`**

### 2️⃣ Frontend starten

```bash
cd frontend
cp .env.example .env.local    # optional: VITE_API_URL anpassen
npm install
npm run dev                   # Vite dev server
```

> Frontend läuft auf **`http://localhost:5173`**

### 3️⃣ Shelf API einrichten (optional)

1. Konto auf [Shelf.nu](https://app.shelf.nu) erstellen
2. Unter **Settings → API** einen Token generieren
3. Token in `backend/.env` als `SHELF_API_TOKEN` eintragen

---

## 📁 Projektstruktur

```
it-management/
├── 📂 backend/
│   ├── src/
│   │   ├── __tests__/        # Jest-Tests
│   │   ├── db/
│   │   │   └── database.js   # SQLite-Verbindung + Schema-Initialisierung
│   │   ├── middleware/
│   │   │   └── upload.js     # Multer-Konfiguration für Datei-Uploads
│   │   ├── routes/
│   │   │   ├── tickets.js    # REST-Endpunkte für Tickets
│   │   │   ├── events.js     # REST-Endpunkte für Events
│   │   │   ├── network.js    # REST-Endpunkte für Netzwerk-Devices
│   │   │   └── assets.js     # Proxy für Shelf API
│   │   └── server.js         # Express-App-Einstieg
│   ├── data/                 # SQLite-Datenbankdatei (auto-erstellt)
│   ├── uploads/              # Hochgeladene Dateien
│   ├── .env.example
│   └── package.json
├── 📂 frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── EventDetail.jsx       # Event-Detailansicht (Modal)
│   │   │   ├── EventForm.jsx         # Event-Formular (erstellen/bearbeiten)
│   │   │   ├── MaterialsList.jsx     # Wiederverwendbare Materialliste
│   │   │   ├── NetworkDeviceForm.jsx # Netzwerkgerät-Formular
│   │   │   ├── NetworkTopology.jsx   # Interaktive Netzwerkplan-Visualisierung
│   │   │   ├── PortManager.jsx       # Port-Verwaltung für Netzwerkgeräte
│   │   │   ├── StatusBadge.jsx       # Farbiges Status/Prioritäts-Badge
│   │   │   ├── TicketDetail.jsx      # Ticket-Detailansicht (Modal)
│   │   │   └── TicketForm.jsx        # Ticket-Formular (erstellen/bearbeiten)
│   │   ├── pages/
│   │   │   └── Dashboard.jsx         # Haupt-Dashboard
│   │   ├── services/
│   │   │   └── api.js                # Zentrale API-Schicht
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
└── 📂 docs/
    └── DOCUMENTATION.md      # Ausführliche Entwicklerdokumentation
```

---

## 🧪 Tests ausführen

```bash
cd backend
npm test
```

Die Tests befinden sich in `backend/src/__tests__/` und verwenden **Jest**.

---

## 🌐 API-Überblick

| Modul | Methode | Endpunkt | Beschreibung |
|-------|---------|----------|-------------|
| 🏥 Health | `GET` | `/health` | Server-Status |
| 🎫 Tickets | `GET` | `/tickets` | Alle Tickets (mit Filtern) |
| 🎫 Tickets | `POST` | `/tickets` | Neues Ticket erstellen |
| 🎫 Tickets | `PUT` | `/tickets/:id` | Ticket aktualisieren |
| 🎫 Tickets | `DELETE` | `/tickets/:id` | Ticket löschen |
| 🎵 Events | `GET` | `/events` | Alle Events |
| 🎵 Events | `GET` | `/events/upcoming` | Nächste 10 Events |
| 🎵 Events | `POST` | `/events` | Neues Event erstellen |
| 🌐 Netzwerk | `GET` | `/network/topology` | Topologie-Daten für React Flow |
| 🌐 Netzwerk | `GET` | `/network/devices` | Alle Netzwerkgeräte |
| 📦 Assets | `GET` | `/assets` | Shelf Assets (falls konfiguriert) |

> 📖 Vollständige API-Dokumentation: [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md)

---

## 🚢 Deployment (Raspberry Pi / Proxmox)

Ausführliche Deployment-Anleitung inkl. systemd-Service, Nginx-Konfiguration und Backup-Strategie: [`docs/DOCUMENTATION.md → Abschnitt 9`](docs/DOCUMENTATION.md#9-deployment-auf-raspberry-pi--proxmox)

**Kurzübersicht:**

```bash
# 1. Backend als systemd-Dienst einrichten
sudo systemctl enable it-management
sudo systemctl start it-management

# 2. Frontend bauen
cd frontend && npm run build   # erstellt frontend/dist/

# 3. Nginx als Reverse Proxy (oder Backend liefert dist/ mit aus)
```

---

## ⚙️ Konfiguration

### Backend (`backend/.env`)

```env
PORT=3001
SHELF_API_TOKEN=your_token_here
DB_PATH=./data/tickets.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760        # 10 MB
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env.local`)

```env
VITE_API_URL=http://localhost:3001
```

---

## 📚 Dokumentation

Die ausführliche Entwicklerdokumentation findest du unter [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md):

- 📐 Systemarchitektur & Datenbankstruktur
- 🔌 Alle API-Endpunkte mit Beispielen
- 🧩 Frontend-Komponenten-Referenz
- 🚢 Deployment-Guide (Raspberry Pi / Proxmox / Nginx)
- 🔒 Sicherheitshinweise
- 🎵 Events-Modul Dokumentation
- 🌐 Netzwerk-Modul Dokumentation

---

## 📜 Lizenz

MIT – Freie Nutzung, Anpassung und Weitergabe erlaubt.
