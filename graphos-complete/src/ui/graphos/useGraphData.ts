'use client';

import { useState, useEffect } from 'react';
import type { GraphData } from './types';

interface UseGraphDataOptions {
  runId?: string;
  previewIdea?: string;
  autoLoad?: boolean;
}

export function useGraphData({ runId, previewIdea, autoLoad = true }: UseGraphDataOptions) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFromRun = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/${id}/graph`);
      const json = await res.json();
      if (json.ok && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.error ?? 'Failed to load graph data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadFromPreview = async (idea: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/session/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      });
      const json = await res.json();
      if (json.ok) {
        const { data: previewData } = json;
        if (previewData?.graphData) {
          setData(previewData.graphData);
        } else {
          setData(null);
        }
      } else {
        throw new Error(json.error ?? 'Preview failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    if (runId) loadFromRun(runId);
    else if (previewIdea) loadFromPreview(previewIdea);
  };

  useEffect(() => {
    if (!autoLoad) return;
    if (runId) loadFromRun(runId);
  }, [runId, autoLoad]);

  return { data, loading, error, loadFromRun, loadFromPreview, refresh };
}
