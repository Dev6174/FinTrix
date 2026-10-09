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

## Trading-terminal redesign (Policy Lab)

- **Visual language follows TradingView** (navy panels on a darker gutter, hairline borders, blue accent, green/red up/down, 13px base, dense rows). FinTrix keeps its own name and logo, with no TradingView branding.
- **Chart library: `lightweight-charts` 4.2 (TradingView's open-source Apache-2.0 library)**, not uPlot. It ships candlesticks, volume, markers and a crosshair that match the look. Its attribution logo stays on, as its licence asks. It is lazy-loaded (54 KB gz), so initial JS is still 104 KB.
- **The chart legend updates by direct DOM writes on crosshair move**, not React state, so hovering never re-renders the tree.
- **In-browser synthetic engine (`lib/sim.ts`, Web Worker)** lets the Lab demo work before the C++ engine exists. It is labelled "Synthetic" in the UI and aggregates agents by type rather than simulating each one. It has the same inputs and outputs as the contract and is replaced in step 4.
- **Watchlist = policy presets.** VaR 99 is the headline metric. Lower is better, so a drop versus BASE is green.
- **KPI deltas: % change for ratios, absolute difference for counts** (halts, defaults). A % change on a near-zero count is meaningless.
- **Runtime estimate is calibrated from a measured run** (1M scenario-ticks ≈ 0.33–0.42 s in Chrome), not guessed.
