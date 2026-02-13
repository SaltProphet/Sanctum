import crypto from 'node:crypto';
import { verifyWebhookSignature as verifySignature } from './webhookSignature.ts';

export type DepositStatus = 'deposit_pending' | 'deposit_paid' | 'deposit_failed' | 'deposit_refunded';

export type DepositRecord = {
  payment_intent_id: string;
  provider: string;
  status: DepositStatus;
  amount: number;
  currency: string;
  creator_id: string;
  idempotency_key: string;
  created_at: number;
  updated_at: number;
};

export type InitiateDepositInput = {
  idempotencyKey: string;
  creatorId: string;
  provider: string;
  amount: number;
  currency: string;
};

export type ProviderWebhookEvent = {
  id: string;
  type: string;
  data: {
    payment_intent_id: string;
    amount?: number;
    currency?: string;
    creator_id?: string;
  };
};

const depositsByIdempotencyKey = new Map<string, DepositRecord>();
const depositsByPaymentIntentId = new Map<string, DepositRecord>();
const latestDepositByCreatorId = new Map<string, DepositRecord>();
const processedEventIds = new Set<string>();

function normalizeCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

function buildIdempotencyScope(provider: string, key: string): string {
  return `${provider.trim().toLowerCase()}:${key.trim()}`;
}

export function verifyWebhookSignature(payload: string, signature: string | null, secret: string): boolean {
  return verifySignature(payload, signature, secret);
}

export function initiateDeposit({ idempotencyKey, creatorId, provider, amount, currency }: InitiateDepositInput): DepositRecord {
  const normalizedProvider = provider.trim().toLowerCase();
  const scopedIdempotencyKey = buildIdempotencyScope(normalizedProvider, idempotencyKey);
  const existing = depositsByIdempotencyKey.get(scopedIdempotencyKey);

  if (existing) {
    return existing;
  }

  const timestamp = Date.now();
  const paymentIntentId = `${normalizedProvider}-pi-${crypto.randomUUID()}`;

  const deposit: DepositRecord = {
    payment_intent_id: paymentIntentId,
    provider: normalizedProvider,
    status: 'deposit_pending',
    amount,
    currency: normalizeCurrency(currency),
    creator_id: creatorId,
    idempotency_key: scopedIdempotencyKey,
    created_at: timestamp,
    updated_at: timestamp,
  };

  depositsByIdempotencyKey.set(scopedIdempotencyKey, deposit);
  depositsByPaymentIntentId.set(paymentIntentId, deposit);
  latestDepositByCreatorId.set(creatorId, deposit);

  return deposit;
}

function mapEventToStatus(type: string): DepositStatus | null {
  if (type === 'payment_intent.succeeded' || type === 'payment_intent.settled') {
    return 'deposit_paid';
  }

  if (type === 'payment_intent.payment_failed' || type === 'payment_intent.failed') {
    return 'deposit_failed';
  }

  if (type === 'charge.refunded' || type === 'payment_intent.refunded') {
    return 'deposit_refunded';
  }

  return null;
}

export function processWebhookEvent(event: ProviderWebhookEvent): { processed: boolean; reason?: 'duplicate' | 'unknown_intent' | 'ignored' } {
  if (processedEventIds.has(event.id)) {
    return { processed: false, reason: 'duplicate' };
  }

  const deposit = depositsByPaymentIntentId.get(event.data.payment_intent_id);
  if (!deposit) {
    return { processed: false, reason: 'unknown_intent' };
  }

  const nextStatus = mapEventToStatus(event.type);
  if (!nextStatus) {
    processedEventIds.add(event.id);
    return { processed: false, reason: 'ignored' };
  }

  deposit.status = nextStatus;
  deposit.updated_at = Date.now();

  if (typeof event.data.amount === 'number') {
    deposit.amount = event.data.amount;
  }

  if (typeof event.data.currency === 'string' && event.data.currency.trim().length > 0) {
    deposit.currency = normalizeCurrency(event.data.currency);
  }

  latestDepositByCreatorId.set(deposit.creator_id, deposit);
  processedEventIds.add(event.id);

  return { processed: true };
}

export function getDepositByCreatorId(creatorId: string): DepositRecord | null {
  return latestDepositByCreatorId.get(creatorId) ?? null;
}

export function resetPaymentStore(): void {
  depositsByIdempotencyKey.clear();
  depositsByPaymentIntentId.clear();
  latestDepositByCreatorId.clear();
  processedEventIds.clear();
}
