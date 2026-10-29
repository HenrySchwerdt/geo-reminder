import { ClockField, ControlRow, Stepper } from '@/features/settings/components';
import { formatMinutes } from '@/features/settings/format';
import { useSettings } from '@/features/settings/store';
import { Group, Screen, SectionHeader, Text, ToggleRow } from '@/shared/ui/components';

export default function Reminders() {
  const reminders = useSettings((s) => s.reminders);
  const update = useSettings((s) => s.update);
  const { start, stop, missingCheckOut } = reminders;
  const set = (patch: Partial<typeof reminders>) => update({ reminders: { ...reminders, ...patch } });

  return (
    <Screen>
      <Text variant="callout" color="text/secondary">
        These reminders are based on the time of day. Worktime uses them on Home days and whenever background location is off. On office days it asks when you arrive and leave instead.
      </Text>

      <SectionHeader>Start of work</SectionHeader>
      <Group>
        <ToggleRow title="Remind me to start" icon="signIn" value={start.enabled} onChange={(enabled) => set({ start: { ...start, enabled } })} last={!start.enabled} />
        {start.enabled ? (
          <ControlRow title="At" last>
            <ClockField label="Start reminder time" value={start.at} onChange={(at) => set({ start: { ...start, at } })} />
          </ControlRow>
        ) : null}
      </Group>
      <Text variant="footnote" color="text/secondary">
        Asked once a day, only if you have not clocked in yet.
      </Text>

      <SectionHeader>End of work</SectionHeader>
      <Group>
        <ToggleRow title="Remind me to stop" icon="signOut" value={stop.enabled} onChange={(enabled) => set({ stop: { ...stop, enabled } })} last={!stop.enabled} />
        {stop.enabled ? (
          <>
            <ControlRow title="After" subtitle="of work, plus breaks taken">
              <Stepper label="stop reminder after" value={stop.afterMinutes} step={15} min={60} max={16 * 60} format={formatMinutes} onChange={(afterMinutes) => set({ stop: { ...stop, afterMinutes } })} />
            </ControlRow>
            <ControlRow title="Latest at" subtitle="Never later than this" last>
              <ClockField label="Latest stop reminder" value={stop.latest} onChange={(latest) => set({ stop: { ...stop, latest } })} />
            </ControlRow>
          </>
        ) : null}
      </Group>

      <SectionHeader>Missing check-out</SectionHeader>
      <Group>
        <ToggleRow title="Remind me to fix it" subtitle="At 08:00 the next morning, opens that day" icon="warning" value={missingCheckOut} onChange={(v) => set({ missingCheckOut: v })} last />
      </Group>
    </Screen>
  );
}
