/**
 * Time and date values that open the platform's native picker: inline on iOS, a dialog on Android, text on web.
 * Native pickers work in the phone's zone, so values from another zone are shown as the same wall-clock time
 * there and converted back — a session recorded at 08:00 in Berlin is edited as 08:00, wherever the phone is.
 */
import { dateKeyOf, minutesOfDay, wallTime } from '@worktime/core';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, TextInput } from 'react-native';

import { deviceTimeZone } from '@/shared/lib/time-zone';
import { radius, type, useColors } from '@/shared/theme';
import { Text } from '@/shared/ui/components';
import { formatDayShort, formatTime, parseDateKey, setTimeOfDay, type DateKey } from '../dates';

interface FieldProps {
  text: string;
  /** Text shown in the web text input, and parsed back from it. */
  editText: string;
  parse: (s: string) => Date | undefined;
  pickerValue: Date;
  onPick: (d: Date) => void;
  mode: 'time' | 'date';
  changed?: boolean;
  maximumDate?: Date;
  label: string;
}

function Field({ text, editText, parse, pickerValue, onPick, mode, changed, maximumDate, label }: FieldProps) {
  const c = useColors();
  const [draft, setDraft] = useState<string>();

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={pickerValue}
        mode={mode}
        display="compact"
        accentColor={c.accent}
        maximumDate={maximumDate}
        accessibilityLabel={label}
        onValueChange={(_, d) => onPick(d)}
      />
    );
  }

  const chip = { backgroundColor: changed ? c['accent/soft'] : c['bg/sunken'], borderRadius: radius.m, borderCurve: 'continuous' } as const;

  if (Platform.OS === 'web') {
    // react-native-web has no onEndEditing: commit on blur and on Enter.
    const commit = () => {
      const d = draft === undefined ? undefined : parse(draft);
      if (d) onPick(d);
      setDraft(undefined);
    };
    return (
      <TextInput
        accessibilityLabel={label}
        value={draft ?? editText}
        onChangeText={setDraft}
        onBlur={commit}
        onSubmitEditing={commit}
        placeholder={mode === 'time' ? 'HH:MM' : 'YYYY-MM-DD'}
        placeholderTextColor={c['text/tertiary']}
        style={[type.numericSmall, chip, { color: changed ? c.accent : c['text/primary'], paddingHorizontal: 14, paddingVertical: 8, width: mode === 'time' ? 80 : 120, textAlign: 'center' }]}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${text}`}
      onPress={() => DateTimePickerAndroid.open({ value: pickerValue, mode, is24Hour: true, maximumDate, onValueChange: (_, d) => onPick(d) })}
      style={({ pressed }) => [chip, { paddingHorizontal: 14, paddingVertical: 8, opacity: pressed ? 0.7 : 1 }]}>
      <Text variant="numericSmall" color={changed ? 'accent' : 'text/primary'}>
        {text}
      </Text>
    </Pressable>
  );
}

/** A wall-clock time on the day of `value`, in `tz` (the zone of the session it belongs to). */
export function TimeField({ value, onChange, tz, changed, label }: { value: number; onChange: (ms: number) => void; tz: string; changed?: boolean; label: string }) {
  const device = deviceTimeZone();
  const text = formatTime(value, tz);
  const setMinutes = (minutes: number) => onChange(setTimeOfDay(value, Math.floor(minutes / 60), minutes % 60, tz));
  return (
    <Field
      mode="time"
      label={label}
      changed={changed}
      text={text}
      editText={text}
      pickerValue={new Date(wallTime(dateKeyOf(value, tz), minutesOfDay(value, tz), device))}
      onPick={(d) => setMinutes(minutesOfDay(d.getTime(), device))}
      parse={(s) => {
        const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
        if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return undefined;
        return new Date(wallTime(dateKeyOf(value, tz), Number(m[1]) * 60 + Number(m[2]), device));
      }}
    />
  );
}

/** A calendar day. */
export function DateField({ value, onChange, maximum, label }: { value: DateKey; onChange: (day: DateKey) => void; maximum?: DateKey; label: string }) {
  const device = deviceTimeZone();
  const noon = (key: DateKey) => new Date(wallTime(key, 12 * 60, device));
  return (
    <Field
      mode="date"
      label={label}
      text={formatDayShort(value)}
      editText={value}
      pickerValue={noon(value)}
      maximumDate={maximum ? noon(maximum) : undefined}
      onPick={(d) => {
        const day = dateKeyOf(d.getTime(), device);
        onChange(maximum && day > maximum ? maximum : day);
      }}
      parse={(s) => {
        const key = parseDateKey(s.trim());
        return key ? noon(key) : undefined;
      }}
    />
  );
}
