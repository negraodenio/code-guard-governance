"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const stripe_1 = require("stripe");
// CONFIGURAÇÃO
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_PLACEHOLDER'; // Sua chave Privada do Stripe
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:54321/functions/v1/stripe-webhook';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_PLACEHOLDER'; // O segredo que está no Supabase
const stripe = new stripe_1.default(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
async function testWebhook() {
    console.log(`🚀 Testando Webhook: ${WEBHOOK_URL}`);
    // Payload simulado do Stripe (Evento checkout.session.completed)
    const payload = {
        id: 'evt_test_123',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
            object: {
                id: 'cs_test_abc123',
                object: 'checkout.session',
                amount_total: 2000, // $20.00
                currency: 'usd',
                customer_details: {
                    email: 'test_user@example.com' // Email que receberá os créditos
                },
                payment_status: 'paid'
            }
        }
    };
    const payloadString = JSON.stringify(payload, null, 2);
    // Gerar Assinatura válida
    const header = stripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: WEBHOOK_SECRET,
    });
    try {
        const response = await axios_1.default.post(WEBHOOK_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Stripe-Signature': header
            }
        });
        console.log('✅ Sucesso! Resposta:', response.status, response.data);
    }
    catch (error) {
        console.error('❌ Falha:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}
testWebhook();
//# sourceMappingURL=test_webhook.js.map