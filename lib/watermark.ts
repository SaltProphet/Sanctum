import crypto from 'node:crypto';
import { isIP } from 'node:net';

const SESSION_COOKIE_NAME = 'sanctum_viewer_session';
const TILE_COUNT = 18;

export type WatermarkTile = {
  id: string;
  topPercent: number;
  leftPercent: number;
  rotateDeg: number;
  opacity: number;
};

function getHashSecret() {
  return process.env.WATERMARK_HASH_SECRET || process.env.DAILY_API_KEY || 'sanctum-dev-secret';
}

function hashValue(value: string) {
  return crypto.createHmac('sha256', getHashSecret()).update(value).digest('hex');
}

function sanitizeIp(rawIp: string | null): string | null {
  if (!rawIp) {
    return null;
  }

  const candidate = rawIp.split(',')[0]?.trim();
  if (!candidate) {
    return null;
  }

  return isIP(candidate) ? candidate : null;
}

export function resolveClientIpFromHeaders(headerMap: Headers): string | null {
  const candidateHeaders = [
    headerMap.get('x-forwarded-for'),
    headerMap.get('x-real-ip'),
    headerMap.get('x-vercel-forwarded-for'),
  ];

  for (const candidate of candidateHeaders) {
    const sanitized = sanitizeIp(candidate);
    if (sanitized) {
      return sanitized;
    }
  }

  return null;
}

export function buildWatermarkText(sessionId: string, ipHash: string) {
  return `DO NOT RECORD • SESSION ${sessionId.slice(0, 8)} • IPH ${ipHash.slice(0, 12)}`;
}

function readSeedValue(seedHash: string, index: number) {
  const start = index * 2;
  const pair = seedHash.slice(start, start + 2);
  return Number.parseInt(pair, 16);
}

export function createWatermarkTiles(seed: string): WatermarkTile[] {
  const seedHash = hashValue(seed);

  return Array.from({ length: TILE_COUNT }, (_, index) => {
    const topPercent = 5 + (readSeedValue(seedHash, index % 16) / 255) * 90;
    const leftPercent = 5 + (readSeedValue(seedHash, (index + 7) % 16) / 255) * 90;
    const rotateDeg = -18 + (readSeedValue(seedHash, (index + 11) % 16) / 255) * 36;
    const opacity = 0.18 + (readSeedValue(seedHash, (index + 3) % 16) / 255) * 0.2;

    return {
      id: `tile-${index}`,
      topPercent,
      leftPercent,
      rotateDeg,
      opacity,
    };
  });
}

export function getClientIpHash(clientIp: string | null): string {
  return hashValue(clientIp ?? 'unknown-client-ip');
}

export function getWatermarkMetadata(sessionId: string, clientIpHash: string, roomId: string) {
  const watermarkId = hashValue(`${sessionId}:${clientIpHash}:${roomId}`);

  return {
    sessionId,
    clientIpHash,
    roomId,
    watermarkId,
  };
}

export function logWatermarkMapping(sessionId: string, clientIpHash: string, roomId: string): void {
  const metadata = getWatermarkMetadata(sessionId, clientIpHash, roomId);

  console.info('[watermark-mapping]', {
    ts: new Date().toISOString(),
    roomId: metadata.roomId,
    sessionId: metadata.sessionId,
    clientIpHash: metadata.clientIpHash,
    watermarkId: metadata.watermarkId,
  });
}

export function createViewerSessionId(): string {
  return crypto.randomUUID();
}

export { SESSION_COOKIE_NAME };
