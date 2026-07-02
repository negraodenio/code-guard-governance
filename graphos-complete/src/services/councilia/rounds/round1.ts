/**
 * Round 1: Thesis (v12.0.0 - Scientific Authority)
 */

import { CouncilIAEvent, PersonaResponse, RoundResult } from '@/types/councilia-universal';
import { getSystemPrompt } from '../prompts';
import { callLLM } from '../provider';
import { executeWithTimeout } from '../utils';

const PERSONAS = [
  { id: 'visionary', name: 'Visionário / Inovação', emoji: '💡' },
  { id: 'technologist', name: 'Especialista Técnico / Cientista', emoji: '🔬' },
  { id: 'devil', name: 'Auditor de Riscos / Crítico', emoji: '👺' },
  { id: 'marketeer', name: 'Adoção de Mercado / Operador', emoji: '📈' },
  { id: 'ethicist', name: 'Estrategista Regulatório / Ética', emoji: '⚖️' },
  { id: 'financier', name: 'Analista Financeiro / ROI', emoji: '💰' }
];

const PERSONA_TIMEOUT = 35000;

export async function executeRound1(
  proposal: string, 
  docs: any[], 
  onEvent?: (event: CouncilIAEvent) => Promise<void>
): Promise<RoundResult> {
  const personaResults = await Promise.allSettled(PERSONAS.map(async (p) => {
    const pName = p.name;
    try {
      const systemPrompt = getSystemPrompt(1, p.id);
      const userPrompt = `PROPOSTA PARA ANÁLISE: ${proposal}\n\nCONTEXTO RAG: ${JSON.stringify(docs)}`;

      const text = await executeWithTimeout(
        callLLM([
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]),
        PERSONA_TIMEOUT
      );

      const scoreMatch = text.match(/Score:?\s*\[?(\d{1,3})\]?/i) || text.match(/(\d{1,3})\/100/);
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;

      if (onEvent) {
        await onEvent({
          type: 'model_msg',
          personaId: p.id,
          payload: { text, phase: 'r1', round: 1, persona: pName, emoji: p.emoji }
        });
      }

      return {
        persona: pName,
        analysis: text,
        score: score,
        unrefuted_risks: [],
        kill_condition_triggered: text.toLowerCase().includes('kill condition') || text.toLowerCase().includes('no-go')
      };
    } catch (err: any) {
      console.warn(`[Round1] High-Availability Fallback for ${p.id}:`, err.message);
      const fallbackText = `[ESTADO DE SEGURANÇA] ${pName} entrou em modo de reserva técnica devido à latência de rede. Score nominal: 50.`;
      
      if (onEvent) {
        await onEvent({
          type: 'model_msg',
          personaId: p.id,
          payload: { text: fallbackText, phase: 'r1', round: 1, persona: pName, emoji: p.emoji }
        });
      }

      return {
        persona: pName,
        analysis: fallbackText,
        score: 50,
        unrefuted_risks: [],
        kill_condition_triggered: false
      };
    }
  }));

  const responses = personaResults.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const p = PERSONAS[i];
    return {
      persona: p.name,
      analysis: 'Erro crítico de execução na persona. Fallback de emergência aplicado.',
      score: 50,
      unrefuted_risks: [],
      kill_condition_triggered: false
    };
  });

  return { round: 1, responses: responses as PersonaResponse[] };
}
