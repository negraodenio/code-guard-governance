import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/session";
import * as dashboardService from "@/services/dashboard";
import * as orgRepo from "@/repositories/organisations";

export async function GET() {
  try {
    const { orgId } = await getSessionContext();
    if (!orgId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const org = await orgRepo.getOrg(orgId);
    const industry = (org?.external_refs as Record<string, string>)?.industry_profile ?? "other";

    const summary = await dashboardService.getSummary(orgId, industry);

    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dashboard" },
      { status: 500 }
    );
  }
}