'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';
import type { SimulationNodeDatum } from 'd3';
import type { GraphData, GraphNode, GraphEdge } from './types';

interface SimNode extends SimulationNodeDatum {
  id: string;
  type: GraphNode['type'];
  label: string;
  subtitle?: string;
  emoji?: string;
  score?: number;
  alliance?: GraphNode['alliance'];
  color: string;
  radius: number;
  round?: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  weight: number;
  sentiment: GraphEdge['sentiment'];
  label?: string;
  dash?: boolean;
}

interface CouncilGraphProps {
  data: GraphData;
  width?: number;
  height?: number;
  onNodeClick?: (nodeId: string) => void;
}

export default function CouncilGraph({ data, width = 800, height = 500, onNodeClick }: CouncilGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNode } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dims = useRef({ width, height });

  const renderGraph = useCallback(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    // ── Phase 1: SVG Defs for Glow & Animations ──
    const defs = svg.append('defs');
    
    // Neon glow filter
    const filter = defs.append('filter')
      .attr('id', 'neon-glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', '4')
      .attr('result', 'blur');
    filter.append('feMerge')
      .selectAll('feMergeNode')
      .data(['blur', 'SourceGraphic'])
      .enter().append('feMergeNode')
      .attr('in', d => d);

    // Pulse animation & Glassmorphism classes
    defs.append('style').text(`
      @keyframes pulse {
        0% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.6); opacity: 0; }
        100% { transform: scale(1); opacity: 0; }
      }
      .pulsing-ring { animation: pulse 2s infinite cubic-bezier(0.4, 0, 0.2, 1); transform-origin: center; }
      .glass-label {
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        background: rgba(17, 24, 39, 0.6);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 6px;
        color: #B0B8C8;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4px 6px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
        width: 100%;
        height: 100%;
        box-sizing: border-box;
      }
      .node-title {
        font-size: 10px;
        font-weight: 600;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        max-width: 100%;
      }
      .node-score {
        font-size: 9px;
        color: #6B7A95;
      }
    `);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    const nodeMap = new Map(data.nodes.map(n => [n.id, n]));
    const simNodes: SimNode[] = data.nodes.map(n => ({
      id: n.id, type: n.type, label: n.label,
      subtitle: n.subtitle, emoji: n.emoji, score: n.score,
      alliance: n.alliance, color: n.color, radius: n.radius, round: n.round,
    }));
    const simLinks: SimLink[] = data.edges
      .filter(e => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map(e => ({ source: e.source, target: e.target, weight: e.weight, sentiment: e.sentiment, label: e.label, dash: e.dash }));

    const simulation = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simLinks).id(d => (d as SimNode).id).distance(d => 120 - (d as SimLink).weight * 0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => (d as SimNode).radius + 8));

    const edgeGroup = g.append('g').attr('class', 'edges');
    const nodeGroup = g.append('g').attr('class', 'nodes');

    // ── Phase 2: Curved Animated Edges ──
    const edge = edgeGroup
      .selectAll<SVGPathElement, SimLink>('path')
      .data(simLinks)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', d => d.sentiment === 'agree' ? '#22C55E' : d.sentiment === 'disagree' ? '#F87171' : '#6B7A95')
      .attr('stroke-width', d => Math.max(1, Math.min(d.weight * 0.3, 8)))
      .attr('stroke-opacity', 0.5)
      .attr('stroke-dasharray', d => d.dash ? '4,4' : 'none')
      .attr('filter', d => d.sentiment === 'disagree' || d.weight > 5 ? 'url(#neon-glow)' : null);

    const edgeLabel = edgeGroup
      .selectAll<SVGTextElement, SimLink>('text')
      .data(simLinks)
      .join('text')
      .text(d => d.label ?? '')
      .attr('font-size', '10')
      .attr('fill', '#F0F4FA')
      .attr('text-anchor', 'middle')
      .attr('dy', -4);

    const nodeEl = nodeGroup
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (_event, d) => {
        setSelectedId(prev => prev === d.id ? null : d.id);
        onNodeClick?.(d.id);
      })
      .on('mouseenter', (event, d) => {
        const rect = svgRef.current!.getBoundingClientRect();
        const gn = data.nodes.find(n => n.id === d.id);
        if (gn) setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top - 40, node: gn });
      })
      .on('mouseleave', () => setTooltip(null))
      .call(d3.drag<SVGGElement, SimNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // ── Phase 3: Pulsing Rings & Neon Glow Nodes ──
    nodeEl.append('circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.color + '33')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2)
      .attr('filter', d => (d.score !== undefined && d.score < 50) ? 'url(#neon-glow)' : null);

    // Pulsing ring for critical/large nodes
    nodeEl.filter(d => (d.score !== undefined && d.score < 50) || (d.radius > 25))
      .append('circle')
      .attr('class', 'pulsing-ring')
      .attr('r', d => d.radius)
      .attr('fill', 'none')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2);

    nodeEl.append('text')
      .text(d => d.emoji ?? '')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', d => Math.max(14, d.radius * 0.7));

    // ── Phase 4: Glassmorphism Labels via foreignObject ──
    nodeEl.append('foreignObject')
      .attr('x', d => -Math.max(50, d.radius * 2))
      .attr('y', d => d.radius + 6)
      .attr('width', d => Math.max(100, d.radius * 4))
      .attr('height', 44)
      .attr('style', 'overflow: visible;')
      .append('xhtml:div')
      .attr('class', 'glass-label')
      .html(d => `
        <div class="node-title" style="color: ${d.color};" title="${d.label}">${d.label}</div>
        ${d.score !== undefined ? `<div class="node-score">${d.score}% Score</div>` : ''}
      `);

    simulation.on('tick', () => {
      edge.attr('d', d => {
        const src = d.source as SimNode;
        const tgt = d.target as SimNode;
        const dx = tgt.x! - src.x!;
        const dy = tgt.y! - src.y!;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
        // Curve the path unless it's dashed
        return d.dash
          ? `M${src.x!},${src.y!} L${tgt.x!},${tgt.y!}`
          : `M${src.x!},${src.y!} A${dr},${dr} 0 0,1 ${tgt.x!},${tgt.y!}`;
      });

      edgeLabel
        .attr('x', d => {
          const src = d.source as SimNode;
          const tgt = d.target as SimNode;
          if (d.dash) return (src.x! + tgt.x!) / 2;
          const dy = tgt.y! - src.y!;
          return (src.x! + tgt.x!) / 2 - dy * 0.1;
        })
        .attr('y', d => {
          const src = d.source as SimNode;
          const tgt = d.target as SimNode;
          if (d.dash) return (src.y! + tgt.y!) / 2;
          const dx = tgt.x! - src.x!;
          return (src.y! + tgt.y!) / 2 + dx * 0.1;
        });

      nodeEl.attr('transform', d => `translate(${d.x!},${d.y!})`);
    });

    if (selectedId) {
      const connected = new Set<string>([selectedId]);
      for (const e of simLinks) {
        const src = typeof e.source === 'object' ? (e.source as SimNode).id : String(e.source);
        const tgt = typeof e.target === 'object' ? (e.target as SimNode).id : String(e.target);
        if (src === selectedId) connected.add(tgt);
        if (tgt === selectedId) connected.add(src);
      }
      nodeEl.attr('opacity', d => connected.has(d.id) ? 1 : 0.15);
      edge.attr('opacity', d => {
        const src = typeof d.source === 'object' ? (d.source as SimNode).id : String(d.source);
        const tgt = typeof d.target === 'object' ? (d.target as SimNode).id : String(d.target);
        return src === selectedId || tgt === selectedId ? 0.7 : 0.05;
      });
    } else {
      nodeEl.attr('opacity', 1);
      edge.attr('opacity', d => d.sentiment === 'agree' ? 0.7 : 0.4);
    }

    return () => {
      simulation.stop();
    };
  }, [data, width, height, onNodeClick, selectedId]);

  useEffect(() => {
    dims.current = { width, height };
  }, [width, height]);

  useEffect(() => {
    const cleanup = renderGraph();
    return () => cleanup?.();
  }, [renderGraph]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width, height, background: 'transparent' }}>
      <svg ref={svgRef} width={width} height={height} style={{ display: 'block' }} />
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            background: '#151A24',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '10px 14px',
            pointerEvents: 'none',
            zIndex: 100,
            maxWidth: 200,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: tooltip.node.color, marginBottom: 4 }}>
            {tooltip.node.emoji} {tooltip.node.label}
          </div>
          {tooltip.node.subtitle && (
            <div style={{ fontSize: 10, color: '#6B7A95', marginBottom: 2 }}>{tooltip.node.subtitle}</div>
          )}
          <div style={{ fontSize: 10, color: '#B0B8C8' }}>
            {tooltip.node.type} · {tooltip.node.alliance ?? '—'}
            {tooltip.node.score !== undefined && ` · ${tooltip.node.score}%`}
          </div>
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          display: 'flex',
          gap: 16,
          fontSize: 10,
          color: '#6B7A95',
        }}
      >
        <span><span style={{ color: '#22C55E' }}>─</span> Agree</span>
        <span><span style={{ color: '#F87171', marginRight: 2 }}>─</span> Disagree</span>
        <span><span style={{ color: '#6B7A95' }}>- -</span> Conflict</span>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          fontSize: 10,
          color: '#6B7A95',
          textAlign: 'right',
        }}
      >
        <div>{data.nodes.length} nodes · {data.edges.length} edges</div>
        <div>Consensus: {data.metadata.consensusStrength ?? '—'}%</div>
      </div>
    </div>
  );
}
