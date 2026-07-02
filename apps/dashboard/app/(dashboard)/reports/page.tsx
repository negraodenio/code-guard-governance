"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

export default function ReportsPage() {
  const { session } = useAuth();
  const isDora = session?.org?.industry === "financial_services" || session?.org?.industry === "insurance";

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Reports</h2>
        <p className="text-sm text-gray-400 mt-1">Generate board-ready governance reports</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-white mb-2">Executive Governance</h3>
          <p className="text-sm text-gray-400 mb-4">
            Complete AI estate overview: agents, systems, compliance rate, incidents, and risk distribution.
          </p>
          <div className="space-y-2 text-xs text-gray-500 mb-4">
            <div>· Agent & System inventory</div>
            <div>· Compliance status</div>
            <div>· Risk distribution</div>
            <div>· Open findings & incidents</div>
            <div>· DORA + AI Act summary</div>
          </div>
          <a href="/api/reports/executive" target="_blank">
            <Button>Download PDF</Button>
          </a>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white mb-2">AI Act Compliance</h3>
          <p className="text-sm text-gray-400 mb-4">
            EU AI Act 2024/1689: high-risk systems classification, human oversight, conformity assessment status.
          </p>
          <div className="space-y-2 text-xs text-gray-500 mb-4">
            <div>· Risk classification (Annex III)</div>
            <div>· Human oversight levels</div>
            <div>· Compliance controls</div>
            <div>· System lifecycle</div>
            <div>· Recommendations</div>
          </div>
          <a href="/api/reports/ai-act" target="_blank">
            <Button>Download PDF</Button>
          </a>
        </Card>

        <Card className={!isDora ? "opacity-50" : ""}>
          <h3 className="text-lg font-semibold text-white mb-2">
            DORA Readiness
            {!isDora && <span className="text-xs text-gray-500 ml-2">(Financial Services only)</span>}
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            DORA (EU 2022/2554): ICT operational resilience, incident management, third-party risk.
          </p>
          <div className="space-y-2 text-xs text-gray-500 mb-4">
            <div>· ICT incident summary</div>
            <div>· Major incident classification</div>
            <div>· Reporting status (Art. 19)</div>
            <div>· Third-party concentration risk</div>
            <div>· Compliance recommendations</div>
          </div>
          {isDora ? (
            <a href="/api/reports/dora" target="_blank">
              <Button>Download PDF</Button>
            </a>
          ) : (
            <Button disabled>Financial Services Only</Button>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
          Report Delivery
        </h3>
        <p className="text-sm text-gray-400">
          Reports are generated on-demand from live governance data. Each PDF includes:
        </p>
        <ul className="mt-2 space-y-1 text-sm text-gray-500">
          <li>· Real-time data from your agent and system inventory</li>
          <li>· Compliance gap analysis from CG-AG controls</li>
          <li>· Risk distribution and lifecycle status</li>
          <li>· Auto-generated recommendations based on findings</li>
          <li>· DORA reporting status (Financial Services only)</li>
        </ul>
      </Card>
    </div>
  );
}