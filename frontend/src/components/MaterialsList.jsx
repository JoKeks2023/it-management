// src/components/MaterialsList.jsx
// Renders a list of materials for a ticket.
// Each item has two checkboxes: "bestellt" (ordered) and "eingesetzt" (installed).
// When onChange is provided the list is interactive; otherwise it is read-only.

export function MaterialsList({ materials, onChange }) {
  const toggle = (idx, field) => {
    if (!onChange) return;
    const updated = materials.map((m, i) =>
      i === idx ? { ...m, [field]: m[field] ? 0 : 1 } : m
    );
    onChange(updated);
  };

  if (!materials || materials.length === 0) {
    return <p className="text-muted">Keine Materialien</p>;
  }

  return (
    <ul className="materials-list">
      {materials.map((m, idx) => (
        <li key={idx} className={`material-item${m.installed ? ' done' : ''}`}>
          <span style={{ flex: 1 }}>{m.name}</span>
          <label title="Bestellt">
            <input
              type="checkbox"
              checked={!!m.ordered}
              onChange={() => toggle(idx, 'ordered')}
              disabled={!onChange}
            />
            Bestellt
          </label>
          <label title="Eingesetzt">
            <input
              type="checkbox"
              checked={!!m.installed}
              onChange={() => toggle(idx, 'installed')}
              disabled={!onChange}
            />
            Eingesetzt
          </label>
        </li>
      ))}
    </ul>
  );
}
