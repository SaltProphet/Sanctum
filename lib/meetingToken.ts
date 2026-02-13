const MAX_TOKEN_TTL_SECONDS = 900;

export function getTokenExpiration(nowEpochSeconds: number, roomExpiration: number): number | null {
  const maxTokenExpiration = nowEpochSeconds + MAX_TOKEN_TTL_SECONDS;
  const boundedExpiration = Math.min(maxTokenExpiration, roomExpiration);

  if (boundedExpiration <= nowEpochSeconds) {
    return null;
  }

  return boundedExpiration;
}
