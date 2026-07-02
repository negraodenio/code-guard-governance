
import { Violation } from './gdpr';

export class LGPDScanner {
    static scan(content: string): Violation[] {
        const violations: Violation[] = [];
        const lines = content.split('\n');

        const rules = [
            {
                // Persistencia sem consentimento explicito (Heurística) - High
                regex: /\.(save|insert|create|store)\s*\(\s*.*(user|cliente|aluno|paciente).*\)/i,
                severity: 'HIGH',
                message: 'Data persistence detected. Ensure explicit consent or legal basis (Legal Basis) is documented.',
                rule: 'LGPD_DATA_PERSISTENCE'
            },
            {
                // CPF specific check (if different from generic national ID)
                regex: /cpf/i,
                severity: 'MEDIUM',
                message: 'Variable named "CPF" detected. Ensure strict access controls.',
                rule: 'LGPD_SENSITIVE_FIELD_CPF'
            },
            {
                // Telefone check
                regex: /telefone|celular|whatsapp/i,
                severity: 'MEDIUM',
                message: 'Phone number field detected. Personal Data.',
                rule: 'LGPD_SENSITIVE_FIELD_PHONE'
            }
        ];

        lines.forEach((line, index) => {
            for (const rule of rules) {
                // Skip comments for heuristics if possible, but keeping it simple as requested
                const match = line.match(rule.regex);
                if (match) {
                    violations.push({
                        category: 'LGPD',
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
