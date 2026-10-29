/** Mon-first month grid; each day shows its hours and one of six states (see the Calendar Day component). */
import { Pressable, View } from 'react-native';

import { radius, space, useColors, type Palette } from '@/shared/theme';
import { Text } from '@/shared/ui/components';
import type { Cell, CellState, MonthModel } from '../calendar';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const LOOK: Record<CellState, { bg: keyof Palette | 'transparent'; fg: keyof Palette; sub: keyof Palette; border?: boolean }> = {
  default: { bg: 'bg/elevated', fg: 'text/primary', sub: 'text/primary' },
  today: { bg: 'text/primary', fg: 'bg/canvas', sub: 'bg/canvas' },
  selected: { bg: 'accent', fg: 'on-accent', sub: 'on-accent' },
  missing: { bg: 'danger/soft', fg: 'danger', sub: 'danger' },
  off: { bg: 'bg/sunken', fg: 'text/tertiary', sub: 'text/tertiary' },
  future: { bg: 'transparent', fg: 'text/tertiary', sub: 'text/tertiary', border: true },
};

function label(cell: Cell) {
  const parts = [`Day ${cell.day}`];
  if (cell.state === 'missing') parts.push('missing check-out');
  else if (cell.hours !== undefined) parts.push(`${cell.hours.toFixed(1)} hours worked`);
  if (cell.state === 'today') parts.push('today');
  return parts.join(', ');
}

function DayCell({ cell, onPress }: { cell: Cell; onPress: (key: string) => void }) {
  const c = useColors();
  const look = LOOK[cell.state];
  const sub = cell.state === 'missing' ? '!' : cell.hours !== undefined ? cell.hours.toFixed(1) : '–';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label(cell)}
      onPress={() => onPress(cell.key)}
      style={({ pressed }) => ({
        flex: 1,
        height: 54,
        borderRadius: radius.m,
        borderCurve: 'continuous',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: look.bg === 'transparent' ? undefined : c[look.bg],
        borderWidth: look.border ? 1 : 0,
        borderColor: c.separator,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text variant="numericMedium" color={look.fg}>
        {String(cell.day)}
      </Text>
      <Text variant="caption" color={look.sub} style={{ fontVariant: ['tabular-nums'], opacity: cell.hours === undefined && cell.state !== 'missing' ? 0.7 : 1 }}>
        {sub}
      </Text>
    </Pressable>
  );
}

export function MonthGrid({ month, onSelect }: { month: MonthModel; onSelect: (key: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} variant="subhead" color="text/secondary" style={{ flex: 1, textAlign: 'center' }}>
            {d}
          </Text>
        ))}
      </View>
      {month.weeks.map((week, w) => (
        <View key={w} style={{ flexDirection: 'row', gap: 6 }}>
          {week.map((cell, i) => (cell ? <DayCell key={cell.key} cell={cell} onPress={onSelect} /> : <View key={`pad-${i}`} style={{ flex: 1 }} />))}
        </View>
      ))}
    </View>
  );
}

export function Legend() {
  const c = useColors();
  const items: { label: string; color: string }[] = [
    { label: 'Logged', color: c.accent },
    { label: 'Needs attention', color: c.danger },
    { label: 'Day off', color: c['bg/track'] },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: space.l, flexWrap: 'wrap' }}>
      {items.map((i) => (
        <View key={i.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i.color }} />
          <Text variant="subhead" color="text/secondary">
            {i.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
