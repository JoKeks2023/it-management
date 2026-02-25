// src/__tests__/setlists.test.js
// Integration tests for the /setlists REST API endpoints.

process.env.DB_PATH = ':memory:';
process.env.UPLOAD_DIR = '/tmp/it-mgmt-test-uploads';
process.env.SHELF_API_TOKEN = '';

const request = require('supertest');
const app = require('../server');

describe('Setlists API', () => {
  describe('POST /setlists', () => {
    it('creates a setlist with tracks', async () => {
      const res = await request(app)
        .post('/setlists')
        .send({
          name: 'Opening Set',
          notes: 'Warm-up set',
          tracks: [
            { title: 'Track 1', artist: 'Artist A', bpm: 128, key_sig: 'Am', duration_s: 300 },
            { title: 'Track 2', artist: 'Artist B', bpm: 130, duration_s: 240 }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Opening Set');
      expect(res.body.tracks).toHaveLength(2);
      expect(res.body.tracks[0].title).toBe('Track 1');
      expect(res.body.tracks[0].bpm).toBe(128);
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app).post('/setlists').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/name/i);
    });
  });

  describe('GET /setlists', () => {
    it('returns a list of setlists', async () => {
      await request(app).post('/setlists').send({ name: 'Set A' });
      const res = await request(app).get('/setlists');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /setlists/:id', () => {
    it('returns a setlist with tracks', async () => {
      const created = await request(app)
        .post('/setlists')
        .send({ name: 'Find Me', tracks: [{ title: 'Song', artist: 'Band', bpm: 120 }] });
      const id = created.body.id;

      const res = await request(app).get(`/setlists/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Find Me');
      expect(res.body.tracks).toHaveLength(1);
    });

    it('returns 404 for non-existent setlist', async () => {
      const res = await request(app).get('/setlists/999999');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /setlists/:id/tracks', () => {
    it('adds a track to a setlist', async () => {
      const setlist = await request(app)
        .post('/setlists')
        .send({ name: 'Track Test Set' });
      const id = setlist.body.id;

      const res = await request(app)
        .post(`/setlists/${id}/tracks`)
        .send({ title: 'New Song', artist: 'Test Artist', bpm: 125 });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('New Song');
      expect(res.body.bpm).toBe(125);
    });

    it('returns 400 when track title is missing', async () => {
      const setlist = await request(app)
        .post('/setlists')
        .send({ name: 'Test Set' });
      const id = setlist.body.id;

      const res = await request(app)
        .post(`/setlists/${id}/tracks`)
        .send({ artist: 'No Title' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /setlists/:id/export', () => {
    it('exports as JSON', async () => {
      const setlist = await request(app)
        .post('/setlists')
        .send({
          name: 'Export Test',
          tracks: [{ title: 'Song', bpm: 128, duration_s: 300 }]
        });
      const id = setlist.body.id;

      const res = await request(app).get(`/setlists/${id}/export?format=json`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Export Test');
      expect(res.body.tracks).toHaveLength(1);
      expect(res.body.total_duration_s).toBe(300);
    });

    it('exports as CSV', async () => {
      const setlist = await request(app)
        .post('/setlists')
        .send({
          name: 'CSV Export Test',
          tracks: [{ title: 'Song A', artist: 'DJ Test', bpm: 130, duration_s: 200 }]
        });
      const id = setlist.body.id;

      const res = await request(app).get(`/setlists/${id}/export?format=csv`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Song A');
      expect(res.text).toContain('DJ Test');
    });
  });

  describe('DELETE /setlists/:id', () => {
    it('deletes a setlist', async () => {
      const created = await request(app)
        .post('/setlists')
        .send({ name: 'Delete Me' });
      const id = created.body.id;

      const delRes = await request(app).delete(`/setlists/${id}`);
      expect(delRes.status).toBe(200);

      const getRes = await request(app).get(`/setlists/${id}`);
      expect(getRes.status).toBe(404);
    });
  });
});
