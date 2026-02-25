// src/pages/SettingsPage.jsx
// Comprehensive settings and configuration page.
// Manage all system settings, integrations, and preferences in one place.

import { useState, useEffect } from 'react';
import { unifiApi } from '../services/api';

export function SettingsPage({ onShowOnboarding }) {
  const [activeTab, setActiveTab] = useState('integrations');
  const [settings, setSettings] = useState(() => {
    const stored = localStorage.getItem('appSettings');
    return stored
      ? JSON.parse(stored)
      : {
          theme: 'auto',
          language: 'de',
          autoSave: true,
          cacheExpiry: 5,
          showHints: true
        };
  });

  const [unifiConfig, setUnifiConfig] = useState(null);
  const [unifiStatus, setUnifiStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load Unifi config on mount
  useEffect(() => {
    const loadUnifiConfig = async () => {
      try {
        const [config, status] = await Promise.all([
          unifiApi.getConfig(),
          unifiApi.status()
        ]);
        setUnifiConfig(config);
        setUnifiStatus(status);
      } catch (err) {
        console.error('Failed to load Unifi config:', err);
      } finally {
        setLoading(false);
      }
    };
    loadUnifiConfig();
  }, []);

  // Save settings to localStorage
  const handleSettingChange = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    localStorage.setItem('appSettings', JSON.stringify(updated));
    setSuccess(`✓ Einstellung aktualisiert`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const SETTINGS_TABS = [
    { id: 'integrations', label: '🔌 Integrationen', icon: '🔌' },
    { id: 'display', label: '🎨 Anzeige', icon: '🎨' },
    { id: 'system', label: '⚙️ System', icon: '⚙️' },
    { id: 'about', label: 'ℹ️ Über', icon: 'ℹ️' }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          ⚙️ Einstellungen
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          Konfigurieren Sie alle Aspekte des IT Management Systems
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--color-success)',
          color: 'white',
          borderRadius: '6px',
          marginBottom: '1rem',
          fontSize: '0.9rem'
        }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--color-danger)',
          color: 'white',
          borderRadius: '6px',
          marginBottom: '1rem',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '2rem', minHeight: '60vh' }}>
        {/* Tab Navigation */}
        <aside style={{
          width: '200px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          paddingRight: '2rem',
          borderRight: '1px solid var(--border-color)'
        }}>
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'inherit',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.95rem',
                fontWeight: activeTab === tab.id ? 600 : 500,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover, rgba(0,0,0,0.05))';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ marginRight: '0.5rem' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main style={{ flex: 1 }}>
          {/* ─── INTEGRATIONS ─── */}
          {activeTab === 'integrations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '1rem' }}>
                🔌 Integrationen
              </h2>

              {/* Unifi Section */}
              <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      📡 Unifi Network Management
                    </h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
                      Synchronisieren Sie Netzwerkgeräte von Ihrem Unifi Controller
                    </p>
                  </div>
                  {!loading && unifiStatus && (
                    <div style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      backgroundColor: unifiStatus.connected ? 'var(--color-success)' : 'var(--color-danger)',
                      color: 'white',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}>
                      {unifiStatus.connected ? '🟢 Verbunden' : '🔴 Getrennt'}
                    </div>
                  )}
                </div>

                {unifiConfig && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1rem',
                    padding: '1rem',
                    backgroundColor: 'var(--bg-main)',
                    borderRadius: '6px'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Status</div>
                      <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>
                        {unifiConfig.enabled ? '✓ Aktiviert' : '✗ Deaktiviert'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Controller URL</div>
                      <div style={{ fontWeight: 600, marginTop: '0.25rem', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                        {unifiConfig.controller_url || '–'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Benutzer</div>
                      <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>
                        {unifiConfig.username || '–'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Site ID</div>
                      <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>
                        {unifiConfig.site_id || 'default'}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    onClick={() => setActiveTab('integrations')}
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
                    📡 Zur Unifi Seite
                  </button>
                </div>
              </div>

              {/* Shelf API Section */}
              <div style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.5rem',
                opacity: 0.6
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  📦 Shelf Asset Management
                </h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  Integration für professionelles Asset-Management
                </p>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  backgroundColor: 'var(--color-text-muted)',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.8rem'
                }}>
                  Bald verfügbar
                </span>
              </div>
            </div>
          )}

          {/* ─── DISPLAY ─── */}
          {activeTab === 'display' && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '2rem' }}>
                🎨 Anzeige-Einstellungen
              </h2>

              <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '500px' }}>
                {/* Theme */}
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <label style={{ display: 'block', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>🌓 Design-Modus</div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem' }}>
                      Wählen Sie zwischen Hell-, Dunkel- oder System-Design
                    </p>
                    <select
                      value={settings.theme}
                      onChange={(e) => handleSettingChange('theme', e.target.value)}
                      className="form-input"
                      style={{ width: '100%' }}
                    >
                      <option value="auto">🔄 System-Standard</option>
                      <option value="light">☀️ Hell</option>
                      <option value="dark">🌙 Dunkel</option>
                    </select>
                  </label>
                </div>

                {/* Language */}
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <label style={{ display: 'block', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>🌐 Sprache</div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem' }}>
                      Wählen Sie Ihre bevorzugte Sprache
                    </p>
                    <select
                      value={settings.language}
                      onChange={(e) => handleSettingChange('language', e.target.value)}
                      className="form-input"
                      style={{ width: '100%' }}
                    >
                      <option value="de">Deutsch</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                </div>

                {/* Cache Expiry */}
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <label style={{ display: 'block' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>⏱️ Cache-Zeit</div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem' }}>
                      Wie lange Daten im Cache gespeichert bleiben (in Minuten)
                    </p>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={settings.cacheExpiry}
                      onChange={(e) => handleSettingChange('cacheExpiry', parseInt(e.target.value) || 5)}
                      className="form-input"
                      style={{ width: '100%' }}
                    />
                  </label>
                </div>

                {/* Show Hints */}
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.showHints}
                      onChange={(e) => handleSettingChange('showHints', e.target.checked)}
                      style={{ marginRight: '0.75rem', width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>💡 Hinweise anzeigen</div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
                        Zeige hilfreiche Tipps und Hinweise in der Benutzeroberfläche
                      </p>
                    </div>
                  </label>
                </div>

                {/* Auto Save */}
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.autoSave}
                      onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                      style={{ marginRight: '0.75rem', width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>💾 Automatisches Speichern</div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
                        Speichere Änderungen automatisch während Sie tippen
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ─── SYSTEM ─── */}
          {activeTab === 'system' && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '2rem' }}>
                ⚙️ System-Einstellungen
              </h2>

              <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '600px' }}>
                {/* Onboarding */}
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>🎯 Onboarding</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Interaktive Einführung in alle Features des IT Management Systems
                  </p>
                  <button
                    onClick={() => onShowOnboarding && onShowOnboarding()}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'var(--color-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.95rem'
                    }}
                  >
                    ▶ Onboarding starten
                  </button>
                </div>

                {/* Clear Cache */}
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>🗑️ Cache leeren</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Alle gecachten Daten löschen und neu laden
                  </p>
                  <button
                    onClick={() => {
                      localStorage.removeItem('activeTab');
                      localStorage.removeItem('appSettings');
                      location.reload();
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'var(--color-warning)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.95rem'
                    }}
                  >
                    🗑️ Cache löschen
                  </button>
                </div>

                {/* Reset All Settings */}
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>⚠️ Factory Reset</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Alle Einstellungen auf Standardwerte zurücksetzen (Daten bleiben erhalten)
                  </p>
                  <button
                    onClick={() => {
                      if (confirm('Sind Sie sicher? Alle Einstellungen werden zurückgesetzt.')) {
                        localStorage.removeItem('appSettings');
                        setSettings({
                          theme: 'auto',
                          language: 'de',
                          autoSave: true,
                          cacheExpiry: 5,
                          showHints: true
                        });
                        setSuccess('✓ Einstellungen zurückgesetzt');
                        setTimeout(() => setSuccess(''), 3000);
                      }
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'var(--color-danger)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.95rem'
                    }}
                  >
                    ⚠️ Zurücksetzen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── ABOUT ─── */}
          {activeTab === 'about' && (
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '2rem' }}>
                ℹ️ Über IT Management
              </h2>

              <div style={{ maxWidth: '500px' }}>
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '2rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖥️</div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    IT Management System
                  </h3>
                  <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                    Persönliches Ticket-, Event- und Netzwerk-Management für IT-Projekte und Infrastruktur
                  </p>

                  <div style={{
                    backgroundColor: 'var(--bg-main)',
                    borderRadius: '8px',
                    padding: '1rem',
                    textAlign: 'left',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem'
                  }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Version:</strong> 2.0
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Build:</strong> 2026-02-25
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Status:</strong> ✓ Production Ready
                    </div>
                  </div>

                  <div style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '1.5rem'
                  }}>
                    <h4 style={{ marginBottom: '0.75rem', fontWeight: 600 }}>Features</h4>
                    <ul style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      textAlign: 'left',
                      fontSize: '0.85rem'
                    }}>
                      <li style={{ marginBottom: '0.5rem' }}>🏠 Unified Dashboard</li>
                      <li style={{ marginBottom: '0.5rem' }}>🎫 Ticket Management</li>
                      <li style={{ marginBottom: '0.5rem' }}>🎵 Event Management</li>
                      <li style={{ marginBottom: '0.5rem' }}>🌐 Network Topology</li>
                      <li style={{ marginBottom: '0.5rem' }}>📡 Unifi Integration</li>
                      <li style={{ marginBottom: '0.5rem' }}>📦 Inventory System</li>
                      <li>💾 Full History & Audit Trail</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
