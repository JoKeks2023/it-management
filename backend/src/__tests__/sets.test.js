// src/__tests__/sets.test.js
// Integration tests for the /sets (Equipment Sets) API.

process.env.DB_PATH    = ':memory:';
process.env.UPLOAD_DIR = '/tmp/it-mgmt-test-uploads';
process.env.SHELF_API_TOKEN = '';

const request = require('supertest');
const app = require('../server');

describe('Equipment Sets API', () => {
  let setId, itemId, eventId;

  beforeAll(async () => {
    const ir = await request(app).post('/inventory').send({ name: 'CDJ-3000', quantity: 4, rental_rate: 100, category: 'Audio' });
    itemId = ir.body.id;
    const er = await request(app).post('/events').send({ title: 'Set Apply Test', event_date: '2025-10-01' });
    eventId = er.body.id;
  });

  describe('POST /sets', () => {
    it('creates a set', async () => {
      const res = await request(app).post('/sets').send({ name: 'DJ Standard', description: 'Basic DJ Setup' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('DJ Standard');
      setId = res.body.id;
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app).post('/sets').send({ description: 'no name' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /sets', () => {
    it('returns list of sets', async () => {
      const res = await request(app).get('/sets');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('POST /sets/:id/items', () => {
    it('adds an item to the set', async () => {
      const res = await request(app).post(`/sets/${setId}/items`).send({ inventory_item_id: itemId, quantity: 2 });
      expect(res.status).toBe(201);
      expect(res.body.quantity).toBe(2);
    });

    it('returns 400 for missing inventory_item_id', async () => {
      const res = await request(app).post(`/sets/${setId}/items`).send({ quantity: 1 });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /sets/:id', () => {
    it('returns set with items', async () => {
      const res = await request(app).get(`/sets/${setId}`);
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].item_name).toBe('CDJ-3000');
    });
  });

  describe('PUT /sets/:id', () => {
    it('updates the set name', async () => {
      const res = await request(app).put(`/sets/${setId}`).send({ name: 'DJ Pro Set' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('DJ Pro Set');
    });
  });

  describe('POST /sets/:id/apply/:eventId', () => {
    it('applies set items to an event', async () => {
      const res = await request(app).post(`/sets/${setId}/apply/${eventId}`).send({ rental_days: 2 });
      expect(res.status).toBe(201);
      expect(res.body.inserted).toBe(1);
    });

    it('returns 404 for unknown event', async () => {
      const res = await request(app).post(`/sets/${setId}/apply/99999`).send({});
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /sets/:id/items/:itemId', () => {
    it('removes an item from the set', async () => {
      const s = await request(app).get(`/sets/${setId}`);
      const siId = s.body.items[0].id;
      const res = await request(app).delete(`/sets/${setId}/items/${siId}`);
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /sets/:id', () => {
    it('deletes the set', async () => {
      const res = await request(app).delete(`/sets/${setId}`);
      expect(res.status).toBe(200);
      const r2  = await request(app).get(`/sets/${setId}`);
      expect(r2.status).toBe(404);
    });
  });
});

describe('Sub-rental (Fremdmiete) API', () => {
  let eventId, srId;

  beforeAll(async () => {
    const er = await request(app).post('/events').send({ title: 'SubRental Test', event_date: '2025-12-01' });
    eventId = er.body.id;
  });

  it('creates a subrental item', async () => {
    const res = await request(app).post(`/events/${eventId}/subrentals`).send({
      item_name: 'Line Array Box', quantity: 4, rental_cost: 150, rental_days: 2, status: 'angefragt'
    });
    expect(res.status).toBe(201);
    expect(res.body.item_name).toBe('Line Array Box');
    srId = res.body.id;
  });

  it('returns 400 for missing item_name', async () => {
    const res = await request(app).post(`/events/${eventId}/subrentals`).send({ quantity: 1 });
    expect(res.status).toBe(400);
  });

  it('lists subrentals for an event', async () => {
    const res = await request(app).get(`/events/${eventId}/subrentals`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('updates subrental status', async () => {
    const res = await request(app).put(`/events/${eventId}/subrentals/${srId}`).send({ status: 'bestätigt' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('bestätigt');
  });

  it('deletes a subrental item', async () => {
    const res = await request(app).delete(`/events/${eventId}/subrentals/${srId}`);
    expect(res.status).toBe(200);
    const list = await request(app).get(`/events/${eventId}/subrentals`);
    expect(list.body.length).toBe(0);
  });
});

describe('Repair Log API', () => {
  let itemId, repairId;

  beforeAll(async () => {
    const ir = await request(app).post('/inventory').send({ name: 'DJM-900NXS2', quantity: 2, rental_rate: 80 });
    itemId = ir.body.id;
  });

  it('creates a repair log entry', async () => {
    const res = await request(app).post(`/inventory/${itemId}/repairs`).send({
      issue_description: 'Kanal 3 defekt', quantity_affected: 1, status: 'defekt'
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('defekt');
    repairId = res.body.id;
  });

  it('lists repair logs', async () => {
    const res = await request(app).get(`/inventory/${itemId}/repairs`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });

  it('repair reduces availability', async () => {
    const res = await request(app).get(`/inventory/${itemId}/availability`);
    expect(res.status).toBe(200);
    expect(res.body.in_repair).toBe(1);
    expect(res.body.usable).toBe(1); // quantity=2, in_repair=1
    expect(res.body.available).toBe(1);
  });

  it('updates repair status to resolved', async () => {
    const res = await request(app).put(`/inventory/${itemId}/repairs/${repairId}`).send({ status: 'repariert' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('repariert');
    expect(res.body.resolved_at).toBeTruthy();
  });

  it('availability restored after resolution', async () => {
    const res = await request(app).get(`/inventory/${itemId}/availability`);
    expect(res.body.in_repair).toBe(0);
    expect(res.body.usable).toBe(2);
    expect(res.body.available).toBe(2);
  });

  it('deletes repair log', async () => {
    const res = await request(app).delete(`/inventory/${itemId}/repairs/${repairId}`);
    expect(res.status).toBe(200);
  });
});

describe('Packing List API', () => {
  let eventId, lineId;

  beforeAll(async () => {
    const ir = await request(app).post('/inventory').send({ name: 'Stativ', quantity: 10, rental_rate: 5 });
    const er = await request(app).post('/events').send({ title: 'Packing Test', event_date: '2026-01-15' });
    eventId = er.body.id;
    const lr = await request(app).post(`/events/${eventId}/inventory-items`).send({
      inventory_item_id: ir.body.id, quantity: 3, rental_days: 1
    });
    lineId = lr.body.id;
  });

  it('returns packing list for event', async () => {
    const res = await request(app).get(`/events/${eventId}/packing-list`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.summary.total).toBe(1);
    expect(res.body.summary.packed).toBe(0);
  });

  it('toggling packed flag updates packing list', async () => {
    await request(app).put(`/events/${eventId}/inventory-items/${lineId}`).send({ packed: true });
    const res = await request(app).get(`/events/${eventId}/packing-list`);
    expect(res.body.summary.packed).toBe(1);
    expect(res.body.summary.unpacked).toBe(0);
  });
});

describe('Crew Conflict API', () => {
  it('returns empty array when no conflicts', async () => {
    const er = await request(app).post('/events').send({ title: 'Conflict Test', event_date: '2026-03-01' });
    const res = await request(app).get(`/events/${er.body.id}/crew-conflicts`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
});

describe('Reports API', () => {
  it('GET /reports/overview returns metrics', async () => {
    const res = await request(app).get('/reports/overview');
    expect(res.status).toBe(200);
    expect(typeof res.body.events_total).toBe('number');
    expect(typeof res.body.inventory_total).toBe('number');
    expect(typeof res.body.revenue_total).toBe('number');
  });

  it('GET /reports/revenue returns monthly data', async () => {
    const res = await request(app).get('/reports/revenue?months=12');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /reports/equipment returns top items', async () => {
    const res = await request(app).get('/reports/equipment?limit=5');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /reports/crew returns crew summary', async () => {
    const res = await request(app).get('/reports/crew');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /reports/events returns event counts by month', async () => {
    const res = await request(app).get('/reports/events?months=12');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
