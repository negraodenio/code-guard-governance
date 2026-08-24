// Self-contained in-memory / console audit logger
const inMemoryLogs: any[] = [];

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
    inMemoryLogs.push({
      ...record,
      timestamp: record.timestamp.toISOString(),
      severity: record.severity ?? 'LOW',
      details: record.details ?? {},
    });
  }

  async getProcessingRecords(userId: string): Promise<any[]> {
    return inMemoryLogs.filter(log => log.userId === userId);
  }
}

export const auditLogger = new AuditLogger();
