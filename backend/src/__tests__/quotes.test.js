// src/__tests__/quotes.test.js
// Integration tests for the /quotes REST API.

process.env.DB_PATH    = ':memory:';
process.env.UPLOAD_DIR = '/tmp/it-mgmt-test-uploads';
process.env.SHELF_API_TOKEN = '';

const request = require('supertest');
const app = require('../server');

describe('Quotes API', () => {

  describe('POST /quotes', () => {
    it('creates a quote (Angebot) with minimum fields', async () => {
      const res = await request(app).post('/quotes').send({ quote_type: 'Angebot' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.quote_type).toBe('Angebot');
      expect(res.body.status).toBe('Entwurf');
      expect(res.body.quote_number).toMatch(/^AN-/);
    });

    it('creates a Rechnung', async () => {
      const res = await request(app).post('/quotes').send({ quote_type: 'Rechnung' });
      expect(res.status).toBe(201);
      expect(res.body.quote_number).toMatch(/^RE-/);
    });

    it('creates a quote with line items and calculates totals', async () => {
      const res = await request(app).post('/quotes').send({
        quote_type: 'Angebot',
        client_name: 'Test GmbH',
        tax_rate: 19,
        items: [
          { description: 'CDJ-3000 (2 Tage)', quantity: 2, unit_price: 100, unit: 'Tag' },
          { description: 'DJM-900NXS2 (2 Tage)', quantity: 1, unit_price: 80, unit: 'Tag' }
        ]
      });
      expect(res.status).toBe(201);
      expect(res.body.items).toHaveLength(2);
      // subtotal = 2*100 + 1*80 = 280
      expect(res.body.subtotal).toBeCloseTo(280);
      expect(res.body.tax_amount).toBeCloseTo(280 * 0.19);
      expect(res.body.total).toBeCloseTo(280 * 1.19);
    });

    it('returns 400 for invalid quote_type', async () => {
      const res = await request(app).post('/quotes').send({ quote_type: 'Faktura' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /quotes', () => {
    it('returns a list', async () => {
      const res = await request(app).get('/quotes');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('filters by quote_type', async () => {
      const res = await request(app).get('/quotes?quote_type=Rechnung');
      expect(res.status).toBe(200);
      res.body.forEach(q => expect(q.quote_type).toBe('Rechnung'));
    });
  });

  describe('PUT /quotes/:id status update', () => {
    let quoteId;
    beforeAll(async () => {
      const r = await request(app).post('/quotes').send({ quote_type: 'Angebot' });
      quoteId = r.body.id;
    });

    it('updates status to Gesendet', async () => {
      const res = await request(app).put(`/quotes/${quoteId}`).send({ status: 'Gesendet' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Gesendet');
    });

    it('returns 400 for invalid status', async () => {
      const res = await request(app).put(`/quotes/${quoteId}`).send({ status: 'Offen' });
      expect(res.status).toBe(400);
    });
  });

  describe('Quote line items', () => {
    let quoteId;
    beforeAll(async () => {
      const r = await request(app).post('/quotes').send({ quote_type: 'Angebot', tax_rate: 19 });
      quoteId = r.body.id;
    });

    it('adds a line item', async () => {
      const res = await request(app).post(`/quotes/${quoteId}/items`)
        .send({ description: 'Licht-Set', quantity: 1, unit_price: 200 });
      expect(res.status).toBe(201);
      expect(res.body.description).toBe('Licht-Set');
    });

    it('recalculates totals after adding item', async () => {
      const res = await request(app).get(`/quotes/${quoteId}`);
      expect(res.status).toBe(200);
      expect(res.body.subtotal).toBeCloseTo(200);
      expect(res.body.total).toBeCloseTo(200 * 1.19);
    });

    it('updates a line item', async () => {
      const q = await request(app).get(`/quotes/${quoteId}`);
      const itemId = q.body.items[0].id;
      const res = await request(app).put(`/quotes/${quoteId}/items/${itemId}`)
        .send({ unit_price: 300 });
      expect(res.status).toBe(200);
      expect(res.body.unit_price).toBe(300);
    });

    it('removes a line item', async () => {
      const q = await request(app).get(`/quotes/${quoteId}`);
      const itemId = q.body.items[0].id;
      const res = await request(app).delete(`/quotes/${quoteId}/items/${itemId}`);
      expect(res.status).toBe(200);
      const q2 = await request(app).get(`/quotes/${quoteId}`);
      expect(q2.body.items).toHaveLength(0);
      expect(q2.body.subtotal).toBe(0);
    });
  });

  describe('POST /quotes/from-event/:eventId', () => {
    let eventId, itemId;
    beforeAll(async () => {
      const ir = await request(app).post('/inventory').send({ name: 'Speaker', quantity: 2, rental_rate: 80 });
      itemId = ir.body.id;
      const er = await request(app).post('/events').send({
        title: 'Quote Event', event_date: '2025-11-01',
        setup_date: '2025-11-01', teardown_date: '2025-11-02',
        client_name: 'Kunde GmbH'
      });
      eventId = er.body.id;
      await request(app).post(`/events/${eventId}/inventory-items`)
        .send({ inventory_item_id: itemId, quantity: 2, rental_days: 2 });
    });

    it('generates a quote from event inventory', async () => {
      const res = await request(app).post(`/quotes/from-event/${eventId}`).send({ tax_rate: 19 });
      expect(res.status).toBe(201);
      expect(res.body.event_id).toBe(eventId);
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.client_name).toBe('Kunde GmbH');
    });
  });

  describe('DELETE /quotes/:id', () => {
    let quoteId;
    beforeAll(async () => {
      const r = await request(app).post('/quotes').send({});
      quoteId = r.body.id;
    });

    it('deletes the quote', async () => {
      const res = await request(app).delete(`/quotes/${quoteId}`);
      expect(res.status).toBe(200);
    });

    it('returns 404 after deletion', async () => {
      const res = await request(app).get(`/quotes/${quoteId}`);
      expect(res.status).toBe(404);
    });
  });
});
