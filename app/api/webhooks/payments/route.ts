import type { NextRequest } from 'next/server';

import { applyWebhookEvent, logWebhookSecurityEvent, verifyWebhookRequest } from '@/lib/webhookProcessor';

type PaymentsWebhookBody = {
  eventId?: unknown;
  creatorId?: unknown;
  settlementStatus?: unknown;
  occurredAt?: unknown;
};

function toStatus(value: unknown): 'settled' | 'unsettled' {
  return value === 'settled' ? 'settled' : 'unsettled';
}

export async function POST(request: NextRequest): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get('x-payments-signature');
  const timestamp = request.headers.get('x-payments-timestamp');

  let body: PaymentsWebhookBody;
  try {
    body = JSON.parse(rawBody) as PaymentsWebhookBody;
  } catch {
    logWebhookSecurityEvent('payments', 'invalid-json', {
      timestamp,
    });
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const eventId = typeof body.eventId === 'string' ? body.eventId : null;

  const verification = verifyWebhookRequest({
    provider: 'payments',
    rawBody,
    signature,
    timestamp,
    eventId,
    sharedSecret: process.env.PAYMENTS_WEBHOOK_SECRET ?? '',
  });

  if (!verification.ok) {
    logWebhookSecurityEvent('payments', verification.reason, {
      eventId,
      timestamp,
    });
    return Response.json({ error: 'Webhook verification failed.' }, { status: 401 });
  }

  if (typeof body.creatorId !== 'string' || body.creatorId.length === 0 || typeof body.occurredAt !== 'number') {
    return Response.json({ error: 'Invalid webhook payload.' }, { status: 400 });
  }

  const nextState = applyWebhookEvent({
    creatorId: body.creatorId,
    provider: 'payments',
    state: toStatus(body.settlementStatus),
    occurredAt: body.occurredAt,
  });

  return Response.json({ ok: true, creatorState: nextState });
}
