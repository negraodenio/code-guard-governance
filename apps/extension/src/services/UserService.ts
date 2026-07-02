import * as vscode from 'vscode';

export class UserService {
    private static readonly CONFIG_SECTION = 'codeguard';
    private static readonly EMAIL_CONFIG = 'userEmail';
    private static readonly LEADS_ENDPOINT = 'https://api.code-guard.eu/leads'; // Mock endpoint

    /**
     * Ensures the user has provided an email address.
     * If not, prompts the user to enter it.
     * Returns the email if available, or undefined if the user cancelled.
     */
    public static async ensureUserEmail(): Promise<string | undefined> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        let email = config.get<string>(this.EMAIL_CONFIG);

        if (email && email.trim().length > 0) {
            return email;
        }

        // Prompt user
        const input = await vscode.window.showInputBox({
            title: 'CodeGuard AI: Unlock Auto-Fix',
            prompt: 'Please enter your work email to unlock AI Auto-Fix & Deep Audit features (Free / BYOK).',
            placeHolder: 'name@company.com',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value.includes('@')) {
                    return 'Please enter a valid email address';
                }
                return null;
            }
        });

        if (input) {
            // Save to config
            await config.update(this.EMAIL_CONFIG, input, vscode.ConfigurationTarget.Global);

            // Send to backend (Fire and forget)
            this.sendLead(input).catch(err => console.error('Failed to send lead:', err));

            vscode.window.showInformationMessage(`CodeGuard: AI features unlocked for ${input}!`);
            return input;
        }

        return undefined;
    }

    private static async sendLead(email: string): Promise<void> {
        try {
            const payload = {
                email,
                source: 'vscode-extension',
                version: vscode.extensions.getExtension('codeguard.codeguard-ai')?.packageJSON.version || '1.0.0',
                ts: new Date().toISOString()
            };

            const res = await fetch(this.LEADS_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                console.error('[LeadGen] Lead endpoint error:', res.status, res.statusText);
            }
        } catch (error) {
            console.error('[LeadGen] Failed to send lead:', error);
        }
    }
}
