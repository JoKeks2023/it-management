// src/components/LightShowPreview.jsx
// Visualises a DMX JSON preset by animating colored boxes/circles.
// Also supports audio upload → backend analysis → DMX preview.

import { useState, useEffect, useRef } from 'react';
import { lightpresetsApi } from '../services/api';

/**
 * @param {Object} props
 * @param {Object} [props.dmxJson]   – pre-loaded DMX JSON { duration_ms, fps, channels }
 * @param {number} [props.presetId]  – if set, loads preset from API
 */
export function LightShowPreview({ dmxJson: initialDmx, presetId }) {
  const [dmx, setDmx]               = useState(initialDmx || null);
  const [playing, setPlaying]        = useState(false);
  const [frame, setFrame]            = useState(0);
  const [analyzing, setAnalyzing]    = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const intervalRef                  = useRef(null);
  const fileInputRef                 = useRef(null);

  // Load preset if presetId provided
  useEffect(() => {
    if (presetId) {
      lightpresetsApi.get(presetId)
        .then(p => setDmx(p.dmx_json))
        .catch(() => {});
    }
  }, [presetId]);

  // Update dmx if prop changes
  useEffect(() => {
    if (initialDmx) setDmx(initialDmx);
  }, [initialDmx]);

  // Animation loop
  useEffect(() => {
    if (!playing || !dmx) return;
    const fps = dmx.fps || 20;
    const totalFrames = dmx.channels?.[0]?.values?.length || 0;

    intervalRef.current = setInterval(() => {
      setFrame(f => (f + 1) % (totalFrames || 1));
    }, 1000 / fps);

    return () => clearInterval(intervalRef.current);
  }, [playing, dmx]);

  function stop() {
    setPlaying(false);
    clearInterval(intervalRef.current);
    setFrame(0);
  }

  async function handleAudioAnalyze(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setAnalyzeError('');
    const fd = new FormData();
    fd.append('audio', file);
    try {
      const result = await lightpresetsApi.analyzeAudio(fd);
      setDmx(result);
      setFrame(0);
    } catch (err) {
      setAnalyzeError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function exportDmx() {
    if (!dmx) return;
    const blob = new Blob([JSON.stringify(dmx, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dmx-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Get channel value at current frame
  function getChannelValue(ch) {
    if (!ch?.values?.length) return 0;
    return ch.values[frame % ch.values.length] ?? 0;
  }

  // Map channel value (0-255) to a color
  function channelColor(ch, value) {
    const label = (ch.label || '').toLowerCase();
    const v = Math.round((value / 255) * 100);
    if (label.includes('strobe')) {
      return value > 127 ? '#ffffff' : '#111111';
    }
    if (label.includes('red'))    return `hsl(0,   100%, ${v/2 + 10}%)`;
    if (label.includes('green'))  return `hsl(120, 100%, ${v/2 + 10}%)`;
    if (label.includes('blue'))   return `hsl(240, 100%, ${v/2 + 10}%)`;
    if (label.includes('bass'))   return `hsl(280, 100%, ${v/2 + 10}%)`;
    // Default: grayscale
    return `rgb(${value},${value},${value})`;
  }

  const channels = dmx?.channels || [];
  const totalFrames = channels[0]?.values?.length || 0;
  const progressPct = totalFrames > 0 ? (frame / totalFrames) * 100 : 0;

  return (
    <div>
      {/* Preview area */}
      <div className="dmx-preview">
        {channels.length === 0 && (
          <p style={{ color: '#666', fontSize: '.85rem', margin: '0 auto' }}>
            Kein DMX-Preset geladen. Audio hochladen oder Preset auswählen.
          </p>
        )}
        {channels.map(ch => {
          const val = getChannelValue(ch);
          const color = channelColor(ch, val);
          const glow = val > 50
            ? `0 0 ${Math.round(val / 8)}px ${color}, 0 0 ${Math.round(val / 4)}px ${color}`
            : 'none';
          return (
            <div key={ch.channel} className="dmx-channel">
              <div
                className="dmx-light"
                style={{
                  background: color,
                  boxShadow: glow
                }}
              />
              <div className="dmx-label">
                <div>CH {ch.channel}</div>
                <div>{ch.label || ''}</div>
                <div style={{ color: '#888', fontSize: '.6rem' }}>{val}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      {dmx && totalFrames > 0 && (
        <div style={{ height: 4, background: '#222', borderRadius: 4, margin: '.5rem 0', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: '#00d4ff',
              transition: 'width .05s linear'
            }}
          />
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.5rem', alignItems: 'center' }}>
        {!playing ? (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setPlaying(true)}
            disabled={!dmx || totalFrames === 0}
          >
            ▶ Play
          </button>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={stop}>⏹ Stop</button>
        )}

        <button className="btn btn-ghost btn-sm" onClick={exportDmx} disabled={!dmx}>
          ⬇️ Export DMX JSON
        </button>

        <div style={{ marginLeft: 'auto' }}>
          <label
            style={{ cursor: 'pointer' }}
            title="Audio hochladen und analysieren (POC)"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={handleAudioAnalyze}
            />
            <span className="btn btn-ghost btn-sm" style={{ pointerEvents: 'none' }}>
              {analyzing ? '⏳ Analysiere...' : '🎵 Audio analysieren'}
            </span>
          </label>
        </div>
      </div>

      {analyzeError && (
        <p style={{ color: 'var(--color-danger)', fontSize: '.8rem', marginTop: '.25rem' }}>{analyzeError}</p>
      )}

      {dmx && (
        <div style={{ marginTop: '.5rem', fontSize: '.75rem', color: 'var(--color-text-muted)' }}>
          {totalFrames} Frames @ {dmx.fps} fps · ~{Math.round((dmx.duration_ms || 0) / 1000)}s
          {dmx.source_file && ` · Quelle: ${dmx.source_file}`}
        </div>
      )}
    </div>
  );
}
