import React, { useState } from 'react';
import { 
  AlertTriangle, ShieldAlert, Sparkles, Filter, Code2, 
  ChevronDown, ExternalLink, ArrowRight 
} from 'lucide-react';
import type { ScannerResult, CodeViolation } from '../../core/types';
import { RemediationModal } from './RemediationModal';

interface ViolationsListProps {
  result: ScannerResult;
}

export const ViolationsList: React.FC<ViolationsListProps> = ({ result }) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedViolationForFix, setSelectedViolationForFix] = useState<any | null>(null);

  const violations = result.violations || [];

  const filtered = violations.filter(v => {
    const matchesSeverity = severityFilter === 'ALL' || v.severity?.toUpperCase() === severityFilter;
    const matchesSearch = !searchQuery || 
      v.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.ruleId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.file?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.regulation?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case 'critical':
        return 'bg-rose-950/80 text-rose-300 border-rose-800/80 animate-pulse';
      case 'high':
        return 'bg-orange-950/80 text-orange-300 border-orange-800/80';
      case 'medium':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/80';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Violações de Conformidade & Riscos de Código ({violations.length})</span>
          </h2>
          <p className="text-xs text-slate-400">
            Itens que violam regulações vigentes com sugestão de correção automática por IA.
          </p>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center space-x-1.5 bg-surface p-1 rounded-xl border border-surface-border text-xs">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                severityFilter === sev
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar violação por palavra-chave, arquivo ou lei..."
          className="w-full px-3.5 py-2 bg-surface text-xs text-white placeholder-slate-500 rounded-xl border border-surface-border focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Violations Feed */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center glass-panel rounded-2xl border border-surface-border text-slate-400 text-xs">
            Nenhuma violação encontrada para os filtros selecionados. 🎉
          </div>
        ) : (
          filtered.map((v, idx) => (
            <div
              key={idx}
              className="glass-panel p-4 rounded-xl border border-surface-border hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getSeverityBadge(v.severity)}`}>
                      {v.severity?.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-semibold">{v.ruleId}</span>
                    {v.regulation && (
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                        {v.regulation}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-white leading-snug">{v.message}</h4>
                </div>

                {/* AI Fix Trigger */}
                <button
                  onClick={() => setSelectedViolationForFix(v)}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 text-cyan-300 hover:text-white border border-cyan-500/40 text-xs font-medium flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Corrigir com IA</span>
                </button>
              </div>

              {/* Code Reference / Snippet if available */}
              {v.file && (
                <div className="bg-[#0a0f1c] p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">📁 {v.file}{v.line ? `:${v.line}` : ''}</span>
                  {v.snippet && <span className="text-slate-500 text-[10px] truncate max-w-xs">{v.snippet}</span>}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* AI Remediation Modal */}
      {selectedViolationForFix && (
        <RemediationModal
          violation={selectedViolationForFix}
          onClose={() => setSelectedViolationForFix(null)}
        />
      )}
    </div>
  );
};
