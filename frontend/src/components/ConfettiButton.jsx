// src/components/ConfettiButton.jsx
// Renders a button that triggers confetti animation + success modal
// when a project is marked as completed.
// Also auto-triggers an after-action report.

import { useState, useCallback } from 'react';
import { projectsApi } from '../services/api';

const CONFETTI_COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#01aaa4'];

function launchConfetti() {
  const pieces = 80;
  for (let i = 0; i < pieces; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.cssText = `
        left: ${Math.random() * 100}vw;
        top: -20px;
        background: ${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]};
        width: ${6 + Math.random() * 8}px;
        height: ${6 + Math.random() * 8}px;
        animation-delay: ${Math.random() * 0.5}s;
        animation-duration: ${1.5 + Math.random() * 1.5}s;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }, i * 25);
  }
}

/**
 * @param {Object} props
 * @param {Object}   props.project   – project object
 * @param {Function} props.onUpdated – called after project is marked completed
 */
export function ConfettiButton({ project, onUpdated }) {
  const [showModal, setShowModal]   = useState(false);
  const [report, setReport]         = useState('');
  const [completing, setCompleting] = useState(false);

  const handleComplete = useCallback(async () => {
    setCompleting(true);
    try {
      const updated = await projectsApi.update(project.id, { status: 'completed' });
      launchConfetti();

      // Build after-action report
      const lines = [
        `✅ Projekt abgeschlossen: ${project.title}`,
        `Datum: ${new Date().toLocaleDateString('de-DE')}`,
        project.client_name ? `Kunde: ${project.client_name}` : null,
        project.location    ? `Ort: ${project.location}`       : null,
        project.price_estimate ? `Erlös: €${Number(project.price_estimate).toFixed(2)}` : null,
        project.notes ? `Notizen: ${project.notes}` : null,
        '---',
        'Rückblick: Projekt erfolgreich durchgeführt.'
      ].filter(Boolean).join('\n');

      setReport(lines);
      setShowModal(true);
      onUpdated && onUpdated(updated);
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setCompleting(false);
    }
  }, [project, onUpdated]);

  if (project.status === 'completed') {
    return (
      <span className="badge badge-completed" style={{ padding: '.4rem .75rem' }}>
        🎉 Abgeschlossen
      </span>
    );
  }

  return (
    <>
      <button
        className="btn btn-primary btn-sm"
        onClick={handleComplete}
        disabled={completing}
        style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none' }}
      >
        {completing ? '⏳' : '🎉'} Abschließen
      </button>

      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'var(--color-surface)', borderRadius: 12, padding: '2rem',
              maxWidth: 480, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,.3)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>🎉</div>
              <h2 style={{ color: 'var(--color-success)', marginBottom: '.5rem' }}>Projekt abgeschlossen!</h2>
              <p style={{ color: 'var(--color-text-muted)' }}>{project.title}</p>
            </div>

            <div style={{ background: 'var(--color-surface-hover)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
              <strong style={{ fontSize: '.85rem', display: 'block', marginBottom: '.5rem' }}>📋 After-Action Report</strong>
              <pre style={{ fontSize: '.8rem', whiteSpace: 'pre-wrap', color: 'var(--color-text-muted)', fontFamily: 'inherit' }}>
                {report}
              </pre>
            </div>

            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(report).catch(() => {});
                  alert('Bericht kopiert!');
                }}
              >
                📋 Kopieren
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowModal(false)}>
                ✓ Fertig
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
