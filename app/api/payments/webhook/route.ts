import { processWebhookEvent, verifyWebhookSignature, type ProviderWebhookEvent } from '@/lib/payments';

type WebhookEnvelope = {
  id?: unknown;
  type?: unknown;
  data?: {
    object?: {
      payment_intent_id?: unknown;
      amount?: unknown;
      currency?: unknown;
      creator_id?: unknown;
    };
  };
};

function parseWebhookEvent(payload: string): ProviderWebhookEvent | null {
  let parsed: WebhookEnvelope;

  try {
    parsed = JSON.parse(payload) as WebhookEnvelope;
  } catch {
    return null;
  }

  const id = typeof parsed.id === 'string' ? parsed.id.trim() : '';
  const type = typeof parsed.type === 'string' ? parsed.type.trim() : '';
  const object = parsed.data?.object;

  const paymentIntentId = typeof object?.payment_intent_id === 'string' ? object.payment_intent_id.trim() : '';

  if (!id || !type || !paymentIntentId) {
    return null;
  }

  return {
    id,
    type,
    data: {
      payment_intent_id: paymentIntentId,
      amount: typeof object?.amount === 'number' ? object.amount : undefined,
      currency: typeof object?.currency === 'string' ? object.currency : undefined,
      creator_id: typeof object?.creator_id === 'string' ? object.creator_id : undefined,
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return Response.json({ error: 'Missing PAYMENT_WEBHOOK_SECRET configuration.' }, { status: 500 });
  }

  const payload = await request.text();
  const signature = request.headers.get('x-payment-signature');

  if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
    return Response.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  const event = parseWebhookEvent(payload);

  if (!event) {
    return Response.json({ error: 'Invalid webhook event payload.' }, { status: 400 });
  }

  const result = processWebhookEvent(event);

  if (result.reason === 'duplicate') {
    return Response.json({ ok: true, duplicate: true });
  }

  if (result.reason === 'unknown_intent') {
    return Response.json({ error: 'Unknown payment intent.' }, { status: 404 });
  }

  return Response.json({ ok: true, processed: result.processed });
}
