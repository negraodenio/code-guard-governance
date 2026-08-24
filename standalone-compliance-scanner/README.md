# 🛡️ CodeGuard Compliance Scanner (Standalone Engine)

Motor Enterprise de Descoberta Estática e Análise de Conformidade para Agentes de IA, Modelos Fundacionais, Riscos e Regulações Globais.

---

## 🎯 Visão Geral

O **CodeGuard Compliance Scanner** é uma solução independente capaz de escanear repositórios de código (GitHub, GitLab, Bitbucket, Azure DevOps, Gitea) e infraestrutura para:

1. **Detectar Agentes de IA & Shadow AI**: Identifica automaticamente agentes declarados e não declarados no código.
2. **Classificar Frameworks & Modelos**: Reconhece LangChain, CrewAI, AutoGPT, LlamaIndex, OpenAI Swarm, Semantic Kernel, Haystack, DSPy, MCP e mais de 40 provedores/modelos de LLM.
3. **Mapear Riscos e Linhagem de Dados**: Analisa fluxo de dados, acessos a bancos, segredos expostos, prompts vulneráveis e dados sensíveis (PII).
4. **Avaliar Conformidade com 13 Regulações**:
   - 🇪🇺 **EU AI Act** (Artigos 6, 9, 10, 11, 12, 13, 14, 15, 50, 52)
   - 🇧🇷 **LGPD** (Artigos 6, 7, 11, 14, 18, 37, 38, 46, 48 + Geração de RIPD)
   - 🇪🇺 **GDPR** (Artigos 5, 6, 9, 13, 15, 22, 25, 30, 32, 35)
   - 🇧🇷 **Resolução BCB nº 4.893 / 4.658** (Banco Central do Brasil / Setor Financeiro)
   - 🇧🇷 **RDC ANVISA** (Software como Dispositivo Médico / Saúde)
   - 🇺🇸 **NIST AI RMF 1.0** (Govern, Map, Measure, Manage)
   - 🌐 **ISO/IEC 42001:2023** (Sistema de Gestão de Inteligência Artificial)
   - 🛡️ **OWASP Top 10 for LLMs** (Prompt Injection, Insecure Output, Data Poisoning, etc.)
   - 🏦 **DORA** (Digital Operational Resilience Act - UE)
   - 🔒 **NIS2** (Network and Information Security Directive)
   - 💳 **PCI-DSS v4.0**
   - 📜 **CG-AG (CodeGuard Agent Governance Framework)** — 12 Controles de Governança

---

## 📁 Estrutura da Pasta `standalone-compliance-scanner/`

```
standalone-compliance-scanner/
├── src/
│   ├── index.ts                # Ponto de entrada e exports públicos
│   ├── core/                   # Motores de análise e detecção
│   │   ├── agent-detector.ts   # Detecção de agentes e personas
│   │   ├── framework-detector.ts # LangChain, CrewAI, AutoGPT, etc.
│   │   ├── model-parser.ts     # Parser de chamadas de LLM (GPT-4o, Claude, etc.)
│   │   ├── memory-detector.ts  # Vetores, Redis, Postgres, BufferMemory
│   │   ├── notebook-parser.ts  # Análise de Jupyter Notebooks (.ipynb)
│   │   ├── risk-detector.ts    # Detecção de vulnerabilidades e riscos
│   │   ├── shadow-ai.ts        # Detecção de IA oculta / não aprovada
│   │   ├── violations.ts       # Matriz de violações regulatórias
│   │   ├── compliance.ts       # Avaliador central de conformidade
│   │   ├── classifier.ts       # Classificador de arquitetura
│   │   └── types.ts            # Tipos e interfaces de dados
│   ├── regulations/            # Módulos específicos de regulação
│   │   ├── lgpd.ts             # LGPD & gerador de RIPD
│   │   ├── gdpr.ts             # GDPR & direitos do titular
│   │   ├── bcb-4893.ts         # Regulação Bancária / BCB
│   │   └── anvisa.ts           # Regulação de Saúde / ANVISA
│   ├── connectors/             # Conectores com provedores Git
│   │   ├── github.ts           # GitHub API connector
│   │   ├── gitlab.ts           # GitLab connector
│   │   ├── bitbucket.ts        # Bitbucket connector
│   │   ├── azure-devops.ts     # Azure DevOps connector
│   │   └── gitea.ts            # Gitea & Forgejo connector
│   └── enrichment/             # Mapeamento e inteligência profunda
│       ├── lgpd-pii.ts         # Mapeamento semântico de PII
│       ├── lineage.ts          # Linhagem de ponta a ponta
│       ├── trust-zone.ts       # Zonas de confiança e isolamento
│       └── finops.ts           # Estimativa de custos e tokens
├── package.json
└── README.md
```

---

## 🚀 Como Usar Como Biblioteca

```typescript
import { analyzeSourceCode, evaluateCompliance } from '@codeguard/compliance-scanner';

// 1. Analisar os arquivos do repositório
const sourceAnalysis = await analyzeSourceCode({
  files: [
    { path: 'src/agent.ts', content: 'const agent = new Agent({ ... })' },
    { path: 'src/db.ts', content: 'const users = db.query("SELECT cpf, email FROM users")' }
  ]
});

// 2. Avaliar conformidade regulatória
const complianceReport = evaluateCompliance(sourceAnalysis, {
  regulations: ['EU_AI_ACT', 'LGPD', 'OWASP_LLM', 'CG_AG'],
  domain: 'finance'
});

console.log('Score Geral:', complianceReport.overallScore);
console.log('Violações Detectadas:', complianceReport.violations);
```
