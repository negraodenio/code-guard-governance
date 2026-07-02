// Edge Runtime for Vercel
export const runtime = 'nodejs';

export async function GET(request: Request) {
    // Redirect to external documentation
    return new Response(null, { 
        status: 302, 
        headers: { 'Location': 'https://code-guard.eu/api-docs' } 
    });
}
