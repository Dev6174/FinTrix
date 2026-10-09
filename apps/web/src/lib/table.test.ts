import { describe, expect, it } from 'vitest';
import { nextSort, viewIndices, type Cell, type SortState } from './table';

interface Row {
  name: string;
  loss: number;
}
const rows: Row[] = [
  { name: 'beta', loss: 3 },
  { name: 'alpha', loss: 1 },
  { name: 'gamma', loss: 3 },
  { name: 'Alphabet', loss: 2 },
];
const getters = new Map<string, (r: Row) => Cell>([
  ['name', (r) => r.name],
  ['loss', (r) => r.loss],
]);
const v = (sort: SortState | null, f: string) => [...viewIndices(rows, getters, sort, f)];

describe('viewIndices', () => {
  it('returns identity with no sort/filter', () => expect(v(null, '')).toEqual([0, 1, 2, 3]));
  it('filters case-insensitively across columns', () => {
    expect(v(null, 'ALPHA')).toEqual([1, 3]);
    expect(v(null, '3')).toEqual([0, 2]);
  });
  it('sorts numbers numerically, stable on ties', () => {
    expect(v({ id: 'loss', dir: 'asc' }, '')).toEqual([1, 3, 0, 2]);
    expect(v({ id: 'loss', dir: 'desc' }, '')).toEqual([0, 2, 3, 1]);
  });
  it('sorts strings by locale', () =>
    expect(v({ id: 'name', dir: 'asc' }, '')).toEqual([1, 3, 0, 2]));
  it('combines filter and sort', () =>
    expect(v({ id: 'loss', dir: 'desc' }, 'alpha')).toEqual([3, 1]));
  it('handles 20k rows quickly', () => {
    const big = Array.from({ length: 20_000 }, (_, i) => ({
      name: `s${i}`,
      loss: (i * 7919) % 1000,
    }));
    const t = performance.now();
    viewIndices(big, getters, { id: 'loss', dir: 'desc' }, 's1');
    expect(performance.now() - t).toBeLessThan(100);
  });
});

describe('nextSort', () => {
  it('cycles asc → desc → none', () => {
    const a = nextSort(null, 'x');
    expect(a).toEqual({ id: 'x', dir: 'asc' });
    const d = nextSort(a, 'x');
    expect(d).toEqual({ id: 'x', dir: 'desc' });
    expect(nextSort(d, 'x')).toBeNull();
    expect(nextSort(d, 'y')).toEqual({ id: 'y', dir: 'asc' });
  });
});
