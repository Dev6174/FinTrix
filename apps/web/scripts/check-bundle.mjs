// Fails the build if the initial JS (entry + its static imports) exceeds the gzip budget.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 180;
const dist = new URL('../dist/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('.vite/manifest.json', dist), 'utf8'));

const seen = new Set();
const walk = (key) => {
  if (seen.has(key)) return;
  seen.add(key);
  for (const k of manifest[key].imports ?? []) walk(k);
};
for (const [k, v] of Object.entries(manifest)) if (v.isEntry) walk(k);

let total = 0;
for (const k of seen) {
  const file = manifest[k].file;
  const kb = gzipSync(readFileSync(new URL(file, dist))).length / 1024;
  total += kb;
  console.log(`  ${file.padEnd(48)} ${kb.toFixed(1)} KB gz`);
}
console.log(`Initial JS: ${total.toFixed(1)} KB gz (budget ${BUDGET_KB} KB)`);
if (total > BUDGET_KB) {
  console.error('Initial JS over budget. Lazy-load the heavy import.');
  process.exit(1);
}
