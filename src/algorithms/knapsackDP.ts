import type { ExpandedItem, KnapsackResult, SupplyItem, DPStep, DPBacktrackStep } from './types';
import { groupAllocations } from './helpers';

/**
 * Solves the 0/1 Knapsack problem using Classical Dynamic Programming with a 2D table.
 * 
 * Recurrence:
 * If item weight <= capacity:
 *   DP[i][w] = Math.max(DP[i-1][w], benefit[i] + DP[i-1][w - weight[i]])
 * Else:
 *   DP[i][w] = DP[i-1][w]
 * 
 * Time Complexity: O(n * W)
 * Space Complexity: O(n * W)
 */
export function solveKnapsackDP(
  items: ExpandedItem[],
  capacity: number,
  originalSupplies: SupplyItem[]
): KnapsackResult {
  const startTime = performance.now();
  const n = items.length;
  const W = Math.max(0, Math.floor(capacity));

  if (n === 0 || W === 0) {
    const endTime = performance.now();
    return {
      algorithm: 'Dynamic Programming',
      maxBenefit: 0,
      totalWeight: 0,
      capacity: W,
      unusedCapacity: W,
      selectedItems: [],
      groupedAllocation: groupAllocations(originalSupplies, []),
      executionTimeMs: Number((endTime - startTime).toFixed(3)),
      dpTable: [[0]],
      dpItems: [],
    };
  }

  // Allocate DP table: (n + 1) rows x (W + 1) columns
  // dp[i][w] represents max benefit using a subset of first i items with max weight w
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Int32Array(W + 1) as unknown as number[]);

  for (let i = 1; i <= n; i++) {
    const item = items[i - 1];
    const itemWeight = Math.round(item.weight);
    const itemBenefit = Math.round(item.benefit);

    for (let w = 0; w <= W; w++) {
      if (itemWeight <= w) {
        const withoutItem = dp[i - 1][w];
        const withItem = itemBenefit + dp[i - 1][w - itemWeight];
        dp[i][w] = withItem > withoutItem ? withItem : withoutItem;
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  const maxBenefit = dp[n][W];

  // Backtracking to find the exact subset of items included
  const selectedItems: ExpandedItem[] = [];
  let currW = W;

  for (let i = n; i > 0; i--) {
    // If the value differs from the previous row, item i-1 was included
    if (dp[i][currW] !== dp[i - 1][currW]) {
      const item = items[i - 1];
      selectedItems.push(item);
      currW -= Math.round(item.weight);
    }
  }

  // Reverse so selected items follow original item order
  selectedItems.reverse();

  const totalWeight = selectedItems.reduce((sum, item) => sum + item.weight, 0);
  const unusedCapacity = Math.max(0, W - totalWeight);
  const endTime = performance.now();

  const dpTableArray: number[][] = [];
  for (let i = 0; i <= n; i++) {
    dpTableArray.push(Array.from(dp[i]));
  }

  return {
    algorithm: 'Dynamic Programming',
    maxBenefit,
    totalWeight,
    capacity: W,
    unusedCapacity,
    selectedItems,
    groupedAllocation: groupAllocations(originalSupplies, selectedItems),
    executionTimeMs: Number((endTime - startTime).toFixed(3)),
    dpTable: dpTableArray,
    dpItems: [...items],
  };
}

/**
 * Generates an educational step-by-step trace of the DP table calculation
 * for a smaller subset of items and capacity (for the forward table construction visualizer).
 */
export function generateDPTrace(
  items: ExpandedItem[],
  capacity: number
): { steps: DPStep[]; tableHistory: number[][][] } {
  const n = items.length;
  const W = Math.max(0, Math.floor(capacity));

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));
  const steps: DPStep[] = [];
  const tableHistory: number[][][] = [];

  // Snapshot initial state (all 0s)
  tableHistory.push(dp.map((row) => [...row]));

  let stepCounter = 1;

  for (let i = 1; i <= n; i++) {
    const item = items[i - 1];
    const itemWeight = Math.round(item.weight);
    const itemBenefit = Math.round(item.benefit);

    for (let w = 0; w <= W; w++) {
      const prevVal = dp[i - 1][w];
      let withVal: number | null = null;
      let chosen: number = prevVal;
      let reason: string;

      if (itemWeight <= w) {
        withVal = itemBenefit + dp[i - 1][w - itemWeight];
        if (withVal > prevVal) {
          chosen = withVal;
          reason = `Item fits (${itemWeight}kg ≤ ${w}kg). Benefit with item (${itemBenefit} + ${dp[i - 1][w - itemWeight]} = ${withVal}) > excluding item (${prevVal}). Include item.`;
        } else {
          chosen = prevVal;
          reason = `Item fits (${itemWeight}kg ≤ ${w}kg), but benefit with item (${withVal}) ≤ excluding item (${prevVal}). Exclude item.`;
        }
      } else {
        reason = `Item weight (${itemWeight}kg) > capacity (${w}kg). Cannot include. Value inherits from DP[${i - 1}][${w}] = ${prevVal}.`;
      }

      dp[i][w] = chosen;

      steps.push({
        stepIndex: stepCounter++,
        itemIndex: i,
        capacityIndex: w,
        itemName: item.name,
        itemWeight,
        itemBenefit,
        previousValue: prevVal,
        withItemValue: withVal,
        chosenValue: chosen,
        decisionReason: reason,
      });

      // Save snapshot of current table state
      tableHistory.push(dp.map((row) => [...row]));
    }
  }

  return { steps, tableHistory };
}

/**
 * Generates an educational backtracking trace for choosing items in the DP matrix
 * by comparing each cell DP[i][w] with the above row element DP[i-1][w].
 */
export function generateDPBacktrackingTrace(
  items: ExpandedItem[],
  capacity: number
): {
  steps: DPBacktrackStep[];
  dpTable: number[][];
  items: ExpandedItem[];
  finalSelectedItems: ExpandedItem[];
} {
  const n = items.length;
  const W = Math.max(0, Math.floor(capacity));

  // Build full DP table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    const item = items[i - 1];
    const itemWeight = Math.round(item.weight);
    const itemBenefit = Math.round(item.benefit);

    for (let w = 0; w <= W; w++) {
      if (itemWeight <= w) {
        const withoutItem = dp[i - 1][w];
        const withItem = itemBenefit + dp[i - 1][w - itemWeight];
        dp[i][w] = withItem > withoutItem ? withItem : withoutItem;
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }

  // Backtracking from (n, W) backwards
  const steps: DPBacktrackStep[] = [];
  const selectedItems: ExpandedItem[] = [];
  const pathHistory: { row: number; col: number; chosen: boolean }[] = [];

  let currW = W;
  let stepCounter = 1;

  for (let i = n; i > 0; i--) {
    const item = items[i - 1];
    const currentVal = dp[i][currW];
    const aboveVal = dp[i - 1][currW];
    const isChosen = currentVal !== aboveVal;

    pathHistory.push({ row: i, col: currW, chosen: isChosen });

    let nextW = currW;
    let reason = '';

    if (isChosen) {
      selectedItems.push(item);
      nextW = currW - Math.round(item.weight);
      reason = `COMPARE WITH ROW ABOVE: DP[${i}][${currW}] (${currentVal}) ≠ DP[${i - 1}][${currW}] (${aboveVal}). Because the value exceeds the element directly above, Item ${i} (${item.name}) WAS CHOSEN! Subtract weight ${item.weight}kg from remaining capacity (${currW} - ${item.weight} = ${nextW}kg). Next step inspects cell DP[${i - 1}][${nextW}].`;
    } else {
      nextW = currW;
      reason = `COMPARE WITH ROW ABOVE: DP[${i}][${currW}] (${currentVal}) === DP[${i - 1}][${currW}] (${aboveVal}). The value is identical to the row directly above, meaning Item ${i} (${item.name}) was NOT CHOSEN. Remaining capacity stays ${currW}kg. Move straight up to cell DP[${i - 1}][${nextW}].`;
    }

    steps.push({
      stepIndex: stepCounter++,
      itemIndex: i,
      capacityIndex: currW,
      item,
      currentValue: currentVal,
      aboveValue: aboveVal,
      isChosen,
      decisionReason: reason,
      nextItemIndex: i - 1,
      nextCapacityIndex: nextW,
      selectedItems: [...selectedItems],
      pathHistory: [...pathHistory],
    });

    currW = nextW;
  }

  // Add terminal base-case cell (0, currW)
  pathHistory.push({ row: 0, col: currW, chosen: false });

  return {
    steps,
    dpTable: dp,
    items,
    finalSelectedItems: [...selectedItems].reverse(),
  };
}
