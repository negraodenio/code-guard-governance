'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface AgentNodeData {
  label: string;
  subtitle?: string;
  emoji?: string;
  score?: number;
  alliance?: string;
  color?: string;
  status?: 'ACTIVE' | 'SHADOW' | 'SUSPENDED' | 'GOVERNED';
  riskLevel?: 'critical' | 'high' | 'medium' | 'low';
  model?: string;
  hasPii?: boolean;
  isAutonomous?: boolean;
  owner?: string;
  payload?: any;
}

const riskConfigs = {
  critical: { label: 'CRITICAL RISK', color: '#f87171', bg: 'rgba(127,29,29,0.85)', border: 'rgba(248,113,113,0.55)', glow: 'rgba(239,68,68,0.4)' },
  high:     { label: 'HIGH RISK',     color: '#fb923c', bg: 'rgba(124,45,18,0.85)', border: 'rgba(249,115,22,0.55)', glow: 'rgba(249,115,22,0.4)' },
  medium:   { label: 'MEDIUM RISK',   color: '#facc15', bg: 'rgba(113,63,18,0.85)', border: 'rgba(245,158,11,0.55)', glow: 'rgba(245,158,11,0.35)' },
  low:      { label: 'LOW RISK',      color: '#22c55e', bg: 'rgba(5,46,22,0.85)',   border: 'rgba(34,197,94,0.55)',  glow: 'rgba(34,197,94,0.35)' },
} as const;

export const AgentNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as AgentNodeData;
  const score = d.score !== undefined ? d.score : 85;
  const isShadow = d.status === 'SHADOW' || score < 50;
  const risk = d.riskLevel || (score < 50 ? 'critical' : score < 70 ? 'high' : score < 85 ? 'medium' : 'low');
  const rc = riskConfigs[risk] || riskConfigs.medium;
  const hasPii = d.hasPii ?? (risk === 'critical' || risk === 'high' || d.label.toLowerCase().includes('customer') || d.label.toLowerCase().includes('triage') || d.label.toLowerCase().includes('health'));
  const isAutonomous = d.isAutonomous ?? (d.label.toLowerCase().includes('judge') || d.label.toLowerCase().includes('router') || score > 80);
  const controlsActive = Math.round((score / 100) * 12);

  return (
    <div
      style={{
        width: 310,
        borderRadius: 18,
        padding: '14px 16px',
        background: 'linear-gradient(150deg, #101622 0%, #080A0E 100%)',
        border: selected ? `2px solid #0ECFB8` : `1px solid rgba(255,255,255,0.13)`,
        boxShadow: selected
          ? `0 0 32px ${rc.glow}, 0 12px 40px rgba(0,0,0,0.7), 0 0 0 4px rgba(14,207,184,0.12)`
          : `0 8px 24px rgba(0,0,0,0.5)`,
        position: 'relative',
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        transition: 'box-shadow 0.25s, border-color 0.25s',
        cursor: 'pointer',
      }}
    >
      {/* Top accent glow line */}
      <div style={{
        position: 'absolute', top: 0, left: 24, right: 24, height: 2, borderRadius: 999,
        background: `linear-gradient(90deg, transparent, ${rc.color}, transparent)`,
      }} />

      {/* Handles */}
      <Handle type="target" position={Position.Left} style={{ width: 12, height: 12, background: '#0ECFB8', border: '2px solid #080A0E', borderRadius: '50%', left: -6 }} />
      <Handle type="source" position={Position.Right} style={{ width: 12, height: 12, background: '#0ECFB8', border: '2px solid #080A0E', borderRadius: '50%', right: -6 }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          background: 'linear-gradient(135deg, rgba(14,207,184,0.18), rgba(91,80,240,0.18))',
          border: `1px solid ${rc.border}`,
          boxShadow: `0 0 14px ${rc.glow}30`,
        }}>
          {d.emoji || '🤖'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{
              fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: 999, border: `1px solid ${rc.border}`,
              background: rc.bg, color: rc.color,
            }}>
              {rc.label}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: '#0ECFB8' }}>
              CG-AG {score}%
            </span>
          </div>
          <h4 style={{
            fontSize: 14, fontWeight: 800, color: '#F0F4FA', margin: 0,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            letterSpacing: '-0.01em',
          }}>
            {d.label}
          </h4>
        </div>
      </div>

      {/* Subtitle */}
      {d.subtitle && (
        <div style={{
          marginBottom: 10, borderRadius: 8, padding: '6px 10px',
          background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#0ECFB8' }}>⚡</span>
            {d.subtitle}
          </p>
        </div>
      )}

      {/* Tags row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        {hasPii ? (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: 'rgba(127,29,29,0.7)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.4)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            PII ● ACCESS
          </span>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 999, background: 'rgba(51,65,85,0.7)', color: '#64748b', border: '1px solid rgba(255,255,255,0.06)' }}>
            NO PII
          </span>
        )}
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'rgba(8,47,73,0.7)', color: '#67e8f9', border: '1px solid rgba(103,232,249,0.3)', fontFamily: 'monospace' }}>
          {isAutonomous ? 'AUTONOMOUS' : 'ASSISTED'}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: isShadow ? 'rgba(120,53,15,0.7)' : 'rgba(6,46,22,0.7)', color: isShadow ? '#fcd34d' : '#6ee7b7', border: isShadow ? '1px solid rgba(252,211,77,0.4)' : '1px solid rgba(110,231,183,0.4)' }}>
          {isShadow ? 'SHADOW' : 'REGISTERED'}
        </span>
      </div>

      {/* CG-AG Progress bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 10, color: '#6B7A95' }}>Controles de Conformidade</span>
          <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#F0F4FA' }}>{controlsActive}/12 Ativos</span>
        </div>
        <div style={{ height: 7, borderRadius: 999, background: '#1e293b', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{
            height: '100%', borderRadius: 999,
            width: `${Math.min(Math.max(score, 8), 100)}%`,
            background: 'linear-gradient(90deg, #0ECFB8, #5B50F0)',
            boxShadow: '0 0 10px rgba(14,207,184,0.5)',
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>
    </div>
  );
});

AgentNode.displayName = 'AgentNode';
