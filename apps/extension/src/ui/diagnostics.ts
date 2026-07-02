import * as vscode from 'vscode';
import { ConsolidatedAuditResult } from '../intelligence/orchestrator';

export class DiagnosticsManager {
    private static instance: DiagnosticsManager;
    private collection: vscode.DiagnosticCollection;

    private constructor() {
        this.collection = vscode.languages.createDiagnosticCollection('codeguard');
    }

    public static getInstance(): DiagnosticsManager {
        if (!DiagnosticsManager.instance) {
            DiagnosticsManager.instance = new DiagnosticsManager();
        }
        return DiagnosticsManager.instance;
    }

    public getCollection(): vscode.DiagnosticCollection {
        return this.collection;
    }

    public clear() {
        this.collection.clear();
    }

    public updateDiagnostics(result: ConsolidatedAuditResult) {
        this.clear();

        const diagnosticsMap = new Map<string, vscode.Diagnostic[]>();

        // Flatten issues from all frameworks
        const allIssues = result.results.flatMap(r => r.issues);

        for (const issue of allIssues) {
            // Skip issues without file path
            if (!issue.file_path || issue.file_path === 'N/A') continue;

            const uri = vscode.Uri.file(issue.file_path);
            const fsPath = uri.fsPath;

            if (!diagnosticsMap.has(fsPath)) {
                diagnosticsMap.set(fsPath, []);
            }

            // Map severity
            let severity = vscode.DiagnosticSeverity.Information;
            const s = (issue.severity || 'low').toLowerCase();
            if (s === 'high' || s === 'alta' || s === 'critical') severity = vscode.DiagnosticSeverity.Error;
            else if (s === 'medium' || s === 'média') severity = vscode.DiagnosticSeverity.Warning;

            // Create Range (0-indexed in VS Code Diagnostic)
            const range = new vscode.Range(
                Math.max(0, (issue.line_start || 1) - 1),
                0,
                Math.max(0, (issue.line_end || issue.line_start || 1) - 1),
                Number.MAX_VALUE // Highlight full line
            );

            const diagnostic = new vscode.Diagnostic(range, `${issue.issue}`, severity);
            diagnostic.source = 'CodeGuard AI';
            diagnostic.code = issue.control || issue.article || 'COMPLIANCE_RULE';

            // Embed fix logic if available (can be used by CodeActionProvider)
            if (issue.code_fix || issue.recommendation) {
                // We can't attach arbitrary data easily, but the CodeActionProvider 
                // will look up the issue based on range/message
            }

            diagnosticsMap.get(fsPath)?.push(diagnostic);
        }

        // Apply to collection
        diagnosticsMap.forEach((diags, fsPath) => {
            this.collection.set(vscode.Uri.file(fsPath), diags);
        });
    }
}
