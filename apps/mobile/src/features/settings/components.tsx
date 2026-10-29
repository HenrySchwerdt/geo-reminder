/** Small inputs shared by the settings screens. */
import { minutesOfDay } from '@worktime/core';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TimeField } from '@/features/history/components/time-field';
import { radius, space, useColors } from '@/shared/theme';
import { Text } from '@/shared/ui/components';
import { hhmmFromMinutes, minutesFromHhmm } from './format';

/** A row of a settings group with a control on the right (ListRow is for rows that navigate or toggle). */
export function ControlRow({ title, subtitle, children, last }: { title: string; subtitle?: string; children: ReactNode; last?: boolean }) {
  const c = useColors();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m, paddingHorizontal: space.l, minHeight: 56 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="body">{title}</Text>
          {subtitle ? (
            <Text variant="footnote" color="text/secondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </View>
      {last ? null : <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.separator, marginLeft: space.l }} />}
    </View>
  );
}

/** Minus / value / plus, clamped to `min`…`max`. */
export function Stepper({
  value,
  onChange,
  step,
  min,
  max,
  format,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  format: (v: number) => string;
  label: string;
}) {
  const c = useColors();
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  const button = (sign: -1 | 1, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sign < 0 ? 'Decrease' : 'Increase'} ${label}`}
      disabled={disabled}
      onPress={() => set(value + sign * step)}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: radius.m,
        borderCurve: 'continuous',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c['bg/sunken'],
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}>
      <Text variant="title3">{sign < 0 ? '−' : '+'}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
      {button(-1, value <= min)}
      <Text variant="numericMedium" style={{ minWidth: 92, textAlign: 'center' }}>
        {format(value)}
      </Text>
      {button(1, value >= max)}
    </View>
  );
}

/** A time of day ("08:30") picked with the platform's time picker. */
export function ClockField({ value, onChange, label }: { value: string; onChange: (hhmm: string) => void; label: string }) {
  // The picker edits an instant on a fixed day; in UTC its wall-clock time is exactly the time of day.
  const minutes = minutesFromHhmm(value);
  return <TimeField label={label} tz="UTC" value={Date.UTC(2000, 0, 3, 0, minutes)} onChange={(ms) => onChange(hhmmFromMinutes(minutesOfDay(ms, 'UTC')))} />;
}

/** One choice out of a few, as equal-width pills. */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  const c = useColors();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c['text/primary'] : c['bg/sunken'] }}>
            <Text variant="footnoteStrong" color={on ? 'bg/canvas' : 'text/secondary'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
