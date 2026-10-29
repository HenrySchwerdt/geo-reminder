import { describe, expect, it } from 'vitest';

import { applyCommands, sortCommands } from '@/features/surfaces/adapters/wear-commands';

const cmd = (id: string, at: number) => JSON.stringify({ id, action: 'clockIn', at, source: 'watch' });

describe('wear commands', () => {
  it('orders commands by tap time, keeping arrival order for ties', () => {
    const sorted = sortCommands([cmd('c', 300), cmd('a', 100), cmd('b1', 200), cmd('b2', 200)]);
    expect(sorted.map((c) => (c as { id: string }).id)).toEqual(['a', 'b1', 'b2', 'c']);
  });

  it('drops garbage but keeps valid commands', () => {
    expect(sortCommands(['not json', 'null', '42', cmd('a', 1)])).toHaveLength(1);
  });

  it('applies in order and counts the ones the app accepted', () => {
    const seen: string[] = [];
    const applied = applyCommands([cmd('late', 20), cmd('early', 10)], (c) => {
      const id = (c as { id: string }).id;
      seen.push(id);
      return id === 'early';
    });
    expect(seen).toEqual(['early', 'late']);
    expect(applied).toBe(1);
  });
});
