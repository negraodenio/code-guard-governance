import type { RepoIntelligence } from "./repo-intelligence/types";

export interface KnowledgeGraphNode {
  id: string;
  type: "domain" | "service" | "module" | "agent" | "dependency" | "entrypoint" | "repository";
  label: string;
  layer: 1 | 2 | 3 | 4;
  metadata: Record<string, unknown>;
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  type: "contains" | "imports" | "depends_on" | "belongs_to" | "calls" | "processes" | "exposes";
  metadata: Record<string, unknown>;
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  summary: string;
}

function sanitizeId(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 64);
}

export function buildKnowledgeGraph(repoIntel: RepoIntelligence): KnowledgeGraph {
  const nodes: KnowledgeGraphNode[] = [];
  const edges: KnowledgeGraphEdge[] = [];

  const repoId = sanitizeId(`repo:${repoIntel.repositoryName}`);
  nodes.push({
    id: repoId,
    type: "repository",
    label: repoIntel.repositoryName,
    layer: 1,
    metadata: { trustZone: repoIntel.trustZone, languages: repoIntel.languages, confidence: repoIntel.confidence },
  });

  for (const domain of repoIntel.domains) {
    const domainId = sanitizeId(`domain:${domain.name}`);
    nodes.push({
      id: domainId,
      type: "domain",
      label: domain.name,
      layer: 1,
      metadata: { confidence: domain.confidence, signals: domain.signals },
    });
    edges.push({
      id: sanitizeId(`edge:repo:${repoIntel.repositoryName}:domain:${domain.name}`),
      source: repoId,
      target: domainId,
      type: "contains",
      metadata: {},
    });
  }

  for (const service of repoIntel.services) {
    const serviceId = sanitizeId(`service:${service.name}`);
    nodes.push({
      id: serviceId,
      type: "service",
      label: service.name,
      layer: 2,
      metadata: { type: service.type, path: service.path, confidence: service.confidence },
    });

    const parentDir = service.path.split("/").slice(0, -1).join("/") || "root";
    const parentModule = repoIntel.modules.find((m) => m.path === parentDir);
    if (parentModule) {
      edges.push({
        id: sanitizeId(`edge:module:${parentModule.name}:service:${service.name}`),
        source: sanitizeId(`module:${parentModule.name}`),
        target: serviceId,
        type: "contains",
        metadata: {},
      });
    } else {
      edges.push({
        id: sanitizeId(`edge:repo:${repoIntel.repositoryName}:service:${service.name}`),
        source: repoId,
        target: serviceId,
        type: "contains",
        metadata: {},
      });
    }

    const matchingDomain = repoIntel.domains.find((d) =>
      service.name.toLowerCase().includes(d.name) || service.path.toLowerCase().includes(d.name)
    );
    if (matchingDomain) {
      edges.push({
        id: sanitizeId(`edge:service:${service.name}:domain:${matchingDomain.name}`),
        source: serviceId,
        target: sanitizeId(`domain:${matchingDomain.name}`),
        type: "belongs_to",
        metadata: {},
      });
    }
  }

  for (const mod of repoIntel.modules) {
    const modId = sanitizeId(`module:${mod.name}`);
    nodes.push({
      id: modId,
      type: "module",
      label: mod.name,
      layer: 2,
      metadata: { type: mod.type, path: mod.path, symbolCount: mod.symbols.length },
    });
    edges.push({
      id: sanitizeId(`edge:repo:${repoIntel.repositoryName}:module:${mod.name}`),
      source: repoId,
      target: modId,
      type: "contains",
      metadata: {},
    });
  }

  for (const agent of repoIntel.agents) {
    const agentId = sanitizeId(`agent:${agent.name}`);
    nodes.push({
      id: agentId,
      type: "agent",
      label: agent.name,
      layer: 3,
      metadata: {
        framework: agent.framework,
        agentType: agent.agentType,
        riskLevel: agent.riskLevel,
        filePath: agent.filePath,
      },
    });

    const parentDir = agent.filePath.split("/").slice(0, -1).join("/") || "root";
    const parentModule = repoIntel.modules.find((m) => m.path === parentDir);
    if (parentModule) {
      edges.push({
        id: sanitizeId(`edge:module:${parentModule.name}:agent:${agent.name}`),
        source: sanitizeId(`module:${parentModule.name}`),
        target: agentId,
        type: "contains",
        metadata: {},
      });
    }

    const agentService = repoIntel.services.find((s) =>
      agent.filePath.toLowerCase().includes(s.path.toLowerCase())
    );
    if (agentService) {
      edges.push({
        id: sanitizeId(`edge:agent:${agent.name}:service:${agentService.name}`),
        source: agentId,
        target: sanitizeId(`service:${agentService.name}`),
        type: "belongs_to",
        metadata: {},
      });
    }

    const matchingDomain = repoIntel.domains.find((d) =>
      agent.filePath.toLowerCase().includes(d.name) || agent.name.toLowerCase().includes(d.name)
    );
    if (matchingDomain) {
      edges.push({
        id: sanitizeId(`edge:agent:${agent.name}:domain:${matchingDomain.name}`),
        source: agentId,
        target: sanitizeId(`domain:${matchingDomain.name}`),
        type: "processes",
        metadata: {},
      });
    }
  }

  for (const dep of repoIntel.dependencies) {
    const depId = sanitizeId(`dep:${dep.name}`);
    nodes.push({
      id: depId,
      type: "dependency",
      label: dep.name,
      layer: 4,
      metadata: { type: dep.type, provider: dep.provider ?? null },
    });
    edges.push({
      id: sanitizeId(`edge:repo:${repoIntel.repositoryName}:dep:${dep.name}`),
      source: repoId,
      target: depId,
      type: "depends_on",
      metadata: {},
    });
  }

  for (const ep of repoIntel.entrypoints) {
    const epId = sanitizeId(`entrypoint:${ep}`);
    nodes.push({
      id: epId,
      type: "entrypoint",
      label: ep,
      layer: 2,
      metadata: { path: ep },
    });
    edges.push({
      id: sanitizeId(`edge:repo:${repoIntel.repositoryName}:entrypoint:${ep}`),
      source: repoId,
      target: epId,
      type: "exposes",
      metadata: {},
    });
  }

  const summary = `Knowledge graph: ${nodes.length} nodes, ${edges.length} edges. ` +
    `Layers: ${repoIntel.domains.length} domains, ${repoIntel.services.length} services, ` +
    `${repoIntel.modules.length} modules, ${repoIntel.agents.length} agents, ${repoIntel.dependencies.length} dependencies.`;

  return { nodes, edges, summary };
}