import { NextRequest, NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!process.env.QSTASH_TOKEN || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ ok: false, reason: 'QStash not configured' }, { status: 200 });
  }
  try {
    const { verifySignatureAppRouter } = await import("@upstash/qstash/dist/nextjs");
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { chunkRepoFile } = await import("@/lib/repo/chunker");
    const OpenAI = (await import("openai")).default;

    const handler = async (req: NextRequest) => {
      try {
        const body = await req.json();
        const { type, payload } = body;
        console.log(`[QStash Worker] Received task type: ${type}`);

        if (type === 'process-repo-chunk') {
          const documentId = payload.shardId;
          const sbAdmin = createAdminClient();
          const { data: doc, error: fetchErr } = await sbAdmin
            .from('repo_documents')
            .select('id, file_path, content, repo_id')
            .eq('id', documentId)
            .single();
          if (fetchErr || !doc) {
            return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
          }
          const chunks = await chunkRepoFile(doc.file_path, doc.content);
          const client = new OpenAI({
            apiKey: process.env.MISTRAL_API_KEY || process.env.OPENAI_API_KEY || 'sk-placeholder',
            baseURL: "https://api.mistral.ai/v1"
          });
          const embeddingResponse = await client.embeddings.create({
            model: "mistral-embed", input: chunks.map(c => c.content),
          });
          const rowsToInsert = embeddingResponse.data.map((emb: any, idx: number) => ({
            document_id: doc.id, chunk_content: chunks[idx].content, embedding: emb.embedding,
          }));
          const { error: insertErr } = await sbAdmin.from('repo_embeddings').insert(rowsToInsert);
          if (insertErr) {
            return NextResponse.json({ success: false, error: 'DB Insert Failed' }, { status: 500 });
          }
          return NextResponse.json({ success: true, message: `Embedded ${chunks.length} chunks` });
        }
        return NextResponse.json({ success: false, error: 'Unknown task type' }, { status: 400 });
      } catch (error: any) {
        console.error('[QStash Worker] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    }
    return verifySignatureAppRouter(handler)(req);
  } catch (err: any) {
    console.error('[QStash] Module init error:', err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
