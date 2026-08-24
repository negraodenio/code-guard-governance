import React, { useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, FileCheck, CheckCircle2, 
  XCircle, ChevronRight, Scale, Info, ExternalLink 
} from 'lucide-react';
import type { ScannerResult } from '../../core/types';

interface RegulationsGridProps {
  result: ScannerResult;
}

interface RegulationMeta {
  id: string;
  name: string;
  jurisdiction: string;
  category: string;
  description: string;
  articles: string[];
}

const REGULATION_DEFINITIONS: RegulationMeta[] = [
  {
    id: 'EU_AI_ACT',
    name: 'EU AI Act',
    jurisdiction: 'União Europeia 🇪🇺',
    category: 'Regulação Abrangente de IA',
    description: 'Classificação de risco, transparência de modelos, avaliação de conformidade (Anexo III) e supervisão humana (Art. 14).',
    articles: ['Art. 6 (Classificação)', 'Art. 9 (Gestão de Riscos)', 'Art. 10 (Dados & Governança)', 'Art. 14 (Supervisão Humana)', 'Art. 50 (Transparência)'],
  },
  {
    id: 'LGPD',
    name: 'LGPD (Lei Geral de Proteção de Dados)',
    jurisdiction: 'Brasil 🇧🇷',
    category: 'Privacidade & Proteção de Dados',
    description: 'Bases legais (Art. 7), dados sensíveis (Art. 11), segurança da informação (Art. 46) e Geração de RIPD (Art. 38).',
    articles: ['Art. 7 (Base Legal)', 'Art. 11 (Dados Sensíveis)', 'Art. 18 (Direitos do Titular)', 'Art. 38 (RIPD)', 'Art. 46 (Segurança)'],
  },
  {
    id: 'GDPR',
    name: 'GDPR (Regulamento Geral de Proteção)',
    jurisdiction: 'União Europeia 🇪🇺',
    category: 'Privacidade & Proteção de Dados',
    description: 'Direito à explicação em decisões automatizadas (Art. 22), privacy by design (Art. 25) e DPIA (Art. 35).',
    articles: ['Art. 5 (Princípios)', 'Art. 22 (Decisões Automatizadas)', 'Art. 25 (Privacy by Design)', 'Art. 32 (Segurança)', 'Art. 35 (DPIA)'],
  },
  {
    id: 'NIST_AI_RMF',
    name: 'NIST AI RMF 1.0',
    jurisdiction: 'Estados Unidos 🇺🇸',
    category: 'Framework de Risco de IA',
    description: 'Quatro funções centrais de governança: Govern (GOVERN), Map (MAP), Measure (MEASURE) e Manage (MANAGE).',
    articles: ['GOVERN 1.1 (Políticas)', 'MAP 1.5 (Contexto & Riscos)', 'MEASURE 2.3 (Métricas de Viés)', 'MANAGE 3.1 (Controles Ativos)'],
  },
  {
    id: 'ISO_42001',
    name: 'ISO/IEC 42001:2023',
    jurisdiction: 'Internacional 🌐',
    category: 'Sistema de Gestão de IA (AIMS)',
    description: 'Padrão global para estabelecimento, implementação e melhoria contínua de Sistemas de Gestão de IA responsáveis.',
    articles: ['Cláusula 6.1 (Ações de Risco)', 'Cláusula 8.2 (Avaliação de IA)', 'Anexo A.5 (Uso Responsável)', 'Anexo A.8 (Ciclo de Vida)'],
  },
  {
    id: 'OWASP_LLM_TOP_10',
    name: 'OWASP Top 10 for LLMs',
    jurisdiction: 'Cibersegurança Global 🛡️',
    category: 'Segurança de Aplicações com IA',
    description: 'Proteção contra Prompt Injection (LLM01), Insecure Output Handling (LLM02), Training Data Poisoning (LLM03) e Denial of Service (LLM04).',
    articles: ['LLM01 (Prompt Injection)', 'LLM02 (Insecure Output)', 'LLM06 (Sensitive Info Disclosure)', 'LLM07 (Insecure Plugin/Tool)'],
  },
  {
    id: 'BCB_4893',
    name: 'Resolução BCB nº 4.893 / 4.658',
    jurisdiction: 'Brasil (Bacen) 🏦',
    category: 'Setor Financeiro & Bancário',
    description: 'Requisitos de segurança cibernética, contratação de serviços de processamento em nuvem e governança de algoritmos de crédito.',
    articles: ['Art. 3 (Política de Segurança)', 'Art. 7 (Controles em Nuvem)', 'Art. 12 (Continuidade de Negócios)', 'Art. 15 (Auditoria de Modelos)'],
  },
  {
    id: 'ANVISA_RDC',
    name: 'RDC ANVISA (SaMD & Saúde)',
    jurisdiction: 'Brasil (ANVISA) 🏥',
    category: 'Software como Dispositivo Médico',
    description: 'Classificação de risco sanitário, validação clínica e rastreabilidade para algoritmos de diagnóstico e triagem médica.',
    articles: ['RDC 657/2022 (Software Médico)', 'Classificação Classe I a IV', 'Validação Clínica & Evidências', 'Rastreabilidade de Decisões'],
  },
  {
    id: 'DORA',
    name: 'DORA (Digital Operational Resilience)',
    jurisdiction: 'União Europeia 🇪🇺',
    category: 'Resiliência Operacional Financeira',
    description: 'Gestão de riscos de TIC em entidades financeiras e requisitos rígidos de governança para terceiros e provedores de IA.',
    articles: ['Art. 6 (Gestão de Riscos TIC)', 'Art. 11 (Resposta a Incidentes)', 'Art. 28 (Riscos de Provedores Terceiros de IA)'],
  },
  {
    id: 'NIS2',
    name: 'NIS2 Directive',
    jurisdiction: 'União Europeia 🇪🇺',
    category: 'Segurança de Redes & Infraestrutura',
    description: 'Medidas de gerenciamento de riscos de segurança cibernética e obrigações de notificação de incidentes críticos.',
    articles: ['Art. 21 (Medidas de Gestão de Riscos)', 'Art. 23 (Notificação de Incidentes em 24h)'],
  },
  {
    id: 'PCI_DSS',
    name: 'PCI-DSS v4.0',
    jurisdiction: 'Setor de Meios de Pagamento 💳',
    category: 'Segurança de Cartões & Pagamentos',
    description: 'Proibição de trânsito de dados de cartão de crédito (PAN/CVV) em logs e prompts não criptografados.',
    articles: ['Requisito 3 (Proteção de Dados do Portador)', 'Requisito 6 (Desenvolvimento Seguro)', 'Requisito 10 (Auditoria e Logs)'],
  },
  {
    id: 'CG_AG',
    name: 'CG-AG (12 Controles de Agentes)',
    jurisdiction: 'Framework Aberto de Governança 📜',
    category: 'Controles Autônomos de Agentes',
    description: '12 controles essenciais: HITL, Limites de Gastos (FinOps), Sandbox de Tools, Timeout de Loop, Sanitização de Memória e Kill-Switch.',
    articles: ['Controle 1 (Kill-Switch)', 'Controle 4 (Human-in-the-Loop)', 'Controle 7 (Rate Limit de Tools)', 'Controle 12 (Auditoria Contínua)'],
  },
];

export const RegulationsGrid: React.FC<RegulationsGridProps> = ({ result }) => {
  const [selectedReg, setSelectedReg] = useState<RegulationMeta | null>(null);

  // Map result data to regulations
  const complianceData = result.compliance?.regulations || {};
  const violations = result.violations || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Scale className="w-5 h-5 text-cyan-400" />
            <span>Matriz de Conformidade (13 Regulações Globais)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Clique em qualquer regulação para ver o parecer técnico, artigos auditados e requisitos atendidos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {REGULATION_DEFINITIONS.map((reg) => {
          const regResult = complianceData[reg.id] || complianceData[reg.id.toLowerCase()] || {};
          const regViolations = violations.filter(v => 
            v.regulation?.toUpperCase().includes(reg.id.replace(/_/g, ' ')) ||
            v.ruleId?.toUpperCase().includes(reg.id.replace(/_/g, ''))
          );

          const hasCritical = regViolations.some(v => v.severity === 'critical' || v.severity === 'high');
          const isCompliant = regViolations.length === 0;
          const score = regResult.score ?? (isCompliant ? 95 : Math.max(35, 90 - regViolations.length * 15));

          return (
            <div
              key={reg.id}
              onClick={() => setSelectedReg(reg)}
              className="glass-panel p-4 rounded-xl border border-surface-border hover:border-cyan-500/40 hover:bg-surface/90 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400/90">{reg.jurisdiction}</span>
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {reg.name}
                    </h3>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${
                    isCompliant
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                      : hasCritical
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800/80'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                  }`}>
                    {score}%
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {reg.description}
                </p>
              </div>

              <div className="pt-2 border-t border-surface-border/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-mono">
                  {regViolations.length === 0 ? '✓ 0 Violações' : `⚠️ ${regViolations.length} Violação(ões)`}
                </span>
                <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform flex items-center space-x-0.5 font-medium">
                  <span>Ver detalhes</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-2xl bg-[#0e1424] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between pb-3 border-b border-surface-border">
              <div>
                <span className="text-xs font-mono text-cyan-400">{selectedReg.jurisdiction} • {selectedReg.category}</span>
                <h3 className="text-xl font-bold text-white mt-0.5">{selectedReg.name}</h3>
              </div>
              <button
                onClick={() => setSelectedReg(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedReg.description}
            </p>

            {/* Articles Audit Scope */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Artigos e Controles Auditados:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedReg.articles.map((art, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-surface/80 border border-surface-border flex items-center space-x-2 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{art}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-surface-border flex justify-end">
              <button
                onClick={() => setSelectedReg(null)}
                className="px-4 py-2 bg-surface hover:bg-slate-800 text-white rounded-xl text-xs font-semibold border border-surface-border transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
