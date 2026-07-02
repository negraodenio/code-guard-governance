'use client';

interface StatsCardProps {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
  delta?: { value: number; positive: boolean };
}

export default function StatsCard({ label, value, color = '#0ECFB8', icon, delta }: StatsCardProps) {
  return (
    <div
      style={{
        background: '#0F1219',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: '16px 20px',
        minWidth: 140,
        flex: '1 0 auto',
        transition: 'border-color 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6B7A95' }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.03em' }}>{value}</span>
        {delta && (
          <span style={{ fontSize: 11, fontWeight: 700, color: delta.positive ? '#22C55E' : '#F87171' }}>
            {delta.positive ? '↑' : '↓'} {Math.abs(delta.value)}%
          </span>
        )}
      </div>
    </div>
  );
}
