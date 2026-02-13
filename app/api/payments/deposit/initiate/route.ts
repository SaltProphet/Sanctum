import { initiateDeposit } from '@/lib/payments';

type InitiateDepositRequest = {
  creator_id?: unknown;
  provider?: unknown;
  amount?: unknown;
  currency?: unknown;
  idempotency_key?: unknown;
};

function tryReadHeader(request: Request, header: string): string {
  const value = request.headers.get(header);
  return value?.trim() ?? '';
}

function isPositiveAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export async function POST(request: Request): Promise<Response> {
  let body: InitiateDepositRequest;

  try {
    body = (await request.json()) as InitiateDepositRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const creatorId = typeof body.creator_id === 'string' ? body.creator_id.trim() : '';
  const provider = typeof body.provider === 'string' ? body.provider.trim() : '';
  const currency = typeof body.currency === 'string' ? body.currency.trim() : '';

  const headerIdempotencyKey = tryReadHeader(request, 'Idempotency-Key');
  const payloadIdempotencyKey = typeof body.idempotency_key === 'string' ? body.idempotency_key.trim() : '';
  const idempotencyKey = headerIdempotencyKey || payloadIdempotencyKey;

  if (!creatorId || !provider || !currency || !isPositiveAmount(body.amount) || !idempotencyKey) {
    return Response.json(
      {
        error:
          'creator_id, provider, amount, currency, and idempotency key (Idempotency-Key header or idempotency_key body) are required.',
      },
      { status: 400 },
    );
  }

  const deposit = initiateDeposit({
    idempotencyKey,
    creatorId,
    provider,
    amount: body.amount,
    currency,
  });

  return Response.json({
    payment_intent_id: deposit.payment_intent_id,
    provider: deposit.provider,
    status: deposit.status,
    amount: deposit.amount,
    currency: deposit.currency,
    creator_id: deposit.creator_id,
  });
}
