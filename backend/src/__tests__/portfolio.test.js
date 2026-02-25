// src/__tests__/portfolio.test.js
// Integration tests for the /portfolio REST API endpoints.

process.env.DB_PATH    = ':memory:';
process.env.UPLOAD_DIR = '/tmp/it-mgmt-test-uploads';
process.env.SHELF_API_TOKEN = '';

const request = require('supertest');
const app     = require('../server');

describe('Portfolio API', () => {

  // -------------------------------------------------------------------------
  // POST /portfolio
  // -------------------------------------------------------------------------
  describe('POST /portfolio', () => {
    it('creates an item with minimum required fields', async () => {
      const res = await request(app).post('/portfolio').send({ title: 'Test Project' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Test Project');
      expect(res.body.category).toBe('IT');
      expect(res.body.tags).toEqual([]);
      expect(res.body.media).toEqual([]);
    });

    it('creates a full item with all fields', async () => {
      const res = await request(app).post('/portfolio').send({
        title: 'Techno DJ Set',
        category: 'DJing',
        tags: ['DJing', 'Musik'],
        description: 'Live set at Club XYZ',
        date_from: '2024-12-31',
        date_to: '2025-01-01',
        link: 'https://soundcloud.com/example'
      });
      expect(res.status).toBe(201);
      expect(res.body.category).toBe('DJing');
      expect(res.body.tags).toEqual(['DJing', 'Musik']);
      expect(res.body.link).toBe('https://soundcloud.com/example');
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app).post('/portfolio').send({ category: 'IT' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title/i);
    });

    it('accepts tags as a comma-separated string', async () => {
      const res = await request(app).post('/portfolio').send({
        title: 'Photo Project',
        tags: 'Photography,Events'
      });
      expect(res.status).toBe(201);
      expect(res.body.tags).toEqual(['Photography', 'Events']);
    });
  });

  // -------------------------------------------------------------------------
  // GET /portfolio
  // -------------------------------------------------------------------------
  describe('GET /portfolio', () => {
    it('returns all items', async () => {
      const res = await request(app).get('/portfolio');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('filters by category', async () => {
      await request(app).post('/portfolio').send({ title: 'IT Work', category: 'IT' });
      await request(app).post('/portfolio').send({ title: 'DJ Gig', category: 'DJing' });

      const res = await request(app).get('/portfolio?category=DJing');
      expect(res.status).toBe(200);
      res.body.forEach(item => expect(item.category).toBe('DJing'));
    });

    it('filters by search term', async () => {
      await request(app).post('/portfolio').send({ title: 'Unique Project Name', category: 'IT' });

      const res = await request(app).get('/portfolio?search=Unique+Project+Name');
      expect(res.status).toBe(200);
      expect(res.body.some(item => item.title === 'Unique Project Name')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // GET /portfolio/:id
  // -------------------------------------------------------------------------
  describe('GET /portfolio/:id', () => {
    it('returns the item with media array', async () => {
      const create = await request(app).post('/portfolio').send({ title: 'Detail Test' });
      const id = create.body.id;

      const res = await request(app).get(`/portfolio/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
      expect(Array.isArray(res.body.media)).toBe(true);
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app).get('/portfolio/99999');
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // PUT /portfolio/:id
  // -------------------------------------------------------------------------
  describe('PUT /portfolio/:id', () => {
    it('updates allowed fields', async () => {
      const create = await request(app).post('/portfolio').send({ title: 'Original Title' });
      const id = create.body.id;

      const res = await request(app).put(`/portfolio/${id}`).send({
        title: 'Updated Title',
        category: 'Videography'
      });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.category).toBe('Videography');
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app).put('/portfolio/99999').send({ title: 'No' });
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /portfolio/:id
  // -------------------------------------------------------------------------
  describe('DELETE /portfolio/:id', () => {
    it('deletes an existing item', async () => {
      const create = await request(app).post('/portfolio').send({ title: 'To Delete' });
      const id = create.body.id;

      const del = await request(app).delete(`/portfolio/${id}`);
      expect(del.status).toBe(200);
      expect(del.body.message).toMatch(/deleted/i);

      const get = await request(app).get(`/portfolio/${id}`);
      expect(get.status).toBe(404);
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app).delete('/portfolio/99999');
      expect(res.status).toBe(404);
    });
  });

});
