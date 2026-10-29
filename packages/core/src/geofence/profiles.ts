import type { PrecisionProfile } from './types';

export interface ProfileSpec {
  /** Outer ring, metres beyond the fence edge: crossing it wakes the app (OS region, ~free). */
  approachRing: number;
  /** Inner ring, metres beyond the fence edge: inside it we sample precisely. */
  nearRing: number;
  approach: { accuracy: 'low' | 'balanced'; minMs: number; maxMs: number };
  near: { accuracy: 'balanced' | 'high'; minMs: number; maxMs: number };
  /** Speed assumed when the platform reports none (m/s). 14 m/s ≈ 50 km/h city traffic. */
  assumedSpeed: number;
  /** Daily cap on high-accuracy sampling, in minutes. Afterwards the engine falls back to balanced. */
  fineBudgetMinutes: number;
}

const MIN = 60_000;

/**
 * Three user-facing profiles. Sampling interval inside a ring is
 *   clamp(distanceToFence / speed × 0.5, minMs, maxMs)
 * so the closer you get, the more often we look — but never more often than the profile allows.
 */
export const PROFILES: Record<PrecisionProfile, ProfileSpec> = {
  batterySaver: {
    approachRing: 2_000,
    nearRing: 400,
    approach: { accuracy: 'low', minMs: 5 * MIN, maxMs: 20 * MIN },
    near: { accuracy: 'balanced', minMs: 1 * MIN, maxMs: 4 * MIN },
    assumedSpeed: 14,
    fineBudgetMinutes: 15,
  },
  balanced: {
    approachRing: 3_000,
    nearRing: 600,
    approach: { accuracy: 'balanced', minMs: 2 * MIN, maxMs: 10 * MIN },
    near: { accuracy: 'high', minMs: 20_000, maxMs: 90_000 },
    assumedSpeed: 14,
    fineBudgetMinutes: 40,
  },
  precise: {
    approachRing: 5_000,
    nearRing: 900,
    approach: { accuracy: 'balanced', minMs: 1 * MIN, maxMs: 5 * MIN },
    near: { accuracy: 'high', minMs: 10_000, maxMs: 30_000 },
    assumedSpeed: 17,
    fineBudgetMinutes: 90,
  },
};

/** Entering needs this much confidence; leaving needs the user to be this far beyond the edge. */
export const EXIT_HYSTERESIS_M = 40;
/** Fixes worse than this (relative to the radius) can't decide inside/outside. */
export const MAX_ACCURACY_FACTOR = 1.5;
/** Fix gaps longer than this are not interpolated (the user may have stopped anywhere). */
export const MAX_INTERPOLATION_GAP_MS = 20 * 60_000;
/** iOS monitors at most 20 regions per app; keep a little headroom. */
export const DEFAULT_MAX_REGIONS = 18;
