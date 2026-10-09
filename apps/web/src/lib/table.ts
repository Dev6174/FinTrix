export type Cell = number | string;
export type SortDir = 'asc' | 'desc';
export interface SortState {
  id: string;
  dir: SortDir;
}

/**
 * Indices of rows that match `filter` (case-insensitive substring over any column), ordered by `sort`.
 * Returns indices, not copies, so 20k-row tables never duplicate row objects. Stable for equal keys.
 */
export function viewIndices<R>(
  rows: readonly R[],
  getters: ReadonlyMap<string, (r: R) => Cell>,
  sort: SortState | null,
  filter: string,
): Uint32Array {
  const q = filter.trim().toLowerCase();
  const all = [...getters.values()];
  let idx: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (!q || all.some((g) => String(g(rows[i]!)).toLowerCase().includes(q))) idx.push(i);
  }
  const get = sort ? getters.get(sort.id) : undefined;
  if (sort && get) {
    const keys = idx.map((i) => get(rows[i]!));
    const order = idx.map((_, k) => k);
    const sign = sort.dir === 'asc' ? 1 : -1;
    order.sort((a, b) => {
      const x = keys[a]!;
      const y = keys[b]!;
      const c =
        typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return c * sign || a - b;
    });
    idx = order.map((k) => idx[k]!);
  }
  return Uint32Array.from(idx);
}

export function nextSort(current: SortState | null, id: string): SortState | null {
  if (current?.id !== id) return { id, dir: 'asc' };
  return current.dir === 'asc' ? { id, dir: 'desc' } : null;
}
