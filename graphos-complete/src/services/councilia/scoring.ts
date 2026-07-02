/**
 * Deterministic Scoring Engine v12.0.0 (Elite Metrology)
 * Mathematical layer for Swarm Consensus and Risk Analysis.
 */

import { ScoringInput, ScoringOutput } from '@/types/councilia-universal';

export function calculateAllScores(input: ScoringInput): ScoringOutput {
  const { personaScores, personaIds, evidenceDensity, unresolvedRisks } = input;

  // 1. Defining Persona Weights (v12.0.0 Protocol)
  const getWeight = (id: string) => {
    const technicalRoles = ['technologist', 'auditor', 'cientista', 'especialista'];
    return technicalRoles.some(role => id.toLowerCase().includes(role)) ? 1.5 : 1.0;
  };

  const weights = personaIds.map(id => getWeight(id));
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  
  // 2. Weighted Mean Score (Elite Synthesis)
  const weightedMean = personaScores.reduce((sum, score, i) => sum + (score * weights[i]), 0) / sumWeights;
  
  // 3. Weighted Standard Deviation (Consensus Baseline)
  const variance = personaScores.reduce((sum, x, i) => sum + (weights[i] * Math.pow(x - weightedMean, 2)), 0) / sumWeights;
  const stdDev = Math.sqrt(variance);
  
  // 4. Consensus Strength (Theta) - Pure inverse of variability
  const consensusStrength = Math.max(0, 100 - (stdDev * 2.8)); // Standardized for A4 range
  
  // 5. Value at Risk (VaR)
  const dissentPenalty = (100 - consensusStrength) * 0.4;
  const evidencePenalty = evidenceDensity === 'low' ? 25 : evidenceDensity === 'moderate' ? 12 : 0;
  const riskPenalty = unresolvedRisks * 6;
  
  const totalVaR = Math.min(100, dissentPenalty + evidencePenalty + riskPenalty);
  
  // 6. Confidence Level
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  if (evidenceDensity === 'high' && consensusStrength > 75) confidence = 'HIGH';
  if (evidenceDensity === 'low' || consensusStrength < 40) confidence = 'LOW';

  return {
    consensusStrength: Math.round(consensusStrength),
    dissentRange: Math.max(...personaScores) - Math.min(...personaScores),
    var: Math.round(totalVaR),
    confidence,
    meanScore: Math.round(weightedMean),
    stdDev: parseFloat(stdDev.toFixed(2))
  };
}
