/** The day ribbon (signature timeline) and the weekly bars. */
import type { Segment } from '@worktime/core';
import { useState } from 'react';
import { View } from 'react-native';

import { useColors } from '@/shared/theme';
import { Text } from './components';

const HOUR = 3_600_000;

export function DayRibbon({
  dayStart,
  segments,
  now,
  plannedEnd,
  from = 6,
  to = 20,
  height = 12,
  labels = true,
}: {
  dayStart: number;
  segments: Segment[];
  now?: number;
  plannedEnd?: number;
  from?: number;
  to?: number;
  height?: number;
  labels?: boolean;
}) {
  const c = useColors();
  const [w, setW] = useState(0);
  const x = (t: number) => Math.min(w, Math.max(0, ((t - dayStart) / HOUR - from) / (to - from) * w));
  const ticks = [6, 9, 12, 15, 18].filter((h) => h >= from && h <= to);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="image" accessibilityLabel="Timeline of today">
      <View style={{ height, borderRadius: height / 2, backgroundColor: c['bg/track'], overflow: 'hidden' }}>
        {now && plannedEnd && plannedEnd > now ? (
          <View style={{ position: 'absolute', left: x(now), width: x(plannedEnd) - x(now), top: 0, bottom: 0, backgroundColor: c['accent/soft'] }} />
        ) : null}
        {w > 0 &&
          segments.map((s) => (
            <View
              key={`${s.from}-${s.kind}`}
              style={{
                position: 'absolute',
                left: x(s.from),
                width: Math.max(3, x(s.to) - x(s.from)),
                top: 0,
                bottom: 0,
                borderRadius: height / 2,
                backgroundColor: s.kind === 'break' ? c.break : c.accent,
              }}
            />
          ))}
      </View>
      {now && w > 0 ? (
        <View style={{ position: 'absolute', left: x(now) - 1, top: -4, width: 2, height: height + 8, borderRadius: 1, backgroundColor: c['text/primary'] }} />
      ) : null}
      {labels && w > 0 ? (
        <View style={{ height: 22 }}>
          {ticks.map((h) => (
            <Text key={h} variant="caption" color="text/tertiary" style={{ position: 'absolute', top: 6, left: Math.max(0, Math.min(w - 16, ((h - from) / (to - from)) * w - 7)) }}>
              {String(h).padStart(2, '0')}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function WeekBars({ days, targetHours, height = 72 }: { days: { label: string; hours: number; today?: boolean }[]; targetHours: number; height?: number }) {
  const c = useColors();
  // A new account with no scheduled hours still needs finite native layout values.
  const max = Math.max(targetHours * 1.25, ...days.map((d) => d.hours)) || 1;
  return (
    <View>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View
          style={{ position: 'absolute', left: 0, right: 0, bottom: (targetHours / max) * height, borderTopWidth: 1, borderStyle: 'dashed', borderColor: c['text/secondary'] }}
        />
        {days.map((d, i) => (
          <View key={i} style={{ width: 28, height, borderRadius: 8, backgroundColor: c['bg/sunken'], justifyContent: 'flex-end', overflow: 'hidden' }}>
            {d.hours > 0 ? (
              <View style={{ height: Math.max(6, (d.hours / max) * height), borderRadius: 8, backgroundColor: c.accent, opacity: d.today ? 0.55 : 1 }} />
            ) : null}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        {days.map((d, i) => (
          <Text key={i} variant="caption" color={d.today ? 'text/primary' : 'text/tertiary'} style={{ width: 28, textAlign: 'center' }}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
