'use client';

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { AgentNode } from './nodes/AgentNode';
import { ControlNode } from './nodes/ControlNode';
import { DataAssetNode } from './nodes/DataAssetNode';
import { RiskNode } from './nodes/RiskNode';
import { GenericNode } from './nodes/GenericNode';
import { getLayoutedElements, type LayoutDirection } from './layoutUtils';
import type { GraphData, GraphNode, GraphEdge } from './types';

const nodeTypes: NodeTypes = {
  agent: AgentNode,
  persona: AgentNode,
  control: ControlNode,
  cg_ag_control: ControlNode,
  data_asset: DataAssetNode,
  data: DataAssetNode,
  risk: RiskNode,
  incident: RiskNode,
  generic: GenericNode,
  tool: GenericNode,
  external_system: GenericNode,
  decision: GenericNode,
  regulation: GenericNode,
  certificate: GenericNode,
  evidence: GenericNode,
  model: GenericNode,
  owner: GenericNode,
};

// Node width per type (must match actual rendered widths)
const NODE_WIDTHS: Record<string, number> = {
  agent: 310, persona: 310,
  control: 270, cg_ag_control: 270,
  data_asset: 270, data: 270,
  risk: 270, incident: 270,
  generic: 240, tool: 240, external_system: 240,
  decision: 240, regulation: 240, certificate: 240,
  evidence: 240, model: 240, owner: 240,
};

type FilterCategory = 'all' | 'agents' | 'pii' | 'high_risk' | 'controls';
type ViewMode = 'overview' | 'expanded';

interface ReactFlowGraphProps {
  data: GraphData;
  width?: number | string;
  height?: number | string;
  onNodeClick?: (nodeId: string) => void;
  smartQuery?: string;
}

// ─── Inner component (needs ReactFlowProvider context) ───────────────────────
function GraphInner({
  data,
  height = '660px',
  onNodeClick,
  smartQuery,
}: ReactFlowGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  const [direction, setDirection] = useState<LayoutDirection>('LR');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (smartQuery) setSearchQuery(smartQuery);
  }, [smartQuery]);

  // ── Agent nodes only
  const agentNodes = useMemo(() => {
    if (!data?.nodes) return [];
    return data.nodes.filter(
      (n) => ['agent', 'persona'].includes((n.type || '').toLowerCase())
    );
  }, [data]);

  // ── 1-hop subgraph for selected agent (max 12 neighbours to stay readable)
  const focusedNodeIds = useMemo(() => {
    if (!selectedAgentId || !data?.edges) return null;
    const ids = new Set<string>([selectedAgentId]);
    data.edges.forEach((e) => {
      if (e.source === selectedAgentId) ids.add(e.target);
      if (e.target === selectedAgentId) ids.add(e.source);
    });
    return ids;
  }, [selectedAgentId, data]);

  // ── Visible node list based on mode
  const rawFilteredNodes = useMemo(() => {
    if (!data?.nodes) return [];
    let list = data.nodes;

    if (focusedNodeIds) {
      // Drill-down: only the agent + its direct connections (cap at 16)
      list = list.filter((n) => focusedNodeIds.has(n.id)).slice(0, 16);
    } else if (viewMode === 'overview') {
      // Overview: agents only (max 12 for readability)
      list = agentNodes.slice(0, 12);
    }
    // Expanded: all nodes

    // Apply category filter
    list = list.filter((node) => {
      const type = (node.type || '').toLowerCase();
      const label = node.label.toLowerCase();
      const sub = (node.subtitle || '').toLowerCase();
      if (activeFilter === 'agents') return ['agent', 'persona'].includes(type);
      if (activeFilter === 'pii') return label.includes('pii') || sub.includes('pii') || (node as any).hasPii;
      if (activeFilter === 'high_risk') return (node.score !== undefined && node.score < 70) || label.includes('risk');
      if (activeFilter === 'controls') return ['control', 'cg_ag_control'].includes(type);
      return true;
    });

    return list;
  }, [data, focusedNodeIds, viewMode, agentNodes, activeFilter]);

  const activeNodeIdSet = useMemo(() => new Set(rawFilteredNodes.map((n) => n.id)), [rawFilteredNodes]);

  // ── Build positioned nodes + edges
  const { initialNodes, initialEdges } = useMemo(() => {
    if (rawFilteredNodes.length === 0) return { initialNodes: [], initialEdges: [] };

    const rfNodes: Node[] = rawFilteredNodes.map((node, i) => {
      const typeStr = (node.type || 'generic').toLowerCase();
      const mappedType = nodeTypes[typeStr] ? typeStr : 'generic';
      const isMatching =
        searchQuery.trim() === '' ||
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.subtitle || '').toLowerCase().includes(searchQuery.toLowerCase());

      return {
        id: node.id,
        type: mappedType,
        position: { x: (i % 3) * 400, y: Math.floor(i / 3) * 220 }, // fallback, Dagre overrides
        data: {
          label: node.label,
          subtitle: node.subtitle,
          emoji: node.emoji,
          score: node.score,
          alliance: node.alliance,
          color: node.color,
          payload: node.payload,
          type: node.type,
          hasPii: (node as any).hasPii,
        },
        style: { opacity: isMatching ? 1 : 0.2 },
      };
    });

    const rfEdges: Edge[] = (data?.edges || [])
      .filter((e) => activeNodeIdSet.has(e.source) && activeNodeIdSet.has(e.target))
      .map((edge, idx) => {
        const sentiment = edge.sentiment || 'neutral';
        const isNeg = sentiment === 'negative' || sentiment === 'critical' || sentiment === 'disagree';
        const isPos = sentiment === 'positive' || sentiment === 'compliant' || sentiment === 'agree';
        const color = isNeg ? '#f87171' : isPos ? '#22c55e' : '#0ECFB8';

        return {
          id: `e-${edge.source}-${edge.target}-${idx}`,
          source: edge.source,
          target: edge.target,
          label: edge.label || '',
          animated: isNeg || isPos,
          type: 'bezier',
          style: { stroke: color, strokeWidth: 2, opacity: 0.75 },
          labelStyle: { fill: '#F0F4FA', fontWeight: 700, fontSize: 10, fontFamily: 'monospace' },
          labelBgStyle: { fill: '#080A0E', fillOpacity: 0.9 },
          labelBgPadding: [5, 3] as [number, number],
          labelBgBorderRadius: 4,
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 12, height: 12 },
        };
      });

    // Dagre: spacious layout — bigger separation = nodes don't overlap edges
    const nodeW = focusedNodeIds ? 320 : 330;
    const nodeH = focusedNodeIds ? 200 : 180;
    const rankSep = focusedNodeIds ? 220 : 200;
    const nodeSep = focusedNodeIds ? 60 : 50;

    const layouted = getLayoutedElements(rfNodes, rfEdges, {
      direction,
      nodeWidth: nodeW,
      nodeHeight: nodeH,
      rankSep,
      nodeSep,
    });

    return { initialNodes: layouted.nodes, initialEdges: layouted.edges };
  }, [rawFilteredNodes, data?.edges, activeNodeIdSet, searchQuery, direction, focusedNodeIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    // Refit with appropriate zoom after layout
    const timer = setTimeout(() => {
      fitView({
        padding: 0.15,
        minZoom: focusedNodeIds ? 0.55 : 0.4,
        maxZoom: focusedNodeIds ? 0.85 : 0.75,
        duration: 400,
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView, focusedNodeIds]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const orig = data.nodes.find((n) => n.id === node.id);
      if (orig) {
        setSelectedNode(orig);
        const t = (orig.type || '').toLowerCase();
        if (t === 'agent' || t === 'persona') setSelectedAgentId(orig.id);
      }
      onNodeClick?.(node.id);
    },
    [data.nodes, onNodeClick]
  );

  const resetDrillDown = useCallback(() => {
    setSelectedAgentId(null);
    setSelectedNode(null);
  }, []);

  const toggleDirection = useCallback(() => {
    setDirection((d) => (d === 'LR' ? 'TB' : 'LR'));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const activeAgent = selectedNode || agentNodes[0] || null;

  // ── Edge legend data
  const edgeLegend = [
    { color: '#22c55e', label: 'Agree / Compliant' },
    { color: '#f87171', label: 'Risk / Disagree' },
    { color: '#0ECFB8', label: 'Neutral / Governed' },
  ];

  return (
    <div
      ref={containerRef}
      style={{
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9999 : undefined,
        width: '100%',
        height: isFullscreen ? '100vh' : (typeof height === 'number' ? `${height}px` : height),
        background: 'radial-gradient(ellipse at 50% 0%, #0d1520 0%, #080A0E 70%)',
        borderRadius: isFullscreen ? 0 : 20,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}
    >
      {/* ── Top Header Bar ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(10,13,20,0.95)', backdropFilter: 'blur(20px)',
        flexWrap: 'wrap', gap: 8, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Brand pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(14,207,184,0.18), rgba(91,80,240,0.18))',
            border: '1px solid rgba(14,207,184,0.35)',
          }}>
            <span style={{ fontSize: 13 }}>🧠</span>
            <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', color: '#0ECFB8', fontFamily: 'monospace' }}>GRAPHOS COCKPIT</span>
          </div>

          {selectedAgentId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#6B7A95' }}>Linhagem:</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#F0F4FA', background: 'rgba(255,255,255,0.08)', padding: '2px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)' }}>
                {selectedNode?.label || selectedAgentId}
              </span>
              <button onClick={resetDrillDown} style={{ fontSize: 11, fontWeight: 700, color: '#0ECFB8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                ← Ver Todos
              </button>
            </div>
          ) : (
            <span style={{ fontSize: 11, color: '#4B5776' }}>
              {viewMode === 'overview'
                ? `${nodes.length} Agentes em destaque  ·  Clique num agente para expandir a linhagem`
                : `Rede completa  ·  ${nodes.length} nós · ${edges.length} conexões`}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* View mode toggle */}
          <button
            onClick={() => { setViewMode((v) => v === 'overview' ? 'expanded' : 'overview'); if (selectedAgentId) resetDrillDown(); }}
            style={{
              padding: '5px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid',
              borderColor: viewMode === 'overview' ? 'rgba(14,207,184,0.5)' : 'rgba(255,255,255,0.12)',
              background: viewMode === 'overview' ? 'rgba(14,207,184,0.12)' : 'rgba(255,255,255,0.05)',
              color: viewMode === 'overview' ? '#0ECFB8' : '#9AA5BB',
            }}
          >
            {viewMode === 'overview' ? '👁️ Foco Executivo' : '🌐 Rede Completa'}
          </button>
        </div>
      </div>

      {/* ── React Flow Canvas ─────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          minZoom={0.15}
          maxZoom={1.5}
          attributionPosition="bottom-left"
          nodesDraggable={true}
          elementsSelectable={true}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            color="rgba(255,255,255,0.06)"
            gap={28}
            size={1}
          />

          {/* ── Floating Search + Filters ───────────────────────────── */}
          <Panel position="top-left" style={{ margin: '12px 0 0 12px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: 10, fontSize: 12, color: '#4B5776', pointerEvents: 'none' }}>🔍</span>
              <input
                type="text"
                placeholder="Buscar nó..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  height: 34, width: 180, paddingLeft: 30, paddingRight: 28,
                  borderRadius: 10, background: 'rgba(10,13,20,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#F0F4FA', fontSize: 11, outline: 'none', fontFamily: 'inherit',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 8, background: 'none', border: 'none', color: '#6B7A95', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}>✕</button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(10,13,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '2px 3px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
              {([
                { id: 'all', label: 'Todos' },
                { id: 'agents', label: '🤖 Agentes' },
                { id: 'pii', label: '⚠️ PII' },
                { id: 'high_risk', label: '🔴 Risco' },
                { id: 'controls', label: '🛡️ CG-AG' },
              ] as const).map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setActiveFilter(f.id); if (selectedAgentId) resetDrillDown(); }}
                  style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none',
                    background: activeFilter === f.id ? '#0ECFB8' : 'transparent',
                    color: activeFilter === f.id ? '#080A0E' : '#9AA5BB',
                    transition: 'all 0.15s',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </Panel>

          {/* ── Top Right: Direction + Fullscreen ───────────────────── */}
          <Panel position="top-right" style={{ margin: '12px 12px 0 0', display: 'flex', gap: 6 }}>
            <button
              onClick={toggleDirection}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 10,
                background: 'rgba(10,13,20,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#9AA5BB', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              <span>🧭</span>
              <span style={{ fontFamily: 'monospace', color: '#0ECFB8' }}>
                {direction === 'LR' ? 'Horizontal' : 'Vertical'}
              </span>
            </button>
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
              style={{
                width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(10,13,20,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#9AA5BB', cursor: 'pointer', fontSize: 14,
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              {isFullscreen ? '⊠' : '⛶'}
            </button>
          </Panel>

          {/* ── Controls ─────────────────────────────────────────────── */}
          <Controls showInteractive={false} />

          {/* ── Minimap ──────────────────────────────────────────────── */}
          <MiniMap
            nodeStrokeWidth={3}
            nodeColor={(n) => {
              if (n.type === 'agent' || n.type === 'persona') return '#0ECFB8';
              if (n.type === 'control' || n.type === 'cg_ag_control') return '#22c55e';
              if (n.type === 'data_asset' || n.type === 'data') return '#a855f7';
              if (n.type === 'risk' || n.type === 'incident') return '#ef4444';
              return '#38bdf8';
            }}
            maskColor="rgba(8,10,14,0.85)"
            zoomable
            pannable
          />

          {/* ── Edge Legend ───────────────────────────────────────────── */}
          <Panel position="bottom-left" style={{ margin: '0 0 8px 8px' }}>
            <div style={{
              display: 'flex', gap: 14, padding: '5px 12px',
              background: 'rgba(10,13,20,0.9)', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.07)',
              fontSize: 10, color: '#6B7A95',
            }}>
              {edgeLegend.map((l) => (
                <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 18, height: 2, borderRadius: 999, background: l.color, display: 'inline-block' }} />
                  {l.label}
                </span>
              ))}
            </div>
          </Panel>
        </ReactFlow>

        {/* ── Bottom Intelligence Cockpit Bar ───────────────────────── */}
        {activeAgent && (
          <div style={{
            position: 'absolute', bottom: 48, left: 12, right: 12, zIndex: 30,
            borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(8,10,14,0.96)', backdropFilter: 'blur(24px)',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            boxShadow: '0 -4px 32px rgba(0,0,0,0.5)',
          }}>
            {/* Left: agent identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                background: 'linear-gradient(135deg, rgba(14,207,184,0.2), rgba(91,80,240,0.2))',
                border: '1px solid rgba(14,207,184,0.3)',
              }}>
                {activeAgent.emoji || '🤖'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '1px 6px', borderRadius: 999, background: 'rgba(14,207,184,0.15)', color: '#0ECFB8', border: '1px solid rgba(14,207,184,0.3)' }}>
                    SELECIONADO
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#F0F4FA' }}>{activeAgent.label}</span>
                </div>
                <p style={{ fontSize: 10, color: '#4B5776', margin: 0, fontFamily: 'monospace' }}>
                  {activeAgent.subtitle || 'Agente de IA no ecossistema governado CG-AG'}
                </p>
              </div>
            </div>

            {/* Right: metrics */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'monospace', fontSize: 11 }}>
              {[
                {
                  label: 'RISCO',
                  value: activeAgent.score !== undefined && activeAgent.score < 50
                    ? '🔴 CRITICAL' : activeAgent.score !== undefined && activeAgent.score < 70
                      ? '🟠 HIGH' : activeAgent.score !== undefined && activeAgent.score < 85
                        ? '🟡 MEDIUM' : '🟢 LOW',
                  color: activeAgent.score !== undefined && activeAgent.score < 50
                    ? '#f87171' : activeAgent.score !== undefined && activeAgent.score < 70
                      ? '#fb923c' : activeAgent.score !== undefined && activeAgent.score < 85
                        ? '#facc15' : '#22c55e',
                },
                {
                  label: 'PII ACCESS',
                  value: (activeAgent as any).hasPii || activeAgent.label.toLowerCase().includes('customer') || activeAgent.label.toLowerCase().includes('triage') ? '⚠️ SIM (LGPD)' : '✓ NÃO',
                  color: (activeAgent as any).hasPii ? '#f87171' : '#22c55e',
                },
                {
                  label: 'CG-AG SCORE',
                  value: `${activeAgent.score ?? 85}%  (${Math.round(((activeAgent.score ?? 85) / 100) * 12)}/12)`,
                  color: '#0ECFB8',
                },
              ].map((m, i) => (
                <React.Fragment key={m.label}>
                  {i > 0 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />}
                  <div>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', color: '#4B5776', marginBottom: 2, fontFamily: 'sans-serif', textTransform: 'uppercase' }}>{m.label}</div>
                    <div style={{ fontWeight: 700, color: m.color }}>{m.value}</div>
                  </div>
                </React.Fragment>
              ))}

              <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />

              <button
                onClick={() => {
                  if (selectedAgentId === activeAgent.id) resetDrillDown();
                  else { setSelectedAgentId(activeAgent.id); setSelectedNode(activeAgent); }
                }}
                style={{
                  padding: '7px 16px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: 'linear-gradient(135deg, #0ECFB8, #5B50F0)',
                  color: '#080A0E', boxShadow: '0 4px 16px rgba(14,207,184,0.3)',
                  transition: 'opacity 0.2s',
                }}
              >
                {selectedAgentId === activeAgent.id ? '← Ver Todos' : '🔍 Expandir Linhagem'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Exported wrapper with ReactFlowProvider ─────────────────────────────────
export default function ReactFlowGraph(props: ReactFlowGraphProps) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}
