import crypto from 'crypto';

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function isInternalRequest(headers: Headers) {
  const secret = process.env.INTERNAL_WORKER_SECRET;
  if (!secret) return false;
  const header = headers.get('x-internal');
  if (!header) return false;
  return safeEqual(header, secret);
}

