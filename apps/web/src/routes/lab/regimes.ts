import { marketStats, rebased, type MarketFile, type MarketStats } from '../../lib/market';

export type RegimeId = 'synthetic' | 'spx-2007' | 'spx-2024' | 'nifty-2007' | 'nifty-2024';

export interface RegimeDef {
  id: RegimeId;
  short: string;
  label: string;
  note?: string;
}

export const REGIMES: readonly RegimeDef[] = [
  { id: 'synthetic', short: 'Synthetic', label: 'Synthetic market (minute ticks)' },
  {
    id: 'spx-2007',
    short: 'S&P 500 · 2007–09',
    label: 'S&P 500 · Global Financial Crisis 2007–09',
  },
  { id: 'spx-2024', short: 'S&P 500 · 2024–25', label: 'S&P 500 · 2024–25' },
  {
    id: 'nifty-2007',
    short: 'NIFTY · 2007–09',
    label: 'NIFTY 50 · Global Financial Crisis',
    note: 'Data starts Sep 2007 (source history limit)',
  },
  { id: 'nifty-2024', short: 'NIFTY · 2024–25', label: 'NIFTY 50 · 2024–25' },
];

// Lazy: each file is its own chunk, fetched only when chosen.
const loaders: Record<Exclude<RegimeId, 'synthetic'>, () => Promise<{ default: unknown }>> = {
  'spx-2007': () => import('../../data/market/spx-2007.json'),
  'spx-2024': () => import('../../data/market/spx-2024.json'),
  'nifty-2007': () => import('../../data/market/nifty-2007.json'),
  'nifty-2024': () => import('../../data/market/nifty-2024.json'),
};

export interface LoadedRegime {
  def: RegimeDef;
  file: MarketFile;
  stats: MarketStats;
  dates: string[];
  /** Actual closes rebased to 100 on day 0. */
  actual: Float32Array;
}

const cache = new Map<RegimeId, Promise<LoadedRegime>>();

export function loadRegime(id: Exclude<RegimeId, 'synthetic'>): Promise<LoadedRegime> {
  let p = cache.get(id);
  if (!p) {
    p = loaders[id]().then(({ default: raw }) => {
      const file = raw as MarketFile;
      return {
        def: REGIMES.find((r) => r.id === id)!,
        file,
        stats: marketStats(file),
        dates: file.rows.map((r) => r[0]),
        actual: rebased(file),
      };
    });
    cache.set(id, p);
  }
  return p;
}
