// src/components/NetworkTopology.jsx
// Interactive network topology graph using @xyflow/react (React Flow).
// Renders devices as custom nodes and port connections as edges.
// Supports drag & drop repositioning, zoom/pan, and saving canvas positions.

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { networkApi } from '../services/api';

// ─── Device type icons ────────────────────────────────────────────────────────
const ICONS = {
  'Router':       '🔀',
  'Switch':       '🔲',
  'Access Point': '📡',
  'Patchpanel':   '🔌',
  'Firewall':     '🛡️',
  'Server':       '🖥️',
  'Sonstiges':    '📦'
};

// ─── Custom Node ─────────────────────────────────────────────────────────────
function NetworkDeviceNode({ data, selected }) {
  const icon   = ICONS[data.device_type] || '📦';
  const active = data.activePorts > 0;

  return (
    <div style={{
      background: 'var(--color-surface, #fff)',
      border: `2px solid ${selected ? 'var(--color-primary, #3b82f6)' : 'var(--color-border, #e2e8f0)'}`,
      borderRadius: 10,
      padding: '10px 14px',
      minWidth: 140,
      boxShadow: selected ? '0 0 0 3px rgba(59,130,246,.25)' : '0 2px 6px rgba(0,0,0,.08)',
      fontFamily: 'inherit',
      fontSize: 12,
      cursor: 'default'
    }}>
      <Handle type="target" position={Position.Left}  style={{ background: '#94a3b8' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#94a3b8' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 600, lineHeight: 1.2, maxWidth: 140,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.label}
          </div>
          <div style={{ color: '#64748b', fontSize: 11 }}>{data.device_type}</div>
        </div>
      </div>

      {data.ip_address && (
        <div style={{ marginTop: 4, color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>
          {data.ip_address}
        </div>
      )}

      <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
        <span style={{
          background: active ? '#dcfce7' : '#f1f5f9',
          color:      active ? '#166534' : '#64748b',
          borderRadius: 4, padding: '1px 6px', fontSize: 10
        }}>
          {data.activePorts}/{data.portCount} aktiv
        </span>
        {data.location && (
          <span style={{ color: '#64748b', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
            📍 {data.location}
          </span>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { networkDevice: NetworkDeviceNode };

// ─── Main component ───────────────────────────────────────────────────────────
export function NetworkTopology({ onNodeClick }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const loadTopology = async () => {
    setLoading(true);
    try {
      const data = await networkApi.topology();
      setNodes(data.nodes.map(n => ({ ...n, type: 'networkDevice' })));
      setEdges(data.edges.map(e => ({
        ...e,
        animated:   false,
        style:      { stroke: '#94a3b8', strokeWidth: 2 },
        markerEnd:  { type: MarkerType.Arrow, color: '#94a3b8' },
        labelStyle: { fill: '#64748b', fontSize: 10 }
      })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTopology(); }, []);

  // Persist canvas position when user stops dragging a node
  const onNodeDragStop = useCallback(async (_event, node) => {
    try {
      await networkApi.updateDevice(node.id, { pos_x: node.position.x, pos_y: node.position.y });
    } catch {
      // Non-critical; position is still shown correctly on screen
    }
  }, []);

  const onConnect = useCallback((params) => {
    setEdges(eds => addEdge({
      ...params,
      animated: false,
      style: { stroke: '#94a3b8', strokeWidth: 2 }
    }, eds));
  }, [setEdges]);

  if (loading) {
    return <div className="centered" style={{ height: 400 }}><div className="spinner" /></div>;
  }
  if (error) {
    return <div className="error-msg" style={{ margin: '1rem' }}>{error}</div>;
  }
  if (nodes.length === 0) {
    return (
      <div className="centered" style={{ height: 400 }}>
        <p className="text-muted">Noch keine Geräte vorhanden. Füge dein erstes Netzwerkgerät hinzu.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 500, borderRadius: 8, overflow: 'hidden',
                  border: '1px solid var(--color-border)', background: '#f8fafc' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(_event, node) => onNodeClick && onNodeClick(node.id)}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2.5}
        attributionPosition="bottom-right"
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const active = n.data?.activePorts > 0;
            return active ? '#86efac' : '#e2e8f0';
          }}
          style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}
        />
      </ReactFlow>
    </div>
  );
}
