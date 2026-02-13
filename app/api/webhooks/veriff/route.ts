import type { NextRequest } from 'next/server';

import { applyWebhookEvent, logWebhookSecurityEvent, verifyWebhookRequest } from '@/lib/webhookProcessor';

type VeriffWebhookBody = {
  eventId?: unknown;
  creatorId?: unknown;
  status?: unknown;
  occurredAt?: unknown;
};

function toStatus(value: unknown): 'verified' | 'unverified' {
  return value === 'verified' ? 'verified' : 'unverified';
}

export async function POST(request: NextRequest): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get('x-veriff-signature');
  const timestamp = request.headers.get('x-veriff-timestamp');

  let body: VeriffWebhookBody;
  try {
    body = JSON.parse(rawBody) as VeriffWebhookBody;
  } catch {
    logWebhookSecurityEvent('veriff', 'invalid-json', {
      timestamp,
    });
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const eventId = typeof body.eventId === 'string' ? body.eventId : null;

  const verification = verifyWebhookRequest({
    provider: 'veriff',
    rawBody,
    signature,
    timestamp,
    eventId,
    sharedSecret: process.env.VERIFF_WEBHOOK_SECRET ?? '',
  });

  if (!verification.ok) {
    logWebhookSecurityEvent('veriff', verification.reason, {
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
    provider: 'veriff',
    state: toStatus(body.status),
    occurredAt: body.occurredAt,
  });

  return Response.json({ ok: true, creatorState: nextState });
}
