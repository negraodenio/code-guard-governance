import { NextResponse } from "next/server";
import { getOrgId } from "@/lib/session";
import * as graphService from "@/services/graph";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const orgId = await getOrgId();
    const { agentId } = await params;

    const paths = await graphService.getRiskPropagation(orgId, agentId);

    return NextResponse.json({ agent_id: agentId, paths });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load risk propagation" },
      { status: 500 }
    );
  }
}