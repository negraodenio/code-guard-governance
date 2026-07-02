'use client';

import { useState } from 'react';

interface ScorecardData {
  repo?: string;
  certification?: string;
  complianceScore?: number;
  totalRisks?: number;
  totalAgents?: number;
  totalModels?: number;
  totalEntities?: number;
  totalRelationships?: number;
  regulations?: { id: string; status: string; name: string }[];
  topRisks?: { id: string; severity: string; title: string; category: string }[];
  aiActSummary?: { highRiskCount: number; limitedRiskCount: number; minimalRiskCount: number };
}

export default function ScorecardPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleScan() {
    if (!repoUrl) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetch('/api/scanner/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, view: 'board' }),
      });
      if (!res.ok) throw new Error(`Scanner error: ${res.statusText}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const certColor: Record<string, string> = {
    bronze: 'bg-amber-700', silver: 'bg-gray-400', gold: 'bg-yellow-500', platinum: 'bg-blue-300',
  };
  const severityColor: Record<string, string> = {
    critical: 'bg-red-600', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-green-500',
  };
  const statusColor: Record<string, string> = {
    compliant: 'text-green-400', partial: 'text-yellow-400', non_compliant: 'text-red-400', not_applicable: 'text-gray-400',
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">GraphOS Scorecard</h1>
        <p className="text-gray-400 mb-6">Public governance scorecard for any GitHub repository</p>

        <div className="flex gap-3 mb-8">
          <input
            type="text"
            value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="flex-1 bg-[#1a1a2e] border border-gray-700 rounded px-4 py-3 text-white placeholder-gray-500"
          />
          <button
            onClick={handleScan}
            disabled={loading || !repoUrl}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 px-6 py-3 rounded font-semibold"
          >
            {loading ? 'Scanning...' : 'Scan'}
          </button>
        </div>

        {error && <div className="bg-red-900/50 border border-red-700 rounded p-4 mb-6">{error}</div>}

        {data && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-[#1a1a2e] rounded-lg p-6 border border-gray-800">
              <h2 className="text-xl font-semibold mb-1">{data.repo || 'Repository'}</h2>
              <div className="flex gap-2 mt-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${certColor[data.certification || ''] || 'bg-gray-700'}`}>
                  {data.certification?.toUpperCase() || 'NONE'}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-700">
                  Score: {data.complianceScore ?? 'N/A'}%
                </span>
                <a
                  href={`/graphos?repo=${encodeURIComponent(repoUrl)}`}
                  target="_blank"
                  className="px-3 py-1 rounded-full text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white"
                >
                  View in GraphOS →
                </a>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Risks', value: data.totalRisks, color: 'text-red-400' },
                { label: 'Agents', value: data.totalAgents, color: 'text-blue-400' },
                { label: 'Models', value: data.totalModels, color: 'text-purple-400' },
                { label: 'Regulations', value: data.regulations?.length, color: 'text-green-400' },
                { label: 'Entities', value: data.totalEntities, color: 'text-teal-400' },
                { label: 'Relationships', value: data.totalRelationships, color: 'text-yellow-400' },
              ].map(s => (
                <div key={s.label} className="bg-[#1a1a2e] rounded-lg p-4 border border-gray-800">
                  <div className="text-gray-400 text-sm">{s.label}</div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value ?? '-'}</div>
                </div>
              ))}
            </div>

            {/* EU AI Act */}
            {data.aiActSummary && (
              <div className="bg-[#1a1a2e] rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold mb-2">EU AI Act Classification</h3>
                <div className="flex gap-4 text-sm">
                  <span className="text-red-400">{data.aiActSummary.highRiskCount} High-Risk</span>
                  <span className="text-yellow-400">{data.aiActSummary.limitedRiskCount} Limited-Risk</span>
                  <span className="text-green-400">{data.aiActSummary.minimalRiskCount} Minimal-Risk</span>
                </div>
              </div>
            )}

            {/* Top Risks */}
            {data.topRisks && data.topRisks.length > 0 && (
              <div className="bg-[#1a1a2e] rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold mb-3">Top Risks</h3>
                <div className="space-y-2">
                  {data.topRisks.slice(0, 10).map(r => (
                    <div key={r.id} className="flex items-center gap-2 text-sm">
                      <span className={`w-2 h-2 rounded-full ${severityColor[r.severity] || 'bg-gray-500'}`} />
                      <span className="text-gray-300">{r.title}</span>
                      <span className="text-gray-500 ml-auto">{r.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regulations */}
            {data.regulations && data.regulations.length > 0 && (
              <div className="bg-[#1a1a2e] rounded-lg p-4 border border-gray-800">
                <h3 className="font-semibold mb-3">Regulations</h3>
                <div className="space-y-2">
                  {data.regulations.map(r => (
                    <div key={r.id} className="flex items-center gap-2 text-sm">
                      <span className={`font-medium ${statusColor[r.status] || 'text-gray-400'}`}>
                        [{r.status.replace('_', ' ')}]
                      </span>
                      <span className="text-gray-300">{r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-gray-500 text-xs text-center mt-4">
              Scan results are read-only and publicly accessible. No data is stored.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
