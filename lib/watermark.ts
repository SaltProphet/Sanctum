export type CreatorTier = 'burner' | 'professional' | 'empire';

export type BrandingWatermark =
  | { kind: 'sanctum'; src: string; alt: string }
  | { kind: 'custom'; src: string; alt: string }
  | { kind: 'none' };

type BrandingWatermarkOptions = {
  tierParam: string | null;
  customLogoUrlParam: string | null;
};

const SANCTUM_WATERMARK_SRC = '/SanctumLogo.png';
const DEFAULT_CUSTOM_WATERMARK_SRC = '/UserUpload.png';

export function resolveCreatorTier(tierParam: string | null): CreatorTier {
  if (tierParam === '3' || tierParam === 'empire') {
    return 'empire';
  }

  if (tierParam === '2' || tierParam === 'professional') {
    return 'professional';
  }

  return 'burner';
}

export function getBrandingWatermark({ tierParam, customLogoUrlParam }: BrandingWatermarkOptions): BrandingWatermark {
  const tier = resolveCreatorTier(tierParam);

  if (tier === 'professional') {
    return { kind: 'none' };
  }

  if (tier === 'empire') {
    return {
      kind: 'custom',
      src: customLogoUrlParam || DEFAULT_CUSTOM_WATERMARK_SRC,
      alt: 'Creator branding watermark',
    };
  }

  return {
    kind: 'sanctum',
    src: SANCTUM_WATERMARK_SRC,
    alt: 'Powered by Sanctum watermark',
  };
}
'use server';

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

function computeHmacHash(value: string) {
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
  return `DO NOT RECORD • SESSION ${sessionId.slice(0, 8)} • IP_HASH ${ipHash.slice(0, 12)}`;
}

function extractByteValueFromHash(seedHash: string, index: number) {
  const start = index * 2;
  const pair = seedHash.slice(start, start + 2);
  return Number.parseInt(pair, 16);
}

export function createWatermarkTiles(seed: string): WatermarkTile[] {
  const seedHash = computeHmacHash(seed);

  return Array.from({ length: TILE_COUNT }, (_, index) => {
    const topPercent = 5 + (extractByteValueFromHash(seedHash, index % 16) / 255) * 90;
    const leftPercent = 5 + (extractByteValueFromHash(seedHash, (index + 7) % 16) / 255) * 90;
    const rotateDeg = -18 + (extractByteValueFromHash(seedHash, (index + 11) % 16) / 255) * 36;
    const opacity = 0.18 + (extractByteValueFromHash(seedHash, (index + 3) % 16) / 255) * 0.2;

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
  return computeHmacHash(clientIp ?? 'unknown-client-ip');
}

export function getWatermarkMetadata(sessionId: string, clientIpHash: string, roomId: string) {
  const watermarkId = computeHmacHash(`${sessionId}:${clientIpHash}:${roomId}`);

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
    timestamp: new Date().toISOString(),
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
