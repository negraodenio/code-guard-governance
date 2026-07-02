import { Redis } from '@upstash/redis';
import crypto from 'crypto';

function getRedis() {
    return Redis.fromEnv();
}

export async function embedMistral(inputs: string[]) {
    const r = await fetch('https://api.mistral.ai/v1/embeddings', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'mistral-embed',
            input: inputs
        })
    });

    if (!r.ok) {
        const err = await r.text();
        throw new Error(`Mistral embeddings failed: ${r.status} - ${err}`);
    }

    const data = await r.json();
    return (data.data as Array<{ embedding: number[] }>).map(x => x.embedding);
}

export async function embedMistralCached(inputs: string[]) {
    const redis = getRedis();
    const results: number[][] = [];
    const toEmbed: { text: string; idx: number }[] = [];

    // 1) Check cache
    for (let i = 0; i < inputs.length; i++) {
        const hash = crypto.createHash('sha256').update(inputs[i]).digest('hex');
        const cached = await redis.get(`emb:${hash}`);

        if (cached) {
            results[i] = (typeof cached === 'string' ? JSON.parse(cached) : cached) as number[];
        } else {
            toEmbed.push({ text: inputs[i], idx: i });
        }
    }

    // 2) Embed uncached
    if (toEmbed.length > 0) {
        const fresh = await embedMistral(toEmbed.map(t => t.text));
        for (let i = 0; i < toEmbed.length; i++) {
            const hash = crypto.createHash('sha256').update(toEmbed[i].text).digest('hex');
            results[toEmbed[i].idx] = fresh[i];
            // Cache for 30 days
            await redis.set(`emb:${hash}`, JSON.stringify(fresh[i]), { ex: 86400 * 30 });
        }
    }

    return results;
}
