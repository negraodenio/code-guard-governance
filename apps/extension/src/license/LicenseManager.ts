export class LicenseManager {
    static validate(key?: string): { valid: boolean; plan: 'FREE' | 'PRO' | 'ENTERPRISE' } {
        // 1. Env Var Check (Server-side / Container check)
        const envKey = process.env.CODEGUARD_LICENSE_KEY;
        const activeKey = key || envKey;

        if (!activeKey) return { valid: false, plan: 'FREE' };

        // 2. Simple format check (Mock validation for MVP)
        // In production, this would verify against Supabase/Stripe
        if (activeKey.startsWith('ent_')) return { valid: true, plan: 'ENTERPRISE' };
        if (activeKey.startsWith('pro_')) return { valid: true, plan: 'PRO' };

        return { valid: false, plan: 'FREE' };
    }

    static checkGate(toolName: string, licensePlan: 'FREE' | 'PRO' | 'ENTERPRISE'): boolean {
        const PREMIUM_TOOLS = ['compliance_diff', 'codeguard_fix', 'codeguard_audit']; // Audit is now Premium

        if (PREMIUM_TOOLS.includes(toolName)) {
            return licensePlan !== 'FREE';
        }
        return true; // Default allow for Shadow API, Graph, etc.
    }

    static logAnalytics(event: string, tool: string, plan: string, allowed: boolean) {
        // Log structure for analytics scraping/piping
        console.error(JSON.stringify({
            event: 'MCP_ANALYTICS',
            type: event,
            tool,
            plan,
            allowed,
            timestamp: new Date().toISOString()
        }));
    }
}
