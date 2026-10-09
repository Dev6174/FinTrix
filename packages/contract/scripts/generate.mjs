// Generates src/generated/types.ts from the JSON Schema. `--check` fails if the file is stale (CI).
import { compileFromFile } from 'json-schema-to-typescript';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}src/generated/types.ts`;

const ts = await compileFromFile(`${root}schema/fintrix.schema.json`, {
  bannerComment:
    '/* Generated from schema/fintrix.schema.json by scripts/generate.mjs. Do not edit. */',
  additionalProperties: false,
  unreachableDefinitions: true,
  strictIndexSignatures: true,
  style: { singleQuote: true, printWidth: 100 },
});

if (process.argv.includes('--check')) {
  const current = await readFile(out, 'utf8').catch(() => '');
  if (current !== ts) {
    console.error('Contract types are stale. Run: pnpm --filter @fintrix/contract generate');
    process.exit(1);
  }
} else {
  await mkdir(`${root}src/generated`, { recursive: true });
  await writeFile(out, ts);
  console.log(`wrote ${out}`);
}
