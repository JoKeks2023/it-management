// src/__tests__/projects.test.js
// Integration tests for the /projects REST API endpoints.
// Uses an in-memory SQLite database for isolation.

process.env.DB_PATH = ':memory:';
process.env.UPLOAD_DIR = '/tmp/it-mgmt-test-uploads';
process.env.SHELF_API_TOKEN = '';

const request = require('supertest');
const app = require('../server');

describe('Projects API', () => {
  // -------------------------------------------------------------------------
  // POST /projects – create
  // -------------------------------------------------------------------------
  describe('POST /projects', () => {
    it('creates a project with minimum required fields', async () => {
      const res = await request(app)
        .post('/projects')
        .send({ title: 'Test Project' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Test Project');
      expect(res.body.status).toBe('planning');
      expect(res.body.project_type).toBe('event');
      expect(res.body.media).toEqual([]);
    });

    it('creates a project with all fields', async () => {
      const res = await request(app)
        .post('/projects')
        .send({
          title: 'Full Project',
          description: 'A complete project',
          project_type: 'installation',
          client_name: 'Test Client',
          client_contact: 'test@example.com',
          location: 'Test Location',
          start_date: '2025-06-01',
          end_date: '2025-06-05',
          status: 'active',
          price_estimate: 1500.00,
          notes: 'Some notes'
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Full Project');
      expect(res.body.project_type).toBe('installation');
      expect(res.body.client_name).toBe('Test Client');
      expect(res.body.price_estimate).toBe(1500);
      expect(res.body.status).toBe('active');
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/projects')
        .send({ description: 'No title' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title/i);
    });
  });

  // -------------------------------------------------------------------------
  // GET /projects
  // -------------------------------------------------------------------------
  describe('GET /projects', () => {
    it('returns a list of projects', async () => {
      await request(app).post('/projects').send({ title: 'Project Alpha' });
      await request(app).post('/projects').send({ title: 'Project Beta' });

      const res = await request(app).get('/projects');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('filters by status', async () => {
      await request(app).post('/projects').send({ title: 'Active One', status: 'active' });
      const res = await request(app).get('/projects?status=active');
      expect(res.status).toBe(200);
      expect(res.body.every(p => p.status === 'active')).toBe(true);
    });

    it('filters by search', async () => {
      await request(app).post('/projects').send({ title: 'UniqueXYZ Search Test' });
      const res = await request(app).get('/projects?search=UniqueXYZ');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].title).toContain('UniqueXYZ');
    });
  });

  // -------------------------------------------------------------------------
  // GET /projects/:id
  // -------------------------------------------------------------------------
  describe('GET /projects/:id', () => {
    it('returns a project by ID', async () => {
      const created = await request(app)
        .post('/projects')
        .send({ title: 'Findable Project' });
      const id = created.body.id;

      const res = await request(app).get(`/projects/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
      expect(res.body.title).toBe('Findable Project');
    });

    it('returns 404 for non-existent project', async () => {
      const res = await request(app).get('/projects/999999');
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // PUT /projects/:id
  // -------------------------------------------------------------------------
  describe('PUT /projects/:id', () => {
    it('updates a project', async () => {
      const created = await request(app)
        .post('/projects')
        .send({ title: 'Update Me' });
      const id = created.body.id;

      const res = await request(app)
        .put(`/projects/${id}`)
        .send({ title: 'Updated Title', status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.status).toBe('completed');
    });

    it('returns 404 for non-existent project', async () => {
      const res = await request(app)
        .put('/projects/999999')
        .send({ title: 'Ghost' });
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /projects/:id
  // -------------------------------------------------------------------------
  describe('DELETE /projects/:id', () => {
    it('deletes a project', async () => {
      const created = await request(app)
        .post('/projects')
        .send({ title: 'Delete Me' });
      const id = created.body.id;

      const delRes = await request(app).delete(`/projects/${id}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const getRes = await request(app).get(`/projects/${id}`);
      expect(getRes.status).toBe(404);
    });
  });
});
