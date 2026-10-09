/** Parse a bare token triplet like "224 26% 6%" into [h, s, l] (s, l in 0..1). */
export function parseHsl(triplet: string): [number, number, number] {
  const m = /^\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*$/.exec(triplet);
  if (!m) throw new Error(`Not an HSL triplet: "${triplet}"`);
  return [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100];
}

export function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)];
}

/** WCAG 2.x relative luminance of an sRGB colour with channels 0..1. */
export function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(hslToRgb(parseHsl(a)));
  const lb = luminance(hslToRgb(parseHsl(b)));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
