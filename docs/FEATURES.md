# FinTrix: Feature Guide

FinTrix is a policy stress-testing workspace. A regulator picks a market policy (interest rate, margin requirement, circuit breaker) and runs hundreds of simulated markets under it. FinTrix then shows how much risk the policy adds or removes, on a synthetic market or one calibrated to a real period such as the 2007–09 crisis.

> **Status:** the Policy Lab runs on an in-browser simulator (labelled _Synthetic_ in the app). The C++/OpenMP/MPI HPC engine described in the build plan replaces it in a later step. The screens stay the same and only the data source changes.

![Policy Lab, S&P 500 2007–09](screenshots/lab-sp500-2007-09.png)

---

## Contents

1. [Running it](#1-running-it)
2. [Screen layout](#2-screen-layout)
3. [Policies (the watchlist)](#3-policies-the-watchlist)
4. [Markets: synthetic and real periods](#4-markets-synthetic-and-real-periods)
5. [The chart](#5-the-chart)
6. [Risk details](#6-risk-details)
7. [Reality check](#7-reality-check)
8. [Bottom panel: scenarios, event log, model notes](#8-bottom-panel)
9. [Policy settings panel](#9-policy-settings-panel)
10. [Compare all](#10-compare-all)
11. [How the simulation works](#11-how-the-simulation-works)
12. [Glossary of risk metrics](#12-glossary-of-risk-metrics)
13. [Keyboard shortcuts and navigation](#13-keyboard-shortcuts-and-navigation)
14. [Themes, layout and accessibility](#14-themes-layout-and-accessibility)
15. [Component gallery](#15-component-gallery)
16. [Engineering features](#16-engineering-features)
17. [Known limitations](#17-known-limitations)
18. [Demo script (3 minutes)](#18-demo-script-3-minutes)

---

## 1. Running it

```bash
cd fintrix
pnpm install
pnpm dev            # open http://localhost:5173
```

| Command                                       | What it does                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| `pnpm dev`                                    | Starts the app with hot reload                                                  |
| `make check`                                  | Lint, typecheck, all tests, production build and bundle-size check (same as CI) |
| `node apps/web/scripts/fetch-market-data.mjs` | Re-downloads the real market data (needs internet)                              |

---

## 2. Screen layout

The workspace follows a trading-terminal layout (TradingView-style):

```
┌──────────────────────────── Top toolbar ────────────────────────────┐
│ Logo │ Policy ▾ │ Market ▾ │ Bar size │ Band │ Compare all │ Run    │
├──┬───────────────────────────────────────────┬──────────────────┬──┤
│  │                                           │  Watchlist       │  │
│R │              Chart                        ├──────────────────┤W │
│a │                                           │  Risk details    │i │
│i │                                           │  + Reality check │d │
│l ├───────────────────────────────────────────┤                  │g │
│  │  Bottom panel: Scenarios | Event log | …  │                  │e │
└──┴───────────────────────────────────────────┴──────────────────┴──┘
```

| Area             | Purpose                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| **Left rail**    | Switch screens: Policy Lab, Component gallery                                                        |
| **Top toolbar**  | Policy picker, market picker, bar size, band toggle, Compare all, Run, search (Ctrl+K), theme toggle |
| **Chart**        | Simulated price candles, volume, scenario band, actual index overlay                                 |
| **Right panel**  | Watchlist of policies plus Risk details, or Policy settings (switch with the icons on the far right) |
| **Bottom panel** | Scenario table, event log, model explanation                                                         |

Panels are **resizable**: drag the thin gutters, or focus a gutter and use the arrow keys. The bottom panel collapses with the chevron. Sizes and choices are remembered between visits.

---

## 3. Policies (the watchlist)

Each policy is listed like a stock ticker. Each one is the Baseline with **one setting changed**, so you can see the effect of that setting alone.

| Ticker     | Name         | Rate    | Margin  | Breaker | Question it answers                                  |
| ---------- | ------------ | ------- | ------- | ------- | ---------------------------------------------------- |
| **BASE**   | Baseline     | 4.5%    | 25%     | 7%      | The reference point                                  |
| **MRG50**  | Tight margin | 4.5%    | **50%** | 7%      | What if traders must post half the position in cash? |
| **MRG5**   | Loose margin | 4.5%    | **5%**  | 7%      | What if traders can borrow heavily (high leverage)?  |
| **CB20**   | Wide breaker | 4.5%    | 25%     | **20%** | What if trading halts only on huge moves?            |
| **RATE10** | Rate hike    | **10%** | 25%     | 7%      | What if the central bank raises rates sharply?       |

**Columns**

- **VaR 99**: the headline risk number (see [glossary](#12-glossary-of-risk-metrics)). Lower is safer.
- **vs BASE**: the difference from Baseline in **percentage points (pp)**. Green means safer and red means riskier. BASE shows `ref`.

**Using it**

- Click a row to load and run that policy.
- Change any slider and the ticker becomes **CUSTOM**.
- Switching market clears the watchlist, because numbers from different markets aren't comparable.

---

## 4. Markets: synthetic and real periods

Open the **globe** button in the toolbar to choose the market the policies are tested on.

| Market                 | Tick =        | Period                               | Notes                                         |
| ---------------------- | ------------- | ------------------------------------ | --------------------------------------------- |
| **Synthetic**          | 1 minute      | 2,000 minutes (~5 trading days)      | Default; no real data                         |
| **S&P 500 · 2007–09**  | 1 trading day | 3 Jan 2007 – 31 Dec 2009 (756 days)  | Global Financial Crisis                       |
| **S&P 500 · 2024–25**  | 1 trading day | 2 Jan 2024 – 31 Dec 2025 (502 days)  | Recent bull market with the Apr 2025 sell-off |
| **NIFTY 50 · 2007–09** | 1 trading day | 17 Sep 2007 – 31 Dec 2009 (558 days) | Starts Sep 2007 (source history limit)        |
| **NIFTY 50 · 2024–25** | 1 trading day | 1 Jan 2024 – 31 Dec 2025 (495 days)  | Recent Indian market                          |

### What happens when you pick a real period

1. **Real data loads**: daily open/high/low/close from Yahoo Finance, stored in `apps/web/src/data/market/`. It's committed, so the app works offline.
2. **Calibration**: before each run, the model tunes two numbers (noise level and trend) so that the **Baseline policy reproduces that period's real volatility and average trend**.
3. **Policies run on the calibrated market**: any difference between policies comes from the policy alone.
4. **The chart switches to real dates** and draws the **actual index in orange** (rebased to 100 on day 1).
5. **Ticks lock** to the number of trading days in the period, and bar sizes become **1D / 1W / 1M**.

### Calibration accuracy (Baseline policy)

| Period           | Real volatility | Model volatility |
| ---------------- | --------------- | ---------------- |
| S&P 500 2007–09  | 30.0%           | 30.1%            |
| S&P 500 2024–25  | 15.9%           | 16.0%            |
| NIFTY 50 2007–09 | 39.0%           | 39.1%            |

### Data checks

Automated tests confirm the stored data matches known history:

- S&P 500 peak: **9 Oct 2007**
- S&P 500 trough: **9 Mar 2009**
- S&P 500 drawdown: **about 57%**
- S&P 500 worst day: **15 Oct 2008 (−9.0%)**
- NIFTY drawdown in the crisis: **over 55%**

---

## 5. The chart

Built with TradingView's open-source `lightweight-charts` library.

| Element                        | Meaning                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Candles**                    | Scenario 0's simulated price. Green = up bar, red = down bar                                     |
| **Amber candles + "CB" arrow** | Bars where the circuit breaker halted trading                                                    |
| **Volume bars** (bottom)       | Simulated trading activity                                                                       |
| **Dashed blue lines**          | The **P5 and P95 band**: 90% of all simulated scenarios fall between these lines                 |
| **Dotted blue line**           | The **median** across all scenarios                                                              |
| **Orange line**                | The **actual index** (real periods only), rebased to 100                                         |
| **Legend** (top left)          | Date (real periods), O/H/L/C, % change, `HALTED` flag, actual value. Follows the mouse crosshair |

**Controls**

- **Bar size:** 5T / 10T / 50T ticks for the synthetic market; 1D / 1W / 1M for real periods.
- **Band** toggle: show or hide the scenario band.
- **Zoom:** mouse wheel. **Pan:** drag. **Rescale price axis:** drag the axis.

---

## 6. Risk details

Shows the results of the current run, each with its difference from BASE.

| Metric                 | Meaning                                          |
| ---------------------- | ------------------------------------------------ |
| VaR 95 / VaR 99        | Bank loss exceeded in only 5% / 1% of scenarios  |
| Exp. shortfall 95 / 99 | Average loss in the worst 5% / 1% of scenarios   |
| Volatility (ann.)      | How much prices swing, per year                  |
| Max drawdown           | Average worst peak-to-trough fall                |
| Breaker halts          | Total circuit-breaker halts across all scenarios |
| Bank defaults          | Average banks (of 20) that fail per scenario     |

Below the metrics is a **plain-English summary**, for example _"High tail risk: in the worst 1% of cases banks lose 41.9% or more. Bank failures spread: ~9.2 defaults per scenario."_ It also shows how many scenarios ran and how long they took.

**Deltas:**

- **Percentages:** shown in percentage points (`+12.10 pp`).
- **Counts:** shown as absolute differences (`+1,295`).
- They're never shown as ratios. A ratio gives the wrong answer when values are negative or near zero.

---

## 7. Reality check

Appears under Risk details when a real market is selected. It answers: **does the model behave like the real market did?**

| Row          | Actual                    | Model (median)                                    |
| ------------ | ------------------------- | ------------------------------------------------- |
| Total return | What the index really did | The middle simulated outcome                      |
| Max drawdown | Real worst fall           | Average simulated worst fall                      |
| Volatility   | Real                      | Simulated (should match, because it's calibrated) |

It also reports:

- the **worst real day** and its date
- **where the actual outcome falls** among the simulated paths (for example "ended below 61% of simulated paths")
- **band coverage**: the share of the time the real index stayed inside the 5–95% band
- the **peak and trough dates**
- the **data source and fetch date**

---

## 8. Bottom panel

### Scenarios tab

One row per simulated market (default 500). The table is virtualised, so it handles 20,000+ rows smoothly.

| Column             | Meaning                                                                         |
| ------------------ | ------------------------------------------------------------------------------- |
| # / Seed           | Scenario number and its random seed (re-running the seed reproduces it exactly) |
| Bank loss          | Loss of the leveraged bank portfolio in that scenario (red = loss)              |
| Final price        | Price at the end (started at 100)                                               |
| Volatility, Max DD | Swing size and worst fall in that scenario                                      |
| Halts, Defaults    | Breaker halts and bank failures in that scenario                                |

- **Sort:** click a header (ascending → descending → off).
- **Filter:** type in the box (it searches all columns).
- **Resize a column:** drag its edge, or focus the edge and use the arrow keys.
- **Keyboard:** ↑/↓, PageUp/PageDown, Home/End.

### Event log tab

Every event in scenario 0:

- **Circuit breaker**: a move hit the limit and trading halted
- **Resumed**: trading restarted
- **Default**: a bank failed, with its loss and buffer

It shows dates for real periods and tick numbers for the synthetic market.

### About the model tab

A short in-app explanation of the model (summarised in [section 11](#11-how-the-simulation-works)).

---

## 9. Policy settings panel

Open it with the **sliders icon** on the far right.

| Setting            | Range             | Effect                                                            |
| ------------------ | ----------------- | ----------------------------------------------------------------- |
| Interest rate      | 0–20%             | Higher rates slow the "fair value" growth of the market           |
| Margin requirement | 1–100%            | Cash traders must post; **leverage = 1 ÷ margin** (capped at 10×) |
| Circuit breaker    | 1–50%             | Daily move (from the session open) that halts trading             |
| Agents             | 1,000 – 1,000,000 | More agents means individual randomness averages out              |
| Ticks              | 200 – 10,000      | Length of each simulated market (locked for real periods)         |
| Scenarios          | 20 – 2,000        | How many markets to simulate                                      |
| Seed               | 0 – 4,294,967,295 | Same seed gives identical results                                 |

- **Number fields** accept `1,000,000` or `1e6`. Use ↑/↓ to step, Shift+↑/↓ to step ×10, and invalid input shows a specific message.
- **Estimated runtime** is shown before you run, based on measured speed.
- **Reset** restores the defaults. Settings are remembered between visits.

---

## 10. Compare all

**Compare all** in the toolbar runs all five policies one after another on the current market (about 1.5 s in total) and fills the watchlist. Use it to see every policy side by side in one click.

---

## 11. How the simulation works

Each **Run** simulates several hundred independent markets in a background thread (Web Worker), so the screen never freezes. Every market follows these steps:

1. **Start** at price 100.
2. **Every tick, three kinds of traders act:**
   - **Fundamentalists** push the price toward a "fair value". Fair value grows more slowly when interest rates are higher.
   - **Chartists** follow trends. Their strength grows with leverage, so **low margin means stronger feedback loops, bubbles and crashes**.
   - **Noise traders** add randomness.
3. **Circuit breaker:** if the price moves more than the threshold from the session's open, trading stops at the limit price. The halt resets trend-chasing, which is the point of a breaker. Minute ticks pause for up to 30 minutes; daily ticks halt for the rest of the day.
4. **Banks:** at the end, 20 banks take losses on their leveraged positions. A bank whose loss exceeds its margin buffer **defaults**, and each default **spreads losses** to the others (contagion), which can cause a cascade.
5. **Risk:** the losses from all scenarios are sorted, and the worst 1% sets **VaR 99**.

**Reproducibility:** each scenario has its own seed, so results are identical every time and never depend on how work is split across threads. The HPC engine follows the same rule when it spreads scenarios across cores (OpenMP) and machines (MPI).

**Research basis:**

- Trader types follow heterogeneous-agent market models: Brock & Hommes 1998; Lux & Marchesi 1999.
- Leverage amplifying swings follows the leverage cycle: Geanakoplos; Brunnermeier & Pedersen 2009.
- Bank contagion follows network contagion models: Eisenberg & Noe 2001; Gai & Kapadia 2010.
- The risk measures follow Basel banking standards.

---

## 12. Glossary of risk metrics

| Term                              | Plain meaning                                                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **VaR 99 (Value at Risk)**        | "Banks lose this much or more only 1 time in 100." A **negative** VaR means even the worst 1% of outcomes are gains (common in bull markets). |
| **VaR 95**                        | Same idea, 1 time in 20                                                                                                                       |
| **Expected shortfall (ES)**       | The average loss _when things are already that bad_. Always ≥ VaR.                                                                            |
| **Volatility (annualised)**       | Typical yearly size of price swings. ~15% is calm; 30–40% is crisis-level.                                                                    |
| **Max drawdown**                  | Largest fall from a peak to a later low                                                                                                       |
| **Leverage**                      | Borrowed exposure. At 5% margin you control 20× your cash (capped at 10× in the model).                                                       |
| **Circuit breaker**               | An exchange rule that halts trading after a large move                                                                                        |
| **Contagion / cascading default** | One bank's failure causes losses that make others fail                                                                                        |
| **pp (percentage points)**        | Plain difference between two percentages: 54% − 42% = +12 pp                                                                                  |
| **Scenario / seed**               | One simulated market and the number that determines its randomness                                                                            |
| **P5 / P95 band**                 | The range that 90% of simulated prices fall within                                                                                            |

---

## 13. Keyboard shortcuts and navigation

| Keys                                    | Action                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------- |
| **Ctrl/Cmd + Enter**                    | Run the simulation                                                         |
| **Ctrl/Cmd + K**                        | Command palette: run, compare all, load any policy, change theme, navigate |
| **Tab / Shift+Tab**                     | Move between controls (focus rings always visible)                         |
| **Arrow keys** on a gutter              | Resize panels                                                              |
| **↑ ↓ PgUp PgDn Home End** in a table   | Move through rows                                                          |
| **↑ / ↓** (Shift ×10) in a number field | Step the value                                                             |
| **Esc**                                 | Close a popover, dialog or palette                                         |

---

## 14. Themes, layout and accessibility

- **Dark and light themes** (moon/sun icon, or the palette). Both are designed intentionally, and "match system" is also available.
- **Remembered preferences:** theme, panel sizes, open tabs, chosen market, policy and settings.
- **Accessibility:**
  - Text contrast meets **WCAG 2.2 AA** in both themes. This is enforced by automated tests, not checked by eye.
  - Every control works by keyboard, and icon buttons have labels.
  - The chart has a screen-reader text summary.
  - Colour is never the only signal: every status has a text label.
  - Animations switch off when the system is set to reduce motion.
- **Colour-blind-safe** policy colours (Okabe–Ito palette).

---

## 15. Component gallery

The rail's grid icon opens `/gallery`, a page showing every UI building block in every state (normal, hover, focus, disabled, loading, error, empty). It also shows a 20,000-row table, toasts, dialogs and the command palette. It's for developers and reviewers checking design consistency.

---

## 16. Engineering features

| Area                | What's in place                                                                                                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Performance**     | Simulation runs in a Web Worker and hands results back with zero copying. The chart legend updates without re-rendering React. Tables are virtualised. The chart and market data are lazy-loaded. **Initial JavaScript: 104 KB gzipped** (budget 180 KB, enforced at build time). |
| **Shared contract** | `packages/contract` defines every message between the UI, gateway, supervisor and C++ engine in one JSON Schema, with generated TypeScript types.                                                                                                                                 |
| **Design system**   | All colours and sizes come from tokens (`apps/web/src/styles/tokens.css`). One-off colours are impossible because Tailwind's defaults are removed.                                                                                                                                |
| **Testing**         | 94 automated tests, including: contract validation, colour contrast, number parsing, table sort/filter speed, simulator determinism and policy effects, calibration accuracy against 2007–09, the historical data checks, and the risk-delta sign regression.                     |
| **Quality gates**   | `make check` / CI run formatting, lint, strict typecheck, tests, build and the bundle budget.                                                                                                                                                                                     |
| **Decisions log**   | Every trade-off is recorded in `docs/decisions.md`.                                                                                                                                                                                                                               |

---

## 17. Known limitations

Say these openly if asked:

- **The simulator is synthetic and simplified.** Traders are grouped by type, not simulated one by one. The C++ engine (next phase) simulates individual agents with real order books.
- **Crash depth is underestimated on real periods.** The model's random shocks are "normal" (thin-tailed), so it reproduces volatility but not extreme days such as −9% or −12%. For example, the S&P 2007–09 drawdown is about −43% in the model versus −57% in reality. The Reality check shows this gap.
- **The wide breaker (CB20) often shows no change**, for the same reason: the model rarely produces 7% single-day moves.
- **Model constants are chosen, not fitted:** trend-chasing strength, number of banks, contagion size and halt length. Only volatility and trend are calibrated.
- **Not a price forecast.** FinTrix compares the _relative_ effect of policies, and doesn't predict markets.
- **Market data** comes from Yahoo Finance for academic, non-commercial use. NIFTY's 2007–09 window starts in September 2007.

---

## 18. Demo script (3 minutes)

1. **Open the app (Synthetic, BASE).** "Each candle is simulated trading. The dashed band shows where 90% of 500 simulated markets ended up."
2. **Press Compare all.** "Five policies, 2,500 markets, in about 1.5 seconds. Tight margin cuts tail risk; loose margin raises it."
3. **Globe → S&P 500 · 2007–09, then Compare all.** "The model is now calibrated to the real crisis; volatility matches within 0.1%. The orange line is what the S&P 500 actually did. Loose margin raises VaR 99 by 12 points and bank failures spread."
4. **Click MRG5 and open the Event log.** "Here are the breaker halts and the bank defaults, with dates."
5. **Globe → S&P 500 · 2024–25, then Compare all.** "In a bull market, loose margin _looks_ safer, because leverage multiplies gains. That's why policies must be tested against crises too."
6. **Point to the Reality check.** "Volatility matches, but real crashes were deeper than the model, because real markets have more extreme days. That's our next improvement."
7. **Close.** "Today this runs in the browser. Our C++ engine runs the same scenarios in parallel with OpenMP and MPI, survives a crashed worker and returns identical results. The UI stays the same."
