import React, { useState, useEffect } from 'react';
import { Sparkles, Check, Copy, AlertTriangle, ShieldCheck, FileCode, Lightbulb } from 'lucide-react';
import { generateRemediationWithAI, RemediationResult } from '../services/siliconflow';

interface RemediationModalProps {
  violation: any | null;
  onClose: () => void;
}

export const RemediationModal: React.FC<RemediationModalProps> = ({ violation, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RemediationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!violation) return;
    let active = true;

    const fetchRemediation = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await generateRemediationWithAI({
          ruleId: violation.ruleId || violation.id || 'RULE_UNKNOWN',
          message: violation.message || violation.description || 'Violação detectada',
          severity: violation.severity || 'high',
          file: violation.file,
          line: violation.line,
          regulation: violation.regulation,
          codeSnippet: violation.snippet || violation.code,
        });
        if (active) setResult(res);
      } catch (e: any) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRemediation();

    return () => {
      active = false;
    };
  }, [violation]);

  if (!violation) return null;

  const handleCopyCode = () => {
    if (result?.remediationSnippet) {
      navigator.clipboard.writeText(result.remediationSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel w-full max-w-3xl bg-[#0c101d] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-surface-border">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 text-black font-bold">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[11px] font-mono text-cyan-400">
                {violation.regulation || 'Conformidade de IA'} • {violation.file || 'Arquivo Geral'}
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                Auto-Remediação com IA (SiliconFlow)
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-300 font-mono">
              Consultando modelo Qwen 2.5 Coder via SiliconFlow...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 space-y-1">
            <div className="font-bold">Erro ao gerar remediação:</div>
            <div>{error}</div>
          </div>
        )}

        {/* Loaded Result */}
        {!loading && result && (
          <div className="space-y-4">
            
            {/* Legal Basis Pill */}
            <div className="p-3 rounded-xl bg-surface border border-surface-border flex items-center space-x-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-400 font-medium">Fundamento Legal / Norma:</span>
              <span className="text-cyan-300 font-bold font-mono">{result.lawArticle}</span>
            </div>

            {/* Explanation */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Parecer Técnico & Diagnóstico:
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-[#11162a] p-3 rounded-xl border border-surface-border">
                {result.explanation}
              </p>
            </div>

            {/* Remediation Code Snippet */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Código Corrigido e Seguro Sugerido:</span>
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 rounded-lg bg-surface hover:bg-slate-800 border border-surface-border text-xs text-slate-300 hover:text-white transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-[#090d16] border border-slate-800 overflow-x-auto text-xs text-emerald-300 font-mono leading-relaxed">
                <code>{result.remediationSnippet}</code>
              </pre>
            </div>

            {/* Best Practices */}
            {result.bestPractices && result.bestPractices.length > 0 && (
              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40">
                <h5 className="text-xs font-bold text-purple-300 flex items-center space-x-1.5 mb-2">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Boas Práticas Recomendadas:</span>
                </h5>
                <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                  {result.bestPractices.map((bp, i) => (
                    <li key={i}>{bp}</li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-surface-border flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-surface hover:bg-slate-800 text-white rounded-xl text-xs font-semibold border border-surface-border transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
