// src/__tests__/inventory.test.js
// Integration tests for the /inventory REST API.

process.env.DB_PATH    = ':memory:';
process.env.UPLOAD_DIR = '/tmp/it-mgmt-test-uploads';
process.env.SHELF_API_TOKEN = '';

const request = require('supertest');
const app = require('../server');

describe('Inventory API', () => {

  describe('POST /inventory', () => {
    it('creates an item with required fields', async () => {
      const res = await request(app).post('/inventory').send({ name: 'CDJ-3000', category: 'Audio' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('CDJ-3000');
      expect(res.body.category).toBe('Audio');
      expect(res.body.quantity).toBe(1);
    });

    it('creates item with all fields', async () => {
      const res = await request(app).post('/inventory').send({
        name: 'DJM-900NXS2', category: 'Audio', quantity: 2,
        rental_rate: 120, purchase_price: 2200, barcode: 'DJ900X', notes: 'gut'
      });
      expect(res.status).toBe(201);
      expect(res.body.quantity).toBe(2);
      expect(res.body.rental_rate).toBe(120);
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app).post('/inventory').send({ category: 'Audio' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /inventory', () => {
    beforeAll(async () => {
      await request(app).post('/inventory').send({ name: 'Stativ', category: 'Licht' });
      await request(app).post('/inventory').send({ name: 'Moving Head', category: 'Licht' });
    });

    it('returns list of items', async () => {
      const res = await request(app).get('/inventory');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('filters by category', async () => {
      const res = await request(app).get('/inventory?category=Licht');
      expect(res.status).toBe(200);
      res.body.forEach(i => expect(i.category).toBe('Licht'));
    });

    it('searches by name', async () => {
      const res = await request(app).get('/inventory?search=Moving');
      expect(res.status).toBe(200);
      expect(res.body.some(i => i.name.includes('Moving'))).toBe(true);
    });
  });

  describe('GET /inventory/categories', () => {
    it('returns distinct categories', async () => {
      const res = await request(app).get('/inventory/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PUT /inventory/:id', () => {
    let itemId;
    beforeAll(async () => {
      const r = await request(app).post('/inventory').send({ name: 'To Update' });
      itemId = r.body.id;
    });

    it('updates fields', async () => {
      const res = await request(app).put(`/inventory/${itemId}`).send({ quantity: 5, rental_rate: 50 });
      expect(res.status).toBe(200);
      expect(res.body.quantity).toBe(5);
      expect(res.body.rental_rate).toBe(50);
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app).put('/inventory/99999').send({ quantity: 1 });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /inventory/:id/availability', () => {
    let itemId, eventId;
    beforeAll(async () => {
      const ir = await request(app).post('/inventory').send({ name: 'Avail Test', quantity: 3, rental_rate: 10 });
      itemId = ir.body.id;
      const er = await request(app).post('/events').send({
        title: 'Avail Event', event_date: '2025-07-01', setup_date: '2025-07-01', teardown_date: '2025-07-02'
      });
      eventId = er.body.id;
      await request(app).post(`/events/${eventId}/inventory-items`).send({
        inventory_item_id: itemId, quantity: 2, rental_days: 1
      });
    });

    it('returns availability data', async () => {
      const res = await request(app)
        .get(`/inventory/${itemId}/availability?date_from=2025-07-01&date_to=2025-07-02`);
      expect(res.status).toBe(200);
      expect(res.body.quantity).toBe(3);
      expect(res.body.booked).toBe(2);
      expect(res.body.available).toBe(1);
    });

    it('shows full availability outside the booked range', async () => {
      const res = await request(app)
        .get(`/inventory/${itemId}/availability?date_from=2025-08-01&date_to=2025-08-02`);
      expect(res.status).toBe(200);
      expect(res.body.available).toBe(3);
    });
  });

  describe('DELETE /inventory/:id', () => {
    let itemId;
    beforeAll(async () => {
      const r = await request(app).post('/inventory').send({ name: 'To Delete' });
      itemId = r.body.id;
    });

    it('deletes the item', async () => {
      const res = await request(app).delete(`/inventory/${itemId}`);
      expect(res.status).toBe(200);
    });

    it('returns 404 after deletion', async () => {
      const res = await request(app).get(`/inventory/${itemId}`);
      expect(res.status).toBe(404);
    });
  });
});

describe('Event Inventory Lines API', () => {
  let eventId, itemId;

  beforeAll(async () => {
    const er = await request(app).post('/events').send({
      title: 'Gear Event', event_date: '2025-09-10',
      setup_date: '2025-09-10', teardown_date: '2025-09-11'
    });
    eventId = er.body.id;

    const ir = await request(app).post('/inventory').send({ name: 'Sub Woofer', quantity: 4, rental_rate: 60 });
    itemId = ir.body.id;
  });

  it('adds an inventory item to an event', async () => {
    const res = await request(app).post(`/events/${eventId}/inventory-items`)
      .send({ inventory_item_id: itemId, quantity: 2, rental_days: 2 });
    expect(res.status).toBe(201);
    expect(res.body.item_name).toBe('Sub Woofer');
    expect(res.body.quantity).toBe(2);
  });

  it('lists inventory items for an event', async () => {
    const res = await request(app).get(`/events/${eventId}/inventory-items`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  it('blocks overbooking', async () => {
    // stock = 4, already booked = 2, trying to book 3 more → 409
    const er2 = await request(app).post('/events').send({
      title: 'Other Event', event_date: '2025-09-10',
      setup_date: '2025-09-10', teardown_date: '2025-09-11'
    });
    const res = await request(app).post(`/events/${er2.body.id}/inventory-items`)
      .send({ inventory_item_id: itemId, quantity: 3, rental_days: 1 });
    expect(res.status).toBe(409);
  });
});
