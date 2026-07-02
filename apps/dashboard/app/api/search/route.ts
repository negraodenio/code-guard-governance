import { NextResponse } from "next/server";
import { getOrgId } from "@/lib/session";
import * as searchService from "@/services/search";

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";

    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchService.search(orgId, q);

    return NextResponse.json({ results, query: q });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}