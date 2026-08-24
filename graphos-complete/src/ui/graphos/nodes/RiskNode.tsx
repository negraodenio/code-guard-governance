'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface RiskNodeData {
  label: string;
  subtitle?: string;
  emoji?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  color?: string;
  payload?: any;
}

const severityMap = {
  critical: { color: '#ef4444', bg: 'rgba(127,29,29,0.85)', card: 'linear-gradient(150deg, #261010 0%, #120606 100%)' },
  high:     { color: '#f97316', bg: 'rgba(124,45,18,0.85)', card: 'linear-gradient(150deg, #261610 0%, #120a06 100%)' },
  medium:   { color: '#f59e0b', bg: 'rgba(113,63,18,0.85)', card: 'linear-gradient(150deg, #241c0e 0%, #120d06 100%)' },
  low:      { color: '#10b981', bg: 'rgba(5,46,22,0.85)',   card: 'linear-gradient(150deg, #102216 0%, #06120a 100%)' },
} as const;

export const RiskNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as RiskNodeData;
  const severity = d.severity || 'high';
  const cfg = severityMap[severity] || severityMap.high;

  return (
    <div style={{
      width: 270, borderRadius: 18, padding: '14px 16px',
      background: cfg.card,
      border: selected ? `2px solid ${cfg.color}` : '1px solid rgba(255,255,255,0.12)',
      boxShadow: selected
        ? `0 0 28px ${cfg.color}55, 0 12px 32px rgba(0,0,0,0.7)`
        : '0 8px 24px rgba(0,0,0,0.5)',
      position: 'relative',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      cursor: 'pointer',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 2, borderRadius: 999, background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)` }} />

      <Handle type="target" position={Position.Left} style={{ width: 12, height: 12, background: cfg.color, border: '2px solid #080A0E', borderRadius: '50%', left: -6 }} />
      <Handle type="source" position={Position.Right} style={{ width: 12, height: 12, background: cfg.color, border: '2px solid #080A0E', borderRadius: '50%', right: -6 }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          background: `${cfg.color}25`, border: `1px solid ${cfg.color}50`,
          boxShadow: `0 0 12px ${cfg.color}35`,
        }}>
          {d.emoji || '⚠️'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            padding: '2px 8px', borderRadius: 999, display: 'inline-block', marginBottom: 4,
            background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}50`,
          }}>
            RISK INCIDENT
          </span>
          <h4 style={{ fontSize: 13, fontWeight: 800, color: '#F0F4FA', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            {d.label}
          </h4>
        </div>
      </div>

      {d.subtitle && (
        <div style={{ marginBottom: 10, borderRadius: 8, padding: '5px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: 11, color: 'rgba(254,205,211,0.85)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.subtitle}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11 }}>
        <span style={{ color: '#6B7A95' }}>Gravidade</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 10, textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}50` }}>
          {severity}
        </span>
      </div>
    </div>
  );
});

RiskNode.displayName = 'RiskNode';
