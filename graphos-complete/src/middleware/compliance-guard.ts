import { NextRequest, NextResponse } from 'next/server';
import { GDPRComplianceManager } from '@/lib/compliance/gdpr';
import { BCB4893Compliance } from '@/lib/compliance/bcb-4893';
import { AnvisaComplianceManager } from '@/lib/compliance/anvisa';
import { verifyConsentInDb } from '@/lib/compliance/db';

export interface ComplianceContext {
  jurisdiction: 'BR' | 'EU' | 'BR_EU' | 'GLOBAL';
  domain: 'healthcare' | 'government' | 'finance' | 'corporate' | 'general';
  dataSubjectRights: string[];
  retentionPeriod: number;
  internationalTransfer: boolean;
}

export async function complianceGuard(
  req: NextRequest,
  context: ComplianceContext,
): Promise<NextResponse | null> {
  const errors: string[] = [];

  const consentHeader = req.headers.get('x-consent-id');
  const userId = req.headers.get('x-user-id');

  if (context.jurisdiction === 'EU' || context.jurisdiction === 'BR_EU' || context.jurisdiction === 'BR') {
    if (!consentHeader) {
      errors.push('Missing consent identifier (LGPD Art. 7 / GDPR Art. 6)');
    } else if (userId) {
      const valid = await verifyConsentInDb(consentHeader, userId, ['DECISION_ANALYSIS']);
      if (!valid) {
        errors.push('Consent not found, expired, or withdrawn (LGPD Art. 9 / GDPR Art. 7)');
      }
    }
  }

  if (context.jurisdiction === 'EU' || context.jurisdiction === 'BR_EU') {
    const gdpr = new GDPRComplianceManager();
    const aiActClass = gdpr.classifyAIRisk(context.domain, 'ASSISTED');
    if (aiActClass.riskClass === 'HIGH_RISK' && !aiActClass.conformityAssessment) {
      errors.push('HIGH_RISK AI system requires conformity assessment (AI Act Art. 43)');
    }
  }

  if (context.domain === 'finance') {
    const bcb = new BCB4893Compliance();
    const governance = await bcb.validateGovernance('institution', 'DECISION_SUPPORT');
    if (!governance.boardApproved) {
      errors.push('BCB 4893 Art. 3 - AI governance requires board approval');
    }
  }

  if (context.domain === 'healthcare') {
    const anvisa = new AnvisaComplianceManager();
    const samd = anvisa.classifySAMd('DECISION_SUPPORT', 'MODERATE');
    if (samd.registrationRequired) {
      const registration = req.headers.get('x-anvisa-registration');
      if (!registration) {
        errors.push(`ANVISA - Class ${samd.class} SaMD requires registration (RDC 185/2001)`);
      }
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Compliance check failed',
        violations: errors,
        timestamp: new Date().toISOString(),
        dpo_contact: 'dpo@councilia.com',
      },
      { status: 403 },
    );
  }

  return null;
}
