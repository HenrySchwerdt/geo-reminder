/**
 * Simulates a morning commute to quantify the adaptive sampling against naive continuous GPS.
 * Run with `npm test -- --reporter=verbose`; the table is printed and summarised in docs/technical/geofencing.md.
 */
import { describe, expect, it } from 'vitest';
import { initialState, step, type EngineConfig, type Fix, type PrecisionProfile, type Workplace } from '../src';

const STUDIO: Workplace = {
  id: 'studio',
  name: 'Studio Kreuzberg',
  lat: 52.50108,
  lng: 13.41945,
  radius: 150,
  rules: {
    arrival: { enabled: true, delayMinutes: 3 },
    departure: { enabled: true, delayMinutes: 15, onlyWhenClockedIn: true },
    days: [],
  },
};
const cfg: EngineConfig = { workplaces: [STUDIO], timeZone: 'Europe/Berlin' };
const START = Date.UTC(2025, 9, 15, 5, 45); // 07:45 local

/** Distance from the studio (m) and speed (m/s) at time t (s): 12 km by tram/bike, the last 600 m on foot. */
function commute(t: number): { d: number; v: number } {
  const driveSpeed = 9; // ~32 km/h average incl. stops
  const driveEnd = (12_000 - 600) / driveSpeed;
  if (t < driveEnd) return { d: 12_000 - driveSpeed * t, v: driveSpeed };
  const walk = t - driveEnd;
  return { d: Math.max(20, 600 - 1.3 * walk), v: walk * 1.3 < 580 ? 1.3 : 0 };
}

function simulate(profile: PrecisionProfile) {
  let state = initialState(profile);
  let t = 0;
  let fixes = 0;
  let fineFixes = 0;
  let arrivalAt: number | undefined;
  const log: string[] = [];
  const END = 60 * 60; // one hour
  // The approach ring wakes the app when crossed (OS region event); before that nothing runs.
  let woke = false;
  while (t < END) {
    const { d, v } = commute(t);
    const ts = START + t * 1000;
    if (!woke && d - STUDIO.radius <= 3_000 + (profile === 'precise' ? 2_000 : profile === 'batterySaver' ? -1_000 : 0)) {
      woke = true;
      state = step(state, { type: 'region', regionId: 'studio:approach', event: 'enter', timestamp: ts }, cfg).state;
    }
    const plan = state.plan;
    const firstFix = state.lastFixAt === undefined;
    if (plan.mode !== 'off' || firstFix) {
      const fix: Fix = { lat: STUDIO.lat + d / 111_320, lng: STUDIO.lng, accuracy: plan.accuracy === 'high' ? 8 : 40, timestamp: ts, speed: v };
      const r = step(state, { type: 'fix', fix }, cfg);
      state = r.state;
      fixes++;
      if (plan.mode === 'fine') fineFixes++;
      log.push(`${new Date(ts).toISOString().slice(11, 16)}  ${String(Math.round(d)).padStart(6)} m  ${state.plan.mode.padEnd(6)} every ${Math.round(state.plan.intervalMs / 1000)} s`);
      for (const e of r.effects) if (e.type === 'notify') arrivalAt = e.suggestedAt;
      const wait = state.plan.mode === 'off' ? 60 : Math.max(5, state.plan.intervalMs / 1000);
      t += wait;
    } else {
      t += 60; // nothing runs; we only advance the clock
    }
  }
  return { fixes, fineFixes, arrivalAt, log };
}

describe('commute simulation', () => {
  it('uses a fraction of the fixes of continuous GPS and still detects arrival within a minute', () => {
    const rows: string[] = [];
    for (const profile of ['batterySaver', 'balanced', 'precise'] as const) {
      const r = simulate(profile);
      const naive = 60 * 60 / 5; // continuous high-accuracy updates every 5 s
      const realArrival = START + (((12_000 - 600) / 9 + (600 - 150) / 1.3) * 1000);
      const error = r.arrivalAt ? Math.round((r.arrivalAt - realArrival) / 1000) : NaN;
      rows.push(`| ${profile} | ${r.fixes} | ${r.fineFixes} | ${Math.round((r.fixes / naive) * 100)} % | ${error} s |`);
      expect(r.arrivalAt).toBeDefined();
      expect(Math.abs(error)).toBeLessThan(profile === 'batterySaver' ? 180 : 60);
      expect(r.fixes).toBeLessThan(naive * 0.25);
      if (profile === 'balanced') console.log(r.log.join('\n'));
    }
    console.log(['| Profile | Fixes / h | High-accuracy fixes | vs. GPS every 5 s | Arrival time error |', '|---|---|---|---|---|', ...rows].join('\n'));
  });
});
