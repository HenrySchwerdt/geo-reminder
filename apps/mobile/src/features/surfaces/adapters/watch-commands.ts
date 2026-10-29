/**
 * Pure helpers for commands queued by the Apple Watch (`transferUserInfo` / `sendMessage`, persisted natively
 * until JS drains them). Kept free of React Native imports so they can be unit-tested in Node.
 */

/** Parse the queued JSON strings; entries that are not JSON objects are dropped. */
export function parseQueuedCommands(raw: readonly string[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const item of raw) {
    try {
      const value: unknown = JSON.parse(item);
      if (value && typeof value === 'object' && !Array.isArray(value)) out.push(value as Record<string, unknown>);
    } catch {
      // Not ours / corrupted: ignore.
    }
  }
  return out;
}

const atOf = (c: Record<string, unknown>) => (typeof c.at === 'number' ? c.at : Number.POSITIVE_INFINITY);

/** Oldest tap first. Stable, so commands with the same `at` keep their arrival order. */
export function sortByAt<T extends Record<string, unknown>>(commands: readonly T[]): T[] {
  return commands
    .map((c, i) => ({ c, i }))
    .sort((a, b) => atOf(a.c) - atOf(b.c) || a.i - b.i)
    .map(({ c }) => c);
}

/**
 * Apply everything the watch queued, in the order the taps happened. `run` is `runSurfaceCommand`, which
 * validates the payload and ignores ids it has applied already (a command is delivered by both transports).
 * Returns how many commands were applied.
 */
export function applyQueuedCommands(raw: readonly string[], run: (command: unknown) => boolean): number {
  let applied = 0;
  for (const command of sortByAt(parseQueuedCommands(raw))) {
    try {
      if (run(command)) applied++;
    } catch (e) {
      console.warn('[surfaces] watch command failed', e);
    }
  }
  return applied;
}
