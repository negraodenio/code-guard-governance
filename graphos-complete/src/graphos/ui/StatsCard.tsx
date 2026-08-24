'use client';

import React from 'react';

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
      className="group relative flex flex-col justify-between p-3.5 rounded-xl border border-white/10 bg-[#0F1219]/90 hover:border-white/20 transition-all duration-200 shadow-lg hover:shadow-cyan-950/20"
      style={{
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
          {label}
        </span>
        {icon && <span className="text-sm opacity-80 group-hover:scale-110 transition-transform">{icon}</span>}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span
          className="text-xl font-extrabold tracking-tight font-mono"
          style={{ color }}
        >
          {value}
        </span>
        {delta && (
          <span
            className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
              delta.positive
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
            }`}
          >
            {delta.positive ? '↑' : '↓'} {Math.abs(delta.value)}%
          </span>
        )}
      </div>
    </div>
  );
}
