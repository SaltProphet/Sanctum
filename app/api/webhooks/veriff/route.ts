import type { NextRequest } from 'next/server';

import { handleVeriffWebhook } from '../../../../lib/veriffWebhookHandler.ts';

export async function POST(request: NextRequest): Promise<Response> {
  return handleVeriffWebhook(request);
}
