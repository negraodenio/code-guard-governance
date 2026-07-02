// ─────────────────────────────────────────────────────────────────────────────
// Agent Lifecycle State Machine (CG-AG-001 / CG-AG-007)
// Single source of truth for allowed status transitions.
// Banking-grade: no state can be skipped; decommissioned is terminal.
// ─────────────────────────────────────────────────────────────────────────────

export const AGENT_STATUSES = [
  "pending_registration",
  "registered",
  "approved",
  "active",
  "suspended",
  "under_review",
  "decommissioned",
] as const;

export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const ALLOWED_TRANSITIONS: Record<AgentStatus, AgentStatus[]> = {
  // Discovered agents must be formally registered before anything else
  pending_registration: ["registered", "under_review", "decommissioned"],
  // Registered agents can be approved, or activated directly
  // (production gate is the separate approved_for_production flag)
  registered: ["approved", "active", "under_review", "decommissioned"],
  // Approved agents can be activated
  approved: ["active", "under_review", "decommissioned"],
  // Active agents can be suspended, reviewed or retired
  active: ["suspended", "under_review", "decommissioned"],
  // Suspended agents can be reactivated (after review) or retired
  suspended: ["active", "under_review", "decommissioned"],
  // Under review can resolve to any operational state
  under_review: ["registered", "approved", "active", "suspended", "decommissioned"],
  // Terminal — a decommissioned agent must be re-registered as a new agent
  decommissioned: [],
};

export function canTransition(from: string, to: string): boolean {
  const allowed = ALLOWED_TRANSITIONS[from as AgentStatus];
  return Array.isArray(allowed) && allowed.includes(to as AgentStatus);
}

/** Throws with a governance-grade message listing the allowed next states. */
export function assertTransition(from: string, to: string): void {
  if (from === to) return; // no-op transitions allowed
  if (!canTransition(from, to)) {
    const allowed = ALLOWED_TRANSITIONS[from as AgentStatus] ?? [];
    throw new LifecycleError(
      `Invalid lifecycle transition '${from}' → '${to}'. ` +
      (allowed.length > 0
        ? `Allowed from '${from}': ${allowed.join(", ")}.`
        : `'${from}' is a terminal state.`)
    );
  }
}

export class LifecycleError extends Error {
  readonly code = "INVALID_LIFECYCLE_TRANSITION";
  constructor(message: string) {
    super(message);
    this.name = "LifecycleError";
  }
}
