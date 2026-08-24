import React, { useState } from 'react';
import { 
  ShieldAlert, ShieldCheck, AlertTriangle, Bot, Cpu, DollarSign, 
  Sparkles, FileText, CheckCircle2, XCircle, ArrowUpRight, Copy, Check
} from 'lucide-react';
import type { ScannerResult } from '../../core/types';
import { generateExecutiveSummaryWithAI } from '../services/siliconflow';

interface ExecutiveSummaryProps {
  result: ScannerResult;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ result }) => {
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [copied, setCopied] = useState(false);

  const overallScore = result.compliance?.overallScore ?? 78;
  const agentCount = result.source?.agents?.length || 0;
  const shadowAICount = result.shadowAI?.length || 0;
  const totalViolations = result.violations?.length || 0;
  const criticalViolations = result.violations?.filter(v => v.severity === 'critical' || v.severity === 'high').length || 0;

  // EU AI Act risk classification
  const riskClass = result.aiActSummary?.overallRiskTier || (
    criticalViolations > 3 ? 'HIGH_RISK' : agentCount > 0 ? 'LIMITED_RISK' : 'MINIMAL_RISK'
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-400', stroke: '#10b981', bg: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/40' };
    if (score >= 60) return { text: 'text-amber-400', stroke: '#f59e0b', bg: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/40' };
    return { text: 'text-rose-400', stroke: '#f43f5e', bg: 'from-rose-500/20 to-red-500/20', border: 'border-rose-500/40' };
  };

  const scoreTheme = getScoreColor(overallScore);
  const strokeDashoffset = 283 - (283 * overallScore) / 100;

  const handleGenerateAIReport = async () => {
    setIsGeneratingReport(true);
    try {
      const report = await generateExecutiveSummaryWithAI(result);
      setAiReport(report);
    } catch (e: any) {
      alert(`Falha ao consultar SiliconFlow: ${e.message}`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleCopyReport = () => {
    if (aiReport) {
      navigator.clipboard.writeText(aiReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Overall Score Circular Card */}
        <div className="glass-panel p-5 rounded-2xl border border-surface-border flex items-center space-x-5 relative overflow-hidden">
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-slate-800"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke={scoreTheme.stroke}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="251"
                strokeDashoffset={251 - (251 * overallScore) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-black font-mono ${scoreTheme.text}`}>
                {overallScore}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">/100</span>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Score Geral</span>
            <h3 className="text-base font-bold text-white mt-0.5">Conformidade IA</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {overallScore >= 80 ? 'Nível Elevado de Governança' : overallScore >= 60 ? 'Requer Mitigações Pontuais' : 'Alto Risco Regulatório'}
            </p>
          </div>
        </div>

        {/* EU AI Act Risk Tier */}
        <div className="glass-panel p-5 rounded-2xl border border-surface-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">EU AI Act</span>
            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
              riskClass === 'HIGH_RISK'
                ? 'bg-rose-950/80 text-rose-300 border-rose-800/80 animate-pulse'
                : riskClass === 'LIMITED_RISK'
                ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
            }`}>
              {riskClass}
            </span>
          </div>

          <div className="mt-3">
            <div className="text-xl font-bold text-white flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>{riskClass === 'HIGH_RISK' ? 'Alto Risco (Anexo III)' : 'Risco Limitado (Art. 50)'}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {riskClass === 'HIGH_RISK' 
                ? 'Exige avaliação de conformidade, registro na UE e supervisão humana.'
                : 'Exige obrigações de transparência e aviso de interação com IA.'}
            </p>
          </div>
        </div>

        {/* Shadow AI Card */}
        <div className="glass-panel p-5 rounded-2xl border border-surface-border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shadow AI</span>
            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
              shadowAICount > 0
                ? 'bg-rose-950/80 text-rose-300 border-rose-800/80'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
            }`}>
              {shadowAICount > 0 ? `${shadowAICount} Detectados` : 'Nenhum'}
            </span>
          </div>

          <div className="mt-3">
            <div className="text-xl font-bold text-white flex items-center space-x-2">
              <Bot className="w-5 h-5 text-purple-400" />
              <span>{agentCount} Agentes Mapeados</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {shadowAICount > 0 
                ? `${shadowAICount} chamadas diretas a LLMs sem governança declarada.`
                : 'Todos os pipelines de IA possuem rastreabilidade.'}
            </p>
          </div>
        </div>

        {/* Violations & AI Trigger */}
        <div className="glass-panel p-5 rounded-2xl border border-surface-border flex flex-col justify-between bg-gradient-to-br from-purple-950/20 to-surface">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Auditoria</span>
            <span className="text-xs font-mono text-purple-300">{totalViolations} achados ({criticalViolations} críticos)</span>
          </div>

          <div className="mt-3">
            <button
              onClick={handleGenerateAIReport}
              disabled={isGeneratingReport}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-glow-purple transition-all disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingReport ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Consultando SiliconFlow...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Gerar Parecer com IA</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* AI Generated Executive Report Panel */}
      {aiReport && (
        <div className="glass-panel p-6 rounded-2xl border border-purple-500/40 bg-[#0e1222] shadow-2xl relative animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-surface-border">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-purple-950/80 border border-purple-800/80 text-purple-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Parecer Executivo de Governança (SiliconFlow IA)</h4>
                <p className="text-[11px] text-slate-400">Análise jurídica e técnica consolidada</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyReport}
                className="px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-xs text-slate-300 hover:text-white transition-colors flex items-center space-x-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
              <button
                onClick={() => setAiReport(null)}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
              >
                Fechar
              </button>
            </div>
          </div>

          <div className="mt-4 prose prose-invert max-w-none text-xs leading-relaxed text-slate-300 whitespace-pre-wrap font-sans">
            {aiReport}
          </div>
        </div>
      )}
    </div>
  );
};
