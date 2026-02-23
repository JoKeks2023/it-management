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
