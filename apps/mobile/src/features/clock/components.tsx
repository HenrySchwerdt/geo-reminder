/** Building blocks shared by the clock-in and clock-out sheets. */
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { TimeField } from '@/features/history/components/time-field';
import { radius, useColors } from '@/shared/theme';
import { Icon, Row, Text } from '@/shared/ui/components';
import type { IconName } from '@/shared/theme/icons';
import type { TimeChoice } from './model';

/** The sheet body: elevated like the sheet itself, scrolling when the content outgrows a small detent. */
export function SheetBody({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c['bg/elevated'] }} contentContainerStyle={{ padding: 20, paddingTop: 28, paddingBottom: 36, gap: 16 }} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function SheetHeader({ icon, title, subtitle }: { icon?: IconName; title: string; subtitle?: string }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      {icon ? (
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c['accent/soft'], alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
          <Icon name={icon} size={26} color="accent" />
        </View>
      ) : null}
      <Text variant="title2" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="callout" color="text/secondary" style={{ textAlign: 'center' }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export interface Tile {
  id: TimeChoice;
  /** "08:44", or "…" for the other-time tile until a time is picked. */
  time: string;
  label: string;
}

/** Which time to use: the tiles of the design ("Arrived 08:44", "Now 08:47", "Other …"). */
export function TimeTiles({ tiles, value, onChange, tone }: { tiles: Tile[]; value: TimeChoice; onChange: (v: TimeChoice) => void; tone: 'accent' | 'ink' }) {
  const c = useColors();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
      {tiles.map((t) => {
        const on = t.id === value;
        const bg = on ? (tone === 'accent' ? c.accent : c['text/primary']) : c['bg/sunken'];
        const fg = on ? (tone === 'accent' ? 'on-accent' : 'bg/canvas') : 'text/primary';
        return (
          <Pressable
            key={t.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${t.label} ${t.time}`}
            onPress={() => onChange(t.id)}
            style={({ pressed }) => ({ flex: 1, height: 62, borderRadius: radius.l, borderCurve: 'continuous', backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
            <Text variant="numericMedium" color={fg}>
              {t.time}
            </Text>
            <Text variant="caption" color={fg}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * State of a time picker: the chosen tile and, for "Other", the time picked in the field.
 * `at(now)` is the instant to record: "Now" is read when confirming, not when it was displayed.
 */
export function useTimeChoice(suggestedAt: number | undefined) {
  const [choice, setChoice] = useState<TimeChoice>(suggestedAt !== undefined ? 'suggested' : 'now');
  const [custom, setCustom] = useState<number>();
  return {
    choice,
    custom,
    select: (next: TimeChoice, now: number) => {
      // The first time "Other" opens, it starts from the current minute.
      if (next === 'other' && custom === undefined) setCustom(now - (now % 60_000));
      setChoice(next);
    },
    setCustom,
    at: (now: number) => (choice === 'suggested' ? (suggestedAt ?? now) : choice === 'other' ? (custom ?? now) : now),
  };
}

/** The field shown under the tiles while "Other" is selected. */
export function OtherTime({ value, onChange, tz, label }: { value: number; onChange: (ms: number) => void; tz: string; label: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Text variant="body">{label}</Text>
      <TimeField value={value} onChange={onChange} tz={tz} label={label} changed />
    </Row>
  );
}
