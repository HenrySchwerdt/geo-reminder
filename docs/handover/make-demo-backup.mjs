#!/usr/bin/env node
/**
 * Writes a Worktime JSON backup with two weeks of realistic data around *today*, for testing on a simulator:
 * import it in the app under Settings → Your data → Import backup (turn on "Also restore settings").
 *
 *   node docs/handover/make-demo-backup.mjs > /tmp/worktime-demo.json
 *   then drag the file onto the simulator window and save it to Files (simctl addmedia only takes photos/videos)
 *
 * Contents (matches the sample persona in docs/product/requirements.md): 40 h/week, office Mon/Wed/Fri,
 * home Tue/Thu, one workplace (Studio Kreuzberg, Berlin). Past workdays have sessions with a lunch break,
 * one corrected check-out (shows in the day's history), one day without a check-out (calendar shows it red),
 * and today has a running session since 08:47 with a break. Times are in this machine's time zone.
 */
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const now = new Date();
const day = (offset, h, m) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, h, m).getTime();
let n = 0;
const id = () => `demo-${String(++n).padStart(4, '0')}`;
const events = [];
const add = (type, at, extra = {}) => {
  const e = { id: id(), type, at, source: 'app', recordedAt: at, tz, workplaceId: 'studio', ...extra };
  events.push(e);
  return e;
};

for (let offset = -14; offset < 0; offset++) {
  const weekday = new Date(day(offset, 12, 0)).getDay(); // 0 Sun … 6 Sat
  if (weekday === 0 || weekday === 6) continue;
  const home = weekday === 2 || weekday === 4;
  const extra = home ? { workplaceId: undefined, source: 'notification' } : { source: 'geofence' };
  const jitter = (offset * 7) % 20; // deterministic variety
  add('clockIn', day(offset, 8, 35 + (jitter % 15)), extra);
  add('breakStart', day(offset, 12, 20 + (jitter % 10)));
  add('breakEnd', day(offset, 12, 55 + (jitter % 5)));
  if (offset === -3) continue; // forgot to clock out: shows as "Needs attention"
  const out = add('clockOut', day(offset, 17, 5 + jitter), extra);
  if (offset === -6) add('clockOut', day(offset, 16, 50), { source: 'manual', supersedes: out.id, recordedAt: day(offset + 1, 9, 2) });
}

// Today: working since 08:47, lunch break 12:30–13:05 if it's already past that.
if (now.getHours() >= 9) {
  add('clockIn', day(0, 8, 47), { source: 'geofence' });
  if (now.getTime() > day(0, 13, 5)) {
    add('breakStart', day(0, 12, 30));
    add('breakEnd', day(0, 13, 5));
  }
}

for (const e of events) if (e.workplaceId === undefined) delete e.workplaceId;

const backup = {
  format: 'worktime-export',
  version: 1,
  exportedAt: now.toISOString(),
  timeZone: tz,
  settings: {
    weeklyHours: 40,
    workdays: [1, 2, 3, 4, 5],
    profile: 'balanced',
    onboarded: true,
    pattern: ['office', 'home', 'office', 'home', 'office', 'off', 'off'],
    breakRules: [
      { afterMinutes: 360, minBreakMinutes: 30 },
      { afterMinutes: 540, minBreakMinutes: 45 },
    ],
    reminders: { start: { enabled: true, at: '09:00' }, stop: { enabled: true, afterMinutes: 510, latest: '18:00' }, missingCheckOut: true },
    appearance: 'system',
    liveActivity: true,
  },
  workplaces: [
    {
      id: 'studio',
      name: 'Studio Kreuzberg',
      lat: 52.50166,
      lng: 13.41794,
      radius: 150,
      tz: 'Europe/Berlin',
      rules: {
        arrival: { enabled: true, delayMinutes: 5, window: { from: '06:00', to: '11:00' } },
        departure: { enabled: true, delayMinutes: 15, onlyWhenClockedIn: true },
        days: [1, 3, 5],
      },
    },
  ],
  events,
};

process.stdout.write(JSON.stringify(backup, null, 2) + '\n');
