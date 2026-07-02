import * as fs from 'fs';
import * as path from 'path';

/**
 * VS Code Compatibility Shim
 * Allows code to run in both VS Code (Extension) and Node.js (CLI/MCP/Vercel) environments.
 */

let vscodeInstance: any = null;

try {
    const req = require;
    vscodeInstance = req('vscode');
} catch (e) {
    // Mock VS Code API for non-extension environments
    vscodeInstance = {
        workspace: {
            workspaceFolders: undefined,
            getConfiguration: () => ({
                get: (key: string) => process.env[key.toUpperCase()] || undefined,
            }),
            fs: {
                readDirectory: async (uri: any) => {
                    const entries = fs.readdirSync(uri.fsPath, { withFileTypes: true });
                    return entries.map(e => [e.name, e.isDirectory() ? 2 : 1]); // 2 = Directory, 1 = File
                },
                readFile: async (uri: any) => fs.readFileSync(uri.fsPath),
                stat: async (uri: any) => {
                    const stats = fs.statSync(uri.fsPath);
                    return { size: stats.size, mtime: stats.mtime.getTime() };
                }
            },
            findFiles: async (pattern: string) => {
                // Simple mock: doesn't support complex glob patterns, but good enough for Node context
                // In Node, we'll usually pass a targetDir specifically to the orchestrator
                return [];
            }
        },
        window: {
            withProgress: async (options: any, task: (p: any, t: any) => Promise<any>) => {
                const progress = { report: (m: any) => console.error(`[Progress] ${m.message || ''}`) };
                const token = { isCancellationRequested: false };
                return task(progress, token);
            },
            showInformationMessage: (m: string) => console.log(`[Info] ${m}`),
            showErrorMessage: (m: string) => console.error(`[Error] ${m}`),
            showWarningMessage: (m: string) => console.warn(`[Warn] ${m}`),
        },
        Uri: {
            file: (p: string) => ({ fsPath: path.resolve(p), scheme: 'file' }),
            parse: (s: string) => ({ fsPath: s, scheme: 'file' }),
        },
        FileType: {
            Unknown: 0,
            File: 1,
            Directory: 2,
            SymbolicLink: 64,
        },
        ProgressLocation: {
            Notification: 15,
        }
    };
}

export const vscode = vscodeInstance;

let _isVsCode = false;
try {
    // Check if we are actually running inside VS Code extension host
    if (typeof process !== 'undefined' && process.env.VSCODE_PID) {
        _isVsCode = true;
    }
} catch (e) {}

export const isVsCode = _isVsCode;
export default vscode;
