import { colors, type ThemeColors } from '../tokens';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

type Pair = [keyof ThemeColors, keyof ThemeColors];
const PAIRS: Pair[] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['textMuted', 'background'],
  ['textMuted', 'surface'],
  ['textMuted', 'surfaceMuted'],
  ['onPrimary', 'primary'],
  ['primary', 'surface'],
  ['primary', 'background'],
  ['success', 'surface'],
  ['warning', 'surface'],
  ['info', 'surface'],
  ['danger', 'surface'],
];

describe.each(['light', 'dark'] as const)('WCAG AA contrast (%s)', (scheme) => {
  it.each(PAIRS)('%s on %s is at least 4.5:1', (fg, bg) => {
    const palette: ThemeColors = colors[scheme];
    expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
  });
});
