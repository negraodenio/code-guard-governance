
import { Violation } from './gdpr';

export class CCPAScanner {
    static scan(content: string): Violation[] {
        const violations: Violation[] = [];
        const lines = content.split('\n');

        const rules = [
            {
                // Social Security Number (Sensitive PII)
                regex: /ssn|social_security|socialsecurity/i,
                severity: 'HIGH',
                message: 'Social Security Number (SSN) reference detected. Requires strict encryption and access control (CPRA Highly Sensitive).',
                rule: 'CCPA_SENSITIVE_PII_SSN'
            },
            {
                // Driver's License (Sensitive PII)
                regex: /driver.*license|dl_number/i,
                severity: 'HIGH',
                message: 'Driver License number detected. Requires encryption (CPRA Sensitive PII).',
                rule: 'CCPA_SENSITIVE_PII_DL'
            },
            {
                // Data Selling / Sharing Indicators
                regex: /sell_data|share_data|ad_network|third_party_share/i,
                severity: 'CRITICAL',
                message: 'Potential data selling activity detected. Ensure "Do Not Sell My Personal Information" link is present.',
                rule: 'CCPA_DATA_SELLING_INDICATOR'
            },
            {
                // Precise Geolocation (CPRA Specific)
                regex: /gps|latitude|longitude|precise_location/i,
                severity: 'MEDIUM',
                message: 'Precise Geolocation data detected. Does not track without explicit Opt-In (CPRA).',
                rule: 'CPRA_SENSITIVE_GEOLOCATION'
            },
            {
                // Biometrics
                regex: /face_id|fingerprint|biometric|retina/i,
                severity: 'HIGH',
                message: 'Biometric data collection detected. Requires explicit notice at collection.',
                rule: 'CCPA_BIOMETRIC_DATA'
            }
        ];

        lines.forEach((line, index) => {
            for (const rule of rules) {
                const match = line.match(rule.regex);
                if (match) {
                    violations.push({
                        category: 'CCPA',
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
