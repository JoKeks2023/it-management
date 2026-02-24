// src/pages/NetworkDashboard.jsx
// Network management page:
//   - Stats bar
//   - Topology view (React Flow)
//   - Device list with port counts
//   - Port Manager modal per device

import { useState, useEffect, useCallback } from 'react';
import { networkApi } from '../services/api';
import { StatusBadge }        from '../components/StatusBadge';
import { NetworkDeviceForm }  from '../components/NetworkDeviceForm';
import { NetworkTopology }    from '../components/NetworkTopology';
import { PortManager }        from '../components/PortManager';

const DEVICE_TYPES = ['Router', 'Switch', 'Access Point', 'Patchpanel', 'Firewall', 'Server', 'Sonstiges'];

export function NetworkDashboard() {
  const [devices,      setDevices]      = useState([]);
  const [racks,        setRacks]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [showCreate,   setShowCreate]   = useState(false);
  const [editDevice,   setEditDevice]   = useState(null);
  const [portDevice,   setPortDevice]   = useState(null);  // full device with ports
  const [topoKey,      setTopoKey]      = useState(0);     // bump to reload topology
  const [activeTab,    setActiveTab]    = useState('topology');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [devs, rks] = await Promise.all([networkApi.listDevices(), networkApi.listRacks()]);
      setDevices(devs);
      setRacks(rks);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (device) => {
    setShowCreate(false);
    setDevices(prev => [...prev, { ...device, port_count: 0, active_ports: 0 }]);
    setTopoKey(k => k + 1);
  };

  const handleUpdated = (device) => {
    setEditDevice(null);
    setDevices(prev => prev.map(d => d.id === device.id ? { ...d, ...device } : d));
    setTopoKey(k => k + 1);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Gerät wirklich löschen? Alle zugehörigen Ports werden ebenfalls gelöscht.')) return;
    try {
      await networkApi.deleteDevice(id);
      setDevices(prev => prev.filter(d => d.id !== id));
      setTopoKey(k => k + 1);
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  const openPortManager = async (device) => {
    try {
      const full = await networkApi.getDevice(device.id);
      setPortDevice(full);
    } catch (err) { alert('Fehler: ' + err.message); }
  };

  const handleTopologyNodeClick = (nodeId) => {
    const dev = devices.find(d => String(d.id) === String(nodeId));
    if (dev) openPortManager(dev);
  };

  // Stats
  const stats = {
    total:     devices.length,
    switches:  devices.filter(d => d.device_type === 'Switch').length,
    aps:       devices.filter(d => d.device_type === 'Access Point').length,
    totalPorts: devices.reduce((s, d) => s + (d.port_count || 0), 0),
    activePorts: devices.reduce((s, d) => s + (d.active_ports || 0), 0)
  };

  const filteredDevices = devices.filter(d => {
    if (typeFilter   && d.device_type !== typeFilter) return false;
    if (searchFilter && !d.name.toLowerCase().includes(searchFilter.toLowerCase()) &&
        !(d.ip_address || '').includes(searchFilter)) return false;
    return true;
  });

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Geräte</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{stats.switches}</div>
          <div className="stat-label">Switches</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.aps}</div>
          <div className="stat-label">Access Points</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.activePorts}</div>
          <div className="stat-label">Aktive Ports</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>{racks.length}</div>
          <div className="stat-label">Racks</div>
        </div>
      </div>

      {/* Tab bar: Topology / Geräte */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '.5rem' }}>
        <button
          className={`tab-btn${activeTab === 'topology' ? ' active' : ''}`}
          onClick={() => setActiveTab('topology')}>🗺️ Topologie</button>
        <button
          className={`tab-btn${activeTab === 'devices' ? ' active' : ''}`}
          onClick={() => setActiveTab('devices')}>📋 Geräteliste</button>
        <button className="btn btn-primary ml-auto btn-sm" onClick={() => setShowCreate(true)}>
          + Neues Gerät
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {/* ── Topology ─────────────────────────────────── */}
      {activeTab === 'topology' && !loading && (
        <div>
          <NetworkTopology key={topoKey} onNodeClick={handleTopologyNodeClick} />
          <p className="text-muted" style={{ marginTop: '.5rem', fontSize: '.78rem', textAlign: 'center' }}>
            Geräte verschieben durch Drag &amp; Drop · Klicken zum Port-Management öffnen
          </p>
        </div>
      )}

      {/* ── Device list ──────────────────────────────── */}
      {activeTab === 'devices' && (
        <>
          <div className="filter-bar">
            <input className="form-input" placeholder="🔍 Name oder IP…"
              value={searchFilter} onChange={e => setSearchFilter(e.target.value)} />
            <select className="form-select" value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}>
              <option value="">Alle Typen</option>
              {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button className="btn btn-ghost btn-sm"
              onClick={() => { setTypeFilter(''); setSearchFilter(''); }}>✕ Reset</button>
          </div>

          <div className="card">
            {loading ? (
              <div className="centered"><div className="spinner" /></div>
            ) : filteredDevices.length === 0 ? (
              <div className="centered">
                <p className="text-muted">Keine Geräte. Füge dein erstes Netzwerkgerät hinzu!</p>
              </div>
            ) : (
              <table className="ticket-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Typ</th>
                    <th>Hersteller / Modell</th>
                    <th>IP-Adresse</th>
                    <th>Standort</th>
                    <th>Ports</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 500 }}>{d.name}</td>
                      <td><StatusBadge value={d.device_type} /></td>
                      <td className="text-muted">
                        {[d.manufacturer, d.model].filter(Boolean).join(' ') || '–'}
                      </td>
                      <td className="text-muted" style={{ fontFamily: 'monospace', fontSize: '.8rem' }}>
                        {d.ip_address || '–'}
                      </td>
                      <td className="text-muted">{d.location || '–'}</td>
                      <td>
                        <span style={{ fontSize: '.8rem' }}>
                          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                            {d.active_ports}
                          </span>
                          <span className="text-muted">/{d.port_count}</span>
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '.3rem' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openPortManager(d)}
                            title="Ports verwalten">🔌</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditDevice(d)}
                            title="Bearbeiten">✏️</button>
                          <button className="btn btn-ghost btn-sm" onClick={e => handleDelete(d.id, e)}
                            title="Löschen">🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {showCreate && (
        <NetworkDeviceForm
          device={null} racks={racks}
          onSave={handleCreated} onClose={() => setShowCreate(false)} />
      )}
      {editDevice && (
        <NetworkDeviceForm
          device={editDevice} racks={racks}
          onSave={handleUpdated} onClose={() => setEditDevice(null)} />
      )}
      {portDevice && (
        <PortManager
          device={portDevice}
          allDevices={devices}
          onClose={() => { setPortDevice(null); load(); setTopoKey(k => k + 1); }} />
      )}
    </div>
  );
}
