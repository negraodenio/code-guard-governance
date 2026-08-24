'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface ControlNodeData {
  label: string;
  subtitle?: string;
  emoji?: string;
  score?: number;
  color?: string;
  payload?: any;
}

export const ControlNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as ControlNodeData;
  const isCgAg = d.label.toUpperCase().includes('CG-AG') || d.label.toUpperCase().includes('CONTROL');

  return (
    <div
      role="img"
      aria-label={`Controle de governança: ${d.label}. Framework: CG-AG.`}
      style={{
        width: 270, borderRadius: 18, padding: '14px 16px',
      background: 'linear-gradient(150deg, #0d1c13 0%, #070e0a 100%)',
      border: selected ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.12)',
      boxShadow: selected
        ? '0 0 28px rgba(16,185,129,0.35), 0 12px 32px rgba(0,0,0,0.7)'
        : '0 8px 24px rgba(0,0,0,0.5)',
      position: 'relative',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      cursor: 'pointer',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 2, borderRadius: 999, background: 'linear-gradient(90deg, transparent, #10b981, transparent)' }} />

      <Handle type="target" position={Position.Left} style={{ width: 12, height: 12, background: '#22c55e', border: '2px solid #070e0a', borderRadius: '50%', left: -6 }} />
      <Handle type="source" position={Position.Right} style={{ width: 12, height: 12, background: '#22c55e', border: '2px solid #070e0a', borderRadius: '50%', right: -6 }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(6,78,59,0.4))',
          border: '1px solid rgba(16,185,129,0.5)',
          boxShadow: '0 0 12px rgba(16,185,129,0.25)',
        }}>
          {d.emoji || '🛡️'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            padding: '2px 8px', borderRadius: 999,
            background: 'rgba(16,185,129,0.18)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.45)',
            display: 'inline-block', marginBottom: 4,
          }}>
            {isCgAg ? 'GOVERNANCE CONTROL' : 'SECURITY CONTROL'}
          </span>
          <h4 style={{ fontSize: 13, fontWeight: 800, color: '#F0F4FA', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            {d.label}
          </h4>
        </div>
      </div>

      {d.subtitle && (
        <div style={{ marginBottom: 10, borderRadius: 8, padding: '5px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: 11, color: 'rgba(167,243,208,0.85)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
            {d.subtitle}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11 }}>
        <span style={{ color: '#6B7A95' }}>Framework</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: 999, background: 'rgba(6,46,22,0.9)', color: '#6ee7b7', border: '1px solid rgba(34,197,94,0.4)' }}>
          CG-AG COMPLIANT
        </span>
      </div>
    </div>
  );
});

ControlNode.displayName = 'ControlNode';
