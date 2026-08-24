# 🎓 Formação Executiva & Prática em Governança de Agentes de IA
## Padrão Aberto CG-AG (CodeGuard Agent Governance)
**Carga Horária:** 40 Horas · **Nível:** Intermediário / Avançado · **Certificação:** Certified AI Agent Governance Auditor (CG-AG)

---

## 🏛️ 1. Visão Geral do Curso

### Por que este curso existe?
Mais de **85% dos agentes de IA em operação nas empresas não são documentados nem governados** (*Shadow Agents*). Com a entrada em vigor do **EU AI Act**, o avanço do **Marco Legal da IA (PL 2338/23)** no Brasil, as exigências da **LGPD**, **ISO/IEC 42001** e **NIST AI RMF**, organizações públicas e privadas enfrentam um risco existencial: **como operar dezenas ou centenas de agentes autônomos de forma segura, auditável e em conformidade com a lei?**

Este curso não é teoria de papel em Word. É uma formação prática em **Governance-as-Code (Governança como Código)**, capacitando os alunos a implementar os 12 controles do framework **CG-AG**, auditar códigos-fonte reais e operar a plataforma **CodeGuard AI Governance OS / GraphOS** como membros do programa de **Beta Testers**.

---

## 🎯 2. Público-Alvo
* **Tech Leads, Engenheiros de IA e Desenvolvedores** (LangChain, CrewAI, AutoGPT, OpenAI Assistants, LlamaIndex).
* **CISOs, DPOs e Gestores de Segurança da Informação**.
* **Auditores de TI, Especialistas em Compliance e Risco Regulatório**.
* **CTOs, Enterprise Architects e Líderes de Inovação**.

---

## 📋 3. Grade Curricular Completa dos Módulos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ESTRUTURA MODULAR DO CURSO                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Módulo 1: O Risco Agêntico & O Vácuo Regulatório (EU AI Act, LGPD, ISO 42001)│
│ Módulo 2: O Framework CG-AG e Níveis de Certificação (Bronze → Platinum)    │
│ Módulo 3: Inventário, Four-Eyes Approval e Ferramentas (CG-AG-001 a 004)    │
│ Módulo 4: Fronteira de Dados, PII & LGPD Agêntica (CG-AG-005)               │
│ Módulo 5: Explicabilidade & Livro-Razão Imutável (CG-AG-006 a 008)          │
│ Módulo 6: Drift Detection, CI/CD e Kill-Switch (CG-AG-009 a 010)             │
│ Módulo 7: Governança Multi-Agente & Swarms (CG-AG-012)                      │
│ Módulo 8: Relatórios Executivos para Conselho & Auditoria (CG-AG-011)        │
│ Módulo 9: Laboratório Prático — Plataforma GraphOS (Beta Testing)           │
│ Módulo 10: Projeto Final & Certificação Profissional                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 🔹 MÓDULO 1: O Risco da IA Agêntica & O Vácuo Regulatório
* **Aula 1.1:** De Chatbots a Agentes Autônomos — A mudança de paradigma e riscos operacionais.
* **Aula 1.2:** A anatomia do *Shadow Agent* — Como agentes ocultos surgem nos repositórios.
* **Aula 1.3:** O Cenário Global de Regulação:
  * **EU AI Act (Regulamento 2024/1689):** Classificação de risco inaceitável, alto risco e transparência.
  * **LGPD & GDPR:** Responsabilidade civil, dados sensíveis e tomada de decisão automatizada.
  * **Marco Legal Brasileiro (PL 2338/2023):** Direitos do cidadão e governança algorítmica.
  * **ISO/IEC 42001:2023 & NIST AI RMF 1.0:** Boas práticas de gestão de sistemas de IA.
  * **DORA (2022/2554):** Resiliência operacional digital no setor financeiro.
* **Aula 1.4:** Por que planilhas e documentos Word falham — O conceito de *Governance-as-Code*.

---

### 🔹 MÓDULO 2: O Framework CG-AG — A Constituição dos Agentes
* **Aula 2.1:** A história e fundamentos do padrão aberto CG-AG (CC BY 4.0).
* **Aula 2.2:** Os 12 Controles Fundamentais de Governança Agêntica.
* **Aula 2.3:** A Matriz de Rastreabilidade Regulatória ([TRACEABILITY_MATRIX.md](file:///c:/Users/denio/Documents/Denio/PluginVIbeCOde/TRACEABILITY_MATRIX.md)).
* **Aula 2.4:** A Escala de Certificação de Maturidade:
  * 🥉 **Bronze:** Inventário formal e registro de agentes.
  * 🥈 **Silver:** Controles de acesso, aprovação humana e linhagem de modelos.
  * 🥇 **Gold:** Proteção ativa de PII, monitoramento contínuo e ledger imutável.
  * 💎 **Platinum:** Governança multi-agente, resiliência DORA, auditoria determinística completa.

---

### 🔹 MÓDULO 3: Inventário, Autonomia e Controle de Acesso (CG-AG-001 a 004)
* **Aula 3.1: [CG-AG-001] Inventário Mestre de Agentes:**
  * Metadados obrigatórios: `agent_code`, `intended_use`, `owner`, `env`.
  * Ciclo de vida: *Descoberta $\rightarrow$ Registro $\rightarrow$ Aprovação $\rightarrow$ Ativo $\rightarrow$ Suspenso $\rightarrow$ Decomissionado*.
* **Aula 3.2: [CG-AG-002] Aprovação Humana & Four-Eyes (Quatro Olhos):**
  * Níveis de autonomia (Informativo, Assistido, Semi-Autônomo, Autônomo).
  * Gateways de autorização dual para ações críticas (financeiras, exclusão de dados).
* **Aula 3.3: [CG-AG-003] Linhagem de Modelos e Versionamento de Prompts:**
  * Rastreabilidade de LLMs (OpenAI, Anthropic, Ollama, HuggingFace).
  * Gestão de *Prompt Drift* e alterações de instruções base.
* **Aula 3.4: [CG-AG-004] Autorização de Ferramentas, MCPs e APIs:**
  * Protocolo MCP (Model Context Protocol) sob governança.
  * Princípio do menor privilégio para chamadas de banco de dados e APIs externas.

---

### 🔹 MÓDULO 4: Privacidade, PII & LGPD Agêntica (CG-AG-005)
* **Aula 4.1: [CG-AG-005] Fronteiras de Dados Pessoais:**
  * Como agentes vazam dados em logs de contexto, embeddings e RAG.
  * Detecção e mascaramento automático de PII (CPF, e-mail, saúde, senhas).
* **Aula 4.2:** Gestão de Consentimento e Base Legal por Agente:
  * Vinculação da finalidade do agente com o Artigo 7º e 11º da LGPD.
* **Aula 4.3:** Políticas de Retenção e Descarte de Memória Agêntica (*Agent Memory Purge*).

---

### 🔹 MÓDULO 5: Explicabilidade & Livro-Razão Imutável (CG-AG-006 a 008)
* **Aula 5.1: [CG-AG-006] Explicabilidade & Reconstrução de Decisão:**
  * Cadeia de custódia: Quem acionou $\rightarrow$ Qual prompt $\rightarrow$ Qual resposta $\rightarrow$ Qual impacto.
  * O método determinístico de auditoria (auditoria sem alucinação de LLM).
* **Aula 5.2: [CG-AG-007] Classificação e Matriz de Riscos:**
  * Avaliação de severidade (Critical, High, Medium, Low) e impacto em direitos humanos.
* **Aula 5.3: [CG-AG-008] Governance Ledger (Livro-Razão Imutável):**
  * Registros à prova de adulteração (*Tamper-Proof Logs*).
  * Encadeamento criptográfico e hashes de integridade para órgãos reguladores (TCU, ANPD, BACEN).

---

### 🔹 MÓDULO 6: Monitoramento Contínuo, CI/CD e Kill-Switch (CG-AG-009 a 010)
* **Aula 6.1: [CG-AG-009] Continuous Governance & Drift Detection:**
  * Varreduras automatizadas via Webhooks de GitHub e agendamentos cron.
  * Identificação de *Code Drift* e agentes criados sem passar pela esteira oficial.
* **Aula 6.2: [CG-AG-010] Protocolo de Kill-Switch e Resposta a Incidentes:**
  * Procedimentos de suspensão imediata de agentes em comportamento errático.
  * Notificação automática de violações de dados (*Breach Notification*).

---

### 🔹 MÓDULO 7: Governança Multi-Agente & Swarms (CG-AG-012)
* **Aula 7.1:** O perigo do contágio em cascata em arquiteturas Multi-Agente (CrewAI, LangGraph, AutoGen).
* **Aula 7.2:** Isolamento de contexto e limites de delegação entre agentes.
* **Aula 7.3:** Prevenção de loops infinitos de custo e execução não supervisionada.

---

### 🔹 MÓDULO 8: Relatórios para Conselho & Certificação (CG-AG-011)
* **Aula 8.1: [CG-AG-011] Board Report & Scorecards Executivos:**
  * Traduzindo conformidade técnica em relatórios para Conselho de Administração e C-Level.
* **Aula 8.2:** Emissão de Certificados Digitais de Conformidade CG-AG.
* **Aula 8.3:** Preparação para Auditorias Externas (ISO 42001 e EU AI Act).

---

### 🔹 MÓDULO 9: Laboratório Prático — Plataforma GraphOS (Programa Beta Tester)
* **Laboratório 9.1:** Setup e Execução do **Scanner de Código**:
  * Rodando o scanner contra 10 repositórios reais com agentes em Python e TypeScript.
* **Laboratório 9.2:** Navegando no **GraphOS (React Flow)**:
  * Explorando as 9 perspectivas executivas: CEO, CFO, CISO, DPO, Compliance, Auditor, Board, Constitutional e Agent Ecosystem.
  * Alternando layouts dinâmicos (Horizontal L→R e Vertical T→B), zoom, minimapa e inspeção de nós.
* **Laboratório 9.3:** Consultas em Linguagem Natural com o **Talk to Governance**:
  * Fazendo perguntas de auditoria (*"Quais agentes processam PII?", "Quem aprovou a decisão X?"*).
* **Laboratório 9.4:** Envio de Feedback e Relato de Casos de Uso no Programa Beta Tester.

---

### 🔹 MÓDULO 10: Projeto Final & Certificação Oficial
* **Desafio Prático:** Realizar a auditoria de governança completa de uma stack multi-agente real de uma empresa fictícia.
* **Entregáveis:**
  1. Relatório de Descoberta de *Shadow Agents*;
  2. Matriz de Controles CG-AG preenchida com evidências;
  3. Grafo de Riscos gerado no GraphOS;
  4. Plano de Ação para Certificação Gold/Platinum.
* **Banca Avaliadora & Certificado:** Emissão do certificado oficial **Certified AI Agent Governance Auditor (CG-AG)**.

---

## 🛠️ 4. Recursos & Materiais Inclusos no Curso
1. **Documentação Mestre:** [TRACEABILITY_MATRIX.md](file:///c:/Users/denio/Documents/Denio/PluginVIbeCOde/TRACEABILITY_MATRIX.md) (E-book / Guia Oficial de Consulta).
2. **Repositórios de Laboratório:** 10 projetos reais com agentes pré-configurados para testes de auditoria.
3. **Acesso à Plataforma:** Acesso exclusivo ao **CodeGuard OS / GraphOS** durante o período do curso.
4. **Templates de Compliance:** Modelos de política de uso de agentes, termos de consentimento LGPD e relatórios para Diretoria.
