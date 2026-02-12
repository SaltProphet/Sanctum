import {
  buildWatermarkText,
  createViewerSessionId,
  createWatermarkTiles,
  getClientIpHash,
  logWatermarkMapping,
  resolveClientIpFromHeaders,
  SESSION_COOKIE_NAME,
} from '@/lib/watermark';
import { cookies, headers } from 'next/headers';
import RoomClient from './RoomClient';

import { getBrandingWatermark } from '@/lib/watermark';

type RoomPageProps = {
  params: {
    roomId: string;
  };
};

export default function RoomPage({ params }: RoomPageProps) {
  const sessionCookieStore = cookies();
  const headerMap = headers();

  // First try middleware-provided header for immediate consistency, then cookie fallback.
  const sessionId =
    headerMap.get('x-viewer-session-id') ??
    sessionCookieStore.get(SESSION_COOKIE_NAME)?.value ??
    createViewerSessionId();

  const clientIp = resolveClientIpFromHeaders(headerMap);
  const clientIpHash = getClientIpHash(clientIp);
  const watermarkText = buildWatermarkText(sessionId, clientIpHash);

  logWatermarkMapping(sessionId, clientIpHash, params.roomId);

  return (
    <RoomClient
      roomId={params.roomId}
      watermarkText={watermarkText}
      watermarkTiles={createWatermarkTiles(`${params.roomId}:${sessionId}:${clientIpHash}`)}
    />
  );
}
