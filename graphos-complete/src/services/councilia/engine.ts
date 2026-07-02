import { CouncilIAInput, CouncilIAOutput, CouncilIAEvent } from '@/types/councilia-universal';
import { executeRound1 } from './rounds/round1';
import { executeRound2 } from './rounds/round2';
import { executeRound3 } from './rounds/round3';
import { JudgeService } from './judge';
import { verifyAuditHash } from '@/lib/security/audit';

export class CouncilIAEngine {
  private judge: JudgeService;

  constructor() {
    this.judge = new JudgeService();
  }

  /**
   * Main Execution Entry Point (v14.0.0)
   * Standard 3-round deliberation protocol (Thesis -> Antithesis -> Synthesis).
   */
  async execute(
    input: CouncilIAInput, 
    onEvent?: (event: CouncilIAEvent) => Promise<void>
  ): Promise<CouncilIAOutput> {
    const sessionId = input.metadata?.sessionId || `run_${Date.now()}`;

    // --- GLOBAL ENGINE WATCHDOG (Limit: 300s) ---
    // Using Promise.race for a clean timeout instead of a dangerous setTimeout throw
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('ENGINE_DEADLOCK: Deliberation exceeded 300s safety window.')), 300000)
    );

    const executionPromise = (async (): Promise<CouncilIAOutput> => {
      console.log(`[Engine] Processing Session ${sessionId} in ${input.domain} domain. protocol=v14.0.0`);

      // --- DELIBERATION PIPELINE ---
      const r1 = await executeRound1(input.proposal, input.ragDocuments, onEvent);
      const r2 = await executeRound2(input.proposal, r1, input.ragDocuments, onEvent);
      const r3 = await executeRound3(input.proposal, r2, input.ragDocuments, onEvent);

      // --- FINAL JUDGE: VERDICT & TRUTH SYNTHESIS ---
      if (onEvent) {
        await onEvent({ type: 'system_status', personaId: 'system', payload: { msg: '⚖️ Juiz Iniciando Veredito Final...' } });
      }
      
      const finalVerdict = await this.judge.execute(
        [r1, r2, r3], 
        input,
        onEvent
      );

      if (onEvent) {
        await onEvent({ type: 'system_status', personaId: 'system', payload: { msg: '✅ Veredito Concluído. Gerando Relatório...' } });
      }

      // Final synchronization delay for UI consistency
      if (onEvent) {
        await onEvent({ type: 'system_status', personaId: 'system', payload: { msg: '🏁 Finalizando Protocolo de Auditoria e Sincronização...' } });
        await new Promise(r => setTimeout(r, 1000));
      }

      // v14 Audit Verification: Verify signature integrity
      try {
        await verifyAuditHash(
          finalVerdict.metadata.auditSignature || '',
          { decision: finalVerdict.decisaoImediata, score: finalVerdict.executiveVerdict?.score, metrics: finalVerdict.scientificAudit },
          input.metadata?.previousHash || ''
        );
      } catch (auditErr) {
        console.warn("[Engine] Audit hash verification failed, but continuing as non-fatal.", auditErr);
      }

      // Ensure metadata is correctly passed for UI validation
      finalVerdict.metadata = {
        ...finalVerdict.metadata,
        sessionId,
        protocolVersion: '14.0.0',
        domain: input.domain
      };

      return finalVerdict;
    })();

    return Promise.race([executionPromise, timeoutPromise]);
  }
}
