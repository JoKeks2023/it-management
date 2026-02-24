// src/services/api.js
// Central API service for communicating with the backend.
// All fetch calls go through this module so the base URL is managed in one place.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function handleResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const message = isJson ? (body.error || JSON.stringify(body)) : body;
    throw new Error(message || `HTTP ${res.status}`);
  }
  return body;
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------
export const ticketsApi = {
  /** List tickets with optional filters: { status, priority, asset_id, search } */
  list: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    const query = params.toString() ? `?${params}` : '';
    return fetch(`${BASE_URL}/tickets${query}`).then(handleResponse);
  },

  /** Get a single ticket with materials, attachments, and history */
  get: (id) => fetch(`${BASE_URL}/tickets/${id}`).then(handleResponse),

  /** Create a new ticket */
  create: (data) =>
    fetch(`${BASE_URL}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  /** Update a ticket (partial update supported) */
  update: (id, data) =>
    fetch(`${BASE_URL}/tickets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  /** Delete a ticket */
  delete: (id) =>
    fetch(`${BASE_URL}/tickets/${id}`, { method: 'DELETE' }).then(handleResponse),

  /** Get change history for a ticket */
  history: (id) => fetch(`${BASE_URL}/tickets/${id}/history`).then(handleResponse),

  /** Upload attachment files to a ticket (FormData with 'files' field) */
  uploadAttachments: (id, formData) =>
    fetch(`${BASE_URL}/tickets/${id}/attachments`, {
      method: 'POST',
      body: formData  // No Content-Type header – browser sets it with boundary
    }).then(handleResponse),

  /** Delete an attachment */
  deleteAttachment: (ticketId, attachmentId) =>
    fetch(`${BASE_URL}/tickets/${ticketId}/attachments/${attachmentId}`, {
      method: 'DELETE'
    }).then(handleResponse)
};

// ---------------------------------------------------------------------------
// Assets (Shelf API proxy)
// ---------------------------------------------------------------------------
export const assetsApi = {
  /** List assets from Shelf, optionally filtered by search string */
  list: (search = '') => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return fetch(`${BASE_URL}/assets${query}`).then(handleResponse);
  },

  /** Get a single asset by its Shelf ID */
  get: (id) => fetch(`${BASE_URL}/assets/${id}`).then(handleResponse)
};

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export const eventsApi = {
  /** List events with optional filters: { status, event_type, date_from, date_to, search } */
  list: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    const query = params.toString() ? `?${params}` : '';
    return fetch(`${BASE_URL}/events${query}`).then(handleResponse);
  },

  /** Get the next upcoming events */
  upcoming: () => fetch(`${BASE_URL}/events/upcoming`).then(handleResponse),

  /** Get a single event with equipment, attachments, and history */
  get: (id) => fetch(`${BASE_URL}/events/${id}`).then(handleResponse),

  /** Create a new event */
  create: (data) =>
    fetch(`${BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  /** Update an event (partial update) */
  update: (id, data) =>
    fetch(`${BASE_URL}/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  /** Delete an event */
  delete: (id) =>
    fetch(`${BASE_URL}/events/${id}`, { method: 'DELETE' }).then(handleResponse),

  /** Get change history for an event */
  history: (id) => fetch(`${BASE_URL}/events/${id}/history`).then(handleResponse),

  /** Update a single equipment item (e.g. toggle reserved flag) */
  updateEquipment: (eventId, eqId, data) =>
    fetch(`${BASE_URL}/events/${eventId}/equipment/${eqId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  /** Upload attachment files to an event */
  uploadAttachments: (id, formData) =>
    fetch(`${BASE_URL}/events/${id}/attachments`, {
      method: 'POST',
      body: formData
    }).then(handleResponse),

  /** Delete an event attachment */
  deleteAttachment: (eventId, attachmentId) =>
    fetch(`${BASE_URL}/events/${eventId}/attachments/${attachmentId}`, {
      method: 'DELETE'
    }).then(handleResponse)
};

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------
export const networkApi = {
  // --- Topology ---
  topology: () => fetch(`${BASE_URL}/network/topology`).then(handleResponse),

  // --- Racks ---
  listRacks: () => fetch(`${BASE_URL}/network/racks`).then(handleResponse),
  createRack: (data) =>
    fetch(`${BASE_URL}/network/racks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  updateRack: (id, data) =>
    fetch(`${BASE_URL}/network/racks/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  deleteRack: (id) =>
    fetch(`${BASE_URL}/network/racks/${id}`, { method: 'DELETE' }).then(handleResponse),

  // --- Devices ---
  listDevices: () => fetch(`${BASE_URL}/network/devices`).then(handleResponse),
  getDevice: (id) => fetch(`${BASE_URL}/network/devices/${id}`).then(handleResponse),
  createDevice: (data) =>
    fetch(`${BASE_URL}/network/devices`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  updateDevice: (id, data) =>
    fetch(`${BASE_URL}/network/devices/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  deleteDevice: (id) =>
    fetch(`${BASE_URL}/network/devices/${id}`, { method: 'DELETE' }).then(handleResponse),

  // --- Ports ---
  listPorts: (deviceId) =>
    fetch(`${BASE_URL}/network/devices/${deviceId}/ports`).then(handleResponse),
  createPort: (deviceId, data) =>
    fetch(`${BASE_URL}/network/devices/${deviceId}/ports`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  updatePort: (deviceId, portId, data) =>
    fetch(`${BASE_URL}/network/devices/${deviceId}/ports/${portId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  deletePort: (deviceId, portId) =>
    fetch(`${BASE_URL}/network/devices/${deviceId}/ports/${portId}`, {
      method: 'DELETE'
    }).then(handleResponse)
};

