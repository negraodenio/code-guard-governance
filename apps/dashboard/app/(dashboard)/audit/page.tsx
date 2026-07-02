"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";

interface LedgerEntry {
  entry_sequence: number;
  event_type: string;
  event_description: string;
  subject_type: string;
  subject_id: string;
  actor_user_id: string;
  event_timestamp: string;
  entry_hash: string;
}

interface IntegrityData {
  total_entries: number;
  latest_sequence: number;
  hash_chain_valid: boolean;
  entries_last_30_days: number;
  events_by_type: Array<{ event_type: string; count: number }>;
}

const SUBJECT_TYPES = [
  { value: "", label: "All subjects" },
  { value: "agent", label: "Agent" },
  { value: "ai_system", label: "AI System" },
  { value: "policy", label: "Policy" },
  { value: "risk", label: "Risk" },
  { value: "evidence", label: "Evidence" },
  { value: "incident", label: "Incident" },
  { value: "approval", label: "Approval" },
  { value: "exception", label: "Exception" },
];

export default function AuditPage() {
  const [events, setEvents] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [integrity, setIntegrity] = useState<IntegrityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [subjectType, setSubjectType] = useState("");
  const [eventType, setEventType] = useState("");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (search) params.set("search", search);
      if (subjectType) params.set("subject_type", subjectType);
      if (eventType) params.set("event_type", eventType);

      const res = await fetch(`/api/audit/events?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setEvents(data.events ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [page, search, subjectType, eventType]);

  useEffect(() => {
    fetchEvents();
    fetch("/api/audit/integrity")
      .then((r) => r.json())
      .then(setIntegrity)
      .catch(() => {});
  }, [fetchEvents]);

  const totalPages = Math.ceil(total / 50);

  function formatDate(ts: string) {
    return new Date(ts).toLocaleString();
  }

  function shortHash(hash: string) {
    return hash.slice(0, 12) + "...";
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Audit Center</h2>
        <p className="text-sm text-gray-400 mt-1">Immutable governance ledger — all events, auditable, tamper-proof</p>
      </div>

      {/* Integrity Widget */}
      {integrity && (
        <Card className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Ledger Integrity</h3>
          <div className="grid grid-cols-5 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Total Entries</div>
              <div className="text-white text-lg font-bold">{integrity.total_entries.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-500">Latest Sequence</div>
              <div className="text-white text-lg font-bold">#{integrity.latest_sequence}</div>
            </div>
            <div>
              <div className="text-gray-500">Last 30 Days</div>
              <div className="text-white text-lg font-bold">{integrity.entries_last_30_days}</div>
            </div>
            <div>
              <div className="text-gray-500">Hash Chain</div>
              <div className="text-lg font-bold">
                <Badge variant={integrity.hash_chain_valid ? "passed" : "failed"}>
                  {integrity.hash_chain_valid ? "VALID" : "BROKEN"}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-gray-500">Event Types</div>
              <div className="text-white text-lg font-bold">{integrity.events_by_type.length}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Search events..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <Select
          options={SUBJECT_TYPES}
          value={subjectType}
          onChange={(e) => { setSubjectType(e.target.value); setPage(1); }}
          className="max-w-[180px]"
        />
        <Input
          placeholder="Event type..."
          value={eventType}
          onChange={(e) => { setEventType(e.target.value); setPage(1); }}
          className="max-w-[200px]"
        />
      </div>

      {loading && <Spinner className="py-6" />}
      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {!loading && events.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No ledger entries found</p>
          <p className="text-sm text-gray-600 mt-1">
            Events are recorded when agents, systems, policies, or risks are created or modified.
          </p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-dark text-left text-gray-400">
                  <th className="py-2 px-3 font-medium">Seq</th>
                  <th className="py-2 px-3 font-medium">Timestamp</th>
                  <th className="py-2 px-3 font-medium">Event</th>
                  <th className="py-2 px-3 font-medium">Subject</th>
                  <th className="py-2 px-3 font-medium">Actor</th>
                  <th className="py-2 px-3 font-medium">Hash</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.entry_sequence} className="border-b border-border-dark/50 hover:bg-white/5">
                    <td className="py-2 px-3 font-mono text-xs text-primary">
                      <Link href={`/audit/${e.entry_sequence}`} className="hover:underline">
                        #{e.entry_sequence}
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-400">{formatDate(e.event_timestamp)}</td>
                    <td className="py-2 px-3">
                      <div className="text-white text-xs">{e.event_type}</div>
                      <div className="text-gray-500 text-xs truncate max-w-[200px]">{e.event_description}</div>
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="registered">{e.subject_type}</Badge>
                      <span className="text-xs text-gray-500 ml-1">{e.subject_id.slice(0, 8)}</span>
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-400 font-mono">{e.actor_user_id.slice(0, 8)}</td>
                    <td className="py-2 px-3 font-mono text-xs text-gray-600">{shortHash(e.entry_hash)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}