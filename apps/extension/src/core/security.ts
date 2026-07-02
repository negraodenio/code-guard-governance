import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Enterprise Security Layer for CodeGuard AI
 * Focuses on Sandboxing, Path Validation, and Integrity.
 */
export class SecurityGuard {
    private static readonly ALLOWED_ROOT = process.env.CODEGUARD_SAFE_ROOT || process.cwd();

    /**
     * Validates and resolves a path within the allowed workspace root.
     * Prevents Path Traversal attacks.
     * 
     * @param unsafePath The user-provided path
     * @returns A safe, resolved absolute path
     * @throws Error if the path is outside the allowed root
     */
    static resolveSafePath(unsafePath: string): string {
        const rootResolved = path.resolve(this.ALLOWED_ROOT);
        const candidate = path.resolve(rootResolved, unsafePath);

        // Normalize paths for comparison (especially on Windows)
        const rootComparable = rootResolved.replace(/\\/g, '/').toLowerCase();
        const candComparable = candidate.replace(/\\/g, '/').toLowerCase();

        // Exact match or sub-directory check
        if (candComparable === rootComparable || candComparable.startsWith(rootComparable + '/')) {
            return candidate;
        }

        throw new Error(`SECURITY ALERT: Attempted access outside allowed workspace root: ${unsafePath}`);
    }

    /**
     * Fingerprints an API key for logs and audit trails without exposing the secret.
     */
    static fingerprint(secret: string): string {
        if (!secret) return 'anonymous';
        return crypto.createHash('sha256').update(secret).digest('hex').slice(0, 12);
    }

    /**
     * Sanitizes output by redacting potential sensitive paths or tokens.
     */
    static sanitize(content: string): string {
        // Redact absolute paths that reveal home directories
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        if (homeDir && homeDir.length > 5) {
            const escapedHome = homeDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedHome, 'g');
            return content.replace(regex, '[ROOT]');
        }
        return content;
    }

    /**
     * Checks if a filename is inherently dangerous.
     */
    static isDangerousFile(fileName: string): boolean {
        const dangerous = ['.env', '.git', '.vscode', 'package-lock.json', 'yarn.lock'];
        return dangerous.includes(path.basename(fileName).toLowerCase());
    }
}
