import { wallTime, type SurfaceSnapshot } from '@worktime/core';
import { isValidElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { actionOfTarget, actionsFor, hoursText, pendingCommands, STALE_AFTER_MS, staleDateFor, toActivityView, toView } from '@/features/surfaces/widgets/model';

// The layouts are written against SwiftUI / Compose components that only exist natively: stand-ins that keep
// their props let the tests inspect what each layout would render.
vi.mock('@expo/ui/swift-ui', () => {
  const c = (name: string) => Object.assign(() => null, { displayName: name });
  return Object.fromEntries(['Button', 'Gauge', 'HStack', 'Image', 'ProgressView', 'Spacer', 'Text', 'VStack'].map((n) => [n, c(n)]));
});
vi.mock('@expo/ui/swift-ui/modifiers', () => {
  const m = (name: string) => (...args: unknown[]) => ({ name, args });
  const shapes = { capsule: () => ({ shape: 'capsule' }) };
  return {
    shapes,
    ...Object.fromEntries(
      ['activityBackgroundTint', 'background', 'buttonStyle', 'containerBackground', 'font', 'foregroundStyle', 'frame', 'gaugeStyle', 'labelsHidden', 'minimumScaleFactor', 'monospacedDigit', 'padding', 'progressViewStyle', 'tint'].map((n) => [n, m(n)]),
    ),
  };
});
vi.mock('@expo/ui/jetpack-compose', () => {
  const c = (name: string) => Object.assign(() => null, { displayName: name });
  return Object.fromEntries(['Column', 'FilledTonalButton', 'LinearProgressIndicator', 'Row', 'Spacer', 'Text', 'TextButton'].map((n) => [n, c(n)]));
});
vi.mock('@expo/ui/jetpack-compose/modifiers', () => {
  const m = (name: string) => (...args: unknown[]) => ({ name, args });
  return Object.fromEntries(['background', 'cornerRadius', 'fillMaxSize', 'fillMaxWidth', 'height', 'paddingAll', 'width'].map((n) => [n, m(n)]));
});

const { WorktimeActivity, WorktimeWidget } = await import('@/features/surfaces/widgets/ios-layouts');
const { WorktimeMediumWidget, WorktimeNotification, WorktimeSmallWidget } = await import('@/features/surfaces/widgets/android-layouts');

const TZ = 'Europe/Berlin';
const at = (h: number, m = 0) => wallTime('2025-10-16', h * 60 + m, TZ);
const NOW = at(15, 12);

const base: SurfaceSnapshot = {
  version: 1,
  state: 'working',
  day: '2025-10-16',
  workedMs: 5 * 3_600_000 + 50 * 60_000,
  breakMs: 45 * 60_000,
  workedAnchor: NOW - (5 * 3_600_000 + 50 * 60_000),
  since: at(13),
  sessionStart: at(8, 47),
  targetMs: 8 * 3_600_000,
  expectedEnd: at(17, 22),
  workplaceName: 'Studio Kreuzberg',
  weekWorkedMs: 30 * 3_600_000 + 41 * 60_000,
  weekTargetMs: 40 * 3_600_000,
  weekBalanceMs: 6 * 3_600_000 + 20 * 60_000,
  tz: TZ,
  updatedAt: NOW,
};
const onBreak: SurfaceSnapshot = { ...base, state: 'break', workedAnchor: undefined, since: NOW - 12 * 60_000, expectedEnd: at(17, 40) };
const off: SurfaceSnapshot = { ...base, state: 'off', workedAnchor: undefined, since: undefined, sessionStart: undefined, expectedEnd: undefined, workplaceName: undefined };

describe('view model', () => {
  it('anchors a live timer and the target progress at the worked-time anchor while working', () => {
    const v = toView(base);
    expect(v.title).toBe('Working');
    expect(v.workedText).toBe('5:50');
    expect(v.timer).toMatchObject({ kind: 'worked', start: base.workedAnchor });
    expect(v.progressTimer).toEqual({ start: base.workedAnchor, end: base.workedAnchor! + base.targetMs });
    expect(v.sinceText).toBe('13:00');
    expect(v.startText).toBe('08:47');
    expect(v.endText).toBe('~17:22');
    expect(v.weekText).toBe('30h 41m');
    expect(v.weekTargetText).toBe('40h');
    expect(v.balanceText).toBe('+6h 20m');
    expect(v.balanceTone).toBe('positive');
  });

  it('counts the break while on break and keeps the worked time static', () => {
    const v = toView(onBreak);
    expect(v.title).toBe('On break');
    expect(v.timer).toMatchObject({ kind: 'break', start: onBreak.since });
    expect(v.progressTimer).toBeUndefined();
    expect(v.workedText).toBe('5:50');
    expect(v.breakStart).toBe(onBreak.since);
  });

  it('shows no timer when off and says whether anything was worked', () => {
    expect(toView(off).timer).toBeUndefined();
    expect(toView(off).title).toBe('Clocked out');
    expect(toView({ ...off, workedMs: 0 }).title).toBe('Not working');
    expect(toView({ ...off, targetMs: 0 }).hasTarget).toBe(false);
  });

  it('is plain JSON', () => {
    const v = toView(off);
    expect(JSON.parse(JSON.stringify(v))).toEqual(v);
    expect('timer' in v).toBe(false);
  });

  it('offers the right buttons per state', () => {
    expect(actionsFor('off')).toEqual({ primary: { action: 'clockIn', label: 'Clock in' } });
    expect(actionsFor('working')).toEqual({ primary: { action: 'startBreak', label: 'Break' }, secondary: { action: 'clockOut', label: 'Clock out' } });
    expect(actionsFor('break').primary).toEqual({ action: 'endBreak', label: 'End break' });
  });

  it('marks the Live Activity stale before the 8 hour system limit', () => {
    expect(STALE_AFTER_MS).toBeLessThan(8 * 3_600_000);
    expect(staleDateFor(1000).getTime()).toBe(1000 + STALE_AFTER_MS);
    expect(toActivityView(base, 5000).staleAt).toBe(5000 + STALE_AFTER_MS);
  });

  it('formats target hours', () => {
    expect(hoursText(40 * 3_600_000)).toBe('40h');
    expect(hoursText(37.5 * 3_600_000)).toBe('37.5h');
  });

  it('turns recorded taps into widget commands and drops malformed ones', () => {
    const props = { pending: [{ id: 'a', action: 'clockOut', at: 5 }, { id: 'b', action: 'nope', at: 5 }, { action: 'clockIn', at: 5 }, { id: 'c', action: 'startBreak', at: '5' }, null] };
    expect(pendingCommands(props, 'widget')).toEqual([{ id: 'a', action: 'clockOut', at: 5, source: 'widget' }]);
    expect(pendingCommands(undefined, 'widget')).toEqual([]);
    expect(pendingCommands({ pending: 'x' }, 'widget')).toEqual([]);
  });

  it('maps button targets to actions', () => {
    expect(actionOfTarget('startBreak')).toBe('startBreak');
    expect(actionOfTarget('button-0')).toBeUndefined();
  });
});

// --- layouts ---------------------------------------------------------------------------------------------

interface Found {
  type: string;
  props: Record<string, any>;
}

/** Flattens a rendered tree (resolving the layouts' inner components) into its elements. */
function elements(node: unknown): Found[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement(node)) return [];
  let current: any = node;
  while (typeof current.type === 'function' && !current.type.displayName) current = current.type(current.props);
  if (!isValidElement(current)) return elements(current);
  const el = current as { type: any; props: Record<string, any> };
  return [{ type: el.type.displayName ?? String(el.type), props: el.props }, ...elements(el.props.children)];
}

const textOf = (node: unknown) => elements(node).flatMap((e) => (e.type === 'Text' ? [String(e.props.children ?? '')] : []));
const buttons = (node: unknown) => elements(node).filter((e) => e.type.endsWith('Button'));
const section = (node: unknown) => node as Record<string, ReactNode>;

const iosEnv = (widgetFamily: string, colorScheme = 'light') => ({ widgetFamily, colorScheme, configuration: undefined }) as any;
const render = (family: string, snap: SurfaceSnapshot, extra: object = {}) => WorktimeWidget({ ...toView(snap), ...extra }, iosEnv(family));

afterEach(() => vi.useRealTimers());

describe('iOS widget layout', () => {
  it('small: counts up from the anchor and shows progress, without buttons', () => {
    const tree = render('systemSmall', base);
    const timer = elements(tree).find((e) => e.type === 'Text' && e.props.timerInterval);
    expect(timer?.props.timerInterval.lower.getTime()).toBe(base.workedAnchor);
    expect(timer?.props.countsDown).toBe(false);
    const bar = elements(tree).find((e) => e.type === 'ProgressView');
    expect(bar?.props.timerInterval.upper.getTime()).toBe(base.workedAnchor! + base.targetMs);
    expect(buttons(tree)).toHaveLength(0);
    expect(textOf(tree)).toContain('Working');
    expect(textOf(tree)).toContain('~17:22');
  });

  it('small: shows a static time when off and a break timer on break', () => {
    expect(elements(render('systemSmall', off)).some((e) => e.props.timerInterval)).toBe(false);
    expect(textOf(render('systemSmall', off))).toContain('5:50');
    const brk = elements(render('systemSmall', onBreak)).find((e) => e.props.timerInterval);
    expect(brk?.props.timerInterval.lower.getTime()).toBe(onBreak.since);
  });

  it('medium: one action button per state, named by its action', () => {
    expect(buttons(render('systemMedium', off)).map((b) => b.props.target)).toEqual(['clockIn']);
    expect(buttons(render('systemMedium', base)).map((b) => b.props.target)).toEqual(['startBreak']);
    expect(buttons(render('systemMedium', onBreak)).map((b) => b.props.target)).toEqual(['endBreak']);
    expect(textOf(render('systemMedium', base))).toContain('30h 41m');
  });

  it('medium: a tap records a pending command with a uuid and the tap time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(123_456_789);
    const [button] = buttons(render('systemMedium', base));
    const patch = button.props.onPress();
    expect(patch.pending).toHaveLength(1);
    expect(patch.pending[0]).toMatchObject({ action: 'startBreak', at: 123_456_789 });
    expect(patch.pending[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(pendingCommands(patch, 'widget')).toEqual([{ ...patch.pending[0], source: 'widget' }]);
  });

  it('medium: shows a queued tap instead of the button and refuses a second tap', () => {
    const queued = { pending: [{ id: 'x', action: 'startBreak', at: 1 }] };
    const tree = render('systemMedium', base, queued);
    expect(buttons(tree)).toHaveLength(0);
    expect(textOf(tree).join(' ')).toContain('queued');
  });

  it('lock screen: circular gauge, rectangular and inline', () => {
    const circular = elements(render('accessoryCircular', base));
    expect(circular[0].type).toBe('ProgressView');
    expect(circular[0].props.timerInterval).toBeDefined();
    expect(elements(render('accessoryCircular', off))[0].type).toBe('Gauge');
    expect(textOf(render('accessoryRectangular', base))).toEqual(expect.arrayContaining(['Working · Studio Kreuzberg', 'ends ~17:22']));
    expect(textOf(render('accessoryInline', off))).toEqual(['Clocked out 5:50']);
    expect(elements(render('accessoryInline', base)).some((e) => e.props.timerInterval)).toBe(true);
  });

  it('uses the dark palette in dark mode', () => {
    const v = toView(base);
    const dark = elements(WorktimeWidget(v, iosEnv('systemSmall', 'dark')));
    const light = elements(WorktimeWidget(v, iosEnv('systemSmall', 'light')));
    expect(JSON.stringify(dark)).toContain(v.theme.dark['text/primary']);
    expect(JSON.stringify(light)).toContain(v.theme.light['text/primary']);
  });
});

describe('Live Activity layout', () => {
  const env = (extra: object = {}) => ({ colorScheme: 'dark', ...extra }) as any;

  it('banner: workplace, times and Break / Clock out buttons while working', () => {
    const layout = section(WorktimeActivity(toActivityView(base, NOW), env()));
    expect(buttons(layout.banner).map((b) => b.props.target)).toEqual(['startBreak', 'clockOut']);
    expect(textOf(layout.banner)).toEqual(expect.arrayContaining(['Working · Studio Kreuzberg', 'Break', 'Clock out']));
    expect(textOf(layout.banner).join(' ')).toContain('since 13:00 · ends ~17:22');
  });

  it('banner: End break and Clock out on break', () => {
    const layout = section(WorktimeActivity(toActivityView(onBreak, NOW), env()));
    expect(buttons(layout.banner).map((b) => b.props.target)).toEqual(['endBreak', 'clockOut']);
    expect(textOf(layout.banner).join(' ')).toContain('worked 5:50');
  });

  it('has compact, minimal and expanded regions with the live timer', () => {
    const layout = section(WorktimeActivity(toActivityView(base, NOW), env()));
    for (const key of ['compactLeading', 'compactTrailing', 'minimal', 'expandedLeading', 'expandedTrailing', 'expandedBottom']) expect(layout[key]).toBeTruthy();
    expect(elements(layout.compactTrailing)[0].props.timerInterval.lower.getTime()).toBe(base.workedAnchor);
    expect(buttons(layout.expandedBottom).map((b) => b.props.target)).toEqual(['startBreak', 'clockOut']);
    expect(textOf(layout.expandedLeading)).toEqual(['Studio Kreuzberg']);
  });

  it('final content after clock-out has no buttons', () => {
    const layout = section(WorktimeActivity(toActivityView(off, NOW), env()));
    expect(buttons(layout.banner)).toHaveLength(0);
    expect(textOf(layout.banner)).toContain('Clocked out');
  });

  it('asks to open the app once stale', () => {
    const layout = section(WorktimeActivity(toActivityView(base, NOW), env({ isStale: true })));
    expect(textOf(layout.banner)).toContain('Open Worktime to refresh');
  });
});

describe('Android layouts', () => {
  const env = { colorScheme: 'light' } as any;

  it('small widget computes the worked time at render time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW + 10 * 60_000);
    const view = toView(base);
    expect(textOf(WorktimeSmallWidget(view, env))).toEqual(expect.arrayContaining(['Working', '6:00', 'since 13:00']));
    // …and the break timer on break
    vi.setSystemTime(onBreak.updatedAt + 5 * 60_000);
    expect(textOf(WorktimeSmallWidget(toView(onBreak), env))).toEqual(expect.arrayContaining(['On break', '0:17']));
  });

  it('medium widget has the one action button, named by its action', () => {
    expect(buttons(WorktimeMediumWidget(toView(off), env)).map((b) => b.props.target)).toEqual(['clockIn']);
    expect(buttons(WorktimeMediumWidget(toView(base), env)).map((b) => b.props.target)).toEqual(['startBreak']);
    expect(textOf(WorktimeMediumWidget(toView(base), env))).toEqual(expect.arrayContaining(['This week', '30h 41m']));
  });

  it('notification: Break and Clock out buttons that record the tap', () => {
    const view = toView(base);
    const { collapsed, expanded } = WorktimeNotification(view, env) as { collapsed: ReactNode; expanded: ReactNode };
    expect(expanded).toBe(collapsed);
    const found = buttons(collapsed);
    expect(found.map((b) => b.props.target)).toEqual(['startBreak', 'clockOut']);
    const patch = found[1].props.onClick();
    expect(patch.pending[0]).toMatchObject({ action: 'clockOut' });
    expect(textOf(collapsed)).toEqual(expect.arrayContaining(['Working · Studio Kreuzberg', 'since 13:00 · ends ~17:22', 'BREAK', 'CLOCK OUT']));
  });

  it('notification: shows a queued tap instead of buttons', () => {
    const { collapsed } = WorktimeNotification({ ...toView(base), pending: [{ id: 'x', action: 'clockOut', at: 1 }] }, env) as { collapsed: ReactNode };
    expect(buttons(collapsed)).toHaveLength(0);
    expect(textOf(collapsed).join(' ')).toContain('Queued');
  });
});
