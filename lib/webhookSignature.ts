import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifies webhook signature using HMAC-SHA256.
 * Uses timing-safe comparison to prevent timing attacks.
 * 
 * @param rawBody - The raw request body as a string
 * @param signature - The signature to verify (usually from a header)
 * @param secret - The shared secret key
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) {
    return false;
  }

  const digest = createHmac('sha256', secret).update(rawBody).digest('hex');

  const expected = Buffer.from(digest, 'utf8');
  const provided = Buffer.from(signature, 'utf8');

  if (expected.length !== provided.length) {
    return false;
  }

  return timingSafeEqual(expected, provided);
}
