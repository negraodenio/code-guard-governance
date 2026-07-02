import ReactFlowGraph from "@/components/graph/ReactFlowGraph";

export default function GraphPage() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-white">GraphOS</h2>
        <p className="text-sm text-gray-400 mt-1">Agent dependency graph — click nodes to explore</p>
      </div>
      <ReactFlowGraph />
    </div>
  );
}