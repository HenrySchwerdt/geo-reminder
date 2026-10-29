import { describe, expect, it } from 'vitest';
import {
  classify,
  initialState,
  osRegions,
  step,
  type EngineConfig,
  type EngineState,
  type Effect,
  type Fix,
  type Workplace,
} from '../src';

// Studio Kreuzberg, Oranienstraße 24, Berlin
const STUDIO: Workplace = {
  id: 'studio',
  name: 'Studio Kreuzberg',
  lat: 52.50108,
  lng: 13.41945,
  radius: 150,
  rules: {
    arrival: { enabled: true, delayMinutes: 5, window: { from: '06:00', to: '11:00' } },
    departure: { enabled: true, delayMinutes: 15, onlyWhenClockedIn: true },
    days: [1, 3, 5],
  },
};
const cfg: EngineConfig = { workplaces: [STUDIO], timeZone: 'Europe/Berlin' };

// Thursday 16 Oct 2025 is not an office day; Wednesday 15 Oct is.
const WED = (h: number, m = 0, s = 0) => Date.UTC(2025, 9, 15, h - 2, m, s); // CEST = UTC+2

/** A fix `meters` north of the studio. */
const at = (meters: number, ts: number, accuracy = 15, speed?: number): Fix => ({
  lat: STUDIO.lat + meters / 111_320,
  lng: STUDIO.lng,
  accuracy,
  timestamp: ts,
  speed,
});

function run(inputs: Parameters<typeof step>[1][], state: EngineState = initialState()) {
  const effects: Effect[] = [];
  for (const i of inputs) {
    const r = step(state, i, cfg);
    state = r.state;
    effects.push(...r.effects);
  }
  return { state, effects };
}

const notifications = (e: Effect[]) => e.filter((x) => x.type === 'notify');

describe('zones', () => {
  it('needs the accuracy circle inside to enter, and a clear exit to leave', () => {
    expect(classify(at(120, 0, 10), STUDIO, 'near', 'balanced')).toBe('inside');
    expect(classify(at(120, 0, 80), STUDIO, 'near', 'balanced')).toBe('near'); // could be outside
    expect(classify(at(170, 0, 20), STUDIO, 'inside', 'balanced')).toBe('inside'); // hysteresis
    expect(classify(at(260, 0, 20), STUDIO, 'inside', 'balanced')).toBe('near');
  });

  it('ignores fixes too inaccurate to decide', () => {
    expect(classify(at(20, 0, 400), STUDIO, 'near', 'balanced')).not.toBe('inside');
    expect(classify(at(600, 0, 400), STUDIO, 'inside', 'balanced')).toBe('inside');
  });

  it('places rings by profile', () => {
    expect(classify(at(5_000, 0), STUDIO, 'far', 'balanced')).toBe('far');
    expect(classify(at(2_000, 0), STUDIO, 'far', 'balanced')).toBe('approach');
    expect(classify(at(600, 0), STUDIO, 'far', 'balanced')).toBe('near');
  });
});

describe('adaptive sampling', () => {
  it('is off when far, coarse and slow on approach, fine and fast near the fence', () => {
    const far = run([{ type: 'fix', fix: at(8_000, WED(8)) }]).state.plan;
    const approach2k = run([{ type: 'fix', fix: at(2_500, WED(8)) }]).state.plan;
    const approach1k = run([{ type: 'fix', fix: at(1_000, WED(8)) }]).state.plan;
    const near = run([{ type: 'fix', fix: at(500, WED(8)) }]).state.plan;
    const close = run([{ type: 'fix', fix: at(200, WED(8)) }]).state.plan;

    expect(far.mode).toBe('off');
    expect(approach2k.mode).toBe('coarse');
    expect(near.mode).toBe('fine');
    expect(near.accuracy).toBe('high');
    // The closer, the more often (monotonic).
    expect(approach2k.intervalMs).toBeGreaterThanOrEqual(approach1k.intervalMs);
    expect(approach1k.intervalMs).toBeGreaterThan(near.intervalMs);
    expect(near.intervalMs).toBeGreaterThanOrEqual(close.intervalMs);
    expect(close.intervalMs).toBeGreaterThanOrEqual(20_000);
  });

  it('samples less often when the user is walking slowly than when driving', () => {
    const walking = run([{ type: 'fix', fix: at(500, WED(8), 15, 1.2) }]).state.plan;
    const driving = run([{ type: 'fix', fix: at(500, WED(8), 15, 13) }]).state.plan;
    expect(walking.intervalMs).toBeGreaterThan(driving.intervalMs);
  });

  it('stops sampling when no reminder is due (not a workday)', () => {
    const thu = Date.UTC(2025, 9, 16, 6);
    expect(run([{ type: 'fix', fix: at(500, thu) }]).state.plan.mode).toBe('off');
  });

  it('falls back from high accuracy once the daily budget is used', () => {
    let state = initialState('batterySaver');
    let t = WED(7);
    for (let i = 0; i < 60; i++) {
      state = step(state, { type: 'fix', fix: at(400, t) }, cfg).state;
      t += 60_000;
    }
    expect(state.plan.mode).toBe('coarse');
    expect(state.plan.reason).toMatch(/budget/);
  });
});

describe('reminders', () => {
  it('asks to clock in after the dwell time, suggesting the interpolated arrival time', () => {
    const { effects } = run([
      { type: 'fix', fix: at(450, WED(8, 40)) },
      { type: 'fix', fix: at(50, WED(8, 44)) }, // crossed 150 m about 3 min in
      { type: 'tick', now: WED(8, 46) },
      { type: 'fix', fix: at(40, WED(8, 50)) },
    ]);
    const n = notifications(effects);
    expect(n).toHaveLength(1);
    expect(n[0]).toMatchObject({ kind: 'arrival', workplaceId: 'studio' });
    const suggested = (n[0] as { suggestedAt: number }).suggestedAt;
    expect(suggested).toBeGreaterThan(WED(8, 42));
    expect(suggested).toBeLessThan(WED(8, 44));
  });

  it('does not ask while passing by, outside the window, twice a day or when already clocked in', () => {
    const passBy = run([
      { type: 'fix', fix: at(50, WED(8)) },
      { type: 'fix', fix: at(400, WED(8, 3)) },
      { type: 'tick', now: WED(8, 20) },
    ]);
    expect(notifications(passBy.effects)).toHaveLength(0);

    const afternoon = run([
      { type: 'fix', fix: at(50, WED(14)) },
      { type: 'tick', now: WED(14, 30) },
    ]);
    expect(notifications(afternoon.effects)).toHaveLength(0);

    const twice = run([
      { type: 'fix', fix: at(50, WED(8)) },
      { type: 'tick', now: WED(8, 6) },
      { type: 'fix', fix: at(800, WED(9)) },
      { type: 'fix', fix: at(50, WED(9, 30)) },
      { type: 'tick', now: WED(9, 40) },
    ]);
    expect(notifications(twice.effects)).toHaveLength(1);

    const clockedIn = run([
      { type: 'session', clockedIn: true, workplaceId: 'studio', now: WED(7, 55) },
      { type: 'fix', fix: at(50, WED(8)) },
      { type: 'tick', now: WED(8, 10) },
    ]);
    expect(notifications(clockedIn.effects)).toHaveLength(0);
  });

  it('asks to clock out only after the departure delay, and a lunch walk never triggers it', () => {
    const base = [
      { type: 'fix', fix: at(50, WED(8)) },
      { type: 'session', clockedIn: true, workplaceId: 'studio', now: WED(8, 5) },
    ] as const;
    const lunch = run([
      ...base,
      { type: 'fix', fix: at(500, WED(12, 30)) },
      { type: 'tick', now: WED(12, 40) },
      { type: 'fix', fix: at(40, WED(12, 44)) },
      { type: 'tick', now: WED(13, 30) },
    ]);
    expect(notifications(lunch.effects)).toHaveLength(0);

    const home = run([
      ...base,
      { type: 'fix', fix: at(60, WED(17, 29)) },
      { type: 'fix', fix: at(700, WED(17, 33)) },
      { type: 'tick', now: WED(17, 50) },
    ]);
    const n = notifications(home.effects);
    expect(n).toHaveLength(1);
    expect(n[0]).toMatchObject({ kind: 'departure', suggestedAt: WED(17, 29) });
  });

  it('withdraws a sent departure reminder when the user comes back', () => {
    const { effects } = run([
      { type: 'fix', fix: at(50, WED(8)) },
      { type: 'session', clockedIn: true, workplaceId: 'studio', now: WED(8, 5) },
      { type: 'fix', fix: at(700, WED(17)) },
      { type: 'tick', now: WED(17, 20) },
      { type: 'fix', fix: at(30, WED(17, 25)) },
    ]);
    expect(effects.filter((e) => e.type === 'cancelNotification' && e.kind === 'departure')).toHaveLength(1);
  });

  it('accepts OS region events when no fix is available', () => {
    const { effects } = run([
      { type: 'region', regionId: 'studio:fence', event: 'enter', timestamp: WED(8, 44) },
      { type: 'tick', now: WED(8, 50) },
    ]);
    expect(notifications(effects)[0]).toMatchObject({ kind: 'arrival', suggestedAt: WED(8, 44) });
  });
});

describe('OS regions', () => {
  it('registers fence, near and approach rings and respects the platform limit', () => {
    const many: Workplace[] = Array.from({ length: 8 }, (_, i) => ({ ...STUDIO, id: `w${i}`, lat: STUDIO.lat + i * 0.01 }));
    const state = step(initialState(), { type: 'fix', fix: at(0, WED(8)) }, { ...cfg, workplaces: many }).state;
    const regions = osRegions(state, { ...cfg, workplaces: many, maxRegions: 18 }, WED(8));
    expect(regions).toHaveLength(18);
    // every workplace keeps its fence; the farthest lose their approach rings first
    expect(regions.filter((r) => r.ring === 'fence')).toHaveLength(8);
    expect(regions.find((r) => r.id === 'w0:approach')).toBeDefined();
    expect(regions.find((r) => r.id === 'w7:approach')).toBeUndefined();
  });
});
