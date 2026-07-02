'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

interface Node {
  id: string; kind: string; label: string; description?: string;
  riskLevel?: string; aiActRiskClass?: string; businessDomain?: string;
  status?: string; agentType?: string; color: string; size: number;
  sourceTable?: string; cfModule?: string; attributes?: Record<string, any>;
}

interface Edge {
  id: string; source: string; target: string; kind: string;
  weight: number; metadata: Record<string, unknown>;
}

interface CfModule {
  code: string; name: string; question: string;
  tables: string[]; lens: string;
  tableCounts: Record<string, number>; totalRecords: number;
}

interface Lens {
  id: string; name: string; question: string; icon: string; color: string;
}

const C = {
  bg: '#080A0E', surface: '#0F1219', border: 'rgba(255,255,255,0.07)',
  text: '#F0F4FA', muted: '#6B7A95', accent: '#0ECFB8', purple: '#5B50F0',
  critical: '#F87171', high: '#F97316', medium: '#FACC15', low: '#22C55E',
};

const LENSES: Lens[] = [
  { id: 'ceo', name: 'CEO', question: 'Estamos seguros para escalar?', icon: 'S', color: '#0ECFB8' },
  { id: 'cfo', name: 'CFO', question: 'Quanto custa? Qual ROI?', icon: 'C', color: '#22C55E' },
  { id: 'ciso', name: 'CISO', question: 'Onde estão os riscos?', icon: 'R', color: '#F87171' },
  { id: 'dpo', name: 'DPO', question: 'Temos exposição LGPD/GDPR?', icon: 'P', color: '#A78BFA' },
  { id: 'compliance', name: 'Compliance', question: 'Estamos conformes?', icon: 'K', color: '#FACC15' },
  { id: 'auditor', name: 'Auditor', question: 'Prove tudo.', icon: 'A', color: '#5B50F0' },
  { id: 'board', name: 'Board', question: 'O que pode destruir a empresa?', icon: 'B', color: '#F97316' },
  { id: 'constitutional', name: 'Constitutional', question: 'Estamos seguindo a Constituição?', icon: 'L', color: '#0ECFB8' },
  { id: 'ecosystem', name: 'Ecosystem', question: 'Como tudo se conecta?', icon: 'E', color: '#38BDF8' },
  { id: 'certification', name: 'Certification', question: 'Passamos na auditoria?', icon: 'T', color: '#E879F9' },
];

const KIND_COLORS: Record<string, string> = {
  agent: '#0ECFB8',
  risk: '#F87171',
  evidence: '#A78BFA',
  model: '#06B6D4',
  owner: '#EC4899',
  certificate: '#E879F9',
  decision: '#F0AB00',
};

const KIND_SIZES: Record<string, number> = {
  agent: 22,
  risk: 17,
  evidence: 12,
  model: 17,
  owner: 14,
  certificate: 12,
  decision: 15,
};

const CF_COLORS: Record<string, string> = {
  'CF-000': '#0ECFB8', 'CF-001': '#5B50F0', 'CF-002': '#38BDF8',
  'CF-003': '#FACC15', 'CF-004': '#E879F9', 'CF-005': '#A78BFA',
  'CF-006': '#22C55E', 'CF-007': '#F87171', 'CF-008': '#F97316',
  'CF-009': '#0ECFB8', 'CF-010': '#5B50F0', 'CF-011': '#FACC15',
  'CF-012': '#E879F9',
};

const RISK_COLORS: Record<string, string> = {
  critical: '#F87171', high: '#F97316', medium: '#FACC15', low: '#22C55E',
};

export default function V1Dashboard() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [cfModules, setCfModules] = useState<CfModule[]>([]);
  const [lenses] = useState<Lens[]>(LENSES);
  const [summary, setSummary] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLens, setActiveLens] = useState<string | null>(null);
  const [activeCf, setActiveCf] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<string | null>(null);
  const [scanUrl, setScanUrl] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [scans, setScans] = useState<any[]>([]);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [govAgents, setGovAgents] = useState<any[]>([]);
  const [govByStatus, setGovByStatus] = useState<Record<string, number>>({});
  const [talkQ, setTalkQ] = useState('');
  const [talkAnswer, setTalkAnswer] = useState<any>(null);
  const [talkLoading, setTalkLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posMapRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [showLabels, setShowLabels] = useState(true);

  const loadData = useCallback(async (scanFilter?: string | null, keepScans = false) => {
    setRefreshing(true); setError(null);
    try {
      const [graphRes, scansRes] = await Promise.all([
        fetch('/api/v1/graph'),
        fetch('/api/v1/scans'),
      ]);
      const j = await graphRes.json();
      const sj = await scansRes.json();
      if (j.ok) {
        let nodes = j.data.nodes as Node[];
        if (scanFilter) nodes = nodes.filter((n: Node) => !n.attributes?.scanId || n.attributes?.scanId === scanFilter);
        setNodes(nodes);
        setEdges(j.data.edges); setCfModules(j.data.cfModules ?? []);
        setSummary(j.data.summary ?? {});
        setLoading(false);
      } else setError(j.error ?? 'Failed to load');
      if (sj.ok && !keepScans) setScans(sj.data ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setRefreshing(false); }
  }, []);

  const loadGovAgents = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/agents');
      const j = await r.json();
      if (j.ok) { setGovAgents(j.data.agents ?? []); setGovByStatus(j.data.byStatus ?? {}); }
    } catch { /* inventário indisponível */ }
  }, []);

  const handleTransition = useCallback(async (agentId: string, status: string) => {
    try {
      const r = await fetch('/api/v1/agents', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, status }),
      });
      const j = await r.json();
      if (j.ok) { setMessage(`✓ ${j.data?.name}: ${j.transition.from} → ${j.transition.to}`); loadGovAgents(); }
      else setMessage('Erro: ' + j.error);
    } catch (e: any) { setMessage('Erro: ' + e.message); }
  }, [loadGovAgents]);

  const handleTalk = useCallback(async () => {
    if (!talkQ.trim()) return;
    setTalkLoading(true); setTalkAnswer(null);
    try {
      const target = scans[0]?.target;
      const r = await fetch('/api/governance/talk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: talkQ.trim(), ...(target ? { repoUrl: target } : {}) }),
      });
      const j = await r.json();
      setTalkAnswer(j.ok ? j.data : { error: j.error });
    } catch (e: any) { setTalkAnswer({ error: e.message }); }
    finally { setTalkLoading(false); }
  }, [talkQ, scans]);

  useEffect(() => { loadData(); loadGovAgents(); }, [loadData, loadGovAgents]);

  const handleScan = useCallback(async () => {
    if (!scanUrl.trim()) return;
    setScanning(true); setMessage(null); setLastScanResult(null);
    const stepTimers: ReturnType<typeof setTimeout>[] = [];
    const scheduleStep = (idx: number) => {
      if (idx >= 6) return;
      const steps = [
        { t: 3000, msg: 'Conectando ao repositório GitHub...' },
        { t: 12000, msg: 'Analisando agentes de IA e dependências...' },
        { t: 25000, msg: 'Mapeando riscos, controles e evidências...' },
        { t: 40000, msg: 'Avaliando conformidade constitucional...' },
        { t: 55000, msg: 'Persistindo no GraphOS...' },
        { t: 65000, msg: 'Quase lá...' },
      ];
      stepTimers.push(setTimeout(() => {
        setScanProgress(steps[idx].msg);
        scheduleStep(idx + 1);
      }, steps[idx].t));
    };
    scheduleStep(0);
    try {
      const r = await fetch('/api/v1/graph', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'scan', url: scanUrl.trim() }) });
      const j = await r.json();
      stepTimers.forEach(clearTimeout); setScanProgress(null); setScanning(false);
      if (j.ok) {
        const sr = j.data;
        setLastScanResult(sr);
        setScanUrl('');
        setMessage(`✓ Scan concluído: ${sr.agents || 0} agentes, ${sr.risks || 0} riscos, ${sr.evidence || 0} evidências — Cert: ${sr.certLevel || '—'} (Score: ${sr.score ?? '—'}/100)`);
        const scanEntry = { id: sr.scanId, target: sr.target || sr.targetLabel, agents: sr.agents, risks: sr.risks, evidence: sr.evidence, certLevel: sr.certLevel, score: sr.score, scannedAt: new Date().toISOString() };
        setScans(prev => [scanEntry, ...prev.filter(s => s.id !== sr.scanId)]);
        await loadData(activeScanId, true);
        loadGovAgents();
      } else { setMessage('Erro: ' + (j.error ?? 'Falha')); }
    } catch (e: any) { stepTimers.forEach(clearTimeout); setScanProgress(null); setScanning(false); setMessage('Erro: ' + e.message); }
  }, [scanUrl, activeScanId, loadData, loadGovAgents]);

  const handleRebuild = async () => {
    setRebuilding(true); setMessage(null);
    try {
      const r = await fetch('/api/v1/graph', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'rebuild' }) });
      const j = await r.json();
      setMessage(j.ok ? `✓ ${j.message}` : j.error);
      if (j.ok) await loadData(activeScanId);
    } catch (e: any) { setMessage('Erro: ' + e.message); }
    finally { setRebuilding(false); }
  };

  const activeLensObj = activeLens ? lenses.find(l => l.id === activeLens) : null;

  const sidebarCfModules = activeLens
    ? cfModules.filter(cf => cf.lens === activeLens)
    : cfModules;

  const filteredNodes = nodes.filter(n => {
    if (activeCf && n.cfModule !== activeCf) return false;
    if (activeLens) {
      const cfInLens = cfModules.filter(cf => cf.lens === activeLens).map(cf => cf.code);
      if (!n.cfModule || !cfInLens.includes(n.cfModule)) return false;
    }
    return true;
  });

  const filteredEdges = edges.filter(e =>
    filteredNodes.some(n => n.id === e.source) && filteredNodes.some(n => n.id === e.target));

  const byKind: Record<string, number> = {};
  for (const n of filteredNodes) byKind[n.kind] = (byKind[n.kind] ?? 0) + 1;

  const activeCfEntities = activeCf
    ? nodes.filter(n => n.cfModule === activeCf)
    : [];

  const activeCfModule = activeCf
    ? cfModules.find(cf => cf.code === activeCf)
    : null;

  function computeForceLayout(nodes: Node[], edges: Edge[], w: number, h: number) {
    const pos = new Map<string, { x: number; y: number }>();
    const vel = new Map<string, { x: number; y: number }>();
    const centerGravity = 0.003;
    const repulsion = -500;
    const attraction = 0.05;
    const padding = 80;

    for (const n of nodes) {
      pos.set(n.id, { x: padding + Math.random() * (w - 2 * padding), y: padding + Math.random() * (h - 2 * padding) });
      vel.set(n.id, { x: 0, y: 0 });
    }

    const iters = Math.min(60, Math.max(15, Math.round(1500 / Math.max(nodes.length, 1))));
    for (let iter = 0; iter < iters; iter++) {
      const cooling = 1 - (iter / iters) * 0.7;
      const damp = 0.85;

      // Repulsion (use spatial optimization for large graphs)
      const ids = Array.from(pos.keys());
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const p1 = pos.get(ids[i])!, p2 = pos.get(ids[j])!;
          const dx = p2.x - p1.x, dy = p2.y - p1.y;
          const dist = Math.max(Math.hypot(dx, dy), 5);
          const f = repulsion * cooling / (dist * 0.7);
          const fx = (dx / dist) * f, fy = (dy / dist) * f;
          const v1 = vel.get(ids[i])!, v2 = vel.get(ids[j])!;
          v1.x -= fx; v1.y -= fy; v2.x += fx; v2.y += fy;
        }
      }

      // Attraction along edges
      for (const e of edges) {
        const s = pos.get(e.source), t = pos.get(e.target);
        if (!s || !t) continue;
        const dx = t.x - s.x, dy = t.y - s.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) continue;
        const f = dist * attraction * cooling;
        const fx = (dx / dist) * f, fy = (dy / dist) * f;
        const vs = vel.get(e.source)!, vt = vel.get(e.target)!;
        vs.x += fx; vs.y += fy; vt.x -= fx; vt.y -= fy;
      }

      // Center gravity + apply
      for (const id of ids) {
        const p = pos.get(id)!;
        const v = vel.get(id)!;
        v.x += (w / 2 - p.x) * centerGravity * cooling;
        v.y += (h / 2 - p.y) * centerGravity * cooling;
        p.x += v.x * damp;
        p.y += v.y * damp;
        v.x *= damp;
        v.y *= damp;
      }
    }
    return pos;
  }

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs || filteredNodes.length === 0) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = cvs.parentElement!.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    cvs.width = w * dpr; cvs.height = h * dpr;
    cvs.style.width = w + 'px'; cvs.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    if (posMapRef.current.size !== filteredNodes.length || !posMapRef.current.has(filteredNodes[0]?.id)) {
      posMapRef.current = computeForceLayout(filteredNodes, filteredEdges, w, h);
    }
    const pos = posMapRef.current;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Edges first (below nodes)
    for (const e of filteredEdges) {
      const s = pos.get(e.source), t = pos.get(e.target);
      if (!s || !t) continue;
      ctx.beginPath();
      const dx = t.x - s.x, dy = t.y - s.y;
      const cp = { x: (s.x + t.x) / 2 + dy * 0.05, y: (s.y + t.y) / 2 - dx * 0.05 };
      ctx.moveTo(s.x, s.y);
      ctx.quadraticCurveTo(cp.x, cp.y, t.x, t.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = Math.max(0.3, Math.min(e.weight || 1, 2));
      ctx.stroke();
    }

    // Nodes
    for (const n of filteredNodes) {
      const p = pos.get(n.id);
      if (!p) continue;
      const kindColor = KIND_COLORS[n.kind] || n.color;
      const baseSize = KIND_SIZES[n.kind] || n.size || 14;
      const isSelected = selectedNode?.id === n.id;
      const isHovered = hoveredNode?.id === n.id;
      const size = baseSize * (isSelected ? 1.6 : isHovered ? 1.3 : 1);

      // Glow for selected/hovered
      if (isSelected || isHovered) {
        const glowSize = size + 8;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
        grad.addColorStop(0, kindColor + (isSelected ? '66' : '44'));
        grad.addColorStop(1, kindColor + '00');
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Outer ring
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = kindColor + '15';
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = kindColor;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = kindColor + '33';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Labels only when zoomed in enough and label toggle is on
      const showLabel = showLabels && zoom >= 0.5;
      if (showLabel) {
        const fontSize = Math.max(7, Math.round(9 * Math.min(zoom, 1.5)));
        ctx.fillStyle = C.text;
        ctx.font = `${fontSize}px "DM Sans", -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        const maxLen = Math.max(6, Math.round(20 * zoom));
        const label = n.label.length > maxLen ? n.label.slice(0, maxLen - 2) + '..' : n.label;
        ctx.globalAlpha = Math.min(0.8, zoom * 0.6);
        ctx.fillText(label, p.x, p.y + size / 2 + 6 + fontSize * 0.6);
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
  }, [filteredNodes, filteredEdges, selectedNode, hoveredNode, zoom, pan, showLabels]);

  const getNodeAt = useCallback((mx: number, my: number): Node | null => {
    const pos = posMapRef.current;
    const tx = (mx - pan.x) / zoom, ty = (my - pan.y) / zoom;
    for (let i = filteredNodes.length - 1; i >= 0; i--) {
      const n = filteredNodes[i];
      const p = pos.get(n.id);
      if (!p) continue;
      const size = (KIND_SIZES[n.kind] || n.size || 14) * (selectedNode?.id === n.id ? 1.6 : 1);
      if (Math.hypot(tx - p.x, ty - p.y) < size / 2 + 4) return n;
    }
    return null;
  }, [filteredNodes, zoom, pan, selectedNode]);

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (dragStart) return; // dragging
    setTooltipPos({ x: e.clientX, y: e.clientY });
    setHoveredNode(getNodeAt(mx, my));
  }, [getNodeAt, dragStart]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current;
    if (!cvs || dragStart) return;
    const rect = cvs.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const clicked = getNodeAt(mx, my);
    setSelectedNode(clicked || null);
  }, [getNodeAt, dragStart]);

  const handleCanvasLeave = useCallback(() => {
    setHoveredNode(null);
    setTooltipPos(null);
  }, []);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.max(0.2, Math.min(5, z * (e.deltaY > 0 ? 0.9 : 1.1))));
    };
    cvs.addEventListener('wheel', onWheel, { passive: false });
    return () => cvs.removeEventListener('wheel', onWheel);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseUp = useCallback(() => {
    setDragStart(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const handleMouseMovePan = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStart) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragStart]);

  if (error) return <div style={{ minHeight: '100vh', background: C.bg, color: C.critical, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', -apple-system, sans-serif", flexDirection: 'column', gap: 12 }}>
    <div style={{ fontSize: 14 }}>Erro: {error}</div>
    <button onClick={() => loadData(activeScanId)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid ' + C.critical, background: 'transparent', color: C.critical, cursor: 'pointer', fontSize: 10 }}>Tentar novamente</button>
  </div>;

  if (loading && nodes.length === 0) return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'DM Sans', -apple-system, sans-serif", display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid ' + C.border, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #0ECFB8, #5B50F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#080A0E' }}>G</div>
          <div><div style={{ fontWeight: 800, fontSize: 13 }}>CodeGuard OS</div><div style={{ fontSize: 10, color: C.muted }}>Living Standards Framework v1.0</div></div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 24, height: 24, border: '2px solid ' + C.border, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 11, color: C.muted }}>Carregando grafo...</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'DM Sans', -apple-system, sans-serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ borderBottom: '1px solid ' + C.border, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #0ECFB8, #5B50F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#080A0E' }}>G</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '-0.02em' }}>CodeGuard OS</div>
            <div style={{ fontSize: 10, color: C.muted }}>Living Standards Framework v1.0</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 3, flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          {lenses.map(l => (
            <button key={l.id} onClick={() => { setActiveLens(activeLens === l.id ? null : l.id); setActiveCf(null); }}
              style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid ' + (activeLens === l.id ? l.color : C.border), background: activeLens === l.id ? l.color + '22' : 'transparent', color: activeLens === l.id ? l.color : C.muted, cursor: 'pointer', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: l.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: l.color }}>{l.icon}</span>
              {l.name}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {activeLensObj != null && <div style={{ fontSize: 10, color: activeLensObj.color, maxWidth: 160, textAlign: 'right', lineHeight: 1.3 }}>"{activeLensObj.question}"</div>}
          <button onClick={() => { setActiveLens(null); setActiveCf(null); setSelectedNode(null); }} style={{ padding: '3px 7px', borderRadius: 6, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 10, whiteSpace: 'nowrap' }}>Limpar</button>
          <input value={scanUrl} onChange={e => setScanUrl(e.target.value)} placeholder="github.com/owner/repo (ex: NirDiamant/GenAI_Agents)"
            onKeyDown={e => e.key === 'Enter' && handleScan()}
            style={{ width: 140, padding: '4px 8px', borderRadius: 6, border: '1px solid ' + C.border, background: C.surface, color: C.text, fontSize: 10, outline: 'none' }} />
          <button onClick={handleScan} disabled={scanning || !scanUrl.trim()}
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid ' + C.accent, background: scanning ? 'rgba(14,207,184,0.05)' : 'rgba(14,207,184,0.15)', color: C.accent, cursor: scanning ? 'wait' : 'pointer', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {scanning ? '⋯' : '▶ Scan'}
          </button>
          <button onClick={handleRebuild} disabled={rebuilding}
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid ' + C.accent, background: rebuilding ? 'rgba(14,207,184,0.05)' : 'rgba(14,207,184,0.15)', color: C.accent, cursor: 'pointer', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {rebuilding ? '⋯' : 'Reconstruir'}
          </button>
          <button onClick={() => window.open('/api/v1/report?format=pdf', '_blank')} title="Board Report (AI Act + Governança) em PDF"
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #E879F9', background: 'rgba(232,121,249,0.12)', color: '#E879F9', cursor: 'pointer', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
            ⬇ Report
          </button>
        </div>
      </div>

      {message && (
        <div style={{ margin: '6px 20px 0', padding: '5px 10px', borderRadius: 6, background: message.includes('Erro') || message.includes('error') ? 'rgba(248,113,113,0.1)' : 'rgba(14,207,184,0.08)', border: '1px solid ' + ((message.includes('Erro') || message.includes('error')) ? C.critical : C.accent), fontSize: 11, color: (message.includes('Erro') || message.includes('error')) ? C.critical : C.accent, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {message}
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* Scan history */}
      {scans.length > 0 && (
        <div style={{ margin: '0 20px', padding: '4px 0', display: 'flex', gap: 4, alignItems: 'center', overflow: 'auto' }}>
          <span style={{ fontSize: 9, color: C.muted, fontWeight: 600, whiteSpace: 'nowrap', marginRight: 4 }}>Histórico:</span>
          <button onClick={() => { setActiveScanId(null); loadData(null); }}
            style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid ' + (!activeScanId ? C.accent : 'transparent'), background: !activeScanId ? C.accent + '15' : 'transparent', color: !activeScanId ? C.accent : C.muted, cursor: 'pointer', fontSize: 9, whiteSpace: 'nowrap' }}>
            Todos
          </button>
          {scans.slice(0, 15).map((s: any) => (
            <button key={s.id} onClick={() => { setActiveScanId(s.id); loadData(s.id); }}
              title={`${s.agents} agents, ${s.risks} risks, ${s.certLevel}`}
              style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid ' + (activeScanId === s.id ? C.accent : 'transparent'), background: activeScanId === s.id ? C.accent + '15' : 'transparent', color: activeScanId === s.id ? C.accent : C.muted, cursor: 'pointer', fontSize: 9, whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {s.target.length > 35 ? s.target.slice(0, 32) + '..' : s.target}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ width: 230, flexShrink: 0, borderRight: '1px solid ' + C.border, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 12px 6px', fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Módulos Constitucionais</span>
            <span style={{ fontWeight: 400, color: C.muted, fontSize: 9 }}>{sidebarCfModules.length}</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {sidebarCfModules.map(cf => {
              const isActive = activeCf === cf.code;
              const cfColor = CF_COLORS[cf.code] ?? C.accent;
              return (
                <div key={cf.code} onClick={() => setActiveCf(isActive ? null : cf.code)}
                  style={{ padding: '7px 12px', cursor: 'pointer', borderLeft: '3px solid ' + (isActive ? cfColor : 'transparent'), background: isActive ? cfColor + '0a' : 'transparent', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 4, background: cfColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: cfColor }}>{cf.code.replace('CF-', '')}</span>
                    <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cf.name.split(' (')[0]}</span>
                    <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{cf.totalRecords}</span>
                  </div>
                  {isActive && (
                    <div style={{ marginTop: 6, paddingLeft: 24, fontSize: 10, color: C.muted }}>
                      <div style={{ fontStyle: 'italic', marginBottom: 6, padding: '4px 6px', borderRadius: 4, background: cfColor + '0d', borderLeft: '2px solid ' + cfColor, color: cfColor, lineHeight: 1.4 }}>"{cf.question}"</div>
                      <div style={{ fontWeight: 600, fontSize: 9, color: C.text, marginBottom: 4 }}>ENTIDADES ({activeCfEntities.length})</div>
                      <div style={{ maxHeight: 160, overflow: 'auto' }}>
                        {activeCfEntities.map(ent => {
                          const kc = KIND_COLORS[ent.kind] || C.accent;
                          return (
                            <div key={ent.id} onClick={e => { e.stopPropagation(); setSelectedNode(ent); }}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px', borderRadius: 4, cursor: 'pointer' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: kc, flexShrink: 0 }} />
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10 }}>{ent.label}</span>
                              <span style={{ fontSize: 8, color: kc, textTransform: 'uppercase', fontWeight: 600 }}>{ent.kind}</span>
                            </div>
                          );
                        })}
                        {activeCfEntities.length === 0 && <div style={{ fontSize: 10, color: C.muted, padding: '4px 0' }}>Nenhuma entidade</div>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {sidebarCfModules.length === 0 && (
              <div style={{ padding: '20px 12px', fontSize: 10, color: C.muted, textAlign: 'center' }}>
                {activeLens ? 'Nenhum módulo para esta lente' : 'Nenhum módulo encontrado'}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', padding: 0, position: 'relative', minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 8, gap: 8, position: 'relative', overflow: 'auto' }}>
            {refreshing && <div style={{ position: 'absolute', top: 12, right: 12, padding: '2px 8px', borderRadius: 4, background: 'rgba(14,207,184,0.1)', border: '1px solid rgba(14,207,184,0.2)', fontSize: 9, color: C.accent, zIndex: 10 }}>atualizando...</div>}

            {scanning && (
              <div style={{ padding: 16, borderRadius: 10, background: 'rgba(14,207,184,0.03)', border: '1px solid rgba(14,207,184,0.15)', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.accent }}>Scan em andamento</span>
                  <span style={{ fontSize: 9, color: C.muted }}>github.com/{scanUrl.replace('https://github.com/', '').replace('https://www.github.com/', '') || '...'}</span>
                </div>
                <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'rgba(14,207,184,0.1)', overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ width: '40%', height: '100%', borderRadius: 2, background: C.accent, transform: 'translateX(-100%)', animation: 'scanProgress 2s ease-in-out infinite' }} />
                </div>
                <div style={{ fontSize: 10, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: C.accent, animation: 'pulse 1s ease-in-out infinite' }} />
                  {scanProgress || 'Preparando...'}
                </div>
                <style>{`@keyframes scanProgress { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } } @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
              </div>
            )}

            {lastScanResult && !activeLens && !activeCf && (
              <div style={{ padding: 14, borderRadius: 10, background: C.surface, border: '1px solid ' + C.border }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: C.accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>✓</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Scan concluído: {lastScanResult.target}</div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Agentes', value: lastScanResult.agents, color: '#0ECFB8' },
                        { label: 'Riscos', value: lastScanResult.risks, color: '#F87171' },
                        { label: 'Evidências', value: lastScanResult.evidence, color: '#A78BFA' },
                        { label: 'Certificação', value: (lastScanResult.certLevel ?? '—').toUpperCase(), color: lastScanResult.certLevel === 'silver' ? C.accent : '#FACC15' },
                        { label: 'Score', value: lastScanResult.score ?? '—', color: C.accent },
                      ].map(m => (
                        <div key={m.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>{m.value}</div>
                          <div style={{ fontSize: 8, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 9, color: C.muted }}>
                      {lastScanResult.entitiesCreated || 0} entidades · {lastScanResult.relsCreated || 0} relacionamentos criados
                    </div>
                  </div>
                  <button onClick={() => setLastScanResult(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>✕</button>
                </div>
              </div>
            )}

            {!activeLens && !activeCf ? (
              /* ── Default: Summary Dashboard ── */
              <>
                {/* Key metrics row — only non-zero */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Agentes', value: byKind['agent'] ?? 0, color: '#0ECFB8', icon: 'A' },
                    { label: 'Riscos', value: byKind['risk'] ?? 0, color: '#F87171', icon: 'R' },
                    { label: 'Evidências', value: byKind['evidence'] ?? 0, color: '#A78BFA', icon: 'E' },
                    { label: 'Modelos', value: byKind['model'] ?? 0, color: '#06B6D4', icon: 'M' },
                    { label: 'Owners', value: byKind['owner'] ?? 0, color: '#EC4899', icon: 'O' },
                    { label: 'Certificados', value: byKind['certificate'] ?? 0, color: '#E879F9', icon: 'C' },
                    { label: 'Decisões', value: byKind['decision'] ?? 0, color: '#5B50F0', icon: 'D' },
                  ].filter(m => m.value > 0).map(m => (
                    <div key={m.label} style={{ flex: 1, minWidth: 100, padding: '12px 14px', borderRadius: 10, background: C.surface, border: '1px solid ' + C.border }}>
                      <div style={{ fontSize: 9, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 14, height: 14, borderRadius: 3, background: m.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: m.color }}>{m.icon}</span>
                        {m.label}
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* Risk breakdown + Score + Recent scans */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 2, padding: '12px 14px', borderRadius: 10, background: C.surface, border: '1px solid ' + C.border }}>
                    <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Distribuição de Risco</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['critical', 'high', 'medium', 'low'].filter(rl => nodes.filter(n => n.riskLevel === rl && n.kind === 'agent').length > 0).map(rl => {
                        const count = nodes.filter(n => n.riskLevel === rl && n.kind === 'agent').length;
                        const total = nodes.filter(n => n.kind === 'agent').length;
                        const pct = total > 0 ? Math.round(count / total * 100) : 0;
                        return (
                          <div key={rl} style={{ flex: 1, padding: '6px 8px', borderRadius: 6, background: (RISK_COLORS[rl] || C.muted) + '0d' }}>
                            <div style={{ fontSize: 9, color: RISK_COLORS[rl] || C.muted, fontWeight: 600, textTransform: 'uppercase' }}>{rl}</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: RISK_COLORS[rl] || C.muted }}>{count}</div>
                            <div style={{ fontSize: 9, color: C.muted }}>{pct}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: C.surface, border: '1px solid ' + C.border, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Compliance Score</div>
                    <div style={{ fontSize: 36, fontWeight: 900, color: C.accent }}>{summary.universalComplianceScore ?? '—'}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>/ 100</div>
                    <div style={{ marginTop: 6, fontSize: 9, color: C.muted }}>{cfModules.filter(c => c.totalRecords > 0).length}/{cfModules.length} CF modules ativos</div>
                  </div>
                  {scans.length > 0 && (
                    <div style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: C.surface, border: '1px solid ' + C.border }}>
                      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Últimos Scans</div>
                      {scans.slice(0, 4).map(s => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 9, borderBottom: '1px solid ' + C.border + '44' }}>
                          <span style={{ color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{s.target.replace('https://github.com/', '')}</span>
                          <span style={{ color: s.certLevel === 'silver' ? C.accent : C.muted, fontWeight: 600, textTransform: 'uppercase' }}>{s.certLevel} ({s.agents}ag)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active CF modules */}
                <div style={{ padding: '12px 14px', borderRadius: 10, background: C.surface, border: '1px solid ' + C.border }}>
                  <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Módulos Constitucionais Ativos</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {cfModules.filter(c => c.totalRecords > 0).map(cf => (
                      <button key={cf.code} onClick={() => setActiveCf(cf.code)}
                        style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid ' + (CF_COLORS[cf.code] ?? C.border), background: (CF_COLORS[cf.code] ?? C.muted) + '0a', color: CF_COLORS[cf.code] ?? C.text, cursor: 'pointer', fontSize: 9, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontWeight: 700 }}>{cf.totalRecords}</span>
                        <span>{cf.name.split(' (')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Inventário de Agentes (gov_repo — Single Source of Truth) ── */}
                {govAgents.length > 0 && (
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: C.surface, border: '1px solid ' + C.border }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Inventário de Agentes ({govAgents.length}) — Single Source of Truth
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {Object.entries(govByStatus).map(([st, n]) => (
                          <span key={st} style={{ padding: '2px 6px', borderRadius: 4, fontSize: 8, fontWeight: 600, background: st === 'active' ? '#22C55E15' : st === 'pending_registration' ? '#FACC1515' : C.bg, color: st === 'active' ? '#22C55E' : st === 'pending_registration' ? '#FACC15' : C.muted }}>
                            {st.replace('_', ' ')}: {n}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ maxHeight: 220, overflow: 'auto' }}>
                      {govAgents.slice(0, 30).map((a: any) => {
                        const rc = RISK_COLORS[a.risk_level] || C.muted;
                        const st = a.status as string;
                        return (
                          <div key={a.agent_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 6, borderBottom: '1px solid ' + C.border + '33', fontSize: 10 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: rc, flexShrink: 0 }} />
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{a.name}</span>
                            <span style={{ fontSize: 8, color: C.muted }}>{a.agent_code}</span>
                            <span style={{ fontSize: 8, color: rc, fontWeight: 600, textTransform: 'uppercase' }}>{a.risk_level}</span>
                            <span style={{ fontSize: 8, color: C.muted }}>{a.agent_type}</span>
                            <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 8, fontWeight: 600, background: st === 'active' ? '#22C55E15' : st === 'pending_registration' ? '#FACC1515' : st === 'decommissioned' ? '#F8717115' : C.bg, color: st === 'active' ? '#22C55E' : st === 'pending_registration' ? '#FACC15' : st === 'decommissioned' ? '#F87171' : C.text }}>
                              {st.replace('_', ' ')}
                            </span>
                            <div style={{ display: 'flex', gap: 3 }}>
                              {st === 'pending_registration' && (
                                <>
                                  <button onClick={() => handleTransition(a.agent_id, 'registered')} title="Registrar (CG-AG-001)"
                                    style={{ padding: '1px 6px', borderRadius: 3, border: '1px solid #22C55E44', background: '#22C55E0a', color: '#22C55E', cursor: 'pointer', fontSize: 8 }}>Registrar</button>
                                  <button onClick={() => handleTransition(a.agent_id, 'decommissioned')} title="Rejeitar"
                                    style={{ padding: '1px 6px', borderRadius: 3, border: '1px solid #F8717144', background: '#F871710a', color: '#F87171', cursor: 'pointer', fontSize: 8 }}>Rejeitar</button>
                                </>
                              )}
                              {st === 'registered' && (
                                <button onClick={() => handleTransition(a.agent_id, 'active')} title="Ativar"
                                  style={{ padding: '1px 6px', borderRadius: 3, border: '1px solid #0ECFB844', background: '#0ECFB80a', color: '#0ECFB8', cursor: 'pointer', fontSize: 8 }}>Ativar</button>
                              )}
                              {st === 'active' && (
                                <button onClick={() => handleTransition(a.agent_id, 'suspended')} title="Suspender"
                                  style={{ padding: '1px 6px', borderRadius: 3, border: '1px solid #F9731644', background: '#F973160a', color: '#F97316', cursor: 'pointer', fontSize: 8 }}>Suspender</button>
                              )}
                              {st === 'suspended' && (
                                <button onClick={() => handleTransition(a.agent_id, 'active')} title="Reativar"
                                  style={{ padding: '1px 6px', borderRadius: 3, border: '1px solid #22C55E44', background: '#22C55E0a', color: '#22C55E', cursor: 'pointer', fontSize: 8 }}>Reativar</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Talk to Governance ── */}
                <div style={{ padding: '12px 14px', borderRadius: 10, background: C.surface, border: '1px solid ' + C.border }}>
                  <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>💬 Talk to Governance</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <input value={talkQ} onChange={e => setTalkQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTalk()}
                      placeholder="Ex: Quais agentes processam dados pessoais? / Are we compliant?"
                      style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid ' + C.border, background: C.bg, color: C.text, fontSize: 11, outline: 'none' }} />
                    <button onClick={handleTalk} disabled={talkLoading || !talkQ.trim()}
                      style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid ' + C.accent, background: C.accent + '15', color: C.accent, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                      {talkLoading ? '⋯' : 'Perguntar'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: talkAnswer ? 8 : 0 }}>
                    {['Are we compliant?', 'Which agents process personal data?', 'Where are the risks?', 'Who owns the agents?'].map(q => (
                      <button key={q} onClick={() => { setTalkQ(q); }}
                        style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid ' + C.border, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 9 }}>{q}</button>
                    ))}
                  </div>
                  {talkAnswer && (
                    <div style={{ padding: 10, borderRadius: 8, background: C.bg, border: '1px solid ' + C.border }}>
                      {talkAnswer.error ? (
                        <div style={{ fontSize: 10, color: C.critical }}>{talkAnswer.error}</div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 8, fontWeight: 700, background: C.accent + '15', color: C.accent, textTransform: 'uppercase' }}>{talkAnswer.intent}</span>
                            <span style={{ fontSize: 9, color: C.muted }}>confiança {talkAnswer.confidence}%</span>
                          </div>
                          <div style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 6 }}>{talkAnswer.answer?.pt ?? talkAnswer.answer?.en ?? JSON.stringify(talkAnswer.answer)?.slice(0, 400)}</div>
                          {Array.isArray(talkAnswer.evidence) && talkAnswer.evidence.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                              {talkAnswer.evidence.slice(0, 8).map((ev: string, i: number) => (
                                <span key={i} style={{ padding: '1px 6px', borderRadius: 3, fontSize: 8, background: C.surface, border: '1px solid ' + C.border, color: C.muted }}>{ev}</span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Lens shortcuts */}
                <div style={{ padding: '12px 14px', borderRadius: 10, background: C.surface, border: '1px solid ' + C.border }}>
                  <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Lentes Executivas</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {lenses.map(l => (
                      <button key={l.id} onClick={() => { setActiveLens(l.id); setActiveCf(null); }}
                        style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid ' + l.color + '44', background: l.color + '0a', color: l.color, cursor: 'pointer', fontSize: 9, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span>{l.icon}</span>
                        <span>{l.name}</span>
                        <span style={{ fontSize: 8, opacity: 0.7 }}>— {l.question}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* ── Lens/CF Graph View ── */
              <div style={{ flex: 1, background: C.surface, borderRadius: 12, border: '1px solid ' + C.border, overflow: 'hidden', position: 'relative', minHeight: 400 }}>
                {filteredNodes.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.muted, fontSize: 12, flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 24, opacity: 0.3 }}>○</div>
                    <div>Nenhum nó para exibir</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{activeCf ? 'Tente remover o filtro do módulo' : 'Tente selecionar outra lente'}</div>
                  </div>
                ) : (
                  <>
                    {(activeLensObj || activeCfModule) && (
                      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 5, display: 'flex', gap: 4, alignItems: 'center' }}>
                        {activeLensObj && (
                          <div style={{ padding: '4px 10px', borderRadius: 6, background: activeLensObj.color + '15', border: '1px solid ' + activeLensObj.color + '33', fontSize: 10, color: activeLensObj.color }}>
                            {activeLensObj.icon} {activeLensObj.name}: "{activeLensObj.question}"
                          </div>
                        )}
                        {activeCfModule && (
                          <div style={{ padding: '4px 10px', borderRadius: 6, background: (CF_COLORS[activeCfModule.code] ?? C.accent) + '15', border: '1px solid ' + (CF_COLORS[activeCfModule.code] ?? C.accent) + '33', fontSize: 10, color: CF_COLORS[activeCfModule.code] ?? C.accent }}>
                            {activeCfModule.code}: {activeCfModule.name.split(' (')[0]}
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 5, display: 'flex', gap: 4 }}>
                      <button onClick={() => { posMapRef.current = computeForceLayout(filteredNodes, filteredEdges, canvasRef.current?.parentElement?.getBoundingClientRect().width || 800, canvasRef.current?.parentElement?.getBoundingClientRect().height || 600); setZoom(z => z + 0.001); }} title="Redesenhar"
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid ' + C.border, background: C.surface, color: C.muted, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⟳</button>
                      <button onClick={() => setShowLabels(s => !s)}
                        style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid ' + (showLabels ? C.accent : C.border), background: showLabels ? C.accent + '15' : 'transparent', color: showLabels ? C.accent : C.muted, cursor: 'pointer', fontSize: 9 }}>
                        {showLabels ? 'Rótulos' : 'Sem rótulos'}
                      </button>
                    </div>
                    <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 5, display: 'flex', gap: 4 }}>
                      <button onClick={() => setZoom(z => Math.min(5, z * 1.3))} title="Zoom in"
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid ' + C.border, background: C.surface, color: C.text, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      <button onClick={() => setZoom(z => Math.max(0.2, z * 0.7))} title="Zoom out"
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid ' + C.border, background: C.surface, color: C.text, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset view"
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid ' + C.border, background: C.surface, color: C.text, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⟲</button>
                    </div>
                    <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 5 }}>{(activeCf || filteredNodes.length > 100) && (
                      <div style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #FACC1544', background: '#FACC150d', fontSize: 9, color: '#FACC15' }}>
                        {activeCf ? `${activeCf}: ${filteredNodes.length} nós` : `${filteredNodes.length} nós`} — scroll zoom, arraste navegar
                      </div>
                    )}</div>
                    <canvas ref={canvasRef}
                      onMouseMove={(e) => { handleCanvasMove(e); handleMouseMovePan(e); }}
                      onMouseLeave={handleCanvasLeave}
                      onMouseDown={handleMouseDown}
                      onMouseUp={handleMouseUp}
                      onClick={handleCanvasClick}
                      style={{ width: '100%', height: '100%', display: 'block', cursor: dragStart ? 'grabbing' : hoveredNode ? 'pointer' : 'grab' }} />
                    {hoveredNode && tooltipPos && (
                      <div style={{ position: 'fixed', left: tooltipPos.x + 12, top: tooltipPos.y - 10, zIndex: 1000, pointerEvents: 'none', background: '#151A24', border: '1px solid ' + C.border, borderRadius: 8, padding: '6px 10px', fontSize: 11, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', maxWidth: 220 }}>
                        <div style={{ fontWeight: 700, color: C.text, marginBottom: 2 }}>{hoveredNode.label}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ color: KIND_COLORS[hoveredNode.kind] || C.accent, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{hoveredNode.kind}</span>
                          {hoveredNode.cfModule && <span style={{ color: C.muted, fontSize: 9 }}>· {hoveredNode.cfModule}</span>}
                          {hoveredNode.riskLevel && <span style={{ color: RISK_COLORS[hoveredNode.riskLevel] || C.muted, fontSize: 9, fontWeight: 600 }}>· {hoveredNode.riskLevel}</span>}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Right info panel inline (below graph or alongside) */}
            {selectedNode && (
              <div style={{ padding: 14, borderRadius: 10, background: C.surface, border: '1px solid ' + C.border }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: KIND_COLORS[selectedNode.kind] || selectedNode.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: KIND_COLORS[selectedNode.kind] || selectedNode.color, textTransform: 'uppercase' }}>{selectedNode.kind}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{selectedNode.label}</span>
                  </div>
                  <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
                </div>
                {selectedNode.description && <div style={{ fontSize: 10, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>{selectedNode.description}</div>}
                {selectedNode.riskLevel && (
                  <span style={{ padding: '2px 6px', borderRadius: 4, background: (RISK_COLORS[selectedNode.riskLevel] || C.muted) + '15', border: '1px solid ' + (RISK_COLORS[selectedNode.riskLevel] || C.muted) + '30', fontSize: 9, color: RISK_COLORS[selectedNode.riskLevel] || C.muted, fontWeight: 600 }}>{selectedNode.riskLevel.toUpperCase()}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid ' + C.border, padding: '8px 20px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
        {[
          { label: `Agentes (${byKind['agent'] ?? 0})`, color: '#0ECFB8' },
          { label: `Riscos (${byKind['risk'] ?? 0})`, color: '#F87171' },
          { label: `Evidências (${byKind['evidence'] ?? 0})`, color: '#A78BFA' },
          { label: `Arestas (${filteredEdges.length})`, color: C.purple },
          { label: `Score: ${summary.universalComplianceScore ?? '—'} / 100`, color: C.low },
          { label: `CFs: ${cfModules.length} / ${cfModules.filter(c => c.totalRecords > 0).length} ativos`, color: C.accent },
          { label: `Nós (${filteredNodes.length})`, color: C.muted },
        ].map(s => (
          <div key={s.label} style={{ padding: '3px 10px', borderRadius: 6, background: s.color + '0d', border: '1px solid ' + s.color + '22', fontSize: 10, fontWeight: 600, color: s.color }}>{s.label}</div>
        ))}
      </div>
    </div>
  );
}
