// src/components/QuickChecklist.jsx
// Mobile-first checklist component.
// Allows marking items, adding new ones, and creating follow-up tickets
// for unresolved items.

import { useState } from 'react';
import { ticketsApi } from '../services/api';

/**
 * @param {Object} props
 * @param {Array}    props.items    – array of { id, label, done }
 * @param {Function} props.onChange – called with updated items array
 * @param {string}   [props.title] – checklist title for context
 */
export function QuickChecklist({ items = [], onChange, title = 'Checkliste' }) {
  const [newItem, setNewItem] = useState('');
  const [creatingTicket, setCreatingTicket] = useState('');
  const [ticketMsg, setTicketMsg] = useState('');

  function toggleItem(id) {
    const updated = items.map(it => it.id === id ? { ...it, done: !it.done } : it);
    onChange && onChange(updated);
  }

  function addItem() {
    const label = newItem.trim();
    if (!label) return;
    const updated = [
      ...items,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, label, done: false }
    ];
    onChange && onChange(updated);
    setNewItem('');
  }

  function removeItem(id) {
    onChange && onChange(items.filter(it => it.id !== id));
  }

  async function createFollowupTicket(item) {
    setCreatingTicket(item.id);
    setTicketMsg('');
    try {
      await ticketsApi.create({
        title: `[Follow-up] ${item.label}`,
        description: `Offener Punkt aus Checkliste "${title}": ${item.label}`,
        status: 'geplant',
        priority: 'mittel'
      });
      setTicketMsg(`✅ Ticket für "${item.label}" erstellt`);
    } catch (err) {
      setTicketMsg(`❌ Fehler: ${err.message}`);
    } finally {
      setCreatingTicket('');
      setTimeout(() => setTicketMsg(''), 4000);
    }
  }

  const doneCount = items.filter(it => it.done).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
        <strong style={{ fontSize: '.9rem' }}>{title}</strong>
        <span style={{ fontSize: '.8rem', color: 'var(--color-text-muted)' }}>
          {doneCount}/{items.length} erledigt
        </span>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 4, marginBottom: '.75rem', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${(doneCount / items.length) * 100}%`,
              background: doneCount === items.length ? 'var(--color-success)' : 'var(--color-primary)',
              transition: 'width .3s'
            }}
          />
        </div>
      )}

      {/* Item list */}
      <ul className="checklist">
        {items.map(item => (
          <li key={item.id} className={`checklist-item${item.done ? ' done' : ''}`}>
            <input
              type="checkbox"
              checked={!!item.done}
              onChange={() => toggleItem(item.id)}
            />
            <span style={{ flex: 1 }}>{item.label}</span>
            {!item.done && (
              <button
                className="btn-icon"
                title="Follow-up Ticket erstellen"
                disabled={creatingTicket === item.id}
                onClick={() => createFollowupTicket(item)}
                style={{ fontSize: '.8rem', padding: '.15rem .35rem', opacity: .7 }}
              >
                🎫
              </button>
            )}
            <button
              className="btn-icon"
              title="Entfernen"
              onClick={() => removeItem(item.id)}
              style={{ fontSize: '.8rem', padding: '.15rem .35rem', opacity: .5 }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {items.length === 0 && (
        <p style={{ fontSize: '.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '.5rem' }}>
          Keine Einträge. Füge welche hinzu!
        </p>
      )}

      {/* Add new item */}
      <div className="checklist-add">
        <input
          type="text"
          className="form-input"
          placeholder="Neuer Punkt..."
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          style={{ fontSize: '.875rem' }}
        />
        <button className="btn btn-sm btn-primary" onClick={addItem} disabled={!newItem.trim()}>
          + Hinzufügen
        </button>
      </div>

      {ticketMsg && (
        <p style={{ marginTop: '.4rem', fontSize: '.8rem', color: ticketMsg.startsWith('✅') ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {ticketMsg}
        </p>
      )}
    </div>
  );
}
