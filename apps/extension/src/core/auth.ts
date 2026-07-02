import { SecurityGuard } from './security';

/**
 * Unified Authenticator for CodeGuard AI
 * Handles API Key validation, Fingerprinting, and session integrity.
 */
export class UnifiedAuthenticator {
    /**
     * Validates an API key against the configured keys in environment variables.
     */
    static authenticate(key: string | undefined): { authenticated: boolean; fingerprint?: string } {
        if (!key) return { authenticated: false };

        const rawKeys = process.env.CODEGUARD_API_KEYS || '';
        const validKeys = rawKeys.split(',').map(k => k.trim()).filter(Boolean);

        // Header might be 'Bearer <key>'
        const actualKey = key.startsWith('Bearer ') ? key.substring(7) : key;

        if (validKeys.includes(actualKey)) {
            return {
                authenticated: true,
                fingerprint: SecurityGuard.fingerprint(actualKey)
            };
        }

        return { authenticated: false };
    }

    /**
     * Logs an authenticated request (redacted for safety).
     */
    static logAccess(method: string, path: string, fingerprint: string) {
        console.error(`[AUTH] ${new Date().toISOString()} | ${method} | ${path} | fp=${fingerprint}`);
    }
}
