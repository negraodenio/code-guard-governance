import * as vscode from 'vscode';

export class ConfigManager {
    private static instance: ConfigManager;
    private context: vscode.ExtensionContext;
    private secretStorage: vscode.SecretStorage;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.secretStorage = context.secrets;
    }

    public static initialize(context: vscode.ExtensionContext) {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager(context);
        }
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            throw new Error('ConfigManager not initialized. Call initialize() first.');
        }
        return ConfigManager.instance;
    }

    /**
     * Get API Key with fallback strategy:
     * 1. Secret Storage (Secure)
     * 2. VS Code Settings (Legacy/Insecure)
     * 3. Environment Variables
     */
    public async getApiKey(): Promise<string | undefined> {
        // 1. Try Secret Storage
        let key = await this.secretStorage.get('codeguard.userApiKey');
        if (key) return key;

        // 2. Try Settings (Migration path)
        const config = vscode.workspace.getConfiguration('codeguard');
        key = config.get<string>('userApiKey');
        if (key && key.length > 5) {
            // Auto-migrate to secrets if found in plaintext settings?
            // For now, just return it.
            return key;
        }

        // 3. Env Vars (handled by llm-config, but we can check here too if needed)
        return undefined;
    }

    /**
     * Securely store the API key
     */
    public async setApiKey(key: string): Promise<void> {
        await this.secretStorage.store('codeguard.userApiKey', key);

        // Optional: Clear from plain text settings if exists to improve security
        const config = vscode.workspace.getConfiguration('codeguard');
        if (config.get('userApiKey')) {
            await config.update('userApiKey', undefined, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('CodeGuard: API Key moved to Secure Storage 🔒');
        }
    }

    public async deleteApiKey(): Promise<void> {
        await this.secretStorage.delete('codeguard.userApiKey');
    }
}
