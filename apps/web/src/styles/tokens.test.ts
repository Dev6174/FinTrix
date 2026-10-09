import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { contrast, hslToRgb, parseHsl } from '../lib/color';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'tokens.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const out: Record<string, string> = {};
  for (const [, k, v] of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[k!] = v!.trim();
  return out;
}

const themes = { dark: block("[data-theme='dark']"), light: block("[data-theme='light']") };
const surfaces = ['bg-0', 'bg-1', 'bg-2', 'bg-3'];

describe.each(Object.entries(themes))('%s theme', (_name, t) => {
  const c = (a: string, b: string) => contrast(t[a]!, t[b]!);

  it.each(['text-primary', 'text-secondary', 'text-muted'])('%s ≥ 4.5:1 on every surface', (fg) => {
    for (const bg of surfaces) expect(c(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });

  it('accent-fg on accent ≥ 4.5:1 (button labels)', () => {
    expect(c('accent-fg', 'accent')).toBeGreaterThanOrEqual(4.5);
    expect(c('accent-fg', 'accent-hover')).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['accent', 'success', 'warning', 'danger', 'info'])(
    '%s ≥ 4.5:1 on bg-1 (used as text)',
    (k) => {
      expect(c(k, 'bg-1')).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('series colours ≥ 3:1 on chart surfaces (non-text contrast)', () => {
    for (let i = 1; i <= 6; i++)
      for (const bg of ['bg-1', 'bg-2'])
        expect(c(`series-${i}`, bg), `series-${i} on ${bg}`).toBeGreaterThanOrEqual(3);
  });

  it('strong border ≥ 3:1 on bg-1 (input outlines)', () => {
    expect(c('border-strong', 'bg-1')).toBeGreaterThanOrEqual(3);
  });

  it('series colours are pairwise distinguishable', () => {
    const rgb = Array.from({ length: 6 }, (_, i) => hslToRgb(parseHsl(t[`series-${i + 1}`]!)));
    for (let i = 0; i < 6; i++)
      for (let j = i + 1; j < 6; j++) {
        const [a, b] = [rgb[i]!, rgb[j]!];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        expect(d, `series-${i + 1} vs series-${j + 1}`).toBeGreaterThan(0.15);
      }
  });
});

it('both themes define the same token set', () => {
  expect(Object.keys(themes.light).sort()).toEqual(Object.keys(themes.dark).sort());
});
