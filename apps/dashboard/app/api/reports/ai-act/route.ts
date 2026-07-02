import { NextResponse } from "next/server";
import { getOrgId } from "@/lib/session";
import * as reportRepo from "@/repositories/reports";
import { generateAIActReport } from "@/services/reports";

export async function GET() {
  try {
    const orgId = await getOrgId();
    const data = await reportRepo.gatherReportData(orgId);
    const pdf = generateAIActReport(data);

    return new NextResponse(pdf.slice(0), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ai-act-report-${data.org.date}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Report generation failed" },
      { status: 500 }
    );
  }
}