import type { MemorySystem } from './types';

interface MemoryPattern {
  type: MemorySystem['type'];
  technology: string;
  imports: RegExp[];
  patterns: RegExp[];
}

const MEMORY_PATTERNS: MemoryPattern[] = [
  {
    type: 'vector_store', technology: 'ChromaDB',
    imports: [/from\s+['"]chromadb\b/i, /import\s+chromadb\b/i, /require\(['"]chromadb\b/i],
    patterns: [/\bchromadb\b/, /\bchroma_client\b/, /\bCollection\b/, /\.add\(/, /similarity_search/],
  },
  {
    type: 'vector_store', technology: 'Pinecone',
    imports: [/from\s+['"]pinecone\b/i, /import\s+pinecone\b/i, /require\(['"]@?pinecone/i],
    patterns: [/\bpinecone\b/, /\bPinecone\b/, /\bIndex\b/, /\bupsert\b/, /\bquery\b/],
  },
  {
    type: 'vector_store', technology: 'FAISS',
    imports: [/from\s+['"]faiss\b/i, /import\s+faiss\b/i],
    patterns: [/\bfaiss\b/, /\bIndexFlatL2\b/, /\bIndexIDMap\b/, /\bsimilarity_search\b/],
  },
  {
    type: 'vector_store', technology: 'Weaviate',
    imports: [/from\s+['"]weaviate\b/i, /import\s+weaviate\b/i],
    patterns: [/\bweaviate\b/, /\bWeaviateClient\b/, /\bclient\.query\b/],
  },
  {
    type: 'vector_store', technology: 'Qdrant',
    imports: [/from\s+['"]qdrant\b/i, /import\s+qdrant\b/i, /from\s+['"]qdrant_client/i],
    patterns: [/\bqdrant\b/, /\bQdrantClient\b/, /\bcollection_info\b/, /\bsearch\b/],
  },
  {
    type: 'vector_store', technology: 'Milvus',
    imports: [/from\s+['"]milvus\b/i, /from\s+['"]pymilvus\b/i],
    patterns: [/\bmilvus\b/, /\bCollection\b/, /\binsert\b/, /\bsearch\b/],
  },
  {
    type: 'long_term', technology: 'Redis',
    imports: [/from\s+['"]redis\b/i, /import\s+redis\b/i, /require\(['"]redis\b/i, /from\s+['"]ioredis\b/i],
    patterns: [/\bredis\b/, /\bioredis\b/, /\bRedisClient\b/, /\bLRU\b/, /\bcache\b/],
  },
  {
    type: 'long_term', technology: 'SQLite',
    imports: [/import\s+sqlite3\b/i, /from\s+['"]sqlite3\b/i],
    patterns: [/\bsqlite3\b/, /\bsqlite\b/, /\bexecute\(/, /\bfetchall\b/],
  },
  {
    type: 'long_term', technology: 'PostgreSQL',
    imports: [/from\s+['"]psycopg2\b/i, /from\s+['"]asyncpg\b/i, /from\s+['"]pg\b/i],
    patterns: [/\bpostgresql\b/, /\bpostgres\b/, /\bconnection\.execute\b/],
  },
  {
    type: 'session', technology: 'Conversation Buffer',
    imports: [],
    patterns: [/\bConversationBufferMemory\b/, /\bconversation_history\b/, /\bchat_history\b/, /\bMessageHistory\b/],
  },
  {
    type: 'session', technology: 'Session Store',
    imports: [],
    patterns: [/\bsession_state\b/, /\bsession_data\b/, /\bSessionManager\b/, /\bchat\.history\b/],
  },
  {
    type: 'semantic', technology: 'Semantic Memory',
    imports: [],
    patterns: [/\bsemantic_memory\b/, /\bsemantic_search\b/, /\bSemanticSimilarity\b/, /\bmeaning\b/],
  },
  {
    type: 'knowledge', technology: 'Neo4j/Knowledge Graph',
    imports: [/from\s+['"]neo4j\b/i, /import\s+neo4j\b/i],
    patterns: [/\bneo4j\b/, /\bGraphDatabase\b/, /\bknowledge_graph\b/, /\bkg\./i, /\bgraph\.run\b/],
  },
  {
    type: 'knowledge', technology: 'Knowledge Base',
    imports: [],
    patterns: [/\bknowledge_base\b/, /\bdocument_store\b/, /\bVectorStore\b/, /\bfrom_documents\b/],
  },
  {
    type: 'agent', technology: 'Agent Memory',
    imports: [],
    patterns: [/\bagent_memory\b/, /\bagent_state\b/, /\bAgentMemory\b/, /\bcontext\.store\b/, /\bstate_manager\b/],
  },
];

export function detectMemorySystems(code: string): MemorySystem[] {
  const found: MemorySystem[] = [];
  const seen = new Set<string>();

  for (const mp of MEMORY_PATTERNS) {
    let matched = false;
    for (const imp of mp.imports) {
      if (imp.test(code)) { matched = true; break; }
    }
    if (!matched) {
      for (const pat of mp.patterns) {
        if (pat.test(code)) { matched = true; break; }
      }
    }
    if (matched) {
      const key = `${mp.technology}:${mp.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        found.push({
          type: mp.type,
          technology: mp.technology,
          evidence: `Detected via imports/patterns in code`,
          governed: false,
        });
      }
    }
  }

  return found;
}

export function detectMemorySystemsFromDeps(deps: string[]): MemorySystem[] {
  const depMap: Record<string, { type: MemorySystem['type']; technology: string }> = {
    'redis': { type: 'long_term', technology: 'Redis' },
    'ioredis': { type: 'long_term', technology: 'Redis' },
    'chromadb': { type: 'vector_store', technology: 'ChromaDB' },
    '@pinecone-database/pinecone': { type: 'vector_store', technology: 'Pinecone' },
    'faiss': { type: 'vector_store', technology: 'FAISS' },
    'weaviate': { type: 'vector_store', technology: 'Weaviate' },
    'qdrant': { type: 'vector_store', technology: 'Qdrant' },
    'neo4j': { type: 'knowledge', technology: 'Neo4j' },
    'neo4j-driver': { type: 'knowledge', technology: 'Neo4j' },
    'sqlite3': { type: 'long_term', technology: 'SQLite' },
    'pg': { type: 'long_term', technology: 'PostgreSQL' },
  };

  const found: MemorySystem[] = [];
  for (const dep of deps) {
    const entry = depMap[dep];
    if (entry && !found.some(f => f.technology === entry.technology)) {
      found.push({ ...entry, evidence: `Dependency: ${dep}`, governed: false });
    }
  }
  return found;
}
