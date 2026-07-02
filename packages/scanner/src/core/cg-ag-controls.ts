import type { DetectedRisk } from './types';

export interface CGAGControl {
  id: string;
  dbFlag: string | null;
  name: string;
  description: string;
  domain: 'inventory' | 'ownership' | 'models' | 'access' | 'prompts' | 'mcp' | 'oversight' | 'audit' | 'data' | 'risk' | 'a2a' | 'autonomous';
}

export const CG_AG_CONTROLS: Record<string, CGAGControl> = {
  'CG-AG-001': {
    id: 'CG-AG-001',
    dbFlag: 'cg_ag_001_registered',
    name: 'Agent Inventory',
    description: 'Every AI agent must be formally registered in the master agent inventory before operating.',
    domain: 'inventory',
  },
  'CG-AG-002': {
    id: 'CG-AG-002',
    dbFlag: 'cg_ag_002_owner',
    name: 'Agent Owner',
    description: 'Every registered agent must have an identified, accountable human owner.',
    domain: 'ownership',
  },
  'CG-AG-003': {
    id: 'CG-AG-003',
    dbFlag: 'cg_ag_003_model_reg',
    name: 'Model Registration',
    description: 'Every agent\'s AI model must be documented with model name and provider.',
    domain: 'models',
  },
  'CG-AG-004': {
    id: 'CG-AG-004',
    dbFlag: 'cg_ag_004_compliant',
    name: 'Tool Authorisation',
    description: 'Every tool and external resource accessed by an agent must be explicitly authorised before use.',
    domain: 'access',
  },
  'CG-AG-005': {
    id: 'CG-AG-005',
    dbFlag: 'cg_ag_005_compliant',
    name: 'Prompt Governance',
    description: 'Prompts must be registered, versioned, and assessed for robustness and injection risk.',
    domain: 'prompts',
  },
  'CG-AG-006': {
    id: 'CG-AG-006',
    dbFlag: 'cg_ag_006_compliant',
    name: 'MCP Server Governance',
    description: 'All MCP server connections must be registered, classified, and periodically reviewed.',
    domain: 'mcp',
  },
  'CG-AG-007': {
    id: 'CG-AG-007',
    dbFlag: 'cg_ag_007_oversight',
    name: 'Human Oversight',
    description: 'Every agent must have an appropriate human oversight level calibrated to its risk.',
    domain: 'oversight',
  },
  'CG-AG-008': {
    id: 'CG-AG-008',
    dbFlag: 'cg_ag_008_audit_trail',
    name: 'Audit Trail',
    description: 'Agent activities and governance state changes must be captured in an immutable audit ledger.',
    domain: 'audit',
  },
  'CG-AG-009': {
    id: 'CG-AG-009',
    dbFlag: 'cg_ag_009_compliant',
    name: 'Data Governance',
    description: 'Every resource carrying PII, PHI, or financial data must undergo a mandatory data governance review.',
    domain: 'data',
  },
  'CG-AG-010': {
    id: 'CG-AG-010',
    dbFlag: 'cg_ag_010_classified',
    name: 'Risk Classification',
    description: 'Every agent must be assigned both an operational risk level and an AI Act risk class.',
    domain: 'risk',
  },
  'CG-AG-011': {
    id: 'CG-AG-011',
    dbFlag: null,
    name: 'Agent-to-Agent Governance',
    description: 'All agent-to-agent relationships must be explicitly registered in the agent graph.',
    domain: 'a2a',
  },
  'CG-AG-012': {
    id: 'CG-AG-012',
    dbFlag: 'cg_ag_012_autonomous_governed',
    name: 'Autonomous Agent Governance',
    description: 'Autonomous agents require elevated oversight, fallback mechanisms, and enhanced monitoring.',
    domain: 'autonomous',
  },
};

const CONTROL_LIST = Object.values(CG_AG_CONTROLS);

export function getCGAGControl(id: string): CGAGControl | undefined {
  return CG_AG_CONTROLS[id];
}

export function getCGAGControlByRisk(risk: DetectedRisk): CGAGControl | undefined {
  return risk.cgagControl ? CG_AG_CONTROLS[risk.cgagControl] : undefined;
}

export function isCGAGImplemented(dbFlags: Record<string, string | boolean | null>): string[] {
  const passed: string[] = [];
  const failed: string[] = [];
  for (const control of CONTROL_LIST) {
    if (!control.dbFlag) continue;
    const val = dbFlags[control.dbFlag];
    if (val === true || val === 'passed') passed.push(control.id);
    else if (val === false || val === 'failed') failed.push(control.id);
  }
  return passed;
}

export function getCGAGScore(dbFlags: Record<string, string | boolean | null>): number {
  const total = CONTROL_LIST.filter(c => c.dbFlag).length;
  if (total === 0) return 100;
  const passed = isCGAGImplemented(dbFlags).length;
  return Math.round((passed / total) * 100);
}