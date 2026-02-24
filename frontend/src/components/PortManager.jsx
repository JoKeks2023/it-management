// src/components/PortManager.jsx
// Shows the port list for a selected device and allows inline editing:
// status, VLAN, PoE, connections between devices.

import { useState, useEffect } from 'react';
import { networkApi } from '../services/api';

const PORT_SPEEDS   = ['100M', '1G', '2.5G', '10G', '25G', '40G', '100G'];
const PORT_STATUSES = ['aktiv', 'inaktiv', 'reserviert'];

function PortStatusIcon({ status }) {
  const colors = { aktiv: 'var(--color-success)', inaktiv: '#94a3b8', reserviert: 'var(--color-warning)' };
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      background: colors[status] || '#94a3b8', flexShrink: 0
    }} title={status} />
  );
}

export function PortManager({ device, allDevices, onClose }) {
  const [ports,   setPorts]   = useState(device.ports || []);
  const [editing, setEditing] = useState(null);   // port id being edited
  const [form,    setForm]    = useState({});
  const [adding,  setAdding]  = useState(false);
  const [newPort, setNewPort] = useState({ port_number: '', port_label: '', speed: '1G', status: 'aktiv', vlan: '', poe_enabled: false });
  const [error,   setError]   = useState('');

  // Reload ports when device changes
  useEffect(() => {
    networkApi.listPorts(device.id).then(setPorts).catch(() => {});
  }, [device.id]);

  const startEdit = (port) => {
    setEditing(port.id);
    setForm({
      port_label:             port.port_label             || '',
      vlan:                   port.vlan                   || '',
      poe_enabled:            !!port.poe_enabled,
      poe_consumption:        port.poe_consumption        || '',
      speed:                  port.speed                  || '1G',
      status:                 port.status                 || 'aktiv',
      connected_to_device_id: port.connected_to_device_id || '',
      notes:                  port.notes                  || ''
    });
    setError('');
  };

  const saveEdit = async (portId) => {
    try {
      const poeW = parseFloat(form.poe_consumption);
      const payload = {
        ...form,
        poe_consumption:        (!isNaN(poeW) && form.poe_consumption !== '') ? poeW : null,
        connected_to_device_id: form.connected_to_device_id !== '' ? parseInt(form.connected_to_device_id) : null
      };
      const updated = await networkApi.updatePort(device.id, portId, payload);
      setPorts(ps => ps.map(p => p.id === portId ? updated : p));
      setEditing(null);
    } catch (err) { setError(err.message); }
  };

  const deletePort = async (portId) => {
    if (!confirm('Port wirklich löschen?')) return;
    try {
      await networkApi.deletePort(device.id, portId);
      setPorts(ps => ps.filter(p => p.id !== portId));
    } catch (err) { setError(err.message); }
  };

  const addPort = async () => {
    if (!newPort.port_number) { setError('Port-Nummer erforderlich'); return; }
    try {
      const created = await networkApi.createPort(device.id, {
        ...newPort,
        port_number: parseInt(newPort.port_number)
      });
      setPorts(ps => [...ps, created].sort((a, b) => a.port_number - b.port_number));
      setNewPort({ port_number: '', port_label: '', speed: '1G', status: 'aktiv', vlan: '', poe_enabled: false });
      setAdding(false);
      setError('');
    } catch (err) { setError(err.message); }
  };

  const freePortCount = ports.filter(p => p.status === 'aktiv' && !p.connected_to_device_id).length;

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <h2>🔌 {device.name} – Port-Verwaltung</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <span className="text-muted text-sm">{freePortCount} freie Ports</span>
            <button className="btn-icon" onClick={onClose} aria-label="Schließen">✕</button>
          </div>
        </div>

        <div style={{ padding: '1rem', overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
          {error && <div className="error-msg">{error}</div>}

          <table className="ticket-table" style={{ fontSize: '.8rem' }}>
            <thead>
              <tr>
                <th style={{ width: 50 }}>Port</th>
                <th>Label</th>
                <th>Status</th>
                <th>VLAN</th>
                <th>Speed</th>
                <th>PoE</th>
                <th>Verbunden mit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ports.map(port => (
                editing === port.id ? (
                  <tr key={port.id} style={{ background: 'var(--color-surface-hover)' }}>
                    <td style={{ fontWeight: 600 }}>{port.port_number}</td>
                    <td>
                      <input className="form-input" style={{ padding: '.25rem .4rem', fontSize: '.8rem' }}
                        value={form.port_label} onChange={e => setForm(f => ({ ...f, port_label: e.target.value }))} />
                    </td>
                    <td>
                      <select className="form-select" style={{ padding: '.25rem .4rem', fontSize: '.8rem' }}
                        value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                        {PORT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <input className="form-input" style={{ padding: '.25rem .4rem', fontSize: '.8rem', width: 70 }}
                        value={form.vlan} onChange={e => setForm(f => ({ ...f, vlan: e.target.value }))}
                        placeholder="z.B. 100" />
                    </td>
                    <td>
                      <select className="form-select" style={{ padding: '.25rem .4rem', fontSize: '.8rem' }}
                        value={form.speed} onChange={e => setForm(f => ({ ...f, speed: e.target.value }))}>
                        {PORT_SPEEDS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <input type="checkbox" checked={form.poe_enabled}
                        onChange={e => setForm(f => ({ ...f, poe_enabled: e.target.checked }))} />
                    </td>
                    <td>
                      <select className="form-select" style={{ padding: '.25rem .4rem', fontSize: '.8rem' }}
                        value={form.connected_to_device_id}
                        onChange={e => setForm(f => ({ ...f, connected_to_device_id: e.target.value }))}>
                        <option value="">– kein –</option>
                        {allDevices.filter(d => d.id !== device.id).map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '.3rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => saveEdit(port.id)}>✓</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={port.id} onClick={() => startEdit(port)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600 }}>{port.port_number}</td>
                    <td>{port.port_label || <span className="text-muted">–</span>}</td>
                    <td><PortStatusIcon status={port.status} /> {port.status}</td>
                    <td>{port.vlan || <span className="text-muted">–</span>}</td>
                    <td>{port.speed}</td>
                    <td>{port.poe_enabled ? '⚡' : '–'}</td>
                    <td className="text-muted">
                      {port.connected_to_device_id
                        ? (allDevices.find(d => d.id === port.connected_to_device_id)?.name || `ID ${port.connected_to_device_id}`)
                        : '–'}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm"
                        onClick={e => { e.stopPropagation(); deletePort(port.id); }}
                        aria-label="Port löschen">🗑</button>
                    </td>
                  </tr>
                )
              ))}

              {/* Add new port row */}
              {adding && (
                <tr style={{ background: '#f0fdf4' }}>
                  <td>
                    <input className="form-input" style={{ padding: '.25rem .4rem', fontSize: '.8rem', width: 60 }}
                      type="number" placeholder="Nr." value={newPort.port_number}
                      onChange={e => setNewPort(p => ({ ...p, port_number: e.target.value }))} />
                  </td>
                  <td>
                    <input className="form-input" style={{ padding: '.25rem .4rem', fontSize: '.8rem' }}
                      placeholder="Label" value={newPort.port_label}
                      onChange={e => setNewPort(p => ({ ...p, port_label: e.target.value }))} />
                  </td>
                  <td>
                    <select className="form-select" style={{ padding: '.25rem .4rem', fontSize: '.8rem' }}
                      value={newPort.status} onChange={e => setNewPort(p => ({ ...p, status: e.target.value }))}>
                      {PORT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <input className="form-input" style={{ padding: '.25rem .4rem', fontSize: '.8rem', width: 70 }}
                      placeholder="VLAN" value={newPort.vlan}
                      onChange={e => setNewPort(p => ({ ...p, vlan: e.target.value }))} />
                  </td>
                  <td>
                    <select className="form-select" style={{ padding: '.25rem .4rem', fontSize: '.8rem' }}
                      value={newPort.speed} onChange={e => setNewPort(p => ({ ...p, speed: e.target.value }))}>
                      {PORT_SPEEDS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <input type="checkbox" checked={newPort.poe_enabled}
                      onChange={e => setNewPort(p => ({ ...p, poe_enabled: e.target.checked }))} />
                  </td>
                  <td></td>
                  <td>
                    <div style={{ display: 'flex', gap: '.3rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={addPort}>✓</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setError(''); }}>✕</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!adding && (
            <button className="btn btn-ghost btn-sm mt-4" onClick={() => setAdding(true)}>
              + Port hinzufügen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
