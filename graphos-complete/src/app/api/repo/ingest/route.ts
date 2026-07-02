import { NextRequest, NextResponse } from "next/server";
import { fetchGithubRepoTree } from "@/lib/repo/github";
import { dispatchRepoIndexTask } from "@/lib/queue/indexer";
// Uncomment and configure your supabase client when the types are generated properly
import { createAdminClient } from "@/lib/supabase/admin";
import { isInternalRequest } from "@/lib/security/internal-auth";

export async function POST(req: NextRequest) {
    try {
        // Legacy ingestion endpoint: keep disabled in production by default.
        if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEBUG_ENDPOINTS !== 'true') {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        if (!isInternalRequest(req.headers)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { githubUrl, branch = 'main', uId } = await req.json();

        if (!githubUrl || !githubUrl.includes('github.com')) {
            return NextResponse.json({ error: "Invalid GitHub URL." }, { status: 400 });
        }

        // Parse owner and repo
        // e.g. https://github.com/facebook/react -> ['facebook', 'react']
        const urlParts = new URL(githubUrl).pathname.split('/').filter(Boolean);
        if (urlParts.length < 2) {
            return NextResponse.json({ error: "Invalid GitHub repository format." }, { status: 400 });
        }

        const owner = urlParts[0];
        const repo = urlParts[1];

        console.log(`[Ingest API] Starting ingestion for ${owner}/${repo}`);

        const sbAdmin = createAdminClient();

        // 1. Create or Find Repository Record
        const { data: repoRecord, error: repoErr } = await sbAdmin
            .from('repositories')
            .upsert({
                user_id: uId, // Pass the user ID properly from frontend or auth token
                github_url: githubUrl,
                name: `${owner}/${repo}`,
                branch: branch
            }, { onConflict: 'github_url' })
            .select('*')
            .single();

        if (repoErr) {
            console.error('[Ingest API] DB Error:', repoErr);
            throw new Error('Failed to create repository record.');
        }

        const repoId = repoRecord.id;

        // 2. Fetch the entire tree from GitHub
        // (This fetches all valid code files as mapped in our github.ts logic)
        const files = await fetchGithubRepoTree(owner, repo, branch);

        console.log(`[Ingest API] Found ${files.length} code files. Dispatching to QStash...`);

        // 3. Dispatch to QStash in batches
        // For example, instead of sending all files at once (which might exceed payload limits),
        // we can dispatch one task per file, or one task per 5 files.
        // For simplicity, we queue a background job for EACH file to be chunked and embedded.
        const dispatchPromises = files.map(file => {
            // We pass the file path and content to our queue
            // Since passing whole file content in QStash might be too big for large repos,
            // we can just pass the path and have the worker fetch the raw file directly, 
            // or pass it if it's small enough. For now, we'll store the document in DB first.
            return sbAdmin.from('repo_documents').upsert({
                repo_id: repoId,
                file_path: file.path,
                content: file.content,
                content_hash: "v1-" + Buffer.from(file.content).toString('base64').substring(0, 10), // Simple hash
                language: file.path.split('.').pop(),
                tokens: Math.ceil(file.content.length / 4) // Rough estimate
            }, { onConflict: 'repo_id,file_path' }).select('id').single().then(({ data }: any) => {
                if (data?.id) {
                    return dispatchRepoIndexTask(repoId, data.id); // shardId = document_id
                }
            });
        });

        // We don't await all dispatch promises to avoid Vercel timeout on massive repos.
        // We just start them and return immediately.
        Promise.allSettled(dispatchPromises).then(() => {
            console.log(`[Ingest API] Finished queueing all background tasks for ${owner}/${repo}`);
        });

        return NextResponse.json({
            success: true,
            repoId,
            message: `Ingestion started. Queued ${files.length} files for processing.`
        });

    } catch (error: any) {
        console.error('[Ingest API] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
