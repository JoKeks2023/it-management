// src/components/ConnectionStatus.jsx
// Connection status indicator shown in the header

import { useState, useEffect } from 'react';
import { isApiOnline } from '../services/api';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      right: '1rem',
      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
      color: '#fff',
      padding: '.75rem 1.25rem',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(239, 68, 68, 0.5)',
      fontSize: '.9rem',
      fontWeight: 600,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '.5rem',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <span aria-label="offline">📡</span>
      <span>Offline-Modus – Zwischengespeicherte Daten</span>
    </div>
  );
}
