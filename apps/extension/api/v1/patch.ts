/**
 * CodeGuard API v1 - Patch Endpoint
 * 
 * POST /api/v1/patch
 * 
 * Gera uma correção automática para uma violação específica.
 */

import 'dotenv/config';

interface PatchRequest {
    filePath: string;
    line: number;
    violation: string;
    code: string;
    ruleId?: string;
}

interface PatchResponse {
    success: boolean;
    patch?: {
        originalCode: string;
        fixedCode: string;
        description: string;
        confidence: number;
    };
    error?: string;
    creditsUsed?: number;
}

// Mock vscode
const mockVscode = {
    workspace: {
        workspaceFolders: [{ uri: { fsPath: process.cwd() } }],
        getConfiguration: () => ({ get: (k: string) => process.env[k.toUpperCase()] || '' }),
        openTextDocument: async () => ({
            getText: () => '',
            lineAt: (n: number) => ({ text: '' })
        })
    },
    window: {
        withProgress: async (_: any, t: any) => t({ report: () => { } })
    },
    ProgressLocation: { Notification: 1 },
    Range: class { constructor(public s: number, public e: number) { } }
};

(global as any).vscode = mockVscode;

import { PatchEngine, Violation } from '../../src/intelligence/patch';

export async function handler(req: Request): Promise<Response> {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405, headers
        });
    }

    try {
        // Security: API Key Validation (FAIL-CLOSED)
        const authHeader = req.headers.get('Authorization') || '';
        const internalKey = process.env.CODEGUARD_API_SECRET; // REQUIRED in production

        if (!internalKey || internalKey.trim().length < 16) {
            return new Response(JSON.stringify({ error: 'Service misconfigured: CODEGUARD_API_SECRET is required' }), {
                status: 503,
                headers
            });
        }

        const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
        if (!token || token !== internalKey) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid API Key' }), {
                status: 401,
                headers
            });
        }

        const body: PatchRequest = await req.json();

        if (!body.filePath || !body.violation || !body.code) {
            return new Response(JSON.stringify({ error: 'filePath, violation, and code are required' }), {
                status: 400, headers
            });
        }

        const violation: Violation = {
            id: Math.random().toString(36).substring(7),
            ruleId: body.ruleId || 'api-request',
            filePath: body.filePath,
            line: body.line || 1,
            message: body.violation,
            severity: 'high',
            fixable: true,
            source: 'ai'
        };

        const patcher = new PatchEngine();

        // Inject mock document
        (mockVscode.workspace as any).openTextDocument = async () => ({
            getText: () => body.code,
            lineAt: (n: number) => ({ text: body.code.split('\n')[n] || '' })
        });

        const patch = await patcher.generatePatch(violation, { contextString: body.code });

        if (!patch) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Could not generate patch'
            }), { status: 422, headers });
        }

        const response: PatchResponse = {
            success: true,
            patch: {
                originalCode: patch.originalCode,
                fixedCode: patch.fixedCode,
                description: patch.description,
                confidence: patch.confidence
            },
            creditsUsed: 2
        };

        return new Response(JSON.stringify(response), { status: 200, headers });

    } catch (error) {
        console.error('[API] Patch error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: (error as Error).message
        }), { status: 500, headers });
    }
}

export const config = { runtime: 'nodejs' };
export default handler;
