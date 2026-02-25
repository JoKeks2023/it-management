// src/components/OnboardingModal.jsx
// Interactive onboarding wizard for new users.
// Guides users through the main features step-by-step.

import { useState } from 'react';

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: '👋 Willkommen zum IT Management System!',
    description: 'Lassen Sie sich durch alle Features und Funktionen führen.',
    content: (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🖥️</div>
        <p style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
          Ein persönliches System zur Verwaltung von IT-Projekten, Events, und Netzwerk-Infrastruktur.
        </p>
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--bg-main)',
          borderRadius: '8px',
          marginTop: '1.5rem',
          fontSize: '0.9rem'
        }}>
          <p style={{ margin: '0.5rem 0 0 0', fontWeight: 600 }}>
            In etwa 5 Minuten werden Sie alle wichtigsten Funktionen kennenlernen.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'dashboard',
    title: '🏠 Das Unified Dashboard',
    description: 'Ihre zentrale Kontrollzentrale',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          Das moderne Dashboard bietet einen umfassenden Überblick über alle Ihre Projekte:
        </p>
        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
          <li>📊 Live-Statistiken und Metriken</li>
          <li>🎯 Schnelle Aktions-Buttons für häufige Aufgaben</li>
          <li>🔗 Modulübersicht mit direkten Links</li>
          <li>⚡ Ein-Klick-Navigation zu jedem Feature</li>
        </ul>
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          💡 Klicken Sie auf eine beliebige Statistik-Karte, um zum entsprechenden Modul zu springen!
        </div>
      </div>
    )
  },
  {
    id: 'sidebar',
    title: '📍 Sidebar Navigation',
    description: 'Schnellzugriff auf alle Module',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          Die Sidebar auf der linken Seite bietet:
        </p>
        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
          <li>🏠 <strong>Home</strong> - Zurück zum Dashboard</li>
          <li>🎫 <strong>Tickets</strong> - IT-Aufgaben verwalten</li>
          <li>🎵 <strong>Events</strong> - Veranstaltungen organisieren</li>
          <li>🌐 <strong>Netzwerk</strong> - Geräte und Topologie</li>
          <li>📡 <strong>Unifi</strong> - Netzwerk-Integration</li>
          <li>⚙️ <strong>Einstellungen</strong> - Konfiguration</li>
        </ul>
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--color-info)',
          color: 'white',
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          💡 Klicken Sie auf den ← Knopf, um die Sidebar zu kollabieren und mehr Platz zu gewinnen!
        </div>
      </div>
    )
  },
  {
    id: 'tickets',
    title: '🎫 Ticket-System',
    description: 'Verwalten Sie IT-Aufgaben effizient',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          Das Ticket-System ist das Herzstück des Systems:
        </p>
        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
          <li>📝 Erstellen Sie Tickets für jede IT-Aufgabe</li>
          <li>📦 Verfolgen Sie Materialien und Bestellungen</li>
          <li>📎 Hängen Sie Dateien und Dokumente an</li>
          <li>📜 Vollständiger Änderungsverlauf</li>
          <li>🏷️ Status: geplant → bestellt → installiert → fertig</li>
        </ul>
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--color-success)',
          color: 'white',
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          <strong>Probieren Sie es:</strong> Navigieren Sie zu 🎫 Tickets und erstellen Sie Ihr erstes Ticket!
        </div>
      </div>
    )
  },
  {
    id: 'events',
    title: '🎵 Event Management',
    description: 'Organisieren Sie Events und Buchungen',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          Verwalten Sie alle Aspekte Ihrer Events:
        </p>
        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
          <li>🎤 DJ-Bookings und Veranstaltungen</li>
          <li>👥 Crew und Staff-Verwaltung</li>
          <li>📦 Equipment-Reservierungen</li>
          <li>💰 Pricing und Zahlungsstatus</li>
          <li>📅 Setup/Teardown-Planung</li>
        </ul>
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--color-primary)',
          color: 'white',
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          💡 Events können direkt aus dem Dashboard mit einem Knoppdruck erstellt werden!
        </div>
      </div>
    )
  },
  {
    id: 'network',
    title: '🌐 Netzwerk Management',
    description: 'Visualisieren und verwalten Sie Ihre IT-Infrastruktur',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          Vollständiges Netzwerk-Management:
        </p>
        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
          <li>🖼️ Interaktive Netzwerk-Topologie mit React Flow</li>
          <li>🔌 Detaillierte Port- und Geräte-Verwaltung</li>
          <li>⚙️ VLAN, PoE, Geschwindigkeit und Status</li>
          <li>📋 Rack-Verwaltung</li>
          <li>🔗 Visuelle Kabel- und Verbindungsdarstellung</li>
        </ul>
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--color-warning)',
          color: 'white',
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          💡 Die Topologie-Visualisierung ist interaktiv - verschieben Sie die Geräte per Drag & Drop!
        </div>
      </div>
    )
  },
  {
    id: 'unifi',
    title: '📡 Unifi Integration',
    description: 'Synchronisieren Sie Ihre Netzwerkgeräte',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          Verbinden Sie Ihren Ubiquiti Unifi Controller:
        </p>
        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
          <li>🔌 Einfache Konfiguration in den Einstellungen</li>
          <li>🔄 Automatische Gerätesynchronisierung</li>
          <li>🟢 Live-Status und Verbindungs-Überwachung</li>
          <li>📊 Detaillierte Geräte-Informationen</li>
        </ul>
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--color-info)',
          color: 'white',
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          📡 <strong>Setup:</strong> Gehen Sie zu ⚙️ Einstellungen → 🔌 Integrationen → Unifi konfigurieren
        </div>
      </div>
    )
  },
  {
    id: 'modules',
    title: '📦 Weitere Module',
    description: 'Alle verfügbaren Features im Überblick',
    content: (
      <div>
        <p style={{ marginBottom: '1rem' }}>
          Das System bietet noch viele weitere Module:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px' }}>
            <strong>🏗️ Projekte</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
              Projektverwaltung
            </p>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px' }}>
            <strong>🔧 Wartung</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
              Service & Maintenance
            </p>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px' }}>
            <strong>📦 Inventar</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
              Equipment-Katalog
            </p>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px' }}>
            <strong>📄 Angebote</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
              Quotes & Rechnungen
            </p>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px' }}>
            <strong>👥 Kontakte</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
              CRM & Adressen
            </p>
          </div>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px' }}>
            <strong>📊 Berichte</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
              Statistiken & Analytics
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'tips',
    title: '💡 Nützliche Tipps & Tricks',
    description: 'Arbeiten Sie effizienter',
    content: (
      <div>
        <p style={{ marginBottom: '1rem', fontWeight: 600 }}>
          Schnellzugriff und Tipps:
        </p>
        <ul style={{ marginBottom: '1rem', paddingLeft: '1.5rem' }}>
          <li>🔍 <strong>Suchen:</strong> Nutzen Sie Filter in jedem Modul</li>
          <li>💾 <strong>Auto-Save:</strong> Aktivieren Sie dies in den Einstellungen</li>
          <li>⌚ <strong>Cache:</strong> Reduzieren Sie Cache-Zeit für Live-Daten</li>
          <li>📝 <strong>Verknüpfungen:</strong> Klicken Sie auf verwandte Module</li>
          <li>📎 <strong>Attachments:</strong> Hängen Sie PDFs und Bilder direkt an</li>
          <li>📜 <strong>History:</strong> Jede Änderung wird protokolliert</li>
        </ul>
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--bg-main)',
          borderRadius: '8px',
          borderLeft: '4px solid var(--color-primary)',
          fontSize: '0.9rem'
        }}>
          💡 Die Sidebar-Buttons sind auch Schnelllinks - halten Sie Ausschau nach Modulen die zusammenhängen!
        </div>
      </div>
    )
  },
  {
    id: 'finish',
    title: '🎉 Herzlich Willkommen!',
    description: 'Sie sind bereit zu starten',
    content: (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
        <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
          Sie haben alle Features kennengelernt!
        </p>
        <div style={{
          padding: '1.5rem',
          backgroundColor: 'var(--bg-main)',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>
            🎯 Nächste Schritte:
          </p>
          <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
            <li>Erstellen Sie Ihr erstes Ticket</li>
            <li>Konfigurieren Sie die Unifi-Integration</li>
            <li>Personalisieren Sie die Einstellungen</li>
          </ul>
        </div>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Sie können dieses Onboarding jederzeit in den Einstellungen erneut starten.
        </p>
      </div>
    )
  }
];

export function OnboardingModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '2.5rem',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '1px solid var(--border-color)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            padding: '0.5rem'
          }}
          title="Close onboarding"
        >
          ✕
        </button>

        {/* Progress Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            height: '4px',
            backgroundColor: 'var(--bg-main)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div
              style={{
                height: '100%',
                backgroundColor: 'var(--color-primary)',
                width: `${progress}%`,
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            margin: '0.5rem 0 0',
            textAlign: 'right'
          }}>
            Schritt {currentStep + 1} von {ONBOARDING_STEPS.length}
          </p>
        </div>

        {/* Content */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {step.title}
          </h2>
          <p style={{
            color: 'var(--color-text-muted)',
            fontSize: '0.95rem',
            marginBottom: '1.5rem',
            margin: 0
          }}>
            {step.description}
          </p>
        </div>

        {/* Step Content */}
        <div style={{
          backgroundColor: 'var(--bg-main)',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          minHeight: '200px'
        }}>
          {step.content}
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <button
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: currentStep === 0 ? 'var(--border-color)' : 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem',
              opacity: currentStep === 0 ? 0.5 : 1
            }}
          >
            ← Zurück
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {ONBOARDING_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: idx === currentStep ? 'var(--color-primary)' : 'var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  padding: 0
                }}
              />
            ))}
          </div>

          <button
            onClick={() => {
              if (currentStep === ONBOARDING_STEPS.length - 1) {
                onClose();
              } else {
                setCurrentStep(Math.min(ONBOARDING_STEPS.length - 1, currentStep + 1));
              }
            }}
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
            {currentStep === ONBOARDING_STEPS.length - 1 ? '✓ Fertig' : 'Weiter →'}
          </button>
        </div>
      </div>
    </div>
  );
}
