'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface DataAssetNodeData {
  label: string;
  subtitle?: string;
  emoji?: string;
  color?: string;
  hasPii?: boolean;
  payload?: any;
}

export const DataAssetNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as DataAssetNodeData;
  const hasPii =
    d.hasPii ||
    d.label.toLowerCase().includes('pii') ||
    d.label.toLowerCase().includes('user') ||
    d.label.toLowerCase().includes('cpf') ||
    d.label.toLowerCase().includes('customer') ||
    d.label.toLowerCase().includes('prompt') ||
    d.subtitle?.toLowerCase().includes('pii');

  return (
    <div
      role="img"
      aria-label={`Dado: ${d.label}.${hasPii ? ' Contém PII — sujeito à LGPD.' : ''}`}
      style={{
      width: 270, borderRadius: 18, padding: '14px 16px',
      background: 'linear-gradient(150deg, #1a0f26 0%, #0c0812 100%)',
      border: selected ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.12)',
      boxShadow: selected
        ? '0 0 28px rgba(168,85,247,0.35), 0 12px 32px rgba(0,0,0,0.7)'
        : '0 8px 24px rgba(0,0,0,0.5)',
      position: 'relative',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      cursor: 'pointer',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 2, borderRadius: 999, background: 'linear-gradient(90deg, transparent, #a855f7, transparent)' }} />

      <Handle type="target" position={Position.Left} style={{ width: 12, height: 12, background: '#a855f7', border: '2px solid #0c0812', borderRadius: '50%', left: -6 }} />
      <Handle type="source" position={Position.Right} style={{ width: 12, height: 12, background: '#a855f7', border: '2px solid #0c0812', borderRadius: '50%', right: -6 }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(88,28,135,0.4))',
          border: '1px solid rgba(168,85,247,0.5)',
          boxShadow: '0 0 12px rgba(168,85,247,0.3)',
        }}>
          {d.emoji || '🗄️'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            padding: '2px 8px', borderRadius: 999, display: 'inline-block', marginBottom: 4,
            background: 'rgba(168,85,247,0.2)', color: '#d8b4fe', border: '1px solid rgba(168,85,247,0.45)',
          }}>
            DATA ASSET
          </span>
          <h4 style={{ fontSize: 13, fontWeight: 800, color: '#F0F4FA', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            {d.label}
          </h4>
        </div>
      </div>

      {d.subtitle && (
        <div style={{ marginBottom: 10, borderRadius: 8, padding: '5px 10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: 11, color: 'rgba(216,180,254,0.85)', margin: 0, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.subtitle}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11 }}>
        <span style={{ color: '#6B7A95' }}>Classificação</span>
        {hasPii ? (
          <span style={{
            fontFamily: 'monospace', fontWeight: 900, fontSize: 10, textTransform: 'uppercase' as const,
            padding: '2px 8px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(127,29,29,0.9)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.55)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
            ⚠️ PII / LGPD
          </span>
        ) : (
          <span style={{ fontFamily: 'monospace', fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(51,65,85,0.9)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
            Standard Data
          </span>
        )}
      </div>
    </div>
  );
});

DataAssetNode.displayName = 'DataAssetNode';
