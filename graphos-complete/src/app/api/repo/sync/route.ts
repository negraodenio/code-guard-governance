import { createAdminClient } from '@/lib/supabase/admin';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { shouldIgnorePath } from '@/lib/repo/ignore';
import { chunkByLines } from '@/lib/repo/chunk';
import { gh, parseGitHubRepo, getBlobText } from '@/lib/github/client';
import { compareCommits } from '@/lib/github/compare';
import { apiError, apiOk } from '@/lib/api/error';
import { requireAuthContext, forbid } from '@/lib/security/auth-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getRepo(owner: string, repo: string) {
    return gh(`/repos/${owner}/${repo}`);
}
async function getBranch(owner: string, repo: string, branch: string) {
    return gh(`/repos/${owner}/${repo}/branches/${branch}`);
}
async function listTree(owner: string, repo: string, sha: string) {
    return gh(`/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`);
}

export async function POST(req: Request) {
    try {
        const auth = await requireAuthContext();
        if (!auth.ok) return auth.response;

        const { repo_url, repo_name, default_branch, force_full } = await req.json();
        const tenant_id = auth.ctx.tenantId;
        const user_id = auth.ctx.user.id;
        const supabase = createAdminClient();

        if (!process.env.GITHUB_TOKEN) return apiError('Missing GITHUB_TOKEN', 400);
        if (!repo_url) return apiError('repo_url is required', 400);

        if (tenant_id !== user_id && auth.ctx.role !== 'admin') return forbid();

        const { owner, repo } = parseGitHubRepo(repo_url);
        const repoMeta = await getRepo(owner, repo);
        const branchName = default_branch || repoMeta.default_branch || 'main';
        const branch = await getBranch(owner, repo, branchName);
        const headSha = branch?.commit?.sha as string;

        // Check if repo exists
        const { data: existingRepo } = await supabase
            .from('repositories')
            .select('*')
            .eq('repo_url', repo_url.replace('.git', ''))
            .eq('tenant_id', tenant_id)
            .maybeSingle();

        let repoRow = existingRepo;

        if (!repoRow) {
            // First time sync
            const { data: newRepo, error: insErr } = await supabase
                .from('repositories')
                .insert({
                    tenant_id,
                    user_id,
                    provider: 'github',
                    repo_url: repo_url.replace('.git', ''),
                    repo_name: repo_name || `${owner}/${repo}`,
                    default_branch: branchName,
                    last_commit_sha: headSha
                })
                .select('*')
                .single();

            if (insErr) throw insErr;
            repoRow = newRepo;
        } else if (repoRow.last_commit_sha === headSha && !force_full) {
            // Already up to date
            return apiOk({ message: 'Already up to date', repo_id: repoRow.id });
        } else if (repoRow.last_commit_sha && !force_full) {
            // Incremental sync
            const diff = await compareCommits(owner, repo, repoRow.last_commit_sha, headSha);

            let filesAdded = 0, filesModified = 0, filesDeleted = 0, chunksWritten = 0;

            for (const f of diff.files) {
                if (shouldIgnorePath(f.filename)) continue;

                if (f.status === 'removed') {
                    // Delete from coding_memory and repo_files
                    await supabase.from('coding_memory').delete().eq('repo_id', repoRow.id).eq('file_path', f.filename);
                    await supabase.from('repo_files').delete().eq('repo_id', repoRow.id).eq('file_path', f.filename);
                    filesDeleted++;
                    continue;
                }

                // For added/modified, fetch new content
                try {
                    const text = await getBlobText(owner, repo, f.sha);
                    if (!text || text.trim().length < 20) continue;

                    const contentSha = crypto.createHash('sha256').update(text).digest('hex');

                    // Upsert full file
                    const { error: fErr } = await supabase.from('repo_files').upsert({
                        tenant_id,
                        repo_id: repoRow.id,
                        commit_sha: headSha,
                        file_path: f.filename,
                        content: text,
                        content_sha: contentSha,
                        sha: f.sha,
                        byte_size: Buffer.byteLength(text, 'utf8')
                    }, { onConflict: 'repo_id,file_path' });

                    if (fErr) {
                        console.error(`DB Error saving ${f.filename}:`, fErr);
                        continue;
                    }

                    // Re-chunk
                    await supabase.from('coding_memory').delete().eq('repo_id', repoRow.id).eq('file_path', f.filename);
                    const chunks = chunkByLines({ text, filePath: f.filename, maxLines: 140 });

                    for (const ch of chunks) {
                        await supabase.from('coding_memory').insert({
                            id: `mem_${nanoid(16)}`,
                            tenant_id,
                            repo_id: repoRow.id,
                            file_path: f.filename,
                            start_line: ch.startLine,
                            end_line: ch.endLine,
                            content: ch.content,
                            metadata: { source: 'github', commit: headSha, content_sha: contentSha }
                        });
                        chunksWritten++;
                    }

                    if (f.status === 'added') filesAdded++;
                    else filesModified++;
                } catch (err) {
                    console.error(`Failed to sync ${f.filename}:`, err);
                }
            }

            // Update repo last_commit_sha
            await supabase.from('repositories').update({ last_commit_sha: headSha }).eq('id', repoRow.id);

            // Log sync history
            await supabase.from('repo_sync_history').insert({
                repo_id: repoRow.id,
                commit_sha: headSha,
                files_added: filesAdded,
                files_modified: filesModified,
                files_deleted: filesDeleted,
                chunks_written: chunksWritten,
                sync_type: 'incremental'
            });

            return apiOk({
                repo_id: repoRow.id,
                sync_type: 'incremental',
                headSha,
                files_added: filesAdded,
                files_modified: filesModified,
                files_deleted: filesDeleted,
                chunks_written: chunksWritten
            });
        }

        // Full sync (force or first time)
        const tree = await listTree(owner, repo, headSha);
        const files = (tree.tree || []).filter((t: any) => t.type === 'blob');

        // Wipe old data on full sync for this repo
        await supabase.from('coding_memory').delete().eq('repo_id', repoRow.id);
        await supabase.from('repo_files').delete().eq('repo_id', repoRow.id);

        let filesWritten = 0, chunksWritten = 0;

        for (const f of files) {
            const filePath = f.path as string;
            if (!filePath || shouldIgnorePath(filePath)) continue;

            // Limit file size for processing (600kb)
            if (typeof f.size === 'number' && f.size > 600_000) continue;

            try {
                const text = await getBlobText(owner, repo, f.sha);
                if (!text || text.trim().length < 20) continue;

                const contentSha = crypto.createHash('sha256').update(text).digest('hex');

                await supabase.from('repo_files').upsert({
                    tenant_id,
                    repo_id: repoRow.id,
                    commit_sha: headSha,
                    file_path: filePath,
                    content: text,
                    content_sha: contentSha,
                    sha: f.sha,
                    byte_size: Buffer.byteLength(text, 'utf8')
                }, { onConflict: 'repo_id,file_path' });

                filesWritten++;

                const chunks = chunkByLines({ text, filePath, maxLines: 140 });
                for (const ch of chunks) {
                    await supabase.from('coding_memory').insert({
                        id: `mem_${nanoid(16)}`,
                        tenant_id,
                        repo_id: repoRow.id,
                        file_path: filePath,
                        start_line: ch.startLine,
                        end_line: ch.endLine,
                        content: ch.content,
                        metadata: { source: 'github', commit: headSha, content_sha: contentSha }
                    });
                    chunksWritten++;
                }
            } catch (err) {
                console.error(`Failed to process ${filePath}:`, err);
            }
        }

        await supabase.from('repositories').update({ last_commit_sha: headSha }).eq('id', repoRow.id);

        await supabase.from('repo_sync_history').insert({
            repo_id: repoRow.id,
            commit_sha: headSha,
            files_added: filesWritten,
            chunks_written: chunksWritten,
            sync_type: 'full'
        });

        return apiOk({
            repo_id: repoRow.id,
            sync_type: 'full',
            headSha,
            files_written: filesWritten,
            chunks_written: chunksWritten
        });
    } catch (error: any) {
        console.error('Sync Error:', error);
        return apiError(error.message, 500);
    }
}
