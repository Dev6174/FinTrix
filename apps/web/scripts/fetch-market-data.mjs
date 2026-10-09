// Snapshots daily index history from Yahoo Finance's public chart endpoint into src/data/market/*.json.
// Run once (needs network): node scripts/fetch-market-data.mjs. The JSON is committed so the app works offline.
// Data is for academic, non-commercial use; source and fetch date are stored in each file.
import { mkdir, writeFile } from 'node:fs/promises';

const SERIES = [
  {
    id: 'spx-2007',
    symbol: '^GSPC',
    name: 'S&P 500',
    label: 'Global Financial Crisis',
    from: '2007-01-01',
    to: '2009-12-31',
  },
  {
    id: 'spx-2024',
    symbol: '^GSPC',
    name: 'S&P 500',
    label: '2024–25',
    from: '2024-01-01',
    to: '2025-12-31',
  },
  {
    id: 'nifty-2007',
    symbol: '^NSEI',
    name: 'NIFTY 50',
    label: 'Global Financial Crisis',
    from: '2007-01-01',
    to: '2009-12-31',
  },
  {
    id: 'nifty-2024',
    symbol: '^NSEI',
    name: 'NIFTY 50',
    label: '2024–25',
    from: '2024-01-01',
    to: '2025-12-31',
  },
];

const outDir = new URL('../src/data/market/', import.meta.url);
await mkdir(outDir, { recursive: true });
const sec = (d) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 1000);

for (const s of SERIES) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s.symbol)}?period1=${sec(s.from)}&period2=${sec(s.to) + 86400}&interval=1d`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (FinTrix academic project)' },
  });
  if (!res.ok) throw new Error(`${s.symbol}: HTTP ${res.status}`);
  const json = await res.json();
  const r = json.chart?.result?.[0];
  if (!r) throw new Error(`${s.symbol}: no result (${JSON.stringify(json.chart?.error)})`);
  const q = r.indicators.quote[0];
  const rows = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    const [o, h, l, c] = [q.open[i], q.high[i], q.low[i], q.close[i]];
    if ([o, h, l, c].some((v) => v == null || !Number.isFinite(v))) continue; // holidays / gaps
    rows.push([
      new Date(r.timestamp[i] * 1000).toISOString().slice(0, 10),
      +o.toFixed(2),
      +h.toFixed(2),
      +l.toFixed(2),
      +c.toFixed(2),
    ]);
  }
  const file = {
    id: s.id,
    symbol: s.symbol,
    name: s.name,
    label: s.label,
    source: 'Yahoo Finance chart API (daily)',
    fetchedAt: new Date().toISOString().slice(0, 10),
    columns: ['date', 'open', 'high', 'low', 'close'],
    rows,
  };
  await writeFile(new URL(`${s.id}.json`, outDir), JSON.stringify(file));
  console.log(`${s.id}: ${rows.length} days, ${rows[0][0]} → ${rows.at(-1)[0]}`);
}
