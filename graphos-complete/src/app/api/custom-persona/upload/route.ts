import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedMistralCached } from "@/lib/embeddings/mistral";

// Chunk text into overlapping segments
function chunkText(text: string, maxChunkSize = 800, overlap = 100): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + maxChunkSize, text.length);
        const chunk = text.slice(start, end).trim();
        if (chunk.length > 50) {
            chunks.push(chunk);
        }
        start += maxChunkSize - overlap;
    }
    return chunks;
}

// Extract text from different file types
async function extractTextFromFile(file: File, filename: string): Promise<string> {
    const ext = filename.split(".").pop()?.toLowerCase() || "txt";
    const buffer = Buffer.from(await file.arrayBuffer());

    if (ext === "pdf") {
        try {
            const pdf = require("pdf-parse");
            const data = await pdf(buffer);
            // Clean and normalize extracted text
            let text = data.text || "";

            // 1. Remove control characters and non-printable chars (except common ones)
            text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");

            // 2. Normalize whitespace: replace multiple spaces with one, multiple newlines with at most two
            text = text.replace(/ +/g, " ");
            text = text.replace(/\n{3,}/g, "\n\n");

            // 3. Trim
            text = text.trim();

            console.log(`[Upload API] Normalized PDF text for ${filename}. Length: ${text.length}`);
            return text;
        } catch (err) {
            console.error(`[Upload API] PDF parsing error for ${filename}:`, err);
            throw new Error(`Failed to parse PDF: ${filename}`);
        }
    }

    // Default to plain text for .txt, .md, .csv etc.
    return buffer.toString("utf-8");
}

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const personaId = formData.get("persona_id") as string;
        const file = formData.get("file") as File | null;
        const textContent = formData.get("text_content") as string | null;
        const filename = (formData.get("filename") as string) || file?.name || `upload-${Date.now()}.txt`;

        console.log(`[Upload API] Starting upload for persona ${personaId}, file: ${filename}`);

        if (!personaId) {
            return NextResponse.json({ error: "persona_id is required" }, { status: 400 });
        }

        // Verify persona belongs to user
        const { data: persona, error: personaErr } = await supabase
            .from("custom_personas")
            .select("id, user_id")
            .eq("id", personaId)
            .eq("user_id", user.id)
            .single();

        if (personaErr || !persona) {
            console.error("[Upload API] Persona verification failed:", personaErr);
            return NextResponse.json({ error: "Persona not found or access denied" }, { status: 404 });
        }

        // Get text content from file or direct text
        let rawText: string;
        if (file) {
            console.log(`[Upload API] Extracting text from file ${filename}`);
            rawText = await extractTextFromFile(file, filename);
        } else if (textContent) {
            console.log(`[Upload API] Using direct text content`);
            rawText = textContent;
        } else {
            return NextResponse.json({ error: "No file or text content provided" }, { status: 400 });
        }

        if (rawText.trim().length < 50) {
            return NextResponse.json({ error: "Content too short (minimum 50 characters of actual text)" }, { status: 400 });
        }

        console.log(`[Upload API] Processing ${rawText.length} characters of raw text`);

        // Create document record
        const sbAdmin = createAdminClient();
        const { data: docRecord, error: docErr } = await sbAdmin
            .from("custom_persona_documents")
            .insert({
                persona_id: personaId,
                user_id: user.id,
                filename,
                file_type: filename.split(".").pop()?.toLowerCase() || "txt",
                file_size_bytes: rawText.length,
                status: "processing",
            })
            .select("id")
            .single();

        if (docErr || !docRecord) {
            console.error("[Upload API] Failed to create document record:", docErr);
            return NextResponse.json({ error: "Failed to create document record" }, { status: 500 });
        }

        // Chunk the text
        const chunks = chunkText(rawText);
        console.log(`[Upload API] Created ${chunks.length} chunks`);

        if (chunks.length === 0) {
            await sbAdmin.from("custom_persona_documents").update({ status: "error", error_message: "No meaningful text found to chunk" }).eq("id", docRecord.id);
            return NextResponse.json({ error: "No meaningful text segments found in document" }, { status: 400 });
        }

        // Generate embeddings in batches of 10
        const batchSize = 10;
        let totalEmbedded = 0;
        let firstError: string | null = null;

        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);
            try {
                const embeddings = await embedMistralCached(batch);

                // Insert chunks + embeddings
                const rows = batch.map((chunk, idx) => ({
                    persona_id: personaId,
                    user_id: user.id,
                    chunk_content: chunk,
                    embedding: embeddings[idx], // Send as array, Supabase pgvector handles it
                }));

                const { error: insertErr } = await sbAdmin
                    .from("repo_embeddings")
                    .insert(rows);

                if (insertErr) {
                    console.error(`[Upload API] Embedding insert error batch ${i}:`, insertErr);
                    if (!firstError) firstError = `Insert Error: ${insertErr.message}`;
                } else {
                    totalEmbedded += batch.length;
                }
            } catch (embErr: any) {
                console.error(`[Upload API] Embedding generation error batch ${i}:`, embErr);
                if (!firstError) firstError = `Embedding Error: ${embErr.message || String(embErr)}`;
            }
        }

        // Update document status
        console.log(`[Upload API] Finalizing document ${docRecord.id}. Embedded ${totalEmbedded}/${chunks.length} chunks.`);
        await sbAdmin
            .from("custom_persona_documents")
            .update({
                chunk_count: totalEmbedded,
                status: totalEmbedded > 0 ? "ready" : "error",
                error_message: totalEmbedded === 0 ? (firstError || "Failed to generate embeddings") : null,
            })
            .eq("id", docRecord.id);

        // Update persona document count
        const { data: allDocs } = await sbAdmin
            .from("custom_persona_documents")
            .select("id")
            .eq("persona_id", personaId)
            .eq("status", "ready");

        await sbAdmin
            .from("custom_personas")
            .update({
                document_count: allDocs?.length || 0,
                updated_at: new Date().toISOString(),
            })
            .eq("id", personaId);

        return NextResponse.json({
            success: true,
            document_id: docRecord.id,
            chunks_processed: totalEmbedded,
            total_chunks: chunks.length,
            message: `${totalEmbedded}/${chunks.length} chunks embedded successfully`,
        });

    } catch (error: any) {
        console.error("[Upload API] Fatal error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
