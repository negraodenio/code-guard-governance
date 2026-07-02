import { NextResponse } from "next/server";
import { getOrgId } from "@/lib/session";
import * as auditService from "@/services/audit";

export async function GET() {
  try {
    const orgId = await getOrgId();
    const integrity = await auditService.getIntegrity(orgId);
    return NextResponse.json(integrity);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify integrity" },
      { status: 500 }
    );
  }
}