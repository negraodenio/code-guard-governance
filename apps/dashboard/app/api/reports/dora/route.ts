import { NextResponse } from "next/server";
import { getOrgId } from "@/lib/session";
import * as reportRepo from "@/repositories/reports";
import { generateDORAReport } from "@/services/reports";

export async function GET() {
  try {
    const orgId = await getOrgId();
    const data = await reportRepo.gatherReportData(orgId);

    if (data.org.industry !== "financial_services" && data.org.industry !== "insurance") {
      return NextResponse.json(
        { error: "DORA report is only available for Financial Services and Insurance" },
        { status: 403 }
      );
    }

    const pdf = generateDORAReport(data);

    return new NextResponse(pdf.slice(0), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="dora-readiness-report-${data.org.date}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Report generation failed" },
      { status: 500 }
    );
  }
}