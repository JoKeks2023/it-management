// src/__tests__/templates.test.js
// Integration tests for the /templates REST API endpoints.

process.env.DB_PATH = ':memory:';
process.env.UPLOAD_DIR = '/tmp/it-mgmt-test-uploads';
process.env.SHELF_API_TOKEN = '';

const request = require('supertest');
const app = require('../server');

describe('Templates API', () => {
  describe('POST /templates', () => {
    it('creates a template with minimum fields', async () => {
      const res = await request(app)
        .post('/templates')
        .send({ name: 'Festival Setup' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Festival Setup');
      expect(res.body.category).toBe('event');
      expect(Array.isArray(res.body.checklist)).toBe(true);
      expect(Array.isArray(res.body.equipment)).toBe(true);
    });

    it('creates a template with checklist and equipment', async () => {
      const res = await request(app)
        .post('/templates')
        .send({
          name: 'Club Night',
          category: 'event',
          description: 'Standard club set',
          checklist: ['CDJs aufbauen', 'Soundcheck'],
          equipment: ['CDJ-3000', 'DJM-900']
        });

      expect(res.status).toBe(201);
      expect(res.body.checklist).toEqual(['CDJs aufbauen', 'Soundcheck']);
      expect(res.body.equipment).toEqual(['CDJ-3000', 'DJM-900']);
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app).post('/templates').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/name/i);
    });
  });

  describe('GET /templates', () => {
    it('returns a list of templates', async () => {
      await request(app).post('/templates').send({ name: 'T1' });
      await request(app).post('/templates').send({ name: 'T2' });

      const res = await request(app).get('/templates');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /templates/:id', () => {
    it('returns a template by ID', async () => {
      const created = await request(app)
        .post('/templates')
        .send({ name: 'Findable Template' });
      const id = created.body.id;

      const res = await request(app).get(`/templates/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Findable Template');
    });

    it('returns 404 for non-existent template', async () => {
      const res = await request(app).get('/templates/999999');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /templates/:id', () => {
    it('updates a template', async () => {
      const created = await request(app)
        .post('/templates')
        .send({ name: 'Old Name' });
      const id = created.body.id;

      const res = await request(app)
        .put(`/templates/${id}`)
        .send({ name: 'New Name', checklist: ['Item A'] });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('New Name');
      expect(res.body.checklist).toEqual(['Item A']);
    });
  });

  describe('DELETE /templates/:id', () => {
    it('deletes a template', async () => {
      const created = await request(app)
        .post('/templates')
        .send({ name: 'Delete Me' });
      const id = created.body.id;

      const delRes = await request(app).delete(`/templates/${id}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const getRes = await request(app).get(`/templates/${id}`);
      expect(getRes.status).toBe(404);
    });
  });
});
