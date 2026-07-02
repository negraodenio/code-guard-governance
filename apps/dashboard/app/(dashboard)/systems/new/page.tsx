import { SystemForm } from "@/components/systems/SystemForm";

export default function NewSystemPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Register AI System</h2>
        <p className="text-sm text-gray-400 mt-1">
          Add a new AI system to the governance registry
        </p>
      </div>
      <SystemForm />
    </div>
  );
}