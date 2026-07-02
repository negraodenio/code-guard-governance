
import { Violation } from '../scanner/gdpr';
import { PlanType } from '../license/manager';

export { Violation };

export interface ScanResult {
    score: number;
    grade: string;
    issues: SummaryCounts;
    violations: Violation[];
}

export interface SummaryCounts {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
}

export interface ComplianceMapping {
    GDPR: 'aligned' | 'partially aligned' | 'risk detected';
    LGPD: 'aligned' | 'partially aligned' | 'risk detected';
    // Keeping scope focused on user request (GDPR/LGPD/AI_ACT), but adding placeholders for others as per prompt
    PCI_DSS: 'not assessed' | 'risk detected' | 'aligned';
    CCPA: 'aligned' | 'partially aligned' | 'risk detected' | 'not applicable';
    HIPAA: 'aligned' | 'partially aligned' | 'risk detected' | 'not applicable';
    OWASP: string[];
    ISO27001: 'not assessed' | 'best-practice indicators present';
    AI_ACT: 'early alignment signals' | 'risk detected' | 'not applicable' | 'aligned';
}

export interface ComplianceReport {
    executiveSummary: string;
    violations: Violation[];
    summaryCounts: SummaryCounts;
    complianceMapping: ComplianceMapping;
    recommendations: string;
    humanValidationRequired: boolean;
    plan: PlanType;
    filesAnalyzed: string[];
    timestamp: string;
}
