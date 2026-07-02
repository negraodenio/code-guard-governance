
import * as vscode from 'vscode';
import { getSupabaseClient } from '../supabase/client';
import { t } from '../utils/i18n';

export interface CreditStatus {
    balance: number;
    hasCredits: boolean;
}

export class CreditsManager {

    /**
     * Get user's current credit balance
     */
    static async getBalance(email: string, globalState?: vscode.Memento): Promise<CreditStatus> {
        const supabase = getSupabaseClient();

        if (!supabase || !email) {
            return { balance: 0, hasCredits: false };
        }

        try {
            const { data, error } = await supabase
                .rpc('get_credits', { user_email: email });

            if (error) {
                console.error('Credits Error:', error);
                return { balance: 0, hasCredits: false };
            }

            const balance = data || 0;
            const hasCredits = balance > 0;

            // Cache status if globalState provided
            if (globalState) {
                await globalState.update('codeguard.hasCredits', hasCredits);
                await globalState.update('codeguard.creditBalance', balance);
            }

            return { balance, hasCredits };

        } catch (err) {
            console.error('Credits Exception:', err);
            return { balance: 0, hasCredits: false };
        }
    }

    /**
     * Deduct credits for AI usage (1 credit per scan)
     * Returns true if credits were deducted successfully
     */
    static async useCredit(email: string, amount: number = 1): Promise<boolean> {
        const supabase = getSupabaseClient();

        if (!supabase || !email) {
            return false;
        }

        try {
            const { data, error } = await supabase
                .rpc('use_credits', {
                    user_email: email,
                    credits_to_use: amount
                });

            if (error) {
                console.error('Deduct Credits Error:', error);
                return false;
            }

            return data === true;

        } catch (err) {
            console.error('Deduct Credits Exception:', err);
            return false;
        }
    }

    /**
     * Show credit balance notification and prompt upgrade if empty
     */
    static async checkAndNotify(email: string, globalState?: vscode.Memento): Promise<boolean> {
        const status = await this.getBalance(email, globalState);

        if (!status.hasCredits) {
            const buyCredits = t('buyCredits');
            const selection = await vscode.window.showWarningMessage(
                t('insufficientCredits', { cost: 0, balance: status.balance }),
                buyCredits
            );

            if (selection === buyCredits) {
                vscode.env.openExternal(vscode.Uri.parse('https://gdprcodeguard.com/credits'));
            }
            return false;
        }

        return true;
    }
}
