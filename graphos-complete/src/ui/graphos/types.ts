import type { GraphNodeType, GraphNode, GraphEdge } from '@council/graphos';
export type { GraphNodeType, GraphNode, GraphEdge };

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    sessionId?: string;
    proposal: string;
    verdict: 'GO' | 'CONDITIONAL' | 'NO-GO';
    score: number;
    domain?: string;
    jurisdiction?: string;
    totalRounds: number;
    stabilityIndex?: number;
    consensusStrength?: number;
  };
}

export interface GraphLayout {
  width: number;
  height: number;
  nodePositions: Record<string, { x: number; y: number }>;
}

export type GraphFilterType = 'all' | 'personas-only' | 'concepts-only' | 'rounds-only';
export type GraphViewMode = 'force' | 'radial' | 'timeline';
