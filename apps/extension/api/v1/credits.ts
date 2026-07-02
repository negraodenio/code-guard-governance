/**
 * CodeGuard API v1 - Credits Endpoint
 * 
 * GET /api/v1/credits
 * 
 * Retorna saldo de créditos do usuário.
 */

import { getSupabaseClient } from '../../src/supabase/client';

export async function handler(req: Request): Promise<Response> {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }

    if (req.method !== 'GET') {
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

        // Get email from Authorization header or query param
        const url = new URL(req.url);
        const email = url.searchParams.get('email') ||
            req.headers.get('X-User-Email');

        if (!email) {
            return new Response(JSON.stringify({
                error: 'email query param or X-User-Email header required'
            }), { status: 400, headers });
        }

        const supabase = getSupabaseClient();

        if (!supabase) {
            return new Response(JSON.stringify({
                balance: 0,
                message: 'Credits service unavailable (no database configured)'
            }), { status: 200, headers });
        }

        const { data, error } = await supabase
            .from('user_credits')
            .select('credits')
            .eq('email', email)
            .single();

        if (error || !data) {
            return new Response(JSON.stringify({
                balance: 0,
                message: 'No credits found for this email'
            }), { status: 200, headers });
        }

        return new Response(JSON.stringify({
            balance: data.credits,
            email
        }), { status: 200, headers });

    } catch (error) {
        console.error('[API] Credits error:', error);
        return new Response(JSON.stringify({
            error: (error as Error).message
        }), { status: 500, headers });
    }
}

export const config = { runtime: 'nodejs' };
export default handler;
