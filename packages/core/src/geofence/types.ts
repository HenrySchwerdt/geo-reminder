import type { LatLng } from '../geo';

export type { PrecisionProfile, ReminderRules, Workplace } from '../schema';
import type { PrecisionProfile } from '../schema';

/** One location fix as delivered by expo-location (or a simulator). */
export interface Fix extends LatLng {
  /** Horizontal accuracy (68 % radius) in metres. */
  accuracy: number;
  /** Epoch milliseconds. */
  timestamp: number;
  /** Metres per second, when the platform reports it (negative / undefined = unknown). */
  speed?: number;
}

/** Where the user is relative to one workplace. */
export type Zone = 'far' | 'approach' | 'near' | 'inside';

export type SamplingMode = 'off' | 'coarse' | 'fine';

/** What the location layer should do until the next decision. */
export interface SamplingPlan {
  mode: SamplingMode;
  /** expo-location accuracy to request. */
  accuracy: 'low' | 'balanced' | 'high';
  /** Minimum time between fixes. */
  intervalMs: number;
  /** Minimum movement between fixes. */
  distanceIntervalM: number;
  /** Workplace that drives this plan (the closest relevant one). */
  workplaceId?: string;
  /** Short human explanation for the diagnostics screen. */
  reason: string;
}

/** An OS-level circular region (iOS region monitoring / Android Geofencing API). */
export interface OsRegion extends LatLng {
  /** `${workplaceId}:${ring}` */
  id: string;
  workplaceId: string;
  ring: 'fence' | 'near' | 'approach';
  radius: number;
}

export interface WorkplaceTrack {
  zone: Zone;
  /** When we first believed the user was inside (start of the current stay). */
  insideSince?: number;
  /** Best estimate of the actual arrival time (interpolated between fixes). */
  arrivedAt?: number;
  /** Last time a fix placed the user inside. */
  lastInsideAt?: number;
  /** When the user left (start of the current absence). */
  outsideSince?: number;
  /** Local date (YYYY-MM-DD) on which the arrival reminder was last sent / answered. */
  arrivalHandledOn?: string;
  /** Whether a departure reminder is pending or was sent for the current absence. */
  departureSent?: boolean;
  lastFix?: Fix;
}

export interface EngineState {
  profile: PrecisionProfile;
  tracks: Record<string, WorkplaceTrack>;
  /** Workplace id of the running session, if the user is clocked in at a workplace. */
  clockedInAt?: string;
  /** True while any session runs (also home office). */
  clockedIn: boolean;
  /** High-accuracy minutes used today, for the battery budget. */
  budget: { day: string; fineMs: number };
  plan: SamplingPlan;
  lastFixAt?: number;
}

export type EngineInput =
  | { type: 'fix'; fix: Fix }
  | { type: 'region'; regionId: string; event: 'enter' | 'exit'; timestamp: number }
  | { type: 'tick'; now: number }
  | { type: 'session'; clockedIn: boolean; workplaceId?: string; now: number }
  | { type: 'answered'; workplaceId: string; kind: 'arrival' | 'departure'; now: number }
  | { type: 'profile'; profile: PrecisionProfile; now: number };

export type Effect =
  | {
      type: 'notify';
      kind: 'arrival' | 'departure';
      workplaceId: string;
      /** The time to offer as the default answer ("Clock in at 08:44"). */
      suggestedAt: number;
    }
  | { type: 'cancelNotification'; kind: 'arrival' | 'departure'; workplaceId: string }
  | { type: 'sampling'; plan: SamplingPlan }
  | { type: 'regions'; regions: OsRegion[] };
