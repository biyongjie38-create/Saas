export const COLLECT_DURATION_PRESET_VALUES = [
  "any",
  "shorts",
  "minutes_1_3",
  "minutes_3_5",
  "minutes_5_10",
  "minutes_10_20",
  "minutes_20_plus"
] as const;

export type CollectDurationPreset = (typeof COLLECT_DURATION_PRESET_VALUES)[number];

export const DEFAULT_COLLECT_DURATION_PRESET: CollectDurationPreset = "any";

type DurationRange = {
  minSeconds: number;
  maxSeconds: number | null;
};

const DURATION_RANGES: Record<CollectDurationPreset, DurationRange> = {
  any: {
    minSeconds: 0,
    maxSeconds: null
  },
  shorts: {
    minSeconds: 0,
    maxSeconds: 60
  },
  minutes_1_3: {
    minSeconds: 60,
    maxSeconds: 180
  },
  minutes_3_5: {
    minSeconds: 180,
    maxSeconds: 300
  },
  minutes_5_10: {
    minSeconds: 300,
    maxSeconds: 600
  },
  minutes_10_20: {
    minSeconds: 600,
    maxSeconds: 1200
  },
  minutes_20_plus: {
    minSeconds: 1200,
    maxSeconds: null
  }
};

export function normalizeCollectDurationPreset(value: unknown): CollectDurationPreset {
  return typeof value === "string" && value in DURATION_RANGES
    ? (value as CollectDurationPreset)
    : DEFAULT_COLLECT_DURATION_PRESET;
}

export function resolveCollectDurationRange(preset: CollectDurationPreset): DurationRange {
  return DURATION_RANGES[preset] ?? DURATION_RANGES[DEFAULT_COLLECT_DURATION_PRESET];
}

export function matchesCollectDurationPreset(durationSec: number, preset: CollectDurationPreset): boolean {
  const range = resolveCollectDurationRange(preset);
  if (durationSec < range.minSeconds) {
    return false;
  }
  if (range.maxSeconds !== null && durationSec > range.maxSeconds) {
    return false;
  }
  return true;
}
