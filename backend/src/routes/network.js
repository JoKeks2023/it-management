// src/routes/network.js
// REST API endpoints for network device and port management.
//
// Endpoints – Devices:
//   GET    /network/devices           – list all devices
//   GET    /network/devices/:id       – device with its ports
//   POST   /network/devices           – create device
//   PUT    /network/devices/:id       – update device (incl. canvas position)
//   DELETE /network/devices/:id       – delete device (cascade ports)
//
// Endpoints – Ports:
//   GET    /network/devices/:id/ports      – list ports of a device
//   POST   /network/devices/:id/ports      – add a port
//   PUT    /network/devices/:id/ports/:pid – update port (VLAN, PoE, connection, status)
//   DELETE /network/devices/:id/ports/:pid – remove a port
//
// Endpoints – Racks:
//   GET    /network/racks             – list all racks
//   POST   /network/racks             – create rack
//   PUT    /network/racks/:id         – update rack
//   DELETE /network/racks/:id         – delete rack
//
// Endpoints – Topology:
//   GET    /network/topology          – nodes + edges for React Flow

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const db = require('../db/database');

const routerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
router.use(routerLimiter);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const VALID_DEVICE_TYPES = ['Router','Switch','Access Point','Patchpanel','Firewall','Server','Sonstiges'];
const VALID_PORT_SPEEDS   = ['100M','1G','2.5G','10G','25G','40G','100G'];
const VALID_PORT_STATUSES = ['aktiv','inaktiv','reserviert'];

function loadDeviceWithPorts(id) {
  const device = db.prepare('SELECT * FROM network_devices WHERE id = ?').get(id);
  if (!device) return null;
  device.ports = db.prepare('SELECT * FROM ports WHERE device_id = ? ORDER BY port_number').all(id);
  return device;
}

// ===========================================================================
// TOPOLOGY
// ===========================================================================

// GET /network/topology
// Returns { nodes: [...], edges: [...] } for React Flow.
router.get('/topology', (_req, res) => {
  const devices = db.prepare('SELECT * FROM network_devices').all();
  const ports   = db.prepare('SELECT * FROM ports WHERE connected_to_device_id IS NOT NULL').all();

  const nodes = devices.map(d => ({
    id:       String(d.id),
    type:     'networkDevice',
    position: { x: d.pos_x || 0, y: d.pos_y || 0 },
    data: {
      label:       d.name,
      device_type: d.device_type,
      ip_address:  d.ip_address,
      location:    d.location,
      model:       d.model,
      portCount:   db.prepare('SELECT COUNT(*) as c FROM ports WHERE device_id = ?').get(d.id).c,
      activePorts: db.prepare("SELECT COUNT(*) as c FROM ports WHERE device_id = ? AND status = 'aktiv'").get(d.id).c
    }
  }));

  // Deduplicate edges (A→B and B→A are the same physical cable)
  const seen = new Set();
  const edges = [];
  for (const p of ports) {
    if (!p.device_id || !p.connected_to_device_id) continue;  // guard against nulls
    const key = [Math.min(p.device_id, p.connected_to_device_id),
                 Math.max(p.device_id, p.connected_to_device_id)].join('-');
    if (!seen.has(key)) {
      seen.add(key);
      edges.push({
        id:     `e${p.id}`,
        source: String(p.device_id),
        target: String(p.connected_to_device_id),
        label:  p.port_label || `Port ${p.port_number}`,
        data:   { speed: p.speed, vlan: p.vlan }
      });
    }
  }

  res.json({ nodes, edges });
});

// ===========================================================================
// RACKS
// ===========================================================================

router.get('/racks', (_req, res) => {
  res.json(db.prepare('SELECT * FROM racks ORDER BY name').all());
});

router.post('/racks', (req, res) => {
  const { name, location, size_u, notes } = req.body;
  if (!name || name.trim() === '')
    return res.status(400).json({ error: 'name is required' });

  const result = db.prepare(
    'INSERT INTO racks (name, location, size_u, notes) VALUES (?, ?, ?, ?)'
  ).run(name.trim(), location || null, size_u || null, notes || null);

  res.status(201).json(db.prepare('SELECT * FROM racks WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/racks/:id', (req, res) => {
  const rack = db.prepare('SELECT * FROM racks WHERE id = ?').get(req.params.id);
  if (!rack) return res.status(404).json({ error: 'Rack not found' });

  const { name, location, size_u, notes } = req.body;
  db.prepare(`
    UPDATE racks SET name = ?, location = ?, size_u = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name      !== undefined ? name.trim() : rack.name,
    location  !== undefined ? location    : rack.location,
    size_u    !== undefined ? size_u      : rack.size_u,
    notes     !== undefined ? notes       : rack.notes,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM racks WHERE id = ?').get(req.params.id));
});

router.delete('/racks/:id', (req, res) => {
  const rack = db.prepare('SELECT id FROM racks WHERE id = ?').get(req.params.id);
  if (!rack) return res.status(404).json({ error: 'Rack not found' });
  db.prepare('DELETE FROM racks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Rack deleted' });
});

// ===========================================================================
// DEVICES
// ===========================================================================

router.get('/devices', (_req, res) => {
  const devices = db.prepare('SELECT * FROM network_devices ORDER BY name').all();
  devices.forEach(d => {
    const counts = db.prepare(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status='aktiv' THEN 1 ELSE 0 END) as active FROM ports WHERE device_id = ?"
    ).get(d.id);
    d.port_count   = counts.total;
    d.active_ports = counts.active;
  });
  res.json(devices);
});

router.get('/devices/:id', (req, res) => {
  const device = loadDeviceWithPorts(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json(device);
});

router.post('/devices', (req, res) => {
  const {
    name, device_type = 'Switch', manufacturer, model,
    asset_id, ip_address, mac_address, location,
    rack_id, rack_position, pos_x = 0, pos_y = 0, notes
  } = req.body;

  if (!name || name.trim() === '')
    return res.status(400).json({ error: 'name is required' });
  if (!VALID_DEVICE_TYPES.includes(device_type))
    return res.status(400).json({ error: `Invalid device_type. Must be one of: ${VALID_DEVICE_TYPES.join(', ')}` });

  const result = db.prepare(`
    INSERT INTO network_devices
      (name, device_type, manufacturer, model, asset_id, ip_address, mac_address,
       location, rack_id, rack_position, pos_x, pos_y, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(), device_type, manufacturer || null, model || null,
    asset_id || null, ip_address || null, mac_address || null,
    location || null, rack_id || null, rack_position || null,
    pos_x, pos_y, notes || null
  );

  res.status(201).json(loadDeviceWithPorts(result.lastInsertRowid));
});

router.put('/devices/:id', (req, res) => {
  const deviceId = req.params.id;
  const existing = db.prepare('SELECT * FROM network_devices WHERE id = ?').get(deviceId);
  if (!existing) return res.status(404).json({ error: 'Device not found' });

  const {
    name, device_type, manufacturer, model,
    asset_id, ip_address, mac_address, location,
    rack_id, rack_position, pos_x, pos_y, notes
  } = req.body;

  if (device_type && !VALID_DEVICE_TYPES.includes(device_type))
    return res.status(400).json({ error: `Invalid device_type` });

  const n = (val, old) => val !== undefined ? val : old;

  db.prepare(`
    UPDATE network_devices SET
      name = ?, device_type = ?, manufacturer = ?, model = ?,
      asset_id = ?, ip_address = ?, mac_address = ?,
      location = ?, rack_id = ?, rack_position = ?,
      pos_x = ?, pos_y = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name !== undefined ? name.trim() : existing.name,
    n(device_type,   existing.device_type),
    n(manufacturer,  existing.manufacturer),
    n(model,         existing.model),
    n(asset_id,      existing.asset_id),
    n(ip_address,    existing.ip_address),
    n(mac_address,   existing.mac_address),
    n(location,      existing.location),
    n(rack_id,       existing.rack_id),
    n(rack_position, existing.rack_position),
    n(pos_x,         existing.pos_x),
    n(pos_y,         existing.pos_y),
    n(notes,         existing.notes),
    deviceId
  );

  res.json(loadDeviceWithPorts(deviceId));
});

router.delete('/devices/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM network_devices WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Device not found' });
  db.prepare('DELETE FROM network_devices WHERE id = ?').run(req.params.id);
  res.json({ message: 'Device deleted' });
});

// ===========================================================================
// PORTS
// ===========================================================================

router.get('/devices/:id/ports', (req, res) => {
  const device = db.prepare('SELECT id FROM network_devices WHERE id = ?').get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  const ports = db.prepare(
    'SELECT * FROM ports WHERE device_id = ? ORDER BY port_number'
  ).all(req.params.id);
  res.json(ports);
});

router.post('/devices/:id/ports', (req, res) => {
  const deviceId = req.params.id;
  const device = db.prepare('SELECT id FROM network_devices WHERE id = ?').get(deviceId);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  const {
    port_number, port_label, connected_to_device_id, connected_to_port_id,
    vlan, poe_enabled = false, poe_consumption, speed = '1G', status = 'aktiv', notes
  } = req.body;

  if (port_number === undefined || port_number === null)
    return res.status(400).json({ error: 'port_number is required' });
  if (!VALID_PORT_SPEEDS.includes(speed))
    return res.status(400).json({ error: `Invalid speed. Must be one of: ${VALID_PORT_SPEEDS.join(', ')}` });
  if (!VALID_PORT_STATUSES.includes(status))
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_PORT_STATUSES.join(', ')}` });

  const result = db.prepare(`
    INSERT INTO ports
      (device_id, port_number, port_label, connected_to_device_id, connected_to_port_id,
       vlan, poe_enabled, poe_consumption, speed, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    deviceId, port_number, port_label || null,
    connected_to_device_id || null, connected_to_port_id || null,
    vlan || null, poe_enabled ? 1 : 0, poe_consumption || null,
    speed, status, notes || null
  );

  res.status(201).json(db.prepare('SELECT * FROM ports WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/devices/:id/ports/:pid', (req, res) => {
  const { id: deviceId, pid } = req.params;
  const existing = db.prepare('SELECT * FROM ports WHERE id = ? AND device_id = ?').get(pid, deviceId);
  if (!existing) return res.status(404).json({ error: 'Port not found' });

  const {
    port_number, port_label, connected_to_device_id, connected_to_port_id,
    vlan, poe_enabled, poe_consumption, speed, status, notes
  } = req.body;

  if (speed  && !VALID_PORT_SPEEDS.includes(speed))
    return res.status(400).json({ error: `Invalid speed` });
  if (status && !VALID_PORT_STATUSES.includes(status))
    return res.status(400).json({ error: `Invalid status` });

  const n = (val, old) => val !== undefined ? val : old;

  db.prepare(`
    UPDATE ports SET
      port_number = ?, port_label = ?,
      connected_to_device_id = ?, connected_to_port_id = ?,
      vlan = ?, poe_enabled = ?, poe_consumption = ?,
      speed = ?, status = ?, notes = ?
    WHERE id = ?
  `).run(
    n(port_number,              existing.port_number),
    n(port_label,               existing.port_label),
    n(connected_to_device_id,   existing.connected_to_device_id),
    n(connected_to_port_id,     existing.connected_to_port_id),
    n(vlan,                     existing.vlan),
    poe_enabled !== undefined ? (poe_enabled ? 1 : 0) : existing.poe_enabled,
    n(poe_consumption,          existing.poe_consumption),
    n(speed,                    existing.speed),
    n(status,                   existing.status),
    n(notes,                    existing.notes),
    pid
  );

  res.json(db.prepare('SELECT * FROM ports WHERE id = ?').get(pid));
});

router.delete('/devices/:id/ports/:pid', (req, res) => {
  const { id: deviceId, pid } = req.params;
  const existing = db.prepare('SELECT id FROM ports WHERE id = ? AND device_id = ?').get(pid, deviceId);
  if (!existing) return res.status(404).json({ error: 'Port not found' });
  db.prepare('DELETE FROM ports WHERE id = ?').run(pid);
  res.json({ message: 'Port deleted' });
});

module.exports = router;
