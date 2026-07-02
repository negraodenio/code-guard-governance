/**
 * CouncilIA v12.0.0 — Universal Type System
 * Supports: General, Healthcare, Finance, Government
 */

// ============================================
// DOMAINS AND CONTEXTS
// ============================================

export type CouncilDomain = 
  | 'general'      // General enterprise use
  | 'healthcare'   // ANVISA, health, pharma
  | 'finance'      // BCB, banks, fintechs, insurance
  | 'government';  // Public policy, compliance

export interface CouncilIAEvent {
  type: 'model_msg' | 'judge_note' | 'system_status';
  personaId: string;
  payload: any;
}

export type Jurisdiction = 
  | 'BR'      // Brazil (LGPD)
  | 'EU'      // European Union (GDPR)
  | 'US'      // United States (CCPA/state laws)
  | 'BR_EU'   // Dual compliance
  | 'GLOBAL'; // Multiple jurisdictions

// ============================================
// SYSTEM INPUT
// ============================================

export interface CouncilIAInput {
  proposal: string;                    // Description of the proposal/decision
  proposalId?: string;                 // External ID (optional)
  domain: CouncilDomain;
  jurisdiction: Jurisdiction;
  subDomain?: string;                  // Specialization (e.g., "crop_insurance", "diagnosis")
  ragDocuments: RAGDocument[];         // Reference documents
  constraints?: DecisionConstraint[];  // Mandatory constraints
  config?: CouncilConfig;
  metadata: SessionMetadata;
}

export interface RAGDocument {
  id: string;
  content: string;
  source: string;                      // Document name/norm
  sourceType: 'regulatory' | 'scientific' | 'technical' | 'case_study' | 'internal';
  jurisdiction?: string;               // BR, EU, etc.
  validityDate?: string;               // ISO 8601
  confidence?: 'high' | 'medium' | 'low';
}

export interface DecisionConstraint {
  type: 'REGULATORY' | 'ETHICAL' | 'ECONOMIC' | 'TECHNICAL' | 'TEMPORAL';
  description: string;
  mandatory: boolean;
  source?: string;                     // Norm that imposes it
}

export interface CouncilConfig {
  personaSet?: PersonaSet;             // 'standard' | 'health' | 'finance'
  strictness?: 'strict' | 'balanced' | 'permissive';
  maxRounds?: number;
  enableFallback?: boolean;
  timeoutMs?: number;
}

export interface SessionMetadata {
  userId: string;
  organizationId: string;
  sessionId?: string;
  department?: string;
  previousSession?: string;
  previousHash?: string;
  tags?: string[];
  consent: {
    consentId: string;
    purposes: ProcessingPurpose[];
    grantedAt: string;
    expiresAt?: string;
  };
}

export type ProcessingPurpose = 
  | 'DECISION_ANALYSIS'
  | 'AUDIT_TRAIL'
  | 'MODEL_IMPROVEMENT'
  | 'REGULATORY_COMPLIANCE'
  | 'RESEARCH_ANONYMIZED';

// ============================================
// PERSONAS (6 UNIVERSAL + EXTENSIONS)
// ============================================

export type PersonaArchetype = 
  | 'VISIONARY'      // Strategy, innovation
  | 'TECHNOLOGIST'   // Technical viability
  | 'AUDITOR'        // Risks, pre-mortem
  | 'MARKET'         // Adoption, users
  | 'ETHICIST'       // Ethics, compliance
  | 'FINANCIER';     // Economics, ROI

export type PersonaSet = 'standard' | 'health' | 'finance';

export interface PersonaConfig {
  archetype: PersonaArchetype;
  name: string;
  emoji: string;
  domainWeights: Record<CouncilDomain, number>;
  killConditions: string[];
  blindSpot: string;
}

// ============================================
// SCORING SYSTEM
// ============================================

export interface ScoringInput {
  personaScores: number[];
  personaIds: string[];
  evidenceDensity: EvidenceLevel;
  unresolvedRisks: number;
  validationStatus: ValidationStatus;
  domain: CouncilDomain;
  previousMeanScore?: number; // Used for stability calibration
}

export type EvidenceLevel = 'high' | 'moderate' | 'low';
export type ValidationStatus = 'complete' | 'partial' | 'none';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ScoringOutput {
  consensusStrength: number;
  dissentRange: number;
  var: number;
  confidence: ConfidenceLevel;
  meanScore: number;
  stdDev: number;
  consensusStability?: number; // Delta between rounds
  scientificVariance?: number; // Weighted variance for papers
  isAuditReady?: boolean;      // v14 determinism flag
  conflictPenaltyDetected?: boolean; // v14 echo-chamber guard
}

export interface PersonaResponse {
  persona: string;
  analysis: string;
  score: number;
  unrefuted_risks: string[];
  kill_condition_triggered: boolean;
}

export interface RoundResult {
  round: number;
  responses: PersonaResponse[];
}

// ============================================
// STRUCTURED OUTPUT (v7.3.1 Schema)
// ============================================

export interface CouncilIAOutput {
  metadata: OutputMetadata;
  executiveVerdict: ExecutiveVerdict;
  criticalRisks: CriticalRisk[];       
  consensusAnalysis: ConsensusAnalysis;
  evidenceAudit: EvidenceAudit;
  judgeRationale?: string; // Legacy/Fallback
  decisaoImediata?: string; // v11.0 High-Authority
  sinteseTecnica?: string;  // v11.0 High-Authority
  fontesEvidencia?: string; // v11.0 High-Authority
  actionPlan: ActionPlan;
  decisionRule: DecisionRule;
  decisionLineage?: DecisionLineage; // Enterprise Lineage Trace
  scientificAudit?: ScientificAudit; // ICLR-track metrics
  fullTranscript?: RoundTranscript;
}

// ============================================
// VALIDATION SYSTEM
// ============================================

export type ValidationErrorCode = 
  | 'LOGICAL_INCONSISTENCY' 
  | 'SCORING_BUG' 
  | 'HIGH_VAR_LOW_SCORE' 
  | 'INVALID_RANGE'
  | 'NEUTRAL_LEAK'
  | 'EVIDENCE_GAP';

export type ValidationStrategy = 'PASSED' | 'FALLBACK_APPLIED' | 'MANUAL_REVIEW' | 'SAFE_MODE_FALLBACK';

export interface ValidationError {
  type: 'ERROR';
  code: ValidationErrorCode;
  message: string;
  field?: string;
  severity: 'CRITICAL' | 'MAJOR';
}

export interface ValidationWarning {
  type: 'WARNING';
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  output: CouncilIAOutput | null;
  fallback: CouncilIAOutput | null;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  strategy: ValidationStrategy;
}

export interface OutputMetadata {
  sessionId: string;
  timestamp: string;
  protocolVersion: '14.0.0';
  executionTimeMs: number;
  complianceFlags: string[];
  retentionUntil: string;
  domain?: CouncilDomain;
  isAuditHardened?: boolean; // P0 Safety Verified flag
  auditSignature?: string;    // v14 Deterministic Signed Hash
}

export interface ExecutiveVerdict {
  verdict: 'GO' | 'CONDITIONAL' | 'NO-GO';
  verdictEmoji: '🟢' | '🟡' | '🔴';
  score: number;
  scoreBreakdown: {
    technicalViability: ScoreDimension;
    regulatoryReadiness: ScoreDimension;
    economicFeasibility: ScoreDimension;
    adoptionLikelihood: ScoreDimension;
  };
  confidence: {
    level: ConfidenceLevel;
    evidenceDensity: EvidenceLevel;
    expertDisagreement: 'none' | 'moderate' | 'significant';
    validationStatus: ValidationStatus;
  };
  var: {
    percentage: number;
    drivers: string[];
    interpretation: string;
  };
}

export interface ScoreDimension {
  score: number;
  max: number;
  justification: string;
}

export interface CriticalRisk {
  id: number;
  name: string;
  violates: string;
  evidence: string;
  impact: string;
  mitigation: string;
  status: 'OPEN' | 'MITIGATED' | 'CLOSED';
  owner?: string;
  deadline?: string;
}

export interface ConsensusAnalysis {
  strengthPercentage: number;
  strengthLabel: 'STRONG' | 'MODERATE' | 'WEAK';
  dissentDrivers: DissentDriver[];
  irreconcilablePoint: string;
  interpretation: string;
}

export interface DissentDriver {
  personaA: string;
  personaB: string;
  conflict: string;
}

export interface EvidenceAudit {
  highConfidence: EvidenceItem[];
  mediumConfidence: EvidenceItem[];
  unsupported: UnsupportedClaim[];
}

export interface EvidenceItem {
  source: string;
  supports: string;
  caveat?: string;
}

export interface UnsupportedClaim {
  claim: string;
  issue: string;
  flag: 'REQUIRES_VERIFICATION' | 'ASSUMPTION' | 'EXTRAPOLATION';
}

export interface ActionPlan {
  validationGate: {
    condition: string;
    proceedIf: string;
    abortIf: string;
  };
  actions: Action[];
}

export interface Action {
  id: number;
  name: string;
  scope: string;
  deliverable: string;
  deadline: string;
  successCriterion: string;
  owner: string;
}

export interface DecisionRule {
  proceedOnlyIf: string[];
  otherwise: string;
}

export interface RoundTranscript {
  round1: any;
  round2: any;
  round3: any;
  round4?: any;
}

// ============================================
// EXCELLENCE & AUDIT TYPES (v12.4 Upgrade)
// ============================================

export interface DecisionLineage {
  consensusPath: number[];   // Scores across rounds [R1, R2, R3]
  stabilityIndex: number;    // 0-1 (normalized)
  personaStability: number;  // 0-1 (PSI metric)
  keyPivots: string[];       // Significant stance changes detected
}

export interface ScientificAudit {
  accuracyEstimate: number;       // 0-1 based on benchmark data
  reproducibilityScore: number;    // Based on variance
  adversarialDensity: number;      // 0-1 (R2 Dissent volume)
  citationsVerified: boolean;      // Semantical validation check status
  personaStabilityIndex: number;   // Semantic drift metric (v14)
  errorCorrectionRate: number;     // Scientific validity metric (v14)
}
