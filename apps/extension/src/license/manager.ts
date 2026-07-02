
import * as vscode from 'vscode';
import { getSupabaseClient } from '../supabase/client';

export enum PlanType {
    Free = 'FREE',
    Basic = 'BASIC',
    Professional = 'PROFESSIONAL',
    Enterprise = 'ENTERPRISE'
}

export interface LicenseStatus {
    plan: PlanType;
    isValid: boolean;
    maxViolations: number;
    isTrial?: boolean;
    expirationDate?: string;
}

export class LicenseManager {
    static async checkLicense(key: string, globalState: vscode.Memento): Promise<LicenseStatus> {

        // 1. Check for TRIAL-XXXX format
        if (key.startsWith('TRIAL-')) {
            return this.handleTrial(key, globalState);
        }

        // 2. Offline Fallback (Grace Period)
        // If we have a cached valid license state in globalState, respect it if within 7 days
        const cached = globalState.get<any>('vibe.license.cache');
        if (!key && cached && cached.key === key) { // No key provided but one cached? (Only if key matches configured) 
            // Simplified: if key matches cached key
            const now = new Date().getTime();
            if (now - cached.lastValidated < 7 * 24 * 60 * 60 * 1000) {
                return cached.status;
            }
        }

        // 3. Live Validation
        // Default to FREE mode if no key or offline
        if (!key || key.trim() === '') {
            return {
                plan: PlanType.Free,
                isValid: true,
                maxViolations: 5
            };
        }

        const supabase = getSupabaseClient();
        if (!supabase) {
            // If offline and no valid cache -> Fallback to Free
            return {
                plan: PlanType.Free,
                isValid: false,
                maxViolations: 5
            };
        }

        try {
            // Mocking validation logic for compilation if Supabase table not ready
            // In real prod: select * from licenses where key = ...
            const { data, error } = await supabase
                .from('licenses')
                .select('plan, active')
                .eq('key', key)
                .single();

            if (error || !data || !data.active) {
                return {
                    plan: PlanType.Free,
                    isValid: false,
                    maxViolations: 5
                };
            }

            let plan = PlanType.Free;
            if (data.plan === 'BASIC') plan = PlanType.Basic;
            else if (data.plan === 'PROFESSIONAL') plan = PlanType.Professional;
            else if (data.plan === 'ENTERPRISE') plan = PlanType.Enterprise;

            const status = {
                plan: plan,
                isValid: true,
                maxViolations: plan === PlanType.Free ? 5 : Infinity
            };

            // Cache result for grace period support
            await globalState.update('vibe.license.cache', {
                key: key,
                status: status,
                lastValidated: new Date().getTime()
            });

            return status;

        } catch (err) {
            return {
                plan: PlanType.Free,
                isValid: false,
                maxViolations: 5
            };
        }
    }

    private static async handleTrial(key: string, globalState: vscode.Memento): Promise<LicenseStatus> {
        const trialKey = `vibe.trial.${key}`;
        const trialStart = globalState.get<number>(trialKey);

        if (!trialStart) {
            // First time using this trial key
            await globalState.update(trialKey, new Date().getTime());
            return {
                plan: PlanType.Professional, // Trial gives PRO access
                isValid: true,
                maxViolations: Infinity,
                isTrial: true
            };
        }

        const now = new Date().getTime();
        const daysUsed = (now - trialStart) / (1000 * 60 * 60 * 24);

        if (daysUsed > 14) {
            return {
                plan: PlanType.Free,
                isValid: false,
                maxViolations: 5,
                isTrial: false // Expired
            };
        }

        return {
            plan: PlanType.Professional,
            isValid: true,
            maxViolations: Infinity,
            isTrial: true
        };
    }
}
