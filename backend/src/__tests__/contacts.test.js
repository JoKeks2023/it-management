// src/__tests__/contacts.test.js
// Integration tests for the /contacts REST API endpoints.

process.env.DB_PATH    = ':memory:';
process.env.UPLOAD_DIR = '/tmp/it-mgmt-test-uploads';
process.env.SHELF_API_TOKEN = '';

const request = require('supertest');
const app = require('../server');

describe('Contacts API', () => {

  describe('POST /contacts', () => {
    it('creates a contact with minimum required fields', async () => {
      const res = await request(app).post('/contacts').send({ name: 'Max Mustermann' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Max Mustermann');
      expect(res.body.contact_type).toBe('Kunde');
    });

    it('creates a full contact', async () => {
      const res = await request(app).post('/contacts').send({
        name: 'Club XYZ',
        company: 'Club XYZ GmbH',
        email: 'info@clubxyz.de',
        phone: '0171-1234567',
        contact_type: 'Veranstalter',
        notes: 'Stammkunde'
      });
      expect(res.status).toBe(201);
      expect(res.body.company).toBe('Club XYZ GmbH');
      expect(res.body.contact_type).toBe('Veranstalter');
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app).post('/contacts').send({ email: 'test@test.de' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/name/i);
    });

    it('returns 400 for invalid contact_type', async () => {
      const res = await request(app).post('/contacts').send({ name: 'Test', contact_type: 'Unknown' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /contacts', () => {
    beforeAll(async () => {
      await request(app).post('/contacts').send({ name: 'Anna Technik', contact_type: 'Techniker' });
      await request(app).post('/contacts').send({ name: 'Bert Liefert', contact_type: 'Lieferant' });
    });

    it('returns a list of contacts', async () => {
      const res = await request(app).get('/contacts');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('filters by contact_type', async () => {
      const res = await request(app).get('/contacts?contact_type=Techniker');
      expect(res.status).toBe(200);
      res.body.forEach(c => expect(c.contact_type).toBe('Techniker'));
    });

    it('filters by search query', async () => {
      const res = await request(app).get('/contacts?search=Liefert');
      expect(res.status).toBe(200);
      expect(res.body.some(c => c.name.includes('Liefert'))).toBe(true);
    });
  });

  describe('GET /contacts/:id', () => {
    let contactId;
    beforeAll(async () => {
      const res = await request(app).post('/contacts').send({ name: 'Detail Test' });
      contactId = res.body.id;
    });

    it('returns the contact', async () => {
      const res = await request(app).get(`/contacts/${contactId}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Detail Test');
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app).get('/contacts/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /contacts/:id', () => {
    let contactId;
    beforeAll(async () => {
      const res = await request(app).post('/contacts').send({ name: 'Update Me' });
      contactId = res.body.id;
    });

    it('updates contact fields', async () => {
      const res = await request(app).put(`/contacts/${contactId}`)
        .send({ name: 'Updated Name', phone: '0800-12345' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
      expect(res.body.phone).toBe('0800-12345');
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app).put('/contacts/99999').send({ name: 'x' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /contacts/:id', () => {
    let contactId;
    beforeAll(async () => {
      const res = await request(app).post('/contacts').send({ name: 'Delete Me' });
      contactId = res.body.id;
    });

    it('deletes the contact', async () => {
      const res = await request(app).delete(`/contacts/${contactId}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });

    it('returns 404 after deletion', async () => {
      const res = await request(app).get(`/contacts/${contactId}`);
      expect(res.status).toBe(404);
    });
  });
});
