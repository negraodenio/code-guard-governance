import * as vscode from 'vscode';
import { PatchEngine } from '../intelligence/patch';

export class CodeGuardCodeActionProvider implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {

        // Only trigger if we have CodeGuard diagnostics
        const diagnostics = context.diagnostics.filter(d => d.source === 'CodeGuard AI');
        if (diagnostics.length === 0) return;

        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of diagnostics) {
            const action = new vscode.CodeAction(`✨ Fix with CodeGuard: ${diagnostic.message}`, vscode.CodeActionKind.QuickFix);

            // We'll call the command directly, passing necessary info
            // Since we don't have the full issue object here easily without a lookup map,
            // we'll pass the message as the "violation" and let the LLM regenerator handle it 
            // OR use the existing "codeguard.fix" command which does exactly that.

            action.command = {
                command: 'codeguard.fix',
                title: 'Fix with CodeGuard',
                arguments: [{
                    violation: diagnostic.message,
                    line: diagnostic.range.start.line + 1 // 1-indexed for our command
                }]
            };

            action.diagnostics = [diagnostic];
            action.isPreferred = true;
            actions.push(action);
        }

        return actions;
    }
}
