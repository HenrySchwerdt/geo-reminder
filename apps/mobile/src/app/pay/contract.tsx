import { salaryBasis, zonedParts } from '@worktime/core';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Button as NativeButton, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';

import { money, parseContract } from '@/features/pay/model';
import { useSettings } from '@/features/settings/store';
import { useNow } from '@/shared/hooks/use-now';
import { deviceTimeZone } from '@/shared/lib/time-zone';
import { useColors } from '@/shared/theme';
import { Button, Card, Chips, Screen, Text } from '@/shared/ui/components';

const CONTRACT_ERROR = 'Enter a positive salary, 1–80 weekly hours and whole vacation days below the number of scheduled workdays. Set at least one working day in Working hours.';

export default function Contract() {
  const c = useColors();
  const settings = useSettings();
  const [annual, setAnnual] = useState(settings.salary ? String(settings.salary.annualGrossCents / 100) : '');
  const [weekly, setWeekly] = useState(String(settings.weeklyHours));
  const [vacation, setVacation] = useState(settings.salary ? String(settings.salary.paidVacationDays) : '');
  const [currency, setCurrency] = useState(settings.salary?.currency ?? 'EUR');
  const [submitted, setSubmitted] = useState(false);
  const contract = parseContract(annual, weekly, vacation, currency);
  const now = useNow(60_000);
  const year = zonedParts(now, deviceTimeZone()).year;
  const basis = contract && salaryBasis({ ...settings, ...contract }, year);
  const save = () => {
    setSubmitted(true);
    if (!contract || !basis) {
      Alert.alert('Check contract details', CONTRACT_ERROR);
      return;
    }
    settings.update(contract);
    router.back();
  };
  const field = (label: string, value: string, onChangeText: (s: string) => void, hint: string, integer = false) => (
    <View style={{ gap: 6 }}>
      <Text variant="headline">{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} keyboardType={integer ? 'number-pad' : 'decimal-pad'}
        placeholder={integer ? '30' : label === 'Annual gross salary' ? '60000' : '40'} placeholderTextColor={c['text/tertiary']}
        selectTextOnFocus style={{ fontSize: 24, fontVariant: ['tabular-nums'], color: c['text/primary'], backgroundColor: c['bg/sunken'], borderRadius: 14, minHeight: 56, padding: 14 }} />
      <Text variant="footnote" color="text/secondary">{hint}</Text>
    </View>
  );
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <Stack.Screen options={{ headerLeft: () => <NativeButton title="Cancel" color={c.accent} onPress={() => router.back()} />, headerRight: () => <NativeButton title="Save" color={c.accent} onPress={save} /> }} />
      <Screen>
        <Text variant="title1">Your salary contract</Text>
        <Text color="text/secondary">See what your working time is worth, before tax.</Text>
        <Card style={{ gap: 24 }}>
          {field('Annual gross salary', annual, setAnnual, 'Full annual amount, before tax. Enter without thousands separators.')}
          <Chips options={['EUR', 'GBP', 'USD', 'CHF'] as const} value={currency} onChange={setCurrency} />
          {field('Hours per week', weekly, setWeekly, '1–80 hours. This also updates your working-time target.')}
          {field('Paid vacation days', vacation, setVacation, 'Working days off per year, excluding public holidays.', true)}
        </Card>
        {basis && contract ? <Card tone="accent"><Text variant="footnote" color="text/secondary">Effective gross hourly rate · {year}</Text><Text variant="title1">{money(basis.hourlyCents, currency)} / h</Text><Text variant="footnote" color="text/secondary">{basis.annualHours.toLocaleString(undefined, { maximumFractionDigits: 1 })} planned working hours after vacation.</Text></Card> : null}
        {submitted && (!contract || !basis) ? <Text color="danger">{CONTRACT_ERROR}</Text> : null}
        <Button label="Save contract" onPress={save} />
        <Text variant="footnote" color="text/secondary">Uses your current weekly pattern for the whole year. Public holidays, bonuses and contract changes during the year are not included.</Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}
