// src/pages/UnifiDashboard.jsx
// Unifi integration dashboard and settings.
// Displays Unifi device status, configuration, and sync controls.

import { useState, useEffect } from 'react';
import { unifiApi } from '../services/api';

export function UnifiDashboard() {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [formData, setFormData] = useState({
    controller_url: '',
    username: '',
    password: '',
    site_id: 'default',
    enabled: false
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [configData, statusData, devicesData] = await Promise.all([
          unifiApi.getConfig(),
          unifiApi.status(),
          unifiApi.listDevices().catch(() => ({ devices: [] }))
        ]);

        setConfig(configData);
        setStatus(statusData);
        setDevices(devicesData.devices || []);

        setFormData(prev => ({
          ...prev,
          controller_url: configData.controller_url || '',
          username: configData.username || '',
          site_id: configData.site_id || 'default',
          enabled: configData.enabled || false
        }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveConfig = async () => {
    try {
      setError('');
      const response = await unifiApi.setConfig(formData);
      setConfig(response);
      setShowConfig(false);
      // Reload status
      const statusData = await unifiApi.status();
      setStatus(statusData);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSyncDevices = async () => {
    try {
      setError('');
      setSyncing(true);
      const result = await unifiApi.syncDevices();
      setDevices(result.devices || []);
      alert(`✓ ${result.devices_synced} Geräte synchronisiert!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshStatus = async () => {
    try {
      setError('');
      const statusData = await unifiApi.status();
      setStatus(statusData);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p>Unifi Dashboard wird geladen...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          📡 Unifi Integration
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Verbinden Sie Ihren Unifi Controller, um Netzwerkgeräte zu synchronisieren
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--color-danger)',
          color: 'white',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Status Card */}
      {status && (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Status</h2>
            <button
              onClick={handleRefreshStatus}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--color-info)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              🔄 Aktualisieren
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                Status
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: status.enabled ? (status.connected ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-text-muted)'
              }}>
                {!status.enabled ? 'Deaktiviert' : status.connected ? '🟢 Verbunden' : '🔴 Getrennt'}
              </div>
            </div>

            {status.connected && (
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                  Geräte
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  color: 'var(--color-primary)'
                }}>
                  {status.device_count}
                </div>
              </div>
            )}

            <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                Zuletzt überprüft
              </div>
              <div style={{
                fontSize: '0.9rem',
                fontWeight: 500
              }}>
                {new Date(status.timestamp).toLocaleTimeString('de-DE')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Section */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Konfiguration</h2>
          <button
            onClick={() => setShowConfig(!showConfig)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {showConfig ? '✕ Abbrechen' : '✎ Bearbeiten'}
          </button>
        </div>

        {!showConfig ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                Controller URL
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                {config?.controller_url || 'Nicht konfiguriert'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                Benutzer
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                {config?.username || 'Nicht konfiguriert'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                Site ID
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                {config?.site_id || 'default'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  name="enabled"
                  checked={formData.enabled}
                  onChange={handleFormChange}
                  style={{ marginRight: '0.5rem' }}
                />
                Unifi Integration aktivieren
              </label>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Controller URL
              </label>
              <input
                type="url"
                name="controller_url"
                placeholder="https://192.168.1.1:8443"
                value={formData.controller_url}
                onChange={handleFormChange}
                className="form-input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Benutzername
              </label>
              <input
                type="text"
                name="username"
                placeholder="admin@unifi.local"
                value={formData.username}
                onChange={handleFormChange}
                className="form-input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Passwort
              </label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleFormChange}
                className="form-input"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Site ID
              </label>
              <input
                type="text"
                name="site_id"
                placeholder="default"
                value={formData.site_id}
                onChange={handleFormChange}
                className="form-input"
                style={{ width: '100%' }}
              />
            </div>

            <button
              onClick={handleSaveConfig}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--color-success)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 600
              }}
            >
              ✓ Speichern
            </button>
          </div>
        )}
      </div>

      {/* Sync Section */}
      {status?.connected && (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '1rem' }}>
            Geräte synchronisieren
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Synchronisieren Sie Ihre Unifi Controller-Geräte mit der Netzwerkdatenbank.
          </p>
          <button
            onClick={handleSyncDevices}
            disabled={syncing}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: syncing ? 'var(--color-text-muted)' : 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: syncing ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600
            }}
          >
            {syncing ? 'Synchronisierung läuft...' : '🔄 Geräte synchronisieren'}
          </button>
        </div>
      )}

      {/* Devices List */}
      {devices.length > 0 && (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '1rem' }}>
            Synchronisierte Geräte ({devices.length})
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Typ</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>IP-Adresse</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>MAC</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem' }}>{device.name}</td>
                    <td style={{ padding: '0.75rem' }}>{device.device_type}</td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{device.ip_address}</td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>{device.mac_address}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        backgroundColor: device.status === 'aktiv' ? 'var(--color-success)' : 'var(--color-danger)',
                        color: 'white',
                        fontSize: '0.85rem'
                      }}>
                        {device.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {devices.length === 0 && status?.connected && (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Keine synchronisierten Geräte. Klicken Sie auf "Geräte synchronisieren", um zu beginnen.
          </p>
        </div>
      )}
    </div>
  );
}
