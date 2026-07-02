import { callLLM } from '@/services/councilia/provider';
import { apiOk, apiError } from '@/lib/api/error';
import { transformPreviewToGraph } from '@/lib/graphos/transformer';

export async function POST(req: Request) {
    try {
        const { idea } = await req.json();
        if (!idea) return apiError('Missing idea', 400);

        const perspectives = [
            { id: 'strategic', name: 'Strategic Perspective', emoji: '🎯', prompt: 'Analyze the long-term strategic viability of this idea. Be concise and high-level.' },
            { id: 'contrarian', name: 'Contrarian Perspective', emoji: '⚖️', prompt: 'Identify the primary blind spots and potential reasons why this idea might fail. Be critical but constructive.' },
            { id: 'risk', name: 'Risk & Compliance', emoji: '🛡️', prompt: 'Identify critical risks (regulatory, operational, or safety) associated with this idea.' }
        ];

        const results = await Promise.all(perspectives.map(async (p) => {
            const text = await callLLM([
                { role: 'system', content: `You are the ${p.name} of an elite strategic council. ${p.prompt} Respond in 2-3 sentences.` },
                { role: 'user', content: `IDEA: ${idea}` }
            ], { temperature: 0.7 });
            return { ...p, text };
        }));

        const recommendation = await callLLM([
            { role: 'system', content: 'You are the Chief Strategy Officer. Based on the perspectives provided, give a final 1-sentence recommendation and a confidence score (0-100).' },
            { role: 'user', content: `IDEA: ${idea}\n\nANALYSIS:\n${results.map(r => `${r.name}: ${r.text}`).join('\n')}` }
        ], { temperature: 0.3 });

        const scoreMatch = recommendation.match(/(\d{1,3})/);
        const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 75;

        const graphData = transformPreviewToGraph(results, recommendation, score, idea);

        return apiOk({
            perspectives: results,
            recommendation,
            score,
            graphData,
        });
    } catch (error: any) {
        console.error('[Preview API] Error:', error);
        return apiError(error.message, 500);
    }
}
