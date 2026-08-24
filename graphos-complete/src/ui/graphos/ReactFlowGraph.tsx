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
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
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

type FilterCategory = 'all' | 'agents' | 'pii' | 'high_risk' | 'controls';
type ViewMode = 'progressive' | 'complete';

interface ReactFlowGraphProps {
  data: GraphData;
  width?: number | string;
  height?: number | string;
  onNodeClick?: (nodeId: string) => void;
  smartQuery?: string;
}

export default function ReactFlowGraph({
  data,
  height = '660px',
  onNodeClick,
  smartQuery,
}: ReactFlowGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState<LayoutDirection>('LR');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('progressive');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (smartQuery) {
      setSearchQuery(smartQuery);
    }
  }, [smartQuery]);

  // Find all agent nodes
  const agentNodes = useMemo(() => {
    if (!data || !data.nodes) return [];
    return data.nodes.filter(
      (n) => (n.type || '').toLowerCase() === 'agent' || (n.type || '').toLowerCase() === 'persona'
    );
  }, [data]);

  // Focused 1-hop subgraph on selected agent
  const focusedNodeIds = useMemo(() => {
    if (!selectedAgentId || !data || !data.edges) return null;

    const ids = new Set<string>([selectedAgentId]);
    data.edges.forEach((edge) => {
      if (edge.source === selectedAgentId) ids.add(edge.target);
      if (edge.target === selectedAgentId) ids.add(edge.source);
    });
    return ids;
  }, [selectedAgentId, data]);

  // Filtered raw nodes
  const rawFilteredNodes = useMemo(() => {
    if (!data || !data.nodes) return [];

    let list = data.nodes;

    if (focusedNodeIds) {
      list = list.filter((n) => focusedNodeIds.has(n.id));
    } else if (viewMode === 'progressive') {
      list = agentNodes.length > 0 ? agentNodes : data.nodes.slice(0, 10);
    }

    list = list.filter((node) => {
      const type = (node.type || '').toLowerCase();
      const label = node.label.toLowerCase();
      const subtitle = (node.subtitle || '').toLowerCase();

      if (activeFilter === 'agents') return type === 'agent' || type === 'persona';
      if (activeFilter === 'pii') return label.includes('pii') || subtitle.includes('pii') || Boolean((node as any).hasPii || (node as any).payload?.hasPII);
      if (activeFilter === 'high_risk') return (node.score !== undefined && node.score < 70) || label.includes('risk');
      if (activeFilter === 'controls') return type === 'control' || type === 'cg_ag_control';
      return true;
    });

    return list;
  }, [data, focusedNodeIds, viewMode, agentNodes, activeFilter]);

  const activeNodeIdSet = useMemo(() => new Set(rawFilteredNodes.map((n) => n.id)), [rawFilteredNodes]);

  // Initial layout computation to prevent stray edge lines
  const { initialNodes, initialEdges } = useMemo(() => {
    if (rawFilteredNodes.length === 0) {
      return { initialNodes: [], initialEdges: [] };
    }

    const unpositionedNodes: Node[] = rawFilteredNodes.map((node, i) => {
      const typeStr = (node.type || 'generic').toLowerCase();
      const mappedType = nodeTypes[typeStr] ? typeStr : 'generic';

      const isMatching =
        searchQuery.trim() === '' ||
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.subtitle && node.subtitle.toLowerCase().includes(searchQuery.toLowerCase()));

      return {
        id: node.id,
        type: mappedType,
        position: { x: (i % 3) * 350, y: Math.floor(i / 3) * 200 },
        data: {
          label: node.label,
          subtitle: node.subtitle,
          emoji: node.emoji,
          score: node.score,
          alliance: node.alliance,
          color: node.color,
          payload: node.payload,
          type: node.type,
          isSelected: selectedNode?.id === node.id,
        },
        style: {
          opacity: isMatching ? 1 : 0.25,
        },
      };
    });

    const filteredEdges: Edge[] = (data?.edges || [])
      .filter((edge) => activeNodeIdSet.has(edge.source) && activeNodeIdSet.has(edge.target))
      .map((edge, idx) => {
        const sentiment = edge.sentiment || 'neutral';
        const isNegative = sentiment === 'negative' || sentiment === 'critical';
        const isPositive = sentiment === 'positive' || sentiment === 'compliant';

        const strokeColor = isNegative ? '#f87171' : isPositive ? '#22c55e' : '#0ECFB8';

        return {
          id: `e-${edge.source}-${edge.target}-${idx}`,
          source: edge.source,
          target: edge.target,
          label: edge.label || '',
          animated: edge.dash || isNegative || isPositive,
          type: 'smoothstep',
          style: {
            stroke: strokeColor,
            strokeWidth: 2.2,
            opacity: 0.9,
          },
          labelStyle: {
            fill: '#F0F4FA',
            fontWeight: 800,
            fontSize: 10,
            fontFamily: 'monospace',
          },
          labelBgStyle: {
            fill: '#080A0E',
            fillOpacity: 0.95,
          },
          labelBgPadding: [6, 4] as [number, number],
          labelBgBorderRadius: 6,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
            width: 14,
            height: 14,
          },
        };
      });

    // Run Dagre layout immediately
    const layouted = getLayoutedElements(unpositionedNodes, filteredEdges, {
      direction,
      nodeWidth: 320,
      nodeHeight: 160,
      rankSep: 140,
      nodeSep: 90,
    });

    return { initialNodes: layouted.nodes, initialEdges: layouted.edges };
  }, [rawFilteredNodes, data?.edges, activeNodeIdSet, searchQuery, selectedNode, direction]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const originalNode = data.nodes.find((n) => n.id === node.id);
      if (originalNode) {
        setSelectedNode(originalNode);
        const type = (originalNode.type || '').toLowerCase();
        if (type === 'agent' || type === 'persona') {
          setSelectedAgentId(originalNode.id);
        }
      }
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [data.nodes, onNodeClick]
  );

  const resetDrillDown = useCallback(() => {
    setSelectedAgentId(null);
  }, []);

  const toggleDirection = useCallback(() => {
    setDirection((prev) => (prev === 'LR' ? 'TB' : 'LR'));
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

  const activeAgent = useMemo(() => {
    if (selectedNode) return selectedNode;
    if (agentNodes.length > 0) return agentNodes[0];
    return null;
  }, [selectedNode, agentNodes]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-300 flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : ''
      }`}
      style={{
        height: isFullscreen ? '100vh' : typeof height === 'number' ? `${height}px` : height,
        background: 'radial-gradient(circle at 50% 25%, #101726 0%, #080A0E 100%)',
      }}
    >
      {/* Top Header Dock */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0F1219]/95 backdrop-blur-xl z-20 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-gradient-to-r from-teal-500/20 to-indigo-500/20 border border-teal-500/40 text-[#0ECFB8] text-xs font-bold font-mono">
            <span>🧠</span>
            <span>GRAPHOS COCKPIT</span>
          </div>

          {selectedAgentId ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Linhagem do Agente:</span>
              <span className="text-xs font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                {selectedNode?.label || selectedAgentId}
              </span>
              <button
                onClick={resetDrillDown}
                className="text-xs font-bold text-[#0ECFB8] hover:underline cursor-pointer ml-1"
              >
                ← Ver Todos os Agentes
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              {viewMode === 'progressive'
                ? `Exibindo ${nodes.length} Agentes em Destaque (Clique em um nó para expandir a linhagem)`
                : `Visualização de Rede Completa (${nodes.length} nós)`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode((prev) => (prev === 'progressive' ? 'complete' : 'progressive'))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              viewMode === 'progressive'
                ? 'bg-cyan-950/80 border-cyan-500/60 text-[#0ECFB8] shadow-sm'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            {viewMode === 'progressive' ? '👁️ Foco Progressivo' : '🌐 Rede Completa'}
          </button>
        </div>
      </div>

      {/* React Flow Container */}
      <div style={{ width: '100%', height: '580px', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.2}
          maxZoom={2}
          attributionPosition="bottom-left"
          className="react-flow-dark"
        >
          <Background color="#1e293b" gap={30} size={1.2} />

          {/* Floating Search & Filters Dock */}
          <Panel position="top-left" className="flex items-center gap-2 m-4 flex-wrap">
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Buscar nó no grafo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-48 sm:w-60 rounded-xl bg-[#0F1219]/95 border border-white/15 pl-8 pr-3 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-[#0ECFB8] backdrop-blur-xl shadow-2xl transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-[#0F1219]/95 border border-white/15 p-1 backdrop-blur-xl shadow-2xl">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'agents', label: '🤖 Agentes' },
                  { id: 'pii', label: '⚠️ PII' },
                  { id: 'high_risk', label: '🔴 Alto Risco' },
                  { id: 'controls', label: '🛡️ CG-AG' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setActiveFilter(f.id);
                    if (selectedAgentId) resetDrillDown();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-150 ${
                    activeFilter === f.id
                      ? 'bg-[#0ECFB8] text-[#080A0E] shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </Panel>

          {/* Top Right Layout & Fullscreen Dock */}
          <Panel position="top-right" className="flex items-center gap-2 m-4">
            <button
              onClick={toggleDirection}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F1219]/95 border border-white/15 text-xs font-bold text-slate-200 hover:bg-[#151A24] hover:border-[#0ECFB8]/60 shadow-2xl backdrop-blur-xl transition-all"
            >
              <span>🧭</span>
              <span className="font-mono text-[#0ECFB8]">
                {direction === 'LR' ? 'Horizontal (L→R)' : 'Vertical (T→B)'}
              </span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="flex items-center justify-center h-9 w-9 rounded-xl bg-[#0F1219]/95 border border-white/15 text-slate-300 hover:text-white hover:border-cyan-500/60 shadow-2xl backdrop-blur-xl transition-all"
              title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
            >
              {isFullscreen ? '↙️' : '⛶'}
            </button>
          </Panel>

          <Controls
            className="!bg-[#0F1219]/95 !border-white/15 !shadow-2xl !rounded-2xl !p-1.5 !backdrop-blur-xl [&>button]:!bg-[#151A24] [&>button]:!border-white/10 [&>button]:!text-slate-200 hover:[&>button]:!bg-[#0ECFB8] hover:[&>button]:!text-black transition-colors"
            showInteractive={false}
          />

          <MiniMap
            nodeStrokeWidth={3}
            nodeColor={(node) => {
              if (node.type === 'agent') return '#0ECFB8';
              if (node.type === 'control') return '#22c55e';
              if (node.type === 'data_asset') return '#a855f7';
              if (node.type === 'risk' || node.type === 'incident') return '#ef4444';
              return '#38bdf8';
            }}
            maskColor="rgba(8, 10, 14, 0.88)"
            className="!bg-[#0F1219]/95 !border-white/15 !rounded-2xl !shadow-2xl"
            zoomable
            pannable
          />
        </ReactFlow>

        {/* 🌟 Floating Bottom Intelligence Bar */}
        {activeAgent && (
          <div className="absolute bottom-4 left-4 right-4 z-30 rounded-2xl border border-white/15 bg-[#080A0E]/95 backdrop-blur-2xl px-5 py-3 shadow-2xl flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0ECFB8]/20 to-[#5B50F0]/20 border border-cyan-500/30 text-xl">
                {activeAgent.emoji || '🤖'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black tracking-widest text-[#0ECFB8] uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30">
                    SELECIONADO
                  </span>
                  <span className="text-xs font-bold text-white">{activeAgent.label}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {activeAgent.subtitle || 'Agente de IA em operação no ecossistema governado'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-5 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-sans">Risco</span>
                <span className="font-bold text-amber-400">
                  {activeAgent.score !== undefined && activeAgent.score < 70 ? '🔴 HIGH' : '🟡 MEDIUM'}
                </span>
              </div>

              <div className="h-6 w-[1px] bg-white/10" />

              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-sans">Acesso PII</span>
                <span className="font-bold text-rose-400">
                  {Boolean((activeAgent as any).hasPii || (activeAgent as any).payload?.hasPII) || activeAgent.label.toLowerCase().includes('customer') || activeAgent.label.toLowerCase().includes('triage') ? 'SIM (LGPD)' : 'NÃO'}
                </span>
              </div>

              <div className="h-6 w-[1px] bg-white/10" />

              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-sans">Score CG-AG</span>
                <span className="font-bold text-[#0ECFB8]">
                  {activeAgent.score !== undefined ? `${activeAgent.score}%` : '85%'} (10/12)
                </span>
              </div>

              <div className="h-6 w-[1px] bg-white/10" />

              <button
                onClick={() => {
                  if (selectedAgentId === activeAgent.id) {
                    resetDrillDown();
                  } else {
                    setSelectedAgentId(activeAgent.id);
                    setSelectedNode(activeAgent);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0ECFB8] to-[#5B50F0] text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/60 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                {selectedAgentId === activeAgent.id ? '← Ver Todos os Agentes' : '🔍 Expandir Linhagem'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
