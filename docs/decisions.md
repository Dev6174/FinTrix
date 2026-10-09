# Decisions

One line per trade-off. Newest at the bottom of each step.

## Step 1: contract, scaffolding, tokens, components

- **Contract source of truth is JSON Schema** (`packages/contract/schema`), not TS/zod. The C++ engine and Python supervisor can follow the same document; TS types are generated and CI fails if they are stale.
- **Frame base fields are inlined** in every frame rather than `allOf`. json-schema-to-typescript drops sibling properties next to `allOf`, and inlining lets frames be `additionalProperties: false`.
- **Added `run.status` frame** (not in the brief's list) so pause/resume/cancel round-trip through the same stream as everything else.
- **Time series typed as `Float32Array`** (`tsType`) and sent as MessagePack `bin`. JSON Schema validates the envelope only; series length is checked in the gateway decoder.
- **pnpm workspaces**, no Turborepo/Nx: five packages do not justify a build orchestrator.
- **Tailwind v4 with its default palette, type scale, radii and shadows removed** (`--color-*: initial`) so components can only use tokens. A stray `bg-blue-500` fails to compile to anything.
- **Contrast is a unit test** (`tokens.test.ts`): text ≥ 4.5:1 on every surface, series and input borders ≥ 3:1, in both themes. Fixing it found the original strong-border and light-theme series-5 tokens failing.
- **Policy palette = Okabe–Ito hues**, lightness adjusted per theme to keep ≥ 3:1. Hue order is fixed; the same index means the same policy everywhere.
- **`exactOptionalPropertyTypes` on for the contract, off for the web app**: Radix prop types are not written for it and the noise hid real errors.
- **Disabled buttons use `aria-disabled`, not `disabled`**, so they stay focusable and the "why disabled" tooltip is reachable by keyboard.
- **NumberField is a text input with `role=spinbutton`**, not `type=number`: no wheel-scroll edits, and "1,000,000" pastes cleanly.
- **DataTable sorts and filters an index array (`Uint32Array`)**, never copies rows. 20k rows sort+filter in the test budget of < 100 ms; the filter uses `useDeferredValue` so typing stays responsive.
- **DataTable keyboard model: one tab stop plus `aria-activedescendant`**, instead of a tab stop per virtual row.
- **Toast queue capped at 4**, so bursts of background events cannot pile up.
- **The rail lists only screens that exist.** Lab, Monitor, Results, HPC and History are added in their own steps, so there are no dead links.
- **Fonts are self-hosted via Fontsource** with `unicode-range` subsets (only Latin downloads for English UI). Preload is deferred to step 8, since a hashed font URL needs a build plugin.

## Environment notes

- Local `g++` is MinGW 6.3: too old for complete C++17 and has no usable OpenMP. Step 4 builds the engine in Docker (GCC 13 + OpenMPI) or WSL; native Windows builds are not a target.
