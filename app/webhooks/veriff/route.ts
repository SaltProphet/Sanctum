import { handleVeriffWebhook } from '../../../lib/veriffWebhookHandler.ts';

export async function POST(request: Request): Promise<Response> {
  return handleVeriffWebhook(request);
}
