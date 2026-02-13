import { createHmac, timingSafeEqual } from 'node:crypto';

export type WebhookProvider = 'veriff' | 'payments';
export type WebhookEventType = 'verified' | 'unverified' | 'settled' | 'unsettled';

const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;
const REPLAY_WINDOW_MS = 24 * 60 * 60 * 1000;

type ReplayEntry = {
  seenAt: number;
};

type CreatorState = {
  verificationState: 'verified' | 'unverified';
  paymentState: 'settled' | 'unsettled';
  verificationUpdatedAt: number;
  paymentUpdatedAt: number;
};

const replayCache = new Map<string, ReplayEntry>();
const creatorState = new Map<string, CreatorState>();

export type VerifyWebhookInput = {
  provider: WebhookProvider;
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  eventId: string | null;
  sharedSecret: string;
  now?: number;
};

export type VerifyWebhookResult =
  | { ok: true; timestamp: number; eventId: string }
  | { ok: false; reason: 'missing-secret' | 'missing-signature' | 'missing-timestamp' | 'invalid-timestamp' | 'stale-timestamp' | 'missing-event-id' | 'invalid-signature' | 'duplicate-event' };

function buildSignedPayload(timestamp: string, rawBody: string): string {
  return `${timestamp}.${rawBody}`;
}

function safeEqualHex(leftHex: string, rightHex: string): boolean {
  const left = Buffer.from(leftHex, 'hex');
  const right = Buffer.from(rightHex, 'hex');

  if (left.length !== right.length || left.length === 0) {
    return false;
  }

  return timingSafeEqual(left, right);
}

function pruneReplayCache(now: number): void {
  for (const [eventKey, entry] of replayCache) {
    if (now - entry.seenAt > REPLAY_WINDOW_MS) {
      replayCache.delete(eventKey);
    }
  }
}

export function verifyWebhookRequest(input: VerifyWebhookInput): VerifyWebhookResult {
  const now = input.now ?? Date.now();

  if (!input.sharedSecret) {
    return { ok: false, reason: 'missing-secret' };
  }

  if (!input.signature) {
    return { ok: false, reason: 'missing-signature' };
  }

  if (!input.timestamp) {
    return { ok: false, reason: 'missing-timestamp' };
  }

  const timestampMs = Number(input.timestamp);
  if (!Number.isFinite(timestampMs)) {
    return { ok: false, reason: 'invalid-timestamp' };
  }

  if (Math.abs(now - timestampMs) > MAX_WEBHOOK_AGE_MS) {
    return { ok: false, reason: 'stale-timestamp' };
  }

  if (!input.eventId) {
    return { ok: false, reason: 'missing-event-id' };
  }

  const expected = createHmac('sha256', input.sharedSecret)
    .update(buildSignedPayload(input.timestamp, input.rawBody))
    .digest('hex');

  if (!safeEqualHex(expected, input.signature)) {
    return { ok: false, reason: 'invalid-signature' };
  }

  pruneReplayCache(now);

  const eventKey = `${input.provider}:${input.eventId}`;
  if (replayCache.has(eventKey)) {
    return { ok: false, reason: 'duplicate-event' };
  }

  replayCache.set(eventKey, { seenAt: now });

  return { ok: true, timestamp: timestampMs, eventId: input.eventId };
}

export type ApplyWebhookEventInput = {
  creatorId: string;
  provider: WebhookProvider;
  state: WebhookEventType;
  occurredAt: number;
};

export function applyWebhookEvent(input: ApplyWebhookEventInput): CreatorState {
  const existing =
    creatorState.get(input.creatorId) ?? {
      verificationState: 'unverified',
      paymentState: 'unsettled',
      verificationUpdatedAt: 0,
      paymentUpdatedAt: 0,
    };

  if (input.provider === 'veriff') {
    const nextVerificationState = input.state === 'verified' ? 'verified' : 'unverified';
    if (input.occurredAt >= existing.verificationUpdatedAt) {
      existing.verificationState = nextVerificationState;
      existing.verificationUpdatedAt = input.occurredAt;
    }
  }

  if (input.provider === 'payments') {
    const nextPaymentState = input.state === 'settled' ? 'settled' : 'unsettled';
    if (input.occurredAt >= existing.paymentUpdatedAt) {
      existing.paymentState = nextPaymentState;
      existing.paymentUpdatedAt = input.occurredAt;
    }
  }

  creatorState.set(input.creatorId, existing);
  return { ...existing };
}

export function getCreatorState(creatorId: string): CreatorState {
  return (
    creatorState.get(creatorId) ?? {
      verificationState: 'unverified',
      paymentState: 'unsettled',
      verificationUpdatedAt: 0,
      paymentUpdatedAt: 0,
    }
  );
}

export function logWebhookSecurityEvent(provider: WebhookProvider, reason: string, metadata: Record<string, unknown>): void {
  console.warn(
    JSON.stringify({
      event: 'webhook_rejected',
      provider,
      reason,
      ...metadata,
    }),
  );
}

export function resetWebhookState(): void {
  replayCache.clear();
  creatorState.clear();
}
