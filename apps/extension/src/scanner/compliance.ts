
import { LicenseStatus, PlanType } from '../license/manager';
import { GDPRScanner } from './gdpr';
import { LGPDScanner } from './lgpd';
import { CCPAScanner } from './ccpa';
import { AIActScanner } from './ai_act_preview';
import { Violation } from './gdpr';

export interface AnalysisResult {
    violations: Violation[];
    totalViolationsFound: number;
    shownViolations: number;
    plan: PlanType;
    summary: string;
}

import { ReportGenerator } from '../report/generator';
import { ComplianceReport } from '../report/types';

import { PCIScanner } from './pci';
import { HIPAAScanner } from './hipaa';
import { OWASPScanner } from './owasp';
import { ShadowAPIScanner } from './shadowApi';

export class ComplianceEngine {
    static scanCode(content: string, license: LicenseStatus, hasCredits: boolean = false): ComplianceReport {
        let violations: Violation[] = [];

        // 1. Run Scanners
        const gdprViolations = GDPRScanner.scan(content);
        // PLG: Shadow API Detection (Free Tier High Value)
        const shadowApiViolations = ShadowAPIScanner.scan(content);

        violations = [...gdprViolations, ...shadowApiViolations];

        // Unlock advanced scanners if Paid License OR Has Credits
        const isUnlocked = license.plan !== PlanType.Free || hasCredits;

        if (isUnlocked) {
            const lgpdViolations = LGPDScanner.scan(content);
            const ccpaViolations = CCPAScanner.scan(content);
            const aiActViolations = AIActScanner.scan(content);
            const pciViolations = PCIScanner.scan(content);
            const hipaaViolations = HIPAAScanner.scan(content);
            const owaspViolations = OWASPScanner.scan(content);

            violations = [
                ...violations,
                ...lgpdViolations,
                ...ccpaViolations,
                ...aiActViolations,
                ...pciViolations,
                ...hipaaViolations,
                ...owaspViolations
            ];
        }

        // 2. Enforce Limits strictly for the returned report
        // If Unlocked (Credits or License), show all.
        let shownViolations = violations;
        if (!isUnlocked && violations.length > license.maxViolations) {
            shownViolations = violations.slice(0, license.maxViolations);
        }

        // 3. Generate Full Report using the NEW Generator
        // Treat Credits as Professional Plan for reporting purposes
        const effectivePlan = (hasCredits && license.plan === PlanType.Free) ? PlanType.Professional : license.plan;

        return ReportGenerator.generate(shownViolations, effectivePlan, ['activeFile.ts']);
    }
}
