import * as searchRepo from "@/repositories/search";
import type { SearchResult } from "@/repositories/search";

export async function search(
  orgId: string,
  query: string
): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];
  return searchRepo.searchAll(orgId, query.trim());
}