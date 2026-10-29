/**
 * Domain schemas — the single source of truth for Worktime's data. Types are inferred from these
 * schemas, and everything that crosses a trust boundary (storage, import files, notification payloads)
 * is parsed with them.
 */
import { z } from 'zod';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM');

export const PrecisionProfileSchema = z.enum(['batterySaver', 'balanced', 'precise']);

export const ReminderRulesSchema = z.object({
  arrival: z.object({
    enabled: z.boolean(),
    /** Minutes the user must be inside before we ask (filters walking past, short visits). */
    delayMinutes: z.number().int().min(0).max(120),
    /** Only ask inside this local time window. */
    window: z.object({ from: hhmm, to: hhmm }).optional(),
  }),
  departure: z.object({
    enabled: z.boolean(),
    /** Minutes the user must be outside before we ask (filters lunch walks, GPS drift). */
    delayMinutes: z.number().int().min(0).max(240),
    /** Only ask when a session started here is running. */
    onlyWhenClockedIn: z.boolean(),
  }),
  /** ISO weekdays 1 (Mon) … 7 (Sun) on which reminders are active. Empty = every day. */
  days: z.array(z.number().int().min(1).max(7)),
});

export const WorkplaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** Geofence radius in metres. */
  radius: z.number().min(50).max(2_000),
  rules: ReminderRulesSchema,
  /** IANA zone of the workplace: reminder windows and weekdays are in its local time. Device zone when absent. */
  tz: z.string().optional(),
});

export const EventTypeSchema = z.enum(['clockIn', 'breakStart', 'breakEnd', 'clockOut']);
export const EventSourceSchema = z.enum(['app', 'notification', 'watch', 'widget', 'liveActivity', 'manual', 'geofence', 'import']);

/**
 * One fact in the append-only log. Corrections never change a stored event: an edit is a new event with
 * `supersedes` pointing at the one it replaces, a deletion is a `voids` marker. See `effectiveEvents`.
 */
export const TimeEventSchema = z.object({
  id: z.string().min(1),
  type: EventTypeSchema,
  /** Epoch milliseconds. */
  at: z.number().int().nonnegative(),
  workplaceId: z.string().optional(),
  source: EventSourceSchema,
  /** When the event was recorded (epoch ms) — differs from `at` for corrections and backdated entries. */
  recordedAt: z.number().int().nonnegative().optional(),
  /** Id of the event this one replaces (an edit). */
  supersedes: z.string().optional(),
  /** True for a tombstone that removes `supersedes` (a deletion). */
  voids: z.boolean().optional(),
  /**
   * IANA zone the event was recorded in. A session belongs to the calendar day of its clock-in in this zone and
   * is shown in it, wherever the phone is later. Absent on events from older versions: the device zone is used.
   */
  tz: z.string().optional(),
});

export const SettingsSchema = z.object({
  weeklyHours: z.number().min(1).max(80),
  workdays: z.array(z.number().int().min(1).max(7)),
  profile: PrecisionProfileSchema,
  onboarded: z.boolean(),
});

export const DEFAULT_SETTINGS: Settings = { weeklyHours: 40, workdays: [1, 2, 3, 4, 5], profile: 'balanced', onboarded: false };

/** The JSON export / backup file. Versioned so future imports can migrate. */
export const ExportFileSchema = z.object({
  format: z.literal('worktime-export'),
  version: z.literal(1),
  exportedAt: z.string(),
  timeZone: z.string(),
  settings: SettingsSchema,
  workplaces: z.array(WorkplaceSchema),
  events: z.array(TimeEventSchema),
});

export type PrecisionProfile = z.infer<typeof PrecisionProfileSchema>;
export type ReminderRules = z.infer<typeof ReminderRulesSchema>;
export type Workplace = z.infer<typeof WorkplaceSchema>;
export type EventType = z.infer<typeof EventTypeSchema>;
export type EventSource = z.infer<typeof EventSourceSchema>;
export type TimeEvent = z.infer<typeof TimeEventSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type ExportFile = z.infer<typeof ExportFileSchema>;
