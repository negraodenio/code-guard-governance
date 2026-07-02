import { NextResponse } from 'next/server';
import { requireAuthContext } from '@/lib/security/auth-context';
import { verifyAuditHash } from '@/lib/security/audit';

export async function GET(req: Request) {
    const auth = await requireAuthContext();
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const decisionId = url.searchParams.get('id');

    if (!decisionId) {
        return NextResponse.json({ error: 'Decision ID missing' }, { status: 400 });
    }

    const { data: decision, error } = await auth.admin
        .from('decisions')
        .select('*')
        .eq('id', decisionId)
        .single();

    if (error || !decision) {
        return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

    // ENTERPRISE HARDENING: Dual-Verification of org/tenant
    if (decision.tenant_id !== auth.ctx.tenantId) {
        console.warn(`[Security] Unauthorized access attempt to decision ${decisionId} by tenant ${auth.ctx.tenantId}`);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // v14 Audit Verification: Verify signature integrity
    const isValid = await verifyAuditHash(
        decision.audit_signature,
        { decision: decision.executive_verdict, score: decision.score, metrics: decision.scientific_audit },
        decision.previous_hash || ''
    );

    return NextResponse.json({
        ...decision,
        auditStatus: isValid ? 'VERIFIED' : 'TAMPER_DETECTED',
        policyVersion: 'v14.0.0'
    });
}
