// src/pages/Templates.jsx
// Templates page: just wraps the TemplatesManager component.

import { TemplatesManager } from '../components/TemplatesManager';

export function Templates() {
  return (
    <div>
      <h2 style={{ marginBottom: '1.25rem' }}>📋 Templates</h2>
      <TemplatesManager />
    </div>
  );
}
