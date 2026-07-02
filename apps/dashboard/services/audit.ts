import * as auditRepo from "@/repositories/audit";
import type { LedgerEntry, LedgerFilters, LedgerIntegrity } from "@/repositories/audit";

export async function getEvents(
  orgId: string,
  filters?: LedgerFilters
): Promise<{ events: LedgerEntry[]; total: number }> {
  return auditRepo.getEvents(orgId, filters);
}

export async function getEvent(
  orgId: string,
  entrySequence: number
): Promise<LedgerEntry | null> {
  return auditRepo.getEventById(orgId, entrySequence);
}

export async function getIntegrity(orgId: string): Promise<LedgerIntegrity> {
  return auditRepo.getIntegrity(orgId);
}