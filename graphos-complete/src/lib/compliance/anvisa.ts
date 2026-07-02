export interface AnvisaSAMdClassification {
  class: 'I' | 'II' | 'III' | 'IV';
  rule: number;
  ruleDescription: string;
  registrationRequired: boolean;
  bgmRequired: boolean;
  clinicalEvaluationRequired: boolean;
}

export interface AnvisaValidationProtocol {
  protocolNumber: string;
  methodDescription: string;
  validationParameters: {
    selectivity: boolean;
    linearity: boolean;
    precision: boolean;
    accuracy: boolean;
    robustness: boolean;
  };
}

type AnvisaIntendedUse = 'DIAGNOSIS' | 'TREATMENT' | 'MONITORING' | 'DECISION_SUPPORT' | 'SCREENING';
type AnvisaCriticality = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
type AnvisaTargetAudience = 'GENERAL' | 'PROFESSIONAL';

const SAMD_CLASSIFICATION_MATRIX: Record<AnvisaIntendedUse, Record<AnvisaCriticality, Omit<AnvisaSAMdClassification, 'clinicalEvaluationRequired'>>> = {
  SCREENING: {
    LOW:      { class: 'I',  rule: 12, ruleDescription: 'Triagem de baixo risco para profissionais', registrationRequired: false, bgmRequired: false },
    MODERATE: { class: 'II', rule: 11, ruleDescription: 'Triagem de risco moderado', registrationRequired: true, bgmRequired: false },
    HIGH:     { class: 'III', rule: 6,  ruleDescription: 'Triagem de alto risco com impacto diagnóstico', registrationRequired: true, bgmRequired: true },
    CRITICAL: { class: 'III', rule: 3,  ruleDescription: 'Triagem com risco crítico ao paciente', registrationRequired: true, bgmRequired: true },
  },
  DIAGNOSIS: {
    LOW:      { class: 'II', rule: 10, ruleDescription: 'Diagnóstico auxiliar de baixo risco', registrationRequired: true, bgmRequired: false },
    MODERATE: { class: 'II', rule: 7,  ruleDescription: 'Diagnóstico com risco moderado de erro', registrationRequired: true, bgmRequired: false },
    HIGH:     { class: 'III', rule: 3,  ruleDescription: 'Diagnóstico determinante para conduta', registrationRequired: true, bgmRequired: true },
    CRITICAL: { class: 'IV', rule: 1,  ruleDescription: 'Diagnóstico crítico com risco de morte', registrationRequired: true, bgmRequired: true },
  },
  TREATMENT: {
    LOW:      { class: 'II', rule: 9,  ruleDescription: 'Recomendação terapêutica auxiliar', registrationRequired: true, bgmRequired: false },
    MODERATE: { class: 'III', rule: 4,  ruleDescription: 'Direcionamento terapêutico moderado', registrationRequired: true, bgmRequired: true },
    HIGH:     { class: 'III', rule: 3,  ruleDescription: 'Direcionamento terapêutico de alto risco', registrationRequired: true, bgmRequired: true },
    CRITICAL: { class: 'IV', rule: 2,  ruleDescription: 'Decisão terapêutica automatizada', registrationRequired: true, bgmRequired: true },
  },
  MONITORING: {
    LOW:      { class: 'I',  rule: 12, ruleDescription: 'Monitoramento não-invasivo contínuo', registrationRequired: false, bgmRequired: false },
    MODERATE: { class: 'II', rule: 8,  ruleDescription: 'Monitoramento com alerta de alteração', registrationRequired: true, bgmRequired: false },
    HIGH:     { class: 'III', rule: 5,  ruleDescription: 'Monitoramento com intervenção sugerida', registrationRequired: true, bgmRequired: true },
    CRITICAL: { class: 'III', rule: 3,  ruleDescription: 'Monitoramento de parâmetros críticos', registrationRequired: true, bgmRequired: true },
  },
  DECISION_SUPPORT: {
    LOW:      { class: 'I',  rule: 12, ruleDescription: 'Suporte à decisão não-clínico', registrationRequired: false, bgmRequired: false },
    MODERATE: { class: 'II', rule: 11, ruleDescription: 'Suporte à decisão com interpretação', registrationRequired: true, bgmRequired: false },
    HIGH:     { class: 'III', rule: 4,  ruleDescription: 'Suporte à decisão clínica de alto risco', registrationRequired: true, bgmRequired: true },
    CRITICAL: { class: 'IV', rule: 1,  ruleDescription: 'Substituição de julgamento clínico', registrationRequired: true, bgmRequired: true },
  },
};

function needsClinicalEval(cls: AnvisaSAMdClassification['class']): boolean {
  return cls === 'III' || cls === 'IV';
}

export class AnvisaComplianceManager {
  classifySAMd(
    intendedUse: AnvisaIntendedUse,
    criticality: AnvisaCriticality,
    targetAudience?: AnvisaTargetAudience,
  ): AnvisaSAMdClassification {
    const base = SAMD_CLASSIFICATION_MATRIX[intendedUse][criticality];
    const clinicalEvaluationRequired = needsClinicalEval(base.class);

    let result = { ...base, clinicalEvaluationRequired };

    if (targetAudience === 'GENERAL' && result.class === 'I') {
      result = { ...result, class: 'II', registrationRequired: true, rule: 11, ruleDescription: 'Uso geral requer registro ANVISA' };
    }

    return result;
  }

  generateValidationProtocol(
    methodName: string,
    _matrix: 'FOOD' | 'DRUG' | 'COSMETIC' | 'ENVIRONMENTAL',
  ): AnvisaValidationProtocol {
    return {
      protocolNumber: `VAL-${Date.now()}`,
      methodDescription: methodName,
      validationParameters: {
        selectivity: true,
        linearity: true,
        precision: true,
        accuracy: true,
        robustness: true,
      },
    };
  }

  generateClinicalEvaluationPlan(classification: AnvisaSAMdClassification): string {
    if (!classification.clinicalEvaluationRequired) {
      return 'Clinical evaluation not required for Class I/II SaMD per RDC 677/2022 Art. 5.';
    }

    return `
PLANO DE AVALIAÇÃO CLÍNICA - RDC 677/2022
Classificação SaMD: Classe ${classification.class} (Regra ${classification.rule})
Data: ${new Date().toISOString()}

1. ESCOPO
   - Avaliação clínica do software como dispositivo médico
   - Conformidade com RDC 677/2022 e Resolução 166/2017

2. MÉTODOS
   - Revisão sistemática da literatura
   - Estudo clínico prospectivo (se aplicável)
   - Análise de dados pós-comercialização

3. CRITÉRIOS DE ACEITAÇÃO
   - Acurácia: ≥ 95%
   - Reproducibilidade: ≥ 0.90 (kappa)
   - Taxa de erro crítico: < 1%

4. CRONOGRAMA
   - Fase 1: Revisão bibliográfica (30 dias)
   - Fase 2: Validação clínica (60 dias)
   - Fase 3: Relatório final (15 dias)

5. RESPONSÁVEL TÉCNICO
   - [A nomear] - Especialista em dispositivo médico
    `;
  }
}
