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
  critical: '#F87171', high: '#F97316', medium: '#FACC15', low: '#22C55E',
};
const severityBg: Record<string, string> = {
  critical: 'rgba(248,113,113,0.1)', high: 'rgba(249,115,22,0.1)', medium: 'rgba(250,204,21,0.08)', low: 'rgba(34,197,94,0.08)',
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
    'Who decided?', 'Are we compliant?', 'Which agents process PII?',
    'What is the risk exposure?', 'Who owns each agent?', 'What does it cost?',
  ];

  const repoUrl = searchParams.get('repo') ?? undefined;

  const fetchView = useCallback(async (v: ViewName) => {
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
        setError(json.error ?? 'Failed to load view');
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      setLoading(false);
    }
    return () => controller.abort();
  }, [repoUrl]);

  const handleTalk = useCallback(async (q: string) => {
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
    } catch { setTalkResult({ answer: 'Network error.', answerPt: 'Erro de rede.', detectedIntent: 'unknown', confidence: 0, evidence: [] }); }
    finally { setTalkLoading(false); }
  }, [repoUrl]);

  useEffect(() => {
    const cleanup = fetchView(view);
    return () => { cleanup?.then((fn: any) => fn?.()); };
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

  const handleExport = useCallback(async (format: 'png' | 'svg' | 'pdf') => {
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
          backgroundColor: '#0F1219',
          scale: 2,
          useCORS: true,
          logging: false,
        });
        if (format === 'png') {
          await new Promise<void>((resolve) => {
            canvas.toBlob(b => {
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
  }, [view]);

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const activeTab = VIEW_TABS.find(t => t.key === view);
  const summary = response?.data?.summary ?? {};
  const risks = response?.data?.risks ?? [];
  const cards = response?.data?.cards ?? [];

  const summaryEntries = Object.entries(summary).slice(0, 8).map(([key, value]) => {
    const labels: Record<string, string> = {
      agents: 'Agents', criticalAgents: 'Critical', highRiskItems: 'High Risk',
      openIncidents: 'Incidents', complianceScore: 'Compliance',
      totalDecisions: 'Decisions', controls: 'Controls',
      topRisks: 'Top Risks', criticalRiskItems: 'Critical Risks',
      totalModelCost: 'Model Cost', totalTokens: 'Tokens',
      avgCostPerDecision: 'Avg/Decision', financialRisks: 'Fin. Risks',
      avgRiskImpact: 'Avg Impact', assetsWithPII: 'PII Assets',
      nonCompliantRegulations: 'Non-Compliant', totalRiskExposure: 'Exposure',
      regulatoryExposure: 'Non-Compliant Regs',
      totalAgents: 'Agents', agentsNoOwner: 'No Owner',
      exposedTools: 'Exposed', toolsWithSecrets: 'Secrets',
      lowSecuritySystems: 'Low Security', criticalSecurityRisks: 'Sec. Risks',
      piiAssets: 'PII Assets', piiRegulations: 'PII Regs',
      healthData: 'Health Data', financialData: 'Financial',
      remainingPct: 'Remaining',
      highRiskAISystems: 'High-Risk AI', autonomousAgents: 'Autonomous',
      totalRisks: 'Total Risks', modelProviders: 'Providers',
    };
    const colors: Record<string, string> = {
      complianceScore: '#0ECFB8', criticalAgents: '#F87171',
      highRiskItems: '#F87171', openIncidents: '#F97316',
      totalModelCost: '#22C55E', totalTokens: '#06B6D4',
      assetsWithPII: '#F59E0B', highRiskAISystems: '#EF4444',
      autonomousAgents: '#A855F7', totalRisks: '#F87171',
    };
    const label = labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
    return { key, label, value: String(value), color: colors[key] ?? '#5B50F0' };
  });

  return (
    <div className="p-6 mx-auto" style={{ maxWidth: 1200, fontFamily: "'DM Sans', -apple-system, sans-serif", color: '#F0F4FA' }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-extrabold"
            style={{ background: 'linear-gradient(135deg, #0ECFB8, #5B50F0)', color: '#080A0E' }}>
            G
          </div>
          <div>
            <h1 className="text-xl font-extrabold m-0" style={{ letterSpacing: '-0.02em' }}>
              GraphOS — Topology & Intelligence
            </h1>
            <p className="text-xs m-0 mt-0.5" style={{ color: '#6B7A95' }}>
              {repoUrl && <span className="font-semibold" style={{ color: '#0ECFB8' }}>{repoUrl}</span>}
              {repoUrl && <span className="mx-1" style={{ color: '#3A4060' }}>·</span>}
              {response?.meta?.totalEntities ?? '—'} entities &middot; {response?.meta?.relationshipsCount ?? '—'} relationships
              {risks.length > 0 && <> &middot; <button onClick={() => setShowRisks(!showRisks)}
                className="text-xs underline bg-transparent border-none cursor-pointer" style={{ color: '#F87171' }}>
                {risks.length} risks
              </button></>}
            </p>
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="mb-5">
        <ViewSelector active={view} onSelect={setView} />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20" style={{ color: '#6B7A95', fontSize: 13, gap: 12 }}>
          <div className="w-[18px] h-[18px] rounded-full"
            style={{ border: '2px solid #6B7A95', borderTopColor: '#0ECFB8', animation: 'graphos-spin 0.8s linear infinite' }} />
          Building topology graph&hellip;
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-5 rounded-xl mb-4" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* View Info */}
      {activeTab && !loading && !error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
          style={{ background: 'rgba(14,207,184,0.04)', border: '1px solid rgba(14,207,184,0.08)' }}>
          <span className="text-2xl">{activeTab.icon}</span>
          <div>
            <div className="text-sm font-bold">{response?.data?.title}</div>
            <div className="text-xs mt-0.5" style={{ color: '#6B7A95' }}>{response?.data?.description}</div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {!loading && !error && summaryEntries.length > 0 && (
        <div className="flex gap-2.5 mb-4 flex-wrap">
          {summaryEntries.map(s => (
            <StatsCard key={s.key} label={s.label} value={s.value} color={s.color} />
          ))}
        </div>
      )}

      {/* Custom cards from view */}
      {cards.length > 0 && (
        <div className="flex gap-2.5 mb-4 flex-wrap">
          {cards.map((c, i) => (
            <StatsCard key={i} label={c.title ?? ''} value={String(c.value)} color={c.color ?? '#5B50F0'} icon={c.icon} />
          ))}
        </div>
      )}

      {/* Risk Register Panel */}
      {showRisks && risks.length > 0 && (
        <div className="mb-4 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(248,113,113,0.15)' }}>
          <div className="flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider"
            style={{ background: 'rgba(248,113,113,0.06)', borderBottom: '1px solid rgba(248,113,113,0.1)', color: '#F87171' }}>
            <span>Risk Register ({risks.length})</span>
            <button onClick={() => setShowRisks(false)}
              className="bg-transparent border-none cursor-pointer text-xs" style={{ color: '#6B7A95' }}>✕</button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {risks.map((r, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5 text-xs"
                style={{ borderBottom: i < risks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: severityColors[r.severity] || '#6B7A95' }} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{r.title}</div>
                  {r.description && <div className="mt-0.5" style={{ color: '#6B7A95' }}>{r.description}</div>}
                </div>
                <span className="text-[10px] font-bold uppercase shrink-0 px-1.5 py-0.5 rounded"
                  style={{ background: severityBg[r.severity] || 'rgba(107,122,149,0.1)', color: severityColors[r.severity] || '#6B7A95' }}>
                  {r.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graph Canvas */}
      {!loading && !error && graphData && graphData.nodes.length > 0 && (
        <div ref={graphContainerRef} className="rounded-xl overflow-hidden"
          style={{ background: '#0F1219', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#151A24' }}>
            <div className="flex items-center gap-2">
              <span className="text-sm">🧠</span>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6B7A95' }}>
                {activeTab?.icon} {activeTab?.label} Topology
              </span>
            </div>
            <div className="flex gap-4 text-[10px] items-center" style={{ color: '#6B7A95' }}>
              <span>{graphData.nodes.length} nodes</span>
              <span>{graphData.edges.length} edges</span>
              <span>Drag &middot; Zoom &middot; Click</span>
              <span style={{ width: 1, height: 12, background: '#2A3040' }} />
              {(['svg', 'png', 'pdf'] as const).map(f => (
                <button key={f} onClick={() => handleExport(f)} disabled={exporting === f}
                  className="text-[10px] font-semibold uppercase cursor-pointer"
                  style={{
                    background: exporting === f ? '#1A2030' : 'transparent',
                    border: '1px solid #2A3040', borderRadius: 6, padding: '4px 8px',
                    color: exporting === f ? '#6B7A95' : '#F0F4FA',
                    letterSpacing: '0.05em', opacity: exporting === f ? 0.6 : 1,
                  }}>{exporting === f ? '⋯' : f}</button>
              ))}
            </div>
          </div>
          <div className="p-2">
            <CouncilGraph data={graphData} width={1140} height={480} />
          </div>
        </div>
      )}

      {/* Triple Confidence Widget */}
      {!loading && !error && response?.data?.summary && (
        (() => {
          const s = response.data.summary;
          const d = Number(s.discoveryConfidence ?? 0);
          const g = Number(s.governanceConfidence ?? 0);
          const c = Number(s.complianceConfidence ?? 0);
          const o = Number(s.overallConfidence ?? 0);
          const lbl = String(s.confidenceLabel ?? 'MEDIUM');
          if (!d && !g && !c) return null;
          const barColor = (v: number) => v >= 75 ? '#0ECFB8' : v >= 50 ? '#F0AB00' : '#F87171';
          const labelColor = lbl === 'HIGH' ? '#0ECFB8' : lbl === 'MEDIUM' ? '#F0AB00' : '#F87171';
          const axes = [{ label: 'Discovery', value: d }, { label: 'Governance', value: g }, { label: 'Compliance', value: c }];
          return (
            <div className="mt-4 p-4 rounded-xl" style={{ background: '#151A24', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6B7A95' }}>Triple Confidence</span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded" style={{ background: `${labelColor}22`, color: labelColor }}>{lbl} · {o}%</span>
              </div>
              <div className="flex gap-4">
                {axes.map(ax => (
                  <div key={ax.label} className="flex-1">
                    <div className="flex justify-between text-[10px] mb-1" style={{ color: '#6B7A95' }}>
                      <span>{ax.label}</span><span style={{ color: barColor(ax.value) }}>{ax.value}%</span>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ height: 5, background: '#2A3040' }}>
                      <div style={{ width: `${ax.value}%`, height: '100%', background: barColor(ax.value), borderRadius: 9999, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      )}

      {/* Talk to Governance Panel */}
      <div className="mt-4 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(91,80,240,0.25)', background: '#12162A' }}>
        <button
          onClick={() => setShowTalk(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold cursor-pointer"
          style={{ background: 'rgba(91,80,240,0.08)', color: '#A78BFA', border: 'none', borderBottom: showTalk ? '1px solid rgba(91,80,240,0.15)' : 'none' }}
        >
          <span className="flex items-center gap-2">💬 Talk to Governance <span style={{ fontWeight: 400, color: '#6B7A95' }}>— Ask anything about your AI agents</span></span>
          <span style={{ color: '#5B50F0', fontSize: 16 }}>{showTalk ? '▲' : '▼'}</span>
        </button>

        {showTalk && (
          <div className="p-4">
            {/* Smart Prompts */}
            <div className="flex flex-wrap gap-2 mb-3">
              {SMART_PROMPTS.map(p => (
                <button key={p} onClick={() => { setTalkQuery(p); handleTalk(p); }}
                  className="text-[10px] px-2.5 py-1 rounded-full cursor-pointer"
                  style={{ background: 'rgba(91,80,240,0.12)', border: '1px solid rgba(91,80,240,0.25)', color: '#A78BFA' }}>
                  {p}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={talkQuery}
                onChange={e => setTalkQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTalk(talkQuery)}
                placeholder="Ask: 'Who decided dec-001?', 'Are we GDPR compliant?', 'Which agents process PII?'"
                className="flex-1 rounded-lg px-3 py-2 text-xs outline-none"
                style={{ background: '#1A2030', border: '1px solid rgba(91,80,240,0.25)', color: '#F0F4FA', fontSize: 12 }}
              />
              <button
                onClick={() => handleTalk(talkQuery)}
                disabled={talkLoading || !talkQuery.trim()}
                className="px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
                style={{ background: talkLoading ? '#2A3040' : 'linear-gradient(135deg,#5B50F0,#0ECFB8)', color: '#fff', border: 'none', opacity: talkLoading ? 0.6 : 1 }}
              >
                {talkLoading ? '…' : 'Ask'}
              </button>
            </div>

            {/* Answer */}
            {talkResult && (
              <div className="mt-4 p-4 rounded-xl" style={{ background: '#0F1219', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                    style={{ background: talkResult.detectedIntent === 'unknown' ? 'rgba(107,122,149,0.15)' : 'rgba(14,207,184,0.1)', color: talkResult.detectedIntent === 'unknown' ? '#6B7A95' : '#0ECFB8' }}>
                    {talkResult.detectedIntent?.replace(/_/g, ' ')}
                  </span>
                  {talkResult.confidence > 0 && (
                    <span className="text-[10px]" style={{ color: '#6B7A95' }}>confidence: {talkResult.confidence}%</span>
                  )}
                  {talkResult.score !== undefined && (
                    <span className="ml-auto text-sm font-extrabold" style={{ color: '#0ECFB8' }}>{talkResult.score}{typeof talkResult.score === 'number' && talkResult.score <= 100 && talkResult.detectedIntent?.includes('status') ? '%' : ''}</span>
                  )}
                </div>
                <p className="text-xs mb-1" style={{ color: '#F0F4FA', lineHeight: 1.6 }}>{talkResult.answer}</p>
                <p className="text-xs" style={{ color: '#6B7A95', lineHeight: 1.6 }}>{talkResult.answerPt}</p>
                {talkResult.evidence?.length > 0 && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="text-[10px] font-bold uppercase mb-1.5" style={{ color: '#3A4060' }}>Evidence</div>
                    {talkResult.evidence.slice(0, 5).map((ev: string, i: number) => (
                      <div key={i} className="text-[10px] mb-0.5" style={{ color: '#6B7A95', fontFamily: 'monospace' }}>{ev}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty state */}
      {!loading && !error && graphData?.nodes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: '#6B7A95', gap: 12 }}>
          <span className="text-4xl">🧬</span>
          <div className="text-sm font-bold">No topology data</div>
          <div className="text-xs">Register agents and decisions to populate the graph.</div>
        </div>
      )}

      <style>{`@keyframes graphos-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

