import { createAdminClient } from '@/lib/supabase/admin';

const supabase = () => createAdminClient();
const hasSupabaseConfig = () => Boolean((process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY);

// â”€â”€ Consents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function verifyConsentInDb(consentId: string, userId: string, purposes: string[]): Promise<boolean> {
  if (!hasSupabaseConfig()) return false;
  const { data, error } = await supabase()
    .from('consents')
    .select('id, purposes, expires_at, withdrawn_at')
    .eq('id', consentId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return false;
  if (data.withdrawn_at) return false;
  if (new Date(data.expires_at) < new Date()) return false;

  const hasAllPurposes = purposes.every(p => data.purposes.includes(p));
  return hasAllPurposes;
}

export async function storeConsent(consent: {
  id: string; userId: string; purposes: string[]; legalBasis: string;
  expiresAt: Date; ipHash: string; userAgent: string; proofHash: string;
}): Promise<boolean> {
  const { error } = await supabase().from('consents').insert({
    id: consent.id,
    user_id: consent.userId,
    purposes: consent.purposes,
    legal_basis: consent.legalBasis,
    expires_at: consent.expiresAt.toISOString(),
    ip_hash: consent.ipHash,
    user_agent: consent.userAgent,
    proof_hash: consent.proofHash,
  });
  return !error;
}

export async function withdrawConsentInDb(consentId: string, userId: string): Promise<boolean> {
  if (!hasSupabaseConfig()) return false;
  const { error } = await supabase()
    .from('consents')
    .update({ withdrawn_at: new Date().toISOString() })
    .eq('id', consentId)
    .eq('user_id', userId);
  return !error;
}

// â”€â”€ Erasure (GDPR Art. 17 / LGPD Art. 18) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ErasureResult {
  deleted: string[];
  retained: string[];
  reason: string;
}

export async function executeErasure(userId: string): Promise<ErasureResult> {
  if (!hasSupabaseConfig()) return { deleted: [], retained: [], reason: 'No database configured.' };
  const deleted: string[] = [];
  const retained: string[] = [];

  const tablesToAnonymize = [
    { table: 'validations', columns: ['idea'] },
    { table: 'debate_events', columns: ['payload'] },
    { table: 'audit_logs', columns: ['details'] },
  ];

  for (const { table, columns } of tablesToAnonymize) {
    const updateData: Record<string, string> = {};
    for (const col of columns) {
      updateData[col] = '[ANONYMIZED per GDPR Art. 17 / LGPD Art. 18]';
    }
    const { error } = await supabase()
      .from(table)
      .update(updateData)
      .eq('user_id', userId);

    if (error) {
      retained.push(`${table} (anonymization failed: ${error.message})`);
    } else {
      deleted.push(`${table} (anonymized)`);
    }
  }

  const tablesToDelete = ['consents', 'data_subject_requests', 'usage_records'];
  for (const table of tablesToDelete) {
    const { error } = await supabase()
      .from(table)
      .delete()
      .eq('user_id', userId);

    if (error) {
      retained.push(`${table} (deletion failed: ${error.message})`);
    } else {
      deleted.push(`${table} (deleted)`);
    }
  }

  return {
    deleted,
    retained,
    reason: retained.length > 0
      ? `Partial erasure completed. ${retained.length} item(s) retained due to legal obligation or technical limitations.`
      : 'Full erasure completed successfully.',
  };
}

// â”€â”€ Data Subject Requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createDataSubjectRequest(userId: string, type: string, details?: Record<string, unknown>) {
  if (!hasSupabaseConfig()) return { id: 'local-request', user_id: userId, request_type: type, details: details ?? {}, status: 'pending' };
  const { data, error } = await supabase()
    .from('data_subject_requests')
    .insert({
      user_id: userId,
      request_type: type,
      details: details ?? {},
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create ${type} request: ${error.message}`);
  return data;
}

export async function getUserRequests(userId: string) {
  if (!hasSupabaseConfig()) return [];
  const { data, error } = await supabase()
    .from('data_subject_requests')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  if (error) return [];
  return data;
}

export async function collectUserData(userId: string) {
  if (!hasSupabaseConfig()) return { profile: null, validations: [], auditLogs: [], consents: [], usageRecords: [] };
  const [
    { data: profile },
    { data: validations },
    { data: auditLogs },
    { data: consents },
    { data: usageRecords },
  ] = await Promise.all([
    supabase().from('profiles').select('*').eq('id', userId).single(),
    supabase().from('validations').select('id, idea, status, consensus_score, created_at').eq('user_id', userId),
    supabase().from('audit_logs').select('*').eq('user_id', userId).order('timestamp', { ascending: false }).limit(100),
    supabase().from('consents').select('*').eq('user_id', userId),
    supabase().from('usage_records').select('*').eq('tenant_id', userId),
  ]);

  return { profile, validations, auditLogs, consents, usageRecords };
}

// â”€â”€ Retention Enforcement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function getActiveRetentionPolicies() {
  if (!hasSupabaseConfig()) return [];
  const { data, error } = await supabase()
    .from('retention_policies')
    .select('*')
    .eq('enabled', true);

  if (error) return [];
  return data ?? [];
}

export async function enforceRetentionPolicy(policy: {
  table_name: string;
  retention_days: number;
  action: 'delete' | 'anonymize' | 'archive';
}) {
  if (!hasSupabaseConfig()) return { table: policy.table_name, action: policy.action, count: 0 };
  const cutoff = new Date(Date.now() - policy.retention_days * 86400000).toISOString();
  const col = 'created_at';

  if (policy.action === 'delete') {
    const { error, count } = await supabase()
      .from(policy.table_name)
      .delete()
      .lt(col, cutoff)
      .select('count');

    if (!error) return { table: policy.table_name, action: 'delete', count: count ?? 0 };
    return { table: policy.table_name, action: 'delete', error: error.message };
  }

  if (policy.action === 'anonymize') {
    const { error, count } = await supabase()
      .from(policy.table_name)
      .update({ details: '[ANONYMIZED BY RETENTION POLICY]' } as any)
      .lt(col, cutoff)
      .select('count');

    if (!error) return { table: policy.table_name, action: 'anonymize', count: count ?? 0 };
    return { table: policy.table_name, action: 'anonymize', error: error.message };
  }

  return { table: policy.table_name, action: policy.action, count: 0 };
}

// â”€â”€ Breach Notification (GDPR Art. 33 / LGPD Art. 48) â”€â”€

export async function registerBreach(params: {
  breachType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affectedUsers?: number;
  dataCategories?: string[];
}) {
  if (!hasSupabaseConfig()) return { id: 'local-breach', ...params, status: 'investigating' };
  const { data, error } = await supabase()
    .from('breach_notifications')
    .insert({
      breach_type: params.breachType,
      severity: params.severity,
      description: params.description,
      affected_users: params.affectedUsers ?? 0,
      data_categories: params.dataCategories,
      containment_actions: 'Investigating â€” see resolution_notes',
      status: 'investigating',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to register breach: ${error.message}`);

  // Log to audit
  const { auditLogger } = await import('@/lib/compliance/audit-logger');
  await auditLogger.record({
    type: 'BREACH_NOTIFICATION',
    severity: params.severity === 'CRITICAL' ? 'HIGH' : params.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
    details: { breachId: data.id, breachType: params.breachType, severity: params.severity },
    timestamp: new Date(),
    gdprArticle: '33',
  });

  return data;
}

export async function resolveBreach(breachId: string, resolution: string) {
  if (!hasSupabaseConfig()) return false;
  const { error } = await supabase()
    .from('breach_notifications')
    .update({
      status: 'resolved',
      resolution_notes: resolution,
      notified_dpa_at: new Date().toISOString(),
      notified_affected_at: new Date().toISOString(),
    })
    .eq('id', breachId);

  return !error;
}

export async function getComplianceSummary(userId: string) {
  if (!hasSupabaseConfig()) return { activeConsents: 0, totalConsents: 0, pendingRequests: 0, recentRequests: [], processingActivities: [] };
  const [consents, requests, activities] = await Promise.all([
    supabase().from('consents').select('*').eq('user_id', userId),
    supabase().from('data_subject_requests').select('*').eq('user_id', userId).order('submitted_at', { ascending: false }),
    supabase().from('processing_activities').select('*'),
  ]);

  return {
    activeConsents: (consents.data ?? []).filter((c: any) => !c.withdrawn_at && new Date(c.expires_at) > new Date()).length,
    totalConsents: (consents.data ?? []).length,
    pendingRequests: (requests.data ?? []).filter((r: any) => r.status === 'pending').length,
    recentRequests: (requests.data ?? []).slice(0, 5),
    processingActivities: activities.data ?? [],
  };
}


