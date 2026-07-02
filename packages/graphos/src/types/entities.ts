// Detailed entity type definitions — compatible with GraphEntity shape
// These are used by graphos-mapper and other transformation code

export interface GraphEntity {
  id: string; kind: string; label: string; description?: string;
  [key: string]: unknown;
}

export type EntityKind =
  | 'agent' | 'decision' | 'tool' | 'external_system'
  | 'data_asset' | 'control' | 'regulation' | 'certificate'
  | 'risk' | 'incident' | 'evidence' | 'model' | 'owner'
  | 'cost_center' | 'prompt' | 'memory' | 'classification';

export interface AgentNode extends GraphEntity { kind: 'agent'; agentType: string; riskLevel: string; aiActRiskClass?: string; critical?: boolean; tools?: string[]; models?: string[]; status?: string; oversightLevel?: string; }
export interface DecisionNode extends GraphEntity { kind: 'decision'; verdict?: string; score?: number; confidence?: number; }
export interface ToolNode extends GraphEntity { kind: 'tool'; toolType: 'mcp' | 'api' | 'function' | 'database' | 'file_system'; accessLevel?: string; dataAssets?: string[]; exposed?: boolean; hasSecrets?: boolean; }
export interface ExternalSystemNode extends GraphEntity { kind: 'external_system'; systemType: string; dataResidency?: string[]; hasSLA?: boolean; securityLevel?: string; }
export interface DataAssetNode extends GraphEntity { kind: 'data_asset'; classification?: string; hasPII?: boolean; piiCategories?: string[]; legalBasis?: string[]; retentionDays?: number; }
export interface ModelNode extends GraphEntity { kind: 'model'; provider: string; modelId: string; version?: string; costPerToken?: number; tokensUsed?: number; }
export interface RiskNode extends GraphEntity { kind: 'risk'; riskType?: string; severity: string; likelihood?: string; impact?: number; controlIds?: string[]; incidentIds?: string[]; }
export interface RegulationNode extends GraphEntity { kind: 'regulation'; regulationId?: string; authority?: string; status?: string; requirements?: string[]; certificateIds?: string[]; agentsInScope?: string[]; }
export interface EvidenceNode extends GraphEntity { kind: 'evidence'; evidenceType?: string; source?: string; validUntil?: string; verifiedBy?: string; hash?: string; }
export interface OwnerNode extends GraphEntity { kind: 'owner'; email?: string; role: string; teams?: string[]; }
export interface PromptNode extends GraphEntity { kind: 'prompt'; promptId?: string; version?: string; hash?: string; ownerId?: string; approvedBy?: string; riskLevel?: string; }
export interface ControlNode extends GraphEntity { kind: 'control'; controlId?: string; framework?: string; status?: string; evidenceIds?: string[]; riskIds?: string[]; certificationIds?: string[]; }
export interface CertificateNode extends GraphEntity { kind: 'certificate'; certType?: string; issuedAt?: string; expiresAt?: string; status?: string; auditor?: string; }
export interface IncidentNode extends GraphEntity { kind: 'incident'; incidentType?: string; severity?: string; detectedAt?: string; resolvedAt?: string; status?: string; affectedAssets?: string[]; regulationIds?: string[]; }
export interface CostCenterNode extends GraphEntity { kind: 'cost_center'; costUsd?: number; }
export interface MemoryNode extends GraphEntity { kind: 'memory'; technology?: string; governed?: boolean; }
export interface ClassificationNode extends GraphEntity { kind: 'classification'; category?: string; confidence?: number; }
