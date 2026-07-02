import { Client } from "@upstash/qstash";

const rawToken = process.env.QSTASH_TOKEN || process.env.QSTOKEN || "";
// Strip potential prefix found in some Vercel setups
const cleanToken = rawToken.startsWith("ASH_") ? rawToken.substring(4) : rawToken;

const qstashClient = new Client({
    token: cleanToken,
});

export async function dispatchRepoIndexTask(repoId: string, shardId: string) {
    // We assume the webhook URL will be the domain + api/webhooks/qstash
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

    const webhookUrl = `${baseUrl}/api/webhooks/qstash`;

    console.log(`[QStash] Dispatching background index task to ${webhookUrl}...`);

    try {
        const res = await qstashClient.publishJSON({
            url: webhookUrl,
            body: {
                type: 'process-repo-chunk',
                payload: {
                    repoId,
                    shardId,
                }
            },
            // You can add retries or delay if you want
            retries: 3
        });

        console.log(`[QStash] Task queued successfully. Message ID: ${res.messageId}`);
        return { success: true, messageId: res.messageId };

    } catch (error) {
        console.error(`[QStash] Failed to publish message:`, error);
        return { success: false, error };
    }
}
