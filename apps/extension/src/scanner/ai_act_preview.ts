
import { Violation } from './gdpr';

export class AIActScanner {
    static scan(content: string): Violation[] {
        const violations: Violation[] = [];
        const lines = content.split('\n');

        // Heuristics for "High Risk" systems under EU AI Act
        const heuristics = [
            {
                pattern: /(creditScore|riskScore|socialScore|trustScore)/i,
                message: 'Scoring/Profiling detected. Social Scoring is BANNED under AI Act. Credit scoring is HIGH RISK.',
                rule: 'AI_ACT_SOCIAL_SCORING'
            },
            {
                pattern: /(biometric|facial|fingerprint|retina|emotion)/i,
                message: 'Biometric data processing detected. Strict categorization required under AI Act.',
                rule: 'AI_ACT_BIOMETRICS'
            },
            {
                pattern: /(predict|approve|reject|decide)\s*\(.*(loan|hire|fire|exclude|grant).*\)/i,
                message: 'Automated decision making detected in critical sector (employment/finance). High Risk System.',
                rule: 'AI_ACT_AUTOMATED_DECISION'
            },
            {
                pattern: /(race|religion|political|union|genetic|orient)/i,
                message: 'Processing sensitive categories (Art. 9 GDPR) for AI training/inference is heavily restricted.',
                rule: 'AI_ACT_SENSITIVE_DATA'
            }
        ];

        lines.forEach((line, index) => {
            for (const heuristic of heuristics) {
                const match = line.match(heuristic.pattern);
                if (match) {
                    violations.push({
                        category: 'AI_ACT',
                        rule: heuristic.rule,
                        severity: 'LOW', // Always warn/low/info for Preview
                        line: index + 1,
                        match: match[0],
                        message: `[PREVIEW] ${heuristic.message} (This is an early risk signal, not a compliance verdict).`
                    });
                }
            }
        });

        return violations;
    }
}
