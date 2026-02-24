// src/__tests__/tickets.test.js
// Integration tests for the /tickets REST API endpoints.
// Uses an in-memory SQLite database for isolation.

process.env.DB_PATH = ':memory:';
process.env.UPLOAD_DIR = '/tmp/it-mgmt-test-uploads';
process.env.SHELF_API_TOKEN = '';

const request = require('supertest');
const app = require('../server');

describe('Tickets API', () => {
  // -------------------------------------------------------------------------
  // POST /tickets – create
  // -------------------------------------------------------------------------
  describe('POST /tickets', () => {
    it('creates a ticket with minimum required fields', async () => {
      const res = await request(app)
        .post('/tickets')
        .send({ title: 'Test ticket' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Test ticket');
      expect(res.body.status).toBe('geplant');
      expect(res.body.priority).toBe('mittel');
      expect(res.body.materials).toEqual([]);
    });

    it('creates a ticket with all fields and materials', async () => {
      const res = await request(app)
        .post('/tickets')
        .send({
          title: 'Router installieren',
          description: 'Neuen Router im Serverraum installieren',
          asset_id: 'shelf-123',
          asset_name: 'Router XYZ',
          status: 'bestellt',
          priority: 'hoch',
          notes: 'Kabelführung beachten',
          materials: [
            { name: 'Kabel Cat6', ordered: true, installed: false },
            { name: 'Router XYZ', ordered: false, installed: false }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Router installieren');
      expect(res.body.asset_id).toBe('shelf-123');
      expect(res.body.status).toBe('bestellt');
      expect(res.body.priority).toBe('hoch');
      expect(res.body.materials).toHaveLength(2);
      expect(res.body.materials[0].name).toBe('Kabel Cat6');
      expect(res.body.materials[0].ordered).toBe(1);
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app).post('/tickets').send({ description: 'No title' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title/i);
    });

    it('returns 400 for invalid status', async () => {
      const res = await request(app)
        .post('/tickets')
        .send({ title: 'Bad status', status: 'invalid' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid priority', async () => {
      const res = await request(app)
        .post('/tickets')
        .send({ title: 'Bad priority', priority: 'ultra' });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /tickets – list
  // -------------------------------------------------------------------------
  describe('GET /tickets', () => {
    let ticketId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/tickets')
        .send({ title: 'Filter test', status: 'fertig', priority: 'niedrig' });
      ticketId = res.body.id;
    });

    it('returns a list of tickets', async () => {
      const res = await request(app).get('/tickets');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('filters by status', async () => {
      const res = await request(app).get('/tickets?status=fertig');
      expect(res.status).toBe(200);
      res.body.forEach(t => expect(t.status).toBe('fertig'));
    });

    it('filters by priority', async () => {
      const res = await request(app).get('/tickets?priority=niedrig');
      expect(res.status).toBe(200);
      res.body.forEach(t => expect(t.priority).toBe('niedrig'));
    });

    it('filters by search term', async () => {
      const res = await request(app).get('/tickets?search=Filter+test');
      expect(res.status).toBe(200);
      expect(res.body.some(t => t.title === 'Filter test')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // GET /tickets/:id – single ticket
  // -------------------------------------------------------------------------
  describe('GET /tickets/:id', () => {
    let ticketId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/tickets')
        .send({ title: 'Detail test', materials: [{ name: 'Switch', ordered: false }] });
      ticketId = res.body.id;
    });

    it('returns a full ticket with materials and attachments', async () => {
      const res = await request(app).get(`/tickets/${ticketId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ticketId);
      expect(res.body.materials).toBeDefined();
      expect(res.body.attachments).toBeDefined();
    });

    it('returns 404 for non-existent ticket', async () => {
      const res = await request(app).get('/tickets/99999');
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // PUT /tickets/:id – update
  // -------------------------------------------------------------------------
  describe('PUT /tickets/:id', () => {
    let ticketId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/tickets')
        .send({ title: 'Update test', status: 'geplant' });
      ticketId = res.body.id;
    });

    it('updates status', async () => {
      const res = await request(app)
        .put(`/tickets/${ticketId}`)
        .send({ status: 'installiert' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('installiert');
    });

    it('updates materials list', async () => {
      const res = await request(app)
        .put(`/tickets/${ticketId}`)
        .send({
          materials: [
            { name: 'New cable', ordered: true, installed: false }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.materials).toHaveLength(1);
      expect(res.body.materials[0].name).toBe('New cable');
    });

    it('returns 404 for non-existent ticket', async () => {
      const res = await request(app).put('/tickets/99999').send({ status: 'fertig' });
      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid status', async () => {
      const res = await request(app)
        .put(`/tickets/${ticketId}`)
        .send({ status: 'broken' });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /tickets/:id/history
  // -------------------------------------------------------------------------
  describe('GET /tickets/:id/history', () => {
    let ticketId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/tickets')
        .send({ title: 'History test' });
      ticketId = res.body.id;
      // Make a change to generate another history entry
      await request(app).put(`/tickets/${ticketId}`).send({ status: 'bestellt' });
    });

    it('returns history entries for a ticket', async () => {
      const res = await request(app).get(`/tickets/${ticketId}/history`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body[0].action).toBeDefined();
    });

    it('returns 404 for non-existent ticket', async () => {
      const res = await request(app).get('/tickets/99999/history');
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /tickets/:id
  // -------------------------------------------------------------------------
  describe('DELETE /tickets/:id', () => {
    it('deletes a ticket', async () => {
      const create = await request(app)
        .post('/tickets')
        .send({ title: 'To be deleted' });
      const id = create.body.id;

      const del = await request(app).delete(`/tickets/${id}`);
      expect(del.status).toBe(200);

      const get = await request(app).get(`/tickets/${id}`);
      expect(get.status).toBe(404);
    });

    it('returns 404 for non-existent ticket', async () => {
      const res = await request(app).delete('/tickets/99999');
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // GET /health
  // -------------------------------------------------------------------------
  describe('GET /health', () => {
    it('returns ok status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
