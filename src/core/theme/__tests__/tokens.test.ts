import { readFileSync } from 'fs';
import { join } from 'path';

import { colors } from '../tokens';

const css = readFileSync(join(__dirname, '../../../global.css'), 'utf8');

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');

function readBlock(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const end = css.indexOf('}', start);
  const body = css.slice(start, end);
  return Object.fromEntries(
    [...body.matchAll(/--color-([a-z-]+):\s*(\d+ \d+ \d+);/g)].map((m) => [m[1], m[2]]),
  );
}

describe.each([
  ['light', ':root'],
  ['dark', '.dark:root'],
] as const)('%s tokens', (scheme, selector) => {
  const vars = readBlock(selector);

  it('has the same set of variables as tokens.ts', () => {
    expect(Object.keys(vars).sort()).toEqual(Object.keys(colors[scheme]).map(kebab).sort());
  });

  it.each(Object.entries(colors[scheme]))('%s matches global.css', (name, hex) => {
    expect(vars[kebab(name)]).toBe(toRgb(hex));
  });
});
