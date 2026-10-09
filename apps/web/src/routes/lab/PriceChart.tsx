import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';
import { useUi } from '../../app/theme';
import { hslToRgb, parseHsl } from '../../lib/color';
import type { SimOutput } from '../../lib/sim';

/** Token → "rgb(...)" (the chart library does not parse hsl). */
function token(name: string, alpha = 1): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  const [r, g, b] = hslToRgb(parseHsl(raw)).map((c) => Math.round(c * 255));
  return `rgba(${r},${g},${b},${alpha})`;
}

// Sim tick = one trading minute, starting at a fixed 09:30 ET open so axis labels read like a session.
const T0 = Date.UTC(2025, 0, 2, 14, 30) / 1000;

interface Series {
  candles: ISeriesApi<'Candlestick'>;
  volume: ISeriesApi<'Histogram'>;
  p5: ISeriesApi<'Line'>;
  p50: ISeriesApi<'Line'>;
  p95: ISeriesApi<'Line'>;
}

export function PriceChart({
  result,
  ticker,
  barTicks,
  showBand,
}: {
  result: SimOutput | null;
  ticker: string;
  barTicks: number;
  showBand: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const legend = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<Series | null>(null);
  const theme = useUi((s) => s.theme);

  // Create once.
  useEffect(() => {
    const c = createChart(host.current!, {
      autoSize: true,
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.25 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 6 },
      handleScale: { axisPressedMouseMove: true },
    });
    const band = (style: LineStyle) =>
      c.addLineSeries({
        lineWidth: 1,
        lineStyle: style,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    series.current = {
      p95: band(LineStyle.Dashed),
      p50: band(LineStyle.Dotted),
      p5: band(LineStyle.Dashed),
      volume: c.addHistogramSeries({
        priceScaleId: 'vol',
        priceFormat: { type: 'volume' },
        lastValueVisible: false,
        priceLineVisible: false,
      }),
      candles: c.addCandlestickSeries({ borderVisible: false }),
    };
    c.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    chart.current = c;
    return () => {
      c.remove();
      chart.current = null;
      series.current = null;
    };
  }, []);

  // Theme colours.
  useEffect(() => {
    const c = chart.current;
    const s = series.current;
    if (!c || !s) return;
    c.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: token('bg-1') },
        textColor: token('text-secondary'),
        fontFamily: getComputedStyle(document.body).fontFamily,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: token('border-subtle', 0.6) },
        horzLines: { color: token('border-subtle', 0.6) },
      },
      crosshair: {
        vertLine: { color: token('text-muted'), labelBackgroundColor: token('bg-3') },
        horzLine: { color: token('text-muted'), labelBackgroundColor: token('bg-3') },
      },
    });
    s.candles.applyOptions({
      upColor: token('up'),
      downColor: token('down'),
      wickUpColor: token('up'),
      wickDownColor: token('down'),
    });
    for (const k of ['p5', 'p50', 'p95'] as const)
      s[k].applyOptions({ color: token('series-1', k === 'p50' ? 0.9 : 0.6) });
    // Data colours depend on the theme too; re-run the data effect.
    if (result) setData(s, result, barTicks);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- result/barTicks handled by data effect
  }, [theme]);

  // Data.
  useEffect(() => {
    const s = series.current;
    if (!s || !result) return;
    setData(s, result, barTicks);
    chart.current?.timeScale().fitContent();
  }, [result, barTicks]);

  useEffect(() => {
    const s = series.current;
    if (!s) return;
    for (const k of ['p5', 'p50', 'p95'] as const) s[k].applyOptions({ visible: showBand });
  }, [showBand]);

  // Legend: direct DOM writes on crosshair move, no React re-render.
  useEffect(() => {
    const c = chart.current;
    const s = series.current;
    const el = legend.current;
    if (!c || !s || !el || !result) return;
    const { open, high, low, close } = result.bars;
    const write = (i: number) => {
      const o = open[i]!;
      const cl = close[i]!;
      const chg = (cl / o - 1) * 100;
      const dir = cl >= o ? 'text-up' : 'text-down';
      el.innerHTML =
        `<span class="text-fg-2">O</span> <span class="${dir}">${o.toFixed(2)}</span> ` +
        `<span class="text-fg-2">H</span> <span class="${dir}">${high[i]!.toFixed(2)}</span> ` +
        `<span class="text-fg-2">L</span> <span class="${dir}">${low[i]!.toFixed(2)}</span> ` +
        `<span class="text-fg-2">C</span> <span class="${dir}">${cl.toFixed(2)}</span> ` +
        `<span class="${dir}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</span>` +
        (result.bars.halted[i] ? ' <span class="text-warning">HALTED</span>' : '');
    };
    write(close.length - 1);
    const onMove = (p: { time?: unknown }) => {
      const i =
        typeof p.time === 'number' ? Math.round((p.time - T0) / (barTicks * 60)) : close.length - 1;
      write(Math.max(0, Math.min(close.length - 1, i)));
    };
    c.subscribeCrosshairMove(onMove);
    return () => c.unsubscribeCrosshairMove(onMove);
  }, [result, barTicks]);

  return (
    <div className="relative h-full w-full">
      <div ref={host} className="absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute top-2 left-3 z-10 flex flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <span className="text-md font-semibold text-fg">{ticker}</span>
          <span className="text-sm text-fg-2">· {barTicks}T · FinTrix Sim · scenario 0</span>
        </div>
        <div ref={legend} className="num text-xs" />
        {showBand && (
          <div className="text-xs text-fg-2">
            <span className="text-series-1">┅</span> P5 / P95 band{' '}
            <span className="text-series-1">┄</span> median across scenarios
          </div>
        )}
      </div>
      {result && <p className="sr-only">{chartSummary(result)}</p>}
    </div>
  );
}

function setData(s: Series, r: SimOutput, barTicks: number) {
  const { open, high, low, close, volume, halted } = r.bars;
  const t = (i: number) => (T0 + i * barTicks * 60) as UTCTimestamp;
  const up = token('up', 0.45);
  const down = token('down', 0.45);
  const warn = token('warning');
  s.candles.setData(
    Array.from(close, (c, i) => ({
      time: t(i),
      open: open[i]!,
      high: high[i]!,
      low: low[i]!,
      close: c,
      ...(halted[i] ? { color: warn, wickColor: warn } : {}),
    })),
  );
  s.volume.setData(
    Array.from(volume, (v, i) => ({
      time: t(i),
      value: v,
      color: close[i]! >= open[i]! ? up : down,
    })),
  );
  for (const k of ['p5', 'p50', 'p95'] as const)
    s[k].setData(Array.from(r.band[k], (v, i) => ({ time: t(i), value: v })));

  const markers: SeriesMarker<UTCTimestamp>[] = [];
  for (let i = 0; i < halted.length; i++)
    if (halted[i] && !halted[i - 1])
      markers.push({
        time: t(i),
        position: 'aboveBar',
        color: warn,
        shape: 'arrowDown',
        text: 'CB',
      });
  s.candles.setMarkers(markers);
}

/** Text alternative for screen readers. */
function chartSummary(r: SimOutput): string {
  const c = r.bars.close;
  const first = r.bars.open[0] ?? 0;
  const last = c[c.length - 1] ?? 0;
  let hi = -Infinity;
  let lo = Infinity;
  for (let i = 0; i < c.length; i++) {
    hi = Math.max(hi, r.bars.high[i]!);
    lo = Math.min(lo, r.bars.low[i]!);
  }
  const halts = r.events.filter((e) => e.kind === 'circuit_breaker').length;
  return `Scenario 0 price moved from ${first.toFixed(2)} to ${last.toFixed(2)} over ${c.length} bars, ranging ${lo.toFixed(2)} to ${hi.toFixed(2)}, with ${halts} circuit-breaker halts.`;
}
