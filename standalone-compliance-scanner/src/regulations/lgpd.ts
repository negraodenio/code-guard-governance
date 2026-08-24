import { createHash, randomUUID } from 'crypto';
import { verifyConsentInDb, storeConsent, withdrawConsentInDb } from './db';

export interface LGPDConsent {
  id: string;
  userId: string;
  purposes: LGPDPurpose[];
  grantedAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  proofOfConsent: string;
  withdrawnAt?: Date;
}

export type LGPDPurpose =
  | 'DECISION_ANALYSIS'
  | 'AUDIT_TRAIL'
  | 'MODEL_IMPROVEMENT'
  | 'REGULATORY_COMPLIANCE';

export type LGPDLegalBasis =
  | 'CONSENTIMENTO'
  | 'EXECUCAO_CONTRATO'
  | 'OBRIGACAO_LEGAL'
  | 'INTERESSE_LEGITIMO'
  | 'PROTECAO_VIDA'
  | 'INTERESSE_PUBLICO';

export class LGPDComplianceManager {
  async requestConsent(
    userId: string,
    purposes: LGPDPurpose[],
    metadata: { ip: string; userAgent: string },
  ): Promise<LGPDConsent> {
    const consent: LGPDConsent = {
      id: randomUUID(),
      userId,
      purposes,
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 86400000),
      ipAddress: this.hashIp(metadata.ip),
      userAgent: metadata.userAgent,
      proofOfConsent: this.generateProof(userId, purposes),
    };

    await storeConsent({
      id: consent.id,
      userId,
      purposes,
      legalBasis: 'CONSENTIMENTO',
      expiresAt: consent.expiresAt,
      ipHash: consent.ipAddress,
      userAgent: consent.userAgent,
      proofHash: consent.proofOfConsent,
    });

    return consent;
  }

  validateLegalBasis(
    basis: LGPDLegalBasis,
    context: 'healthcare' | 'finance' | 'general',
  ): boolean {
    if (context === 'healthcare' && basis !== 'CONSENTIMENTO' && basis !== 'OBRIGACAO_LEGAL') {
      return false;
    }
    if (context === 'finance') {
      return basis === 'OBRIGACAO_LEGAL' || basis === 'EXECUCAO_CONTRATO';
    }
    return true;
  }

  async verifyConsent(consentId: string, userId: string, purposes: string[]): Promise<boolean> {
    return verifyConsentInDb(consentId, userId, purposes);
  }

  async withdrawConsent(consentId: string, userId: string): Promise<boolean> {
    return withdrawConsentInDb(consentId, userId);
  }

  private hashIp(ip: string): string {
    const salt = process.env.IP_SALT || 'default-salt';
    return createHash('sha256').update(ip + salt).digest('hex');
  }

  private generateProof(userId: string, purposes: LGPDPurpose[]): string {
    return createHash('sha256')
      .update(`${userId}:${purposes.join(',')}:${Date.now()}`)
      .digest('hex');
  }
}

export async function generateRIPD(processingActivity: string): Promise<string> {
  return `
RIPD - RELATÓRIO DE IMPACTO À PROTEÇÃO DE DADOS PESSOAIS
Atividade: ${processingActivity}
Data: ${new Date().toISOString()}
Controlador: CouncilIA / ia4all.eu
DPO: dpo@councilia.com

1. DESCRIÇÃO DO TRATAMENTO
   - Finalidade: Análise estruturada de decisões com IA
   - Base legal: Consentimento (Art. 7, I) + Obrigação legal (Art. 7, IV)
   - Dados: Propostas técnicas, documentos RAG, metadados de decisão

2. RISCOS IDENTIFICADOS
   - Risco: Violação de sigilo de propostas comerciais
   - Mitigação: Criptografia em trânsito e repouso, acesso por autenticação

3. MEDIDAS DE SEGURANÇA
   - Criptografia AES-256
   - Logs imutáveis
   - Acesso baseado em função (RBAC)

4. CONSULTA ANPD
   - Registro prévio: [EM PROCESSAMENTO]
  `;
}
