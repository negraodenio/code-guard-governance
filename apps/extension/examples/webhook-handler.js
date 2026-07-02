#!/usr/bin/env node

/**
 * CodeGuard Webhook Handler Example
 *
 * Implementa um servidor webhook para receber callbacks
 * assíncronos das APIs do CodeGuard
 */

const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware para verificar assinatura do webhook
function verifyWebhookSignature(req, res, next) {
    const signature = req.headers['x-codeguard-signature'];
    const body = JSON.stringify(req.body);

    if (!signature) {
        return res.status(401).json({ error: 'Missing signature' });
    }

    // Em produção, use sua chave secreta real
    const secret = process.env.CODEGUARD_WEBHOOK_SECRET || 'your-webhook-secret';
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

    if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
}

app.use(express.json());

// Endpoint para receber webhooks
app.post('/webhook/codeguard', verifyWebhookSignature, (req, res) => {
    const { event, data, scanId, timestamp } = req.body;

    console.log(`📨 Webhook received: ${event}`);
    console.log(`🔍 Scan ID: ${scanId}`);
    console.log(`📅 Timestamp: ${new Date(timestamp).toISOString()}`);

    switch (event) {
        case 'scan.completed':
            handleScanCompleted(data, scanId);
            break;

        case 'scan.failed':
            handleScanFailed(data, scanId);
            break;

        case 'scan.progress':
            handleScanProgress(data, scanId);
            break;

        default:
            console.log(`⚠️ Unknown event: ${event}`);
    }

    res.json({ received: true });
});

// Handlers para diferentes tipos de eventos
function handleScanCompleted(data, scanId) {
    console.log(`✅ Scan ${scanId} completed successfully`);

    // Salvar resultados no banco de dados
    // Enviar notificação para o usuário
    // Atualizar dashboard
    // Disparar ações automáticas (ex: bloquear PR se houver violações críticas)

    if (data.violations && data.violations.length > 0) {
        console.log(`🚨 Found ${data.violations.length} violations`);

        // Verificar se há violações críticas
        const criticalViolations = data.violations.filter(v => v.severity === 'critical');

        if (criticalViolations.length > 0) {
            console.log(`🚫 Critical violations found! Blocking deployment...`);
            // Aqui você poderia integrar com CI/CD para bloquear o deploy
        }
    }

    // Exemplo: salvar no banco
    saveScanResults(scanId, data);
}

function handleScanFailed(data, scanId) {
    console.log(`❌ Scan ${scanId} failed: ${data.error}`);

    // Logar erro
    // Notificar equipe de devops
    // Tentar novamente ou marcar como falha
}

function handleScanProgress(data, scanId) {
    console.log(`📊 Scan ${scanId} progress: ${data.progress}% - ${data.currentStep}`);
    // Atualizar barra de progresso no dashboard
}

// Função simulada para salvar resultados
function saveScanResults(scanId, data) {
    // Em produção, salve no seu banco de dados
    console.log(`💾 Saving scan ${scanId} results to database...`);

    // Exemplo com Supabase, MongoDB, PostgreSQL, etc.
    // const { supabase } = require('./supabase-client');
    // await supabase.from('scans').insert({
    //     id: scanId,
    //     results: data,
    //     completed_at: new Date()
    // });
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Lista de webhooks registrados (simulado)
app.get('/webhooks', (req, res) => {
    res.json({
        webhooks: [
            {
                id: 'webhook-1',
                url: 'https://your-app.com/webhook/codeguard',
                events: ['scan.completed', 'scan.failed'],
                active: true
            }
        ]
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Webhook server running on port ${PORT}`);
    console.log(`📡 Listening for CodeGuard webhooks at /webhook/codeguard`);
    console.log(`💡 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Shutting down webhook server...');
    process.exit(0);
});

module.exports = app;