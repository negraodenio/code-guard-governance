/**
 * 📊 COUNCILIA v14 — CALIBRATION & METROLOGY
 * Implements Variance Smoothing (Sliding Window) and Scientific Metrics (ECR).
 */

const VARIANCE_WINDOW_SIZE = 3;

/**
 * Stabilizes variance using a sliding window average.
 * Prevents LLM jitter from causing flip-flopping decisions.
 */
export function stabilizeVariance(currentVariance: number, history: number[] = []): number {
    const newHistory = [...history, currentVariance].slice(-VARIANCE_WINDOW_SIZE);
    const sum = newHistory.reduce((a, b) => a + b, 0);
    return parseFloat((sum / newHistory.length).toFixed(4));
}

/**
 * Calculates the Error Correction Rate (ECR).
 * ECR = (errors_in_R1_corrected_in_R3) / total_errors_R1
 * 
 * Note: In production, 'error' is proxied by low-confidence/high-dissent.
 */
export function calculateECR(r1Scores: number[], r3Scores: number[]): number {
    // Scientific Proxy: An error in R1 is defined as a score deviation > 25% from the final consensus.
    const finalConsensus = r3Scores.reduce((a, b) => a + b, 0) / r3Scores.length;
    
    const r1Errors = r1Scores.filter(s => Math.abs(s - finalConsensus) > 25).length;
    const r3Errors = r3Scores.filter(s => Math.abs(s - finalConsensus) > 25).length;
    
    if (r1Errors === 0) return 1.0; // Perfect start
    
    const corrected = Math.max(0, r1Errors - r3Errors);
    return parseFloat((corrected / r1Errors).toFixed(4));
}

/**
 * Confidence Calibration: Predicted vs Actual proxy.
 */
export function calibrateConfidence(predicted: number, variance: number, evidence: number): number {
    const actualProxy = (1 - variance) * evidence;
    return parseFloat(((predicted + actualProxy) / 2).toFixed(4));
}
