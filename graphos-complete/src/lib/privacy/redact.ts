export function redactPII(text: string): { redacted: string; hadPII: boolean } {
    let redacted = text;
    let hadPII = false;

    // Email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    if (emailRegex.test(redacted)) {
        redacted = redacted.replace(emailRegex, '[EMAIL_REDACTED]');
        hadPII = true;
    }

    // Phone (internacional simples)
    const phoneRegex = /(\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;
    if (phoneRegex.test(redacted)) {
        redacted = redacted.replace(phoneRegex, '[PHONE_REDACTED]');
        hadPII = true;
    }

    // SSN / CPF / NISS (patterns comuns)
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b|\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{9}\b/g;
    if (ssnRegex.test(redacted)) {
        redacted = redacted.replace(ssnRegex, '[ID_REDACTED]');
        hadPII = true;
    }

    // API keys / tokens (hex/base64 longos)
    const tokenRegex = /\b[A-Za-z0-9_-]{32,}\b/g;
    if (tokenRegex.test(redacted)) {
        redacted = redacted.replace(tokenRegex, '[TOKEN_REDACTED]');
        hadPII = true;
    }

    return { redacted, hadPII };
}
