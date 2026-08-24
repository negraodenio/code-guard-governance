import type { PackageAnalysis, ConfigAnalysis, SourceAnalysis, ApiRoute, ServiceEndpoint, AIModel, DataAssetDetected, NotebookAnalysis, RepoClassification, DetectedAgent } from './types';
import { parseNotebook } from './notebook-parser';
import { detectFrameworks, detectFrameworksFromFileTree } from './framework-detector';
import { detectMemorySystems } from './memory-detector';
import { detectAgentFrameworks, buildAgentsFromFrameworkMatches } from './agent-detector';
import { scanModelIds, estimateModelCost } from './model-parser';

export function aggregatePackages(root: PackageAnalysis, subs: PackageAnalysis[]): PackageAnalysis {
  const allDeps = { ...root.dependencies };
  const allDevDeps = { ...root.devDependencies };
  const allAi = new Set(root.aiDependencies);
  const allDb = new Set(root.dbDependencies);
  const allAuth = new Set(root.authDependencies);
  const allPayment = new Set(root.paymentDependencies);
  const allCloud = new Set(root.cloudDependencies);

  for (const s of subs) {
    Object.assign(allDeps, s.dependencies);
    Object.assign(allDevDeps, s.devDependencies);
    for (const d of s.aiDependencies) allAi.add(d);
    for (const d of s.dbDependencies) allDb.add(d);
    for (const d of s.authDependencies) allAuth.add(d);
    for (const d of s.paymentDependencies) allPayment.add(d);
    for (const d of s.cloudDependencies) allCloud.add(d);
  }

  return {
    ...root,
    dependencies: allDeps,
    devDependencies: allDevDeps,
    aiDependencies: Array.from(allAi),
    dbDependencies: Array.from(allDb),
    authDependencies: Array.from(allAuth),
    paymentDependencies: Array.from(allPayment),
    cloudDependencies: Array.from(allCloud),
    hasTestFramework: root.hasTestFramework || subs.some(s => s.hasTestFramework),
    testFramework: root.testFramework ?? subs.find(s => s.testFramework)?.testFramework ?? null,
    hasLinter: root.hasLinter || subs.some(s => s.hasLinter),
  };
}

export function analyzePackageJson(content: string | null): PackageAnalysis {
  const empty: PackageAnalysis = {
    name: '', version: '', scripts: {}, dependencies: {}, devDependencies: {},
    hasTestFramework: false, testFramework: null, hasLinter: false,
    packageManager: 'unknown', aiDependencies: [], dbDependencies: [],
    authDependencies: [], paymentDependencies: [], cloudDependencies: [],
  };
  if (!content) return empty;

  let pkg: any;
  try { pkg = JSON.parse(content); } catch { return empty; }

  const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
  const depNames = Object.keys(deps);

  const AI_PROVIDERS = ['openai', 'anthropic', 'mistral', 'cohere', 'google-ai', 'huggingface', 'langchain', 'llamaindex', 'ai', '@langchain'];
  const DB_PROVIDERS = ['@supabase', 'pg', 'prisma', 'drizzle', 'typeorm', 'mongodb', 'redis', 'ioredis', '@upstash', 'firebase'];
  const AUTH_PROVIDERS = ['@supabase', 'next-auth', '@auth', 'clerk', 'auth0', 'firebase-auth', 'passport', 'lucia'];
  const PAYMENT_PROVIDERS = ['stripe', '@stripe', 'paddle', 'lemonsqueezy', 'chargebee', 'recurly'];
  const CLOUD_PROVIDERS = ['@aws', '@google-cloud', '@azure', 'aws-sdk', 'vercel'];

  return {
    name: pkg.name ?? '',
    version: pkg.version ?? '',
    scripts: pkg.scripts ?? {},
    dependencies: pkg.dependencies ?? {},
    devDependencies: pkg.devDependencies ?? {},
    hasTestFramework: depNames.some(d => /^(jest|vitest|mocha|ava|tap|jasmine|playwright|cypress)/.test(d)),
    testFramework: depNames.find(d => /^(jest|vitest|mocha|ava|tap|jasmine|playwright|cypress)/.test(d)) ?? null,
    hasLinter: depNames.some(d => /^eslint|^tslint|^prettier/.test(d)),
    packageManager: detectPackageManager(content),
    aiDependencies: depNames.filter(d => AI_PROVIDERS.some(p => d.startsWith(p))),
    dbDependencies: depNames.filter(d => DB_PROVIDERS.some(p => d.startsWith(p))),
    authDependencies: depNames.filter(d => AUTH_PROVIDERS.some(p => d.startsWith(p))),
    paymentDependencies: depNames.filter(d => PAYMENT_PROVIDERS.some(p => d.startsWith(p))),
    cloudDependencies: depNames.filter(d => CLOUD_PROVIDERS.some(p => d.startsWith(p))),
  };
}

function detectPackageManager(content: string): 'npm' | 'yarn' | 'pnpm' | 'unknown' {
  if (content.includes('"packageManager": "pnpm')) return 'pnpm';
  if (content.includes('"packageManager": "yarn')) return 'yarn';
  return 'npm';
}

export function analyzeConfigs(packageJson: string | null, allFiles: string[], tsconfigContent: string | null, eslintContent: string | null): ConfigAnalysis {
  return {
    hasEnvExample: allFiles.some(f => f === '.env.example' || f === '.env.sample'),
    hasLicense: allFiles.some(f => f.toLowerCase().startsWith('license')),
    hasReadme: allFiles.some(f => f.toLowerCase() === 'readme.md'),
    hasContributing: allFiles.some(f => f.toLowerCase() === 'contributing.md'),
    hasCodeOfConduct: allFiles.some(f => f.toLowerCase() === 'code_of_conduct.md'),
    hasDocker: allFiles.some(f => f === 'Dockerfile'),
    hasCICD: allFiles.some(f => f.startsWith('.github/workflows/') || f === '.gitlab-ci.yml'),
    hasDockerCompose: allFiles.some(f => f === 'docker-compose.yml' || f === 'docker-compose.yaml'),
    typescript: analyzeTsConfig(tsconfigContent),
    eslint: eslintContent !== null,
    prettier: allFiles.some(f => f === '.prettierrc' || f === '.prettierrc.json'),
  };
}

function analyzeTsConfig(content: string | null): { strict: boolean; target: string; module: string } | null {
  if (!content) return null;
  try {
    const cfg = JSON.parse(content);
    return {
      strict: cfg.compilerOptions?.strict ?? false,
      target: cfg.compilerOptions?.target ?? 'unknown',
      module: cfg.compilerOptions?.module ?? 'unknown',
    };
  } catch {
    return null;
  }
}

export function analyzeSourceCode(files: Map<string, string>, fileTree: string[], languages: Record<string, number>): SourceAnalysis {
  const result: SourceAnalysis = {
    apiRoutes: [],
    databaseTables: [],
    externalServices: [],
    authPatterns: [],
    aiModels: [],
    dataAssets: [],
    agents: [],
    fileTree,
    totalFiles: fileTree.length,
    totalLines: 0,
    languages,
    notebooks: [],
    extractedPrompts: [],
    frameworks: [],
    memorySystems: [],
    classification: null,
  };

  const allCodeContent: string[] = [];
  const allNotebookAnalyses: NotebookAnalysis[] = [];

  for (const [path, content] of Array.from(files)) {
    if (!content) continue;
    const lines = content.split('\n');
    result.totalLines += lines.length;

    // Parse Jupyter notebooks
    if (path.endsWith('.ipynb')) {
      const nb = parseNotebook(path, content);
      if (nb) {
        allNotebookAnalyses.push(nb);
        result.notebooks.push(nb);
        result.extractedPrompts.push(...nb.prompts);
        result.frameworks.push(...nb.frameworks);
        result.memorySystems.push(...nb.memorySystems);

        // Add API keys signal
        if (nb.hasAPIKeys) {
          result.authPatterns.push(`api-keys-in-notebook:${path}`);
        }

        // Add agent signals from notebook
        for (const role of nb.agentRoles) {
          result.agents.push({
            name: `${path.split('/').pop()?.replace('.ipynb', '') ?? 'notebook'}:${role}`,
            type: 'ai_persona',
            tools: nb.externalServices.map(s => s.toLowerCase()),
            models: nb.frameworks.map(f => f.framework),
            riskLevel: nb.isProduction ? 'medium' : 'low',
            critical: false,
          });
        }

        // Add external services from notebook
        for (const svc of nb.externalServices) {
          if (!result.externalServices.some(s => s.name === svc)) {
            result.externalServices.push({ name: svc, url: null, type: 'ai' });
          }
        }
      }
      continue;
    }

    // Standard source analysis for non-notebook files
    if (path.endsWith('.py') || path.endsWith('.js') || path.endsWith('.ts')) {
      allCodeContent.push(content);
    }

    if (path.includes('/api/') || path.includes('routes/')) {
      const route = detectApiRoute(path, content);
      if (route) result.apiRoutes.push(route);
    }

    detectDatabaseTables(content, result);
    detectExternalServices(content, result);
    detectAuthPatterns(content, result);
    detectAIModels(content, result);
    detectDataAssets(content, result, path);
    detectAgents(content, result, path);
    detectEnvAIProviders(content, result);
  }

  // Detect AI providers from env vars
  function detectEnvAIProviders(content: string, result: SourceAnalysis) {
    const envPatterns = /(OPENAI|DEEPSEEK|MISTRAL|ANTHROPIC|OPENROUTER)[_\-]?(API_KEY|KEY|SECRET|BASE_URL|ENDPOINT)/gi;
    let m: RegExpExecArray | null;
    while ((m = envPatterns.exec(content)) !== null) {
      const provider = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
      if (!result.aiModels.some(a => a.provider === provider)) {
        result.aiModels.push({ provider, modelId: null, usage: 'chat' });
      }
    }
  }

  // Advanced framework detection from all code content
  const combinedCode = allCodeContent.join('\n');
  const frameworkFromCode = detectFrameworks(combinedCode, 'combined-source');
  for (const fw of frameworkFromCode) {
    if (!result.frameworks.some(f => f.framework === fw.framework)) {
      result.frameworks.push(fw);
    }
  }

  // Framework detection from file tree
  const frameworkFromFiles = detectFrameworksFromFileTree(fileTree);
  for (const fw of frameworkFromFiles) {
    if (!result.frameworks.some(f => f.framework === fw.framework)) {
      result.frameworks.push(fw);
    }
  }

  // Memory system detection from code
  const memoryFromCode = detectMemorySystems(combinedCode);
  for (const ms of memoryFromCode) {
    if (!result.memorySystems.some(m => m.technology === ms.technology)) {
      result.memorySystems.push(ms);
    }
  }

  // Agent detection via framework patterns (codeguard-os port)
  const frameworkAgentMatches = detectAgentFrameworks(files);
  const frameworkAgents = buildAgentsFromFrameworkMatches(frameworkAgentMatches);

  // Merge framework agents with existing heuristic agents
  const existingNames = new Set(result.agents.map(a => a.name));
  for (const fa of frameworkAgents) {
    if (!existingNames.has(fa.name)) {
      result.agents.push(fa);
      existingNames.add(fa.name);
    }
  }

  // Repo classification
  result.classification = classifyRepo(allNotebookAnalyses, fileTree, result);

  // Deduplicate
  result.databaseTables = Array.from(new Set(result.databaseTables));
  result.authPatterns = Array.from(new Set(result.authPatterns));
  result.aiModels = dedupeModels(result.aiModels);
  result.externalServices = dedupeServices(result.externalServices);
  result.dataAssets = dedupeDataAssets(result.dataAssets);
  result.frameworks = dedupeFrameworks(result.frameworks);
  result.memorySystems = dedupeMemorySystems(result.memorySystems);

  return result;
}

function classifyRepo(notebooks: NotebookAnalysis[], fileTree: string[], source: SourceAnalysis): RepoClassification {
  const eduCount = notebooks.filter(n => n.isEducational).length;
  const prodCount = notebooks.filter(n => n.isProduction).length;
  const entCount = notebooks.filter(n => n.isEnterprise).length;
  const nbTotal = notebooks.length || 1;

  const eduRatio = eduCount / nbTotal;
  const prodRatio = prodCount / nbTotal;
  const entRatio = entCount / nbTotal;

  // Infrastructure signals
  const hasDeployConfig = fileTree.some(f => /docker|kubernetes|deploy|helm/i.test(f));
  const hasCICD = fileTree.some(f => f.startsWith('.github/workflows') || f === '.gitlab-ci.yml');
  const hasMonitoring = fileTree.some(f => /sentry|datadog|prometheus|grafana/i.test(f));
  const hasAuth = source.authPatterns.length > 0;
  const hasProductionInfra = hasDeployConfig || hasCICD || hasMonitoring;

  // Score each category
  const eduScore = eduRatio * 0.6 + (notebooks.length > 0 ? 0.2 : 0) + (fileTree.some(f => /tutorial|guide|learn/i.test(f)) ? 0.2 : 0);
  const prodScore = prodRatio * 0.3 + (hasProductionInfra ? 0.5 : 0) + (source.apiRoutes.length > 0 ? 0.2 : 0);
  const entScore = entRatio * 0.3 + (hasAuth && source.apiRoutes.length > 0 ? 0.3 : 0) + (entRatio > 0.3 ? 0.4 : 0);

  let category: RepoClassification['category'] = 'educational';
  let confidence = eduScore;

  if (entScore > prodScore && entScore > eduScore) {
    category = 'enterprise';
    confidence = entScore;
  } else if (prodScore > eduScore) {
    category = 'production';
    confidence = prodScore;
  } else if (eduScore > 0.3) {
    category = 'educational';
    confidence = eduScore;
  } else {
    category = 'prototype';
    confidence = 0.3;
  }

  const evidence: string[] = [];
  if (eduRatio > 0.3) evidence.push(`${Math.round(eduRatio * 100)}% notebooks have educational patterns`);
  if (prodRatio > 0.3) evidence.push(`${Math.round(prodRatio * 100)}% notebooks have production patterns`);
  if (hasDeployConfig) evidence.push('Deployment configs found');
  if (hasCICD) evidence.push('CI/CD pipeline found');
  if (source.apiRoutes.length > 0) evidence.push(`${source.apiRoutes.length} API routes`);
  if (source.authPatterns.length > 0) evidence.push('Authentication patterns found');

  return { category, confidence: Math.min(Math.round(confidence * 100), 100), evidence };
}

function detectApiRoute(path: string, content: string): ApiRoute | null {
  const methodMatch = content.match(/(export\s+(async\s+)?(function\s+)?(GET|POST|PUT|DELETE|PATCH)\b)/);
  if (!methodMatch) return null;

  const hasAuth = /middleware|auth|session|token|apiKey|authorization/i.test(content);
  const routePath = path
    .replace(/^src\//, '')
    .replace(/\/route\.(ts|js)$/, '')
    .replace(/\/page\.(tsx|ts)$/, '');

  return {
    path: routePath,
    method: methodMatch[4] as ApiRoute['method'],
    authRequired: hasAuth,
    description: extractDescription(content),
  };
}

function detectDatabaseTables(content: string, result: SourceAnalysis) {
  const patterns = [
    /\.from\(['"](\w+)['"]\)/g,
    /insertInto\(['"](\w+)['"]\)/g,
    /table\(['"](\w+)['"]\)/g,
    /model\s+(\w+)\s+extends/g,
  ];
  for (const pattern of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(content)) !== null) {
      const table = m[1];
      if (table && table.length > 2 && !['true', 'false', 'null', 'undefined'].includes(table)) {
        result.databaseTables.push(table);
      }
    }
  }
}

function detectExternalServices(content: string, result: SourceAnalysis) {
  const patterns: { pattern: RegExp; type: ServiceEndpoint['type'] }[] = [
    { pattern: /openai\.com|api\.openai\.com|oai\.azure\.com/gi, type: 'ai' },
    { pattern: /supabase\.co|supabase\.io|mongodb\.net|firebaseio\.com/gi, type: 'database' },
    { pattern: /stripe\.com|paddle\.com|lemonsqueezy\.com/gi, type: 'payment' },
    { pattern: /auth0\.com|clerk\.com|login\.google\.com/gi, type: 'auth' },
    { pattern: /s3\.amazonaws\.com|storage\.googleapis|blob\.core\.windows/gi, type: 'storage' },
    { pattern: /sentry\.io|datadog\.com|newrelic\.com/gi, type: 'monitoring' },
    { pattern: /api\.anthropic\.com|api\.mistral\.ai|router\.openrouter\.ai/gi, type: 'ai' },
    { pattern: /api\.github\.com|gitlab\.com|bitbucket\.org/gi, type: 'other' },
  ];

  const seen = new Set<string>();
  for (const { pattern, type } of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(content)) !== null) {
      const url = m[0].toLowerCase();
      const key = `${url}:${type}`;
      if (!seen.has(key)) {
        seen.add(key);
        const name = url.replace(/^https?:\/\//, '').split('.')[0];
        result.externalServices.push({ name: name.charAt(0).toUpperCase() + name.slice(1), url: m[0], type });
      }
    }
  }

  // Detect from package.json dependencies
  if (/@supabase\/supabase-js/.test(content)) {
    if (!seen.has('supabase:database')) {
      result.externalServices.push({ name: 'Supabase', url: 'supabase.co', type: 'database' });
    }
  }
}

function detectAuthPatterns(content: string, result: SourceAnalysis) {
  const patterns = [
    /process\.env\.\w*(?:AUTH|TOKEN|SECRET|KEY|PASSWORD|API_KEY)\w*/g,
    /middleware\.(ts|js)/,
    /getSession|getUser|verifyAuth|authorize|protectRoute/g,
    /signIn|signUp|signOut|logIn|logOut/g,
    /magic.?link|otp|sso|oauth/g,
    /jwt|session|cookie/g,
  ];
  for (const p of patterns) {
    if (p instanceof RegExp && p.test(content)) {
      result.authPatterns.push(p.source);
    }
  }
}

function detectAIModels(content: string, result: SourceAnalysis) {
  const models = scanModelIds(content);
  for (const m of models) {
    if (!result.aiModels.some(a => a.provider === m.provider && a.modelId === m.modelId)) {
      result.aiModels.push(m);
    }
  }
}

function detectDataAssets(content: string, result: SourceAnalysis, _path: string) {
  const tableMatches = content.match(/\.from\(['"](\w+)['"]\)/g);
  if (tableMatches) {
    for (const m of tableMatches) {
      const table = m.replace(/\.from\(['"]/, '').replace(/['"]\)$/, '');
      if (table && table.length > 2) {
        const hasPII = /email|cpf|phone|address|birth|name|user|profile|document|consent|health|employee|worker|voice|audio|speech|assessment|score|cops[oó]q|phq|clinical|therapy|session|sos|care|referral/i.test(table);
        result.dataAssets.push({
          name: table,
          type: 'database_table',
          hasPII,
          legalBasis: hasPII ? ['CONSENT'] : [],
        });
      }
    }
  }

  // Detect non-table data assets (voice, files, etc.)
  if (/voice|audio|speech|recording/i.test(content) && !result.dataAssets.some(d => d.name === 'voice_recordings')) {
    result.dataAssets.push({ name: 'voice_recordings', type: 'file_store', hasPII: true, legalBasis: ['CONSENT'] });
  }
  if (/cops[oó]q|copsoq/i.test(content) && !result.dataAssets.some(d => d.name === 'copsoq_responses')) {
    result.dataAssets.push({ name: 'copsoq_responses', type: 'database_table', hasPII: true, legalBasis: ['CONSENT', 'LGPD_ART7'] });
  }
  if (/phq-9|phq9|patient.?health.?questionnaire/i.test(content) && !result.dataAssets.some(d => d.name === 'phq9_responses')) {
    result.dataAssets.push({ name: 'phq9_responses', type: 'database_table', hasPII: true, legalBasis: ['CONSENT', 'LGPD_ART11_SENSITIVE'] });
  }
}

const AGENT_EXCLUDE_PATTERNS = /^(readme|license|contributing|code_of_conduct|\.env|docker|eslint|prettier|tsconfig|next\.config|package|pnpm|\.git)/i;
const CODE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|py|go|rb)$/;

function detectAgents(content: string, result: SourceAnalysis, path: string): void {
  const filename = path.split('/').pop() ?? path;
  // Skip non-code, config, and markdown files
  if (!CODE_EXTENSIONS.test(path)) return;
  if (AGENT_EXCLUDE_PATTERNS.test(filename)) return;

  const name = filename.replace(/\.(ts|tsx|js|jsx|mjs|py|go|rb)$/, '');
  const hasLLM = /openai|gpt|claude|model|mistral|deepseek|llm|completion|chat|generate/i.test(content);
  const hasAuth = /auth|token|session|apiKey|middleware|protect/i.test(content);
  const isPersona = /persona|agent|assistant|coach|chatbot|bot|voice|speech|audio/i.test(content);
  const isService = /service|api|gateway|proxy|controller|handler/i.test(content);
  const isPipeline = /pipeline|worker|job|task|queue|worker|background/i.test(content);
  const isAssessment = /assessment|evaluation|score|survey|cops[oó]q|phq|mental|health/i.test(content);
  const isComplianceEngine = /compliance|regulat|audit|governance/i.test(content);
  const isRiskEngine = /risk|threat|vulnerability|monitor/i.test(content);
  const isReportEngine = /report|export|dashboard|statistic/i.test(content);

  let type: 'ai_persona' | 'service' | 'pipeline' | 'custom' = 'custom';
  if (isPersona || isAssessment) type = 'ai_persona';
  else if (isComplianceEngine || isRiskEngine || isReportEngine) type = 'service';
  else if (isService) type = 'service';
  else if (isPipeline) type = 'pipeline';

  // Only add if there's a meaningful signal
  if (!isPersona && !isService && !isPipeline && !isAssessment && !isComplianceEngine && !isRiskEngine && !isReportEngine && !hasLLM) return;

  const tools: string[] = [];
  if (hasAuth) tools.push('auth');
  if (/supabase|prisma|drizzle|mongo|postgres/i.test(content)) tools.push('database');
  if (hasLLM) tools.push('llm');
  if (/stripe|payment|paddle/i.test(content)) tools.push('payment');

  result.agents.push({
    name,
    type,
    tools,
    models: hasLLM ? ['llm'] : [],
    riskLevel: type === 'service' && !hasAuth ? 'high' : type === 'ai_persona' ? 'medium' : 'low',
    critical: hasLLM && hasAuth,
  });
}

function extractDescription(content: string): string {
  const comment = content.match(/\/\/\s*(.+)/);
  return comment ? comment[1].trim() : '';
}

function dedupeModels(models: AIModel[]): AIModel[] {
  const seen = new Set<string>();
  return models.filter(m => {
    const key = `${m.provider}:${m.modelId}:${m.usage}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeServices(services: ServiceEndpoint[]): ServiceEndpoint[] {
  const seen = new Set<string>();
  return services.filter(s => {
    const key = `${s.name}:${s.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeDataAssets(assets: DataAssetDetected[]): DataAssetDetected[] {
  const seen = new Set<string>();
  return assets.filter(a => {
    if (seen.has(a.name)) return false;
    seen.add(a.name);
    return true;
  });
}

function dedupeFrameworks(frameworks: import('./types').FrameworkUsage[]): import('./types').FrameworkUsage[] {
  const seen = new Set<string>();
  return frameworks.filter(f => {
    if (seen.has(f.framework)) return false;
    seen.add(f.framework);
    return true;
  });
}

function dedupeMemorySystems(systems: import('./types').MemorySystem[]): import('./types').MemorySystem[] {
  const seen = new Set<string>();
  return systems.filter(s => {
    const key = `${s.technology}:${s.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
