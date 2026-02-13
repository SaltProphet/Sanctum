import { createHmac, timingSafeEqual } from 'node:crypto';

export type VeriffWebhookPayload = {
  creatorId?: unknown;
  verification?: {
    status?: unknown;
  };
};

export function isVeriffSuccessPayload(payload: VeriffWebhookPayload): boolean {
  return payload.verification?.status === 'approved';
}

export function verifyVeriffWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
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
