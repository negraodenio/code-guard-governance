
import { Violation } from './gdpr';

export class OWASPScanner {
    static scan(content: string): Violation[] {
        const violations: Violation[] = [];
        const lines = content.split('\n');

        const rules = [
            {
                // SQL Injection (Simple heuristic)
                regex: /(SELECT|INSERT|UPDATE|DELETE)\s+.*(?:WHERE|VALUES)\s+.*(?:\+|\|\||\$)/i,
                severity: 'HIGH',
                message: 'Potential SQL Injection: Unparameterized query detected (OWASP A03).',
                rule: 'OWASP_SQLI'
            },
            {
                // XSS (innerHTML)
                regex: /\.innerHTML\s*=/i,
                severity: 'MEDIUM',
                message: 'Unsafe DOM manipulation (innerHTML) detected. Risk of XSS (OWASP A03).',
                rule: 'OWASP_XSS'
            },
            {
                // Hardcoded Credentials
                regex: /password\s*=\s*['"][^'"]+['"]/i,
                severity: 'CRITICAL',
                message: 'Hardcoded password detected (OWASP A07 - Identification and Authentication Failures).',
                rule: 'OWASP_AUTH_FAIL'
            }
        ];

        lines.forEach((line, index) => {
            for (const rule of rules) {
                const match = line.match(rule.regex);
                if (match) {
                    violations.push({
                        category: 'SECURITY',
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
