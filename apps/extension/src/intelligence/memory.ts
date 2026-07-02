/**
 * Coding Memory - RAG por Arquivo v2.0
 * 
 * Sistema de memória baseado em embeddings para recuperação
 * de contexto relevante durante scans e geração de patches.
 * 
 * FEATURES:
 * - Embeddings via SiliconFlow (10x mais barato que OpenAI)
 * - Cache local para reduzir chamadas de API
 * - Chunking inteligente para arquivos grandes
 * - Similaridade por coseno para busca semântica
 */

import { getSupabaseClient } from '../supabase/client';
import { getLLMRouter } from '../core/llm-router';
import { PROVIDERS } from '../core/llm-config';
import * as crypto from 'crypto';

export interface MemoryChunk {
    id: string;
    filePath: string;
    chunkIndex: number;
    content: string;
    embedding: number[];
    metadata: {
        language: string;
        functions: string[];
        imports: string[];
        lineStart: number;
        lineEnd: number;
        hash: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface RAGResult {
    chunks: MemoryChunk[];
    relevanceScores: number[];
    totalTokens: number;
    contextString: string;
}

export interface RAGQuery {
    query: string;
    filePath?: string;
    maxResults?: number;
    threshold?: number;
    includeMetadata?: boolean;
}

export class CodingMemory {
    private cache: Map<string, number[]> = new Map();
    private router = getLLMRouter();
    private readonly CHUNK_SIZE = 1500; // tokens (~6000 chars)
    private readonly OVERLAP = 200; // tokens overlap between chunks
    private readonly PERSIST_REMOTE = (process.env.CODEGUARD_MEMORY_PERSIST || '').toLowerCase() === 'true';

    /**
     * Initialize memory for a repo context
     */
    async initialize(context: { files: Array<{ path: string; content: string }> }): Promise<void> {
        console.error(`[CodingMemory] Indexando ${context.files.length} arquivos...`);

        for (const file of context.files) {
            await this.indexFile(file.path, file.content);
        }

        console.error(`[CodingMemory] Indexação completa. Cache: ${this.cache.size} embeddings`);
    }

    /**
     * Index a single file with chunking
     */
    async indexFile(filePath: string, content: string): Promise<void> {
        const hash = this.hashContent(content);
        const cacheKey = `${filePath}:${hash}`;

        // Skip if already cached
        if (this.cache.has(cacheKey)) {
            return;
        }

        const chunks = this.chunkContent(content, filePath);
        const supabase = this.PERSIST_REMOTE ? getSupabaseClient() : null;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            try {
                // Generate embedding via LLMRouter (usa SiliconFlow por padrão)
                const result = await this.router.embed(chunk.content);
                const embedding = result.embeddings[0];

                // Store in cache
                this.cache.set(`${filePath}:${i}`, embedding);

                // Store in Supabase only if explicitly enabled
                if (supabase) {
                    await supabase.from('code_memory').upsert({
                        id: `${filePath}:${i}:${hash}`,
                        file_path: filePath,
                        chunk_index: i,
                        content_chunk: chunk.content,
                        embedding: embedding,
                        metadata: chunk.metadata,
                        project_id: 'current-workspace',
                        content_hash: hash
                    });
                }
            } catch (error) {
                console.warn(`[CodingMemory] Falha ao indexar chunk ${i} de ${filePath}:`, error);
            }
        }
    }

    /**
     * Query memory for relevant context
     */
    async query(params: RAGQuery): Promise<RAGResult> {
        const { query, filePath, maxResults = 5, threshold = 0.7 } = params;

        // Generate query embedding
        const queryResult = await this.router.embed(query);
        const queryEmbedding = queryResult.embeddings[0];

        const results: Array<{ chunk: MemoryChunk; score: number }> = [];

        // Search in cache first
        for (const [key, embedding] of this.cache.entries()) {
            // Filter by file if specified
            if (filePath && !key.startsWith(filePath)) continue;

            const score = this.cosineSimilarity(queryEmbedding, embedding);

            if (score >= threshold) {
                results.push({
                    chunk: {
                        id: key,
                        filePath: key.split(':')[0],
                        chunkIndex: parseInt(key.split(':')[1]) || 0,
                        content: '', // Will be fetched if needed
                        embedding: embedding,
                        metadata: { language: '', functions: [], imports: [], lineStart: 0, lineEnd: 0, hash: '' },
                        createdAt: new Date(),
                        updatedAt: new Date()
                    },
                    score
                });
            }
        }

        // Sort by relevance
        results.sort((a, b) => b.score - a.score);
        const topResults = results.slice(0, maxResults);

        // Build context string
        const contextParts = topResults.map(r =>
            `// File: ${r.chunk.filePath} (relevance: ${(r.score * 100).toFixed(1)}%)\n${r.chunk.content}`
        );

        return {
            chunks: topResults.map(r => r.chunk),
            relevanceScores: topResults.map(r => r.score),
            totalTokens: queryResult.usage.tokens,
            contextString: contextParts.join('\n\n---\n\n')
        };
    }

    /**
     * Get context for a specific file
     */
    async getFileContext(filePath: string, maxLines: number = 50): Promise<string> {
        // Get all chunks for this file from cache
        const chunks: string[] = [];

        for (const [key, _] of this.cache.entries()) {
            if (key.startsWith(filePath)) {
                // Would need to retrieve content from storage
                chunks.push(`[Chunk from ${key}]`);
            }
        }

        return chunks.join('\n');
    }

    /**
     * Update file in memory after patch
     */
    async updateFile(filePath: string): Promise<void> {
        // Remove old cache entries
        for (const key of this.cache.keys()) {
            if (key.startsWith(filePath)) {
                this.cache.delete(key);
            }
        }

        // Re-index would happen when file is accessed again
        console.error(`[CodingMemory] Cache invalidado para ${filePath}`);
    }

    /**
     * Index file with specific provider (for cloud mode)
     */
    async indexFileWithProvider(
        file: { path: string; content: string; language: string },
        provider: string
    ): Promise<void> {
        console.error(`[CodingMemory] Indexando ${file.path} via ${provider}`);
        await this.indexFile(file.path, file.content);
    }

    // ============ PRIVATE METHODS ============

    private chunkContent(content: string, filePath: string): Array<{ content: string; metadata: any }> {
        const lines = content.split('\n');
        const chunks: Array<{ content: string; metadata: any }> = [];

        let currentChunk = '';
        let lineStart = 0;

        for (let i = 0; i < lines.length; i++) {
            currentChunk += lines[i] + '\n';

            // Approximate token count (1 token ≈ 4 chars)
            const estimatedTokens = currentChunk.length / 4;

            if (estimatedTokens >= this.CHUNK_SIZE) {
                chunks.push({
                    content: currentChunk.trim(),
                    metadata: {
                        language: this.detectLanguage(filePath),
                        functions: this.extractFunctions(currentChunk),
                        imports: this.extractImports(currentChunk),
                        lineStart: lineStart,
                        lineEnd: i,
                        hash: this.hashContent(currentChunk)
                    }
                });

                // Start new chunk with overlap
                const overlapLines = Math.ceil(this.OVERLAP / 4 / 40); // ~40 chars per line
                currentChunk = lines.slice(Math.max(0, i - overlapLines), i + 1).join('\n');
                lineStart = i - overlapLines;
            }
        }

        // Add remaining content
        if (currentChunk.trim()) {
            chunks.push({
                content: currentChunk.trim(),
                metadata: {
                    language: this.detectLanguage(filePath),
                    functions: this.extractFunctions(currentChunk),
                    imports: this.extractImports(currentChunk),
                    lineStart: lineStart,
                    lineEnd: lines.length - 1,
                    hash: this.hashContent(currentChunk)
                }
            });
        }

        return chunks;
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private hashContent(content: string): string {
        return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
    }

    private detectLanguage(filePath: string): string {
        const ext = filePath.split('.').pop()?.toLowerCase();
        const map: Record<string, string> = {
            'ts': 'typescript', 'tsx': 'typescript',
            'js': 'javascript', 'jsx': 'javascript',
            'py': 'python', 'java': 'java',
            'go': 'go', 'rs': 'rust', 'php': 'php'
        };
        return map[ext || ''] || 'unknown';
    }

    private extractFunctions(content: string): string[] {
        const patterns = [
            /function\s+(\w+)/g,           // function name()
            /(\w+)\s*:\s*\([^)]*\)\s*=>/g, // name: () =>
            /const\s+(\w+)\s*=\s*\(/g,     // const name = (
            /async\s+(\w+)\s*\(/g,         // async name(
            /def\s+(\w+)\s*\(/g,           // Python def
        ];

        const functions: string[] = [];
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                if (match[1] && !functions.includes(match[1])) {
                    functions.push(match[1]);
                }
            }
        }
        return functions;
    }

    private extractImports(content: string): string[] {
        const patterns = [
            /import\s+.*\s+from\s+['"]([^'"]+)['"]/g,
            /import\s+['"]([^'"]+)['"]/g,
            /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
            /from\s+(\w+)\s+import/g, // Python
        ];

        const imports: string[] = [];
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                if (match[1] && !imports.includes(match[1])) {
                    imports.push(match[1]);
                }
            }
        }
        return imports;
    }

    // Legacy static methods for backwards compatibility
    static async storeEmbedding(filePath: string, content: string): Promise<boolean> {
        const instance = new CodingMemory();
        try {
            await instance.indexFile(filePath, content);
            return true;
        } catch {
            return false;
        }
    }

    static async retrieveContext(query: string): Promise<string[]> {
        const instance = new CodingMemory();
        const result = await instance.query({ query, maxResults: 3 });
        return result.chunks.map(c => c.content);
    }
}

export default CodingMemory;
