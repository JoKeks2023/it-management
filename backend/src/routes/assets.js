// src/routes/assets.js
// Proxy endpoints for the Shelf API.
// These endpoints allow the frontend to look up asset details
// without exposing the Shelf API token to the browser.
//
// Endpoints:
//   GET /assets          – list/search assets from Shelf
//   GET /assets/:id      – get details for a single asset

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Build Shelf API base URL and headers from environment variables
function getShelfConfig() {
  const token = process.env.SHELF_API_TOKEN;
  const baseUrl = (process.env.SHELF_API_BASE_URL || 'https://api.shelf.nu').replace(/\/$/, '');
  return { token, baseUrl };
}

// ---------------------------------------------------------------------------
// GET /assets
// Fetches a list of assets from Shelf API.
// Optional query param: search – filter assets by name
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  const { token, baseUrl } = getShelfConfig();

  if (!token || token === 'your_shelf_api_token_here') {
    // Return empty list when no Shelf token is configured rather than erroring
    return res.json({ assets: [], configured: false });
  }

  const { search } = req.query;
  let url = `${baseUrl}/assets`;
  if (search) {
    url += `?search=${encodeURIComponent(search)}`;
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Shelf API error: ${text}` });
    }

    const data = await response.json();
    res.json({ ...data, configured: true });
  } catch (err) {
    console.error('Error fetching assets from Shelf:', err.message);
    res.status(502).json({ error: 'Failed to reach Shelf API', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /assets/:id
// Fetches details for a single Shelf asset.
// Returns id, name, type, location, serial number, etc.
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  const { token, baseUrl } = getShelfConfig();

  if (!token || token === 'your_shelf_api_token_here') {
    return res.status(503).json({ error: 'Shelf API not configured. Set SHELF_API_TOKEN in .env' });
  }

  const url = `${baseUrl}/assets/${req.params.id}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Shelf API error: ${text}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error fetching asset from Shelf:', err.message);
    res.status(502).json({ error: 'Failed to reach Shelf API', details: err.message });
  }
});

module.exports = router;
