/**
 * The geofence engine: a pure reducer that turns location fixes, OS region events and session changes into
 *  - reminders (always questions — the app never clocks in on its own),
 *  - an adaptive sampling plan (coarse and rare when far away, fine and frequent close to a fence),
 *  - the set of OS regions to monitor (approach / near / fence rings per workplace).
 *
 * It has no timers and no I/O, so it runs the same in a background task, in the app and in tests.
 */
import { clamp, distanceMeters } from '../geo';
import {
  DEFAULT_MAX_REGIONS,
  EXIT_HYSTERESIS_M,
  MAX_ACCURACY_FACTOR,
  MAX_INTERPOLATION_GAP_MS,
  PROFILES,
} from './profiles';
import type {
  Effect,
  EngineInput,
  EngineState,
  Fix,
  OsRegion,
  PrecisionProfile,
  SamplingPlan,
  Workplace,
  WorkplaceTrack,
  Zone,
} from './types';

export interface EngineConfig {
  workplaces: Workplace[];
  /** Device zone: the battery budget day, and rules of workplaces without their own `tz`. */
  timeZone: string;
  maxRegions?: number;
}

export function initialState(profile: PrecisionProfile = 'balanced'): EngineState {
  return {
    profile,
    tracks: {},
    clockedIn: false,
    budget: { day: '', fineMs: 0 },
    plan: { mode: 'coarse', accuracy: 'balanced', intervalMs: 5 * 60_000, distanceIntervalM: 100, reason: 'Waiting for a first location' },
  };
}

// ---------------------------------------------------------------------------
// Local time helpers
// ---------------------------------------------------------------------------

export function localParts(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')) + 1;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: +get('hour') * 60 + +get('minute'), weekday };
}

const hhmm = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

/** Zone a workplace's rules are read in: its own, else the device's. */
const zoneOf = (wp: Workplace, cfg: EngineConfig) => wp.tz ?? cfg.timeZone;
/** The local date at a workplace — arrival questions are asked once per day there. */
const dayAt = (wp: Workplace, ms: number, cfg: EngineConfig) => localParts(ms, zoneOf(wp, cfg)).date;

function ruleDayActive(wp: Workplace, ms: number, tz: string) {
  const { weekday } = localParts(ms, tz);
  return wp.rules.days.length === 0 || wp.rules.days.includes(weekday);
}

function inArrivalWindow(wp: Workplace, ms: number, tz: string) {
  const w = wp.rules.arrival.window;
  if (!w) return true;
  const { minutes } = localParts(ms, tz);
  return minutes >= hhmm(w.from) && minutes <= hhmm(w.to);
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

/** Distance from the fence edge (negative = inside). */
export const edgeDistance = (fix: Fix, wp: Workplace) => distanceMeters(fix, wp) - wp.radius;

/**
 * Accuracy-aware classification with hysteresis:
 * entering needs the accuracy circle mostly inside, leaving needs the user clearly beyond the edge.
 * Fixes that are too inaccurate to decide keep the previous inside/outside answer.
 */
export function classify(fix: Fix, wp: Workplace, prev: Zone, profile: PrecisionProfile): Zone {
  const p = PROFILES[profile];
  const d = distanceMeters(fix, wp);
  const acc = Math.max(0, fix.accuracy);
  const undecidable = acc > wp.radius * MAX_ACCURACY_FACTOR;
  let inside: boolean;
  if (prev === 'inside') {
    inside = undecidable ? true : d - acc * 0.5 <= wp.radius + EXIT_HYSTERESIS_M;
  } else {
    inside = undecidable ? false : d + acc * 0.5 <= wp.radius;
  }
  if (inside) return 'inside';
  const edge = d - wp.radius;
  if (edge <= p.nearRing) return 'near';
  if (edge <= p.approachRing) return 'approach';
  return 'far';
}

/** Estimate when the edge was crossed between two fixes (linear in distance). */
function crossingTime(prev: Fix | undefined, cur: Fix, wp: Workplace): number {
  if (!prev || cur.timestamp - prev.timestamp > MAX_INTERPOLATION_GAP_MS) return cur.timestamp;
  const a = Math.abs(distanceMeters(prev, wp) - wp.radius);
  const b = Math.abs(distanceMeters(cur, wp) - wp.radius);
  if (a + b === 0) return cur.timestamp;
  return Math.round(prev.timestamp + ((cur.timestamp - prev.timestamp) * a) / (a + b));
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const inputTime = (i: EngineInput) =>
  i.type === 'fix' ? i.fix.timestamp : i.type === 'region' ? i.timestamp : i.now;

export function step(state: EngineState, input: EngineInput, cfg: EngineConfig): { state: EngineState; effects: Effect[] } {
  const s: EngineState = { ...state, tracks: { ...state.tracks }, budget: { ...state.budget } };
  const effects: Effect[] = [];
  const now = inputTime(input);
  const today = localParts(now, cfg.timeZone).date;
  if (s.budget.day !== today) s.budget = { day: today, fineMs: 0 };

  const track = (id: string): WorkplaceTrack => (s.tracks[id] = { ...(s.tracks[id] ?? { zone: 'far' }) });

  const enter = (id: string, t: WorkplaceTrack, at: number) => {
    if (t.zone === 'inside') return;
    if (t.departureSent) effects.push({ type: 'cancelNotification', kind: 'departure', workplaceId: id });
    t.zone = 'inside';
    t.insideSince = at;
    t.arrivedAt = at;
    t.outsideSince = undefined;
    t.departureSent = false;
  };
  const leave = (t: WorkplaceTrack, zone: Zone, at: number) => {
    if (t.zone === 'inside') t.outsideSince = at;
    t.zone = zone;
    t.insideSince = undefined;
  };

  switch (input.type) {
    case 'fix': {
      const fix = input.fix;
      if (s.plan.mode === 'fine' && s.lastFixAt) {
        s.budget.fineMs += Math.min(fix.timestamp - s.lastFixAt, s.plan.intervalMs * 2);
      }
      s.lastFixAt = fix.timestamp;
      for (const wp of cfg.workplaces) {
        const t = track(wp.id);
        const zone = classify(fix, wp, t.zone, s.profile);
        if (zone === 'inside') {
          if (t.zone !== 'inside') enter(wp.id, t, crossingTime(t.lastFix, fix, wp));
          t.lastInsideAt = fix.timestamp;
        } else if (t.zone === 'inside') {
          leave(t, zone, crossingTime(t.lastFix, fix, wp));
        } else {
          t.zone = zone;
        }
        t.lastFix = fix;
      }
      break;
    }
    case 'region': {
      const [wpId, ring] = input.regionId.split(':');
      const wp = cfg.workplaces.find((w) => w.id === wpId);
      if (!wp) break;
      const t = track(wp.id);
      if (ring === 'fence') {
        // OS fence events are coarse: they start precise sampling, and only decide on their own
        // when no better fix follows (handled by the plan, which samples finely around the fence).
        if (input.event === 'enter') enter(wp.id, t, input.timestamp);
        else if (t.zone === 'inside') leave(t, 'near', input.timestamp);
      } else if (t.zone !== 'inside') {
        if (input.event === 'enter') t.zone = ring === 'near' ? 'near' : t.zone === 'near' ? 'near' : 'approach';
        else t.zone = ring === 'near' ? 'approach' : 'far';
      }
      break;
    }
    case 'session':
      s.clockedIn = input.clockedIn;
      s.clockedInAt = input.clockedIn ? input.workplaceId : undefined;
      if (input.clockedIn) {
        for (const wp of cfg.workplaces) {
          // Clocking in answers today's arrival question everywhere.
          const t = track(wp.id);
          if (t.arrivalHandledOn !== dayAt(wp, now, cfg)) {
            effects.push({ type: 'cancelNotification', kind: 'arrival', workplaceId: wp.id });
            t.arrivalHandledOn = dayAt(wp, now, cfg);
          }
        }
      }
      break;
    case 'answered': {
      const t = track(input.workplaceId);
      const wp = cfg.workplaces.find((w) => w.id === input.workplaceId);
      if (input.kind === 'arrival') t.arrivalHandledOn = wp ? dayAt(wp, now, cfg) : today;
      else t.departureSent = true;
      break;
    }
    case 'profile':
      s.profile = input.profile;
      break;
    case 'tick':
      break;
  }

  // Reminders
  for (const wp of cfg.workplaces) {
    const t = track(wp.id);
    const r = wp.rules;
    const day = dayAt(wp, now, cfg);
    if (
      r.arrival.enabled &&
      t.zone === 'inside' &&
      t.insideSince !== undefined &&
      !s.clockedIn &&
      t.arrivalHandledOn !== day &&
      ruleDayActive(wp, now, zoneOf(wp, cfg)) &&
      inArrivalWindow(wp, t.arrivedAt ?? now, zoneOf(wp, cfg)) &&
      now - t.insideSince >= r.arrival.delayMinutes * 60_000
    ) {
      effects.push({ type: 'notify', kind: 'arrival', workplaceId: wp.id, suggestedAt: t.arrivedAt ?? t.insideSince });
      t.arrivalHandledOn = day;
    }
    const sessionHere = r.departure.onlyWhenClockedIn ? s.clockedInAt === wp.id : s.clockedIn;
    if (
      r.departure.enabled &&
      t.zone !== 'inside' &&
      t.outsideSince !== undefined &&
      !t.departureSent &&
      sessionHere &&
      now - t.outsideSince >= r.departure.delayMinutes * 60_000
    ) {
      effects.push({ type: 'notify', kind: 'departure', workplaceId: wp.id, suggestedAt: t.lastInsideAt ?? t.outsideSince });
      t.departureSent = true;
    }
  }

  // Sampling plan & regions
  const plan = planSampling(s, cfg, now);
  if (!samePlan(plan, state.plan)) effects.push({ type: 'sampling', plan });
  s.plan = plan;
  const regions = osRegions(s, cfg, now);
  const prevRegions = osRegions(state, cfg, now);
  if (input.type === 'profile' || regionKey(regions) !== regionKey(prevRegions)) effects.push({ type: 'regions', regions });

  return { state: s, effects };
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

/** Does this workplace currently need watching, and for what? */
function relevance(s: EngineState, wp: Workplace, now: number, cfg: EngineConfig) {
  const t = s.tracks[wp.id];
  const arrival =
    wp.rules.arrival.enabled && !s.clockedIn && t?.arrivalHandledOn !== dayAt(wp, now, cfg) && ruleDayActive(wp, now, zoneOf(wp, cfg));
  const departure = wp.rules.departure.enabled && (wp.rules.departure.onlyWhenClockedIn ? s.clockedInAt === wp.id : s.clockedIn);
  return { arrival, departure };
}

export function planSampling(s: EngineState, cfg: EngineConfig, now: number): SamplingPlan {
  const p = PROFILES[s.profile];

  // 1. A dwell timer is running: keep waking up until it can be decided.
  for (const wp of cfg.workplaces) {
    const t = s.tracks[wp.id];
    if (!t) continue;
    const rel = relevance(s, wp, now, cfg);
    let remaining: number | undefined;
    if (rel.arrival && t.zone === 'inside' && t.insideSince !== undefined)
      remaining = wp.rules.arrival.delayMinutes * 60_000 - (now - t.insideSince);
    if (rel.departure && t.zone !== 'inside' && t.outsideSince !== undefined && !t.departureSent)
      remaining = wp.rules.departure.delayMinutes * 60_000 - (now - t.outsideSince);
    if (remaining !== undefined && remaining > 0) {
      return {
        mode: 'coarse',
        accuracy: 'balanced',
        intervalMs: clamp(remaining, 30_000, 2 * 60_000),
        distanceIntervalM: 0,
        workplaceId: wp.id,
        reason: `Confirming ${t.zone === 'inside' ? 'arrival' : 'departure'} at ${wp.name}`,
      };
    }
  }

  // 2. Otherwise follow the closest workplace that still matters.
  let best: { wp: Workplace; edge: number; zone: Zone } | undefined;
  let anyRelevant = false;
  for (const wp of cfg.workplaces) {
    const rel = relevance(s, wp, now, cfg);
    if (!rel.arrival && !rel.departure) continue;
    anyRelevant = true;
    const t = s.tracks[wp.id];
    if (!t?.lastFix) continue;
    if (t.zone === 'inside') continue; // the OS exit region wakes us
    if (!rel.arrival) continue; // only departures matter and we're already outside: handled above
    const edge = Math.max(0, distanceMeters(t.lastFix, wp) - wp.radius);
    if (!best || edge < best.edge) best = { wp, edge, zone: t.zone };
  }

  if (!anyRelevant) return off('No reminders due right now');
  if (!best) {
    const hasFix = cfg.workplaces.some((w) => s.tracks[w.id]?.lastFix);
    return hasFix ? off('Inside — the OS tells us when you leave') : { mode: 'coarse', accuracy: 'balanced', intervalMs: 5 * 60_000, distanceIntervalM: 100, reason: 'Waiting for a first location' };
  }
  if (best.zone === 'far') return off(`Far from ${best.wp.name} — the approach ring will wake us`, best.wp.id);

  const fix = s.tracks[best.wp.id]!.lastFix!;
  const speed = fix.speed !== undefined && fix.speed > 0 ? Math.max(fix.speed * 1.3, 1.4) : p.assumedSpeed;
  const eta = (best.edge / speed) * 1000;

  if (best.zone === 'approach') {
    return {
      mode: 'coarse',
      accuracy: p.approach.accuracy,
      intervalMs: Math.round(clamp(eta * 0.5, p.approach.minMs, p.approach.maxMs)),
      distanceIntervalM: Math.round(clamp(best.edge / 4, 50, 1_000)),
      workplaceId: best.wp.id,
      reason: `Approaching ${best.wp.name} (${Math.round(best.edge)} m)`,
    };
  }

  const overBudget = s.budget.fineMs >= p.fineBudgetMinutes * 60_000;
  return {
    mode: overBudget ? 'coarse' : 'fine',
    accuracy: overBudget ? 'balanced' : p.near.accuracy,
    intervalMs: Math.round(clamp(eta * 0.5, p.near.minMs, p.near.maxMs)),
    distanceIntervalM: Math.round(clamp(best.edge / 4, 10, 100)),
    workplaceId: best.wp.id,
    reason: overBudget
      ? `Near ${best.wp.name} — daily precision budget used, sampling gently`
      : `Near ${best.wp.name} (${Math.round(best.edge)} m)`,
  };
}

const off = (reason: string, workplaceId?: string): SamplingPlan => ({
  mode: 'off',
  accuracy: 'low',
  intervalMs: 0,
  distanceIntervalM: 0,
  workplaceId,
  reason,
});

const samePlan = (a: SamplingPlan, b: SamplingPlan) =>
  a.mode === b.mode &&
  a.accuracy === b.accuracy &&
  a.workplaceId === b.workplaceId &&
  // Interval changes below 20 % aren't worth restarting the location service for.
  Math.abs(a.intervalMs - b.intervalMs) <= Math.max(a.intervalMs, b.intervalMs) * 0.2;

/** Rings to hand to the OS, closest workplaces first, within the platform's region limit. */
export function osRegions(s: EngineState, cfg: EngineConfig, now: number): OsRegion[] {
  const p = PROFILES[s.profile];
  const max = cfg.maxRegions ?? DEFAULT_MAX_REGIONS;
  const relevant = cfg.workplaces
    .map((wp) => ({ wp, rel: relevance(s, wp, now, cfg), t: s.tracks[wp.id] }))
    .filter((x) => x.rel.arrival || x.rel.departure)
    .sort((a, b) => dist(a.t, a.wp) - dist(b.t, b.wp));
  const out: OsRegion[] = [];
  const ring = (wp: Workplace, kind: OsRegion['ring'], radius: number): OsRegion => ({
    id: `${wp.id}:${kind}`,
    workplaceId: wp.id,
    ring: kind,
    lat: wp.lat,
    lng: wp.lng,
    radius: Math.round(radius),
  });
  // Fences first for everyone, then near rings, then approach rings — so a crowded list loses the cheap rings.
  for (const { wp } of relevant) out.push(ring(wp, 'fence', wp.radius));
  for (const { wp, rel } of relevant) if (rel.arrival) out.push(ring(wp, 'near', wp.radius + p.nearRing));
  for (const { wp, rel } of relevant) if (rel.arrival) out.push(ring(wp, 'approach', wp.radius + p.approachRing));
  return out.slice(0, max);
}

const dist = (t: WorkplaceTrack | undefined, wp: Workplace) => (t?.lastFix ? distanceMeters(t.lastFix, wp) : Infinity);
const regionKey = (r: OsRegion[]) => r.map((x) => `${x.id}@${x.radius}`).join('|');
