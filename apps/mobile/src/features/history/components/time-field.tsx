/** A time (or date) value that opens the platform's native picker: inline on iOS, a dialog on Android, text on web. */
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, TextInput } from 'react-native';

import { radius, type, useColors } from '@/shared/theme';
import { Text } from '@/shared/ui/components';
import { formatDayShort, formatTime, parseDateKey, setTimeOfDay, toDateKey } from '../dates';

interface Props {
  value: number;
  onChange: (ms: number) => void;
  mode?: 'time' | 'date';
  /** Highlights a value that differs from what is stored. */
  changed?: boolean;
  maximumDate?: Date;
  label: string;
}

export function TimeField({ value, onChange, mode = 'time', changed, maximumDate, label }: Props) {
  const c = useColors();
  const [draft, setDraft] = useState<string>();
  const text = mode === 'time' ? formatTime(value) : formatDayShort(value);
  const apply = (d: Date) => onChange(mode === 'time' ? setTimeOfDay(value, d.getHours(), d.getMinutes()) : d.getTime());

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={new Date(value)}
        mode={mode}
        display="compact"
        accentColor={c.accent}
        maximumDate={maximumDate}
        accessibilityLabel={label}
        onValueChange={(_, d) => apply(d)}
      />
    );
  }

  const chip = { backgroundColor: changed ? c['accent/soft'] : c['bg/sunken'], borderRadius: radius.m, borderCurve: 'continuous' } as const;

  if (Platform.OS === 'web') {
    const parse = (s: string) => {
      if (mode === 'date') return parseDateKey(s);
      const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
      return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? setTimeOfDay(value, Number(m[1]), Number(m[2])) : undefined;
    };
    return (
      <TextInput
        accessibilityLabel={label}
        value={draft ?? (mode === 'time' ? text : toDateKey(value))}
        onChangeText={setDraft}
        onEndEditing={() => {
          const ms = draft === undefined ? undefined : parse(draft);
          if (ms !== undefined) onChange(ms);
          setDraft(undefined);
        }}
        placeholder={mode === 'time' ? 'HH:MM' : 'YYYY-MM-DD'}
        placeholderTextColor={c['text/tertiary']}
        style={[type.numericSmall, chip, { color: changed ? c.accent : c['text/primary'], paddingHorizontal: 14, paddingVertical: 8, minWidth: 80, textAlign: 'center' }]}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${text}`}
      onPress={() =>
        DateTimePickerAndroid.open({ value: new Date(value), mode, is24Hour: true, maximumDate, onValueChange: (_, d) => apply(d) })
      }
      style={({ pressed }) => [chip, { paddingHorizontal: 14, paddingVertical: 8, opacity: pressed ? 0.7 : 1 }]}>
      <Text variant="numericSmall" color={changed ? 'accent' : 'text/primary'}>
        {text}
      </Text>
    </Pressable>
  );
}
