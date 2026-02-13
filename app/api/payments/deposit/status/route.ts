import { getDepositByCreatorId } from '@/lib/payments';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const creatorId = url.searchParams.get('creator_id')?.trim() ?? '';

  if (!creatorId) {
    return Response.json({ error: 'creator_id query parameter is required.' }, { status: 400 });
  }

  const deposit = getDepositByCreatorId(creatorId);

  if (!deposit) {
    return Response.json({ status: 'deposit_missing' });
  }

  return Response.json({
    payment_intent_id: deposit.payment_intent_id,
    provider: deposit.provider,
    status: deposit.status,
    amount: deposit.amount,
    currency: deposit.currency,
    creator_id: deposit.creator_id,
  });
}
