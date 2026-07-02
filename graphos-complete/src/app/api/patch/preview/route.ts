export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeApplyUnifiedDiff } from '@/lib/patch/apply';
import { requireAuthContext, forbid, notFound } from '@/lib/security/auth-context';
import { hasTenantOrUserAccess } from '@/lib/security/ownership';

export async function POST(req: Request) {
    const auth = await requireAuthContext();
    if (!auth.ok) return auth.response;

    const supabase = createAdminClient();

    try {
        const { patch_id } = await req.json();
        if (!patch_id) return NextResponse.json({ error: 'patch_id is required' }, { status: 400 });

        const { data: patch, error: pErr } = await supabase
            .from('code_patches')
            .select('*')
            .eq('id', patch_id)
            .single();

        if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
        if (!patch) return notFound();
        if (!hasTenantOrUserAccess(patch, { tenantId: auth.ctx.tenantId, userId: auth.ctx.user.id })) return forbid();

        // V2: Use repo_files (Full Content) instead of coding_memory chunks
        const { data: file, error: fErr } = await supabase
            .from('repo_files')
            .select('content')
            .eq('repo_id', patch.repo_id)
            .eq('file_path', patch.file_path)
            .single();

        if (fErr) {
            return NextResponse.json({
                error: 'Original file not found in repo_files. Please run sync v2 with wipe:true.',
                details: fErr.message
            }, { status: 404 });
        }

        const applied = safeApplyUnifiedDiff({
            originalText: file.content,
            unifiedDiff: patch.diff
        });

        return NextResponse.json({
            ok: applied.ok,
            error: applied.error,
            originalPreview: file.content.slice(0, 5000), // Trim for large files
            patchedPreview: applied.patchedText ? applied.patchedText.slice(0, 5000) : null
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
