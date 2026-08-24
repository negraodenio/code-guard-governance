# Proposta de Adesão — CodeGuard AI Governance OS
## Hub TEIA CAIXA — Programa Startups Residentes

**Data:** Julho 2026
**Startup:** CodeGuard AI Governance OS
**Contato:** [deniolisbon@gmail.com / +55 61 9376-0550]
**Repositórios:** github.com/negraodenio/cg-ag | github.com/negraodenio/code-guard-governance
**Produto:** www.code-guard.eu

---

## 1. Resumo Executivo

O **CodeGuard AI Governance OS** é o primeiro sistema operacional de governança de agentes de IA. Num cenário onde governos, startups e corporações adotam IA em escala, o maior risco não é criar agentes — é **governar milhares deles sem controle**. O CodeGuard resolve isso com um scanner automatizado, um grafo de conhecimento, inventário de ciclo de vida, e certificação baseada no padrão aberto **CG-AG** (CC BY 4.0), alinhado ao EU AI Act, LGPD, ISO 42001 e NIST AI RMF.

Estamos em produção (www.code-guard.eu), com scanner validado em repositórios reais de agentes de IA, dashboard V1 funcional, e integração contínua via webhook GitHub + cron diário.

Buscamos ingresso no **Programa TEIA Startups** como startup residente para acelerar a adoção do CG-AG como padrão de governança de IA no setor público brasileiro, conectando-nos a prefeituras, órgãos públicos e demais startups do ecossistema.

---

## 2. O Problema

### 2.1. A explosão silenciosa de agentes de IA

Organizações públicas e privadas estão implantando agentes de IA em ritmo acelerado — chatbots, assistentes virtuais, automatizações de processos, sistemas de decisão automatizada. Estima-se que **85% dos agentes de IA em operação não são registrados oficialmente** (shadow agents), operando sem supervisão, sem auditoria e sem conformidade regulatória.

### 2.2. O vácuo regulatório

No Brasil, a **LGPD** já exige transparência no tratamento de dados pessoais. A **Estratégia Brasileira de IA (EBIA)** e o projeto de lei **PL 2338/2023** (Marco Legal da IA) caminham para exigir governança. Na Europa, o **EU AI Act** já está em vigor com multas de até 7% do faturamento global. Nos EUA, a **Ordem Executiva 14110** e o **NIST AI RMF** estabelecem padrões.

**O problema:** não existe uma ferramenta prática, acessível e padronizada para que organizações — especialmente órgãos públicos e startups — implementem governança de IA de forma auditável e contínua.

### 2.3. Riscos concretos para o setor público

| Risco | Impacto |
|-------|---------|
| Agentes shadow em dados de cidadãos | Violação LGPD, multas, dano reputacional |
| Decisões automatizadas não auditáveis | Impossibilidade de prestar contas ao cidadão e ao TCU |
| Ausência de inventário de agentes | Nenhum gestor sabe quantos agentes de IA sua organização opera |
| Viés algorítmico não detectado | Discriminação em políticas públicas automatizadas |
| Dependência de fornecedores sem compliance | Risco jurídico terceirizado |

---

## 3. A Solução: CodeGuard AI Governance OS

### 3.1. Visão Geral

O CodeGuard é um **sistema operacional de governança** composto por:

1. **Scanner de Agentes de IA** — descobre automaticamente agentes em repositórios de código, analisando configurações, dependências, APIs e comportamentos
2. **GraphOS — Grafo de Conhecimento** — mapeia entidades, agentes, riscos, regulamentações e relacionamentos num grafo navegável
3. **Agent Lifecycle Inventory** — gerencia o ciclo de vida completo: descoberta → registro → approval → ativo → suspenso → arquivado
4. **CG-AG Framework** — 12 controis de governança com certificação Bronze→Silver→Gold→Platinum
5. **Continuous Governance** — varreduras automáticas via webhook (push no GitHub) e cron diário
6. **Drift Detection** — alerta automático de agentes shadow quando o scan detecta agentes não registrados
7. **Board Report** — relatório PDF executivo com score, riscos, conformidade regulatória e certificação
8. **Talk to Governance** — interface conversacional determinística (sem LLM) para consultas de auditoria em PT/EN/ES

### 3.2. Scanner Maduro (produção)

O scanner cobre **13 regulamentações** simultaneamente:

- EU AI Act (categorias de risco proibido/alto/limitado/mínimo)
- LGPD (base legal, consentimento, DPO, direitos do titular)
- ISO 42001 (SGAIA — Sistema de Gestão de IA)
- NIST AI RMF (mapeamento, medição, gestão)
- DORA (resiliência digital, testes, reporte de incidentes)
- HIPAA (dados de saúde)
- PCI DSS (dados financeiros)
- CCPA/CPRA (privacidade Califórnia)
- FINRA (mercados financeiros)
- SOX (controles internos)
- GDPR (privacidade Europa)
- COPPA (crianças online)
- FinOps (custos de API de IA)

**Conectores por categoria:**

| Categoria | Fontes |
|-----------|--------|
| Source Control (6) | GitHub, GitLab, Bitbucket, Azure DevOps, Gitea, Forgejo |
| CI/CD (8) | GitHub Actions, GitLab CI, Jenkins, CircleCI, Azure Pipelines, Travis CI, Bitrise, Buddy |
| IaC (11 AI services) | OpenAI, Anthropic, AWS Bedrock, Azure OpenAI, Google Vertex, HuggingFace, Replicate, Together, Cohere, Groq, DeepSeek |
| Identity (3) | Entra ID, Okta, Keycloak |
| Docs (3) | Confluence, SharePoint, Notion |

### 3.3. O Padrão Aberto CG-AG

O **CG-AG Framework v1.0** é um padrão aberto publicado sob **Creative Commons BY 4.0** em repositório próprio (github.com/negraodenio/cg-ag). Contém:

- **12 controis** organizados em 3 domínios (Fundação, Implementação, Excelência)
- **Critérios objetivos** de certificação Bronze→Silver→Gold→Platinum
- **Matriz de rastreabilidade** com EU AI Act, DORA, ISO 42001, NIST AI RMF
- **Spec completa** em formato publicável (Markdown + JSON)

| Certificação | Score Mínimo | Requisitos |
|:---:|:---:|---|
| Bronze | ≥20 | Inventário básico + 1 control |
| Silver | ≥35 | ≥4 controis + drift detection |
| Gold | ≥50 | ≥8 controis + continuous governance |
| Platinum | ≥60 | 12/12 controis + zero riscos críticos + zero falhas |

### 3.4. Stack Tecnológica

| Componente | Tecnologia |
|------------|-----------|
| Frontend | Next.js 14 (React 18, TypeScript, Tailwind) |
| Backend | Next.js API Routes (Edge + Serverless) |
| Banco | Supabase (PostgreSQL + Storage) |
| Scanner | TypeScript + Octokit + Conectores custom |
| Cache | In-memory globalThis + filesystem |
| Deploy | Vercel (serverless, cron, edge functions) |
| PDF | pdfkit (Board Report) |
| Monorepo | npm workspaces (packages/scanner, packages/graphos) |

---

## 4. Tração e Validação

### 4.1. Status Atual

- ✅ **Produto em produção:** www.code-guard.eu (Vercel, domínio próprio)
- ✅ **CG-AG Framework v1.0 publicado:** github.com/negraodenio/cg-ag (CC BY 4.0, spec completa)
- ✅ **Scanner validado:** repositório NirDiamant/GenAI_Agents → certificação Gold (47/100, 151 entidades, 75 relacionamentos)
- ✅ **Dashboard V1 funcional:** inventário de agentes, grafo de conhecimento, Talk to Governance, Board Report PDF
- ✅ **Continuous Governance:** webhook GitHub + cron diário + drift detection
- ✅ **Agent Lifecycle:** 7 estados, transições validadas, ledger de auditoria
- ✅ **Monorepo publicado:** 571+ arquivos, 3 pacotes (scanner, graphos, dashboard)

### 4.2. Roadmap

| Fase | Status | Previsão |
|------|--------|----------|
| V1 — Core de governança | ✅ Concluído | — |
| V2 — Runtime enforcement (guardrails) | 🔜 Próximo | Q4 2026 |
| V3 — Cloud live APIs (Bedrock/Azure) | 🔜 Próximo | Q1 2027 |
| Badges dinâmicos CG-AG para repositórios | 📋 Planejado | Q4 2026 |
| Submissão CEN/CENELEC JTC21 | 📋 Planejado | 2027 |

---

## 5. Fit com o Hub TEIA CAIXA

### 5.1. Alinhamento Estratégico

O Hub TEIA conecta **48+ startups residentes**, **38 prefeituras** com protocolos de intenção, **órgãos públicos** e **desafios CPSI CAIXA** — exatamente o ecossistema que precisa de governança de IA. O CodeGuard se encaixa em **três frentes complementares**:

#### Frente 1: Startups Residentes

Startups do TEIA que usam IA (Inup AI, NeuralMind, DataPolicy, e dezenas de outras) precisam de **compliance como diferencial competitivo**. O CodeGuard oferece:

- **Starter Kit gratuito de auto-governança CG-AG**
- Scanner do próprio repositório → score → certificação
- Relatório de conformidade para apresentar em licitações públicas
- Badge CG-AG para embedar no site/README

**Valor para o TEIA:** Aumenta o nível de maturidade das startups residentes, tornando-as mais preparadas para contratar com o governo.

#### Frente 2: Organizações Públicas

Prefeituras e órgãos públicos signatários de protocolos TEIA precisam de:

- **Inventário** de agentes de IA em operação
- **Mapeamento de riscos** regulatórios (LGPD, EU AI Act, ISO 42001)
- **Relatório executivo** para tomada de decisão
- **Certificação CG-AG** como atestado de conformidade

**Valor para o TEIA:** Um serviço concreto para oferecer aos órgãos públicos parceiros, aumentando o valor do ecossistema.

#### Frente 3: Desafios CPSI e Editais

Os **Contratos Públicos para Solução Inovadora (CPSI)** da CAIXA e os editais de inovação (como o recente do MPRS e da Prefeitura de Brusque) podem incluir **governança de IA como critério de contratação**:

- "A solução contratada deverá manter inventário público de seus agentes de IA"
- "Certificação CG-AG Platinum será considerada diferencial de pontuação"

**Valor para o TEIA:** Posiciona o TEIA como referência em inovação responsável com IA no setor público brasileiro.

### 5.2. Diferenciais Competitivos

| Diferencial | CodeGuard | Alternativas |
|-------------|-----------|-------------|
| Padrão aberto | CG-AG (CC BY 4.0) — auditável por qualquer parte | Proprietários, sem transparência |
| Foco em agentes de IA | Scanner especializado em detectar agentes | Ferramentas genéricas de compliance |
| Determinístico | Sem LLM no core — decisões auditáveis | Caixa-preta, não auditável |
| Custo de entrada | Scanner gratuito, framework CC BY 4.0, código aberto | Licenças caras, vendor lock-in |
| Regulações brasileiras | LGPD + EBIA + PL 2338/2023 | Foco apenas em regulações estrangeiras |
| Continuous governance | Webhook + cron + drift detection | Apenas scans pontuais |

### 5.3. Oportunidades Identificadas

1. **Edital MPRS (Julho/2026):** Ministério Público do RS lançou CPSI para soluções de IA — governança é critério implícito
2. **Edital Brusque/SC (Julho/2026):** Inovação fiscal com IA — compliance como pré-requisito
3. **Smart City Expo:** TEIA esteve presente — governança de IA em cidades inteligentes é tema emergente
4. **Ciclo 02 TEIA Startups:** Inscrições abertas até 17/08/2026 — oportunidade imediata

---

## 6. Pedido

Solicitamos ingresso no **Programa TEIA Startups (Ciclo 02)** como startup residente, com os seguintes compromissos:

1. **Disponibilizar** o Starter Kit CG-AG gratuitamente para todas as startups residentes do TEIA
2. **Realizar** uma demonstração ao vivo para o time TEIA + startups interessadas
3. **Participar** ativamente dos TEIA Connects e eventos do ecossistema
4. **Colaborar** na estruturação de editais CPSI que incluam governança de IA
5. **Publicar** conteúdo técnico sobre governança de IA para a comunidade TEIA (blog, podcast, workshops)

---

## 7. Contato

**Denio Lisboa**
- 📧 deniolisbon@gmail.com
- 📱 +55 61 9376-0550
- 🌐 www.code-guard.eu
- 🐙 github.com/negraodenio/cg-ag
- 🐙 github.com/negraodenio/code-guard-governance

---

*"The future problem is not creating AI agents. The future problem is governing thousands of them."*
— CodeGuard AI Governance OS
