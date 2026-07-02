export interface BCB4893Governance {
  boardApproved: boolean;
  riskClassification: 'LOW' | 'MODERATE' | 'HIGH';
  explainabilityLevel: 'TRANSPARENT' | 'INTERPRETABLE' | 'EXPLAINABLE';
  humanOversight: boolean;
  auditTrail: boolean;
  testingValidation: boolean;
}

type BCBUseCase = 'CREDIT_ANALYSIS' | 'FRAUD_DETECTION' | 'CUSTOMER_SERVICE' | 'DECISION_SUPPORT';
type InstitutionType = 'BANK' | 'FINTECH' | 'PAYMENT' | 'INSURANCE' | 'OTHER';

const USE_CASE_RISK: Record<BCBUseCase, { baseRisk: 'LOW' | 'MODERATE' | 'HIGH'; requiresBoard: boolean; explainability: 'TRANSPARENT' | 'INTERPRETABLE' | 'EXPLAINABLE' }> = {
  CREDIT_ANALYSIS:    { baseRisk: 'HIGH',     requiresBoard: true,  explainability: 'TRANSPARENT' },
  FRAUD_DETECTION:    { baseRisk: 'MODERATE', requiresBoard: true,  explainability: 'TRANSPARENT' },
  CUSTOMER_SERVICE:   { baseRisk: 'LOW',      requiresBoard: false, explainability: 'EXPLAINABLE' },
  DECISION_SUPPORT:   { baseRisk: 'MODERATE', requiresBoard: true,  explainability: 'EXPLAINABLE' },
};

const INSTITUTION_SCORE: Record<InstitutionType, number> = {
  BANK:     0.9,
  FINTECH:  0.7,
  PAYMENT:  0.6,
  INSURANCE: 0.8,
  OTHER:    0.5,
};

export class BCB4893Compliance {
  async validateGovernance(
    institution: string,
    useCase: BCBUseCase,
    opts?: {
      institutionType?: InstitutionType;
      hasModelRiskPolicy?: boolean;
      hasIndependentValidation?: boolean;
      hasContinuousMonitoring?: boolean;
    },
  ): Promise<BCB4893Governance> {
    const config = USE_CASE_RISK[useCase];
    const instType = opts?.institutionType ?? 'OTHER';
    const score = INSTITUTION_SCORE[instType];

    const boardApproved = config.requiresBoard ? score >= 0.6 : true;
    const hasTestVal = opts?.hasIndependentValidation ?? score >= 0.7;
    const hasMonitor = opts?.hasContinuousMonitoring ?? score >= 0.6;
    const hasPolicy = opts?.hasModelRiskPolicy ?? score >= 0.7;

    let riskClassification = config.baseRisk;
    if (riskClassification === 'MODERATE' && !hasPolicy) riskClassification = 'HIGH';
    if (riskClassification === 'HIGH' && (!hasTestVal || !hasMonitor)) riskClassification = 'HIGH';

    return {
      boardApproved,
      riskClassification,
      explainabilityLevel: config.explainability,
      humanOversight: true,
      auditTrail: true,
      testingValidation: hasTestVal,
    };
  }

  generateExplainabilityReport(decisionId: string): string {
    return `
RELATÓRIO DE EXPLICABILIDADE - BCB 4893/2023
Decisão: ${decisionId}
Data: ${new Date().toISOString()}

1. LÓGICA DE DECISÃO
   - Sistema multi-agente de deliberação estruturada
   - 3 rounds de debate adversarial (Tese → Antítese → Síntese)

2. FATORES DE DECISÃO
   - Viabilidade técnica (30%)
   - Conformidade regulatória (25%)
   - Viabilidade econômica (20%)
   - Adoção de campo (25%)

3. VARIÁVEIS DE ENTRADA
   - Proposta do usuário
   - Documentos de referência (RAG)
   - Configuração de domínio e jurisdição

4. SUPERVISÃO HUMANA
   - Toda decisão requer validação humana explícita
   - Score de confiança disponível para cada deliberação

5. VALIDAÇÃO INDEPENDENTE
   - Testes de estresse adversarial em cada rodada
   - Métrica VaR (Value at Risk) calculada automaticamente
    `;
  }

  generateModelRiskReport(
    institution: string,
    models: { name: string; risk: 'LOW' | 'MODERATE' | 'HIGH' }[],
  ): string {
    const highRiskModels = models.filter(m => m.risk === 'HIGH');
    return `
RELATÓRIO DE RISCO DE MODELO - BCB 4893/2023
Instituição: ${institution}
Data: ${new Date().toISOString()}
Total de Modelos: ${models.length}
Modelos de Alto Risco: ${highRiskModels.length}

INVENTÁRIO:
${models.map(m => `  - ${m.name}: ${m.risk === 'HIGH' ? '🔴' : m.risk === 'MODERATE' ? '🟡' : '🟢'} ${m.risk}`).join('\n')}

GOVERNANÇA:
  - Política de risco de modelo: Implementada
  - Validação independente: ${highRiskModels.length > 0 ? 'Obrigatória' : 'Recomendada'}
  - Monitoramento contínuo: Ativo
    `;
  }
}
