/**
 * Display model of the widgets, the Live Activity and the Android ongoing notification.
 *
 * Their layouts are serialized and evaluated in a separate JS runtime (see `layouts.ios.tsx`), so they cannot
 * import anything and must not compute much. Everything they show is therefore prepared here as plain JSON:
 * texts, timer anchors, progress, which buttons to offer and the colours (from the design tokens).
 */
import {
  clockTime,
  formatBalance,
  formatDuration,
  SurfaceActionSchema,
  type SurfaceAction,
  type SurfaceCommand,
  type SurfaceSnapshot,
} from '@worktime/core';
import tokens from '@worktime/design-tokens';

const HOUR = 3_600_000;

/** Name of the home screen / lock screen widget (iOS) and prefix of the Android ones. */
export const WIDGET_NAME = 'Worktime';
export const ANDROID_SMALL_WIDGET = 'WorktimeSmall';
export const ANDROID_MEDIUM_WIDGET = 'WorktimeMedium';
export const LIVE_ACTIVITY_NAME = 'WorktimeActivity';
export const NOTIFICATION_LAYOUT = 'WorktimeSession';
export const NOTIFICATION_ID = 'worktime.session';

/** iOS ends a Live Activity 8 h after it started; mark it stale a little earlier so it can say so. */
export const LIVE_ACTIVITY_LIMIT_MS = 8 * HOUR;
export const STALE_AFTER_MS = LIVE_ACTIVITY_LIMIT_MS - 30 * 60_000;
/** After clock-out the Live Activity stays visible this long with the day's total. */
export const DISMISS_AFTER_MS = 5 * 60_000;

const THEME_KEYS = ['bg/canvas', 'bg/elevated', 'bg/track', 'text/primary', 'text/secondary', 'text/tertiary', 'accent', 'accent/soft', 'on-accent', 'break', 'break/soft', 'danger'] as const;
export type ThemeColors = Record<(typeof THEME_KEYS)[number], string>;
export interface WidgetTheme {
  light: ThemeColors;
  dark: ThemeColors;
}

const colorsOf = (mode: 'light' | 'dark'): ThemeColors =>
  Object.fromEntries(THEME_KEYS.map((k) => [k, tokens.color[k][mode]])) as ThemeColors;

export const theme: WidgetTheme = { light: colorsOf('light'), dark: colorsOf('dark') };

export interface ActionView {
  action: SurfaceAction;
  label: string;
}

/** A tap recorded by a widget / notification while the app was not running; applied by the app later. */
export interface PendingTap {
  id: string;
  action: SurfaceAction;
  at: number;
}

/** Props of every layout. JSON-safe (no undefined, no Dates). */
export interface WorktimeView {
  state: SurfaceSnapshot['state'];
  /** "Working", "On break", "Clocked out", "Not working". */
  title: string;
  workplace?: string;
  workedMs: number;
  /** Worked time as of `updatedAt`, "5:50". */
  workedText: string;
  /** Count-up timer: worked time while working, break time during a break. Absent when off. */
  timer?: { kind: 'worked' | 'break'; start: number; end: number };
  /** Progress to today's target (0..1) as of `updatedAt`. */
  progress: number;
  /** While working with a target: a live progress interval (worked time vs target). */
  progressTimer?: { start: number; end: number };
  hasTarget: boolean;
  targetMs: number;
  /** Current state began at "08:47". */
  sinceText?: string;
  /** Clock-in time "08:47" and expected end "~17:22". */
  startText?: string;
  endText?: string;
  /** Epoch anchors for layouts that cannot run timers (Android): worked = now - workedAnchor. */
  workedAnchor?: number;
  breakStart?: number;
  weekText: string;
  weekTargetText: string;
  balanceText: string;
  balanceTone: 'positive' | 'negative' | 'neutral';
  /** The one button of the medium widget and the first Live Activity button. */
  primary: ActionView;
  /** The second Live Activity / notification button (clock out). */
  secondary?: ActionView;
  updatedAt: number;
  /** Live Activity: after this the system treats the content as out of date. */
  staleAt?: number;
  theme: WidgetTheme;
  pending?: PendingTap[];
}

const ACTIONS: Record<SurfaceAction, ActionView> = {
  clockIn: { action: 'clockIn', label: 'Clock in' },
  startBreak: { action: 'startBreak', label: 'Break' },
  endBreak: { action: 'endBreak', label: 'End break' },
  clockOut: { action: 'clockOut', label: 'Clock out' },
};

/** Which buttons a state offers: clock in when off; break (or end it) and clock out while a session runs. */
export function actionsFor(state: SurfaceSnapshot['state']): { primary: ActionView; secondary?: ActionView } {
  if (state === 'off') return { primary: ACTIONS.clockIn };
  return { primary: state === 'working' ? ACTIONS.startBreak : ACTIONS.endBreak, secondary: ACTIONS.clockOut };
}

/** "40h", "37.5h". */
export function hoursText(ms: number): string {
  const h = Math.round((ms / HOUR) * 10) / 10;
  return `${h}h`;
}

const titleOf = (s: SurfaceSnapshot) => (s.state === 'working' ? 'Working' : s.state === 'break' ? 'On break' : s.workedMs > 0 ? 'Clocked out' : 'Not working');

export function toView(s: SurfaceSnapshot, pending?: PendingTap[]): WorktimeView {
  const hasTarget = s.targetMs > 0;
  const working = s.state === 'working';
  const timer =
    working && s.workedAnchor !== undefined
      ? { kind: 'worked' as const, start: s.workedAnchor, end: s.workedAnchor + 24 * HOUR }
      : s.state === 'break' && s.since !== undefined
        ? { kind: 'break' as const, start: s.since, end: s.since + 12 * HOUR }
        : undefined;
  const view: WorktimeView = {
    state: s.state,
    title: titleOf(s),
    workplace: s.workplaceName,
    workedMs: s.workedMs,
    workedText: formatDuration(s.workedMs),
    timer,
    progress: hasTarget ? Math.min(1, s.workedMs / s.targetMs) : 0,
    progressTimer: working && hasTarget && s.workedAnchor !== undefined ? { start: s.workedAnchor, end: s.workedAnchor + s.targetMs } : undefined,
    hasTarget,
    targetMs: s.targetMs,
    sinceText: s.since !== undefined ? clockTime(s.since, s.tz) : undefined,
    startText: s.sessionStart !== undefined ? clockTime(s.sessionStart, s.tz) : undefined,
    endText: s.expectedEnd !== undefined ? `~${clockTime(s.expectedEnd, s.tz)}` : undefined,
    workedAnchor: working ? s.workedAnchor : undefined,
    breakStart: s.state === 'break' ? s.since : undefined,
    weekText: formatDuration(s.weekWorkedMs, true),
    weekTargetText: hoursText(s.weekTargetMs),
    balanceText: formatBalance(s.weekBalanceMs),
    balanceTone: s.weekBalanceMs > 0 ? 'positive' : s.weekBalanceMs < 0 ? 'negative' : 'neutral',
    ...actionsFor(s.state),
    updatedAt: s.updatedAt,
    theme,
    pending: pending?.length ? pending : undefined,
  };
  // Layout props travel as JSON through native code: drop the undefined fields.
  return JSON.parse(JSON.stringify(view)) as WorktimeView;
}

/** The Live Activity view: same content plus the system's stale date, counted from when the activity started. */
export const toActivityView = (s: SurfaceSnapshot, startedAt: number): WorktimeView => ({ ...toView(s), staleAt: startedAt + STALE_AFTER_MS });

/** When the system should treat the Live Activity as stale. */
export const staleDateFor = (startedAt: number) => new Date(startedAt + STALE_AFTER_MS);

/** Taps recorded by a layout (`pending` in its props) as commands; malformed entries are dropped. */
export function pendingCommands(props: unknown, source: SurfaceCommand['source']): SurfaceCommand[] {
  const list = (props as { pending?: unknown } | null | undefined)?.pending;
  if (!Array.isArray(list)) return [];
  return list.flatMap((p): SurfaceCommand[] => {
    const action = SurfaceActionSchema.safeParse(p?.action);
    if (!action.success || typeof p?.id !== 'string' || typeof p?.at !== 'number') return [];
    return [{ id: p.id, action: action.data, at: Math.round(p.at), source }];
  });
}

/** A button target reported by an interaction event, if it names an action. */
export const actionOfTarget = (target: unknown): SurfaceAction | undefined => {
  const parsed = SurfaceActionSchema.safeParse(target);
  return parsed.success ? parsed.data : undefined;
};
