/**
 * CouncilIA QStash Task Dispatcher
 * Enables asynchronous processing of high-density decision sessions
 */

import { Client } from "@upstash/qstash";

const rawToken = process.env.QSTASH_TOKEN || process.env.QSTOKEN || "";
const cleanToken = rawToken.startsWith("ASH_") ? rawToken.substring(4) : rawToken;

const qstashClient = new Client({
  token: cleanToken,
});

export interface CouncilIATaskPayload {
  session_id: string;
  proposal: string;
  domain: string;
  jurisdiction: string;
  metadata: any;
  rag_documents: any[];
}

export async function dispatchCouncilIATask(payload: CouncilIATaskPayload) {
  // Use VERCEL_URL or NEXT_PUBLIC_APP_URL for the callback
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const webhookUrl = `${baseUrl}/api/webhooks/councilia`;

  console.log(`[QStash] Queueing CouncilIA Session ${payload.session_id}...`);

  try {
    const res = await qstashClient.publishJSON({
      url: webhookUrl,
      body: {
        type: 'execute-councilia-session',
        payload
      },
      retries: 3,
      // Optional: Add a delay or specific queue if needed
    });

    return { success: true, messageId: res.messageId };
  } catch (error) {
    console.error(`[QStash] Queue failed for ${payload.session_id}:`, error);
    return { success: false, error };
  }
}
