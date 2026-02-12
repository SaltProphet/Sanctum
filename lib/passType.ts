export const PASS_TYPES = ['quickie', 'marathon'] as const;

export type PassType = (typeof PASS_TYPES)[number];

export const PASS_TYPE_DURATION_SECONDS: Record<PassType, number> = {
  quickie: 3 * 60 * 60,
  marathon: 24 * 60 * 60,
};

export function isPassType(value: unknown): value is PassType {
  return typeof value === 'string' && PASS_TYPES.includes(value as PassType);
}

export function getPassDurationSeconds(passType: PassType): number {
  return PASS_TYPE_DURATION_SECONDS[passType];
}
