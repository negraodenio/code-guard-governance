import { Suspense } from 'react';
import type { Metadata } from 'next';
import GraphOSDashboard from '@/graphos/ui/GraphOSDashboard';

export const metadata: Metadata = {
  title: 'GraphOS — Topology & Intelligence | CouncilIA',
  description: 'Agent topology, risk mapping, compliance view, and decision reconstruction.',
};

export default function GraphOSPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center text-white">Loading GraphOS...</div>}>
      <GraphOSDashboard />
    </Suspense>
  );
}
