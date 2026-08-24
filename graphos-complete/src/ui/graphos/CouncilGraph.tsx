'use client';

import React from 'react';
import ReactFlowGraph from './ReactFlowGraph';
import type { GraphData } from './types';

interface CouncilGraphProps {
  data: GraphData;
  width?: number | string;
  height?: number | string;
  onNodeClick?: (nodeId: string) => void;
  smartQuery?: string;
}

/**
 * CouncilGraph
 * Modernized with React Flow (@xyflow/react) and Dagre auto-layout.
 * Preserves the exact interface contract for zero regressions.
 */
export default function CouncilGraph({
  data,
  height = 560,
  onNodeClick,
  smartQuery,
}: CouncilGraphProps) {
  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-slate-400">
        <div className="text-center">
          <p className="text-lg font-semibold">Nenhum nó de governança encontrado</p>
          <p className="text-xs text-slate-500 mt-1">Execute um scan para popular o grafo</p>
        </div>
      </div>
    );
  }

  return (
    <ReactFlowGraph
      data={data}
      height={height}
      onNodeClick={onNodeClick}
      smartQuery={smartQuery}
    />
  );
}
