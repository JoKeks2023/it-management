// src/__tests__/events.test.js
// Integration tests for the /events REST API endpoints.

process.env.DB_PATH    = ':memory:';
process.env.UPLOAD_DIR = '/tmp/it-mgmt-test-uploads';
process.env.SHELF_API_TOKEN = '';

const request = require('supertest');
const app = require('../server');

describe('Events API', () => {

  describe('POST /events', () => {
    it('creates an event with minimum required fields', async () => {
      const res = await request(app).post('/events').send({ title: 'Test Event' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Test Event');
      expect(res.body.event_type).toBe('DJ');
      expect(res.body.status).toBe('angefragt');
      expect(res.body.payment_status).toBe('offen');
      expect(res.body.equipment).toEqual([]);
    });

    it('creates a full event with equipment', async () => {
      const res = await request(app).post('/events').send({
        title: 'Techno Night',
        event_type: 'DJ',
        client_name: 'Club XYZ',
        client_contact: '0171-1234567',
        location: 'Club Berlin',
        event_date: '2025-12-31',
        start_time: '22:00',
        end_time: '06:00',
        price_estimate: 1500,
        payment_status: 'angezahlt',
        status: 'bestätigt',
        equipment: [
          { asset_name: 'Pioneer CDJ-3000', reserved: true },
          { asset_name: 'DJM-900NXS2',      reserved: false }
        ]
      });

      expect(res.status).toBe(201);
      expect(res.body.client_name).toBe('Club XYZ');
      expect(res.body.payment_status).toBe('angezahlt');
      expect(res.body.equipment).toHaveLength(2);
      expect(res.body.equipment[0].asset_name).toBe('Pioneer CDJ-3000');
      expect(res.body.equipment[0].reserved).toBe(1);
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app).post('/events').send({ event_type: 'DJ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title/i);
    });

    it('returns 400 for invalid event_type', async () => {
      const res = await request(app).post('/events').send({ title: 'Bad', event_type: 'Rave' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid payment_status', async () => {
      const res = await request(app).post('/events').send({ title: 'Bad', payment_status: 'gratis' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid status', async () => {
      const res = await request(app).post('/events').send({ title: 'Bad', status: 'gebucht' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /events', () => {
    beforeAll(async () => {
      await request(app).post('/events').send({
        title: 'Filter Event', event_type: 'Technik',
        status: 'bestätigt', event_date: '2025-06-01'
      });
    });

    it('returns a list of events', async () => {
      const res = await request(app).get('/events');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('filters by status', async () => {
      const res = await request(app).get('/events').query({ status: 'bestätigt' });
      expect(res.status).toBe(200);
      res.body.forEach(e => expect(e.status).toBe('bestätigt'));
    });

    it('filters by event_type', async () => {
      const res = await request(app).get('/events?event_type=Technik');
      expect(res.status).toBe(200);
      res.body.forEach(e => expect(e.event_type).toBe('Technik'));
    });

    it('filters by search term', async () => {
      const res = await request(app).get('/events?search=Filter+Event');
      expect(res.status).toBe(200);
      expect(res.body.some(e => e.title === 'Filter Event')).toBe(true);
    });
  });

  describe('GET /events/upcoming', () => {
    it('returns upcoming events array', async () => {
      const res = await request(app).get('/events/upcoming');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /events/:id', () => {
    let eventId;
    beforeAll(async () => {
      const res = await request(app).post('/events').send({ title: 'Detail Event' });
      eventId = res.body.id;
    });

    it('returns full event with equipment and attachments', async () => {
      const res = await request(app).get(`/events/${eventId}`);
      expect(res.status).toBe(200);
      expect(res.body.equipment).toBeDefined();
      expect(res.body.attachments).toBeDefined();
    });

    it('returns 404 for non-existent event', async () => {
      const res = await request(app).get('/events/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /events/:id', () => {
    let eventId;
    beforeAll(async () => {
      const res = await request(app).post('/events').send({ title: 'Update Event' });
      eventId = res.body.id;
    });

    it('updates status', async () => {
      const res = await request(app).put(`/events/${eventId}`).send({ status: 'bestätigt' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('bestätigt');
    });

    it('updates payment_status', async () => {
      const res = await request(app).put(`/events/${eventId}`).send({ payment_status: 'bezahlt' });
      expect(res.status).toBe(200);
      expect(res.body.payment_status).toBe('bezahlt');
    });

    it('replaces equipment list', async () => {
      const res = await request(app).put(`/events/${eventId}`).send({
        equipment: [{ asset_name: 'New Speaker', reserved: false }]
      });
      expect(res.status).toBe(200);
      expect(res.body.equipment).toHaveLength(1);
      expect(res.body.equipment[0].asset_name).toBe('New Speaker');
    });

    it('returns 404 for non-existent event', async () => {
      const res = await request(app).put('/events/99999').send({ status: 'bestätigt' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /events/:id/history', () => {
    let eventId;
    beforeAll(async () => {
      const res = await request(app).post('/events').send({ title: 'History Event' });
      eventId = res.body.id;
      await request(app).put(`/events/${eventId}`).send({ status: 'bestätigt' });
    });

    it('returns history entries', async () => {
      const res = await request(app).get(`/events/${eventId}/history`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('returns 404 for non-existent event', async () => {
      const res = await request(app).get('/events/99999/history');
      expect(res.status).toBe(404);
    });
  });

  describe('Equipment sub-resource', () => {
    let eventId;
    beforeAll(async () => {
      const res = await request(app).post('/events').send({ title: 'Equipment Event' });
      eventId = res.body.id;
    });

    it('adds equipment to an event', async () => {
      const res = await request(app)
        .post(`/events/${eventId}/equipment`)
        .send({ asset_name: 'Pioneer CDJ-3000' });
      expect(res.status).toBe(201);
      expect(res.body.asset_name).toBe('Pioneer CDJ-3000');
    });

    it('updates equipment reserved flag', async () => {
      const addRes = await request(app)
        .post(`/events/${eventId}/equipment`)
        .send({ asset_name: 'Mixer' });
      const eqId = addRes.body.id;

      const res = await request(app)
        .put(`/events/${eventId}/equipment/${eqId}`)
        .send({ reserved: true });
      expect(res.status).toBe(200);
      expect(res.body.reserved).toBe(1);
    });

    it('removes equipment', async () => {
      const addRes = await request(app)
        .post(`/events/${eventId}/equipment`)
        .send({ asset_name: 'To Remove' });
      const eqId = addRes.body.id;

      const delRes = await request(app).delete(`/events/${eventId}/equipment/${eqId}`);
      expect(delRes.status).toBe(200);
    });
  });

  describe('DELETE /events/:id', () => {
    it('deletes an event', async () => {
      const create = await request(app).post('/events').send({ title: 'To Delete' });
      const id = create.body.id;
      const del = await request(app).delete(`/events/${id}`);
      expect(del.status).toBe(200);
      const get = await request(app).get(`/events/${id}`);
      expect(get.status).toBe(404);
    });

    it('returns 404 for non-existent event', async () => {
      const res = await request(app).delete('/events/99999');
      expect(res.status).toBe(404);
    });
  });

});
