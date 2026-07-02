/**
 * Patch & Diff Engine v2.0
 * 
 * Motor de geração e aplicação de patches com:
 * - Geração via GPT-4o-mini (85% mais barato)
 * - Backup automático antes de aplicar
 * - Detecção de conflitos
 * - Ordenação por dependência
 * - Validação pós-aplicação
 */

import { vscode } from '../utils/vscode-compat';
import type * as vscodeTypes from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getLLMRouter } from '../core/llm-router';

export interface Patch {
    id: string;
    violationId: string;
    filePath: string;
    originalCode: string;
    fixedCode: string;
    lineStart: number;
    lineEnd: number;
    description: string;
    confidence: number;
    ruleId: string;
    framework: string;
    createdAt: Date;
    status: 'pending' | 'applied' | 'rejected' | 'failed';
}

export interface PatchResult {
    success: boolean;
    patch: Patch;
    backupPath?: string;
    error?: string;
    diffStats: {
        linesAdded: number;
        linesRemoved: number;
        linesModified: number;
    };
}

export interface Violation {
    id: string;
    ruleId: string;
    filePath: string;
    line: number;
    column?: number;
    message: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    fixable: boolean;
    source: 'regex' | 'ai';
}

export class PatchEngine {
    private router = getLLMRouter();
    private backupDir: string;
    private pendingPatches: Map<string, Patch> = new Map();

    constructor(config?: { backupDir?: string }) {
        this.backupDir = config?.backupDir || path.join(
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '/tmp',
            '.codeguard',
            'backups'
        );
    }

    /**
     * Generate a patch for a violation using AI
     */
    async generatePatch(
        violation: Violation,
        context?: { contextString: string },
        provider?: string
    ): Promise<Patch | null> {
        const routing = this.router.route('patch');
        const selectedProvider = provider || routing.provider;

        console.log(`[PatchEngine] Gerando patch via ${selectedProvider} para ${violation.ruleId}`);

        try {
            // Get file content around violation
            const document = await vscode.workspace.openTextDocument(violation.filePath);
            const lineRange = this.getContextRange(document, violation.line);
            const codeContext = document.getText(lineRange);
            const violationLine = document.lineAt(violation.line - 1).text;

            // Build prompt
            const prompt = this.buildPatchPrompt(violation, violationLine, codeContext, context);

            // Call LLM
            const result = await this.router.complete('patch', {
                messages: [
                    { role: 'system', content: this.getSystemPrompt() },
                    { role: 'user', content: prompt }
                ],
                maxTokens: 1000,
                temperature: 0.2
            });

            // Parse response
            const fixedCode = this.extractCodeFromResponse(result.content);

            if (!fixedCode) {
                console.warn('[PatchEngine] Não foi possível extrair código corrigido');
                return null;
            }

            const patch: Patch = {
                id: this.generatePatchId(violation),
                violationId: violation.id,
                filePath: violation.filePath,
                originalCode: violationLine,
                fixedCode: fixedCode,
                lineStart: violation.line,
                lineEnd: violation.line,
                description: `Fix: ${violation.message}`,
                confidence: this.calculateConfidence(violationLine, fixedCode),
                ruleId: violation.ruleId,
                framework: 'auto',
                createdAt: new Date(),
                status: 'pending'
            };

            this.pendingPatches.set(patch.id, patch);
            return patch;

        } catch (error) {
            console.error('[PatchEngine] Erro ao gerar patch:', error);
            return null;
        }
    }

    /**
     * Generate patch from raw content (cloud mode)
     */
    async generatePatchFromContent(
        violation: Violation,
        content: string,
        provider?: string
    ): Promise<Patch | null> {
        const lines = content.split('\n');
        const violationLine = lines[violation.line - 1] || '';
        const contextStart = Math.max(0, violation.line - 5);
        const contextEnd = Math.min(lines.length, violation.line + 5);
        const codeContext = lines.slice(contextStart, contextEnd).join('\n');

        const prompt = this.buildPatchPrompt(violation, violationLine, codeContext);

        try {
            const result = await this.router.complete('patch', {
                messages: [
                    { role: 'system', content: this.getSystemPrompt() },
                    { role: 'user', content: prompt }
                ],
                maxTokens: 1000,
                temperature: 0.2
            });

            const fixedCode = this.extractCodeFromResponse(result.content);

            if (!fixedCode) return null;

            return {
                id: this.generatePatchId(violation),
                violationId: violation.id,
                filePath: violation.filePath,
                originalCode: violationLine,
                fixedCode: fixedCode,
                lineStart: violation.line,
                lineEnd: violation.line,
                description: `Fix: ${violation.message}`,
                confidence: this.calculateConfidence(violationLine, fixedCode),
                ruleId: violation.ruleId,
                framework: 'auto',
                createdAt: new Date(),
                status: 'pending'
            };
        } catch {
            return null;
        }
    }

    /**
     * Apply a patch to the codebase
     */
    async apply(patch: Patch): Promise<PatchResult> {
        const result: PatchResult = {
            success: false,
            patch,
            diffStats: { linesAdded: 0, linesRemoved: 0, linesModified: 0 }
        };

        try {
            const document = await vscode.workspace.openTextDocument(patch.filePath);
            const originalLine = document.lineAt(patch.lineStart - 1).text;

            // Verify match
            if (!originalLine.includes(patch.originalCode.trim()) &&
                originalLine.trim() !== patch.originalCode.trim()) {
                result.error = 'Original code não encontrado na linha especificada';
                patch.status = 'failed';
                return result;
            }

            // Create backup
            result.backupPath = await this.createBackup(patch.filePath);

            // Apply edit
            const range = new vscode.Range(
                new vscode.Position(patch.lineStart - 1, 0),
                new vscode.Position(patch.lineEnd - 1, originalLine.length)
            );

            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, range, patch.fixedCode);

            const success = await vscode.workspace.applyEdit(edit);

            if (success) {
                result.success = true;
                patch.status = 'applied';
                result.diffStats = this.calculateDiffStats(patch.originalCode, patch.fixedCode);

                // Save document
                await document.save();

                console.log(`[PatchEngine] ✅ Patch ${patch.id} aplicado com sucesso`);
            } else {
                result.error = 'Falha ao aplicar edit';
                patch.status = 'failed';
            }

        } catch (error) {
            result.error = error instanceof Error ? error.message : 'Unknown error';
            patch.status = 'failed';
        }

        return result;
    }

    /**
     * Create backup before applying patch
     */
    async createBackup(filePath: string): Promise<string> {
        // Ensure backup directory exists
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = path.basename(filePath);
        const backupPath = path.join(this.backupDir, `${fileName}.${timestamp}.bak`);

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            fs.writeFileSync(backupPath, content);
            console.log(`[PatchEngine] Backup criado: ${backupPath}`);
            return backupPath;
        } catch (error) {
            console.error('[PatchEngine] Falha ao criar backup:', error);
            throw error;
        }
    }

    /**
     * Detect conflicts between patches
     */
    async detectConflicts(patch: Patch): Promise<string[]> {
        const conflicts: string[] = [];

        for (const [id, existingPatch] of this.pendingPatches) {
            if (id === patch.id) continue;

            // Same file, overlapping lines
            if (existingPatch.filePath === patch.filePath) {
                if (this.linesOverlap(
                    existingPatch.lineStart, existingPatch.lineEnd,
                    patch.lineStart, patch.lineEnd
                )) {
                    conflicts.push(`Conflito com patch ${id} nas linhas ${existingPatch.lineStart}-${existingPatch.lineEnd}`);
                }
            }
        }

        return conflicts;
    }

    /**
     * Order patches by dependency (apply imports first, etc)
     */
    orderByDependencies(patches: Patch[]): Patch[] {
        // Simple ordering: higher line numbers first (bottom-up)
        // This prevents line number shifts from affecting subsequent patches
        return [...patches].sort((a, b) => {
            if (a.filePath !== b.filePath) {
                return a.filePath.localeCompare(b.filePath);
            }
            return b.lineStart - a.lineStart; // Higher lines first
        });
    }

    /**
     * Rollback a patch using backup
     */
    async rollback(patch: Patch, backupPath: string): Promise<boolean> {
        try {
            const content = fs.readFileSync(backupPath, 'utf-8');
            fs.writeFileSync(patch.filePath, content);
            patch.status = 'rejected';
            console.log(`[PatchEngine] Rollback de ${patch.id} completo`);
            return true;
        } catch (error) {
            console.error('[PatchEngine] Falha no rollback:', error);
            return false;
        }
    }

    // ============ PRIVATE METHODS ============

    private getSystemPrompt(): string {
        return `You are an expert Security Engineer specialized in fixing compliance and security violations.
Your task is to provide ONLY the fixed code line(s) without any explanation.

Rules:
1. Return ONLY the fixed code, no markdown, no explanations
2. Preserve the original indentation
3. Keep the fix minimal - change only what's necessary
4. Ensure the fix addresses the specific violation
5. Do not introduce new security issues`;
    }

    private buildPatchPrompt(
        violation: Violation,
        violationLine: string,
        codeContext: string,
        ragContext?: { contextString: string }
    ): string {
        let prompt = `
Fix the following security/compliance violation:

VIOLATION: ${violation.message}
RULE ID: ${violation.ruleId}
SEVERITY: ${violation.severity}

CODE CONTEXT:
\`\`\`
${codeContext}
\`\`\`

LINE TO FIX (line ${violation.line}):
\`\`\`
${violationLine}
\`\`\`
`;

        if (ragContext?.contextString) {
            prompt += `
RELEVANT CONTEXT FROM CODEBASE:
${ragContext.contextString.substring(0, 2000)}
`;
        }

        prompt += `
Return ONLY the fixed line of code. Do not include markdown or explanations.`;

        return prompt;
    }

    private extractCodeFromResponse(response: string): string | null {
        // Remove markdown code blocks if present
        let code = response.trim();

        // Remove ```language``` blocks
        const codeBlockMatch = code.match(/```(?:\w+)?\n?([\s\S]*?)```/);
        if (codeBlockMatch) {
            code = codeBlockMatch[1].trim();
        }

        // Remove backticks
        code = code.replace(/^`+|`+$/g, '');

        // Remove common prefixes
        code = code.replace(/^(Fixed code:|Fixed:|Here's the fix:|The fix is:)/i, '').trim();

        return code || null;
    }

    private getContextRange(document: vscodeTypes.TextDocument, lineNumber: number): vscodeTypes.Range {
        const start = Math.max(0, lineNumber - 6);
        const end = Math.min(document.lineCount - 1, lineNumber + 4);
        return new vscode.Range(start, 0, end, document.lineAt(end).text.length);
    }

    private generatePatchId(violation: Violation): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 6);
        return `patch_${violation.ruleId}_${timestamp}_${random}`;
    }

    private calculateConfidence(original: string, fixed: string): number {
        // Simple heuristic based on change size
        const originalLen = original.length;
        const fixedLen = fixed.length;
        const diff = Math.abs(originalLen - fixedLen);

        // Smaller changes = higher confidence
        if (diff < 20) return 0.95;
        if (diff < 50) return 0.85;
        if (diff < 100) return 0.75;
        return 0.6;
    }

    private calculateDiffStats(original: string, fixed: string): { linesAdded: number; linesRemoved: number; linesModified: number } {
        const origLines = original.split('\n').length;
        const fixedLines = fixed.split('\n').length;

        return {
            linesAdded: Math.max(0, fixedLines - origLines),
            linesRemoved: Math.max(0, origLines - fixedLines),
            linesModified: Math.min(origLines, fixedLines)
        };
    }

    private linesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
        return start1 <= end2 && start2 <= end1;
    }

    // Legacy static methods for backwards compatibility
    static async generateFix(document: vscodeTypes.TextDocument, violation: string, contextLine: number): Promise<string | null> {
        const engine = new PatchEngine();
        const patch = await engine.generatePatch({
            id: `legacy_${Date.now()}`,
            ruleId: 'legacy',
            filePath: document.uri.fsPath,
            line: contextLine,
            message: violation,
            severity: 'medium',
            fixable: true,
            source: 'regex'
        });
        return patch?.fixedCode || null;
    }

    static async applyFix(document: vscodeTypes.TextDocument, fixedCode: string, contextLine: number): Promise<boolean> {
        const lineText = document.lineAt(contextLine - 1).text;
        const range = new vscode.Range(
            new vscode.Position(contextLine - 1, 0),
            new vscode.Position(contextLine - 1, lineText.length)
        );
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, range, fixedCode);
        return await vscode.workspace.applyEdit(edit);
    }

    static async applyFixRange(
        document: vscodeTypes.TextDocument,
        fixedCode: string,
        lineStart: number,
        lineEnd: number
    ): Promise<boolean> {
        const start = Math.max(1, Math.floor(lineStart || 1));
        const end = Math.max(start, Math.floor(lineEnd || start));

        const endLineText = document.lineAt(end - 1).text;
        const range = new vscode.Range(
            new vscode.Position(start - 1, 0),
            new vscode.Position(end - 1, endLineText.length)
        );

        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, range, fixedCode);
        const ok = await vscode.workspace.applyEdit(edit);
        if (ok) {
            await document.save();
        }
        return ok;
    }
}

export default PatchEngine;
