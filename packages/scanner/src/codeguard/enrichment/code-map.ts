export interface FunctionInfo {
  name: string;
  isAsync: boolean;
  isExported: boolean;
  startLine: number;
  endLine: number;
  calls: string[];
  paramCount: number;
}

export interface ClassInfo {
  name: string;
  isExported: boolean;
  methods: string[];
  startLine: number;
}

export interface ImportInfo {
  symbol: string;
  source: string;
  isDefault: boolean;
  isNamespace: boolean;
  isRelative: boolean;
}

export interface ExportInfo {
  name: string;
  type: "function" | "class" | "const" | "type" | "interface" | "enum";
  isDefault: boolean;
}

export interface CodeMapResult {
  agentCodeLocations: string[];
  functions: string[];
  classes: string[];
  exports: string[];
  imports: string[];
  dependencies: string[];
  functionCallGraph: Record<string, string[]>;
  language: string;
  functionCount: number;
  classCount: number;
  exportCount: number;
  importCount: number;
}

const EXT_TO_LANG: Record<string, string> = {
  ".ts": "ts", ".tsx": "tsx", ".js": "js", ".jsx": "jsx",
  ".py": "py", ".go": "go", ".rs": "rs", ".java": "java",
  ".cs": "cs", ".rb": "rb", ".php": "php",
};

function extractFunctionInfo(content: string, lang: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const lines = content.split("\n");

  const functionRegex: Record<string, RegExp> = {
    ts: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
    tsx: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
    js: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
    jsx: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
    py: /def\s+(\w+)\s*\(([^)]*)\)/,
    go: /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(([^)]*)\)/,
    rs: /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*[<(]/,
  };

  const arrowRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/;

  const closingChars: Record<string, string> = { ts: "}", tsx: "}", js: "}", jsx: "}", py: "", go: "}", rs: "}" };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const fnMatch = line.match(functionRegex[lang] ?? functionRegex.ts);
    if (fnMatch) {
      const name = fnMatch[1];
      const params = fnMatch[2] ?? "";
      const isAsync = /async\s/.test(line);
      const isExported = /export\s/.test(line);
      const startLine = i + 1;

      let endLine = startLine;
      if (closingChars[lang]) {
        let depth = 0;
        let foundOpen = false;
        for (let j = i; j < lines.length; j++) {
          for (const ch of lines[j]) {
            if (ch === "{") { depth++; foundOpen = true; }
            if (ch === "}") { depth--; }
          }
          if (foundOpen && depth === 0) {
            endLine = j + 1;
            break;
          }
        }
      } else {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].match(/^\s*(def |class |@|\S)/) && !lines[j].match(/^\s+/)) {
            endLine = j;
            break;
          }
        }
        if (endLine === startLine) endLine = Math.min(lines.length, startLine + 50);
      }

      const body = lines.slice(i, endLine).join("\n");
      const calls = extractCallsFromFunctionBody(body, name, lang);

      functions.push({ name, isAsync, isExported, startLine, endLine, calls, paramCount: params.split(",").filter(p => p.trim()).length });
    }

    if (lang === "ts" || lang === "tsx" || lang === "js" || lang === "jsx") {
      const arrowMatch = line.match(arrowRegex);
      if (arrowMatch) {
        const name = arrowMatch[1];
        const isAsync = /async\s/.test(line);
        const isExported = /export\s/.test(line);

        const startLine = i + 1;
        let endLine = startLine;
        let depth = 0;
        let foundOpen = false;
        for (let j = i; j < lines.length; j++) {
          for (let ch of lines[j]) {
            if (ch === "{") { depth++; foundOpen = true; }
            if (ch === "}") { depth--; }
          }
          if (foundOpen && depth === 0) {
            endLine = j + 1;
            break;
          }
        }

        const body = lines.slice(i, endLine).join("\n");
        const calls = extractCallsFromFunctionBody(body, name, lang);

        functions.push({ name, isAsync, isExported, startLine, endLine, calls, paramCount: arrowMatch[2]?.split(",").filter(p => p.trim()).length ?? 0 });
      }
    }
  }

  return functions;
}

function extractCallsFromFunctionBody(body: string, ownName: string, lang: string): string[] {
  const calls: string[] = [];

  const callPatterns: RegExp[] = [
    /\b(\w+)\s*\(/g,
    /\.\s*(\w+)\s*\(/g,
  ];

  if (lang === "py") {
    callPatterns.push(/\b(\w+)\.(?:\w+)\s*\(/g);
  }

  for (const pattern of callPatterns) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((match = re.exec(body)) !== null) {
      const fn = match[1];
      if (fn && fn !== ownName && fn.length > 1 && !isKeyword(fn) && calls.indexOf(fn) === -1) {
        calls.push(fn);
      }
    }
  }

  return calls.slice(0, 30);
}

function isKeyword(name: string): boolean {
  const keywords = new Set([
    "if", "else", "for", "while", "switch", "case", "return", "throw",
    "try", "catch", "finally", "new", "class", "function", "const", "let",
    "var", "import", "export", "default", "async", "await", "yield",
    "typeof", "instanceof", "delete", "void", "this", "super", "extends",
    "true", "false", "null", "undefined", "console", "log", "error", "warn",
    "print", "len", "str", "int", "float", "bool", "def", "elif", "lambda",
    "nil", "fmt", "err", "func", "struct", "interface", "go", "defer",
  ]);
  return keywords.has(name);
}

function extractClassInfo(content: string, lang: string): ClassInfo[] {
  const classes: ClassInfo[] = [];
  const lines = content.split("\n");

  const classRegex: Record<string, RegExp> = {
    ts: /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/,
    tsx: /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/,
    js: /(?:export\s+)?class\s+(\w+)/,
    jsx: /(?:export\s+)?class\s+(\w+)/,
    py: /class\s+(\w+)/,
    go: /type\s+(\w+)\s+struct/,
    rs: /(?:pub\s+)?struct\s+(\w+)/,
    java: /(?:public\s+)?(?:abstract\s+)?class\s+(\w+)/,
    cs: /(?:public\s+)?(?:abstract\s+)?class\s+(\w+)/,
  };

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(classRegex[lang] ?? classRegex.ts);
    if (!match) continue;

    const name = match[1];
    const isExported = /export\s/.test(lines[i]) || /public\s/.test(lines[i]);

    let depth = 0;
    let foundOpen = false;
    let endLine = i + 1;
    for (let j = i; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === "{") { depth++; foundOpen = true; }
        if (ch === "}") depth--;
      }
      if (foundOpen && depth === 0) { endLine = j + 1; break; }
    }

    const body = lines.slice(i, endLine).join("\n");
    const methods: string[] = [];

    const methodRegex = /(?:public|private|protected|static)?\s*(?:async\s+)?(\w+)\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = methodRegex.exec(body)) !== null) {
      if (m[1] && !isKeyword(m[1]) && m[1] !== name) methods.push(m[1]);
    }

    classes.push({ name, isExported, methods: methods.filter((v, i, a) => a.indexOf(v) === i).slice(0, 20), startLine: i + 1 });
  }

  return classes;
}

function extractImportInfo(content: string, lang: string): ImportInfo[] {
  const imports: ImportInfo[] = [];

  const patterns: Array<{ regex: RegExp; extract: (m: RegExpExecArray) => ImportInfo | null }> = [
    {
      regex: /import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["']/g,
      extract: (m) => {
        const names = m[1].split(",").map(s => s.trim().split(/\s+as\s+/)[0]);
        const source = m[2];
        return names.filter(n => n).map(name => ({
          symbol: name, source, isDefault: false, isNamespace: false,
          isRelative: source.startsWith(".") || source.startsWith("/"),
        }))[0];
      },
    },
    {
      regex: /import\s+(\w+)\s+from\s+["']([^"']+)["']/g,
      extract: (m) => ({
        symbol: m[1], source: m[2], isDefault: true, isNamespace: false,
        isRelative: m[2].startsWith(".") || m[2].startsWith("/"),
      }),
    },
    {
      regex: /import\s+\*\s+as\s+(\w+)\s+from\s+["']([^"']+)["']/g,
      extract: (m) => ({
        symbol: m[1], source: m[2], isDefault: false, isNamespace: true,
        isRelative: m[2].startsWith(".") || m[2].startsWith("/"),
      }),
    },
    {
      regex: /const\s+\{([^}]+)\}\s*=\s*require\s*\(\s*["']([^"']+)["']\s*\)/g,
      extract: (m) => {
        const name = m[1].split(",")[0].trim();
        return {
          symbol: name, source: m[2], isDefault: false, isNamespace: false,
          isRelative: m[2].startsWith(".") || m[2].startsWith("/"),
        };
      },
    },
    {
      regex: /from\s+(\S+)\s+import\s+(\w+)/g,
      extract: (m) => ({
        symbol: m[2], source: m[1], isDefault: false, isNamespace: false,
        isRelative: m[1].startsWith(".") || m[1].startsWith("/"),
      }),
    },
  ];

  for (const { regex, extract } of patterns) {
    const re = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      const info = extract(match);
      if (info && info.symbol.length > 1) imports.push(info);
    }
  }

  return imports;
}

function extractExportInfo(content: string, lang: string): ExportInfo[] {
  const exports: ExportInfo[] = [];

  const patterns: Array<{ regex: RegExp; type: ExportInfo["type"]; isDefault: boolean }> = [
    { regex: /export\s+(?:async\s+)?function\s+(\w+)/g, type: "function", isDefault: false },
    { regex: /export\s+default\s+(?:async\s+)?function\s+(\w+)/g, type: "function", isDefault: true },
    { regex: /export\s+(?:abstract\s+)?class\s+(\w+)/g, type: "class", isDefault: false },
    { regex: /export\s+default\s+class\s+(\w+)/g, type: "class", isDefault: true },
    { regex: /export\s+(?:const|let|var)\s+(\w+)/g, type: "const", isDefault: false },
    { regex: /export\s+default\s+\w+\s*=?\s*(\w+)/g, type: "const", isDefault: true },
    { regex: /export\s+interface\s+(\w+)/g, type: "interface", isDefault: false },
    { regex: /export\s+type\s+(\w+)/g, type: "type", isDefault: false },
    { regex: /export\s+enum\s+(\w+)/g, type: "enum", isDefault: false },
  ];

  for (const { regex, type, isDefault } of patterns) {
    const re = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      if (match[1] && match[1].length > 1) {
        exports.push({ name: match[1], type, isDefault });
      }
    }
  }

  return exports;
}

export function extractCodeMap(filePath: string, content: string): CodeMapResult {
  const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
  const lang = EXT_TO_LANG[ext] ?? "ts";

  const functionInfos = extractFunctionInfo(content, lang);
  const classInfos = extractClassInfo(content, lang);
  const importInfos = extractImportInfo(content, lang);
  const exportInfos = extractExportInfo(content, lang);

  const functionCallGraph: Record<string, string[]> = {};
  for (const fn of functionInfos) {
    if (fn.calls.length > 0) {
      functionCallGraph[fn.name] = fn.calls;
    }
  }

  const agentCodeLocations = functionInfos
    .filter(f => /agent|agentic|orchestrat|crew|workflow|handler|controller|service|usecase/i.test(f.name))
    .map(f => f.name)
    .slice(0, 10);

  const functions = functionInfos.map(f => f.name);
  const classes = classInfos.map(c => c.name);
  const exports = exportInfos.map(e => e.name);
  const imports = importInfos.map(i => i.source.startsWith(".") ? i.source : i.source.split("/").slice(0, 2).join("/"));
  const dependencies = importInfos.filter(i => !i.isRelative).map(i => i.source.split("/")[0]).filter((v, i, a) => a.indexOf(v) === i);

  return {
    agentCodeLocations,
    functions,
    classes,
    exports,
    imports,
    dependencies,
    functionCallGraph,
    language: lang,
    functionCount: functions.length,
    classCount: classes.length,
    exportCount: exports.length,
    importCount: imports.length,
  };
}
