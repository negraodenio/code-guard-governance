// Agent Lifecycle State Machine — espelho canônico (apps/dashboard/lib/lifecycle.ts)
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending_registration: ['registered', 'under_review', 'decommissioned'],
  registered: ['approved', 'active', 'under_review', 'decommissioned'],
  approved: ['active', 'under_review', 'decommissioned'],
  active: ['suspended', 'under_review', 'decommissioned'],
  suspended: ['active', 'under_review', 'decommissioned'],
  under_review: ['registered', 'approved', 'active', 'suspended', 'decommissioned'],
  decommissioned: [],
};

export function canTransition(from: string, to: string): boolean {
  if (from === to) return true;
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export function transitionError(from: string, to: string): string {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  return `Transição inválida '${from}' → '${to}'. ` +
    (allowed.length > 0 ? `Permitidas: ${allowed.join(', ')}.` : `'${from}' é estado terminal.`);
}
