import { getLLMProvider } from "@/lib/llm";
import type { RepoIntelligence, Service, Module, AgentReference } from "@council/scanner/codeguard/repo-intelligence/types";
import type { DiscoveredAgent } from "@council/scanner/codeguard/types";
import * as codingMemoryRepo from "@/repositories/coding-memory";

export interface ChunkInput {
  path: string;
  symbol_type: string;
  symbol_name: string;
  summary: string;
  metadata: Record<string, unknown>;
}

export function chunkRepoIntelligence(repoIntel: RepoIntelligence): ChunkInput[] {
  const chunks: ChunkInput[] = [];

  chunks.push({
    path: `repo:${repoIntel.repositoryName}`,
    symbol_type: "repository",
    symbol_name: repoIntel.repositoryName,
    summary: repoIntel.summary,
    metadata: {
      trustZone: repoIntel.trustZone,
      languages: repoIntel.languages,
      frameworks: repoIntel.frameworks,
      confidence: repoIntel.confidence,
      businessCapabilities: repoIntel.businessCapabilities,
    },
  });

  for (const domain of repoIntel.domains) {
    chunks.push({
      path: `domain:${domain.name}`,
      symbol_type: "domain",
      symbol_name: domain.name,
      summary: `Business domain: ${domain.name}. Confidence: ${domain.confidence}%. Signals: ${domain.signals.join(", ")}`,
      metadata: { confidence: domain.confidence, signals: domain.signals },
    });
  }

  for (const service of repoIntel.services) {
    chunks.push({
      path: `service:${service.path}`,
      symbol_type: "service",
      symbol_name: service.name,
      summary: `Service: ${service.name} (${service.type}) at ${service.path}. Confidence: ${service.confidence}%`,
      metadata: { type: service.type, path: service.path, confidence: service.confidence },
    });
  }

  for (const mod of repoIntel.modules) {
    chunks.push({
      path: `module:${mod.path}`,
      symbol_type: "module",
      symbol_name: mod.name,
      summary: `Module: ${mod.name} (${mod.type}) at ${mod.path}. Contains ${mod.symbols.length} files.`,
      metadata: { type: mod.type, path: mod.path, symbols: mod.symbols.slice(0, 20) },
    });
  }

  for (const agent of repoIntel.agents) {
    chunks.push({
      path: `agent:${agent.filePath}`,
      symbol_type: "agent",
      symbol_name: agent.name,
      summary: `AI Agent: ${agent.name} (${agent.framework}, ${agent.agentType}, risk: ${agent.riskLevel}) at ${agent.filePath}`,
      metadata: { framework: agent.framework, agentType: agent.agentType, riskLevel: agent.riskLevel, filePath: agent.filePath },
    });
  }

  for (const dep of repoIntel.dependencies) {
    chunks.push({
      path: `dependency:${dep.name}`,
      symbol_type: "dependency",
      symbol_name: dep.name,
      summary: `Dependency: ${dep.name} (${dep.type}${dep.provider ? `, provider: ${dep.provider}` : ""})`,
      metadata: { type: dep.type, provider: dep.provider ?? null },
    });
  }

  for (const ep of repoIntel.entrypoints) {
    chunks.push({
      path: `entrypoint:${ep}`,
      symbol_type: "entrypoint",
      symbol_name: ep,
      summary: `Entry point: ${ep}`,
      metadata: { path: ep },
    });
  }

  return chunks;
}

export function chunkAgentCode(agent: DiscoveredAgent, fileContent: string): ChunkInput[] {
  const chunks: ChunkInput[] = [];

  chunks.push({
    path: agent.filePath,
    symbol_type: "agent_code",
    symbol_name: agent.name,
    summary: `${agent.framework} agent: ${agent.name}. Type: ${agent.agentType}, Risk: ${agent.suggestedRiskLevel}. Evidence: ${agent.evidence.slice(0, 3).join("; ")}`,
    metadata: {
      framework: agent.framework,
      agentType: agent.agentType,
      riskLevel: agent.suggestedRiskLevel,
      isAutonomous: agent.isAutonomous,
      confidence: agent.confidence,
    },
  });

  if (fileContent.length > 0) {
    const lines = fileContent.split("\n");
    const chunkSize = 50;
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize).join("\n").trim();
      if (chunk.length < 10) continue;
      chunks.push({
        path: `${agent.filePath}:L${i + 1}`,
        symbol_type: "code_snippet",
        symbol_name: `${agent.name}:lines ${i + 1}-${Math.min(i + chunkSize, lines.length)}`,
        summary: chunk.slice(0, 200),
        metadata: { filePath: agent.filePath, lineStart: i + 1, lineEnd: Math.min(i + chunkSize, lines.length) },
      });
    }
  }

  return chunks;
}

export async function indexRepoIntelligence(
  orgId: string,
  repositoryId: string,
  repoIntel: RepoIntelligence
): Promise<number> {
  const llm = getLLMProvider();
  const chunks = chunkRepoIntelligence(repoIntel);
  let indexed = 0;

  for (const chunk of chunks) {
    try {
      let embedding: number[] = [];
      let embeddingReal = false;
      if (llm.available) {
        embedding = await llm.generateEmbedding(chunk.summary);
        embeddingReal = embedding.length > 0;
      }
      if (embedding.length === 0) {
        embedding = new Array(1536).fill(0);
        embeddingReal = false;
      }

      const id = await codingMemoryRepo.storeChunk(orgId, repositoryId, {
        path: chunk.path,
        symbol_type: chunk.symbol_type,
        symbol_name: chunk.symbol_name,
        summary: chunk.summary,
        embedding,
        metadata: { ...chunk.metadata, embedding_real: embeddingReal },
      });

      if (id) indexed++;
    } catch {}
  }

  return indexed;
}

export async function indexAgentCode(
  orgId: string,
  repositoryId: string,
  agents: DiscoveredAgent[],
  readFile: (path: string) => Promise<string>
): Promise<number> {
  const llm = getLLMProvider();
  let indexed = 0;

  for (const agent of agents) {
    try {
      const content = await readFile(agent.filePath);
      const chunks = chunkAgentCode(agent, content);

      for (const chunk of chunks) {
        try {
          let embedding: number[] = [];
          let embeddingReal = false;
          if (llm.available) {
            embedding = await llm.generateEmbedding(chunk.summary);
            embeddingReal = embedding.length > 0;
          }
          if (embedding.length === 0) {
            embedding = new Array(1536).fill(0);
            embeddingReal = false;
          }

          const id = await codingMemoryRepo.storeChunk(orgId, repositoryId, {
            path: chunk.path,
            symbol_type: chunk.symbol_type,
            symbol_name: chunk.symbol_name,
            summary: chunk.summary,
            embedding,
            metadata: { ...chunk.metadata, embedding_real: embeddingReal },
          });

          if (id) indexed++;
        } catch {}
      }
    } catch {}
  }

  return indexed;
}

export async function semanticSearch(
  orgId: string,
  query: string,
  limit: number = 10
): Promise<string> {
  const llm = getLLMProvider();
  if (!llm.available) return "";

  try {
    const embedding = await llm.generateEmbedding(query);
    if (embedding.length === 0) return "";

    const result = await codingMemoryRepo.searchSimilar(orgId, embedding, limit, 0.5);
    if (result.chunks.length === 0) return "";

    return result.chunks
      .map((c, i) => `[${i + 1}] ${c.symbol_type}:${c.symbol_name} (${c.path}) — ${c.summary} [similarity: ${(c.similarity ?? 0).toFixed(2)}]`)
      .join("\n");
  } catch {
    return "";
  }
}

export { codingMemoryRepo };