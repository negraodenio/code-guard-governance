import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuthContext, forbid } from '@/lib/security/auth-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const auth = await requireAuthContext();
        if (!auth.ok) return auth.response;

        if (auth.ctx.tenantId !== auth.ctx.user.id && auth.ctx.role !== 'admin') return forbid();

        const supabase = createAdminClient();
        const body = await req.json();
        const { repo_url, repo_name } = body;

        // Strict validation for production
        if (!repo_url) {
            return NextResponse.json(
                { error: 'Missing required fields: repo_url is mandatory.' },
                { status: 400 }
            );
        }

        // Validate repo_url format
        try {
            new URL(repo_url);
        } catch {
            return NextResponse.json({ error: 'Invalid repository URL format.' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('repositories')
            .insert({
                tenant_id: auth.ctx.tenantId,
                user_id: auth.ctx.user.id,
                repo_url,
                repo_name: repo_name || repo_url.split('/').pop()?.replace('.git', '') || 'unnamed-repo',
                default_branch: 'main',
                status: 'active'
            })
            .select('*')
            .single();

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            repo: data,
            message: 'Repository registered successfully in intelligence layer.'
        });
    } catch (err: any) {
        return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
    }
}
