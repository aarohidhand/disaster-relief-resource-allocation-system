import type { ExpandedItem, GroupedAllocation, SupplyItem } from './types';

/**
 * Read-only analysis helpers used by the portal's scenario view and the
 * Behind-the-Scenes inspector. They never alter the solvers in knapsackDP.ts /
 * branchAndBound.ts; they reuse the same integer rounding as solveKnapsackDP so
 * every number they report agrees with the DP solver exactly.
 */

interface UnitClass {
  weight: number;
  benefit: number;
  count: number;
}

function toClass(s: SupplyItem): UnitClass {
  return {
    weight: Math.round(s.unitWeight),
    benefit: Math.round(s.unitBenefit),
    count: Math.max(0, Math.floor(s.quantity)),
  };
}

/** Best achievable value for a multiset of unit classes, via the space-optimised 1D 0/1 recurrence. */
function bestValue(classes: UnitClass[], capacity: number): number {
  const W = Math.max(0, Math.floor(capacity));
  if (W === 0) return 0;
  const dp = new Int32Array(W + 1);
  for (const c of classes) {
    if (c.weight <= 0 || c.count <= 0) continue;
    for (let k = 0; k < c.count; k++) {
      for (let w = W; w >= c.weight; w--) {
        const cand = dp[w - c.weight] + c.benefit;
        if (cand > dp[w]) dp[w] = cand;
      }
    }
  }
  return dp[W];
}

/**
 * Optimal value for every budget 0..maxBudget in a single pass (O(n·W) time, O(W) space).
 * dp[b] equals solveKnapsackDP(items, b).maxBenefit for every b.
 */
export function valueByBudget(items: ExpandedItem[], maxBudget: number): Int32Array {
  const W = Math.max(0, Math.floor(maxBudget));
  const dp = new Int32Array(W + 1);
  for (const item of items) {
    const wt = Math.round(item.weight);
    const val = Math.round(item.benefit);
    if (wt <= 0) continue;
    for (let w = W; w >= wt; w--) {
      const cand = dp[w - wt] + val;
      if (cand > dp[w]) dp[w] = cand;
    }
  }
  return dp;
}

export interface GreedyResult {
  value: number;
  weight: number;
  selected: ExpandedItem[];
  countsBySupply: Map<string, number>;
}

/**
 * Greedy baseline: take units in descending impact-per-cost order while they fit.
 * Same ordering and tie-breaks as the initial lower bound inside solveBranchAndBound.
 */
export function greedyByRatio(items: ExpandedItem[], capacity: number): GreedyResult {
  const W = Math.max(0, Math.floor(capacity));
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(b.ratio - a.ratio) > 1e-9) return b.ratio - a.ratio;
    if (a.sourceSupplyId !== b.sourceSupplyId) return a.sourceSupplyId.localeCompare(b.sourceSupplyId);
    return a.unitIndex - b.unitIndex;
  });
  let weight = 0;
  let value = 0;
  const selected: ExpandedItem[] = [];
  const countsBySupply = new Map<string, number>();
  for (const item of sorted) {
    const wt = Math.round(item.weight);
    if (weight + wt <= W) {
      weight += wt;
      value += Math.round(item.benefit);
      selected.push(item);
      countsBySupply.set(item.sourceSupplyId, (countsBySupply.get(item.sourceSupplyId) ?? 0) + 1);
    }
  }
  return { value, weight, selected, countsBySupply };
}

export interface MarginalTest {
  supplyId: string;
  /** Best total if at least one more unit of this proposal is forced in (null = not applicable). */
  plusValue: number | null;
  plusDelta: number | null;
  plusReason: 'fully-funded' | 'over-budget' | 'ok';
  /** Best total if one funded unit of this proposal is forced out (null = nothing funded). */
  minusValue: number | null;
  minusDelta: number | null;
}

/**
 * "Why was this chosen / not chosen?" — for each proposal, re-optimise with one more unit forced in
 * and with one funded unit forced out. A negative delta proves the DP choice; a zero delta reveals an
 * alternative optimal plan (a tie).
 */
export function marginalAnalysis(supplies: SupplyItem[], capacity: number, grouped: GroupedAllocation[], optimum: number): MarginalTest[] {
  const W = Math.max(0, Math.floor(capacity));
  const classes = supplies.map(toClass);
  const fundedById = new Map(grouped.map((g) => [g.supplyId, g.quantitySelected]));

  return supplies.map((s, idx) => {
    const c = classes[idx];
    const funded = fundedById.get(s.id) ?? 0;
    const test: MarginalTest = {
      supplyId: s.id,
      plusValue: null,
      plusDelta: null,
      plusReason: 'ok',
      minusValue: null,
      minusDelta: null,
    };

    if (funded >= c.count) {
      test.plusReason = 'fully-funded';
    } else {
      const forced = funded + 1;
      const remaining = W - forced * c.weight;
      if (remaining < 0) {
        test.plusReason = 'over-budget';
      } else {
        const pool = classes.map((cl, j) => (j === idx ? { ...cl, count: cl.count - forced } : cl));
        const v = forced * c.benefit + bestValue(pool, remaining);
        test.plusValue = v;
        test.plusDelta = v - optimum;
      }
    }

    if (funded > 0) {
      const pool = classes.map((cl, j) => (j === idx ? { ...cl, count: funded - 1 } : cl));
      const v = bestValue(pool, W);
      test.minusValue = v;
      test.minusDelta = v - optimum;
    }
    return test;
  });
}

export interface TabulationStats {
  rows: number;
  cols: number;
  cells: number;
  evaluations: number;
  includeWins: number;
  ties: number;
  infeasible: number;
}

/** Counts how each DP cell was decided, straight from the solver's table. */
export function tabulationStats(dpTable: number[][], items: ExpandedItem[]): TabulationStats {
  const rows = dpTable.length;
  const cols = rows > 0 ? dpTable[0].length : 0;
  let includeWins = 0;
  let ties = 0;
  let infeasible = 0;
  for (let i = 1; i < rows; i++) {
    const wt = Math.round(items[i - 1]?.weight ?? 0);
    const val = Math.round(items[i - 1]?.benefit ?? 0);
    const prev = dpTable[i - 1];
    const cur = dpTable[i];
    for (let w = 0; w < cols; w++) {
      if (wt > w) {
        infeasible++;
        continue;
      }
      if (cur[w] !== prev[w]) includeWins++;
      else if (val + prev[w - wt] === prev[w]) ties++;
    }
  }
  return {
    rows,
    cols,
    cells: rows * cols,
    evaluations: Math.max(0, rows - 1) * cols,
    includeWins,
    ties,
    infeasible,
  };
}

export interface MiniInstance {
  items: ExpandedItem[];
  capacity: number;
  greedyValue: number;
  optimalValue: number;
}

function bruteForceBest(items: ExpandedItem[], capacity: number): number {
  let best = 0;
  const n = items.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    let w = 0;
    let v = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        w += Math.round(items[i].weight);
        v += Math.round(items[i].benefit);
      }
    }
    if (w <= capacity && v > best) best = v;
  }
  return best;
}

/** One representative unit per proposal, in register order (used for small readable instances). */
export function representativeUnits(supplies: SupplyItem[]): ExpandedItem[] {
  return supplies
    .filter((s) => s.quantity > 0 && s.unitWeight > 0)
    .map((s) => ({
      id: `${s.id}-u1`,
      sourceSupplyId: s.id,
      name: s.name,
      weight: s.unitWeight,
      benefit: s.unitBenefit,
      destination: s.destination,
      unitIndex: 1,
      totalUnits: 1,
      ratio: s.unitWeight > 0 ? s.unitBenefit / s.unitWeight : 0,
      category: s.category,
    }));
}

export function evaluateMini(items: ExpandedItem[], capacity: number): MiniInstance {
  return {
    items,
    capacity,
    greedyValue: greedyByRatio(items, capacity).value,
    optimalValue: bruteForceBest(items, capacity),
  };
}

/**
 * Finds a small instance from the live proposals (one unit each, 4 proposals, budget ≤ maxBudget)
 * where greedy-by-ratio is strictly worse than the optimum — the classic reason 0/1 Knapsack needs DP.
 * Prefers the narrowest table, then the largest greedy shortfall.
 */
export function findGreedyCounterexample(supplies: SupplyItem[], size = 4, maxBudget = 30): MiniInstance | null {
  const units = representativeUnits(supplies).filter((u) => Math.round(u.weight) <= maxBudget);
  if (units.length < size) return null;
  let best: MiniInstance | null = null;
  const combo: number[] = [];

  const consider = (picked: ExpandedItem[]) => {
    const total = picked.reduce((s, u) => s + Math.round(u.weight), 0);
    // every unit must fit on its own, so each table row teaches something
    const heaviest = Math.max(...picked.map((u) => Math.round(u.weight)));
    for (let W = Math.max(10, heaviest); W <= Math.min(maxBudget, total - 1); W++) {
      if (best && W > best.capacity) break;
      const g = greedyByRatio(picked, W).value;
      const o = bruteForceBest(picked, W);
      if (g < o) {
        const cand: MiniInstance = { items: picked, capacity: W, greedyValue: g, optimalValue: o };
        if (!best || W < best.capacity || (W === best.capacity && o - g > best.optimalValue - best.greedyValue)) best = cand;
        break;
      }
    }
  };

  const walk = (start: number) => {
    if (combo.length === size) {
      consider(combo.map((i) => units[i]));
      return;
    }
    for (let i = start; i < units.length; i++) {
      combo.push(i);
      walk(i + 1);
      combo.pop();
    }
  };
  walk(0);
  return best;
}
