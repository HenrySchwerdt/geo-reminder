/** Insight widgets: the month's heat strip, the year's bars and the period stepper. */
import { formatDuration } from '@worktime/core';
import { Pressable, StyleSheet, View } from 'react-native';

import { useColors } from '@/shared/theme';
import { Icon, Row, Text } from '@/shared/ui/components';
import type { InsightDay, MonthBar } from './model';

const HOUR = 3_600_000;

/** "< Title (subtitle) >" with previous / next buttons; `next` is disabled at the present. */
export function Stepper({ title, subtitle, onPrev, onNext, nextDisabled, unit }: { title: string; subtitle?: string; onPrev: () => void; onNext: () => void; nextDisabled?: boolean; unit: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <RoundButton icon="back" label={`Previous ${unit}`} onPress={onPrev} />
      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text variant="headline">{title}</Text>
        {subtitle ? (
          <Text variant="subhead" color="text/secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <RoundButton icon="chevron" label={`Next ${unit}`} onPress={onNext} disabled={nextDisabled} />
    </Row>
  );
}

function RoundButton({ icon, label, onPress, disabled }: { icon: 'back' | 'chevron'; label: string; onPress: () => void; disabled?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c['bg/elevated'],
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: c.separator,
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}>
      <Icon name={icon} size={18} />
    </Pressable>
  );
}

/** One bar per workday: darker = closer to (or beyond) the target, red = no check-out, outlined = today. */
export function HeatStrip({ days }: { days: InsightDay[] }) {
  const c = useColors();
  const shown = days.filter((d) => d.state !== 'off');
  return (
    <View accessibilityRole="image" accessibilityLabel="Worked time per workday" style={{ flexDirection: 'row', gap: 3, height: 44 }}>
      {shown.map((d) => {
        const worked = d.state === 'worked';
        return (
          <View
            key={d.key}
            style={{
              flex: 1,
              borderRadius: 6,
              borderCurve: 'continuous',
              backgroundColor: d.state === 'missing' ? c.danger : worked ? c.accent : d.state === 'future' ? c['bg/sunken'] : c['bg/track'],
              opacity: worked ? 0.3 + 0.7 * Math.min(1, d.ratio) : 1,
              borderWidth: d.today ? 2 : 0,
              borderColor: c['text/primary'],
            }}
          />
        );
      })}
    </View>
  );
}

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/** Worked time per month (bar) against the month's target (tick). */
export function YearBars({ months, height = 140 }: { months: MonthBar[]; height?: number }) {
  const c = useColors();
  const max = Math.max(HOUR, ...months.flatMap((m) => [m.workedMs, m.targetMs])) * 1.1;
  return (
    <View>
      <View style={{ height, flexDirection: 'row', gap: 6, alignItems: 'flex-end' }} accessibilityRole="image" accessibilityLabel="Worked time per month against target">
        {months.map((m) => (
          <View
            key={m.month}
            accessibilityLabel={`${m.month.slice(0, 7)}: ${formatDuration(m.workedMs, true)} of ${formatDuration(m.targetMs, true)}`}
            style={{ flex: 1, height, borderRadius: 6, backgroundColor: c['bg/sunken'], justifyContent: 'flex-end', overflow: 'hidden' }}>
            {m.workedMs > 0 ? <View style={{ height: Math.max(4, (m.workedMs / max) * height), backgroundColor: c.accent, borderRadius: 6 }} /> : null}
            {m.targetMs > 0 ? (
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: (m.targetMs / max) * height, height: 2, backgroundColor: c['text/secondary'] }} />
            ) : null}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
        {months.map((m, i) => (
          <Text key={m.month} variant="caption" color="text/tertiary" style={{ flex: 1, textAlign: 'center' }}>
            {MONTHS[i]}
          </Text>
        ))}
      </View>
    </View>
  );
}
