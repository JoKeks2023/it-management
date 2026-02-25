// Entry point for the IT Management backend server.
// Loads environment variables, registers middleware and routes, then starts listening.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const ticketRoutes      = require('./routes/tickets');
const assetRoutes       = require('./routes/assets');
const eventRoutes       = require('./routes/events');
const networkRoutes     = require('./routes/network');
const portfolioRoutes   = require('./routes/portfolio');
const contactRoutes     = require('./routes/contacts');
const inventoryRoutes   = require('./routes/inventory');
const quotesRoutes      = require('./routes/quotes');
const setsRoutes        = require('./routes/sets');
const reportsRoutes     = require('./routes/reports');
const projectsRoutes    = require('./routes/projects');
const templatesRoutes   = require('./routes/templates');
const maintenanceRoutes = require('./routes/maintenance');
const lightpresetsRoutes = require('./routes/lightpresets');
const setlistsRoutes    = require('./routes/setlists');

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// CORS – allow requests from the React dev server (or same origin in production)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting – generous limits for a single-user local tool,
// but still protects against runaway scripts or accidental loops.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute window
  max: 200,             // max 200 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,              // stricter limit for file uploads
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests, please try again later.' }
});

app.use('/tickets',      apiLimiter);
app.use('/assets',       apiLimiter);
app.use('/events',       apiLimiter);
app.use('/network',      apiLimiter);
app.use('/portfolio',    apiLimiter);
app.use('/contacts',     apiLimiter);
app.use('/inventory',    apiLimiter);
app.use('/quotes',       apiLimiter);
app.use('/sets',         apiLimiter);
app.use('/reports',      apiLimiter);
app.use('/projects',     apiLimiter);
app.use('/templates',    apiLimiter);
app.use('/maintenance',  apiLimiter);
app.use('/lightpresets', apiLimiter);
app.use('/setlists',     apiLimiter);

app.use('/tickets/:id/attachments', uploadLimiter);
app.use('/events/:id/attachments',  uploadLimiter);
app.use('/portfolio/:id/media',     uploadLimiter);

// Serve uploaded files as static assets
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', 'uploads');

app.use('/uploads', express.static(uploadDir));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/tickets',      ticketRoutes);
app.use('/assets',       assetRoutes);
app.use('/events',       eventRoutes);
app.use('/network',      networkRoutes);
app.use('/portfolio',    portfolioRoutes);
app.use('/contacts',     contactRoutes);
app.use('/inventory',    inventoryRoutes);
app.use('/quotes',       quotesRoutes);
app.use('/sets',         setsRoutes);
app.use('/reports',      reportsRoutes);
app.use('/projects',     projectsRoutes);
app.use('/templates',    templatesRoutes);
app.use('/maintenance',  maintenanceRoutes);
app.use('/lightpresets', lightpresetsRoutes);
app.use('/setlists',     setlistsRoutes);

// ---------------------------------------------------------------------------
// Client mini-site endpoint  GET /clientsite/:token
// ---------------------------------------------------------------------------
app.get('/clientsite/:token', (req, res) => {
  const db = require('./db/database');
  const fs = require('fs');
  try {
    const project = db.prepare(
      'SELECT * FROM projects WHERE clientsite_token = ?'
    ).get(req.params.token);

    if (!project || !project.clientsite_path) {
      return res.status(404).send('<h1>Page not found</h1>');
    }

    const csDir = path.join(uploadDir, 'clientsites');
    const htmlPath = path.join(csDir, project.clientsite_path);

    if (!fs.existsSync(htmlPath)) {
      return res.status(404).send('<h1>Page not found</h1>');
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(fs.readFileSync(htmlPath, 'utf8'));
  } catch (err) {
    res.status(500).send('<h1>Server error</h1>');
  }
});
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// 404 catch-all
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start server (only when this file is run directly, not when imported by tests)
// ---------------------------------------------------------------------------
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`IT Management Backend running on http://localhost:${PORT}`);
    console.log(`Shelf API: ${process.env.SHELF_API_TOKEN ? 'configured' : 'NOT configured (set SHELF_API_TOKEN)'}`);

    // Start maintenance cron job
    const { startMaintenanceCron } = require('./cron/maintenanceCron');
    startMaintenanceCron();
  });
}

module.exports = app;