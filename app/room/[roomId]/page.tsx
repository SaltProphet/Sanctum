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

type RoomPageProps = {
  params: {
    roomId: string;
  };
};

export default function RoomPage({ params }: RoomPageProps) {
  const sessionCookieStore = cookies();
  const headerMap = headers();
  // First try to get session ID from header set by middleware (for first request)
  // Fall back to cookie value (for subsequent requests after cookie is persisted)
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
