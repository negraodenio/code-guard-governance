import type { ComplianceAnalysis, ApplicableRegulation, PackageAnalysis, SourceAnalysis, DetectedRisk, ConfigAnalysis } from './types';
import { GDPRComplianceManager } from '@/lib/compliance/gdpr';
import { LGPDComplianceManager } from '@/lib/compliance/lgpd';
import { generateRIPD } from '@/lib/compliance/lgpd';
import { BCB4893Compliance } from '@/lib/compliance/bcb-4893';
import { AnvisaComplianceManager } from '@/lib/compliance/anvisa';

function detectDomain(source: SourceAnalysis): 'healthcare' | 'finance' | 'government' | 'corporate' | 'general' {
  const healthcareKeywords = /phq9|copsoq|clinical|voice_recordings|sos_messages|care_referrals|saude|paciente|terapia|hospital/i;
  const financeKeywords = /credit|fraud|banking|pagamento|financ|investimento|score|bcb|BACEN|febraban/i;
  const governmentKeywords = /gov|publico|servidor|licitacao|transparencia|orgao/i;

  const allText = [
    ...source.databaseTables,
    ...source.dataAssets.map(d => d.name),
    ...source.externalServices.map(s => s.name),
    ...source.apiRoutes.map(a => a.path),
  ].join(' ');

  if (healthcareKeywords.test(allText)) return 'healthcare';
  if (financeKeywords.test(allText)) return 'finance';
  if (governmentKeywords.test(allText)) return 'government';
  return 'general';
}

function detectAutonomyLevel(source: SourceAnalysis): 'ASSISTED' | 'AUTONOMOUS' | 'FULLY_AUTONOMOUS' {
  const allAgentText = source.agents.map(a => `${a.name} ${a.type}`).join(' ');
  const hasHITL = /human|manual|approval|review|oversight|validacao|aprovacao/i.test(allAgentText);
  const hasAutonomous = /autonomous|auto.?exec|self.?driven|independent|critical/i.test(allAgentText);

  if (hasAutonomous && !hasHITL) return 'FULLY_AUTONOMOUS';
  if (hasAutonomous || !hasHITL) return 'AUTONOMOUS';
  return 'ASSISTED';
}

function detectAnvisaParameters(source: SourceAnalysis): { intendedUse: 'DIAGNOSIS' | 'TREATMENT' | 'MONITORING' | 'DECISION_SUPPORT' | 'SCREENING'; criticality: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' } {
  const allText = [
    ...source.databaseTables,
    ...source.dataAssets.map(d => d.name),
    ...source.apiRoutes.map(a => a.path),
  ].join(' ');

  let intendedUse: any = 'DECISION_SUPPORT';
  if (/diagnostic|diagnosis|detectar|identificar/i.test(allText)) intendedUse = 'DIAGNOSIS';
  else if (/tratamento|treatment|terapia|intervencao/i.test(allText)) intendedUse = 'TREATMENT';
  else if (/monitor|monitoring|alert|acompanha/i.test(allText)) intendedUse = 'MONITORING';
  else if (/triagem|screening|rastreamento/i.test(allText)) intendedUse = 'SCREENING';

  const criticalAgents = source.agents.filter(a => a.critical).length;
  let criticality: any = 'LOW';
  if (criticalAgents > 5 || source.agents.some(a => a.riskLevel === 'critical')) criticality = 'CRITICAL';
  else if (criticalAgents > 2 || source.agents.some(a => a.riskLevel === 'high')) criticality = 'HIGH';
  else if (criticalAgents > 0) criticality = 'MODERATE';

  return { intendedUse, criticality };
}

function detectBcbUseCase(source: SourceAnalysis): 'CREDIT_ANALYSIS' | 'FRAUD_DETECTION' | 'CUSTOMER_SERVICE' | 'DECISION_SUPPORT' {
  const allText = [
    ...source.databaseTables,
    ...source.dataAssets.map(d => d.name),
    ...source.externalServices.map(s => s.name),
  ].join(' ');

  if (/credit|credito|scoring|emprestimo/i.test(allText)) return 'CREDIT_ANALYSIS';
  if (/fraud|fraude|anti.?fraude/i.test(allText)) return 'FRAUD_DETECTION';
  if (/customer|atendimento|suporte|chatbot|help/i.test(allText)) return 'CUSTOMER_SERVICE';
  return 'DECISION_SUPPORT';
}

export async function analyzeCompliance(pkg: PackageAnalysis, source: SourceAnalysis, risks: DetectedRisk[], config: ConfigAnalysis): Promise<ComplianceAnalysis> {
  const regulations: ApplicableRegulation[] = [];
  const domain = detectDomain(source);
  const autonomyLevel = detectAutonomyLevel(source);

  const gdprManager = new GDPRComplianceManager();
  const lgpdManager = new LGPDComplianceManager();
  const bcbManager = new BCB4893Compliance();
  const anvisaManager = new AnvisaComplianceManager();

  // ── GDPR (EU) 2016/679 ────────────────────────────────
  {
    const gdprGaps: string[] = [];
    const gdprEvidence: string[] = [];

    if (source.dataAssets.some(d => d.hasPII)) {
      gdprEvidence.push('Dados pessoais identificados no escopo');

      if (source.authPatterns.some(a => /consent/i.test(a))) {
        gdprEvidence.push('Mecanismo de consentimento detectado');
      } else {
        gdprGaps.push('Ausência de coleta de consentimento explícito (Art. 7)');
      }

      if (source.databaseTables.some(t => /erasure|delete|withdraw/i.test(t))) {
        gdprEvidence.push('Mecanismo de apagamento detectado');
      } else {
        gdprGaps.push('Direito ao apagamento não implementado (Art. 17)');
      }
    } else {
      gdprGaps.push('Nenhum dado pessoal mapeado formalmente');
    }

    regulations.push({
      id: 'reg-gdpr',
      name: 'GDPR (EU) 2016/679',
      authority: 'EU',
      status: gdprGaps.length === 0 ? 'compliant' : gdprGaps.length > 2 ? 'non_compliant' : 'partial',
      requirements: ['Consentimento (Art. 7)', 'DPIA (Art. 35)', 'Portabilidade (Art. 20)', 'Apagamento (Art. 17)'],
      evidenceFound: gdprEvidence,
      gaps: gdprGaps,
    });
  }

  // ── LGPD 13.709/2018 ─────────────────────────────────
  {
    const lgpdGaps: string[] = [];
    const lgpdEvidence: string[] = [];

    if (source.dataAssets.some(d => d.hasPII)) {
      lgpdEvidence.push('Dados pessoais identificados');

      const foundBasis = source.dataAssets
        .flatMap(d => d.legalBasis)
        .find(b => lgpdManager.validateLegalBasis(b as any, domain === 'healthcare' ? 'healthcare' : domain === 'finance' ? 'finance' : 'general'));

      if (foundBasis) {
        lgpdEvidence.push(`Base legal validada: ${foundBasis}`);
      } else {
        lgpdGaps.push('Base legal não documentada ou inválida para o domínio (Art. 7)');
      }
    }

    regulations.push({
      id: 'reg-lgpd',
      name: 'LGPD 13.709/2018',
      authority: 'ANPD',
      status: lgpdGaps.length === 0 ? 'compliant' : lgpdGaps.length > 2 ? 'non_compliant' : 'partial',
      requirements: ['Base legal (Art. 7)', 'Consentimento (Art. 8)', 'RIPD (Art. 38)', 'Direitos titular (Art. 18)'],
      evidenceFound: lgpdEvidence,
      gaps: lgpdGaps,
    });
  }

  // ── EU AI Act 2024/1689 ──────────────────────────────
  {
    const aiGaps: string[] = [];
    const aiEvidence: string[] = [];

    if (source.aiModels.length > 0 || source.agents.length > 0) {
      const aiRisk = gdprManager.classifyAIRisk(domain === 'general' ? 'corporate' : domain, autonomyLevel);
      aiEvidence.push(`Classificação AI Act: ${aiRisk.riskClass} (domínio: ${domain}, autonomia: ${autonomyLevel})`);
      aiEvidence.push(...aiRisk.transparencyObligations.slice(0, 2).map(o => `Obrigação: ${o}`));

      if (aiRisk.humanOversight) aiEvidence.push('Supervisão humana exigida e configurada');
      else aiGaps.push('Supervisão humana não configurada (Art. 14)');

      if (aiRisk.conformityAssessment) {
        aiEvidence.push('Avaliação de conformidade exigida');
      } else {
        aiGaps.push('Avaliação de conformidade não documentada (Art. 43)');
      }
    } else {
      aiGaps.push('Nenhum sistema de IA detectado para classificação');
    }

    regulations.push({
      id: 'reg-ai-act',
      name: 'EU AI Act 2024/1689',
      authority: 'EU',
      status: aiGaps.length === 0 ? 'compliant' : aiGaps.length > 2 ? 'non_compliant' : 'partial',
      requirements: ['Classificação risco (Art. 6)', 'Transparência (Art. 13)', 'Supervisão humana (Art. 14)', 'Avaliação conformidade (Art. 43)'],
      evidenceFound: aiEvidence,
      gaps: aiGaps,
    });
  }

  // ── DORA (EU) 2022/2554 ──────────────────────────────
  {
    const doraGaps: string[] = [];
    const doraEvidence: string[] = [];

    const hasIctDeps = pkg.cloudDependencies.length > 0 || pkg.aiDependencies.length > 0 || Object.keys(pkg.dependencies).length > 10;
    const isFinancial = /\b(bank|payment|credit|debit|seguro|insurance|finance|financ|transaction|invest|BACEN|PIX|TED)\b/i.test(
      [...source.databaseTables, ...source.dataAssets.map(d => d.name), ...source.externalServices.map(s => s.name)].join(' ')
    );
    const isHealthcare = domain === 'healthcare';
    const doraApplicable = isFinancial || isHealthcare;

    if (doraApplicable) {
      if (hasIctDeps) {
        doraEvidence.push(`Dependências ICT: ${[...pkg.cloudDependencies, ...pkg.aiDependencies].join(', ')}`);
      } else {
        doraGaps.push('Sem dependências ICT detectadas — DORA Art. 8 requer inventário de ativos ICT');
      }

      if (source.agents.some(a => a.critical || a.riskLevel === 'high')) {
        doraEvidence.push('Agentes críticos/de alto risco identificados — DORA Art. 8(1) requer classificação de função ICT');
      } else {
        doraGaps.push('Nenhum agente crítico identificado — possível falha no inventário DORA Art. 8');
      }

      if (source.databaseTables.some(t => /audit|log/i.test(t)) || source.authPatterns.some(a => /audit|log|trace/i.test(a))) {
        doraEvidence.push('Mecanismo de auditoria detectado — DORA Art. 10(1) rastreabilidade');
      } else {
        doraGaps.push('Sem audit trail detectado — DORA Art. 10(1) requer rastreabilidade de registros ICT');
      }

      if (source.authPatterns.some(a => /backup|disaster|recovery|failover|resilien|redundan/i.test(a))) {
        doraEvidence.push('Mecanismos de resiliência detectados — DORA Art. 11 resiliência operacional');
      } else {
        doraGaps.push('Sem resiliência operacional detectada — DORA Art. 11 requer planos de continuidade');
      }

      if (source.databaseTables.some(t => /incident|reporting|notific|breach/i.test(t))) {
        doraEvidence.push('Tabelas de incidentes detectadas — DORA Art. 19 gestão de reporting');
      } else {
        doraGaps.push('Sem gestão de incidentes — DORA Art. 19 requer processo de notificação (4h/72h/1mês)');
      }

      if (source.externalServices.length > 0) {
        doraEvidence.push(`Serviços terceiros: ${source.externalServices.map(s => s.name).join(', ')} — DORA Art. 28 requer supervisão de TPP`);
      } else {
        doraGaps.push('Sem supervisão de terceiros — DORA Art. 28 requer registro de provedores ICT');
      }

      if (source.databaseTables.some(t => /test|pen.?test|pentest|resilien.*test/i.test(t)) || config.hasCICD) {
        doraEvidence.push('Testes detectados — DORA Art. 24 programa de testes de resiliência');
      } else {
        doraGaps.push('Sem testes de resiliência — DORA Art. 24 requer programa de testes periódico');
      }
    }

    const compliantStatus = !doraApplicable ? 'not_applicable'
      : doraGaps.length === 0 ? 'compliant'
      : doraGaps.length > 3 ? 'non_compliant'
      : 'partial';

    regulations.push({
      id: 'reg-dora',
      name: 'DORA (EU) 2022/2554',
      authority: 'EU',
      status: compliantStatus,
      requirements: ['ICT Risk Management (Art. 6)', 'ICT Asset Inventory (Art. 8)', 'Resilience Testing (Art. 24)', 'Incident Reporting (Art. 19)', 'Third-party Oversight (Art. 28)', 'Digital Operational Resilience (Art. 11)'],
      evidenceFound: doraEvidence,
      gaps: doraGaps,
    });
  }

  // ── BCB Res. 4893/2023 ──────────────────────────────
  {
    const bcbGaps: string[] = [];
    const bcbEvidence: string[] = [];

    if (domain === 'finance' && source.aiModels.length > 0) {
      const bcbUseCase = detectBcbUseCase(source);
      const bcbGovernance = await bcbManager.validateGovernance(
        pkg.name || 'unknown',
        bcbUseCase,
        {
          institutionType: 'OTHER',
          hasModelRiskPolicy: source.agents.some(a => a.critical),
          hasIndependentValidation: source.agents.length > 2,
        },
      );
      bcbEvidence.push(`Caso de uso: ${bcbUseCase}`);
      bcbEvidence.push(`Classificação risco modelo: ${bcbGovernance.riskClassification}`);
      bcbEvidence.push(`Nível explicabilidade: ${bcbGovernance.explainabilityLevel}`);
      if (bcbGovernance.boardApproved) bcbEvidence.push('Aprovação de board: detectada');
      if (bcbGovernance.auditTrail) bcbEvidence.push('Audit trail: detectado');

      if (!bcbGovernance.testingValidation) bcbGaps.push('Validação independente não detectada');
      if (!bcbGovernance.humanOversight) bcbGaps.push('Supervisão humana não configurada');
    } else {
      bcbGaps.push('Domínio não financeiro — BCB 4893 não aplicável');
    }

    regulations.push({
      id: 'reg-bcb-4893',
      name: 'BCB Resolução 4893/2023',
      authority: 'BCB',
      status: bcbGaps.length === 0 ? 'compliant' : bcbGaps.length > 2 ? 'non_compliant' : 'partial',
      requirements: ['Governança de modelos', 'Explicabilidade', 'Audit trail', 'Gestão de risco modelo'],
      evidenceFound: bcbEvidence,
      gaps: bcbGaps,
    });
  }

  // ── ANVISA RDC 677/2022 (SaMD) ──────────────────────
  {
    const anvisaGaps: string[] = [];
    const anvisaEvidence: string[] = [];

    if (domain === 'healthcare' && source.aiModels.length > 0) {
      const { intendedUse, criticality } = detectAnvisaParameters(source);
      const samdClass = anvisaManager.classifySAMd(intendedUse, criticality);
      anvisaEvidence.push(`Classificação SaMD: Classe ${samdClass.class} (Regra ${samdClass.rule})`);
      anvisaEvidence.push(`Uso pretendido: ${intendedUse}, Criticalidade: ${criticality}`);
      if (samdClass.registrationRequired) anvisaEvidence.push('Registro ANVISA: obrigatório');
      if (samdClass.bgmRequired) anvisaEvidence.push('BGM: obrigatório');
      if (samdClass.clinicalEvaluationRequired) anvisaEvidence.push('Avaliação clínica: obrigatória');

      if (samdClass.registrationRequired) anvisaGaps.push('Registro ANVISA não verificado');
      if (samdClass.clinicalEvaluationRequired) anvisaGaps.push('Plano de avaliação clínica não detectado');
    } else {
      anvisaGaps.push('Domínio não healthcare — ANVISA SaMD não aplicável');
    }

    regulations.push({
      id: 'reg-anvisa',
      name: 'ANVISA RDC 677/2022 (SaMD)',
      authority: 'ANVISA',
      status: anvisaGaps.length === 0 ? 'compliant' : anvisaGaps.length > 2 ? 'non_compliant' : 'partial',
      requirements: ['Classificação SaMD', 'Registro ANVISA', 'BGM (Boas Práticas)', 'Avaliação clínica'],
      evidenceFound: anvisaEvidence,
      gaps: anvisaGaps,
    });
  }

  // ── CCPA/CPRA (California) ──────────────────────────
  {
    const ccpaGaps: string[] = [];
    const ccpaEvidence: string[] = [];

    if (source.dataAssets.some(d => d.hasPII)) {
      ccpaEvidence.push('Dados pessoais identificados — CCPA aplicável');
      if (source.databaseTables.some(t => /sell|share|ad_network|third_party/i.test(t))) {
        ccpaEvidence.push('Indicadores de compartilhamento/venda de dados detectados');
      } else {
        ccpaGaps.push('Direito de opt-out de venda de dados não verificado (CCPA §1798.120)');
      }
      if (source.databaseTables.some(t => /deletion|erasure|delete_request/i.test(t))) {
        ccpaEvidence.push('Mecanismo de deleção de dados detectado');
      } else {
        ccpaGaps.push('Direito de deleção não implementado (CCPA §1798.105)');
      }
    } else {
      ccpaGaps.push('Nenhum dado pessoal detectado — CCPA pode não ser aplicável');
    }

    regulations.push({
      id: 'reg-ccpa',
      name: 'CCPA/CPRA (California)',
      authority: 'CCPA',
      status: ccpaGaps.length === 0 ? 'compliant' : ccpaGaps.length > 2 ? 'non_compliant' : 'partial',
      requirements: ['Right to Know (§1798.100)', 'Right to Delete (§1798.105)', 'Opt-Out of Sale (§1798.120)', 'Non-Discrimination (§1798.125)'],
      evidenceFound: ccpaEvidence,
      gaps: ccpaGaps,
    });
  }

  // ── HIPAA (US Healthcare) ───────────────────────────
  {
    const hipaaGaps: string[] = [];
    const hipaaEvidence: string[] = [];

    if (domain === 'healthcare') {
      hipaaEvidence.push('Domínio healthcare detectado — HIPAA aplicável');
      if (source.dataAssets.some(d => /patient|medical|clinical|health|diagnosis|treatment/i.test(d.name))) {
        hipaaEvidence.push('PHI (Protected Health Information) identificada');
      } else {
        hipaaGaps.push('PHI não formalmente identificada (HIPAA Privacy Rule)');
      }
      if (source.authPatterns.some(a => /encrypt|secure|hipaa|baa/i.test(a))) {
        hipaaEvidence.push('Medidas de segurança detectadas');
      } else {
        hipaaGaps.push('Medidas de segurança administrativas/técnicas não verificadas (HIPAA Security Rule)');
      }
    } else {
      hipaaGaps.push('Domínio não healthcare — HIPAA não aplicável');
    }

    regulations.push({
      id: 'reg-hipaa',
      name: 'HIPAA (US Health Insurance Portability and Accountability Act)',
      authority: 'HHS',
      status: hipaaGaps.length === 0 ? 'compliant' : hipaaGaps.length > 2 ? 'non_compliant' : 'partial',
      requirements: ['Privacy Rule (45 CFR §164.500)', 'Security Rule (45 CFR §164.300)', 'Breach Notification Rule (45 CFR §164.400)', 'Omnibus Rule'],
      evidenceFound: hipaaEvidence,
      gaps: hipaaGaps,
    });
  }

  // ── PCI-DSS (Payment Card Industry) ────────────────
  {
    const pciGaps: string[] = [];
    const pciEvidence: string[] = [];

    if (pkg.paymentDependencies.length > 0 || source.dataAssets.some(d => /card|payment|credit|debit|stripe|pci/i.test(d.name))) {
      pciEvidence.push('Dependências/dados de pagamento detectados');
      if (source.authPatterns.some(a => /encrypt|token/i.test(a))) {
        pciEvidence.push('Criptografia ou tokenização detectada');
      } else {
        pciGaps.push('Criptografia de dados do portador não verificada (Req. 3.4)');
      }
      if (source.databaseTables.some(t => /audit|log/i.test(t))) {
        pciEvidence.push('Audit logs detectados');
      } else {
        pciGaps.push('Audit trail de acesso a dados não verificado (Req. 10)');
      }
    } else {
      pciGaps.push('Nenhum dado de pagamento detectado — PCI-DSS pode não ser aplicável');
    }

    regulations.push({
      id: 'reg-pci-dss',
      name: 'PCI-DSS (Payment Card Industry Data Security Standard)',
      authority: 'PCI SSC',
      status: pciGaps.length === 0 ? 'compliant' : pciGaps.length > 2 ? 'non_compliant' : 'partial',
      requirements: ['Secure Network (Req. 1-2)', 'Protect Cardholder Data (Req. 3-4)', 'Vulnerability Management (Req. 5-6)', 'Access Control (Req. 7-9)', 'Monitoring (Req. 10)', 'Policy (Req. 12)'],
      evidenceFound: pciEvidence,
      gaps: pciGaps,
    });
  }

  // ── ISO/IEC 42001:2023 — AI Management System ──────────
  {
    const aimsGaps: string[] = [];
    const aimsEvidence: string[] = [];

    if (source.aiModels.length > 0 || source.agents.length > 0) {
      if (source.frameworks.length > 0 || source.apiRoutes.length > 0) {
        aimsEvidence.push(`Contexto da organização mapeado: ${source.frameworks.join(', ')} frameworks, ${source.apiRoutes.length} rotas`);
      } else {
        aimsGaps.push('Escopo do sistema de IA não definido (ISO 42001 Cláusula 4)');
      }

      if (source.agents.some(a => a.critical || a.riskLevel === 'critical')) {
        aimsEvidence.push('Liderança de IA detectada: agente crítico presente');
      } else {
        aimsGaps.push('Política de IA e responsabilidades não documentadas (ISO 42001 Cláusula 5)');
      }

      if (risks.some(r => r.severity === 'critical' || r.severity === 'high')) {
        aimsEvidence.push(`${risks.filter(r => r.severity === 'critical' || r.severity === 'high').length} riscos críticos/altos identificados — base para planejamento`);
      }
      if (source.aiModels.length > 0) {
        aimsEvidence.push(`${source.aiModels.length} modelo(s) de IA documentado(s) — base para objetivos de IA`);
      } else {
        aimsGaps.push('Objetivos de IA não documentados (ISO 42001 Cláusula 6)');
      }

      if (pkg.aiDependencies.length > 0) {
        aimsEvidence.push(`Dependências de IA: ${pkg.aiDependencies.join(', ')} — recursos de suporte identificados`);
      } else {
        aimsGaps.push('Competência e suporte não documentados (ISO 42001 Cláusula 7)');
      }

      if (source.authPatterns.some(a => /bias|fairness|ethics|quality/i.test(a)) || source.fileTree.some(f => /fairness|bias|ethics/i.test(f))) {
        aimsEvidence.push('Mitigação de viés/qualidade de dados detectada');
      } else {
        aimsGaps.push('Operação, qualidade de dados e mitigação de viés não verificados (ISO 42001 Cláusula 8)');
      }

      if (source.authPatterns.some(a => /monitor|audit|review|metric/i.test(a)) || source.databaseTables.some(t => /monitor|audit|metric/i.test(t))) {
        aimsEvidence.push('Monitoramento e auditoria de desempenho detectados');
      } else {
        aimsGaps.push('Avaliação de desempenho e auditoria não detectadas (ISO 42001 Cláusula 9)');
      }

      if (source.databaseTables.some(t => /incident|corrective|improvement|nonconform/i.test(t)) || pkg.hasTestFramework) {
        aimsEvidence.push('Mecanismos de melhoria contínua detectados');
      } else {
        aimsGaps.push('Melhoria contínua não documentada (ISO 42001 Cláusula 10)');
      }
    } else {
      aimsGaps.push('Nenhum sistema de IA detectado — ISO 42001 não aplicável');
    }

    regulations.push({
      id: 'reg-iso-42001',
      name: 'ISO/IEC 42001:2023 — AI Management System (AIMS)',
      authority: 'ISO/IEC',
      status: aimsGaps.length === 0 ? 'compliant' : aimsGaps.length > 3 ? 'non_compliant' : 'partial',
      requirements: ['Contexto (Cl. 4)', 'Liderança (Cl. 5)', 'Planejamento (Cl. 6)', 'Suporte (Cl. 7)', 'Operação (Cl. 8)', 'Avaliação (Cl. 9)', 'Melhoria (Cl. 10)'],
      evidenceFound: aimsEvidence,
      gaps: aimsGaps,
    });
  }

  // ── ISO/IEC 23894:2023 — AI Risk Management ────────────
  {
    const aiRiskGaps: string[] = [];
    const aiRiskEvidence: string[] = [];

    if (source.aiModels.length > 0 || source.agents.length > 0) {
      if (risks.filter(r => r.severity === 'critical' || r.severity === 'high').length > 0) {
        aiRiskEvidence.push(`Riscos identificados: ${risks.filter(r => r.severity === 'critical' || r.severity === 'high').length} críticos/altos`);
      } else {
        aiRiskGaps.push('Identificação de riscos não documentada (ISO 23894 Seção 6.3)');
      }

      const riskAnalysis = risks.map(r => r.severity);
      if (riskAnalysis.length > 0) {
        const c = riskAnalysis.filter(s => s === 'critical').length;
        const h = riskAnalysis.filter(s => s === 'high').length;
        const m = riskAnalysis.filter(s => s === 'medium').length;
        aiRiskEvidence.push(`Análise de riscos: ${c} críticos, ${h} altos, ${m} médios`);
      } else {
        aiRiskGaps.push('Análise de riscos não realizada (ISO 23894 Seção 6.4)');
      }

      if (source.agents.some(a => a.critical || a.riskLevel === 'high')) {
        aiRiskEvidence.push('Agentes de alto risco identificados — avaliação de criticidade realizada');
      } else {
        aiRiskGaps.push('Avaliação de riscos não documentada (ISO 23894 Seção 6.5)');
      }

      const hasMitigation = source.authPatterns.some(a => /encrypt|token|secure|protect|sanitize|redact/i.test(a));
      const hasRedaction = source.fileTree.some(f => /redact|sanitize|anonymize/i.test(f));
      if (hasMitigation || hasRedaction) {
        aiRiskEvidence.push('Medidas de tratamento de riscos detectadas');
      } else {
        aiRiskGaps.push('Tratamento de riscos não documentado (ISO 23894 Seção 6.6)');
      }

      if (source.databaseTables.some(t => /audit|log|monitor|track/i.test(t)) || source.authPatterns.some(a => /monitor|audit|review/i.test(a))) {
        aiRiskEvidence.push('Monitoramento e revisão contínua de riscos detectados');
      } else {
        aiRiskGaps.push('Monitoramento de riscos não configurado (ISO 23894 Seção 6.7)');
      }

      if (source.agents.length > 1) {
        aiRiskEvidence.push(`${source.agents.length} agentes identificados — base para consulta de riscos`);
      } else {
        aiRiskGaps.push('Comunicação de riscos não documentada (ISO 23894 Seção 6.2)');
      }

      if (autonomyLevel !== 'ASSISTED') {
        aiRiskEvidence.push(`Nível de autonomia: ${autonomyLevel} — risco operacional avaliado`);
      }
      if (source.dataAssets.some(d => d.hasPII)) {
        aiRiskEvidence.push('Dados pessoais processados — risco de privacidade identificado');
      }
      if (source.externalServices.length > 0) {
        aiRiskEvidence.push(`${source.externalServices.length} serviço(s) terceiro(s) — risco de dependência externa identificado`);
      }
    } else {
      aiRiskGaps.push('Nenhum sistema de IA detectado — ISO 23894 não aplicável');
    }

    regulations.push({
      id: 'reg-iso-23894',
      name: 'ISO/IEC 23894:2023 — AI Risk Management',
      authority: 'ISO/IEC',
      status: aiRiskGaps.length === 0 ? 'compliant' : aiRiskGaps.length > 3 ? 'non_compliant' : 'partial',
      requirements: ['Identificação riscos (Seç. 6.3)', 'Análise riscos (Seç. 6.4)', 'Avaliação riscos (Seç. 6.5)', 'Tratamento riscos (Seç. 6.6)', 'Monitoramento (Seç. 6.7)', 'Comunicação (Seç. 6.2)'],
      evidenceFound: aiRiskEvidence,
      gaps: aiRiskGaps,
    });
  }

  // ── ISO/IEC 27001:2022 — Information Security Management ──
  {
    const iso27Gaps: string[] = [];
    const iso27Evidence: string[] = [];

    // Annex A controls grouped by domain
    const hasAccessControl = source.authPatterns.some(a => /auth|login|rbac|role|permission|oauth|jwt|session/i.test(a));
    const hasCryptography = source.authPatterns.some(a => /encrypt|hash|bcrypt|argon|aes|sha|hmac|tls|ssl/i.test(a));
    const hasAuditLogging = source.databaseTables.some(t => /audit|log|trail/i.test(t)) || source.authPatterns.some(a => /audit|log|trace/i.test(a));
    const hasBackup = source.authPatterns.some(a => /backup|recovery|disaster|failover|redundan/i.test(a));
    const hasCICD = config.hasCICD || Object.values(pkg.scripts).some(s => /test|lint|build|check|deploy/i.test(s));
    const hasVulnerabilityScan = source.fileTree.some(f => /dependabot|snyk|renovate|security|audit|vuln/i.test(f)) || Object.keys(pkg.dependencies).length > 0;
    const hasIncidentResponse = source.databaseTables.some(t => /incident|breach|notific|reporting/i.test(t));
    const hasAssetInventory = source.dataAssets.length > 0 || source.externalServices.length > 0;

    // A.5 — Information Security Policies
    if (source.agents.length > 0 || source.aiModels.length > 0) {
      iso27Evidence.push('Sistemas de IA identificados — políticas de segurança aplicáveis');
    }

    // A.6 — Organization of Information Security
    if (source.agents.some(a => a.critical)) {
      iso27Evidence.push('Agentes críticos — responsabilidades de segurança definidas');
    }

    // A.7 — Human Resource Security
    if (source.agents.length > 0) {
      iso27Evidence.push(`${source.agents.length} agente(s) identificado(s) — responsabilidades de segurança`);
    }

    // A.8 — Asset Management
    if (hasAssetInventory) {
      iso27Evidence.push(`Inventário de ativos: ${source.dataAssets.length} ativos de dados, ${source.externalServices.length} serviços externos`);
    } else {
      iso27Gaps.push('Inventário de ativos não detectado (ISO 27001 A.8)');
    }

    // A.9 — Access Control
    if (hasAccessControl) {
      iso27Evidence.push('Controle de acesso detectado');
    } else {
      iso27Gaps.push('Controle de acesso não verificado (ISO 27001 A.9)');
    }

    // A.10 — Cryptography
    if (hasCryptography) {
      iso27Evidence.push('Criptografia detectada');
    } else {
      iso27Gaps.push('Criptografia não detectada (ISO 27001 A.10)');
    }

    // A.12 — Operations Security
    if (hasVulnerabilityScan || hasCICD) {
      iso27Evidence.push('Segurança operacional detectada');
      if (hasCICD) iso27Evidence.push('Pipeline CI/CD — proteção do ambiente de produção');
    } else {
      iso27Gaps.push('Segurança operacional e proteção contra malware não verificadas (ISO 27001 A.12)');
    }

    // A.16 — Incident Management
    if (hasIncidentResponse) {
      iso27Evidence.push('Gestão de incidentes detectada');
    } else {
      iso27Gaps.push('Gestão de incidentes de segurança não detectada (ISO 27001 A.16)');
    }

    // A.17 — Business Continuity
    if (hasBackup) {
      iso27Evidence.push('Continuidade de negócio detectada');
    } else {
      iso27Gaps.push('Continuidade de negócio não verificada (ISO 27001 A.17)');
    }

    // A.18 — Compliance
    if (source.dataAssets.some(d => d.hasPII)) {
      iso27Evidence.push('Dados pessoais identificados — conformidade com requisitos legais');
    }

    regulations.push({
      id: 'reg-iso-27001',
      name: 'ISO/IEC 27001:2022 — Information Security Management (ISMS)',
      authority: 'ISO/IEC',
      status: iso27Gaps.length === 0 ? 'compliant' : iso27Gaps.length > 3 ? 'non_compliant' : 'partial',
      requirements: ['Políticas segurança (A.5)', 'Controle acesso (A.9)', 'Criptografia (A.10)', 'Segurança operacional (A.12)', 'Gestão incidentes (A.16)', 'Continuidade negócio (A.17)', 'Conformidade (A.18)'],
      evidenceFound: iso27Evidence,
      gaps: iso27Gaps,
    });
  }

  // ── OWASP Top 10:2021 — Application Security ──────────
  {
    const owaspGaps: string[] = [];
    const owaspEvidence: string[] = [];

    const riskIds = risks.map(r => r.id);
    const riskTitles = risks.map(r => r.title);

    // Map OWASP categories to detection patterns
    const owaspChecks: { id: string; name: string; pattern: RegExp }[] = [
      { id: 'A01', name: 'Broken Access Control', pattern: /A01|BROKEN_ACCESS|IDOR|route.*no.*auth|access.*control/i },
      { id: 'A02', name: 'Cryptographic Failures', pattern: /A02|WEAK_HASH|ECB|JWT_SECRET|HTTP_URL|WEAK_RNG|crypt.*fail/i },
      { id: 'A03', name: 'Injection', pattern: /A03|SQLI|CMD_INJECTION|NOSQL|EVAL|SSTI|PATH_TRAVERSAL|XSS/i },
      { id: 'A04', name: 'Insecure Design', pattern: /A04|NO_VALIDATION|insecure.*design/i },
      { id: 'A05', name: 'Security Misconfiguration', pattern: /A05|CORS|DEBUG_MODE|DEFAULT_CREDENTIALS|misconfig/i },
      { id: 'A06', name: 'Vulnerable & Outdated Components', pattern: /A06|VULN_DEP|DEPRECATED_DEP/i },
      { id: 'A07', name: 'Identification & Auth Failures', pattern: /A07|TOKEN_IN_URL|WEAK_JWT|auth.*fail/i },
      { id: 'A08', name: 'Software & Data Integrity Failures', pattern: /A08|DESERIALIZATION|YAML|PROTOTYPE|ENV_CHECK|prototype.*pollution/i },
      { id: 'A09', name: 'Security Logging & Monitoring Failures', pattern: /A09|SENSITIVE_LOG/i },
      { id: 'A10', name: 'Server-Side Request Forgery (SSRF)', pattern: /A10|SSRF|REDIRECT/i },
    ];

    for (const check of owaspChecks) {
      const found = riskTitles.some(t => check.pattern.test(t)) || riskIds.some(id => check.pattern.test(id));
      if (found) {
        const count = risks.filter(r => check.pattern.test(r.title) || check.pattern.test(r.id)).length;
        owaspEvidence.push(`${check.id}: ${check.name} — ${count} ocorrência(s) detectada(s)`);
      } else {
        owaspGaps.push(`${check.id}: ${check.name} — não testado/coberto`);
      }
    }

    regulations.push({
      id: 'reg-owasp-top10',
      name: 'OWASP Top 10:2021 — Application Security Risk',
      authority: 'OWASP',
      status: owaspGaps.length === 0 ? 'compliant' : owaspGaps.length > 5 ? 'non_compliant' : 'partial',
      requirements: owaspChecks.map(c => `${c.id}: ${c.name}`),
      evidenceFound: owaspEvidence,
      gaps: owaspGaps,
    });
  }

  // ── Calculate overall score (evidence-based governance score) ──
  // Rewards evidence, compliance, and certification; penalizes risks moderately
  const riskDeductions: Record<string, number> = {
    critical: 3,
    high: 2,
    medium: 1,
    low: 0,
    info: 0,
  };

  let riskScore = 100;
  for (const risk of risks) {
    riskScore -= riskDeductions[risk.severity] ?? 0;
  }
  riskScore = Math.max(20, Math.min(100, riskScore));

  const totalRegs = regulations.length;
  const applicableRegs = regulations.filter(r => r.status !== 'not_applicable');
  const totalApplicable = applicableRegs.length;
  const compliantRegs = applicableRegs.filter(r => r.status === 'compliant').length;
  const partialRegs = applicableRegs.filter(r => r.status === 'partial').length;
  const regScore = totalApplicable > 0 ? ((compliantRegs * 100 + partialRegs * 50) / (totalApplicable * 100)) * 100 : 60;

  // Evidence density: how many regulations have evidence vs gaps
  const evidenceItems = applicableRegs.filter(r => r.evidenceFound.length > 0);
  const regsWithGaps = applicableRegs.filter(r => r.gaps.length > 0);
  const evidenceScore = totalApplicable > 0
    ? Math.round(Math.min(100, (evidenceItems.length / totalApplicable) * 60 + (1 - regsWithGaps.length / Math.max(1, totalApplicable)) * 40))
    : 50;

  // Certification proxy: based on regulation compliance + evidence coverage
  const pctCompliant = totalApplicable > 0 ? compliantRegs / totalApplicable : 0;
  const pctWithEvidence = totalApplicable > 0 ? evidenceItems.length / totalApplicable : 0;
  const proxyCertScore = pctCompliant > 0.6 && pctWithEvidence > 0.5 ? 40
    : pctCompliant > 0.3 && pctWithEvidence > 0.2 ? 25
    : pctCompliant > 0.1 || pctWithEvidence > 0.1 ? 15
    : 5;

  // Weighted composite: risk (20%) + regulation (30%) + evidence (30%) + certification proxy (20%)
  const score = Math.round((riskScore * 0.20) + (regScore * 0.30) + (evidenceScore * 0.30) + (proxyCertScore * 0.20));

  return {
    applicableRegulations: regulations,
    overallScore: score,
    summary: `${compliantRegs}/${totalRegs} regulamentações conformes. Score de governança: ${score}/100. Domínio: ${domain}.`,
  };
}
