
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@codeguard/sdk"

// Initialize Client with Environment Variable
const client = createClient({
    apiKey: Deno.env.get('CODEGUARD_API_KEY') ?? '',
})

serve(async (req) => {
    // CORS Headers for Lovable/Web use
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { code, region } = await req.json()

        // 1. Scan Code
        const scanResult = await client.scan({
            code,
            region: region || 'BR'
        })

        // 2. Return Result
        return new Response(
            JSON.stringify(scanResult),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
