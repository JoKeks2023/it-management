// src/routes/projects.js
// REST API endpoints for the Projects module.
//
// Endpoints:
//   GET    /projects                      – list all projects (optional filters)
//   GET    /projects/:id                  – get one project with media
//   POST   /projects                      – create a new project
//   PUT    /projects/:id                  – update a project
//   DELETE /projects/:id                  – delete a project
//   POST   /projects/:id/media            – upload media files
//   DELETE /projects/:id/media/:mediaId   – remove a media file
//   POST   /projects/:id/generate-invoice – generate PDF invoice, return URL
//   POST   /projects/:id/generate-clientsite – generate client mini-site HTML

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db/database');
const upload = require('../middleware/upload');

// Upload directory for generated files
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', '..', 'uploads');

// Public base URL for generated assets
const publicBase = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.replace(':5173', ':3001')
  : 'http://localhost:3001';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Load a full project record with its media attachments. */
function loadFullProject(id) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!project) return null;

  project.media = db.prepare(
    'SELECT * FROM project_media WHERE project_id = ? ORDER BY uploaded_at DESC'
  ).all(id);

  // Attach template info if linked
  if (project.template_id) {
    project.template = db.prepare(
      'SELECT id, name, category, checklist, equipment FROM templates WHERE id = ?'
    ).get(project.template_id) || null;
  }

  return project;
}

// ---------------------------------------------------------------------------
// GET /projects
// Query params: status, project_type, search
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  try {
    let sql = 'SELECT * FROM projects WHERE 1=1';
    const params = [];

    if (req.query.status) {
      sql += ' AND status = ?';
      params.push(req.query.status);
    }
    if (req.query.project_type) {
      sql += ' AND project_type = ?';
      params.push(req.query.project_type);
    }
    if (req.query.search) {
      sql += ' AND (title LIKE ? OR client_name LIKE ? OR location LIKE ?)';
      const term = `%${req.query.search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY created_at DESC';
    const projects = db.prepare(sql).all(...params);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /projects/:id
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  try {
    const project = loadFullProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /projects
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const {
      title, description, project_type, template_id, client_name,
      client_contact, location, start_date, end_date, status,
      price_estimate, notes
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const result = db.prepare(`
      INSERT INTO projects
        (title, description, project_type, template_id, client_name,
         client_contact, location, start_date, end_date, status,
         price_estimate, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      description || null,
      project_type || 'event',
      template_id || null,
      client_name || null,
      client_contact || null,
      location || null,
      start_date || null,
      end_date || null,
      status || 'planning',
      price_estimate != null ? Number(price_estimate) : null,
      notes || null
    );

    const project = loadFullProject(result.lastInsertRowid);
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /projects/:id
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    const fields = [
      'title', 'description', 'project_type', 'template_id', 'client_name',
      'client_contact', 'location', 'start_date', 'end_date', 'status',
      'invoice_status', 'price_estimate', 'notes'
    ];

    const sets = [];
    const params = [];

    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        sets.push(`${f} = ?`);
        params.push(req.body[f]);
      }
    });

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    sets.push("updated_at = datetime('now')");
    params.push(req.params.id);

    db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...params);

    res.json(loadFullProject(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /projects/:id
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /projects/:id/media – upload media files
// ---------------------------------------------------------------------------
router.post('/:id/media', upload.array('files', 10), (req, res) => {
  try {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const inserted = req.files.map(file => {
      const result = db.prepare(`
        INSERT INTO project_media (project_id, filename, stored_name, mime_type, size)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.params.id, file.originalname, file.filename, file.mimetype, file.size);

      return {
        id: result.lastInsertRowid,
        project_id: Number(req.params.id),
        filename: file.originalname,
        stored_name: file.filename,
        mime_type: file.mimetype,
        size: file.size
      };
    });

    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /projects/:id/media/:mediaId
// ---------------------------------------------------------------------------
router.delete('/:id/media/:mediaId', (req, res) => {
  try {
    const media = db.prepare(
      'SELECT * FROM project_media WHERE id = ? AND project_id = ?'
    ).get(req.params.mediaId, req.params.id);

    if (!media) return res.status(404).json({ error: 'Media not found' });

    // Remove file from disk
    const filePath = path.join(uploadDir, media.stored_name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    db.prepare('DELETE FROM project_media WHERE id = ?').run(req.params.mediaId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /projects/:id/generate-invoice
// Generates a PDF invoice and returns a download URL.
// ---------------------------------------------------------------------------
router.post('/:id/generate-invoice', (req, res) => {
  try {
    const project = loadFullProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const PDFDocument = require('pdfkit');
    const filename = `invoice-${project.id}-${crypto.randomUUID()}.pdf`;
    const filePath = path.join(uploadDir, filename);

    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(22).font('Helvetica-Bold').text('RECHNUNG / INVOICE', 50, 50);
    doc.moveDown();

    // Project info
    doc.fontSize(12).font('Helvetica');
    doc.text(`Projekt: ${project.title}`);
    doc.text(`Kunde:   ${project.client_name || '-'}`);
    doc.text(`Datum:   ${new Date().toLocaleDateString('de-DE')}`);
    if (project.start_date) doc.text(`Zeitraum: ${project.start_date}${project.end_date ? ' – ' + project.end_date : ''}`);
    if (project.location)   doc.text(`Ort: ${project.location}`);

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Line items
    doc.font('Helvetica-Bold').text('Beschreibung', 50, doc.y, { width: 300 });
    doc.text('Betrag', 400, doc.y - doc.currentLineHeight(), { width: 150, align: 'right' });
    doc.font('Helvetica').moveDown();

    const lineItems = req.body.items || [];
    let subtotal = 0;

    if (lineItems.length > 0) {
      lineItems.forEach(item => {
        const amount = Number(item.amount) || 0;
        subtotal += amount;
        doc.text(item.description || 'Dienstleistung', 50, doc.y, { width: 300 });
        doc.text(`€ ${amount.toFixed(2)}`, 400, doc.y - doc.currentLineHeight(), { width: 150, align: 'right' });
        doc.moveDown(0.5);
      });
    } else {
      const amount = project.price_estimate || 0;
      subtotal = amount;
      doc.text(project.description || 'Dienstleistung / Service', 50, doc.y, { width: 300 });
      doc.text(`€ ${amount.toFixed(2)}`, 400, doc.y - doc.currentLineHeight(), { width: 150, align: 'right' });
      doc.moveDown();
    }

    // Totals
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    const taxRate = Number(req.body.tax_rate) || 19;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    doc.font('Helvetica').text(`Netto:`, 350, doc.y, { width: 100 });
    doc.text(`€ ${subtotal.toFixed(2)}`, 450, doc.y - doc.currentLineHeight(), { width: 100, align: 'right' });
    doc.moveDown(0.5);
    doc.text(`MwSt. (${taxRate}%):`, 350, doc.y, { width: 100 });
    doc.text(`€ ${taxAmount.toFixed(2)}`, 450, doc.y - doc.currentLineHeight(), { width: 100, align: 'right' });
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text(`Gesamt:`, 350, doc.y, { width: 100 });
    doc.text(`€ ${total.toFixed(2)}`, 450, doc.y - doc.currentLineHeight(), { width: 100, align: 'right' });

    if (project.notes) {
      doc.moveDown(2).font('Helvetica').fontSize(10).text(`Notizen: ${project.notes}`);
    }

    doc.end();

    stream.on('finish', () => {
      // Update project record
      db.prepare(`
        UPDATE projects
        SET invoice_path = ?, invoice_status = 'draft', updated_at = datetime('now')
        WHERE id = ?
      `).run(filename, project.id);

      res.json({
        success: true,
        filename,
        url: `${publicBase}/uploads/${filename}`,
        total: total.toFixed(2)
      });
    });

    stream.on('error', err => {
      res.status(500).json({ error: 'PDF generation failed: ' + err.message });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /projects/:id/generate-clientsite
// Generates a static HTML client mini-site and returns a token URL.
// ---------------------------------------------------------------------------
router.post('/:id/generate-clientsite', (req, res) => {
  try {
    const project = loadFullProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const token = crypto.randomUUID();
    const filename = `clientsite-${project.id}-${token}.html`;
    const clientsiteDir = path.join(uploadDir, 'clientsites');

    if (!fs.existsSync(clientsiteDir)) {
      fs.mkdirSync(clientsiteDir, { recursive: true });
    }

    // Build gallery HTML from project media
    const mediaHtml = (project.media || [])
      .filter(m => m.mime_type && m.mime_type.startsWith('image/'))
      .map(m => `
        <div class="gallery-item">
          <img src="${publicBase}/uploads/${m.stored_name}" alt="${m.filename}" loading="lazy" />
        </div>`)
      .join('\n');

    const invoiceLink = project.invoice_path
      ? `<p><a href="${publicBase}/uploads/${project.invoice_path}" target="_blank" class="btn">📄 Rechnung herunterladen</a></p>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${project.title} – Projekt-Seite</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #111; color: #eee; }
    header { background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 40px 20px; text-align: center; }
    header h1 { font-size: 2.2rem; color: #00d4ff; margin-bottom: 8px; }
    header p { color: #aaa; font-size: 1rem; }
    .container { max-width: 900px; margin: 0 auto; padding: 30px 20px; }
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 24px 0; }
    .info-card { background: #1a1a2e; border-radius: 8px; padding: 16px; border: 1px solid #333; }
    .info-card label { color: #888; font-size: 0.8rem; text-transform: uppercase; }
    .info-card p { color: #fff; margin-top: 4px; font-size: 1rem; }
    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin: 24px 0; }
    .gallery-item img { width: 100%; border-radius: 6px; object-fit: cover; height: 160px; }
    .btn { display: inline-block; background: #00d4ff; color: #111; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 8px 0; }
    .feedback-form { background: #1a1a2e; border-radius: 8px; padding: 24px; border: 1px solid #333; margin-top: 24px; }
    .feedback-form h3 { color: #00d4ff; margin-bottom: 16px; }
    .feedback-form textarea { width: 100%; background: #111; color: #eee; border: 1px solid #333; border-radius: 4px; padding: 10px; height: 100px; }
    .feedback-form input { width: 100%; background: #111; color: #eee; border: 1px solid #333; border-radius: 4px; padding: 10px; margin-bottom: 12px; }
    footer { text-align: center; padding: 20px; color: #555; font-size: 0.8rem; }
  </style>
</head>
<body>
  <header>
    <h1>${project.title}</h1>
    <p>${project.description || ''}</p>
  </header>
  <div class="container">
    <div class="info-grid">
      ${project.client_name ? `<div class="info-card"><label>Kunde</label><p>${project.client_name}</p></div>` : ''}
      ${project.location ? `<div class="info-card"><label>Ort</label><p>${project.location}</p></div>` : ''}
      ${project.start_date ? `<div class="info-card"><label>Datum</label><p>${project.start_date}${project.end_date ? ' – ' + project.end_date : ''}</p></div>` : ''}
      <div class="info-card"><label>Status</label><p>${project.status}</p></div>
    </div>

    ${mediaHtml ? `<h2>Galerie</h2><div class="gallery">${mediaHtml}</div>` : ''}

    ${invoiceLink}

    <div class="feedback-form">
      <h3>💬 Feedback</h3>
      <form id="feedbackForm">
        <input type="text" id="fbName" placeholder="Ihr Name" />
        <textarea id="fbMessage" placeholder="Ihre Nachricht / Bewertung..."></textarea>
        <br /><button type="submit" class="btn">Absenden</button>
      </form>
      <p id="fbSuccess" style="display:none;color:#0f0;margin-top:12px;">✅ Danke für Ihr Feedback!</p>
    </div>
  </div>
  <footer>Erstellt mit IT Management System &bull; Token: ${token}</footer>
  <script>
    document.getElementById('feedbackForm').addEventListener('submit', function(e) {
      e.preventDefault();
      document.getElementById('fbSuccess').style.display = 'block';
      this.style.display = 'none';
    });
  </script>
</body>
</html>`;

    fs.writeFileSync(path.join(clientsiteDir, filename), html, 'utf8');

    // Update project record with token and path
    db.prepare(`
      UPDATE projects
      SET clientsite_token = ?, clientsite_path = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(token, filename, project.id);

    res.json({
      success: true,
      token,
      url: `${publicBase}/clientsite/${token}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /clientsite/:token  (mounted directly on app, not here)
// ---------------------------------------------------------------------------

module.exports = router;
