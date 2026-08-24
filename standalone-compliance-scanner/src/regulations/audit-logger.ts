import { createAdminClient } from '@/lib/supabase/admin';

export interface AuditRecord {
  type: string;
  userId?: string;
  sessionId?: string;
  consentId?: string;
  purposes?: string[];
  decision?: string;
  justification?: string;
  timestamp: Date;
  gdprArticle?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
  details?: any;
}

export class AuditLogger {
  async record(record: AuditRecord): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase.from('audit_logs').insert({
      type: record.type,
      user_id: record.userId,
      session_id: record.sessionId,
      consent_id: record.consentId,
      purposes: record.purposes,
      decision: record.decision,
      justification: record.justification,
      timestamp: record.timestamp.toISOString(),
      gdpr_article: record.gdprArticle,
      severity: record.severity ?? 'LOW',
      details: record.details ?? {},
    });

    if (error) {
      console.error('[AUDIT_LOGGER] Failed to write audit record:', error.message);
    }
  }

  async getProcessingRecords(userId: string): Promise<any[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('[AUDIT_LOGGER] Failed to read audit records:', error.message);
      return [];
    }

    return data ?? [];
  }
}

export const auditLogger = new AuditLogger();
