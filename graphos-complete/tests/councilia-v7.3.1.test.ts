import { calculateAllScores } from '../src/lib/scoring';
import { validateOutput } from '../src/services/councilia/validator';
import type { ScoringInput } from '../src/types/councilia-universal';

describe('CouncilIA v7.3.1 Regression Suite', () => {
    const personaIds = ['visionary', 'technologist', 'devil', 'marketeer', 'ethicist', 'financier'];

    test('Deterministic Scoring: High Consensus Case', () => {
        const input: ScoringInput = {
            personaScores: [90, 85, 80, 88, 85, 82],
            personaIds,
            evidenceDensity: 'high',
            unresolvedRisks: 0,
            validationStatus: 'complete',
            domain: 'general'
        };
        
        const result = calculateAllScores(input);
        
        expect(result.meanScore).toBeGreaterThan(80);
        expect(result.consensusStrength).toBeGreaterThan(85);
    });

    test('4-Guard Validator: Neutral Leak Detection', () => {
        // Score 50 with high consensus triggers Guard 1 (neutral leak)
        const output: any = {
            metadata: { protocolVersion: '7.3.1', sessionId: 'test', timestamp: '', executionTimeMs: 0, complianceFlags: [], retentionUntil: '' },
            executiveVerdict: { 
                verdict: 'CONDITIONAL', 
                score: 50,
                confidence: { level: 'HIGH', evidenceDensity: 'high', expertDisagreement: 'none', validationStatus: 'complete' },
                scoreBreakdown: { technicalViability: { score: 50, max: 100, justification: '' }, regulatoryReadiness: { score: 50, max: 100, justification: '' }, economicFeasibility: { score: 50, max: 100, justification: '' }, adoptionLikelihood: { score: 50, max: 100, justification: '' } },
                var: { percentage: 10, drivers: [], interpretation: '' }
            },
            consensusAnalysis: { strengthPercentage: 90, strengthLabel: 'STRONG', dissentDrivers: [], irreconcilablePoint: '', interpretation: '' },
            evidenceAudit: { highConfidence: [{ source: 't', supports: 't' }], mediumConfidence: [], unsupported: [] },
            actionPlan: { validationGate: { condition: '', proceedIf: '', abortIf: '' }, actions: [] },
            decisionRule: { proceedOnlyIf: [], otherwise: '' },
            criticalRisks: []
        };
        
        const validation = validateOutput(output);
        expect(validation.valid).toBe(false);
    });

    test('4-Guard Validator: Neutral Leak (All 50s)', () => {
        const input: ScoringInput = {
            personaScores: [50, 50, 50, 50, 50, 50],
            personaIds,
            evidenceDensity: 'moderate',
            unresolvedRisks: 0,
            validationStatus: 'complete',
            domain: 'general'
        };
        
        const scoring = calculateAllScores(input);
        
        // All 50s = StdDev 0 → consensusStrength = viabilityBoost
        // At meanScore=50, viabilityMultiplier = 0.5 + 0.5*0.5 = 0.75
        // consensusStrength = 100 * 0.75 - 20(conflictPenalty) = 55
        expect(scoring.conflictPenaltyDetected).toBe(true);
        expect(scoring.consensusStrength).toBeLessThan(80);
    });
});
