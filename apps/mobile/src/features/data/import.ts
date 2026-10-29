/** Import of a JSON backup in two steps: pick + preview (writes nothing), then apply. */
import { newEventsFrom, parseExportFile, type ExportFile, type TimeEvent, type Workplace } from '@worktime/core';

import { resync } from '@/features/geofencing/runner';
import { getSettings, useSettings } from '@/features/settings/store';
import { getLedger, useTracking } from '@/features/tracking/store';
import { getWorkplaces, useWorkplaces } from '@/features/workplaces/store';
import { pickTextFile } from './files';

export interface ImportPreview {
  file: ExportFile;
  newEvents: number;
  /** Events in the backup that are already stored. */
  knownEvents: number;
  newWorkplaces: number;
  /** Epoch ms of the first and last new event, if any. */
  range?: { from: number; to: number };
  /** True when the backup's settings differ from the current ones. */
  settingsDiffer: boolean;
}

export type PickResult = { status: 'canceled' } | { status: 'error'; error: string } | { status: 'ready'; preview: ImportPreview };

export interface ImportSummary {
  events: number;
  workplaces: number;
  settingsRestored: boolean;
}

const sameSettings = (a: object, b: object) => JSON.stringify(a) === JSON.stringify(b);

export function previewImport(file: ExportFile): ImportPreview {
  const fresh = newEventsFrom(file, getLedger());
  const known = new Set(getWorkplaces().map((w) => w.id));
  const times = fresh.map((e) => e.at);
  return {
    file,
    newEvents: fresh.length,
    knownEvents: file.events.length - fresh.length,
    newWorkplaces: file.workplaces.filter((w) => !known.has(w.id)).length,
    range: times.length ? { from: Math.min(...times), to: Math.max(...times) } : undefined,
    settingsDiffer: !sameSettings(file.settings, getSettings()),
  };
}

export async function pickAndPreviewImport(): Promise<PickResult> {
  let text: string | null;
  try {
    text = await pickTextFile();
  } catch {
    return { status: 'error', error: 'The file could not be opened.' };
  }
  if (text === null) return { status: 'canceled' };
  const parsed = parseExportFile(text);
  if (!parsed.ok) return { status: 'error', error: parsed.error };
  return { status: 'ready', preview: previewImport(parsed.file) };
}

/**
 * Additive and idempotent: only unknown events are appended, workplaces are merged by id (existing ones
 * win), and settings stay as they are unless `restoreSettings` is set.
 */
export async function applyImport(file: ExportFile, options: { restoreSettings?: boolean } = {}): Promise<ImportSummary> {
  const events: TimeEvent[] = newEventsFrom(file, getLedger());
  if (events.length) useTracking.getState().append(events);

  const current = getWorkplaces();
  const known = new Set(current.map((w) => w.id));
  const added: Workplace[] = file.workplaces.filter((w) => !known.has(w.id));
  if (added.length) useWorkplaces.getState().replaceAll([...current, ...added]);

  if (options.restoreSettings) useSettings.getState().update(file.settings);

  await resync();
  return { events: events.length, workplaces: added.length, settingsRestored: !!options.restoreSettings };
}
