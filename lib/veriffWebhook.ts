import { verifyWebhookSignature } from './webhookSignature.ts';

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
  return verifyWebhookSignature(rawBody, signature, secret);
}
