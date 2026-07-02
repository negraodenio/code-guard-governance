import * as graphRepo from "@/repositories/graph";
import type { EstateData, TraversalResult, PropagationPath } from "@/repositories/graph";

export { type EstateData } from "@/repositories/graph";

export async function getEstate(orgId: string): Promise<EstateData> {
  return graphRepo.getEstate(orgId);
}

export async function getTraversal(
  orgId: string,
  agentId: string,
  maxDepth?: number
): Promise<TraversalResult[]> {
  return graphRepo.getTraversal(orgId, agentId, maxDepth);
}

export async function getRiskPropagation(
  orgId: string,
  agentId: string
): Promise<PropagationPath[]> {
  return graphRepo.getRiskPropagation(orgId, agentId);
}

export async function recomputePropagation(orgId: string): Promise<void> {
  return graphRepo.recomputePropagation(orgId);
}