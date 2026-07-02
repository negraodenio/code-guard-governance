
import React, { useState } from 'react';
import { createClient } from '@codeguard/sdk';

// NOTE: In Bolt/Browser, be careful exposing API keys. 
// Ideally, use a backend proxy. For demos, this works directly.
const client = createClient({
    apiKey: 'YOUR_DEMO_KEY' // Or import from environment
});

export default function ComplianceChecker() {
    const [code, setCode] = useState('');
    const [issues, setIssues] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const checkCompliance = async () => {
        setLoading(true);
        try {
            const result = await client.scan({
                code,
                region: 'BR'
            });

            if (result.success && result.result) {
                setIssues(result.result.issues);
            }
        } catch (err) {
            console.error(err);
            alert('Scan failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">CodeGuard Compliance Check</h1>

            <textarea
                className="w-full p-2 border rounded h-40 mb-4 bg-gray-50 text-black"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste your code here..."
            />

            <button
                onClick={checkCompliance}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {loading ? 'Analyzing...' : 'Scan Code'}
            </button>

            <div className="mt-6 space-y-4">
                {issues.map((issue, idx) => (
                    <div key={idx} className={`p-4 rounded border ${issue.severity === 'high' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                        <div className="flex justify-between items-start">
                            <span className="font-bold uppercase text-xs px-2 py-1 rounded bg-white border">
                                {issue.severity}
                            </span>
                            <span className="text-xs text-gray-500">{issue.rule_id}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium">{issue.description}</p>
                        <p className="text-xs text-gray-600 mt-1">{issue.recommendation}</p>
                    </div>
                ))}
                {issues.length === 0 && !loading && code && (
                    <p className="text-green-600">✅ No issues found.</p>
                )}
            </div>
        </div>
    );
}
