import { addMonths } from '@worktime/core';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { applyImport, confirm, deleteAllData, exportCsv, exportJson, exportMonthlyReport, pickAndPreviewImport, type ImportPreview } from '@/features/data';
import { formatMonth, toDateKey } from '@/features/history/dates';
import { useTracking } from '@/features/tracking/store';
import { useNow } from '@/shared/hooks/use-now';
import { Button, Card, Group, Icon, ListRow, Row, Screen, SectionHeader, Text, ToggleRow } from '@/shared/ui/components';

type Banner = { tone: 'ok' | 'error'; text: string };

const day = (ms: number) => new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const message = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.');

export default function DataScreen() {
  const eventCount = useTracking((s) => s.ledger.length);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [restoreSettings, setRestoreSettings] = useState(false);
  const now = useNow(60_000);
  const thisMonth = `${toDateKey(now).slice(0, 7)}-01`;
  const [month, setMonth] = useState(thisMonth);

  /** Runs an action with a busy lock and reports its outcome in the banner. */
  async function run(action: () => Promise<string | null>) {
    if (busy) return;
    setBusy(true);
    setBanner(null);
    try {
      const done = await action();
      if (done) setBanner({ tone: 'ok', text: done });
    } catch (e) {
      setBanner({ tone: 'error', text: message(e) });
    } finally {
      setBusy(false);
    }
  }

  const exportAs = (fn: () => Promise<string>) => run(async () => `Exported ${await fn()}`);

  const pick = () =>
    run(async () => {
      const res = await pickAndPreviewImport();
      if (res.status === 'error') throw new Error(res.error);
      if (res.status === 'ready') {
        setPreview(res.preview);
        setRestoreSettings(false);
      }
      return null;
    });

  const confirmImport = () =>
    run(async () => {
      if (!preview) return null;
      const r = await applyImport(preview.file, { restoreSettings });
      setPreview(null);
      return `Imported ${plural(r.events, 'entry', 'entries')} and ${plural(r.workplaces, 'workplace')}${r.settingsRestored ? ', settings restored' : ''}.`;
    });

  async function remove() {
    const first = await confirm('Delete all data?', 'This removes all your time entries, workplaces and settings from this device.', 'Continue', true);
    if (!first) return;
    const second = await confirm('This cannot be undone', 'Export a backup first if you might need your data again. Delete everything now?', 'Delete everything', true);
    if (!second) return;
    await run(async () => {
      await deleteAllData();
      setPreview(null);
      return 'All data deleted from this device.';
    });
  }

  return (
    <Screen>
      {banner ? (
        <Card tone={banner.tone === 'ok' ? 'accent' : 'danger'}>
          <Row gap={10}>
            <Icon name={banner.tone === 'ok' ? 'check' : 'warning'} color={banner.tone === 'ok' ? 'accent' : 'danger'} />
            <Text variant="subheadStrong" color={banner.tone === 'ok' ? 'accent' : 'danger'} style={{ flex: 1 }}>
              {banner.text}
            </Text>
          </Row>
        </Card>
      ) : null}

      <Text variant="footnote" color="text/secondary" style={{ paddingHorizontal: 4 }}>
        Everything is stored only on this device. {plural(eventCount, 'entry', 'entries')} stored.
      </Text>

      <SectionHeader>Export</SectionHeader>
      <Group>
        <ListRow icon="table" title="Export as CSV (spreadsheet)" onPress={busy ? undefined : () => exportAs(exportCsv)} />
        <ListRow icon="document" tint="info" title="Export full backup (JSON)" onPress={busy ? undefined : () => exportAs(exportJson)} last />
      </Group>
      <Text variant="footnote" color="text/secondary" style={{ paddingHorizontal: 4 }}>
        CSV has one row per work session in your time zone and opens in Excel, Numbers and Google Sheets. The JSON backup contains everything, including settings and workplaces. Files are created on this device and handed to the app you choose.
      </Text>

      <SectionHeader>Monthly report</SectionHeader>
      <Card style={{ gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={12} onPress={() => setMonth((m) => addMonths(m, -1))}>
            <Icon name="back" />
          </Pressable>
          <Text variant="headline">{formatMonth(month)}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={12} disabled={month >= thisMonth} style={{ opacity: month >= thisMonth ? 0.3 : 1 }} onPress={() => setMonth((m) => addMonths(m, 1))}>
            <Icon name="chevron" />
          </Pressable>
        </Row>
        <Button label="Create PDF report" icon="document" style="secondary" onPress={() => exportAs(() => exportMonthlyReport(month))} disabled={busy} />
      </Card>
      <Text variant="footnote" color="text/secondary" style={{ paddingHorizontal: 4 }}>
        A printable summary of the month: worked time, target and balance, and every session with start, end and breaks in the time zone it was recorded in. Days without a check-out are marked and not counted. On the web preview the report opens as a page you can print.
      </Text>

      <SectionHeader>Import</SectionHeader>
      {preview ? (
        <Card style={{ gap: 12 }}>
          <Text variant="headline">Ready to import</Text>
          <View style={{ gap: 4 }}>
            <Text variant="body">{plural(preview.newEvents, 'new entry', 'new entries')}</Text>
            <Text variant="body">{plural(preview.newWorkplaces, 'new workplace')}</Text>
            {preview.range ? (
              <Text variant="footnote" color="text/secondary">
                {day(preview.range.from)} to {day(preview.range.to)}
              </Text>
            ) : null}
            {preview.knownEvents > 0 ? (
              <Text variant="footnote" color="text/secondary">
                {plural(preview.knownEvents, 'entry', 'entries')} already on this device will be skipped.
              </Text>
            ) : null}
          </View>
          {preview.settingsDiffer ? (
            <Group>
              <ToggleRow title="Also restore settings" subtitle="Replaces your working hours, weekly pattern, breaks, reminders and appearance." value={restoreSettings} onChange={setRestoreSettings} last />
            </Group>
          ) : null}
          <Button label="Import" icon="import" onPress={confirmImport} disabled={busy} />
          <Button label="Cancel" style="secondary" onPress={() => setPreview(null)} disabled={busy} />
        </Card>
      ) : (
        <>
          <Group>
            <ListRow icon="import" title="Import backup" onPress={busy ? undefined : pick} last />
          </Group>
          <Text variant="footnote" color="text/secondary" style={{ paddingHorizontal: 4 }}>
            Choose a JSON backup made by Worktime. You see what will change before anything is imported. Existing entries are never overwritten or duplicated.
          </Text>
        </>
      )}

      <SectionHeader>Danger zone</SectionHeader>
      <Group>
        <ListRow icon="trash" tint="danger" title="Delete all data" onPress={busy ? undefined : remove} last />
      </Group>
      <Text variant="footnote" color="text/secondary" style={{ paddingHorizontal: 4 }}>
        Permanently removes all entries, workplaces and settings from this device and stops location monitoring. There is no copy anywhere else, so export a backup first.
      </Text>
    </Screen>
  );
}
