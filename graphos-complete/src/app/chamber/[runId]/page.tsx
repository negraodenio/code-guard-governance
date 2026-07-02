'use client';

import { useParams } from 'next/navigation';
import DebateChamber from '@/ui/DebateChamber';

export default function ChamberPage() {
    const { runId } = useParams();

    if (!runId || typeof runId !== 'string') {
        return (
            <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center">
                <p className="text-[#163a9c] text-lg font-bold">Invalid session ID</p>
            </div>
        );
    }

    return <DebateChamber runId={runId} />;
}
