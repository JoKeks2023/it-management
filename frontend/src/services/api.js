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
// Contacts / CRM
// ---------------------------------------------------------------------------
export const contactsApi = {
  /** List contacts with optional filters: { contact_type, search } */
  list: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    const query = params.toString() ? `?${params}` : '';
    return fetch(`${BASE_URL}/contacts${query}`).then(handleResponse);
  },

  /** Get a single contact */
  get: (id) => fetch(`${BASE_URL}/contacts/${id}`).then(handleResponse),

  /** Create a contact */
  create: (data) =>
    fetch(`${BASE_URL}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  /** Update a contact */
  update: (id, data) =>
    fetch(`${BASE_URL}/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  /** Delete a contact */
  delete: (id) =>
    fetch(`${BASE_URL}/contacts/${id}`, { method: 'DELETE' }).then(handleResponse),

  /** Add a crew member to an event */
  addCrew: (eventId, data) =>
    fetch(`${BASE_URL}/events/${eventId}/crew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  /** Update a crew member */
  updateCrew: (eventId, crewId, data) =>
    fetch(`${BASE_URL}/events/${eventId}/crew/${crewId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  /** Remove a crew member from an event */
  deleteCrew: (eventId, crewId) =>
    fetch(`${BASE_URL}/events/${eventId}/crew/${crewId}`, { method: 'DELETE' }).then(handleResponse)
};

// ---------------------------------------------------------------------------
// Inventory / Equipment Catalog
// ---------------------------------------------------------------------------
export const inventoryApi = {
  list: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    const query = params.toString() ? `?${params}` : '';
    return fetch(`${BASE_URL}/inventory${query}`).then(handleResponse);
  },
  categories: () => fetch(`${BASE_URL}/inventory/categories`).then(handleResponse),
  get: (id) => fetch(`${BASE_URL}/inventory/${id}`).then(handleResponse),
  create: (data) =>
    fetch(`${BASE_URL}/inventory`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  update: (id, data) =>
    fetch(`${BASE_URL}/inventory/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  delete: (id) => fetch(`${BASE_URL}/inventory/${id}`, { method: 'DELETE' }).then(handleResponse),
  availability: (id, params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.append(k, v); });
    return fetch(`${BASE_URL}/inventory/${id}/availability${qs.toString() ? '?' + qs : ''}`).then(handleResponse);
  },

  // Event inventory lines
  listEventItems: (eventId) =>
    fetch(`${BASE_URL}/events/${eventId}/inventory-items`).then(handleResponse),
  addEventItem: (eventId, data) =>
    fetch(`${BASE_URL}/events/${eventId}/inventory-items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  updateEventItem: (eventId, lineId, data) =>
    fetch(`${BASE_URL}/events/${eventId}/inventory-items/${lineId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  deleteEventItem: (eventId, lineId) =>
    fetch(`${BASE_URL}/events/${eventId}/inventory-items/${lineId}`, { method: 'DELETE' }).then(handleResponse),

  // Repair logs
  getRepairs: (itemId) => fetch(`${BASE_URL}/inventory/${itemId}/repairs`).then(handleResponse),
  createRepair: (itemId, data) =>
    fetch(`${BASE_URL}/inventory/${itemId}/repairs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  updateRepair: (itemId, repairId, data) =>
    fetch(`${BASE_URL}/inventory/${itemId}/repairs/${repairId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  deleteRepair: (itemId, repairId) =>
    fetch(`${BASE_URL}/inventory/${itemId}/repairs/${repairId}`, { method: 'DELETE' }).then(handleResponse)
};

// ---------------------------------------------------------------------------
// Quotes & Invoices
// ---------------------------------------------------------------------------
export const quotesApi = {
  list: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    const query = params.toString() ? `?${params}` : '';
    return fetch(`${BASE_URL}/quotes${query}`).then(handleResponse);
  },
  get: (id) => fetch(`${BASE_URL}/quotes/${id}`).then(handleResponse),
  create: (data) =>
    fetch(`${BASE_URL}/quotes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  update: (id, data) =>
    fetch(`${BASE_URL}/quotes/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  delete: (id) => fetch(`${BASE_URL}/quotes/${id}`, { method: 'DELETE' }).then(handleResponse),
  fromEvent: (eventId, data = {}) =>
    fetch(`${BASE_URL}/quotes/from-event/${eventId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  addItem: (quoteId, data) =>
    fetch(`${BASE_URL}/quotes/${quoteId}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  updateItem: (quoteId, itemId, data) =>
    fetch(`${BASE_URL}/quotes/${quoteId}/items/${itemId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  deleteItem: (quoteId, itemId) =>
    fetch(`${BASE_URL}/quotes/${quoteId}/items/${itemId}`, { method: 'DELETE' }).then(handleResponse)
};

// ---------------------------------------------------------------------------
// Equipment Sets / Packages
// ---------------------------------------------------------------------------
export const setsApi = {
  list: () => fetch(`${BASE_URL}/sets`).then(handleResponse),
  get:  (id) => fetch(`${BASE_URL}/sets/${id}`).then(handleResponse),
  create: (data) =>
    fetch(`${BASE_URL}/sets`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  update: (id, data) =>
    fetch(`${BASE_URL}/sets/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  delete: (id) => fetch(`${BASE_URL}/sets/${id}`, { method: 'DELETE' }).then(handleResponse),
  addItem: (setId, data) =>
    fetch(`${BASE_URL}/sets/${setId}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  updateItem: (setId, itemId, data) =>
    fetch(`${BASE_URL}/sets/${setId}/items/${itemId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  deleteItem: (setId, itemId) =>
    fetch(`${BASE_URL}/sets/${setId}/items/${itemId}`, { method: 'DELETE' }).then(handleResponse),
  applyToEvent: (setId, eventId, data = {}) =>
    fetch(`${BASE_URL}/sets/${setId}/apply/${eventId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse)
};

// ---------------------------------------------------------------------------
// Sub-rental (Fremdmiete)
// ---------------------------------------------------------------------------
export const subrentalApi = {
  list:   (eventId) => fetch(`${BASE_URL}/events/${eventId}/subrentals`).then(handleResponse),
  create: (eventId, data) =>
    fetch(`${BASE_URL}/events/${eventId}/subrentals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  update: (eventId, srId, data) =>
    fetch(`${BASE_URL}/events/${eventId}/subrentals/${srId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(handleResponse),
  delete: (eventId, srId) =>
    fetch(`${BASE_URL}/events/${eventId}/subrentals/${srId}`, { method: 'DELETE' }).then(handleResponse)
};

// ---------------------------------------------------------------------------
// Reports & Statistics
// ---------------------------------------------------------------------------
export const reportsApi = {
  overview:  () => fetch(`${BASE_URL}/reports/overview`).then(handleResponse),
  revenue:   (months = 12) => fetch(`${BASE_URL}/reports/revenue?months=${months}`).then(handleResponse),
  equipment: (limit = 10)  => fetch(`${BASE_URL}/reports/equipment?limit=${limit}`).then(handleResponse),
  crew:      (limit = 10)  => fetch(`${BASE_URL}/reports/crew?limit=${limit}`).then(handleResponse),
  events:    (months = 12) => fetch(`${BASE_URL}/reports/events?months=${months}`).then(handleResponse)
};

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------
export const portfolioApi = {
  /** List portfolio items with optional filters: { category, tag, search } */
  list: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    const query = params.toString() ? `?${params}` : '';
    return fetch(`${BASE_URL}/portfolio${query}`).then(handleResponse);
  },

  /** Get a single portfolio item with its media list */
  get: (id) => fetch(`${BASE_URL}/portfolio/${id}`).then(handleResponse),

  /** Create a new portfolio item */
  create: (data) =>
    fetch(`${BASE_URL}/portfolio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  /** Update a portfolio item (partial update supported) */
  update: (id, data) =>
    fetch(`${BASE_URL}/portfolio/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  /** Delete a portfolio item */
  delete: (id) =>
    fetch(`${BASE_URL}/portfolio/${id}`, { method: 'DELETE' }).then(handleResponse),

  /** Upload media files to a portfolio item (FormData with 'files' field) */
  uploadMedia: (id, formData) =>
    fetch(`${BASE_URL}/portfolio/${id}/media`, {
      method: 'POST',
      body: formData
    }).then(handleResponse),

  /** Delete a media file from a portfolio item */
  deleteMedia: (itemId, mediaId) =>
    fetch(`${BASE_URL}/portfolio/${itemId}/media/${mediaId}`, {
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
// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export const projectsApi = {
  list: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    const query = params.toString() ? `?${params}` : '';
    return fetch(`${BASE_URL}/projects${query}`).then(handleResponse);
  },
  get: (id) => fetch(`${BASE_URL}/projects/${id}`).then(handleResponse),
  create: (data) => fetch(`${BASE_URL}/projects`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(handleResponse),
  update: (id, data) => fetch(`${BASE_URL}/projects/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(handleResponse),
  delete: (id) => fetch(`${BASE_URL}/projects/${id}`, { method: 'DELETE' }).then(handleResponse),
  uploadMedia: (id, formData) => fetch(`${BASE_URL}/projects/${id}/media`, {
    method: 'POST', body: formData
  }).then(handleResponse),
  deleteMedia: (id, mediaId) => fetch(`${BASE_URL}/projects/${id}/media/${mediaId}`, {
    method: 'DELETE'
  }).then(handleResponse),
  generateInvoice: (id, data = {}) => fetch(`${BASE_URL}/projects/${id}/generate-invoice`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(handleResponse),
  generateClientsite: (id, data = {}) => fetch(`${BASE_URL}/projects/${id}/generate-clientsite`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(handleResponse)
};

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
export const templatesApi = {
  list: () => fetch(`${BASE_URL}/templates`).then(handleResponse),
  get: (id) => fetch(`${BASE_URL}/templates/${id}`).then(handleResponse),
  create: (data) => fetch(`${BASE_URL}/templates`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(handleResponse),
  update: (id, data) => fetch(`${BASE_URL}/templates/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(handleResponse),
  delete: (id) => fetch(`${BASE_URL}/templates/${id}`, { method: 'DELETE' }).then(handleResponse)
};

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------
export const maintenanceApi = {
  list: () => fetch(`${BASE_URL}/maintenance`).then(handleResponse),
  due: () => fetch(`${BASE_URL}/maintenance/due`).then(handleResponse),
  get: (id) => fetch(`${BASE_URL}/maintenance/${id}`).then(handleResponse),
  create: (data) => fetch(`${BASE_URL}/maintenance`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(handleResponse),
  update: (id, data) => fetch(`${BASE_URL}/maintenance/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(handleResponse),
  delete: (id) => fetch(`${BASE_URL}/maintenance/${id}`, { method: 'DELETE' }).then(handleResponse),
  complete: (id, data = {}) => fetch(`${BASE_URL}/maintenance/${id}/complete`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(handleResponse),
  addLog: (id, data) => fetch(`${BASE_URL}/maintenance/${id}/log`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(handleResponse)
};

// ---------------------------------------------------------------------------
// Light Presets
// ---------------------------------------------------------------------------
export const lightpresetsApi = {
  list: () => fetch(`${BASE_URL}/lightpresets`).then(handleResponse),
  get: (id) => fetch(`${BASE_URL}/lightpresets/${id}`).then(handleResponse),
  create: (data) => fetch(`${BASE_URL}/lightpresets`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(handleResponse),
  update: (id, data) => fetch(`${BASE_URL}/lightpresets/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(handleResponse),
  delete: (id) => fetch(`${BASE_URL}/lightpresets/${id}`, { method: 'DELETE' }).then(handleResponse),
  analyzeAudio: (formData) => fetch(`${BASE_URL}/lightpresets/analyze-audio`, {
    method: 'POST', body: formData
  }).then(handleResponse)
};

// ---------------------------------------------------------------------------
// Setlists
// ---------------------------------------------------------------------------
export const setlistsApi = {
  list: () => fetch(`${BASE_URL}/setlists`).then(handleResponse),
  get: (id) => fetch(`${BASE_URL}/setlists/${id}`).then(handleResponse),
  create: (data) => fetch(`${BASE_URL}/setlists`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(handleResponse),
  update: (id, data) => fetch(`${BASE_URL}/setlists/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(handleResponse),
  delete: (id) => fetch(`${BASE_URL}/setlists/${id}`, { method: 'DELETE' }).then(handleResponse),
  addTrack: (id, data) => fetch(`${BASE_URL}/setlists/${id}/tracks`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(handleResponse),
  updateTrack: (id, trackId, data) => fetch(`${BASE_URL}/setlists/${id}/tracks/${trackId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  }).then(handleResponse),
  deleteTrack: (id, trackId) => fetch(`${BASE_URL}/setlists/${id}/tracks/${trackId}`, {
    method: 'DELETE'
  }).then(handleResponse),
  exportUrl: (id, format = 'json') => `${BASE_URL}/setlists/${id}/export?format=${format}`
};
