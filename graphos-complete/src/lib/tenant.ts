// ─────────────────────────────────────────────────────────────────────────────
// Tenant resolution for v1 API routes.
// Priority: x-org-id / x-tenant-id headers → env → default.
// Backward compatible: sem header, comportamento atual (single-tenant).
// ─────────────────────────────────────────────────────────────────────────────
import type { NextRequest } from 'next/server';

const DEFAULT_TENANT_ID = '52f41339-a838-4d8f-b041-f9b7bf1ff305';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TenantContext {
  orgId: string;
  tenantId: string;
  /** true quando veio de header (multi-tenant), false quando é o default */
  fromHeader: boolean;
}

export function resolveTenant(req: NextRequest): TenantContext {
  const hOrg = req.headers.get('x-org-id');
  const hTenant = req.headers.get('x-tenant-id');

  const envOrg = process.env.GRAPHOS_ORG_ID ?? process.env.GRAPHOS_TENANT_ID ?? DEFAULT_TENANT_ID;
  const envTenant = process.env.GRAPHOS_TENANT_ID ?? envOrg;

  const orgId = hOrg && UUID_RE.test(hOrg) ? hOrg : envOrg;
  const tenantId = hTenant && UUID_RE.test(hTenant) ? hTenant : (hOrg && UUID_RE.test(hOrg) ? hOrg : envTenant);

  return { orgId, tenantId, fromHeader: !!(hOrg || hTenant) };
}
