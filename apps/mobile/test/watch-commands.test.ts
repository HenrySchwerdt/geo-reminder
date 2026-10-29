import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { applyQueuedCommands, parseQueuedCommands, sortByAt } from '@/features/surfaces/adapters/watch-commands';

const cmd = (id: string, action: string, at: number) => JSON.stringify({ id, action, at, source: 'watch' });

describe('watch command queue', () => {
  it('parses queued JSON and drops garbage', () => {
    const parsed = parseQueuedCommands([cmd('a', 'clockIn', 1), 'not json', '42', 'null', '[1]', cmd('b', 'clockOut', 2)]);
    expect(parsed.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('sorts by tap time, keeping arrival order for equal times', () => {
    const sorted = sortByAt([
      { id: 'late', at: 30 },
      { id: 'first-tie', at: 10 },
      { id: 'second-tie', at: 10 },
      { id: 'early', at: 5 },
      { id: 'no-time' },
    ]);
    expect(sorted.map((c) => c.id)).toEqual(['early', 'first-tie', 'second-tie', 'late', 'no-time']);
  });

  it('applies commands oldest first and counts the ones that were applied', () => {
    const seen: string[] = [];
    const applied = applyQueuedCommands(
      [cmd('3', 'clockOut', 300), cmd('1', 'clockIn', 100), cmd('2', 'startBreak', 200), cmd('2', 'startBreak', 200)],
      (c) => {
        const id = (c as { id: string }).id;
        if (seen.includes(id)) return false; // duplicate delivered by both transports
        seen.push(id);
        return true;
      },
    );
    expect(seen).toEqual(['1', '2', '3']);
    expect(applied).toBe(3);
  });

  it('keeps going when one command throws', () => {
    const seen: string[] = [];
    const applied = applyQueuedCommands([cmd('1', 'clockIn', 1), cmd('2', 'clockOut', 2)], (c) => {
      const id = (c as { id: string }).id;
      if (id === '1') throw new Error('boom');
      seen.push(id);
      return true;
    });
    expect(seen).toEqual(['2']);
    expect(applied).toBe(1);
  });
});

// The watch app and its complication are separate targets that cannot import each other's files, so the
// Swift sources they share exist twice. They must stay identical.
describe('shared Swift sources', () => {
  const read = (target: string, file: string) =>
    readFileSync(fileURLToPath(new URL(`../targets/${target}/${file}`, import.meta.url)), 'utf8');
  it.each(['SurfaceModels.swift', 'Theme.swift'])('%s is identical in watch and watch-widget', (file) => {
    expect(read('watch-widget', file)).toBe(read('watch', file));
  });
});
