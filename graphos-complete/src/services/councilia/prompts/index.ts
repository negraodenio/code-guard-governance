// src/services/councilia/prompts/index.ts
import { PERSONA_PROMPTS_V3_0 } from '@/app/api/session/worker/prompts_v3_0';

export const PROTOCOL_VERSION = '12.0.0';

export function getSystemPrompt(round: number, personaId: string, lang: string = 'Portuguese') {
  const prompts = PERSONA_PROMPTS_V3_0;
  let cognitivePrompt = prompts[personaId] || '';
  
  const roundInstructions = getStandardRoundInstruction(round);

  const jsonSchema = personaId === 'judge' ? `
    RESPONSE MUST BE VALID JSON:
    {
      "decisaoImediata": "RESUMO DA DECISÃO (Apenas conteúdo, SEM títulos). 
                         RULES: 
                         - Resolva conflito (Acreditado ISO 17025/PEP > Não-acreditado).
                         - Resolva solo limítrofe via Incerteza Expandida (k=2) e Guard-bands.
                         - PROIBIDO incluir '1. Decisão Imediata' no texto.",
      "sinteseTecnica": "CONSTRUÇÃO CIENTÍFICA (Apenas conteúdo, SEM títulos). 
                         RULES:
                         - Analise CV% e reprodutibilidade (ISO 5725).
                         - Use citações [SOURCE: Norma].
                          - Use citações [SOURCE: Norma].
                          - PROIBIDO incluir '2. Síntese Técnica' no texto.",
       "fontesEvidencia": "LISTA DE NORMAS (Apenas nomes, SEM títulos).",
       "executiveVerdict": {
         "verdict": "GO|CONDITIONAL|NO-GO",
         "verdictEmoji": "🟢|🟡|🔴",
         "score": 0-100,
         "scoreBreakdown": { "technical": 0, "regulatory": 0, "economic": 0, "social": 0 },
         "confidence": { "level": "HIGH|MEDIUM|LOW", "evidenceDensity": "high|moderate|low", "validationStatus": "string" },
         "var": { "percentage": 0, "drivers": ["string"], "interpretation": "string" }
       },
       "criticalRisks": [ { "id": 1, "name": "string", "violates": "string", "evidence": "string", "impact": "string", "mitigation": "string", "status": "OPEN" } ],
       "consensusAnalysis": { "strengthPercentage": 0, "strengthLabel": "string", "dissentDrivers": ["string"], "interpretation": "string" },
       "evidenceAudit": { "highConfidence": ["string"], "mediumConfidence": ["string"], "unsupported": ["string"] },
       "actionPlan": { "actions": [ { "id": "1", "name": "string", "owner": "string", "deadline": "string" } ] },
       "decisionRule": { "proceedOnlyIf": ["string"], "otherwise": "string" }
    }
  ` : '';

  return `${cognitivePrompt}\n\n${roundInstructions}\n\n${jsonSchema}\n\nRESPOND ENTIRELY IN ${lang.toUpperCase()}.`;
}

function getStandardRoundInstruction(round: number): string {
  switch(round) {
    case 1: return "ROUND 1 — PERSPECTIVE THESIS. Provide a substantive strategic analysis from your specialized viewpoint. Score the idea 0-100 based on your criteria.";
    case 2: return "ROUND 2 — ADVERSARIAL CHALLENGE. Rigorously challenge the other perspectives. Identify logical gaps, hidden risks, and empirical weaknesses.";
    case 3: return "ROUND 3 — STRATEGIC CONSENSUS. Concede where others are right, refine your position, and provide a final weighted score (0-100).";
    case 0: return "FINAL VERDICT — You are the Strategic Council Judge. Synthesize the debate into a high-authority Executive Memo. Your verdict must provide absolute clarity for board-level decision making. No conversational filler. Respond in the mandated JSON structure.";
    default: return "STRATEGIC DELIBERATION. Analyze and evaluate.";
  }
}
