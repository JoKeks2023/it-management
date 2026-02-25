// src/__tests__/maintenance.test.js
// Integration tests for the /maintenance REST API endpoints.

process.env.DB_PATH = ':memory:';
process.env.UPLOAD_DIR = '/tmp/it-mgmt-test-uploads';
process.env.SHELF_API_TOKEN = '';

const request = require('supertest');
const app = require('../server');

describe('Maintenance API', () => {
  describe('POST /maintenance', () => {
    it('creates a maintenance job', async () => {
      const res = await request(app)
        .post('/maintenance')
        .send({
          asset_name: 'Pioneer CDJ-3000',
          description: 'Lens cleaning',
          interval_days: 90
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.asset_name).toBe('Pioneer CDJ-3000');
      expect(res.body.interval_days).toBe(90);
      expect(Array.isArray(res.body.logs)).toBe(true);
    });

    it('auto-computes next_service from last_service + interval_days', async () => {
      const res = await request(app)
        .post('/maintenance')
        .send({
          asset_name: 'Test Asset',
          last_service: '2025-01-01',
          interval_days: 30
        });

      expect(res.status).toBe(201);
      expect(res.body.next_service).toBe('2025-01-31');
    });

    it('returns 400 when asset_name is missing', async () => {
      const res = await request(app).post('/maintenance').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/asset_name/i);
    });
  });

  describe('GET /maintenance', () => {
    it('returns a list of jobs', async () => {
      await request(app).post('/maintenance').send({ asset_name: 'Asset A' });
      const res = await request(app).get('/maintenance');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /maintenance/due', () => {
    it('returns only due or overdue jobs', async () => {
      // Create an overdue job
      await request(app)
        .post('/maintenance')
        .send({
          asset_name: 'Overdue Asset',
          next_service: '2020-01-01'
        });

      // Create a future job
      await request(app)
        .post('/maintenance')
        .send({
          asset_name: 'Future Asset',
          next_service: '2099-01-01'
        });

      const res = await request(app).get('/maintenance/due');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // All returned jobs should have past or today next_service
      const today = new Date().toISOString().split('T')[0];
      res.body.forEach(j => {
        expect(j.next_service <= today).toBe(true);
      });
    });
  });

  describe('POST /maintenance/:id/complete', () => {
    it('marks a job as completed and advances next_service', async () => {
      const created = await request(app)
        .post('/maintenance')
        .send({ asset_name: 'Complete Me', interval_days: 30, next_service: '2020-01-01' });
      const id = created.body.id;

      const res = await request(app)
        .post(`/maintenance/${id}/complete`)
        .send({ performed_by: 'Admin', notes: 'Done' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      // next_service should be in the future
      const today = new Date().toISOString().split('T')[0];
      expect(res.body.next_service > today).toBe(true);
      expect(res.body.logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /maintenance/:id/log', () => {
    it('adds a log entry to a job', async () => {
      const created = await request(app)
        .post('/maintenance')
        .send({ asset_name: 'Log Me' });
      const id = created.body.id;

      const res = await request(app)
        .post(`/maintenance/${id}/log`)
        .send({ performed_by: 'Technician', notes: 'Cleaned lens', cost: 25.50 });

      expect(res.status).toBe(201);
      expect(res.body.job_id).toBe(id);
      expect(res.body.performed_by).toBe('Technician');
      expect(res.body.cost).toBe(25.5);
    });
  });
});
