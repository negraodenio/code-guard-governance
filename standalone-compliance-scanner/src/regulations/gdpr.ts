import { executeErasure } from './db';

export type GDPRLegalBasis =
  | 'CONSENT'
  | 'CONTRACT'
  | 'LEGAL_OBLIGATION'
  | 'VITAL_INTERESTS'
  | 'PUBLIC_TASK'
  | 'LEGITIMATE_INTEREST';

export type AIActRiskClass =
  | 'PROHIBITED'
  | 'HIGH_RISK'
  | 'LIMITED_RISK'
  | 'MINIMAL_RISK';

export interface AIActCompliance {
  riskClass: AIActRiskClass;
  conformityAssessment?: boolean;
  ceMarking?: boolean;
  registrationEU?: string;
  transparencyObligations: string[];
  humanOversight: boolean;
}

export class GDPRComplianceManager {
  private dpoEmail = 'dpo@councilia.com';

  classifyAIRisk(
    domain: 'healthcare' | 'government' | 'finance' | 'corporate' | 'general',
    autonomyLevel: 'ASSISTED' | 'AUTONOMOUS' | 'FULLY_AUTONOMOUS',
  ): AIActCompliance {
    const base: AIActCompliance = {
      riskClass: 'LIMITED_RISK',
      transparencyObligations: [
        'Inform user they are interacting with AI (Art. 52)',
        'Disclose decision logic in understandable format',
        'Enable human review of automated decisions',
      ],
      humanOversight: true,
    };

    if (domain === 'healthcare' && autonomyLevel !== 'ASSISTED') {
      return {
        riskClass: 'HIGH_RISK',
        conformityAssessment: true,
        ceMarking: true,
        registrationEU: 'pending',
        transparencyObligations: [
          ...base.transparencyObligations,
          'Risk management system (Art. 9)',
          'Data governance (Art. 10)',
          'Technical documentation (Art. 11)',
          'Record-keeping (Art. 12)',
          'Human oversight by natural persons (Art. 14)',
        ],
        humanOversight: true,
      };
    }

    if (domain === 'finance' && autonomyLevel === 'AUTONOMOUS') {
      return {
        riskClass: 'HIGH_RISK',
        conformityAssessment: true,
        ceMarking: true,
        registrationEU: 'pending',
        transparencyObligations: base.transparencyObligations,
        humanOversight: true,
      };
    }

    return base;
  }

  async generateDPIA(
    processingActivity: string,
    riskClass: AIActRiskClass,
  ): Promise<string> {
    if (riskClass === 'HIGH_RISK') {
      return `
DPIA - DATA PROTECTION IMPACT ASSESSMENT
Activity: ${processingActivity}
Risk Class: ${riskClass} (AI Act Art. 6)
DPO: ${this.dpoEmail}

1. NECESSITY AND PROPORTIONALITY
   - Description: Multi-agent deliberation
   - Purpose: Structured decision support
   - Legal basis: Explicit consent + Human oversight

2. RISK ASSESSMENT
   - Rights: Potential automated decision bias
   - Mitigation: Adversarial checking, audit trails

3. MEASURES
   - Technical: Encryption, pseudonymization
   - Organizational: DPO appointed, staff training
      `;
    }
    return 'DPIA not required for LIMITED/MINIMAL risk processing';
  }

  async handleErasureRequest(userId: string): Promise<{
    deleted: string[];
    retained: string[];
    reason: string;
  }> {
    if (!userId) {
      return {
        deleted: [],
        retained: [],
        reason: 'No user ID provided',
      };
    }
    return executeErasure(userId);
  }
}
