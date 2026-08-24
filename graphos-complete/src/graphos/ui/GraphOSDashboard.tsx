'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import ViewSelector, { VIEW_TABS } from './ViewSelector';
import StatsCard from './StatsCard';
import type { ViewName } from '@council/graphos';
import type { GraphData } from '@/ui/graphos/types';

const CouncilGraph = dynamic(() => import('@/ui/graphos/CouncilGraph'), { ssr: false });

interface GraphOSResponse {
  ok: boolean;
  data: {
    nodes: any[];
    edges: any[];
    summary: Record<string, number | string>;
    title: string;
    description: string;
    risks?: Array<{ title: string; severity: string; description?: string }>;
    score?: number;
    cards?: Array<{ title: string; value: string | number; description?: string; color?: string; icon?: string }>;
  };
  meta: {
    view: string;
    label: string;
    icon: string;
    question: string;
    totalEntities?: number;
    relationshipsCount?: number;
    repoUrl?: string;
    backend?: string;
  };
}

const severityColors: Record<string, string> = {
  critical: '#F87171',
  high: '#F97316',
  medium: '#FACC15',
  low: '#22C55E',
};

const severityBg: Record<string, string> = {
  critical: 'rgba(248,113,113,0.12)',
  high: 'rgba(249,115,22,0.12)',
  medium: 'rgba(250,204,21,0.1)',
  low: 'rgba(34,197,94,0.1)',
};

export default function GraphOSDashboard() {
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewName>('ceo');
  const [response, setResponse] = useState<GraphOSResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'png' | 'svg' | 'pdf' | null>(null);
  const [showRisks, setShowRisks] = useState(false);

  // Talk to Governance state
  const [talkQuery, setTalkQuery] = useState('');
  const [talkResult, setTalkResult] = useState<any | null>(null);
  const [talkLoading, setTalkLoading] = useState(false);
  const [showTalk, setShowTalk] = useState(false);

  const SMART_PROMPTS = [
    'Quais agentes acessam PII?',
    'Quem decidiu dec-001?',
    'Estamos conformes com o CG-AG?',
    'Qual a exposição de risco total?',
    'Quem é o dono de cada agente?',
  ];

  const repoUrl = searchParams.get('repo') ?? undefined;

  const fetchView = useCallback(
    async (v: ViewName) => {
      const controller = new AbortController();
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/graphos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ view: v, repoUrl }),
          signal: controller.signal,
        });
        const json = await res.json();
        if (json.ok) {
          setResponse(json);
        } else {
          setError(json.error ?? 'Falha ao carregar visualização');
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Erro desconhecido');
        }
      } finally {
        setLoading(false);
      }
      return () => controller.abort();
    },
    [repoUrl]
  );

  const handleTalk = useCallback(
    async (q: string) => {
      if (!q.trim()) return;
      setTalkLoading(true);
      setTalkResult(null);
      try {
        const res = await fetch('/api/governance/talk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, repoUrl }),
        });
        const json = await res.json();
        if (json.ok) setTalkResult(json.data);
        else setTalkResult({ answer: json.error, answerPt: json.error, detectedIntent: 'unknown', confidence: 0, evidence: [] });
      } catch {
        setTalkResult({ answer: 'Network error.', answerPt: 'Erro de rede.', detectedIntent: 'unknown', confidence: 0, evidence: [] });
      } finally {
        setTalkLoading(false);
      }
    },
    [repoUrl]
  );

  useEffect(() => {
    const cleanup = fetchView(view);
    return () => {
      cleanup?.then((fn: any) => fn?.());
    };
  }, [view, fetchView]);

  const graphData: GraphData | null = response?.data
    ? {
        nodes: response.data.nodes,
        edges: response.data.edges,
        metadata: {
          proposal: response.meta?.question ?? '',
          verdict: 'GO',
          score: response.data.score ?? 85,
          totalRounds: 1,
          consensusStrength: (() => {
            const s = response.data.summary?.['complianceScore'];
            if (s == null) return 0;
            return Number(String(s).replace('%', ''));
          })(),
        },
      }
    : null;

  const handleExport = useCallback(
    async (format: 'png' | 'svg' | 'pdf') => {
      setExporting(format);
      try {
        const el = graphContainerRef.current;
        if (!el) return;

        if (format === 'svg') {
          const svg = el.querySelector('svg');
          if (!svg) return;
          const clone = svg.cloneNode(true) as SVGSVGElement;
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          const serializer = new XMLSerializer();
          const svgStr = serializer.serializeToString(clone);
          const blob = new Blob([svgStr], { type: 'image/svg+xml' });
          downloadBlob(blob, `graphos-${view}.svg`);
        } else {
          const html2canvas = (await import('html2canvas')).default;
          const canvas = await html2canvas(el, {
            backgroundColor: '#080A0E',
            scale: 2,
            useCORS: true,
            logging: false,
          });
          if (format === 'png') {
            await new Promise<void>((resolve) => {
              canvas.toBlob((b) => {
                if (b) downloadBlob(b, `graphos-${view}.png`);
                resolve();
              });
            });
          } else {
            const { default: jsPDF } = await import('jspdf');
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`graphos-${view}.pdf`);
          }
        }
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        setExporting(null);
      }
    },
    [view]
  );

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const activeTab = VIEW_TABS.find((t) => t.key === view);
  const summary = response?.data?.summary ?? {};
  const risks = response?.data?.risks ?? [];
  const cards = response?.data?.cards ?? [];

  const summaryEntries = Object.entries(summary)
    .slice(0, 6)
    .map(([key, value]) => {
      const labels: Record<string, string> = {
        agents: 'Agentes',
        criticalAgents: 'Críticos',
        highRiskItems: 'Alto Risco',
        openIncidents: 'Incidentes',
        complianceScore: 'Score CG-AG',
        totalDecisions: 'Decisões',
        controls: 'Controles',
        topRisks: 'Top Riscos',
        totalModelCost: 'Custo Modelos',
        assetsWithPII: 'Ativos PII',
        highRiskAISystems: 'High-Risk AI',
        autonomousAgents: 'Autônomos',
      };
      const colors: Record<string, string> = {
        complianceScore: '#0ECFB8',
        criticalAgents: '#F87171',
        highRiskItems: '#F87171',
        openIncidents: '#F97316',
        totalModelCost: '#22C55E',
        assetsWithPII: '#A855F7',
        highRiskAISystems: '#EF4444',
      };
      const label = labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
      return { key, label, value: String(value), color: colors[key] ?? '#38bdf8' };
    });

  return (
    <div className="min-h-screen bg-[#080A0E] text-[#F0F4FA] font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap pb-5 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-extrabold shadow-lg shadow-cyan-950/60 bg-gradient-to-br from-[#0ECFB8] to-[#5B50F0] text-slate-950">
              G
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight m-0 text-white">
                  GraphOS — Executive Governance Cockpit
                </h1>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-xs text-slate-400 m-0 mt-0.5 flex items-center gap-2">
                {repoUrl && <span className="font-semibold text-[#0ECFB8]">{repoUrl}</span>}
                {repoUrl && <span className="text-slate-600">·</span>}
                <span>{response?.meta?.totalEntities ?? '39'} entidades mapeadas</span>
                <span className="text-slate-600">·</span>
                <span>{response?.meta?.relationshipsCount ?? '143'} conexões ativas</span>
                {risks.length > 0 && (
                  <>
                    <span className="text-slate-600">·</span>
                    <button
                      onClick={() => setShowRisks(!showRisks)}
                      className="text-xs font-bold text-rose-400 hover:underline bg-transparent border-none cursor-pointer"
                    >
                      {risks.length} riscos detectados
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2">
            {(['svg', 'png', 'pdf'] as const).map((f) => (
              <button
                key={f}
                onClick={() => handleExport(f)}
                disabled={exporting === f}
                className="px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 hover:border-cyan-500/40 shadow-md transition-all cursor-pointer"
              >
                {exporting === f ? '⋯' : f}
              </button>
            ))}
          </div>
        </div>

        {/* View Selector Navigation */}
        <div className="mb-5">
          <ViewSelector active={view} onSelect={setView} />
        </div>

        {/* Perspective Banner */}
        {activeTab && !loading && !error && (
          <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl mb-5 border border-white/10 bg-[#0F1219]/90 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activeTab.icon}</span>
              <div>
                <h3 className="text-sm font-bold text-white">{response?.data?.title || activeTab.label}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{response?.data?.description || activeTab.question}</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-cyan-300 bg-cyan-950/60 px-3 py-1.5 rounded-xl border border-cyan-500/30">
              <span>🎯 Pergunta:</span>
              <span className="font-bold text-white">{activeTab.question}</span>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-center justify-center py-24 text-slate-400 text-xs gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-slate-600 border-t-[#0ECFB8] animate-spin" />
            Construindo topologia de governança em tempo real...
          </div>
        )}

        {/* Error Banner */}
        {error && !loading && (
          <div className="p-4 rounded-xl mb-5 bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        {!loading && !error && (summaryEntries.length > 0 || cards.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-5">
            {summaryEntries.map((s) => (
              <StatsCard key={s.key} label={s.label} value={s.value} color={s.color} />
            ))}
            {cards.map((c, i) => (
              <StatsCard key={i} label={c.title ?? ''} value={String(c.value)} color={c.color ?? '#5B50F0'} icon={c.icon} />
            ))}
          </div>
        )}

        {/* Risk Register Collapse */}
        {showRisks && risks.length > 0 && (
          <div className="mb-5 rounded-2xl overflow-hidden border border-rose-500/30 bg-[#0F1219]/95 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 text-xs font-bold uppercase tracking-wider bg-rose-950/40 border-b border-rose-500/20 text-rose-300">
              <span>Registro de Riscos ({risks.length})</span>
              <button onClick={() => setShowRisks(false)} className="text-slate-400 hover:text-white text-xs cursor-pointer">
                ✕
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto p-2 divide-y divide-white/5">
              {risks.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                    style={{ background: severityColors[r.severity] || '#6B7A95' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{r.title}</div>
                    {r.description && <div className="mt-0.5 text-slate-400 text-[11px]">{r.description}</div>}
                  </div>
                  <span
                    className="text-[10px] font-extrabold uppercase shrink-0 px-2 py-0.5 rounded-full border"
                    style={{
                      background: severityBg[r.severity] || 'rgba(107,122,149,0.1)',
                      color: severityColors[r.severity] || '#6B7A95',
                      borderColor: `${severityColors[r.severity]}40`,
                    }}
                  >
                    {r.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🌟 Central Graph Canvas */}
        {!loading && !error && graphData && graphData.nodes.length > 0 && (
          <div ref={graphContainerRef} className="mb-6">
            <CouncilGraph data={graphData} width="100%" height={680} smartQuery={talkQuery} />
          </div>
        )}

        {/* Talk to Governance AI Panel */}
        <div className="rounded-2xl overflow-hidden border border-[#5B50F0]/30 bg-[#0F1219]/95 backdrop-blur-xl shadow-2xl">
          <button
            onClick={() => setShowTalk((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-xs font-bold bg-[#151A24]/90 hover:bg-[#1A2030] text-purple-300 border-none cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <span className="text-base">💬</span>
              <span>Talk to Governance</span>
              <span className="font-normal text-slate-400">— Consultas e auditoria determinística de agentes em tempo real</span>
            </span>
            <span className="text-sm font-mono text-[#5B50F0]">{showTalk ? '▲ Ocultar' : '▼ Expandir'}</span>
          </button>

          {showTalk && (
            <div className="p-5 border-t border-white/10">
              {/* Smart Prompts */}
              <div className="flex flex-wrap gap-2 mb-4">
                {SMART_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setTalkQuery(p);
                      handleTalk(p);
                    }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 cursor-pointer transition-all active:scale-95 shadow-sm"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2.5">
                <input
                  type="text"
                  value={talkQuery}
                  onChange={(e) => setTalkQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTalk(talkQuery)}
                  placeholder="Pergunte: 'Quais agentes acessam PII?', 'Quem aprovou a decisão dec-001?', 'Score de compliance do agente X'..."
                  className="flex-1 rounded-xl px-4 py-3 text-xs bg-[#151A24] border border-purple-500/30 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#0ECFB8] transition-all"
                />
                <button
                  onClick={() => handleTalk(talkQuery)}
                  disabled={talkLoading || !talkQuery.trim()}
                  className="px-6 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-[#0ECFB8] to-[#5B50F0] text-slate-950 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-950/60"
                >
                  {talkLoading ? 'Auditando...' : 'Consultar'}
                </button>
              </div>

              {/* Answer Box */}
              {talkResult && (
                <div className="mt-4 p-5 rounded-2xl bg-[#080A0E] border border-white/10 shadow-inner">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-[#0ECFB8] border border-cyan-500/30">
                      {talkResult.detectedIntent?.replace(/_/g, ' ')}
                    </span>
                    {talkResult.confidence > 0 && (
                      <span className="text-[11px] text-slate-400 font-mono">Confiança: {talkResult.confidence}%</span>
                    )}
                  </div>
                  <p className="text-xs text-white leading-relaxed font-sans">{talkResult.answer}</p>
                  {talkResult.answerPt && (
                    <p className="text-xs text-slate-400 leading-relaxed font-sans mt-2">{talkResult.answerPt}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
