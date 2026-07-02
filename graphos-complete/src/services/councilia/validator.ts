import type { CouncilIAOutput } from '@/types/councilia-universal';

interface ValidationResult {
  valid: boolean;
  fallback?: CouncilIAOutput;
  flags: string[];
}

function generateSafeModeOutput(output: CouncilIAOutput): CouncilIAOutput {
  return {
    ...output,
    executiveVerdict: {
      ...output.executiveVerdict,
      verdict: 'NO-GO',
      score: Math.min(39, output.executiveVerdict.score - 20),
    },
    metadata: {
      ...output.metadata,
      complianceFlags: [...output.metadata.complianceFlags, 'SAFE_MODE_FALLBACK'],
    },
  };
}

export function validateOutput(output: CouncilIAOutput): ValidationResult {
  const flags: string[] = [];
  let valid = true;

  // Guard 1: Neutral leak — CONDITIONAL with low score is inconsistent
  if (output.executiveVerdict.verdict === 'CONDITIONAL' && output.executiveVerdict.score < 60) {
    flags.push('GUARD1_NEUTRAL_LEAK');
    valid = false;
  }

  // Guard 1b: Score-verdict mismatch — GO with low score is inconsistent
  if (output.executiveVerdict.verdict === 'GO' && output.executiveVerdict.score < 60) {
    flags.push('GUARD1B_SCORE_VERDICT_MISMATCH');
    valid = false;
  }

  // Guard 2: Missing dissent drivers when consensus is weak
  if (output.consensusAnalysis.strengthPercentage < 70 && output.consensusAnalysis.dissentDrivers.length === 0) {
    flags.push('GUARD2_MISSING_DISSENT');
    valid = false;
  }

  // Guard 3: High VaR + high score — not critical but worth flagging
  if (output.executiveVerdict.var.percentage > 40 && output.executiveVerdict.score > 70) {
    flags.push('GUARD3_HIGH_VAR_HIGH_SCORE');
  }

  // Guard 4: Low evidence + HIGH confidence
  if (output.executiveVerdict.confidence.evidenceDensity === 'low' && output.executiveVerdict.confidence.level === 'HIGH') {
    flags.push('GUARD4_EVIDENCE_CONFIDENCE_MISMATCH');
  }

  // Guard 5: Missing evidence — not critical
  if (!output.evidenceAudit.highConfidence.length && !output.evidenceAudit.mediumConfidence.length) {
    flags.push('GUARD5_NO_EVIDENCE');
  }

  // Guard 6: Out-of-range score
  if (output.executiveVerdict.score < 0 || output.executiveVerdict.score > 100) {
    flags.push('GUARD6_SCORE_RANGE');
    valid = false;
  }

  // Guard 7: Temporal drift — not critical
  const meta = output.metadata as any;
  if (meta.previousScore !== undefined) {
    const drift = Math.abs(output.executiveVerdict.score - meta.previousScore);
    if (drift > 50) {
      flags.push('GUARD7_TEMPORAL_DRIFT');
    }
  }

  const result: ValidationResult = { valid, flags };
  if (!valid) {
    result.fallback = generateSafeModeOutput(output);
  }

  return result;
}
