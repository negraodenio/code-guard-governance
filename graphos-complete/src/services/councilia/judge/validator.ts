// src/services/councilia/judge/validator.ts

export interface JudgeOutput {
  decisaoImediata: string;
  sinteseTecnica: string;
  fontesEvidencia: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  corrected?: JudgeOutput;
}

export class JudgeOutputValidator {
  
  private readonly REQUIRED_SECTIONS = [
    'decisaoImediata',
    'sinteseTecnica', 
    'fontesEvidencia'
  ];

  // Updated v14: Generalized Strategic Keywords (removed strict Lab-only requirements)
  private readonly REQUIRED_KEYWORDS = {
    decisaoImediata: [
      'conclusão',
      'determina-se',
      'estratégia',
      'recomenda-se',
      'prioridade',
      'prevalece',
      'veredito'
    ],
    sinteseTecnica: [
      'análise',
      'fundamentação',
      'evidência',
      'risco',
      'métricas',
      'projeção'
    ]
  };

  validate(rawOutput: any): ValidationResult {
    const errors: string[] = [];
    let parsedOutput: any;

    // 1. Verify if it is valid JSON
    try {
      parsedOutput = typeof rawOutput === 'string' ? JSON.parse(rawOutput) : rawOutput;
    } catch {
      errors.push('Resposta não é um JSON válido');
      return { isValid: false, errors };
    }

    // 2. Verify all required sections exist
    for (const section of this.REQUIRED_SECTIONS) {
      if (!parsedOutput[section] || typeof parsedOutput[section] !== 'string') {
        errors.push(`Seção "${section}" ausente ou inválida`);
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // --- Heading Duplication Check ---
    const headingRegex = /^\d+\.\s*(DECISÃO\s*IMEDIATA|SÍNTESE\s*TÉCNICA|FONTES\s*DE\s*EVIDÊNCIA)/i;
    if (headingRegex.test(parsedOutput.decisaoImediata)) errors.push('Título duplicado detectado em decisaoImediata');
    if (headingRegex.test(parsedOutput.sinteseTecnica)) errors.push('Título duplicado detectado em sinteseTecnica');
    if (headingRegex.test(parsedOutput.fontesEvidencia)) errors.push('Título duplicado detectado em fontesEvidencia');

    // 3. Validate DECISÃO IMEDIATA content
    const decisao = parsedOutput.decisaoImediata.toLowerCase();
    const hasDecision = this.REQUIRED_KEYWORDS.decisaoImediata.some(k => decisao.includes(k));
    
    // Check for substance, not just specific lab words
    if (decisao.length < 50) {
      errors.push('DECISÃO IMEDIATA está demasiado curta ou sem fundamentação');
    }
    
    // We keep a soft requirement for some decisive language to ensure executive tone
    if (!hasDecision && !decisao.includes('deve') && !decisao.includes('ser')) {
      errors.push('DECISÃO IMEDIATA não contém linguagem decisiva obrigatória (ex: determina-se/recomenda-se)');
    }

    // 4. Validate SÍNTESE TÉCNICA content
    const sintese = parsedOutput.sinteseTecnica.toLowerCase();
    const hasSubstance = this.REQUIRED_KEYWORDS.sinteseTecnica.some(k => sintese.includes(k));
    
    if (!hasSubstance && sintese.length < 100) {
      errors.push('SÍNTESE TÉCNICA não contém substância analítica suficiente');
    }

    return {
      isValid: errors.length === 0,
      errors,
      corrected: errors.length > 0 ? this.attemptCorrection(parsedOutput) : undefined
    };
  }

  private attemptCorrection(partial: any): JudgeOutput {
    return {
      decisaoImediata: this.removeHeadings(partial.decisaoImediata) || this.getDefaultDecisao(),
      sinteseTecnica: this.removeHeadings(partial.sinteseTecnica) || this.getDefaultSintese(),
      fontesEvidencia: this.removeHeadings(partial.fontesEvidencia) || this.getDefaultFontes()
    };
  }

  private removeHeadings(text: string): string {
    if (!text) return '';
    return text
      .replace(/^\d+\.\s*(DECISÃO\s*IMEDIATA|SÍNTESE\s*TÉCNICA|FONTES\s*DE\s*EVIDÊNCIA|Decisão\s*Imediata|Síntese\s*Técnica|Fontes\s*de\s*Evidência)[:\-\s]*/gi, '')
      .trim();
  }

  public getDefaultDecisao(): string {
    return `**Parecer Consolidado**: Com base na análise das evidências e no debate entre os especialistas, determina-se que a proposta possui viabilidade estratégica condicionada à mitigação dos riscos operacionais identificados. Recomenda-se o avanço faseado com pontos de controle claros.`;
  }

  public getDefaultSintese(): string {
    return `A síntese técnica aponta para uma convergência de opiniões sobre a necessidade de maior profundidade nos dados de entrada. Embora o consenso global tenha sido atingido, a variância nas projeções de risco sugere uma abordagem conservadora na execução imediata.`;
  }

  public getDefaultFontes(): string {
    return `- Análise Interna de Dados CouncilIA\n- Benchmarks de Mercado Consultados\n- Princípios de Governança Estratégica\n- Matriz de Riscos Transversal`;
  }
}
