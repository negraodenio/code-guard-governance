import { NextResponse } from "next/server";
import { getOrgId } from "@/lib/session";
import * as auditService from "@/services/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await getOrgId();
    const { id } = await params;
    const sequence = parseInt(id, 10);

    if (isNaN(sequence)) {
      return NextResponse.json({ error: "Invalid entry sequence" }, { status: 400 });
    }

    const event = await auditService.getEvent(orgId, sequence);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load event" },
      { status: 500 }
    );
  }
}