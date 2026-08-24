'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface GenericNodeData {
  label: string;
  subtitle?: string;
  emoji?: string;
  type?: string;
  color?: string;
  payload?: any;
}

const typeEmoji: Record<string, string> = {
  tool: '🔧', model: '🧠', decision: '⚖️', regulation: '📜',
  certificate: '🏅', evidence: '📋', owner: '👤',
  external_system: '🌐', generic: '📌',
};

export const GenericNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as GenericNodeData;
  const typeStr = (d.type || 'generic').toLowerCase();
  const typeLabel = typeStr.replace(/_/g, ' ').toUpperCase();
  const nodeColor = d.color || '#38bdf8';
  const emoji = d.emoji || typeEmoji[typeStr] || '📌';

  return (
    <div style={{
      width: 240, borderRadius: 16, padding: '12px 14px',
      background: 'linear-gradient(150deg, #0e1420 0%, #080a12 100%)',
      border: selected ? `2px solid ${nodeColor}` : '1px solid rgba(255,255,255,0.1)',
      boxShadow: selected
        ? `0 0 24px ${nodeColor}40, 0 10px 28px rgba(0,0,0,0.7)`
        : '0 6px 20px rgba(0,0,0,0.45)',
      position: 'relative',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      cursor: 'pointer',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 18, right: 18, height: 1.5, borderRadius: 999, background: `linear-gradient(90deg, transparent, ${nodeColor}, transparent)` }} />

      <Handle type="target" position={Position.Left} style={{ width: 10, height: 10, background: nodeColor, border: '2px solid #080a12', borderRadius: '50%', left: -5 }} />
      <Handle type="source" position={Position.Right} style={{ width: 10, height: 10, background: nodeColor, border: '2px solid #080a12', borderRadius: '50%', right: -5 }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
          background: `${nodeColor}20`, border: `1px solid ${nodeColor}45`,
          boxShadow: `0 0 10px ${nodeColor}25`,
        }}>
          {emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 8, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' as const,
            padding: '1px 6px', borderRadius: 999, display: 'inline-block', marginBottom: 3,
            background: `${nodeColor}20`, color: nodeColor, border: `1px solid ${nodeColor}40`,
          }}>
            {typeLabel}
          </span>
          <h4 style={{ fontSize: 12, fontWeight: 800, color: '#F0F4FA', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            {d.label}
          </h4>
        </div>
      </div>

      {d.subtitle && (
        <div style={{ borderRadius: 8, padding: '4px 8px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.subtitle}
          </p>
        </div>
      )}
    </div>
  );
});

GenericNode.displayName = 'GenericNode';
