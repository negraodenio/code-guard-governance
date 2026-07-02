"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useState, useEffect, useCallback } from "react";
import type { AISystem } from "@/types/systems";

export function SystemTable() {
  const [systems, setSystems] = useState<AISystem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSystems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/systems");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSystems(data.systems ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load systems");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystems();
  }, [fetchSystems]);

  if (loading) return <Spinner className="py-12" />;
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-danger mb-4">{error}</p>
        <Button variant="secondary" onClick={fetchSystems}>Retry</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">{total} systems</p>
        <Link href="/systems/new">
          <Button size="sm">+ New System</Button>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-dark text-left text-gray-400">
              <th className="py-2 px-3 font-medium">Code</th>
              <th className="py-2 px-3 font-medium">Name</th>
              <th className="py-2 px-3 font-medium">Risk Class</th>
              <th className="py-2 px-3 font-medium">Lifecycle</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {systems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">
                  No AI systems registered.{" "}
                  <Link href="/systems/new" className="text-primary hover:underline">
                    Register your first AI system.
                  </Link>
                </td>
              </tr>
            ) : (
              systems.map((s) => (
                <tr key={s.system_id} className="border-b border-border-dark/50 hover:bg-white/5">
                  <td className="py-2 px-3 font-mono text-xs text-gray-300">
                    {s.system_code}
                  </td>
                  <td className="py-2 px-3 text-white">{s.name}</td>
                  <td className="py-2 px-3">
                    <Badge variant={s.risk_class === "high" ? "high" : s.risk_class === "critical" ? "critical" : s.risk_class === "limited" ? "medium" : "low"}>
                      {s.risk_class}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-gray-400 text-xs">{s.lifecycle ?? s.status}</td>
                  <td className="py-2 px-3">
                    <Badge variant={s.status === "production" ? "active" : "registered"}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="py-2 px-3">
                    <Link href={`/systems/${s.system_id}`} className="text-primary text-xs hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}