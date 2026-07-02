import type {
  CouncilIAOutput, PersonaResponse, ExecutiveVerdict,
  ConsensusAnalysis, DecisionLineage, ScientificAudit, DissentDriver,
} from '@/types/councilia-universal';
import type { GraphData, GraphNode, GraphEdge } from '@/ui/graphos/types';

const PERSONA_META: Record<string, { label: string; emoji: string; color: string; alliance: 'Velocity' | 'Stability' | 'Optimizer' | 'Neutral' }> = {
  visionary:    { label: 'Visionary',         emoji: '🔮', color: '#0ECFB8', alliance: 'Velocity' },
  technologist: { label: 'Technologist',      emoji: '⚙️', color: '#5B50F0', alliance: 'Optimizer' },
  devil:        { label: "Devil's Advocate",  emoji: '😈', color: '#F87171', alliance: 'Stability' },
  marketeer:    { label: 'Market Analyst',    emoji: '📊', color: '#F59E0B', alliance: 'Velocity' },
  ethicist:     { label: 'Ethics & Risk',     emoji: '⚖️', color: '#94A3B8', alliance: 'Stability' },
  financier:    { label: 'Financial Strategist', emoji: '💰', color: '#22C55E', alliance: 'Optimizer' },
  judge:        { label: 'Executive Judge',   emoji: '🏛️', color: '#F0F4FA', alliance: 'Neutral' },
};

function buildPersonaNodes(scores: Record<string, number>): GraphNode[] {
  return Object.entries(PERSONA_META).filter(([id]) => id !== 'judge').map(([id, meta]) => ({
    id,
    type: 'persona' as const,
    label: meta.label,
    emoji: meta.emoji,
    score: scores[id] ?? 50,
    alliance: meta.alliance,
    color: meta.color,
    radius: 28 + ((scores[id] ?? 50) - 50) * 0.3,
  }));
}

function buildEdgeBetween(personaA: string, personaB: string, delta: number): GraphEdge {
  const abs = Math.abs(delta);
  return {
    source: personaA,
    target: personaB,
    weight: abs,
    sentiment: abs > 15 ? 'disagree' : abs > 5 ? 'neutral' : 'agree',
    label: abs > 15 ? '🔥' : abs > 5 ? '⚡' : '✅',
  };
}

function buildPersonaEdges(
  roundResponses: PersonaResponse[][],
  dissentDrivers: DissentDriver[],
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const pairDelta = new Map<string, number>();

  for (const round of roundResponses) {
    for (let i = 0; i < round.length; i++) {
      for (let j = i + 1; j < round.length; j++) {
        const key = [round[i].persona, round[j].persona].sort().join('::');
        const delta = Math.abs(round[i].score - round[j].score);
        pairDelta.set(key, (pairDelta.get(key) ?? 0) + delta);
      }
    }
  }

  for (const [key, totalDelta] of Array.from(pairDelta)) {
    const [a, b] = key.split('::');
    const avg = totalDelta / (roundResponses.length || 1);
    edges.push(buildEdgeBetween(a, b, avg));
  }

  for (const d of dissentDrivers) {
    const existing = edges.find(e =>
      (e.source === d.personaA && e.target === d.personaB) ||
      (e.source === d.personaB && e.target === d.personaA)
    );
    if (existing) {
      existing.weight = Math.max(existing.weight, 25);
      existing.sentiment = 'disagree';
      existing.label = '🔥';
      existing.dash = true;
    }
  }

  return edges;
}

function buildRoundNodes(output: CouncilIAOutput): GraphNode[] {
  const lineage = output.decisionLineage;
  const scores = lineage?.consensusPath ?? [];
  return scores.map((score, i) => ({
    id: `round-${i + 1}`,
    type: 'round' as const,
    label: `Round ${i + 1}`,
    subtitle: i === 0 ? 'Thesis' : i === 1 ? 'Antithesis' : 'Synthesis',
    emoji: i === 0 ? '📣' : i === 1 ? '⚔️' : '🎯',
    score,
    color: i === 0 ? '#6366F1' : i === 1 ? '#F59E0B' : '#0ECFB8',
    radius: 20,
    round: i + 1,
  }));
}

function buildConceptNodes(output: CouncilIAOutput): GraphNode[] {
  const concepts: GraphNode[] = [];
  const seen = new Set<string>();

  const extract = (text: string, prefix: string, color: string) => {
    const words = text.toLowerCase().match(/\b[a-z]{5,}\b/g) ?? [];
    const freq: Record<string, number> = {};
    for (const w of words) {
      const skip = ['would', 'could', 'should', 'about', 'which', 'their', 'there', 'where'];
      if (skip.includes(w)) continue;
      freq[w] = (freq[w] ?? 0) + 1;
    }
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [word, count] of top) {
      if (seen.has(word)) continue;
      seen.add(word);
      concepts.push({
        id: `${prefix}-${word}`,
        type: 'concept',
        label: word.charAt(0).toUpperCase() + word.slice(1),
        score: Math.min(count * 20, 100),
        color,
        radius: 12 + count * 2,
      });
    }
  };

  if (output.executiveVerdict) {
    extract(output.executiveVerdict.verdict, 'v', '#F0F4FA');
  }
  for (const risk of output.criticalRisks ?? []) {
    const text = typeof risk === 'string' ? risk : (risk as any).description ?? (risk as any).risk ?? JSON.stringify(risk);
    extract(text, 'risk', '#F87171');
  }

  return concepts.slice(0, 12);
}

function buildDecisionNode(output: CouncilIAOutput): GraphNode[] {
  if (!output.executiveVerdict) return [];
  return [{
    id: 'decision',
    type: 'decision',
    label: output.executiveVerdict.verdict,
    subtitle: `Score: ${output.executiveVerdict.score}%`,
    emoji: output.executiveVerdict.verdictEmoji,
    score: output.executiveVerdict.score,
    color: output.executiveVerdict.verdict === 'GO' ? '#22C55E'
         : output.executiveVerdict.verdict === 'NO-GO' ? '#EF4444'
         : '#F59E0B',
    radius: 34,
  }];
}

function buildRoundEdges(output: CouncilIAOutput): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const rounds = output.decisionLineage?.consensusPath ?? [];
  for (let i = 0; i < rounds.length - 1; i++) {
    const delta = Math.abs(rounds[i] - rounds[i + 1]);
    edges.push({
      source: `round-${i + 1}`,
      target: `round-${i + 2}`,
      weight: delta,
      sentiment: delta > 10 ? 'disagree' : 'agree',
      label: delta > 10 ? '⚡' : '→',
      dash: delta > 15,
    });
  }
  if (rounds.length > 0 && output.executiveVerdict) {
    edges.push({
      source: `round-${rounds.length}`,
      target: 'decision',
      weight: Math.abs(rounds[rounds.length - 1] - output.executiveVerdict.score),
      sentiment: 'agree',
      label: '→',
    });
  }
  return edges;
}

function buildConceptEdges(output: CouncilIAOutput, personaNodes: GraphNode[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const personaIds = personaNodes.map(n => n.id);
  const conceptIds: string[] = [];

  const extractConcepts = () => {
    if (output.executiveVerdict) {
      const words = output.executiveVerdict.verdict.toLowerCase().match(/\b[a-z]{5,}\b/g) ?? [];
      for (const w of words) conceptIds.push(`v-${w}`);
    }
  };
  extractConcepts();

  for (const pid of personaIds) {
    for (const cid of conceptIds.slice(0, 4)) {
      edges.push({
        source: pid,
        target: cid,
        weight: 5,
        sentiment: 'neutral',
        label: '',
        dash: true,
      });
    }
  }

  return edges;
}

export function transformCouncilOutputToGraph(output: CouncilIAOutput, proposal: string): GraphData {
  const roundResponses: PersonaResponse[][] = [];
  const transcript = output.fullTranscript;
  if (transcript) {
    for (const key of ['round1', 'round2', 'round3'] as const) {
      const r = transcript[key] as { responses?: PersonaResponse[] };
      if (r?.responses) roundResponses.push(r.responses);
    }
  }

  const r1Scores: Record<string, number> = {};
  for (const round of roundResponses) {
    for (const r of round) {
      r1Scores[r.persona] = r.score;
    }
  }

  const personaNodes = buildPersonaNodes(r1Scores);
  const roundNodes = output.decisionLineage ? buildRoundNodes(output) : [];
  const conceptNodes = buildConceptNodes(output);
  const decisionNodes = buildDecisionNode(output);

  const personaEdges = buildPersonaEdges(roundResponses, output.consensusAnalysis?.dissentDrivers ?? []);
  const roundEdges = buildRoundEdges(output);
  const conceptEdges = buildConceptEdges(output, personaNodes);

  return {
    nodes: [...personaNodes, ...roundNodes, ...conceptNodes, ...decisionNodes],
    edges: [...personaEdges, ...roundEdges, ...conceptEdges],
    metadata: {
      proposal,
      verdict: output.executiveVerdict?.verdict ?? 'CONDITIONAL',
      score: output.executiveVerdict?.score ?? 50,
      domain: output.metadata?.domain ?? 'general',
      jurisdiction: (output.metadata as any)?.jurisdiction ?? 'GLOBAL',
      totalRounds: roundResponses.length,
      stabilityIndex: output.decisionLineage?.stabilityIndex,
      consensusStrength: output.consensusAnalysis?.strengthPercentage,
    },
  };
}

export function transformPreviewToGraph(
  perspectives: { id: string; name: string; emoji: string; text: string; score?: number }[],
  recommendation: string,
  score: number,
  _idea: string,
): GraphData {
  const pColors: Record<string, string> = {
    strategic:  '#0ECFB8',
    contrarian: '#F87171',
    risk:       '#F59E0B',
    market:     '#5B50F0',
    technical:  '#22C55E',
  };

  const nodes: GraphNode[] = perspectives.map(p => ({
    id: p.id,
    type: 'persona',
    label: p.name,
    emoji: p.emoji,
    score: p.score ?? score,
    alliance: p.id === 'strategic' || p.id === 'market' ? 'Velocity'
            : p.id === 'risk' || p.id === 'contrarian' ? 'Stability'
            : 'Optimizer',
    color: pColors[p.id] ?? '#94A3B8',
    radius: 28,
  }));

  const edges: GraphEdge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const delta = Math.abs((nodes[i].score ?? 50) - (nodes[j].score ?? 50));
      edges.push({
        source: nodes[i].id,
        target: nodes[j].id,
        weight: delta,
        sentiment: delta > 15 ? 'disagree' : delta > 5 ? 'neutral' : 'agree',
        label: delta > 15 ? '🔥' : delta > 5 ? '⚡' : '✅',
      });
    }
  }

  const decisionNode: GraphNode = {
    id: 'decision',
    type: 'decision',
    label: score >= 70 ? 'GO' : score >= 40 ? 'CONDITIONAL' : 'NO-GO',
    subtitle: `Score: ${score}%`,
    emoji: score >= 70 ? '🟢' : score >= 40 ? '🟡' : '🔴',
    score,
    color: score >= 70 ? '#22C55E' : score >= 40 ? '#F59E0B' : '#EF4444',
    radius: 34,
  };
  nodes.push(decisionNode);

  for (const p of perspectives) {
    edges.push({
      source: p.id,
      target: 'decision',
      weight: Math.abs((p.score ?? score) - score),
      sentiment: 'neutral',
      label: '→',
    });
  }

  return {
    nodes,
    edges,
    metadata: {
      proposal: _idea,
      verdict: score >= 70 ? 'GO' : score >= 40 ? 'CONDITIONAL' : 'NO-GO',
      score,
      totalRounds: 1,
      consensusStrength: score,
    },
  };
}
