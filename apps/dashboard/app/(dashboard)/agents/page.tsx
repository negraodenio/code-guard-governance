import { AgentTable } from "@/components/agents/AgentTable";

export default function AgentsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Agents</h2>
        <p className="text-sm text-gray-400 mt-1">
          AI agent inventory and compliance status
        </p>
      </div>
      <AgentTable />
    </div>
  );
}