import type { RepoFileInfo, Module } from "./types";

const STRUCTURE_PATTERNS: Array<{ type: Module["type"]; patterns: RegExp[] }> = [
  { type: "api", patterns: [/\/api\//, /\/routes\//, /\/controllers\//, /\/endpoints\//, /\/handlers\//] },
  { type: "service", patterns: [/\/services\//, /\/service\//, /\/domain\//, /\/usecases\//, /\/use-?cases\//] },
  { type: "worker", patterns: [/\/workers\//, /\/jobs\//, /\/consumers\//, /\/processors\//, /\/queue\//] },
  { type: "job", patterns: [/\/cron\//, /\/schedulers\//, /\/tasks\//, /\/scripts\//] },
  { type: "controller", patterns: [/\/controllers\//, /controller\./] },
  { type: "model", patterns: [/\/models\//, /\/entities\//, /\/schemas\//, /\/types\//, /\/dto\//, /\/interfaces\//] },
  { type: "repository", patterns: [/\/repositories\//, /\/repository\//, /\/dao\//, /\/database\//, /\/db\//] },
  { type: "middleware", patterns: [/\/middleware\//, /\/guards\//, /\/interceptors\//, /\/filters\//] },
  { type: "config", patterns: [/\/config\//, /\/configure\//, /\/settings\//, /\/env\//, /\.config\./, /\.env/] },
  { type: "test", patterns: [/\/test\//, /\/tests\//, /\/__tests__\//, /\/spec\//, /\/__mocks__\//, /\.test\./, /\.spec\./] },
  { type: "agent", patterns: [/\/agents\//, /\/agent\//, /\/ai\//, /\/llm\//, /\/reasoning\//, /\/orchestrat\//, /\/crew\//] },
];

const AI_PROVIDER_PATTERNS: RegExp[] = [
  /openai/i, /anthropic/i, /claude/i, /deepseek/i, /groq/i, /cohere/i,
  /mistral/i, /google.*ai/i, /vertex.*ai/i, /bedrock/i, /azure.*openai/i,
  /together.*ai/i, /perplexity/i, /openrouter/i, /ollama/i,
];

const DB_PATTERNS: RegExp[] = [
  /postgres|postgresql|pg\b/i, /mysql|mariadb/i, /mongodb|mongo/i,
  /sqlite/i, /redis/i, /dynamodb/i, /cassandra/i, /neo4j/i,
  /supabase/i, /firebase|firestore/i, /cockroach/i, /planetscale/i,
  /prisma/i, /drizzle/i, /typeorm/i, /sequelize/i, /knex/i,
];

const MQ_PATTERNS: RegExp[] = [
  /kafka/i, /rabbitmq|amqp/i, /redis.*queue|bull/i, /sqs/i, /sns/i,
  /pubsub/i, /nats/i, /pulsar/i, /zeromq/i, /celery/i,
];

const STORAGE_PATTERNS: RegExp[] = [
  /s3\b|minio/i, /blob.*storage/i, /cloud.*storage/i, /google.*storage/i,
  /cdn/i, /cloudfront/i, /cloudflare.*r2/i,
];

const HTTP_PATTERNS: RegExp[] = [
  /axios/i, /fetch/i, /got\b/i, /superagent/i, /request\b/i,
  /graphql/i, /apollo/i, /swr/i, /react.*query|tanstack.*query/i,
  /trpc/i, /grpc/i,
];

export function analyseStructure(files: RepoFileInfo[]): {
  modules: Module[];
  projectTypes: Set<string>;
  entrypointCandidates: string[];
} {
  const modules: Module[] = [];

  const groupedByDir = new Map<string, RepoFileInfo[]>();
  for (const file of files) {
    const dir = file.dir || "root";
    if (!groupedByDir.has(dir)) groupedByDir.set(dir, []);
    groupedByDir.get(dir)!.push(file);
  }

  for (const [dir, dirFiles] of groupedByDir) {
    if (dirFiles.length < 2 ) continue;

    let bestType: Module["type"] = "other";
    let bestScore = 0;
    for (const { type, patterns } of STRUCTURE_PATTERNS) {
      const score = dirFiles.filter((f) => patterns.some((p) => p.test(f.path))).length;
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    modules.push({
      name: dir === "root" ? "root" : dir.split("/").pop()!,
      path: dir,
      type: bestType,
      symbols: dirFiles.map((f) => f.name),
    });
  }

  const projectTypes = new Set(modules.map((m) => m.type));

  const entrypointCandidates = files
    .filter((f) => /main\.[jt]sx?$|index\.[jt]sx?$|server\.[jt]sx?$|app\.[jt]sx?$|manage\.py$|Program\.cs$|main\.go$|main\.rs$|__init__\.py$/i.test(f.name))
    .map((f) => f.path);

  return { modules, projectTypes, entrypointCandidates };
}

export function extractDependencies(files: RepoFileInfo[], projectTypes: Set<string>): Array<{
  name: string;
  type: "ai_provider" | "database" | "message_queue" | "storage" | "http_client" | "external" | "internal";
  provider?: string;
}> {
  const deps = new Map<string, { type: string; provider?: string }>();

  for (const file of files) {
    if (AI_PROVIDER_PATTERNS.some((p) => p.test(file.name))) {
      deps.set(file.name.replace(/\.[^.]+$/, ""), { type: "ai_provider" });
    }
    if (DB_PATTERNS.some((p) => p.test(file.name))) {
      deps.set(file.name.replace(/\.[^.]+$/, ""), { type: "database" });
    }
    if (MQ_PATTERNS.some((p) => p.test(file.name))) {
      deps.set(file.name.replace(/\.[^.]+$/, ""), { type: "message_queue" });
    }
    if (STORAGE_PATTERNS.some((p) => p.test(file.name))) {
      deps.set(file.name.replace(/\.[^.]+$/, ""), { type: "storage" });
    }
    if (HTTP_PATTERNS.some((p) => p.test(file.name))) {
      deps.set(file.name.replace(/\.[^.]+$/, ""), { type: "http_client" });
    }
  }

  const hasAI = projectTypes.has("agent") || deps.size > 0;
  return Array.from(deps.entries()).map(([name, info]) => ({
    name,
    type: info.type as "ai_provider" | "database" | "message_queue" | "storage" | "http_client" | "external" | "internal",
    provider: info.provider,
  }));
}