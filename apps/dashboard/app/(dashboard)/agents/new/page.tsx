import { AgentForm } from "@/components/agents/AgentForm";

export default function NewAgentPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Register Agent</h2>
        <p className="text-sm text-gray-400 mt-1">
          Add a new AI agent to the governance registry
        </p>
      </div>
      <AgentForm />
    </div>
  );
}