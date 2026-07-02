/**
 * CodeGuard API v1 - Health Check
 * 
 * GET /api/v1/health
 */

export async function handler(req: Request): Promise<Response> {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    return new Response(JSON.stringify({
        status: 'ok',
        version: '1.1.18',
        timestamp: new Date().toISOString(),
        services: {
            scan: 'operational',
            patch: 'operational',
            rag: process.env.SILICONFLOW_API_KEY ? 'operational' : 'degraded'
        }
    }), { status: 200, headers });
}

export const config = { runtime: 'edge' };
export default handler;
