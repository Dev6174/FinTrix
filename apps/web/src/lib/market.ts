/** Real index history (snapshotted by scripts/fetch-market-data.mjs) and the statistics used to calibrate the model. */

export interface MarketFile {
  id: string;
  symbol: string;
  name: string;
  label: string;
  source: string;
  fetchedAt: string;
  columns: ['date', 'open', 'high', 'low', 'close'];
  rows: [string, number, number, number, number][];
}

export interface MarketStats {
  days: number;
  from: string;
  to: string;
  /** Total return over the period, e.g. -0.35. */
  totalReturn: number;
  /** Annualised mean log return. */
  driftAnnual: number;
  /** Annualised volatility of daily log returns. */
  volAnnual: number;
  /** Worst peak-to-trough fall on closes, positive (0.57 = −57%). */
  maxDrawdown: number;
  /** Peak and trough dates of that drawdown. */
  peakDate: string;
  troughDate: string;
  /** Worst single-day return. */
  worstDay: number;
  worstDayDate: string;
}

export const TRADING_DAYS = 252;

export function marketStats(m: MarketFile): MarketStats {
  const rows = m.rows;
  if (rows.length < 2) throw new Error(`${m.id}: need at least 2 days of data`);
  let sum = 0;
  let sum2 = 0;
  let worstDay = 0;
  let worstDayDate = rows[0]![0];
  let peak = rows[0]![4];
  let peakDate = rows[0]![0];
  let maxDD = 0;
  let ddPeak = peakDate;
  let ddTrough = peakDate;
  for (let i = 1; i < rows.length; i++) {
    const [date, , , , c] = rows[i]!;
    const prev = rows[i - 1]![4];
    const r = Math.log(c / prev);
    sum += r;
    sum2 += r * r;
    if (c / prev - 1 < worstDay) {
      worstDay = c / prev - 1;
      worstDayDate = date;
    }
    if (c > peak) {
      peak = c;
      peakDate = date;
    }
    const dd = 1 - c / peak;
    if (dd > maxDD) {
      maxDD = dd;
      ddPeak = peakDate;
      ddTrough = date;
    }
  }
  const n = rows.length - 1;
  const mean = sum / n;
  const variance = sum2 / n - mean * mean;
  return {
    days: rows.length,
    from: rows[0]![0],
    to: rows[rows.length - 1]![0],
    totalReturn: rows[rows.length - 1]![4] / rows[0]![4] - 1,
    driftAnnual: mean * TRADING_DAYS,
    volAnnual: Math.sqrt(Math.max(0, variance) * TRADING_DAYS),
    maxDrawdown: maxDD,
    peakDate: ddPeak,
    troughDate: ddTrough,
    worstDay,
    worstDayDate,
  };
}

/** Closes rebased so day 0 = 100, comparable with the simulator's start price. */
export function rebased(m: MarketFile): Float32Array {
  const c0 = m.rows[0]![4];
  return Float32Array.from(m.rows, (r) => (r[4] / c0) * 100);
}

/** Share of `values` strictly below `x`, in [0,1]. */
export function percentileRank(values: ArrayLike<number>, x: number): number {
  let below = 0;
  for (let i = 0; i < values.length; i++) if (values[i]! < x) below++;
  return values.length ? below / values.length : NaN;
}
