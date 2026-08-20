const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

const durationPattern = /^(\d+)([smhd])$/;

export function parseDurationMs(duration: string): number {
  const match = durationPattern.exec(duration);

  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const [, value, unit] = match;
  return Number(value) * UNIT_MS[unit];
}
