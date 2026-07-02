import { db } from "@/lib/db";

export async function createOrg(input: {
  name: string;
  industry: string;
  country?: string;
}): Promise<{ organisation_id: string; name: string; code: string; external_refs: Record<string, unknown> }> {
  const code = input.name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .substring(0, 20);

  const { data, error } = await db.write
    .from("organisations")
    .insert({
      org_code: code,
      legal_name: input.name,
      display_name: input.name,
      country_code: input.country ?? "PT",
    })
    .select("organisation_id, legal_name, org_code")
    .single();

  if (error) throw new Error(`Failed to create organisation: ${error.message}`);
  return {
    organisation_id: (data as any)?.organisation_id,
    name: (data as any)?.legal_name ?? input.name,
    code: (data as any)?.org_code ?? code,
    external_refs: { industry_profile: input.industry },
  };
}

export async function getOrg(orgId: string): Promise<{
  organisation_id: string;
  name: string;
  code: string;
  external_refs: Record<string, unknown>;
} | null> {
  const { data } = await db.read
    .from("organisations")
    .select("organisation_id, legal_name, org_code")
    .eq("organisation_id", orgId)
    .single();

  if (!data) return null;
  return {
    organisation_id: (data as any).organisation_id,
    name: (data as any).legal_name ?? "",
    code: (data as any).org_code ?? "",
    external_refs: {},
  };
}
