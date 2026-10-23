# Resource Allocation & Decision Support Portal

**Design and Analysis of Algorithms (DAA) course project — the 0/1 Knapsack problem applied to government resource allocation.**

A decision-support portal that a resource planning team could use to allocate a fixed fiscal budget across relief procurement proposals. Behind the portal, an exact **0/1 Knapsack dynamic-programming** solver chooses the funding plan, and a **Branch and Bound** solver independently verifies it. A toggleable **Behind the Scenes (DAA view)** inspector shows, on the live data, how the algorithm reaches every number on screen.

> Academic prototype. The directorate, programme and all proposals, costs and impact scores are synthetic.

---

## The problem

A disaster relief fund has a total fiscal budget for the cycle. Districts submit proposals, each requesting a number of identical resource units (trauma kit batches, tent clusters, water purification lots, and so on). Every unit has a cost and a projected social-impact score. Demand (₹1,996 lakh in the reference dataset) exceeds the budget (₹1,000 lakh), so the portal must decide which units to fund.

Each unit is indivisible — it is funded or deferred — which makes this a 0/1 Knapsack problem:

$$\max \sum_{i=1}^{n} v_i x_i \quad \text{subject to} \quad \sum_{i=1}^{n} w_i x_i \le W, \qquad x_i \in \{0, 1\}$$

| Portal term | Knapsack symbol | Reference dataset |
|---|---|---|
| Total fiscal budget (₹ lakh) | $W$ (capacity) | 1,000 |
| Unit cost (₹ lakh) | $w_i$ (weight) | 2 – 35 |
| Projected social impact per unit | $v_i$ (value) | 35 – 195 |
| Resource units after expanding every proposal's quantity | $n$ | 238 (from 12 proposals) |
| Fund or defer unit $i$ | $x_i \in \{0,1\}$ | 171 funded |
| Total impact score | $\sum v_i x_i = DP[n][W]$ | 12,360 |
| Approved / Partial / Deferred | all / some / none of a proposal's units have $x_i = 1$ | 7 / 1 / 4 |

A proposal requesting $q$ units is a bounded choice (fund 0…$q$). `expandSupplies()` turns it into $q$ separate 0/1 items, so the standard 0/1 recurrence applies.

---

## Algorithms (unchanged core logic)

The solvers in `src/algorithms/` (`knapsackDP.ts`, `branchAndBound.ts`, `helpers.ts`, `verification.ts`, `types.ts`) are untouched by the UI refactor. Results are identical to the previous version at every budget.

### 0/1 Knapsack — dynamic programming (the plan)
- **Table:** $DP[i][w]$ = best impact using the first $i$ units within budget $w$; $(n+1) \times (W+1)$ cells.
- **Recurrence:** if $w_i \le w$, $DP[i][w] = \max(DP[i-1][w],\ v_i + DP[i-1][w - w_i])$; otherwise $DP[i][w] = DP[i-1][w]$.
- **Backtracking:** from $DP[n][W]$, a value that differs from the cell above means unit $i$ was funded; move to column $w - w_i$.
- **Time** $O(n \cdot W)$ (pseudo-polynomial) · **Space** $O(n \cdot W)$.

### Branch and Bound — best-first search (the verification)
- Max-heap priority queue on the fractional-knapsack upper bound; greedy solution as the starting incumbent.
- Prunes when cost exceeds $W$ or the bound cannot beat the best solution found; symmetry breaking for identical units.
- **Time** $O(2^n)$ worst case, usually far less after pruning.

The portal shows "Plan verified as optimal" when both solvers report the same maximum impact.

---

## The portal

| View | What an analyst does there |
|---|---|
| **Overview** | KPI ribbon (total budget, allocated funds, remaining reserve, total impact, utilization), budget control, funding by sector, proposal outcomes, unfunded requests, distribution by zone, top contributors |
| **Proposal register** | Search, filter and sort proposals; add, edit or remove them (validated form); load the reference dataset; export the plan |
| **Allocation plan** | The optimal plan for every proposal with Approved / Partial / Deferred status, sortable and filterable, with totals, print and CSV export |
| **Scenario analysis** | Achievable impact for every budget from ₹0 to just beyond total demand (one O(n·W) pass), marginal impact per extra ₹100 L, and full re-optimisation at common envelope sizes |

The KPI ribbon is visible on every page, and its bottom edge doubles as the utilization meter (emerald = allocated, amber = unallocated reserve).

## Behind the Scenes (DAA view)

Toggle **Behind the scenes** in the navigation bar. The inspector slides over the portal, or docks beside it on wide screens (≥1440 px) so both update together. It receives the same objects the portal renders — the expanded items, the DP result including its full table, and the Branch and Bound result — and has its own budget slider wired to the same state.

| Tab | Shows |
|---|---|
| **Problem mapping** | The formal model with live values, a portal-field → symbol table, and the unit expansion (one square per $x_i$, filled when funded) |
| **DP execution** | The solver's real $(n+1) \times (W+1)$ table as a heatmap (coloured by value or by decision), an animated row-by-row tabulation, an animated backtracking path with a running total that ends at $DP[n][W]$, a cell inspector that evaluates the recurrence with real numbers, and a readable cell-by-cell walkthrough on a small instance built from your own proposals (with a "find a case where greedy fails" button) |
| **Decision trace** | Why each proposal got its funding: DP vs greedy-by-ratio across all budgets, and a re-optimisation with one unit forced in or out of every proposal |
| **Code & complexity** | The project's own solver source (loaded with Vite `?raw`), annotated with how often each line ran; live time/space complexity figures, measured run time, a 7-run benchmark and a scaling test that shows run time growing linearly in $W$ |
| **Cross-check (B&B)** | DP vs Branch and Bound side by side, pruning statistics, agreement across 20 budgets, and a step-through state-space tree on four of your proposals |
| **Viva guide** | A 13-step demonstration route and short answers to likely viva questions |

Press <kbd>Esc</kbd> to close the inspector. Its tabs support arrow-key navigation, and the DP table accepts arrow keys (hold <kbd>Shift</kbd> to move 10 cells).

---

## Viva demonstration (about ten minutes)

1. **Overview:** read the KPI ribbon and the "plan verified as optimal" banner.
2. **Proposal register:** 12 proposals, 238 units. Edit one and watch the plan recompute.
3. **Change the budget** to ₹500 L: statuses, reserve and utilization update. Return to ₹1,000 L.
4. **Allocation plan:** sort by impact secured; filter to Partial (some units of a proposal funded).
5. **Scenario analysis:** diminishing returns in the impact curve and the marginal bars.
6. **Open Behind the scenes → Problem mapping:** $W$, $w_i$, $v_i$, $n$ on live data.
7. **DP execution → Tabulation:** press Play; click any cell to read its recurrence.
8. **Backtracking:** use "Next funded unit"; the funded impact sums to exactly $DP[n][W]$.
9. **Readable walkthrough:** "Find a case where greedy fails", then step through each cell.
10. **Decision trace:** greedy vs DP and the ±1-unit proofs.
11. **Code & complexity:** run the scaling test (pseudo-polynomial in practice).
12. **Cross-check:** both solvers agree at 20 budgets; step through the state-space tree.
13. **Dock the inspector** (wide screen) and drag the budget: both sides react.

---

## Project structure

```
src/
  algorithms/            core solvers (unchanged) + analysis.ts (read-only helpers for the inspector)
    knapsackDP.ts        solveKnapsackDP, generateDPTrace, generateDPBacktrackingTrace
    branchAndBound.ts    solveBranchAndBound, calculateUpperBound, generateBBVisualizationTree
    helpers.ts           expandSupplies, groupAllocations
    verification.ts      verifySolutions
    analysis.ts          valueByBudget, greedyByRatio, marginalAnalysis, tabulationStats, findGreedyCounterexample
    demoData.ts          reference dataset (12 proposals) and default budget
  components/
    layout/              portal header + BTS toggle, KPI ribbon, page header, footer
    portal/              budget control, sector/zone/outcome panels, proposal form
    ui/                  status badge, sortable header, modal/confirm dialog, toast
    bts/                 the Behind the Scenes inspector (lazy-loaded)
  lib/                   formatting (₹ lakh, Indian digit grouping), plan view-model, sorting, code highlighter
  pages/                 Overview, ProposalRegister, AllocationPlan, ScenarioAnalysis
  App.tsx                state + data flow: register → expandSupplies → DP → B&B → verify → views
```

**Data flow.** `App.tsx` keeps the same state as before (`supplies`, `capacity`) and derives everything with `useMemo`: expanded items → DP result → Branch and Bound result → verification → plan lines and summary. The portal pages and the inspector are pure views of that state.

The model fields keep their knapsack names (`unitWeight`, `unitBenefit`, `quantity`); only the interface labels them as unit cost, impact and units. The reference dataset keeps the original numbers, relabelled as procurement lots so a per-unit cost in ₹ lakh reads plausibly.

---

## Tech stack

React 19 + TypeScript · Vite 8 · Tailwind CSS 3 (with container queries) · Recharts · Lucide icons · Public Sans and JetBrains Mono (bundled via Fontsource, so the demo works offline)

## Running locally

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173/
npm run build    # type-check and build to dist/
npm run lint     # oxlint (build output is ignored)
```
