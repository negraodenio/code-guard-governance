"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Session {
  user: { user_id: string; email: string; full_name: string };
  org: { organisation_id: string; name: string; industry: string };
}

export function useAuth() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setSession(data);
        else setSession(null);
      })
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(() => {
    document.cookie = "codeguard-token=; Path=/; Max-Age=0";
    setSession(null);
    router.push("/login");
  }, [router]);

  return { session, loading, authenticated: !!session, logout };
}