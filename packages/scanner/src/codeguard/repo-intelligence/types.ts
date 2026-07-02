export interface RepoIntelligence {
  repositoryName: string;
  languages: string[];
  frameworks: string[];
  entrypoints: string[];
  domains: Domain[];
  services: Service[];
  modules: Module[];
  dependencies: Dependency[];
  agents: AgentReference[];
  trustZone: "production" | "staging" | "development" | "sandbox";
  businessCapabilities: string[];
  summary: string;
  confidence: number;
}

export interface Domain {
  name: string;
  confidence: number;
  signals: string[];
}

export interface Service {
  name: string;
  type: string;
  path: string;
  confidence: number;
}

export interface Module {
  name: string;
  path: string;
  type: "api" | "service" | "worker" | "job" | "controller" | "model" | "repository" | "middleware" | "config" | "test" | "agent" | "other";
  symbols: string[];
}

export interface Dependency {
  name: string;
  version?: string;
  type: "internal" | "external" | "ai_provider" | "database" | "message_queue" | "storage" | "http_client" | "other";
  provider?: string;
}

export interface AgentReference {
  name: string;
  filePath: string;
  framework: string;
  agentType: string;
  riskLevel: string;
}

export interface RepoFileInfo {
  path: string;
  name: string;
  ext: string;
  dir: string;
}