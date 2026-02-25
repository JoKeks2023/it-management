// src/__tests__/lightpresets.test.js
// Integration tests for the /lightpresets REST API endpoints.

process.env.DB_PATH = ':memory:';
process.env.UPLOAD_DIR = '/tmp/it-mgmt-test-uploads';
process.env.SHELF_API_TOKEN = '';

const request = require('supertest');
const app = require('../server');

const sampleDmx = {
  duration_ms: 4000,
  fps: 20,
  channels: [
    { channel: 1, label: 'Strobe', values: [0, 255, 0, 255] },
    { channel: 2, label: 'Bass',   values: [100, 200, 100, 200] }
  ]
};

describe('Light Presets API', () => {
  describe('POST /lightpresets', () => {
    it('creates a light preset', async () => {
      const res = await request(app)
        .post('/lightpresets')
        .send({ name: 'Club Energy', description: 'High energy', dmx_json: sampleDmx });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Club Energy');
      expect(res.body.dmx_json).toEqual(sampleDmx);
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app).post('/lightpresets').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/name/i);
    });
  });

  describe('GET /lightpresets', () => {
    it('returns a list of presets', async () => {
      await request(app).post('/lightpresets').send({ name: 'Preset A' });
      const res = await request(app).get('/lightpresets');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /lightpresets/:id', () => {
    it('returns a preset by ID', async () => {
      const created = await request(app)
        .post('/lightpresets')
        .send({ name: 'Findable Preset', dmx_json: sampleDmx });
      const id = created.body.id;

      const res = await request(app).get(`/lightpresets/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Findable Preset');
      expect(res.body.dmx_json.fps).toBe(20);
    });

    it('returns 404 for non-existent preset', async () => {
      const res = await request(app).get('/lightpresets/999999');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /lightpresets/:id', () => {
    it('updates a preset', async () => {
      const created = await request(app)
        .post('/lightpresets')
        .send({ name: 'Old Preset' });
      const id = created.body.id;

      const res = await request(app)
        .put(`/lightpresets/${id}`)
        .send({ name: 'Updated Preset', dmx_json: sampleDmx });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Preset');
      expect(res.body.dmx_json).toEqual(sampleDmx);
    });
  });

  describe('DELETE /lightpresets/:id', () => {
    it('deletes a preset', async () => {
      const created = await request(app)
        .post('/lightpresets')
        .send({ name: 'Delete Me' });
      const id = created.body.id;

      const delRes = await request(app).delete(`/lightpresets/${id}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const getRes = await request(app).get(`/lightpresets/${id}`);
      expect(getRes.status).toBe(404);
    });
  });
});
