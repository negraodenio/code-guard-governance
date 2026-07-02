import { NextResponse } from "next/server";
import { getOrgId } from "@/lib/session";
import { getUnifiedGraph } from "@/services/knowledge-graph";

export async function GET() {
  try {
    const orgId = await getOrgId();
    const graph = await getUnifiedGraph(orgId);
    return NextResponse.json(graph);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Knowledge graph failed" },
      { status: 500 }
    );
  }
}