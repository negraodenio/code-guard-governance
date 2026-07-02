import { SystemTable } from "@/components/systems/SystemTable";

export default function SystemsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">AI Systems</h2>
        <p className="text-sm text-gray-400 mt-1">
          AI System inventory and lifecycle management
        </p>
      </div>
      <SystemTable />
    </div>
  );
}