import { headers } from "next/headers";

export async function getOrgId(): Promise<string> {
  const h = await headers();
  const orgId = h.get("x-codeguard-org");
  if (!orgId) throw new Error("Organisation not found in session");
  return orgId;
}

export async function getUserId(): Promise<string> {
  const h = await headers();
  const userId = h.get("x-codeguard-user");
  if (!userId) throw new Error("User not found in session");
  return userId;
}

export async function getSessionContext(): Promise<{
  userId: string;
  orgId: string;
  email: string;
  role: string;
}> {
  const h = await headers();
  return {
    userId: h.get("x-codeguard-user") ?? "",
    orgId: h.get("x-codeguard-org") ?? "",
    email: h.get("x-codeguard-email") ?? "",
    role: h.get("x-codeguard-role") ?? "",
  };
}