
import { ComplianceReport } from '../report/types';

/**
 * SECURITY: HTML escaping utility to prevent XSS attacks
 * Escapes user-controlled data before inserting into HTML
 */
function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < 32; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
    return out;
}

export function getWebviewContent(report: ComplianceReport): string {
    const isPaid = report.plan !== 'FREE';
    const effectivePlan = (report.plan === 'PROFESSIONAL' && (report as any).creditBalance > 0) ? 'CREDIT' : report.plan;
    const nonce = getNonce();

    // Calculate Score (Mock logic based on violation density for now, or use real if available)
    const violationCount = report.violations.length;
    const score = Math.max(0, 100 - (violationCount * 5));
    const scoreColor = score > 80 ? 'text-success' : (score > 50 ? 'text-warning' : 'text-danger');
    const scoreGradient = score > 80 ? 'from-success to-primary' : (score > 50 ? 'from-warning to-danger' : 'from-danger to-purple-900');

    // Safe serialization
    const safeReport = JSON.stringify(report).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

    return `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1.0" name="viewport" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; script-src 'nonce-${nonce}' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; font-src https://fonts.gstatic.com;">
    <title>CodeGuard AI Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1" rel="stylesheet" />
    <script nonce="${nonce}" src="https://cdn.tailwindcss.com"></script>
    <script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script nonce="${nonce}">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#1337ec",
                        "accent-cyan": "#00f2ff",
                        "accent-purple": "#7c3aed",
                        "surface-dark": "#111111",
                        "border-dark": "#232948",
                        "background-dark": "#0a0a0a",
                        "danger": "#ef4444",
                        "warning": "#f59e0b",
                        "success": "#10b981",
                    },
                    fontFamily: {
                        "display": ["Inter", "sans-serif"],
                        "mono": ["JetBrains Mono", "monospace"],
                    }
                }
            }
        }
    </script>
    <style>
        .glass-panel {
            background: rgba(17, 17, 17, 0.7);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(35, 41, 72, 0.5);
        }
        /* Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #232948; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #1337ec; }
    </style>
</head>

<body class="bg-background-dark text-white font-display antialiased overflow-hidden h-screen flex">
    <!-- Sidebar -->
    <aside class="w-20 lg:w-64 border-r border-border-dark flex flex-col bg-surface-dark/50 hidden md:flex">
        <div class="h-16 flex items-center gap-3 px-6 border-b border-border-dark">
            <span class="material-symbols-outlined text-primary text-2xl">shield_lock</span>
            <span class="font-bold text-lg hidden lg:block">CodeGuard</span>
        </div>
        <nav class="flex-1 py-6 px-3 space-y-1">
            <a href="#" class="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary font-medium">
                <span class="material-symbols-outlined">dashboard</span>
                <span class="hidden lg:block">Overview</span>
            </a>
            <div class="mt-auto p-4 border-t border-border-dark">
                 <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent-purple flex items-center justify-center text-xs font-bold">U</div>
                    <div class="hidden lg:block">
                        <div class="text-sm font-medium">${effectivePlan} Plan</div>
                    </div>
                </div>
            </div>
        </nav>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden relative">
        <!-- Header -->
        <header class="h-16 border-b border-border-dark flex items-center justify-between px-8 bg-background-dark/80 backdrop-blur-md z-10">
            <h1 class="text-xl font-bold flex items-center gap-2">
                <span class="material-symbols-outlined md:hidden text-primary">shield_lock</span>
                Compliance Overview
            </h1>
            <div class="flex items-center gap-4">
               ${!isPaid ?
            `<button data-action="upgrade" class="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:shadow-lg transition-all">
                    <span class="material-symbols-outlined text-lg">rocket_launch</span>
                    Upgrade Plan
                </button>` :
            `<span class="text-xs text-success bg-success/10 px-2 py-1 rounded border border-success/20">PRO ACTIVE</span>`
        }
            </div>
        </header>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-8">

            <!-- Top Metrics Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <!-- Compliance Score -->
                <div class="glass-panel p-6 rounded-xl relative overflow-hidden group">
                    <div class="text-sm text-gray-400 mb-1">Overall Security Score</div>
                    <div class="flex items-end gap-3">
                        <span class="text-4xl font-bold ${scoreColor}">${score}</span>
                        <span class="text-sm text-gray-400 mb-1">/ 100</span>
                    </div>
                    <div class="w-full h-1.5 bg-gray-800 rounded-full mt-4 overflow-hidden">
                        <div class="h-full bg-gradient-to-r ${scoreGradient}" style="width: ${score}%"></div>
                    </div>
                </div>

                <!-- Critical Issues -->
                <div class="glass-panel p-6 rounded-xl relative overflow-hidden">
                    <div class="text-sm text-gray-400 mb-1">Critical Issues</div>
                    <div class="flex items-end gap-3">
                        <span class="text-4xl font-bold text-danger">${report.summaryCounts.critical}</span>
                    </div>
                    <div class="text-xs text-gray-500 mt-2">Requires immediate attention</div>
                </div>

                 <!-- Total Issues -->
                <div class="glass-panel p-6 rounded-xl relative overflow-hidden">
                    <div class="text-sm text-gray-400 mb-1">Total Violations</div>
                    <div class="flex items-end gap-3">
                        <span class="text-4xl font-bold text-white">${report.violations.length}</span>
                    </div>
                     <div class="text-xs text-gray-500 mt-2">Across scanned files</div>
                </div>

                <!-- Coverage -->
                <div class="glass-panel p-6 rounded-xl relative overflow-hidden">
                    <div class="text-sm text-gray-400 mb-1">Regulations Checked</div>
                    <div class="flex items-end gap-3">
                         <div class="flex gap-1 mt-2">
                            <span class="px-1.5 py-0.5 rounded text-[10px] bg-blue-900/30 text-blue-400 border border-blue-800">GDPR</span>
                            <span class="px-1.5 py-0.5 rounded text-[10px] bg-purple-900/30 text-purple-400 border border-purple-800">LGPD</span>
                             <span class="px-1.5 py-0.5 rounded text-[10px] bg-green-900/30 text-green-400 border border-green-800">AI Act</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Violations Table -->
            <div class="glass-panel rounded-xl overflow-hidden">
                <div class="px-6 py-4 border-b border-border-dark flex items-center justify-between">
                    <h3 class="font-bold text-lg">Active Violations</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left text-gray-400">
                        <thead class="text-xs text-gray-500 uppercase bg-surface-dark border-b border-border-dark">
                            <tr>
                                <th class="px-6 py-3">Severity</th>
                                <th class="px-6 py-3">Rule</th>
                                <th class="px-6 py-3">Message</th>
                                <th class="px-6 py-3">Location</th>
                                <th class="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.violations.map((v, i) => `
                            <tr class="bg-surface-dark/20 border-b border-border-dark/50 hover:bg-surface-dark/40 transition-colors">
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 rounded-full text-xs font-bold ${v.severity === 'CRITICAL' ? 'bg-danger/10 text-danger border border-danger/20' : (v.severity === 'HIGH' ? 'bg-warning/10 text-warning border border-warning/20' : 'bg-success/10 text-success border border-success/20')}">${v.severity}</span>
                                </td>
                                <td class="px-6 py-4 font-mono text-xs text-white">${escapeHtml(v.rule)}</td>
                                <td class="px-6 py-4 font-medium">${escapeHtml(v.message)}</td>
                                <td class="px-6 py-4 font-mono text-xs opacity-70">Ln ${v.line}</td>
                                <td class="px-6 py-4 text-right">
                                    ${v.suggestedFix ?
                `<button data-action="applyFix" data-fix="${encodeURIComponent(v.suggestedFix)}" class="text-primary hover:text-white font-medium hover:underline bg-primary/10 px-3 py-1.5 rounded border border-primary/30 transition-all hover:bg-primary hover:border-primary">Auto-Fix</button>` :
                `<span class="text-gray-600 italic">Manual</span>`
            }
                                </td>
                            </tr>
                            `).join('')}
                             
                            ${report.violations.length === 0 ? `
                            <tr>
                                <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                                    <span class="material-symbols-outlined text-4xl mb-2 text-success">check_circle</span>
                                    <p>Great job! No violations detected.</p>
                                </td>
                            </tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Footer Upgrade Call -->
            ${!isPaid ? `
            <div class="mt-8 bg-gradient-to-r from-surface-dark to-purple-900/20 border border-border-dark rounded-xl p-8 text-center">
                <h2 class="text-2xl font-bold text-white mb-2">Detailed Compliance Reports</h2>
                <p class="text-gray-400 mb-6 max-w-xl mx-auto">Upgrade to Professional to export PDF audit reports, unlock AI-powered automated fixes for complex issues, and access full history.</p>
                <div class="flex justify-center gap-4">
                     <button data-action="upgrade" class="bg-primary hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg shadow-blue-900/30">
                         Start 14-Day Free Trial
                     </button>
                </div>
            </div>
            ` : ''}

        </div>
    </main>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        document.addEventListener('click', (e) => {
            const target = e.target;
            const btn = target && target.closest ? target.closest('button[data-action]') : null;
            if (!btn) return;

            const action = btn.getAttribute('data-action');
            if (action === 'upgrade') {
                vscode.postMessage({ command: 'upgrade' });
            }

            if (action === 'applyFix') {
                const fixEnc = btn.getAttribute('data-fix') || '';
                const fixCode = decodeURIComponent(fixEnc);
                vscode.postMessage({ command: 'fixViolation', id: fixCode });
            }
        });
    </script>
</body>
</html>`;
}


function renderComplianceItem(name: string, status: string): string {
    const isRisk = status.includes('risk');
    const isAligned = status.includes('aligned');

    let icon = '⚪'; // Default/Not Applicable
    if (isRisk) icon = '⚠️';
    if (isAligned) icon = '✅';

    // Clean up status text
    const cleanStatus = status.replace('risk detected', 'Risk').replace('aligned', 'Aligned').replace('not applicable', 'N/A');

    return `
        <div class="compliance-item" style="border-left: 4px solid ${isRisk ? '#d32f2f' : (isAligned ? '#4caf50' : '#bdbdbd')}">
            <strong>${name}</strong>
            <span class="status-icon" title="${status}">${icon} <small>${cleanStatus}</small></span>
        </div>
    `;
}

/**
 * Generate webview content for Deep Compliance Audit results
 */
export function getComplianceAuditWebviewContent(result: any): string {
    const statusColors: Record<string, string> = {
        'pass': '#4caf50',
        'warn': '#ff9800',
        'fail': '#d32f2f'
    };

    const statusEmojis: Record<string, string> = {
        'pass': '✅',
        'warn': '⚠️',
        'fail': '❌'
    };

    const severityColors: Record<string, string> = {
        'High': '#d32f2f',
        'Alta': '#d32f2f',
        'Medium': '#ff9800',
        'Média': '#ff9800',
        'Low': '#4caf50',
        'Baixa': '#4caf50'
    };

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>CodeGuard Compliance Audit Report</title>
    <style>
        :root {
            --primary: #007acc;
            --success: #4caf50;
            --warning: #ff9800;
            --danger: #d32f2f;
            --bg-dark: #1e1e1e;
            --bg-card: #252526;
            --border: #3c3c3c;
            --text: #cccccc;
            --text-muted: #888888;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-dark);
            color: var(--text);
            padding: 20px;
            line-height: 1.6;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 12px;
            margin-bottom: 20px;
            border: 1px solid var(--border);
        }
        
        .header h1 {
            font-size: 1.5em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .header .logo {
            font-size: 1.8em;
        }
        
        .status-badge {
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.9em;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: var(--primary);
        }
        
        .stat-label {
            color: var(--text-muted);
            font-size: 0.85em;
            margin-top: 5px;
        }
        
        .framework-section {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 15px;
            overflow: hidden;
        }
        
        .framework-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: rgba(255,255,255,0.03);
            border-bottom: 1px solid var(--border);
            cursor: pointer;
        }
        
        .framework-header:hover {
            background: rgba(255,255,255,0.05);
        }
        
        .framework-name {
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .framework-stats {
            display: flex;
            gap: 15px;
            align-items: center;
        }
        
        .issue-count {
            background: var(--danger);
            color: white;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 0.85em;
        }
        
        .issue-count.zero {
            background: var(--success);
        }
        
        .framework-body {
            padding: 15px 20px;
        }
        
        .issue-item {
            background: rgba(0,0,0,0.2);
            border-left: 3px solid var(--danger);
            padding: 12px 15px;
            margin-bottom: 10px;
            border-radius: 0 6px 6px 0;
        }
        
        .issue-item.medium {
            border-color: var(--warning);
        }
        
        .issue-item.low {
            border-color: var(--success);
        }
        
        .issue-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }
        
        .issue-title {
            font-weight: 500;
            flex: 1;
        }
        
        .severity-badge {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75em;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .issue-meta {
            color: var(--text-muted);
            font-size: 0.85em;
            display: flex;
            gap: 15px;
            margin-bottom: 8px;
        }
        
        .issue-recommendation {
            background: rgba(0,122,204,0.1);
            border: 1px solid rgba(0,122,204,0.3);
            padding: 10px;
            border-radius: 4px;
            font-size: 0.9em;
            margin-top: 10px;
        }
        
        .issue-recommendation strong {
            color: var(--primary);
        }
        
        .code-fix {
            background: var(--bg-dark);
            border: 1px solid var(--border);
            padding: 10px;
            border-radius: 4px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.85em;
            margin-top: 10px;
            white-space: pre-wrap;
            overflow-x: auto;
        }
        
        .btn {
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85em;
            transition: opacity 0.2s;
        }
        
        .btn:hover { opacity: 0.8; }
        
        .btn-primary {
            background: var(--primary);
            color: white;
        }
        
        .btn-success {
            background: var(--success);
            color: white;
        }
        
        .actions {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        
        .summary-box {
            background: rgba(0,122,204,0.1);
            border: 1px solid var(--primary);
            border-radius: 8px;
            padding: 15px;
            margin-top: 10px;
        }
        
        .timestamp {
            color: var(--text-muted);
            font-size: 0.85em;
            text-align: right;
            margin-top: 20px;
        }
        
    <style>
        /* ... existing styles ... */
        
        .certificate-container {
            background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(33, 150, 243, 0.1) 100%);
            border: 2px solid #4caf50;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            text-align: center;
            position: relative;
            overflow: hidden;
            animation: slideDown 0.5s ease-out;
        }

        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .cert-badge-icon {
            font-size: 3em;
            margin-bottom: 10px;
            display: inline-block;
            filter: drop-shadow(0 0 10px rgba(76, 175, 80, 0.5));
        }

        .cert-title {
            font-size: 1.8em;
            font-weight: 800;
            background: linear-gradient(to right, #4caf50, #2196f3);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }

        .cert-desc {
            color: var(--text);
            margin-bottom: 20px;
            font-size: 1.1em;
        }

        .share-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .btn-social {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            color: white;
            font-size: 0.95em;
            text-decoration: none;
        }

        .btn-social:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            text-decoration: none;
        }

        .btn-linkedin { background: #0077b5; }
        .btn-twitter { background: #000000; border: 1px solid #333; }
        .btn-copy { background: #424242; border: 1px solid #666; }
        // ... existing styles ...
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); }
        .modal-content { background-color: var(--bg-card); margin: 10% auto; padding: 20px; border: 1px solid var(--border); width: 80%; max-width: 600px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); animation: slideDown 0.3s; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border); }
        .loader { border: 4px solid var(--bg-dark); border-top: 4px solid var(--primary); border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .confetti {
            position: absolute;
            width: 10px;
            height: 10px;
            background-color: #f00;
            animation: fall 3s linear infinite;
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>
                <span class="logo">🛡️</span>
                CodeGuard Compliance Audit
            </h1>
            ${result.metadata?.clientName ? `<div style="color: var(--text-muted); font-size: 0.9em; margin-top: 5px;">Prepared for: <strong>${escapeHtml(String(result.metadata.clientName))}</strong> ${result.metadata.repoUrl ? `• ${escapeHtml(String(result.metadata.repoUrl))}` : ''}</div>` : ''}
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
            <button class="btn btn-primary" data-action="exportReport">📥 Export Report</button>
            <span class="status-badge" style="background: ${statusColors[result.overall_status] || statusColors.fail}; color: white;">
                ${statusEmojis[result.overall_status] || '❌'} ${result.overall_status.toUpperCase()}
            </span>
        </div>
    </div>
    
    ${result.overall_status === 'pass' ? `
    <div class="certificate-container" id="successBanner">
        <div class="cert-badge-icon">🏆</div>
        <div class="cert-title">CERTIFIED COMPLIANT</div>
        <p class="cert-desc">This repository has passed all CodeGuard AI compliance & security checks.</p>
        
        <div class="share-actions">
            <a href="https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent('Just verified my code compliance with CodeGuard AI! 🛡️ \n\nCertified secure and GDPR/LGPD compliant.\n\n#CodeGuard #DevSecOps #Compliance #CleanCode')}" target="_blank" class="btn-social btn-linkedin">
                <span>🔗</span> Share on LinkedIn
            </a>
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent('Just verified my code compliance with CodeGuard AI! 🛡️  Certified secure and GDPR/LGPD compliant. #CodeGuard #DevSecOps')}" target="_blank" class="btn-social btn-twitter">
                <span>𝕏</span> Share on X
            </a>
            <button class="btn-social btn-copy" data-action="copyBadge">
                <span>📋</span> Copy Badge Markdown
            </button>
        </div>
    </div>
    ` : ''}
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value">${result.files_analyzed}</div>
            <div class="stat-label">Arquivos Analisados</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${result.frameworks_audited.length}</div>
            <div class="stat-label">Frameworks</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: ${result.total_issues > 0 ? 'var(--danger)' : 'var(--success)'}">${result.total_issues}</div>
            <div class="stat-label">Total Issues</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" style="color: ${result.critical_issues > 0 ? 'var(--danger)' : 'var(--success)'}">${result.critical_issues}</div>
            <div class="stat-label">Issues Críticas</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${(result.execution_time_ms / 1000).toFixed(1)}s</div>
            <div class="stat-label">Tempo de Execução</div>
        </div>
    </div>
    
    ${result.results.map((fw: any) => `
        <div class="framework-section">
            <div class="framework-header" data-action="toggleCollapse">
                <div class="framework-name">
                    <span class="expand-icon">▼</span>
                    ${statusEmojis[fw.status_overall] || '❌'} ${escapeHtml(String(fw.frameworkName || fw.framework || ''))}
                </div>
                <div class="framework-stats">
                    <span class="issue-count ${fw.issues.length === 0 ? 'zero' : ''}">${fw.issues.length} issues</span>
                    <small style="color: var(--text-muted)">${escapeHtml(String(fw.llm_used || ''))}</small>
                </div>
            </div>
            <div class="framework-body">
                ${fw.issues.length === 0 ? `
                    <div class="no-issues">✅ Nenhum problema detectado para este framework.</div>
                ` : fw.issues.map((issue: any) => {
        const severityClass = (issue.severity === 'High' || issue.severity === 'Alta') ? '' :
            (issue.severity === 'Medium' || issue.severity === 'Média') ? 'medium' : 'low';
        return `
                        <div class="issue-item ${severityClass}">
                            <div class="issue-header">
                                <div class="issue-title">${escapeHtml(String(issue.issue || ''))}</div>
                                <span class="severity-badge" style="background: ${severityColors[issue.severity] || severityColors.Low}; color: white;">
                                    ${escapeHtml(String(issue.severity || ''))}
                                </span>
                            </div>
                            <div class="issue-meta">
                                <span>📍 ${escapeHtml(String(issue.file_path || ''))}</span>
                                ${issue.line_start ? `<span>📍 Linha ${issue.line_start}${issue.line_end && issue.line_end !== issue.line_start ? '-' + issue.line_end : ''}</span>` : ''}
                                ${issue.article || issue.control || issue.regulation ? `<span>📜 ${escapeHtml(String(issue.article || issue.control || issue.regulation || ''))}</span>` : ''}
                            </div>
                            ${issue.recommendation ? `
                                <div class="issue-recommendation">
                                    <strong>💡 Recomendação:</strong> ${escapeHtml(String(issue.recommendation || ''))}
                                </div>
                            ` : ''}
                            ${issue.code_fix ? `
                                <div class="code-fix">${escapeHtml(String(issue.code_fix || ''))}</div>
                                <div class="actions">
                                    <button class="btn btn-success" data-action="applyFix" data-code="${encodeURIComponent(String(issue.code_fix || ''))}" data-file="${encodeURIComponent(String(issue.file_path || ''))}" data-line-start="${encodeURIComponent(String(issue.line_start || 1))}" data-line-end="${encodeURIComponent(String(issue.line_end || issue.line_start || 1))}">✨ Aplicar Correção</button>
                                </div>
                            ` : ''}
                        </div>
                    `;
    }).join('')}
                
                ${fw.summary ? `
                    <div class="summary-box">
                        <strong>📋 Resumo:</strong> ${escapeHtml(String(fw.summary || ''))}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('')}
    
    <div class="timestamp">
        Região: ${result.region} | Gerado em: ${new Date(result.timestamp).toLocaleString('pt-BR')}
    </div>
    
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        function copyBadge() {
            const badgeMarkdown = '[![CodeGuard Compliance](https://img.shields.io/badge/CodeGuard-Certified-success?style=for-the-badge&logo=shield)](https://codeguard.ai)';
            navigator.clipboard.writeText(badgeMarkdown).then(() => {
                const btn = document.querySelector('.btn-copy');
                const originalText = btn ? btn.innerHTML : '';
                if (btn) btn.innerHTML = '<span>✅</span> Copied!';
                setTimeout(() => {
                    if (btn) btn.innerHTML = originalText;
                }, 2000);
            });
        }

        document.addEventListener('click', (e) => {
            const target = e.target;
            const el = target && target.closest ? target.closest('[data-action]') : null;
            if (!el) return;

            const action = el.getAttribute('data-action');

            if (action === 'exportReport') {
                vscode.postMessage({ command: 'exportReport' });
                return;
            }

            if (action === 'copyBadge') {
                copyBadge();
                return;
            }

            if (action === 'toggleCollapse') {
                el.classList.toggle('collapsed');
                return;
            }

            if (action === 'applyFix') {
                const code = decodeURIComponent(el.getAttribute('data-code') || '');
                const filePath = decodeURIComponent(el.getAttribute('data-file') || '');
                const lineStart = parseInt(decodeURIComponent(el.getAttribute('data-line-start') || '1'), 10) || 1;
                const lineEnd = parseInt(decodeURIComponent(el.getAttribute('data-line-end') || String(lineStart)), 10) || lineStart;

                vscode.postMessage({
                    command: 'applyFix',
                    code,
                    filePath,
                    lineStart,
                    lineEnd
                });
            }
        });
    </script>
</body>
</html>`;
}

