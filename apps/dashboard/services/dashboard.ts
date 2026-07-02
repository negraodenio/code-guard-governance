import * as dashboardRepo from "@/repositories/dashboard";
import type { DashboardSummary } from "@/repositories/dashboard";

export async function getSummary(
  orgId: string,
  industry: string
): Promise<DashboardSummary & { industry: string }> {
  const data = await dashboardRepo.getDashboardData(orgId);
  return { ...data, industry };
}
