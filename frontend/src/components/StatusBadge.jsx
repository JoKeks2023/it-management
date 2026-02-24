// src/components/StatusBadge.jsx
// Renders a coloured badge for a ticket status or priority value.

export function StatusBadge({ value }) {
  return <span className={`badge badge-${value}`}>{value}</span>;
}
