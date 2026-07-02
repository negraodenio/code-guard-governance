
import { Violation } from './gdpr';

export class HIPAAScanner {
    static scan(content: string): Violation[] {
        const violations: Violation[] = [];
        const lines = content.split('\n');

        const rules = [
            {
                regex: /\b(ssn|social\s*security|mrn|medical\s*record)\b/i,
                severity: 'HIGH',
                message: 'Potential PHI Identifier (SSN/MRN) detected.',
                rule: 'HIPAA_PHI_IDENTIFIER'
            },
            {
                regex: /\b(diagnosis|icd-10|prescription|treatment|patient)\b/i,
                severity: 'MEDIUM',
                message: 'Health-related terms detected. Ensure data is encrypted at rest/transit.',
                rule: 'HIPAA_HEALTH_DATA'
            }
        ];

        lines.forEach((line, index) => {
            for (const rule of rules) {
                const match = line.match(rule.regex);
                if (match) {
                    violations.push({
                        category: 'SECURITY', // Mapped to Security for V1 aggregation
                        rule: rule.rule,
                        severity: rule.severity as any,
                        line: index + 1,
                        match: match[0],
                        message: rule.message
                    });
                }
            }
        });

        return violations;
    }
}
