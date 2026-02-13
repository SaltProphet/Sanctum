import { isValidString } from '@/lib/jsonUtils';
import { getCreatorOnboardingRecord, transitionCreatorOnboardingStatus } from '@/lib/onboardingStateMachine';
import { isVeriffSuccessPayload, verifyVeriffWebhookSignature, type VeriffWebhookPayload } from '@/lib/veriffWebhook';

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.VERIFF_WEBHOOK_SECRET;

  if (!secret) {
    return Response.json({ error: 'VERIFF_WEBHOOK_SECRET is not configured.' }, { status: 500 });
  }

  const signature = request.headers.get('x-veriff-signature');
  const rawBody = await request.text();

  if (!verifyVeriffWebhookSignature(rawBody, signature, secret)) {
    return Response.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  let payload: VeriffWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as VeriffWebhookPayload;
  } catch {
    return Response.json({ error: 'Invalid webhook payload.' }, { status: 400 });
  }

  if (!isVeriffSuccessPayload(payload)) {
    return Response.json({ received: true, ignored: true });
  }

  if (!isValidString(payload.creatorId) || !isValidString(payload.creatorId.trim())) {
    return Response.json({ error: 'Payload is missing creatorId.' }, { status: 400 });
  }

  const creatorId = payload.creatorId.trim();

  try {
    transitionCreatorOnboardingStatus({
      creatorId,
      to: 'veriff_passed',
      actor: 'webhook',
      source: 'webhook',
    });

    transitionCreatorOnboardingStatus({
      creatorId,
      to: 'vault_archived',
      actor: 'system',
      source: 'system',
    });

    transitionCreatorOnboardingStatus({
      creatorId,
      to: 'active',
      actor: 'system',
      source: 'system',
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Failed to transition onboarding state.',
      },
      { status: 409 },
    );
  }

  return Response.json({ received: true, onboarding: getCreatorOnboardingRecord(creatorId) });
}
