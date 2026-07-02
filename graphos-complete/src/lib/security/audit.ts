/**
 * 🛡️ COUNCILIA v14 — AUDIT SECURITY LAYER (Edge Compatible)
 * Implements HMAC-SHA256 Signed Hash Chaining for Tamper-Proof Audit Trails.
 * Uses the Global Web Crypto API for cross-runtime compatibility (Node.js & Edge).
 */

/**
 * Generates a signed HMAC hash for a given payload and optional previous hash.
 * This ensures that the audit trail is verifiable by a server-side secret.
 */
export async function generateSignedHash(payload: any, prevHash: string = ''): Promise<string> {
    const secret = process.env.AUDIT_SECRET;
    if (!secret || secret.length < 16) {
        throw new Error('AUDIT_SECRET environment variable is required (min 16 chars) for audit trail integrity.');
    }
    const data = JSON.stringify(payload) + prevHash;
    
    // Using globalThis.crypto which is available in Node 17+, Edge, and Browsers.
    // This avoids using Node-specific 'crypto' module which breaks Edge builds.
    const webCrypto = globalThis.crypto;
    
    if (!webCrypto || !webCrypto.subtle) {
        throw new Error('Web Crypto API (subtle) is not available in this environment.');
    }

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(data);

    const key = await webCrypto.subtle.importKey(
        'raw', 
        keyData, 
        { name: 'HMAC', hash: 'SHA-256' }, 
        false, 
        ['sign']
    );

    const signature = await webCrypto.subtle.sign('HMAC', key, msgData);
    
    // Hash to Hex
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Verifies if a hash matches the provided payload and previous hash.
 */
export async function verifyAuditHash(hash: string, payload: any, prevHash: string = ''): Promise<boolean> {
    const expected = await generateSignedHash(payload, prevHash);
    return hash === expected;
}
