import type { RepoFileInfo } from "../repo-intelligence/types";

export interface DataFlow {
  id: string;
  source: FlowNode;
  transformation: FlowNode | null;
  sink: FlowNode;
  riskLevel: "low" | "medium" | "high" | "critical";
  confidence: number;
  evidence: string[];
  crossFile: boolean;
  crossFileChain?: string[];
}

export interface FlowNode {
  type: "source" | "transform" | "sink";
  category: string;
  filePath: string;
  lineNumber: number;
  content: string;
}

export interface CrossFileLineage {
  flows: DataFlow[];
  totalFlows: number;
  crossFileFlows: number;
  sourceCount: number;
  sinkCount: number;
  transformCount: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  summary: string;
}

const SOURCE_PATTERNS: Array<{ category: string; regex: RegExp; riskWeight: number }> = [
  { category: "cpf", regex: /\bcpf\b|\bCPF\b|\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, riskWeight: 10 },
  { category: "cnpj", regex: /\bcnpj\b|\bCNPJ\b/, riskWeight: 5 },
  { category: "email", regex: /\bemail\b|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, riskWeight: 8 },
  { category: "password", regex: /\bpassword\b|\bsenha\b|\bpasswd\b/, riskWeight: 10 },
  { category: "credit_card", regex: /\bcredit.?card\b|\bcvv\b|\bcvc\b|\bcard.?number\b/, riskWeight: 10 },
  { category: "api_key", regex: /\bapi[_-]?key\b|\bapi[_-]?secret\b/, riskWeight: 10 },
  { category: "token", regex: /\baccess[_-]?token\b|\brefresh[_-]?token\b/, riskWeight: 8 },
  { category: "phone", regex: /\bphone\b|\btelefone\b|\bcelular\b/, riskWeight: 5 },
  { category: "address", regex: /\baddress\b|\bendere[cç]o\b|\bcep\b/, riskWeight: 5 },
  { category: "health_data", regex: /\bpaciente\b|\bpatient\b|\bdiagnos[ei]s\b|\bprontu[aá]rio\b/, riskWeight: 10 },
  { category: "financial_data", regex: /\bpayment\b|\btransaction\b|\btransa[cç][aã]o\b|\baccount\b|\bconta\b/, riskWeight: 8 },
  { category: "biometric", regex: /\bbiometria\b|\bbiometric\b|\bface.?id\b/, riskWeight: 10 },
];

const TRANSFORM_PATTERNS: Array<{ category: string; regex: RegExp }> = [
  { category: "encrypt", regex: /\bencrypt\b|\bEncrypt\b|\bAES\b|\bcrypto\./i },
  { category: "hash", regex: /\bhash\b|\bHash\b|\bbcrypt\b|\bargon2\b|\bsha256\b/i },
  { category: "mask", regex: /\bmask\b|\bMask\b|\bredact\b|\bRedact\b|\bsanitize\b/i },
  { category: "tokenize", regex: /\btokenize\b|\bTokenize\b|\bpseudonymize\b/i },
  { category: "validate", regex: /\bvalidate\b|\bValidate\b|\bsanitize\b|\bescape\b/i },
  { category: "serialize", regex: /\bJSON\.stringify\b|\bjson\.dumps\b|\bMarshal\b/i },
  { category: "deserialize", regex: /\bJSON\.parse\b|\bjson\.loads\b|\bUnmarshal\b/i },
];

const SINK_PATTERNS: Array<{ category: string; regex: RegExp; riskWeight: number }> = [
  { category: "openai", regex: /\bopenai\.chat\.completions\b|\bopenai\.beta\b/, riskWeight: 10 },
  { category: "anthropic", regex: /\bclaude\.messages\.create\b|\banthropic\.messages\b/, riskWeight: 10 },
  { category: "openrouter", regex: /\bopenrouter\b/, riskWeight: 5 },
  { category: "database", regex: /\bdb\.(?:insert|update|save|create|delete)\b|\b\.execute\b|\b\.query\b/, riskWeight: 8 },
  { category: "http_client", regex: /\bfetch\s*\(|\baxios\.(?:get|post|put|delete)\b|\bhttp\.request\b/, riskWeight: 8 },
  { category: "log", regex: /\bconsole\.log\b|\bconsole\.error\b|\blogger\.(?:info|error|warn)\b/, riskWeight: 3 },
  { category: "email", regex: /\bsendEmail\b|\bmail\.send\b|\bsmtp\b|\bemail\.send\b/, riskWeight: 5 },
  { category: "queue", regex: /\b\.publish\b|\b\.emit\b|\b\.enqueue\b|\b\.push\b|\b\.send\b|\bkafka\./i, riskWeight: 5 },
  { category: "storage", regex: /\b\.upload\b|\b\.putObject\b|\b\.write\b|\bs3\.(?:put|upload)\b/i, riskWeight: 5 },
  { category: "webhook", regex: /\bwebhook\b|\bcallback\b|\bnotify\b/, riskWeight: 5 },
];

interface FileExport {
  name: string;
  filePath: string;
  line: number;
}

interface FileImport {
  names: string[];
  source: string;
  filePath: string;
  line: number;
  isRelative: boolean;
}

interface FileAnalysis {
  path: string;
  sources: Array<{ category: string; line: number; content: string; riskWeight: number }>;
  transforms: Array<{ category: string; line: number; content: string }>;
  sinks: Array<{ category: string; line: number; content: string; riskWeight: number }>;
  exports: FileExport[];
  imports: FileImport[];
  exportedFunctions: Map<string, string[]>;
}

function extractExports(content: string, filePath: string): FileExport[] {
  const exports: FileExport[] = [];
  const lines = content.split("\n");

  const patterns: Array<{ regex: RegExp; nameGroup: number }> = [
    { regex: /export\s+(?:async\s+)?function\s+(\w+)/g, nameGroup: 1 },
    { regex: /export\s+(?:const|let|var)\s+(\w+)/g, nameGroup: 1 },
    { regex: /export\s+class\s+(\w+)/g, nameGroup: 1 },
    { regex: /export\s+\{([^}]+)\}/g, nameGroup: 1 },
    { regex: /export\s+default\s+(?:function|class)\s+(\w+)/g, nameGroup: 1 },
  ];

  for (let i = 0; i < lines.length; i++) {
    for (const { regex, nameGroup } of patterns) {
      const re = new RegExp(regex.source, regex.flags);
      let match: RegExpExecArray | null;
      while ((match = re.exec(lines[i])) !== null) {
        const raw = match[nameGroup];
        if (!raw) continue;
        for (const name of raw.split(",").map(s => s.trim().split(/\s+as\s+/)[0]).filter(n => n && n.length > 1)) {
          exports.push({ name, filePath, line: i + 1 });
        }
      }
    }
  }

  if (content.match(/module\.exports\s*=/)) {
    exports.push({ name: "default", filePath, line: 0 });
  }

  return exports;
}

function extractImports(content: string, filePath: string): FileImport[] {
  const imports: FileImport[] = [];
  const lines = content.split("\n");

  const patterns: Array<{ regex: RegExp; nameGroup: number; sourceGroup: number }> = [
    { regex: /import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["']/g, nameGroup: 1, sourceGroup: 2 },
    { regex: /import\s+(\w+)\s+from\s+["']([^"']+)["']/g, nameGroup: 1, sourceGroup: 2 },
    { regex: /import\s+\*\s+as\s+(\w+)\s+from\s+["']([^"']+)["']/g, nameGroup: 1, sourceGroup: 2 },
    { regex: /const\s+\{([^}]+)\}\s*=\s*require\s*\(\s*["']([^"']+)["']\s*\)/g, nameGroup: 1, sourceGroup: 2 },
    { regex: /const\s+(\w+)\s*=\s*require\s*\(\s*["']([^"']+)["']\s*\)/g, nameGroup: 1, sourceGroup: 2 },
    { regex: /from\s+(\S+)\s+import\s+(\w+(?:\s*,\s*\w+)*)/g, nameGroup: 2, sourceGroup: 1 },
  ];

  for (let i = 0; i < lines.length; i++) {
    for (const { regex, nameGroup, sourceGroup } of patterns) {
      const re = new RegExp(regex.source, regex.flags);
      let match: RegExpExecArray | null;
      while ((match = re.exec(lines[i])) !== null) {
        const rawNames = match[nameGroup];
        const source = match[sourceGroup];
        if (!source) continue;
        const names = rawNames.split(",").map(s => s.trim().split(/\s+as\s+/)[0]).filter(n => n && n.length > 1);
        imports.push({
          names,
          source: source.replace(/["']/g, ""),
          filePath,
          line: i + 1,
          isRelative: source.startsWith(".") || source.startsWith("/"),
        });
      }
    }
  }

  return imports;
}

function resolveRelativePath(importerPath: string, importSource: string): string {
  const dir = importerPath.substring(0, importerPath.lastIndexOf("/"));
  const resolved = importSource
    .replace(/^\.\//, "")
    .replace(/^\.\.\//, "../");

  let currentDir = dir;
  const parts = resolved.split("/");
  for (const part of parts) {
    if (part === "..") {
      currentDir = currentDir.substring(0, currentDir.lastIndexOf("/"));
    } else if (part !== "." && part !== "") {
      currentDir = currentDir ? `${currentDir}/${part}` : part;
    }
  }
  return currentDir;
}

function findExportFile(
  importSource: string,
  importerPath: string,
  allFiles: string[],
  importName: string,
  exportIndex: Map<string, string[]>,
): string | null {
  if (!importSource.startsWith(".") && !importSource.startsWith("/")) {
    const exportFiles = exportIndex.get(importName);
    if (exportFiles && exportFiles.length === 1) return exportFiles[0];
    return null;
  }

  const basePath = resolveRelativePath(importerPath, importSource);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}/index.ts`,
    `${basePath}/index.tsx`,
    `${basePath}/index.js`,
  ];

  for (const candidate of candidates) {
    if (allFiles.includes(candidate)) return candidate;
    const normalized = candidate.replace(/^\.\//, "");
    if (allFiles.includes(normalized)) return normalized;
  }

  return null;
}

export function traceCrossFileLineage(
  files: RepoFileInfo[],
  fileContents: Map<string, string>,
): CrossFileLineage {
  const allFilePaths = files.map(f => f.path);
  const analyses = new Map<string, FileAnalysis>();

  const exportIndex = new Map<string, string[]>();

  for (const file of files) {
    const content = fileContents.get(file.path);
    if (!content || content.length > 500000) continue;

    const lines = content.split("\n");
    const fileSources: FileAnalysis["sources"] = [];
    const fileTransforms: FileAnalysis["transforms"] = [];
    const fileSinks: FileAnalysis["sinks"] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith("//") || line.trim().startsWith("#") || line.trim().startsWith("/*")) continue;

      for (const src of SOURCE_PATTERNS) {
        if (src.regex.test(line)) {
          fileSources.push({ category: src.category, line: i + 1, content: line.trim().slice(0, 80), riskWeight: src.riskWeight });
        }
      }
      for (const tr of TRANSFORM_PATTERNS) {
        if (tr.regex.test(line)) {
          fileTransforms.push({ category: tr.category, line: i + 1, content: line.trim().slice(0, 80) });
        }
      }
      for (const sk of SINK_PATTERNS) {
        if (sk.regex.test(line)) {
          fileSinks.push({ category: sk.category, line: i + 1, content: line.trim().slice(0, 80), riskWeight: sk.riskWeight });
        }
      }
    }

    const fileExports = extractExports(content, file.path);
    const fileImports = extractImports(content, file.path);

    for (const exp of fileExports) {
      const existing = exportIndex.get(exp.name) ?? [];
      existing.push(file.path);
      exportIndex.set(exp.name, existing);
    }

    analyses.set(file.path, {
      path: file.path,
      sources: fileSources,
      transforms: fileTransforms,
      sinks: fileSinks,
      exports: fileExports,
      imports: fileImports,
      exportedFunctions: new Map(),
    });
  }

  const dependencyGraph = new Map<string, Set<string>>();
  for (const [path, analysis] of analyses) {
    const deps = new Set<string>();
    for (const imp of analysis.imports) {
      for (const name of imp.names) {
        const exportFile = findExportFile(imp.source, path, allFilePaths, name, exportIndex);
        if (exportFile && exportFile !== path) {
          deps.add(exportFile);
        }
      }
      if (imp.isRelative) {
        const resolved = findExportFile(imp.source, path, allFilePaths, "", new Map());
        if (resolved && resolved !== path) {
          deps.add(resolved);
        }
      }
    }
    dependencyGraph.set(path, deps);
  }

  const flows: DataFlow[] = [];
  const allSources = new Set<string>();
  const allSinks = new Set<string>();
  const allTransforms = new Set<string>();
  let flowId = 0;

  for (const [path, analysis] of analyses) {
    if (analysis.sources.length === 0) continue;

    const fileSources = analysis.sources;
    const fileSinks = analysis.sinks;
    const fileTransforms = analysis.transforms;

    if (fileSinks.length > 0) {
      for (const source of fileSources) {
        for (const sink of fileSinks) {
          const transform = fileTransforms.length > 0 ? fileTransforms[0] : null;
          const totalRisk = source.riskWeight + sink.riskWeight;
          let riskLevel: DataFlow["riskLevel"] = "low";
          if (totalRisk >= 18) riskLevel = "critical";
          else if (totalRisk >= 14) riskLevel = "high";
          else if (totalRisk >= 10) riskLevel = "medium";

          flows.push({
            id: `flow_${flowId++}`,
            source: { type: "source", category: source.category, filePath: path, lineNumber: source.line, content: source.content },
            transformation: transform ? { type: "transform", category: transform.category, filePath: path, lineNumber: transform.line, content: transform.content } : null,
            sink: { type: "sink", category: sink.category, filePath: path, lineNumber: sink.line, content: sink.content },
            riskLevel,
            confidence: 70,
            crossFile: false,
            evidence: [
              `Source: ${source.category} at ${path}:${source.line}`,
              ...(transform ? [`Transform: ${transform.category} at ${path}:${transform.line}`] : []),
              `Sink: ${sink.category} at ${path}:${sink.line}`,
            ],
          });
          allSources.add(source.category);
          allSinks.add(sink.category);
          if (transform) allTransforms.add(transform.category);
        }
      }
    }

    const dependents = [...analyses.keys()].filter(p => {
      const deps = dependencyGraph.get(p);
      return deps && deps.has(path);
    });

    for (const depPath of dependents) {
      const depAnalysis = analyses.get(depPath);
      if (!depAnalysis) continue;

      for (const depSink of depAnalysis.sinks) {
        for (const source of fileSources) {
          const totalRisk = source.riskWeight + depSink.riskWeight;
          let riskLevel: DataFlow["riskLevel"] = "low";
          if (totalRisk >= 18) riskLevel = "critical";
          else if (totalRisk >= 14) riskLevel = "high";
          else if (totalRisk >= 10) riskLevel = "medium";

          const chain = [path, depPath];
          flows.push({
            id: `flow_${flowId++}`,
            source: { type: "source", category: source.category, filePath: path, lineNumber: source.line, content: source.content },
            transformation: null,
            sink: { type: "sink", category: depSink.category, filePath: depPath, lineNumber: depSink.line, content: depSink.content },
            riskLevel,
            confidence: 75,
            crossFile: true,
            crossFileChain: chain,
            evidence: [
              `Source: ${source.category} at ${path}:${source.line}`,
              `Exported from ${path} → imported by ${depPath}`,
              `Sink: ${depSink.category} at ${depPath}:${depSink.line}`,
              `Cross-file chain: ${chain.join(" → ")}`,
            ],
          });
          allSources.add(source.category);
          allSinks.add(depSink.category);
        }
      }
    }
  }

  const crossFileFlows = flows.filter(f => f.crossFile);

  let overallRisk: CrossFileLineage["riskLevel"] = "low";
  const criticalCount = flows.filter(f => f.riskLevel === "critical").length;
  const highCount = flows.filter(f => f.riskLevel === "high").length;
  if (criticalCount >= 3) overallRisk = "critical";
  else if (criticalCount >= 1 || highCount >= 3) overallRisk = "high";
  else if (highCount >= 1 || flows.length >= 5) overallRisk = "medium";

  const summary = flows.length > 0
    ? `${flows.length} data flows detected: ${allSources.size} source types → ${allTransforms.size} transformations → ${allSinks.size} sink types. ${crossFileFlows.length} cross-file flows via resolved import→export chains. Risk: ${overallRisk}.`
    : "No data flows detected.";

  return {
    flows,
    totalFlows: flows.length,
    crossFileFlows: crossFileFlows.length,
    sourceCount: allSources.size,
    sinkCount: allSinks.size,
    transformCount: allTransforms.size,
    riskLevel: overallRisk,
    summary,
  };
}
