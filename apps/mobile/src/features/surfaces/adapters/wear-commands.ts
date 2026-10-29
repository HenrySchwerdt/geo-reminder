/** Pure helpers for commands that arrive from the Wear OS app, kept apart from the native bridge so they are testable. */

/** Parse the raw JSON strings and order them by tap time (`at`); unparseable entries are dropped. Stable for equal times. */
export function sortCommands(raw: string[]): unknown[] {
  const parsed = raw.flatMap((json) => {
    try {
      const value: unknown = JSON.parse(json);
      return typeof value === 'object' && value !== null ? [value as { at?: unknown }] : [];
    } catch {
      return [];
    }
  });
  const timeOf = (c: { at?: unknown }) => (typeof c.at === 'number' ? c.at : 0);
  return parsed.sort((a, b) => timeOf(a) - timeOf(b));
}

/** Apply drained commands in the order they were tapped. Returns how many were applied. */
export function applyCommands(raw: string[], run: (command: unknown) => boolean): number {
  return sortCommands(raw).filter((command) => run(command)).length;
}
