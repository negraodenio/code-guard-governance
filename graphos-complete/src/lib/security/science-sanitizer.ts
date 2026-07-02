export function normalizeAndSanitize(input: string): string {
  if (!input) return '';

  const INJECTION_PATTERNS = [
    /\bignore\s+(?:all|todas|qualquer)\s+(?:instructions|instruções|previous|comandos)\b/i,
    /\b(?:ignore|disregard|override|sobrescreva|desconsidere)\s+.{0,20}(?:instructions|instruções|rules|regras|prompt|system)/i,
  ];

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      throw new Error('SECURITY_VIOLATION');
    }
  }

  let sanitized = input;
  sanitized = sanitized.replace(/\u200B/g, '');
  sanitized = sanitized.replace(/\u200C/g, '');
  sanitized = sanitized.replace(/\u200D/g, '');
  sanitized = sanitized.replace(/\uFEFF/g, '');
  sanitized = sanitized.replace(/\u202E/g, '');

  return sanitized;
}
