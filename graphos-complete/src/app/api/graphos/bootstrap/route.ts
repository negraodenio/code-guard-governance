import { NextRequest, NextResponse } from 'next/server';
import { bootstrapGraphFromGovernanceRepo } from '@/graphos/bootstrap';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const organisationId = body.organisationId as string | undefined;
    const tenantId = body.tenantId as string | undefined;

    if (!organisationId || !tenantId) {
      return NextResponse.json(
        { ok: false, error: 'organisationId and tenantId are required' },
        { status: 400 },
      );
    }

    const result = await bootstrapGraphFromGovernanceRepo(organisationId, tenantId);

    return NextResponse.json({
      ok: true,
      data: result,
      message: `Bootstrap complete: ${result.entitiesCreated} entities, ${result.relationshipsCreated} relationships${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`,
    });
  } catch (err) {
    console.error('[GraphOS Bootstrap] Error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Bootstrap failed' },
      { status: 500 },
    );
  }
}
