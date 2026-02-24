// src/__tests__/network.test.js
// Integration tests for the /network REST API endpoints.

process.env.DB_PATH    = ':memory:';
process.env.UPLOAD_DIR = '/tmp/it-mgmt-test-uploads';
process.env.SHELF_API_TOKEN = '';

const request = require('supertest');
const app = require('../server');

describe('Network API', () => {

  // ─── Racks ────────────────────────────────────────────────────────────────
  describe('Racks', () => {
    it('creates a rack', async () => {
      const res = await request(app).post('/network/racks').send({ name: 'Rack A', size_u: 42 });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Rack A');
      expect(res.body.size_u).toBe(42);
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app).post('/network/racks').send({ size_u: 10 });
      expect(res.status).toBe(400);
    });

    it('lists racks', async () => {
      const res = await request(app).get('/network/racks');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('updates a rack', async () => {
      const create = await request(app).post('/network/racks').send({ name: 'Old Rack' });
      const id = create.body.id;
      const res = await request(app).put(`/network/racks/${id}`).send({ name: 'New Rack' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('New Rack');
    });

    it('deletes a rack', async () => {
      const create = await request(app).post('/network/racks').send({ name: 'Del Rack' });
      const id = create.body.id;
      const del = await request(app).delete(`/network/racks/${id}`);
      expect(del.status).toBe(200);
      const get = await request(app).get('/network/racks');
      expect(get.body.some(r => r.id === id)).toBe(false);
    });
  });

  // ─── Devices ──────────────────────────────────────────────────────────────
  describe('Devices', () => {
    it('creates a device', async () => {
      const res = await request(app).post('/network/devices').send({
        name: 'Switch Büro',
        device_type: 'Switch',
        manufacturer: 'UniFi',
        model: 'USW-24-POE',
        ip_address: '192.168.1.2'
      });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Switch Büro');
      expect(res.body.device_type).toBe('Switch');
      expect(res.body.ports).toEqual([]);
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app).post('/network/devices').send({ device_type: 'Router' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid device_type', async () => {
      const res = await request(app).post('/network/devices').send({ name: 'X', device_type: 'Lamp' });
      expect(res.status).toBe(400);
    });

    it('lists devices', async () => {
      const res = await request(app).get('/network/devices');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('gets a single device with ports', async () => {
      const create = await request(app).post('/network/devices').send({ name: 'Detail Device' });
      const id = create.body.id;
      const res = await request(app).get(`/network/devices/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.ports).toBeDefined();
    });

    it('returns 404 for non-existent device', async () => {
      const res = await request(app).get('/network/devices/99999');
      expect(res.status).toBe(404);
    });

    it('updates a device', async () => {
      const create = await request(app).post('/network/devices').send({ name: 'Upd Device' });
      const id = create.body.id;
      const res = await request(app).put(`/network/devices/${id}`).send({ ip_address: '10.0.0.1' });
      expect(res.status).toBe(200);
      expect(res.body.ip_address).toBe('10.0.0.1');
    });

    it('updates canvas position', async () => {
      const create = await request(app).post('/network/devices').send({ name: 'Pos Device' });
      const id = create.body.id;
      const res = await request(app).put(`/network/devices/${id}`).send({ pos_x: 100, pos_y: 200 });
      expect(res.status).toBe(200);
      expect(res.body.pos_x).toBe(100);
      expect(res.body.pos_y).toBe(200);
    });

    it('deletes a device', async () => {
      const create = await request(app).post('/network/devices').send({ name: 'Del Device' });
      const id = create.body.id;
      const del = await request(app).delete(`/network/devices/${id}`);
      expect(del.status).toBe(200);
      const get = await request(app).get(`/network/devices/${id}`);
      expect(get.status).toBe(404);
    });
  });

  // ─── Ports ────────────────────────────────────────────────────────────────
  describe('Ports', () => {
    let deviceId;

    beforeAll(async () => {
      const res = await request(app).post('/network/devices').send({ name: 'Port Test Device' });
      deviceId = res.body.id;
    });

    it('adds a port to a device', async () => {
      const res = await request(app)
        .post(`/network/devices/${deviceId}/ports`)
        .send({ port_number: 1, port_label: 'Uplink', speed: '10G', vlan: '100' });
      expect(res.status).toBe(201);
      expect(res.body.port_number).toBe(1);
      expect(res.body.speed).toBe('10G');
    });

    it('returns 400 when port_number is missing', async () => {
      const res = await request(app)
        .post(`/network/devices/${deviceId}/ports`)
        .send({ port_label: 'No number' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid speed', async () => {
      const res = await request(app)
        .post(`/network/devices/${deviceId}/ports`)
        .send({ port_number: 99, speed: '5G' });
      expect(res.status).toBe(400);
    });

    it('lists ports', async () => {
      const res = await request(app).get(`/network/devices/${deviceId}/ports`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('updates a port', async () => {
      const create = await request(app)
        .post(`/network/devices/${deviceId}/ports`)
        .send({ port_number: 2, status: 'aktiv' });
      const portId = create.body.id;

      const res = await request(app)
        .put(`/network/devices/${deviceId}/ports/${portId}`)
        .send({ status: 'inaktiv', vlan: '200', poe_enabled: true });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('inaktiv');
      expect(res.body.vlan).toBe('200');
      expect(res.body.poe_enabled).toBe(1);
    });

    it('deletes a port', async () => {
      const create = await request(app)
        .post(`/network/devices/${deviceId}/ports`)
        .send({ port_number: 99 });
      const portId = create.body.id;

      const del = await request(app).delete(`/network/devices/${deviceId}/ports/${portId}`);
      expect(del.status).toBe(200);
    });
  });

  // ─── Topology ─────────────────────────────────────────────────────────────
  describe('GET /network/topology', () => {
    it('returns nodes and edges', async () => {
      const res = await request(app).get('/network/topology');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.nodes)).toBe(true);
      expect(Array.isArray(res.body.edges)).toBe(true);
    });
  });

});
