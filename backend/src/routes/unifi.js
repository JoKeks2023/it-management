// src/routes/unifi.js
// REST API endpoints for Unifi integration.
//
// Endpoints:
//   GET    /unifi/config           – get Unifi configuration
//   POST   /unifi/config           – set Unifi configuration
//   GET    /unifi/status           – check Unifi connection status
//   POST   /unifi/sync-devices     – sync Unifi devices to network DB
//   GET    /unifi/devices          – list synced devices
//   GET    /unifi/device/:id       – get device details

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const db = require('../db/database');

const unifiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

router.use(unifiLimiter);

// In-memory config store (in production, this would be in the database)
let unifiConfig = {
  enabled: false,
  controller_url: '',
  username: '',
  password: '',
  site_id: 'default'
};

// Mock Unifi client for demonstration
class UnifiClient {
  constructor(config) {
    this.config = config;
    this.isConnected = false;
  }

  async connect() {
    try {
      // In production, this would authenticate with the actual Unify controller
      // For now, we simulate a successful connection if credentials are provided
      if (this.config.controller_url && this.config.username && this.config.password) {
        this.isConnected = true;
        console.log('✓ Unifi controller connected');
        return true;
      }
      return false;
    } catch (err) {
      console.error('✗ Unifi connection failed:', err.message);
      this.isConnected = false;
      return false;
    }
  }

  async getDevices() {
    if (!this.isConnected) return [];

    // Mock device data - in production this would fetch from Unifi API
    return [
      {
        id: 'ubnt-1',
        name: 'UniFi Dream Machine',
        type: 'controller',
        ip_address: '192.168.1.1',
        mac_address: '00:25:86:01:02:03',
        model: 'UDM',
        status: 'online',
        uptime: 2592000,
        cpu: 25,
        memory: 60,
        storage: 45
      },
      {
        id: 'ubnt-2',
        name: 'UniFi Switch 24-250W',
        type: 'switch',
        ip_address: '192.168.1.2',
        mac_address: '00:25:86:04:05:06',
        model: 'US-24-250W',
        status: 'online',
        uptime: 2592000,
        port_count: 24,
        poe_output: 150
      },
      {
        id: 'ubnt-3',
        name: 'UniFi Access Point PRO',
        type: 'access_point',
        ip_address: '192.168.1.3',
        mac_address: '00:25:86:07:08:09',
        model: 'U6-PRO',
        status: 'online',
        uptime: 2592000,
        radio_count: 2,
        clients: 12,
        signal_strength: -45
      }
    ];
  }

  async getDeviceStats() {
    const devices = await this.getDevices();
    return {
      total_devices: devices.length,
      online_devices: devices.filter(d => d.status === 'online').length,
      offline_devices: devices.filter(d => d.status === 'offline').length,
      device_types: {
        controller: devices.filter(d => d.type === 'controller').length,
        switch: devices.filter(d => d.type === 'switch').length,
        access_point: devices.filter(d => d.type === 'access_point').length,
        gateway: devices.filter(d => d.type === 'gateway').length
      }
    };
  }
}

// Singleton instance
let unifiClient = null;

// Helper to get configured client
function getUnifiClient() {
  if (!unifiConfig.enabled) return null;
  if (!unifiClient) {
    unifiClient = new UnifiClient(unifiConfig);
  }
  return unifiClient;
}

// ===========================================================================
// CONFIGURATION
// ===========================================================================

// GET /unifi/config
// Get current Unifi configuration (censored credentials)
router.get('/config', (_req, res) => {
  res.json({
    enabled: unifiConfig.enabled,
    controller_url: unifiConfig.controller_url,
    username: unifiConfig.username ? '*'.repeat(unifiConfig.username.length) : '',
    site_id: unifiConfig.site_id,
    configured: !!(unifiConfig.controller_url && unifiConfig.username && unifiConfig.password)
  });
});

// POST /unifi/config
// Update Unifi configuration
router.post('/config', async (req, res) => {
  try {
    const { controller_url, username, password, site_id, enabled } = req.body;

    if (!controller_url || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields: controller_url, username, password' });
    }

    // Validate URL format
    try {
      new URL(controller_url);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid controller URL' });
    }

    unifiConfig = {
      enabled: !!enabled,
      controller_url,
      username,
      password,
      site_id: site_id || 'default'
    };

    // Reset client to force reconnection with new config
    unifiClient = null;

    res.json({
      message: 'Unifi configuration updated',
      enabled: unifiConfig.enabled,
      controller_url: unifiConfig.controller_url
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// STATUS
// ===========================================================================

// GET /unifi/status
// Check connection status with Unifi controller
router.get('/status', async (_req, res) => {
  try {
    const enabled = unifiConfig.enabled;
    let connected = false;
    let device_count = 0;
    let error_message = null;

    if (enabled) {
      const client = getUnifiClient();
      connected = await client.connect();
      
      if (connected) {
        const stats = await client.getDeviceStats();
        device_count = stats.total_devices;
      } else {
        error_message = 'Cannot connect to controller. Check configuration.';
      }
    }

    res.json({
      enabled,
      connected,
      device_count,
      error: error_message,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.json({
      enabled: unifiConfig.enabled,
      connected: false,
      device_count: 0,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ===========================================================================
// DEVICE SYNC
// ===========================================================================

// POST /unifi/sync-devices
// Fetch devices from Unifi and sync to network database
router.post('/sync-devices', async (_req, res) => {
  try {
    if (!unifiConfig.enabled) {
      return res.status(400).json({ error: 'Unifi integration is not enabled' });
    }

    const client = getUnifiClient();
    const connected = await client.connect();

    if (!connected) {
      return res.status(503).json({ error: 'Cannot connect to Unifi controller' });
    }

    const unifiDevices = await client.getDevices();

    // Sync devices to network_devices table
    const syncedDevices = [];
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO network_devices (name, device_type, ip_address, mac_address, model, location, unifi_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const device of unifiDevices) {
      const deviceType = getDeviceType(device.type);
      stmt.run(
        device.name,
        deviceType,
        device.ip_address,
        device.mac_address,
        device.model,
        'Unifi',
        device.id,
        device.status === 'online' ? 'aktiv' : 'inaktiv'
      );
      syncedDevices.push(device);
    }

    res.json({
      message: `Synced ${unifiDevices.length} devices from Unifi`,
      devices_synced: unifiDevices.length,
      devices: syncedDevices
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /unifi/devices
// Get synced Unifi devices
router.get('/devices', (_req, res) => {
  try {
    const devices = db.prepare(`
      SELECT * FROM network_devices WHERE unifi_id IS NOT NULL ORDER BY name
    `).all();

    res.json({
      devices,
      count: devices.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /unifi/device/:id
// Get detailed info for a synced Unifi device
router.get('/device/:id', (req, res) => {
  try {
    const device = db.prepare(`
      SELECT * FROM network_devices WHERE id = ? AND unifi_id IS NOT NULL
    `).get(req.params.id);

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const ports = db.prepare(`
      SELECT * FROM ports WHERE device_id = ? ORDER BY port_number
    `).all(req.params.id);

    res.json({ device, ports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===========================================================================
// HELPERS
// ===========================================================================

function getDeviceType(unifiType) {
  const mapping = {
    'controller': 'Router',
    'gateway': 'Firewall',
    'switch': 'Switch',
    'access_point': 'Access Point',
    'camera': 'Sonstiges'
  };
  return mapping[unifiType] || 'Sonstiges';
}

module.exports = router;
