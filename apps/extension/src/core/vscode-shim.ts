/**
 * VS Code API Shim for non-IDE environments (Vercel, CLI, etc.)
 * This provides no-op versions of VS Code APIs to prevent runtime crashes.
 */

export const window = {
    showInformationMessage: async () => undefined,
    showWarningMessage: async () => undefined,
    showErrorMessage: async () => undefined,
    withProgress: async (_: any, task: any) => task({ report: () => {} }),
    createOutputChannel: () => ({ appendLine: () => {}, show: () => {}, clear: () => {} }),
    activeTextEditor: undefined,
    visibleTextEditors: [],
};

export const workspace = {
    getConfiguration: () => ({
        get: (key: string, defaultValue: any) => defaultValue,
        update: async () => {},
    }),
    workspaceFolders: [],
    onDidSaveTextDocument: () => ({ dispose: () => {} }),
};

export const env = {
    openExternal: async () => true,
    clipboard: { writeText: async () => {}, readText: async () => "" },
    language: 'en',
};

export const Uri = {
    parse: (value: string) => ({ path: value, scheme: 'https', toString: () => value }),
    file: (path: string) => ({ path, scheme: 'file', toString: () => path }),
};

export enum ViewColumn {
    Three = 3
}

export class EventEmitter {
    event = () => ({ dispose: () => {} });
    fire() {}
    dispose() {}
}

export enum ExtensionMode {
    Production = 1
}

// Default export to simulate 'import * as vscode'
export default {
    window,
    workspace,
    env,
    Uri,
    ViewColumn,
    EventEmitter,
    ExtensionMode
};
