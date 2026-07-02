type OwnershipCheckInput = {
  tenantId: string;
  userId: string;
};

export function hasTenantOrUserAccess(row: any, input: OwnershipCheckInput) {
  if (!row) return false;

  const rowTenant = typeof row.tenant_id === 'string' ? row.tenant_id : null;
  const rowUser = typeof row.user_id === 'string' ? row.user_id : null;

  if (rowTenant && rowUser) return rowTenant === input.tenantId || rowUser === input.userId;
  if (rowTenant) return rowTenant === input.tenantId;
  if (rowUser) return rowUser === input.userId;

  // If a table doesn't carry ownership fields, deny by default.
  return false;
}

