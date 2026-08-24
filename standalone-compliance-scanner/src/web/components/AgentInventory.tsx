import React from 'react';
import { Bot, Cpu, DollarSign, Database, ShieldAlert, CheckCircle, Zap, Layers, AlertCircle } from 'lucide-react';
import type { ScannerResult } from '../../core/types';

interface AgentInventoryProps {
  result: ScannerResult;
}

export const AgentInventory: React.FC<AgentInventoryProps> = ({ result }) => {
  const agents = result.source?.agents || [];
  const models = result.source?.aiModels || [];
  const costEstimate = (result as any)._costEstimate || { totalMonthlyUsd: 0, estimatedMonthlyTokens: 0, modelCount: 0 };
  const shadowAI = result.shadowAI || [];

  return (
    <div className="space-y-6">
      {/* Header with quick stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Bot className="w-5 h-5 text-purple-400" />
            <span>Inventário de Agentes de IA & Modelos</span>
          </h2>
          <p className="text-xs text-slate-400">
            Mapeamento de frameworks autônomos, chamadas LLM e estimativa FinOps.
          </p>
        </div>

        {/* Cost Badge */}
        <div className="flex items-center space-x-3 text-xs bg-surface p-2 rounded-xl border border-surface-border">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-mono">
            <DollarSign className="w-4 h-4" />
            <span>~${costEstimate.totalMonthlyUsd.toFixed(2)}/mês</span>
          </div>
          <span className="text-slate-500">•</span>
          <div className="text-slate-400 font-mono">
            {(costEstimate.estimatedMonthlyTokens / 1000).toFixed(0)}k tokens est.
          </div>
        </div>
      </div>

      {/* Agents Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.length === 0 ? (
          <div className="col-span-2 p-8 text-center glass-panel rounded-2xl border border-surface-border text-slate-400 text-xs">
            Nenhum agente autônomo complexo detectado no repositório.
          </div>
        ) : (
          agents.map((agent, idx) => (
            <div
              key={idx}
              className="glass-panel p-4 rounded-xl border border-surface-border flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono">{agent.name}</h4>
                    <span className="text-[10px] text-purple-300 font-medium">
                      {agent.framework || 'Framework Genérico'}
                    </span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                  agent.riskLevel === 'critical' || agent.riskLevel === 'high'
                    ? 'bg-rose-950/80 text-rose-300 border-rose-800/80'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                }`}>
                  {agent.riskLevel.toUpperCase()}
                </span>
              </div>

              {/* Oversight & Autonomy info */}
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-surface/60 p-2 rounded-lg border border-surface-border/50">
                <div>
                  <span className="text-slate-500 block">Nível de Autonomia:</span>
                  <span className="font-semibold text-slate-300">
                    {agent.isAutonomous ? '⚡ Totalmente Autônomo' : '👥 Supervisionado (HITL)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Supervisão:</span>
                  <span className="font-semibold text-slate-300 font-mono">
                    {agent.oversightLevel || 'l2_human_review'}
                  </span>
                </div>
              </div>

              {/* Tools */}
              {agent.tools && agent.tools.length > 0 && (
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Ferramentas & Integrações:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.tools.map((t, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-slate-800/80 text-slate-300 text-[10px] font-mono rounded border border-slate-700">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Shadow AI Section if any */}
      {shadowAI.length > 0 && (
        <div className="glass-panel p-5 rounded-2xl border border-rose-800/40 bg-rose-950/10 space-y-3">
          <div className="flex items-center space-x-2 text-rose-400">
            <AlertCircle className="w-5 h-5" />
            <h3 className="text-sm font-bold text-white">Alerta de Shadow AI Detectado ({shadowAI.length} ocorrências)</h3>
          </div>
          <p className="text-xs text-slate-300">
            Foram encontradas chamadas diretas a APIs de modelos de linguagem sem o registro em catálogo ou governança de logs e consentimento.
          </p>

          <div className="space-y-2">
            {shadowAI.map((item, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-surface/90 border border-rose-900/40 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-mono text-rose-300 font-semibold">{item.file}</span>
                  <p className="text-[11px] text-slate-400">{item.reason}</p>
                </div>
                <span className="px-2 py-0.5 text-[10px] bg-rose-950 text-rose-400 border border-rose-800 rounded font-mono">
                  {item.provider} ({item.modelId || 'Modelo Genérico'})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
