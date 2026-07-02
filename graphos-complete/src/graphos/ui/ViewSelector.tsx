'use client';

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
  { key: 'ecosystem', label: 'Agent Ecosystem', icon: '🌐', question: 'Quais agentes?' },
  { key: 'certification', label: 'Certification', icon: '📜', question: 'Posso emitir o certificado?' },
  { key: 'ai_act', label: 'AI Act', icon: '🤖', question: 'Este sistema entra no AI Act?' },
  { key: 'agent_governance', label: 'Agent Gov', icon: '📋', question: 'Quem governa os agentes?' },
  { key: 'data_lineage', label: 'Data Lineage', icon: '🧬', question: 'Para onde os dados vão?' },
  { key: 'risk_propagation', label: 'Risk Prop', icon: '💥', question: 'O que acontece se falhar?' },
];

interface ViewSelectorProps {
  active: ViewName;
  onSelect: (view: ViewName) => void;
}

export default function ViewSelector({ active, onSelect }: ViewSelectorProps) {
  return (
    <>
      <style>{`
        .view-selector-container::-webkit-scrollbar {
          display: none;
        }
        .view-selector-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div
        className="view-selector-container"
        style={{
          display: 'flex',
          gap: 4,
          padding: 4,
          background: '#0F1219',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12,
          overflow: 'auto',
          flexWrap: 'nowrap',
        }}
      >
      {VIEW_TABS.map(tab => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            title={tab.question}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: isActive ? 'rgba(14,207,184,0.1)' : 'transparent',
              color: isActive ? '#0ECFB8' : '#6B7A95',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.color = '#F0F4FA';
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.color = '#6B7A95';
            }}
          >
            <span style={{ fontSize: 14 }}>{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </div>
    </>
  );
}
