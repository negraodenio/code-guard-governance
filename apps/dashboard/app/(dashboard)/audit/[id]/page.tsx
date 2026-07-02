"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface LedgerEntry {
  entry_sequence: number;
  entry_id: string;
  event_type: string;
  event_description: string;
  subject_type: string;
  subject_id: string;
  actor_user_id: string;
  actor_ip: string | null;
  organisation_id: string;
  event_timestamp: string;
  recorded_at: string;
  previous_hash: string;
  entry_hash: string;
  payload: Record<string, unknown>;
}

export default function AuditDetailPage() {
  const params = useParams();
  const [event, setEvent] = useState<LedgerEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/audit/events/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Event not found");
        return res.json();
      })
      .then((data) => setEvent(data.event))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <Spinner className="py-12" />;
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-danger mb-4">{error}</p>
        <Link href="/audit"><Button variant="secondary">Back to Audit</Button></Link>
      </div>
    );
  }
  if (!event) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/audit" className="text-xs text-gray-400 hover:text-white mb-1 block">
            ← Back to Audit Center
          </Link>
          <h2 className="text-xl font-bold text-white">Ledger Entry #{event.entry_sequence}</h2>
          <p className="text-sm text-gray-400 mt-1">{event.event_type}</p>
        </div>
        <Badge variant="registered">Immutable</Badge>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Event Details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Event Type</dt>
              <dd className="text-white">{event.event_type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Subject Type</dt>
              <dd className="text-white">{event.subject_type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Subject ID</dt>
              <dd className="text-white font-mono text-xs">{event.subject_id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Actor ID</dt>
              <dd className="text-white font-mono text-xs">{event.actor_user_id}</dd>
            </div>
            {event.actor_ip && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Actor IP</dt>
                <dd className="text-white font-mono text-xs">{event.actor_ip}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Organisation</dt>
              <dd className="text-white font-mono text-xs">{event.organisation_id.slice(0, 12)}...</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Timestamps</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Event Timestamp</dt>
              <dd className="text-white">{new Date(event.event_timestamp).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Recorded At</dt>
              <dd className="text-white">{new Date(event.recorded_at).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Entry ID</dt>
              <dd className="text-white font-mono text-xs">{event.entry_id.slice(0, 16)}...</dd>
            </div>
          </dl>
        </Card>

        <Card className="col-span-2">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Hash Chain</h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-gray-500 mb-1">Previous Hash</div>
              <div className="text-white font-mono text-xs break-all bg-surface-dark p-3 rounded-lg">
                {event.previous_hash}
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Entry Hash</div>
              <div className="text-white font-mono text-xs break-all bg-surface-dark p-3 rounded-lg">
                {event.entry_hash}
              </div>
            </div>
          </div>
        </Card>

        <Card className="col-span-2">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Description</h3>
          <p className="text-sm text-gray-300">{event.event_description}</p>
        </Card>

        <Card className="col-span-2">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Payload</h3>
          <pre className="text-xs text-gray-300 font-mono bg-surface-dark p-4 rounded-lg overflow-x-auto max-h-96">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </Card>
      </div>
    </div>
  );
}