const NIGHT_PASS_SECONDS = 4 * 60 * 60;

export function getNightPassRemaining(createdAtIso: string, nowMs: number): string {
  const created = new Date(createdAtIso).getTime();
  const diff = Math.max(0, NIGHT_PASS_SECONDS - Math.floor((nowMs - created) / 1000));
  const hours = String(Math.floor(diff / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const seconds = String(diff % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
