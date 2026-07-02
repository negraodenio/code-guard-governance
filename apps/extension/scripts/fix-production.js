const fs = require('fs');
const path = require('path');

const vscodeDir = path.join(__dirname, '../node_modules/vscode');

if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
}

// 1. Create package.json for the mock module
fs.writeFileSync(path.join(vscodeDir, 'package.json'), JSON.stringify({
    name: 'vscode',
    version: '1.80.0',
    main: 'index.js'
}, null, 2));

// 2. Create the shim in plain JavaScript
const shimContent = `
module.exports = {
    window: {
        showInformationMessage: async () => undefined,
        showWarningMessage: async () => undefined,
        showErrorMessage: async () => undefined,
        withProgress: async (options, task) => task({ report: () => {} }),
        createOutputChannel: () => ({ appendLine: () => {}, show: () => {}, clear: () => {} }),
        activeTextEditor: undefined,
        visibleTextEditors: [],
    },
    workspace: {
        getConfiguration: () => ({
            get: (key, defaultValue) => defaultValue,
            update: async () => {},
        }),
        workspaceFolders: [],
        onDidSaveTextDocument: () => ({ dispose: () => {} }),
    },
    env: {
        openExternal: async () => true,
        clipboard: { writeText: async () => {}, readText: async () => "" },
        language: 'en',
    },
    Uri: {
        parse: (value) => ({ path: value, scheme: 'https', toString: () => value }),
        file: (path) => ({ path, scheme: 'file', toString: () => path }),
    },
    ViewColumn: { Three: 3 },
    EventEmitter: class { 
        constructor() { this.event = () => ({ dispose: () => {} }); }
        fire() {} 
        dispose() {} 
    },
    ExtensionMode: { Production: 1 }
};
`;

fs.writeFileSync(path.join(vscodeDir, 'index.js'), shimContent);

console.log('✅ [CodeGuard Build]: VS Code Mock created in node_modules/vscode');
