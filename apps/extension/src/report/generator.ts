
import { Violation } from '../scanner/gdpr';
import { PlanType } from '../license/manager';
import { ComplianceReport, SummaryCounts, ComplianceMapping } from './types';

export class ReportGenerator {
    static generate(
        violations: Violation[],
        plan: PlanType,
        filesAnalyzed: string[]
    ): ComplianceReport {

        // 1. Calculate Counts
        const counts = this.calculateCounts(violations);

        // 2. Generate Compliance Mapping
        const mapping = this.generateMapping(violations);

        // 3. Draft Executive Summary
        const summary = this.generateExecutiveSummary(counts, mapping);

        // 4. Recommendations
        const recommendations = this.generateRecommendations(violations, mapping);

        // 5. Plan Restrictions (already applied in scanner, but good to re-affirm if needed or add 'fix' stubs)
        // For V1, we don't have auto-fixes, so we just pass the violations array.

        return {
            executiveSummary: summary,
            violations: violations,
            summaryCounts: counts,
            complianceMapping: mapping,
            recommendations: recommendations,
            humanValidationRequired: counts.total > 0, // Always suggest human review if ANY issue found
            plan: plan,
            filesAnalyzed: filesAnalyzed,
            timestamp: new Date().toISOString()
        };
    }

    private static calculateCounts(violations: Violation[]): SummaryCounts {
        return {
            total: violations.length,
            critical: violations.filter(v => v.severity === 'CRITICAL').length,
            high: violations.filter(v => v.severity === 'HIGH').length,
            medium: violations.filter(v => v.severity === 'MEDIUM').length,
            low: violations.filter(v => v.severity === 'LOW').length,
        };
    }

    private static generateMapping(violations: Violation[]): ComplianceMapping {
        const hasGdpr = violations.some(v => v.category === 'GDPR');
        const hasLgpd = violations.some(v => v.category === 'LGPD');
        const hasAi = violations.some(v => v.category === 'AI_ACT');
        const hasCcpa = violations.some(v => v.category === 'CCPA');
        const hasHipaa = violations.some(v => v.category === 'HIPAA');
        const hasSecurity = violations.some(v => v.rule.includes('SECRET') || v.rule.includes('TOKEN') || v.category === 'PCI');

        return {
            GDPR: hasGdpr ? 'risk detected' : 'aligned',
            LGPD: hasLgpd ? 'risk detected' : 'aligned',
            CCPA: hasCcpa ? 'risk detected' : 'aligned',
            HIPAA: hasHipaa ? 'risk detected' : 'aligned',
            PCI_DSS: hasSecurity ? 'risk detected' : 'aligned',
            OWASP: hasSecurity ? ['A03:2021-Cryptographic Failures'] : [],
            ISO27001: 'best-practice indicators present',
            AI_ACT: hasAi ? 'risk detected' : 'aligned'
        };
    }

    private static generateExecutiveSummary(counts: SummaryCounts, mapping: ComplianceMapping): string {
        if (counts.total === 0) {
            return "No obvious compliance risks detected. Maintain vigilance.";
        }

        const criticalMsg = counts.critical > 0
            ? `${counts.critical} CRITICAL issues detected requiring immediate engineering attention.`
            : "";

        return `${counts.total} violations detected across scanned files. ${criticalMsg} GDPR Status: ${mapping.GDPR}. AI Act: ${mapping.AI_ACT}.`;
    }

    private static generateRecommendations(violations: Violation[], mapping: ComplianceMapping): string {
        const steps = [];

        if (mapping.GDPR === 'risk detected') steps.push("Audit all hardcoded PII.");
        if (mapping.AI_ACT === 'early alignment signals') steps.push("Review AI models against EU AI Act Annex III.");
        if (violations.some(v => v.severity === 'CRITICAL')) steps.push("Revoke and rotate exposed secrets immediately.");

        if (steps.length === 0) return "Continue following secure coding best practices.";

        return steps.join(" ");
    }
}
