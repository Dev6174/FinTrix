# FinTrix

Policy stress-testing on an HPC agent-based market simulator. A regulator sets interest rate, margin requirement and circuit-breaker threshold, runs thousands of Monte Carlo scenarios on a C++/OpenMP/MPI engine, watches it live, and compares policies by risk.

> Feature guide: [docs/FEATURES.md](docs/FEATURES.md).
>
> **Status: step 1 of 8.** The contract, design tokens, component library and gallery are done. The gateway, engine and screens arrive in later steps (see `docs/decisions.md`).

## Run

```bash
pnpm install        # Node ≥ 20, pnpm ≥ 9
pnpm dev            # http://localhost:5173 → component gallery
make check          # lint, typecheck, tests, build, bundle budget (same as CI)
```

## Layout

```
fintrix/
├── packages/contract/      JSON Schema + OpenAPI (source of truth) → generated TS types
│   ├── schema/fintrix.schema.json
│   ├── schema/openapi.yaml
│   └── src/generated/types.ts    (pnpm --filter @fintrix/contract generate)
├── apps/web/               React 18 + TS strict + Vite + Tailwind v4 + Radix
│   ├── src/styles/tokens.css     every colour/size/motion value lives here
│   ├── src/ui/                   component library
│   └── src/routes/Gallery.tsx    all components in all states
├── docs/decisions.md
└── .github/workflows/ci.yml
```

## Measured so far

| Check                  | Result                                                        |
| ---------------------- | ------------------------------------------------------------- |
| Initial JS (gzip)      | 106 KB of the 180 KB budget (enforced in `pnpm build`)        |
| WCAG AA token contrast | 25/25 checks pass in dark and light themes (`tokens.test.ts`) |
| Tests                  | contract 16, web 59                                           |
| 20k-row sort + filter  | under 100 ms (asserted in `table.test.ts`)                    |
