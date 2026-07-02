import { NextResponse } from "next/server";
import { getOrgId, getUserId } from "@/lib/session";
import { createAgentSchema } from "@/lib/validation";
import * as agentService from "@/services/agents";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    const { searchParams } = new URL(request.url);

    const agents = await agentService.listAgents(orgId, {
      risk_level: searchParams.get("risk") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      agent_type: searchParams.get("type") ?? undefined,
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 20,
    });

    return NextResponse.json(agents);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    const userId = await getUserId();
    const body = await request.json();
    const input = createAgentSchema.parse(body);

    const agent = await agentService.registerAgent(orgId, userId, input);

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create agent" },
      { status: 400 }
    );
  }
}