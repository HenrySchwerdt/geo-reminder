import type { Workplace } from '@worktime/core';
import * as Location from 'expo-location';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { resync } from '@/features/geofencing/runner';
import { requestAlwaysLocation } from '@/features/geofencing/permissions';
import { useWorkplaces } from '@/features/workplaces/store';
import { newId } from '@/shared/lib/id';
import { deviceTimeZone } from '@/shared/lib/time-zone';
import { useColors } from '@/shared/theme';
import { Button, Card, Chips, Group, Row, Screen, SectionHeader, Text, ToggleRow } from '@/shared/ui/components';

const WINDOWS = { any: undefined, morning: { from: '06:00', to: '11:00' }, day: { from: '06:00', to: '14:00' } } as const;
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const blank = (): Workplace => ({
  id: newId(),
  name: '',
  lat: 0,
  lng: 0,
  radius: 150,
  tz: deviceTimeZone(),
  rules: {
    arrival: { enabled: true, delayMinutes: 5, window: { ...WINDOWS.morning } },
    departure: { enabled: true, delayMinutes: 15, onlyWhenClockedIn: true },
    days: [1, 2, 3, 4, 5],
  },
});

export default function WorkplaceEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const existing = useWorkplaces((s) => s.workplaces.find((w) => w.id === id));
  const upsert = useWorkplaces((s) => s.upsert);
  const removeWorkplace = useWorkplaces((s) => s.remove);
  const [wp, setWp] = useState<Workplace>(() => existing ?? blank());
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string>();
  const windowKey = !wp.rules.arrival.window ? 'any' : wp.rules.arrival.window.to === '11:00' ? 'morning' : 'day';
  const set = (patch: Partial<Workplace>) => setWp((w) => ({ ...w, ...patch }));
  const rules = (patch: Partial<Workplace['rules']>) => setWp((w) => ({ ...w, rules: { ...w.rules, ...patch } }));

  async function useCurrentLocation() {
    setLocating(true);
    setLocationError(undefined);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setLocationError('Location permission is off. Enable it in your phone settings, then try again.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setLocationError('Could not determine your location. Check Location Services and try again.');
    } finally {
      setLocating(false);
    }
  }

  async function save() {
    upsert({ ...wp, name: wp.name.trim() || 'Workplace' });
    if (!existing && (wp.rules.arrival.enabled || wp.rules.departure.enabled)) {
      try {
        await requestAlwaysLocation();
      } catch {
        Alert.alert('Workplace saved', 'Background location could not be enabled. You can enable it later in Location settings, or clock in manually.');
      }
    }
    await resync();
    router.back();
  }

  async function remove() {
    removeWorkplace(wp.id);
    await resync();
    router.back();
  }

  const located = wp.lat !== 0 || wp.lng !== 0;

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? existing.name : 'New workplace' }} />
      <Card style={{ gap: 12 }}>
        <TextInput
          accessibilityLabel="Workplace name"
          autoCorrect={false}
          autoCapitalize="words"
          value={wp.name}
          onChangeText={(name) => set({ name })}
          placeholder="Name, e.g. Studio Kreuzberg"
          placeholderTextColor={c['text/tertiary']}
          style={{ fontSize: 17, color: c['text/primary'], paddingVertical: 6 }}
        />
        <Text variant="footnote" color="text/secondary">
          {located ? `${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}` : 'No location yet'}
        </Text>
        <Button label={locating ? 'Locating…' : 'Use current location'} icon="location" style="secondary" onPress={useCurrentLocation} disabled={locating} />
        {locationError ? <Text variant="footnote" color="danger">{locationError}</Text> : null}
      </Card>

      <SectionHeader>Radius</SectionHeader>
      <Chips options={[100, 150, 250, 400]} value={wp.radius} format={(r) => `${r} m`} onChange={(radius) => set({ radius })} />
      {wp.radius < 150 ? (
        <Text variant="footnote" color="break">
          Below 150 m iOS and Android can miss or delay arrivals.
        </Text>
      ) : null}

      <SectionHeader>When I arrive</SectionHeader>
      <Group>
        <ToggleRow title="Ask me to clock in" icon="bell" value={wp.rules.arrival.enabled} onChange={(enabled) => rules({ arrival: { ...wp.rules.arrival, enabled } })} last />
      </Group>
      <Text variant="footnote" color="text/secondary">
        Ask after I&apos;ve been there for
      </Text>
      <Chips options={[0, 2, 5, 10, 15]} value={wp.rules.arrival.delayMinutes} format={(m) => (m ? `${m} min` : 'Right away')} onChange={(delayMinutes) => rules({ arrival: { ...wp.rules.arrival, delayMinutes } })} />
      <Text variant="footnote" color="text/secondary">
        Only between
      </Text>
      <Chips
        options={['any', 'morning', 'day'] as const}
        value={windowKey}
        format={(k) => (k === 'any' ? 'Any time' : `${WINDOWS[k].from}–${WINDOWS[k].to}`)}
        onChange={(k) => rules({ arrival: { ...wp.rules.arrival, window: WINDOWS[k] ? { ...WINDOWS[k] } : undefined } })}
      />

      <SectionHeader>When I leave</SectionHeader>
      <Group>
        <ToggleRow title="Ask me to clock out" icon="signOut" value={wp.rules.departure.enabled} onChange={(enabled) => rules({ departure: { ...wp.rules.departure, enabled } })} />
        <ToggleRow
          title="Only if I clocked in here"
          value={wp.rules.departure.onlyWhenClockedIn}
          onChange={(onlyWhenClockedIn) => rules({ departure: { ...wp.rules.departure, onlyWhenClockedIn } })}
          last
        />
      </Group>
      <Text variant="footnote" color="text/secondary">
        Ask after I&apos;ve been away for
      </Text>
      <Chips options={[5, 10, 15, 30]} value={wp.rules.departure.delayMinutes} format={(m) => `${m} min`} onChange={(delayMinutes) => rules({ departure: { ...wp.rules.departure, delayMinutes } })} />

      <SectionHeader>On these days</SectionHeader>
      <Row gap={6}>
        {DAYS.map((d, i) => {
          const on = wp.rules.days.includes(i + 1);
          return (
            <View key={i} style={{ flex: 1 }}>
              <Button
                label={d}
                style={on ? 'ink' : 'secondary'}
                onPress={() => rules({ days: on ? wp.rules.days.filter((x) => x !== i + 1) : [...wp.rules.days, i + 1].sort() })}
              />
            </View>
          );
        })}
      </Row>

      {!existing && (wp.rules.arrival.enabled || wp.rules.departure.enabled) ? (
        <Text variant="footnote" color="text/secondary">
          Saving asks for background location so arrival and departure reminders can work with the app closed. You can decline and clock in manually.
        </Text>
      ) : null}
      <Button label="Save" onPress={save} disabled={!located} />
      {existing ? <Button label="Delete workplace" style="destructive" icon="trash" onPress={remove} /> : null}
    </Screen>
  );
}
