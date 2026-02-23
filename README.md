# IT Management System

Persönliches Ticket- und Asset-Management-System für IT-Projekte und Infrastruktur.

## Stack

| Layer    | Technologie                                      |
|----------|--------------------------------------------------|
| Backend  | Node.js 18+ · Express · SQLite (better-sqlite3)  |
| Frontend | React 19 · Vite                                  |
| Assets   | Shelf API (optional)                             |
| Upload   | Multer (lokale Dateispeicherung)                 |

---

## Schnellstart

### 1. Backend

```bash
cd backend
cp .env.example .env          # Konfiguration anpassen
npm install
npm start                     # Produktionsmodus
# oder
npm run dev                   # Entwicklungsmodus mit auto-reload
```

Backend läuft auf `http://localhost:3001`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local    # optional: VITE_API_URL anpassen
npm install
npm run dev                   # Vite dev server auf http://localhost:5173
```

### 3. Shelf API (optional)

1. [Shelf.nu](https://app.shelf.nu) Konto erstellen
2. Unter **Settings → API** einen Token generieren
3. Token in `backend/.env` als `SHELF_API_TOKEN` eintragen

---

## Projektstruktur

```
it-management/
├── backend/
│   ├── src/
│   │   ├── __tests__/        # Jest-Tests
│   │   ├── db/
│   │   │   └── database.js   # SQLite-Verbindung + Schema-Initialisierung
│   │   ├── middleware/
│   │   │   └── upload.js     # Multer-Konfiguration für Datei-Uploads
│   │   ├── routes/
│   │   │   ├── tickets.js    # REST-Endpunkte für Tickets
│   │   │   └── assets.js     # Proxy für Shelf API
│   │   └── server.js         # Express-App-Einstieg
│   ├── data/                 # SQLite-Datenbankdatei (auto-erstellt)
│   ├── uploads/              # Hochgeladene Dateien
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MaterialsList.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   ├── TicketDetail.jsx
│   │   │   └── TicketForm.jsx
│   │   ├── pages/
│   │   │   └── Dashboard.jsx
│   │   ├── services/
│   │   │   └── api.js        # Zentrale API-Schicht
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
└── docs/
    └── DOCUMENTATION.md      # Ausführliche Entwicklerdokumentation
```

---

## Tests

```bash
cd backend
npm test
```

---

## Deployment (Raspberry Pi / Proxmox)

Siehe [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md) → Abschnitt **Deployment**.

---

## Lizenz

MIT
