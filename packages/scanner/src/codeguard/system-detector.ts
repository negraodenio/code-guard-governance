import type { DiscoveredAgent, DiscoveredSystem } from "./types";

export function groupAgentsIntoLSystems(agents: DiscoveredAgent[]): DiscoveredSystem[] {
  const systems: DiscoveredSystem[] = [];
  const grouped = new Map<string, DiscoveredAgent[]>();

  for (const agent of agents) {
    const dir = agent.filePath.split("/").slice(0, -1).join("/") || "root";
    if (!grouped.has(dir)) grouped.set(dir, []);
    grouped.get(dir)!.push(agent);
  }

  for (const [dir, dirAgents] of grouped) {
    if (dirAgents.length <= 1) continue;

    const frameworks = new Set(dirAgents.map((a) => a.framework));
    const systemName = dir === "root"
      ? `${frameworks.values().next().value} System`
      : `${dir.split("/").pop()?.replace(/[-_]/g, " ")} System`;

    systems.push({
      name: systemName.slice(0, 60),
      agents: dirAgents.map((a) => a.name),
      confidence: Math.min(90, 50 + frameworks.size * 10),
      evidence: [
        `${dirAgents.length} agents in directory: ${dir}`,
        `Frameworks: ${[...frameworks].join(", ")}`,
      ],
    });
  }

  return systems;
}