'use client';

import React from 'react';
import type { ViewName } from '@council/graphos';

export const VIEW_TABS: { key: ViewName; label: string; icon: string; question: string }[] = [
  { key: 'ceo', label: 'CEO', icon: '👔', question: 'Estamos expostos?' },
  { key: 'cfo', label: 'CFO', icon: '💰', question: 'Quanto custa?' },
  { key: 'ciso', label: 'CISO', icon: '🔒', question: 'Onde posso ser atacado?' },
  { key: 'dpo', label: 'DPO', icon: '🛡️', question: 'Onde existe PII?' },
  { key: 'compliance', label: 'Compliance', icon: '⚖️', question: 'Estamos conformes?' },
  { key: 'auditor', label: 'Auditor', icon: '🔍', question: 'Reconstrua a decisão' },
  { key: 'board', label: 'Board', icon: '🏛️', question: 'Onde está o risco?' },
  { key: 'constitutional', label: 'Constitutional', icon: '📜', question: 'Constituição respeitada?' },
  { key: 'ecosystem', label: 'Ecosystem', icon: '🌐', question: 'Quais agentes?' },
  { key: 'certification', label: 'Certification', icon: '🏅', question: 'Certificação CG-AG' },
  { key: 'ai_act', label: 'EU AI Act', icon: '🤖', question: 'Classificação AI Act' },
  { key: 'agent_governance', label: 'Agent Gov', icon: '📋', question: 'Ciclo de vida dos agentes' },
  { key: 'data_lineage', label: 'Lineage', icon: '🧬', question: 'Linhagem de dados' },
  { key: 'risk_propagation', label: 'Risk Prop', icon: '💥', question: 'Propagação de risco' },
];

interface ViewSelectorProps {
  active: ViewName;
  onSelect: (view: ViewName) => void;
}

export default function ViewSelector({ active, onSelect }: ViewSelectorProps) {
  return (
    <div className="w-full overflow-x-auto pb-1 scrollbar-none">
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0F1219]/90 border border-white/10 backdrop-blur-xl shadow-xl w-max min-w-full">
        {VIEW_TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              onClick={() => onSelect(tab.key)}
              title={tab.question}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-[#0ECFB8]/20 to-[#5B50F0]/20 text-[#0ECFB8] border border-[#0ECFB8]/50 shadow-md shadow-cyan-950/40 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span className="tracking-wide uppercase text-[11px]">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
