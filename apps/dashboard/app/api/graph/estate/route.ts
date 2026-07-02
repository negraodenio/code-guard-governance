import { NextResponse } from "next/server";
import { getOrgId } from "@/lib/session";
import * as graphService from "@/services/graph";

export async function GET() {
  try {
    const orgId = await getOrgId();
    const data = await graphService.getEstate(orgId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load estate" },
      { status: 500 }
    );
  }
}