export type PlanType = 'free' | 'pro' | 'team' | 'unlimited';

export const PLAN_LIMITS: Record<PlanType, number> = {
    free: 2,
    pro: 30,
    team: 300,
    unlimited: 999999,
};

export function getLimitForPlan(plan: string | null | undefined): number {
    if (!plan) return PLAN_LIMITS.free;

    // If it's a number string (e.g., '9999'), use it directly
    if (/^\d+$/.test(plan)) {
        return parseInt(plan, 10);
    }

    const p = plan.toLowerCase() as PlanType;
    return PLAN_LIMITS[p] || PLAN_LIMITS.free;
}
