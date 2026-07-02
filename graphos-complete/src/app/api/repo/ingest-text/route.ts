import { NextRequest, NextResponse } from "next/server";
import { dispatchRepoIndexTask } from "@/lib/queue/indexer";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthContext } from "@/lib/security/auth-context";

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuthContext();
        if (!auth.ok) return auth.response;

        const { name, content } = await req.json();
        const uId = auth.ctx.user.id;

        if (!name || !content) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        console.log(`[Ingest Text API] Starting ingestion for memory context: ${name}`);

        const sbAdmin = createAdminClient();

        // 1. Create a "Virtual" Repository Record to group these contexts
        const { data: repoRecord, error: repoErr } = await sbAdmin
            .from('repositories')
            .upsert({
                user_id: uId,
                github_url: `local://${uId}/${Date.now()}`, // Fake URL for local text pastes
                name: name,
                branch: 'local',
            }, { onConflict: 'github_url' })
            .select('*')
            .single();

        if (repoErr) {
            console.error('[Ingest API] DB Error:', repoErr);
            throw new Error('Failed to create context container.');
        }

        const repoId = repoRecord.id;

        // 2. Save the raw text as a Document
        const { data: docRecord, error: docErr } = await sbAdmin
            .from('repo_documents')
            .upsert({
                repo_id: repoId,
                file_path: `Memory-Snippet-${Date.now()}.txt`,
                content: content,
                content_hash: "v1-text-" + Buffer.from(content).toString('base64').substring(0, 10),
                language: 'mixed',
                tokens: Math.ceil(content.length / 4)
            }, { onConflict: 'repo_id,file_path' })
            .select('id')
            .single();

        if (docErr || !docRecord) {
            console.error('[Ingest API] Document DB Error:', docErr);
            throw new Error('Failed to save context document.');
        }

        console.log(`[Ingest API] Saved context. Dispatching to QStash for background chunking...`);

        // 3. Dispatch to QStash Queue for background chunking and Vector Embedding
        const dispatch = await dispatchRepoIndexTask(repoId, docRecord.id);

        if (!dispatch.success) {
            console.error('[Ingest API] Queue Dispatch Failed:', dispatch.error);
            // We do not throw an error here to the user, as the text is safely saved in DB.
            // A cron job could theoretically retry un-chunked files later.
        }

        return NextResponse.json({
            success: true,
            repoId,
            message: `Context injected. QStash is processing the embeddings.`
        });

    } catch (error: any) {
        console.error('[Ingest API] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
