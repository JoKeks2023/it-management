// src/pages/Setlist.jsx
// Setlist page: combines SetlistManager + LightShowPreview for DMX.

import { useState } from 'react';
import { SetlistManager } from '../components/SetlistManager';
import { LightShowPreview } from '../components/LightShowPreview';
import { lightpresetsApi } from '../services/api';

export function Setlist() {
  const [showLightShow, setShowLightShow] = useState(false);
  const [presets, setPresets]             = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [loadingPresets, setLoadingPresets] = useState(false);

  async function loadPresets() {
    if (presets.length > 0) {
      setShowLightShow(!showLightShow);
      return;
    }
    setLoadingPresets(true);
    try {
      const list = await lightpresetsApi.list();
      setPresets(list);
      if (list.length > 0) setSelectedPreset(list[0]);
      setShowLightShow(true);
    } catch (_) {}
    finally { setLoadingPresets(false); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2>🎧 Setlists & 💡 Light Show</h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={loadPresets}
          disabled={loadingPresets}
        >
          {loadingPresets ? '⏳' : showLightShow ? '🎧 Setlists' : '💡 Light Show Preview'}
        </button>
      </div>

      {showLightShow ? (
        <div>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-header">💡 Light Show Visualizer</div>
            <div className="card-body">
              {/* Preset selector */}
              {presets.length > 0 && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Preset auswählen</label>
                  <select
                    className="form-select"
                    style={{ maxWidth: 320 }}
                    value={selectedPreset?.id || ''}
                    onChange={e => {
                      const p = presets.find(p => p.id === Number(e.target.value));
                      setSelectedPreset(p || null);
                    }}
                  >
                    <option value="">– Audio-Analyse –</option>
                    {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <LightShowPreview
                dmxJson={selectedPreset?.dmx_json || null}
              />
            </div>
          </div>
        </div>
      ) : (
        <SetlistManager />
      )}
    </div>
  );
}
