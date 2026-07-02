import type { DetectedRisk, PackageAnalysis, ConfigAnalysis, SourceAnalysis, ShadowAIFinding } from './types';

export function detectRisks(pkg: PackageAnalysis, config: ConfigAnalysis, source: SourceAnalysis, _allFiles: string[], shadowAI?: ShadowAIFinding[]): DetectedRisk[] {
  const risks: DetectedRisk[] = [];

  // ── Legal ─────────────────────────────────────────────
  if (!config.hasLicense) {
    risks.push({
      id: 'RISK-NO-LICENSE', severity: 'critical', category: 'legal',
      title: 'Sem Licença — Repositório público sem termos de uso',
      description: 'Repositório público sem arquivo LICENSE. Isso impede uso legal, contribuições e distribuição do código por terceiros.',
      recommendation: 'Adicionar LICENSE (MIT, Apache 2.0 ou GPL-3.0 conforme necessidade do negócio).',
    });
  }

  if (!config.hasReadme) {
    risks.push({
      id: 'RISK-NO-README', severity: 'info', category: 'operational',
      title: 'Sem README — Documentação do projeto ausente',
      description: 'Ausência de README.md dificulta onboarding de novos contribuidores.',
      recommendation: 'Criar README.md com descrição, setup, e links para documentação.',
    });
  }

  if (!config.hasCICD) {
    risks.push({
      id: 'RISK-NO-CICD', severity: 'medium', category: 'operational',
      title: 'Sem CI/CD — Pipeline de integração contínua ausente',
      description: 'Sem GitHub Actions ou GitLab CI. Código não passa por validação automática antes de merge.',
      recommendation: 'Configurar GitHub Actions com lint, typecheck e testes.',
    });
  }

  // ── Security ──────────────────────────────────────────
  if (!config.hasEnvExample) {
    risks.push({
      id: 'RISK-NO-ENV-EXAMPLE', severity: 'high', category: 'security',
      title: 'Sem .env.example — Padrão de secrets não documentado',
      description: 'Ausência de .env.example obriga novos devs a adivinharem variáveis necessárias, levando a commits acidentais de secrets.',
      recommendation: 'Criar .env.example com todas as variáveis documentadas (sem valores reais).',
    });
  }

  if (!config.hasDocker) {
    risks.push({
      id: 'RISK-NO-DOCKER', severity: 'low', category: 'operational',
      title: 'Sem Docker — Ambiente não containerizado',
      description: 'Ausência de Dockerfile pode levar a inconsistências entre ambientes dev/prod.',
      recommendation: 'Adicionar Dockerfile multi-stage para build e produção.',
    });
  }

  // Detect anon key in server code
  if (source.authPatterns.some(a => /process\.env/i.test(a)) && source.apiRoutes.some(r => !r.authRequired)) {
    risks.push({
      id: 'RISK-AUTH-GAP', severity: 'critical', category: 'security',
      title: 'Endpoint sem Autenticação — API routes expostas publicamente',
      description: `${source.apiRoutes.filter(r => !r.authRequired).length} endpoint(s) não verificam autenticação. Dados podem ser acessados anonimamente.`,
      file: source.apiRoutes.filter(r => !r.authRequired).map(r => r.path).join(', '),
      recommendation: 'Adicionar middleware de autenticação ou verificação de sessão em todos os endpoints protegidos.',
      cgagControl: 'CG-AG-004',
    });
  }

  if (pkg.aiDependencies.length > 0 && !source.apiRoutes.some(r => r.authRequired && r.path.includes('ai'))) {
    risks.push({
      id: 'RISK-AI-NO-AUTH', severity: 'high', category: 'security',
      title: 'Endpoint de IA sem Autenticação — Chat/AI exposto',
      description: 'Endpoints de IA detectados mas sem verificação de autenticação. Qualquer pessoa pode consumir créditos de API.',
      recommendation: 'Adicionar autenticação e rate limiting aos endpoints de IA.',
      cgagControl: 'CG-AG-004',
    });
  }

  // ── Compliance ────────────────────────────────────────
  if (source.dataAssets.some(d => d.hasPII)) {
    risks.push({
      id: 'RISK-PII-DETECTED', severity: 'high', category: 'compliance',
      title: 'Dados Pessoais Detectados — LGPD/GDPR aplicável',
      description: `Tabelas com potenciais PII encontradas: ${source.dataAssets.filter(d => d.hasPII).map(d => d.name).join(', ')}. Necessário registro ANPD e consentimento explícito.`,
      recommendation: 'Mapear base legal para cada dado pessoal. Verificar se consentimento é coletado e armazenado com hash SHA-256.',
      cgagControl: 'CG-AG-009',
    });
  }

  if (source.aiModels.length > 0) {
    risks.push({
      id: 'RISK-AI-ACT', severity: 'high', category: 'compliance',
      title: 'EU AI Act Aplicável — Sistema de IA de alto risco',
      description: `Uso de LLMs detectado: ${source.aiModels.map(m => `${m.provider} ${m.modelId ?? ''}`).join(', ')}. EU AI Act 2024/1689 pode classificar como alto risco dependendo do uso.`,
      recommendation: 'Realizar conformidade com EU AI Act Art. 6 (classificação), Art. 13 (transparência), Art. 14 (supervisão humana).',
      cgagControl: 'CG-AG-010',
    });
  }

  // ── Architectural ─────────────────────────────────────
  if (pkg.dependencies && Object.keys(pkg.dependencies).length > 30) {
    risks.push({
      id: 'RISK-DEP-OVERLOAD', severity: 'medium', category: 'architectural',
      title: 'Muitas Dependências — Superfície de ataque ampliada',
      description: `${Object.keys(pkg.dependencies).length} dependências de produção. Cada uma é um vetor de ataque potencial.`,
      recommendation: 'Auditar dependências regularmente com npm audit. Remover deps não utilizadas.',
    });
  }

  if (pkg.paymentDependencies.length > 0) {
    risks.push({
      id: 'RISK-PAYMENT', severity: 'medium', category: 'compliance',
      title: 'Processamento de Pagamentos — PCI DSS aplicável',
      description: `Dependência de pagamento detectada: ${pkg.paymentDependencies.join(', ')}. PCI DSS pode ser aplicável.`,
      recommendation: 'Verificar se o Stripe Elements/Checkout é usado (reduz escopo PCI). Nunca armazenar dados brutos de cartão.',
    });
  }

  // ── TypeScript strict ────────────────────────────────
  if (config.typescript && !config.typescript.strict) {
    risks.push({
      id: 'RISK-TS-STRICT', severity: 'medium', category: 'architectural',
      title: 'TypeScript strict mode desligado — Tipos inseguros',
      description: 'TypeScript sem strict mode permite null/undefined implícitos, any silencioso e erros em tempo de execução.',
      recommendation: 'Ativar "strict": true no tsconfig.json e corrigir os erros gradualmente.',
    });
  }

  // ── Tests ────────────────────────────────────────────
  if (!pkg.hasTestFramework) {
    risks.push({
      id: 'RISK-NO-TESTS', severity: 'high', category: 'operational',
      title: 'Sem Testes — Zero cobertura de código',
      description: 'Nenhum framework de teste detectado. Sem testes automatizados, regressões não são capturadas.',
      recommendation: 'Configurar Jest ou Vitest. Adicionar testes unitários para lógica de negócio.',
    });
  }

  // ── Shadow AI ─────────────────────────────────────────
  if (shadowAI && shadowAI.length > 0) {
    const ungovernedCount = shadowAI.filter(s => !s.governed).length;
    if (ungovernedCount > 0) {
      risks.push({
        id: 'RISK-SHADOW-AI', severity: 'critical', category: 'compliance',
        title: `Shadow AI — ${ungovernedCount} chamada(s) LLM sem governança`,
        description: `${ungovernedCount} ocorrência(s) de IA não governada encontrada(s). Chamadas LLM sem registro de aprovação, owner ou audit trail.`,
        recommendation: 'Implementar AI Registry para todas as chamadas LLM. Vincular cada modelo a um owner e caso de uso aprovado.',
        cgagControl: 'CG-AG-012',
      });
    }
  }

  // ── Missing RLS / Security policies ───────────────────
  if (source.databaseTables.length > 0 && !source.fileTree.some(f => /policy/i.test(f) || /rls/i.test(f))) {
    risks.push({
      id: 'RISK-NO-RLS', severity: 'high', category: 'security',
      title: 'Sem RLS ou Policies — Acesso irrestrito a dados',
      description: 'Tabelas de banco detectadas mas nenhuma política de segurança (RLS) encontrada. Dados podem estar acessíveis globalmente.',
      recommendation: 'Implementar Row Level Security no Supabase para todas as tabelas com dados sensíveis.',
    });
  }

  // ── Missing CSP / Security Headers ─────────────────────
  // Check if any file mentions CSP or helmet
  const hasCSP = source.fileTree.some(f => /content-security-policy|csp|helmet/i.test(f));
  if (!hasCSP) {
    // Check via authPatterns that might include headers
    if (!source.authPatterns.some(a => /content.?security|csp|helmet/i.test(a))) {
      risks.push({
        id: 'RISK-NO-CSP', severity: 'medium', category: 'security',
        title: 'Sem Content Security Policy — Vulnerável a XSS',
        description: 'Nenhuma política de segurança de conteúdo (CSP) detectada nos headers HTTP.',
        recommendation: 'Implementar CSP headers via middleware ou next.config.js.',
      });
    }
  }

  // ── Missing Audit Chain ────────────────────────────────
  if (source.databaseTables.length > 0 && !source.databaseTables.some(t => /audit|log/i.test(t))) {
    risks.push({
      id: 'RISK-NO-AUDIT-CHAIN', severity: 'high', category: 'compliance',
      title: 'Sem Audit Trail — Operações sem rastreabilidade',
      description: 'Nenhuma tabela de auditoria detectada. Decisões automatizadas de IA precisam ser rastreáveis para LGPD Art. 20 e EU AI Act Art. 12.',
      recommendation: 'Implementar tabelas de audit trail (ai_audit_logs, decision_logs) registrando toda decisão automatizada com timestamp, modelo, input hash e outcome.',
    });
  }

  // ── No Observability / Monitoring ──────────────────────
  if (!source.fileTree.some(f => /sentry|datadog|newrelic|opentelemetry|grafana|prometheus|logrocket|monitoring|observability/i.test(f)) &&
      !source.authPatterns.some(a => /sentry|datadog|newrelic|opentelemetry|grafana|prometheus|logrocket/i.test(a))) {
    risks.push({
      id: 'RISK-NO-OBSERVABILITY', severity: 'medium', category: 'operational',
      title: 'Sem Observabilidade — Monitoramento de produção ausente',
      description: 'Nenhuma ferramenta de telemetria detectada (Sentry, Datadog, OpenTelemetry). Incidentes em produção podem não ser detectados.',
      recommendation: 'Adicionar Sentry para error tracking ou OpenTelemetry para tracing distribuído.',
    });
  }

  // ── No Rate Limiting ────────────────────────────────────
  if (source.apiRoutes.length > 0 && !source.authPatterns.some(a => /rate.?limit|throttle|retry-after|429/i.test(a)) &&
      !source.fileTree.some(f => /rate.?limit|throttle/i.test(f))) {
    risks.push({
      id: 'RISK-NO-RATE-LIMIT', severity: 'high', category: 'security',
      title: 'Sem Rate Limiting — Vulnerável a abuso de API',
      description: 'Nenhum mecanismo de rate limiting detectado. Endpoints podem ser sobrecarregados por chamadas excessivas.',
      recommendation: 'Implementar rate limiting via middleware (express-rate-limit, Upstash, ou Cloudflare WAF).',
    });
  }

  // ── Dev Unlock / Debug Code in Production ───────────────
  if (source.authPatterns.some(a => /dev.?unlock|debug|bypass|skip.?auth|admin.?bypass/i.test(a))) {
    risks.push({
      id: 'RISK-DEV-UNLOCK', severity: 'critical', category: 'security',
      title: 'Código de Debug/Dev em Produção — Bypass de segurança',
      description: 'Padrões de dev unlock ou bypass de autenticação detectados em código-fonte. Risco de exposição acidental em produção.',
      recommendation: 'Remover qualquer bypass de autenticação. Usar feature flags (LaunchDarkly) para funcionalidades restritas.',
    });
  }

  // ── No Data Retention Policy ───────────────────────────
  if (source.dataAssets.some(d => d.hasPII) && !source.fileTree.some(f => /retention|ttl|expir|cleanup|purge/i.test(f)) &&
      !source.databaseTables.some(t => /retention|ttl|expir|cleanup|purge/i.test(t))) {
    risks.push({
      id: 'RISK-NO-RETENTION', severity: 'medium', category: 'compliance',
      title: 'Sem Política de Retenção de Dados — LGPD Art. 16',
      description: 'Dados pessoais detectados sem mecanismo de expurgo automático. LGPD Art. 16 exige eliminação após fim da finalidade.',
      recommendation: 'Implementar TTL ou job de cleanup periódico para dados pessoais (voice recordings, assessments antigos).',
    });
  }

  // ── No Vendor Risk Assessment ──────────────────────────
  if ((source.externalServices.length > 0 || pkg.aiDependencies.length > 0) &&
      !source.fileTree.some(f => /vendor|third.?party|dpa|sla|subprocessors/i.test(f)) &&
      !source.authPatterns.some(a => /vendor|third.?party|dpa/i.test(a))) {
    risks.push({
      id: 'RISK-NO-VENDOR-ASSESSMENT', severity: 'medium', category: 'compliance',
      title: 'Sem Avaliação de Terceiros — Risco de fornecedores não avaliados',
      description: `Serviços externos detectados: ${[...source.externalServices, ...pkg.aiDependencies].join(', ')}. Nenhum DPA ou avaliação de vendor encontrada.`,
      recommendation: 'Documentar DPA para cada fornecedor. Avaliar conformidade LGPD/GDPR de cada subprocessador.',
    });
  }

  // ── No Backup / Disaster Recovery ──────────────────────
  if (source.databaseTables.length > 0 && !source.fileTree.some(f => /backup|disaster.?recovery|dr|snapshot|replicat/i.test(f)) &&
      !source.authPatterns.some(a => /backup|disaster.?recovery|dr/i.test(a))) {
    risks.push({
      id: 'RISK-NO-DISASTER-RECOVERY', severity: 'high', category: 'operational',
      title: 'Sem Disaster Recovery — Risco de perda total de dados',
      description: 'Tabelas de banco detectadas mas nenhum mecanismo de backup ou DR encontrado. Perda de dados pode ser irreversível.',
      recommendation: 'Configurar backup automático diário do banco. Testar restore periodicamente. Documentar RTO/RPO.',
    });
  }

  // ── Missing Incident Response ──────────────────────────
  if (source.apiRoutes.length > 0 && !source.fileTree.some(f => /incident|security.?response|breach|bug.?bounty|responsible.?disclosure/i.test(f)) &&
      !source.authPatterns.some(a => /incident|security.?response|breach/i.test(a))) {
    risks.push({
      id: 'RISK-NO-INCIDENT-RESPONSE', severity: 'high', category: 'operational',
      title: 'Sem Plano de Resposta a Incidentes — LGPD Art. 48',
      description: 'Nenhum plano de resposta a incidentes ou política de segurança detectada. LGPD Art. 48 exige comunicação à ANPD em 72h.',
      recommendation: 'Criar Incident Response Plan documentando contatos, escalation matrix e template de comunicação à ANPD.',
    });
  }

  // ── No Data Protection Officer ─────────────────────────
  if (source.dataAssets.some(d => d.hasPII) && !source.fileTree.some(f => /dpo|privacy.?officer|encarregado/i.test(f)) &&
      !source.authPatterns.some(a => /dpo|privacy.?officer|encarregado/i.test(a))) {
    risks.push({
      id: 'RISK-NO-DPO', severity: 'high', category: 'compliance',
      title: 'Sem DPO/Encarregado — LGPD Art. 41',
      description: 'Dados pessoais detectados mas nenhum DPO ou Encarregado identificado. LGPD Art. 41 exige indicação de Encarregado.',
      recommendation: 'Nomear Encarregado de Proteção de Dados (DPO) e publicar canal de contato.',
    });
  }

  // ── No API Versioning ──────────────────────────────────
  if (source.apiRoutes.length > 3 && !source.apiRoutes.some(r => r.path.match(/v\d|version|api\/v/i))) {
    risks.push({
      id: 'RISK-NO-API-VERSIONING', severity: 'medium', category: 'architectural',
      title: 'Sem Versionamento de API — Mudanças quebram consumidores',
      description: 'API routes detectadas sem prefixo de versão (v1, v2). Mudanças no contrato da API podem quebrar consumidores.',
      recommendation: 'Adicionar prefixo de versão às rotas (/api/v1/...). Manter compatibilidade retroativa por ao menos 1 versão.',
    });
  }

  // ── No Data Subject Rights Implementation ──────────────
  if (source.dataAssets.some(d => d.hasPII) && !source.fileTree.some(f => /right.to.?be.?forgotten|data.?deletion|access.?request|data.?portability/i.test(f)) &&
      !source.authPatterns.some(a => /right.to.?be.?forgotten|data.?deletion|access.?request|data.?portability/i.test(a))) {
    risks.push({
      id: 'RISK-NO-DSR', severity: 'high', category: 'compliance',
      title: 'Sem Direitos do Titular — LGPD Arts. 9, 18, 19',
      description: 'Dados pessoais coletados mas sem endpoint de exclusão ou portabilidade. Titulares não conseguem exercer seus direitos.',
      recommendation: 'Implementar endpoints de DSR (Data Subject Request): GET /api/privacy/data, DELETE /api/privacy/data, GET /api/privacy/portability.',
    });
  }

  // ── No Dependency Audit —────────────────────────────────
  if (pkg.dependencies && Object.keys(pkg.dependencies).length > 5 && !config.hasCICD &&
      !source.fileTree.some(f => /npm.?audit|snyk|dependabot|renovate|security.?scan/i.test(f))) {
    risks.push({
      id: 'RISK-NO-DEP-AUDIT', severity: 'high', category: 'security',
      title: 'Sem Auditoria de Dependências — Vulnerabilidades conhecidas',
      description: `${Object.keys(pkg.dependencies).length} dependências sem auditoria automática. Riscos de segurança em bibliotecas desatualizadas.`,
      recommendation: 'Configurar Dependabot ou Renovate para PRs automáticos de atualização. Rodar npm audit semanalmente.',
    });
  }

  // ── Single Vendor Lock-in ──────────────────────────────
  const uniqueProviders = new Set(source.aiModels.map(m => m.provider));
  if (uniqueProviders.size === 1 && source.aiModels.length > 0) {
    risks.push({
      id: 'RISK-VENDOR-LOCKIN', severity: 'high', category: 'financial',
      title: 'Vendor Lock-in — Dependência de único provedor de IA',
      description: `Apenas ${source.aiModels[0].provider} detectado como provedor de IA. Sem fallback, qualquer interrupção ou mudança de preço impacta todo o sistema.`,
      recommendation: 'Adicionar provedor secundário (ex: Anthropic, Mistral, DeepSeek). Implementar fallback automático entre provedores.',
    });
  }

  // ── Missing Bias / Fairness Testing ────────────────────
  if (source.aiModels.length > 0 && !source.fileTree.some(f => /bias|fairness|equity|ethics|responsible|harm|evaluat.*bias/i.test(f)) &&
      !source.authPatterns.some(a => /bias|fairness|equity|ethics/i.test(a))) {
    risks.push({
      id: 'RISK-NO-BIAS-TESTING', severity: 'high', category: 'compliance',
      title: 'Sem Testes de Viés — Risco de discriminação algorítmica',
      description: `Modelos de IA detectados (${source.aiModels.map(m => m.provider).join(', ')}) sem evidência de testes de viés, fairness ou equidade. EU AI Act Art. 10 exige avaliação de impacto em sistemas de alto risco.`,
recommendation: 'Implementar avaliação de viés nos datasets de treino e nos outputs dos modelos. Documentar métricas de fairness (demographic parity, equal opportunity).',
        cgagControl: 'CG-AG-009',
    });
  }

  return risks;
}

/**
 * FinOps Analyzer — detects expensive AI usage patterns.
 * Covers: N+1 LLM calls, missing timeout/retry, missing rate limiting.
 */
export function detectFinOpsRisks(
  source: SourceAnalysis,
  fileContents: Map<string, string>,
): DetectedRisk[] {
  const risks: DetectedRisk[] = [];
  if (source.aiModels.length === 0) return risks;

  const LLM_CALL = /openai\.chat\.completions|claude\.messages\.create|anthropic\.messages|openrouter|mistral\.chat|cohere\.generate|groq\.chat/i;
  const LOOP_BEFORE = /\b(for|while|forEach|map|reduce)\b.*\{?$/;
  const TIMEOUT_PATTERN = /\btimeout\b|\babortSignal\b|\bAbortController\b|\bsignal\s*:/i;
  const RETRY_PATTERN = /\bretry\b|\bp-retry\b|\bexponential.?backoff\b|\bretryable\b/i;
  const RATE_LIMIT_PATTERN = /\brate.?limit\b|\blimiter\b|\bthrottle\b|\bupstash\b|\bratelimit\b/i;

  let n1Detected = false;
  let missingTimeout = false;
  let missingRetry = false;
  let missingRateLimit = true;
  const n1Files: string[] = [];

  for (const [filePath, content] of Array.from(fileContents)) {
    if (!content || content.length > 500_000) continue;
    const ext = filePath.slice(filePath.lastIndexOf('.'));
    if (!['.ts', '.tsx', '.js', '.jsx', '.py'].includes(ext)) continue;

    const lines = content.split('\n');

    // N+1: for/while loop immediately followed (within 5 lines) by an LLM call
    for (let i = 0; i < lines.length - 5; i++) {
      if (LOOP_BEFORE.test(lines[i])) {
        for (let j = i + 1; j <= Math.min(i + 5, lines.length - 1); j++) {
          if (LLM_CALL.test(lines[j])) {
            n1Detected = true;
            if (!n1Files.includes(filePath)) n1Files.push(filePath);
            break;
          }
        }
      }
    }

    // Missing timeout on LLM calls
    if (LLM_CALL.test(content) && !TIMEOUT_PATTERN.test(content)) {
      missingTimeout = true;
    }

    // Missing retry
    if (LLM_CALL.test(content) && !RETRY_PATTERN.test(content)) {
      missingRetry = true;
    }

    // Rate limiting evidence (any file)
    if (RATE_LIMIT_PATTERN.test(content)) {
      missingRateLimit = false;
    }
  }

  if (n1Detected) {
    risks.push({
      id: 'FINOPS-N1-LLM',
      severity: 'high',
      category: 'financial',
      title: 'N+1 LLM Calls — Loop com chamada a modelo de IA',
      description: `Detectado padrão N+1: loop de código chamando diretamente um provider LLM em ${n1Files.slice(0, 3).join(', ')}. Cada iteração gera um request independente, multiplicando custo e latência.`,
      file: n1Files[0],
      recommendation: 'Agrupar inputs em batch (ex: openai batch API), usar cache semântico, ou mover a chamada LLM para fora do loop com pré-processamento.',
      cgagControl: 'CG-AG-006',
    });
  }

  if (missingTimeout) {
    risks.push({
      id: 'FINOPS-NO-TIMEOUT',
      severity: 'medium',
      category: 'operational',
      title: 'LLM sem Timeout — Chamadas bloqueantes sem limite de tempo',
      description: 'Chamadas a providers de IA detectadas sem AbortController ou campo timeout. Um modelo lento pode bloquear a request indefinidamente, consumindo recursos e prejudicando SLA.',
      recommendation: 'Adicionar AbortController com timeout de 30-60s em todas as chamadas LLM. Em Next.js, usar `signal` no fetch ou no SDK.',
      cgagControl: 'CG-AG-007',
    });
  }

  if (missingRetry) {
    risks.push({
      id: 'FINOPS-NO-RETRY',
      severity: 'medium',
      category: 'operational',
      title: 'LLM sem Retry — Falhas transitórias não tratadas',
      description: 'Nenhuma lógica de retry/backoff detectada para chamadas LLM. Rate limit 429 ou timeout 504 do provider causa erro imediato sem tentativa de recuperação.',
      recommendation: 'Implementar exponential backoff com p-retry, tenacity (Python) ou equivalente. Configurar max 3 tentativas com jitter.',
      cgagControl: 'CG-AG-007',
    });
  }

  if (missingRateLimit && source.apiRoutes.some(r => /ai|llm|chat|completion|generate/i.test(r.path))) {
    risks.push({
      id: 'FINOPS-NO-RATE-LIMIT',
      severity: 'high',
      category: 'financial',
      title: 'API de IA sem Rate Limiting — Exposição a abuso e custo ilimitado',
      description: 'Endpoints de IA detectados sem middleware de rate limiting. Um atacante ou bug pode gerar milhares de chamadas LLM, resultando em custo ilimitado.',
      recommendation: 'Implementar rate limiting por usuário/IP com Upstash Ratelimit, Redis, ou middleware Next.js. Definir limites por plano (ex: 10 req/min free, 100 req/min pro).',
      cgagControl: 'CG-AG-006',
    });
  }

  return risks;
}
