import { applyPatch } from 'diff';

export function safeApplyUnifiedDiff(params: {
    originalText: string;
    unifiedDiff: string;
}) {
    // applyPatch retorna string (sucesso) ou false (falha)
    const out = applyPatch(params.originalText, params.unifiedDiff);

    if (out === false) {
        return { ok: false as const, patchedText: null, error: 'Patch could not be applied (context mismatch).' };
    }

    // Guard: não aceitar patch vazio (anti-noop)
    if (out === params.originalText) {
        return { ok: false as const, patchedText: null, error: 'Patch applied but produced no changes.' };
    }

    return { ok: true as const, patchedText: out, error: null };
}
