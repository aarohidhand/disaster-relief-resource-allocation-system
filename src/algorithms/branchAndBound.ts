import type { ExpandedItem, KnapsackResult, SupplyItem, BBTreeNode } from './types';
import { groupAllocations } from './helpers';

/**
 * Priority Queue (Max-Heap) for Best-First Search Branch and Bound.
 * Always explores the node with the highest optimistic upper bound first.
 */
class PriorityQueue<T> {
  private heap: T[] = [];
  private comparator: (a: T, b: T) => number;

  constructor(comparator: (a: T, b: T) => number) {
    this.comparator = comparator;
  }

  push(item: T): void {
    this.heap.push(item);
    this.siftUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.siftDown(0);
    }
    return top;
  }

  peek(): T | undefined {
    return this.heap[0];
  }

  size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private siftUp(index: number): void {
    let child = index;
    while (child > 0) {
      const parent = Math.floor((child - 1) / 2);
      if (this.comparator(this.heap[child], this.heap[parent]) > 0) {
        const tmp = this.heap[child];
        this.heap[child] = this.heap[parent];
        this.heap[parent] = tmp;
        child = parent;
      } else {
        break;
      }
    }
  }

  private siftDown(index: number): void {
    let parent = index;
    const length = this.heap.length;
    while (true) {
      const left = 2 * parent + 1;
      const right = 2 * parent + 2;
      let largest = parent;

      if (left < length && this.comparator(this.heap[left], this.heap[largest]) > 0) {
        largest = left;
      }
      if (right < length && this.comparator(this.heap[right], this.heap[largest]) > 0) {
        largest = right;
      }

      if (largest !== parent) {
        const tmp = this.heap[parent];
        this.heap[parent] = this.heap[largest];
        this.heap[largest] = tmp;
        parent = largest;
      } else {
        break;
      }
    }
  }
}

interface BBNode {
  id: string;
  level: number; // Index in sorted items
  currentWeight: number;
  currentBenefit: number;
  bound: number;
  selectedItems: ExpandedItem[];
  lastIncluded: boolean; // Symmetry breaking flag for identical units
}

/**
 * Calculates optimistic upper bound on maximum achievable profit using
 * Fractional Knapsack (Linear Relaxation).
 * Items MUST be ordered in descending order of ratio (benefit / weight).
 */
export function calculateUpperBound(
  node: { level: number; currentWeight: number; currentBenefit: number },
  items: ExpandedItem[],
  capacity: number
): number {
  if (node.currentWeight > capacity) {
    return 0; // Infeasible
  }

  let bound = node.currentBenefit;
  let remainingCapacity = capacity - node.currentWeight;
  const n = items.length;

  for (let j = node.level; j < n; j++) {
    const item = items[j];
    if (item.weight <= remainingCapacity) {
      remainingCapacity -= item.weight;
      bound += item.benefit;
    } else {
      // knapsack cannot take full item; take fractional share of remaining capacity
      bound += remainingCapacity * (item.benefit / item.weight);
      break;
    }
  }

  return bound;
}

/**
 * Solves 0/1 Knapsack using Best-First Search Branch and Bound with
 * Fractional Knapsack Upper Bounding and Symmetry-Breaking for identical units.
 * 
 * Time Complexity: Worst Case O(2^n), Average Case drastically smaller due to pruning.
 * Space Complexity: O(n * 2^n) queue storage in worst case, O(n) active depth.
 */
export function solveBranchAndBound(
  items: ExpandedItem[],
  capacity: number,
  originalSupplies: SupplyItem[]
): KnapsackResult {
  const startTime = performance.now();
  const W = Math.max(0, Math.floor(capacity));

  if (items.length === 0 || W === 0) {
    const endTime = performance.now();
    return {
      algorithm: 'Branch & Bound',
      maxBenefit: 0,
      totalWeight: 0,
      capacity: W,
      unusedCapacity: W,
      selectedItems: [],
      groupedAllocation: groupAllocations(originalSupplies, []),
      executionTimeMs: Number((endTime - startTime).toFixed(3)),
      nodesExplored: 1,
      nodesPruned: 0,
      nodesPrunedBound: 0,
      nodesPrunedCapacity: 0,
    };
  }

  // Step 1: Sort items in descending order of value-to-weight ratio (Greedy order).
  // Stable grouping by sourceSupplyId & unitIndex allows symmetry breaking among identical units.
  const sortedItems = [...items].sort((a, b) => {
    const ratioA = a.ratio;
    const ratioB = b.ratio;
    if (Math.abs(ratioB - ratioA) > 1e-9) {
      return ratioB - ratioA;
    }
    if (a.sourceSupplyId !== b.sourceSupplyId) {
      return a.sourceSupplyId.localeCompare(b.sourceSupplyId);
    }
    return a.unitIndex - b.unitIndex;
  });

  // Step 2: Establish a strong initial lower bound using a fast greedy feasible solution.
  // This enables aggressive pruning immediately from the root node.
  let currentBestBenefit = 0;
  let bestTotalWeight = 0;
  let bestSelectedItems: ExpandedItem[] = [];

  for (const item of sortedItems) {
    if (bestTotalWeight + item.weight <= W) {
      bestTotalWeight += item.weight;
      currentBestBenefit += item.benefit;
      bestSelectedItems.push(item);
    }
  }

  const pq = new PriorityQueue<BBNode>((a, b) => a.bound - b.bound);

  const rootBound = calculateUpperBound({ level: 0, currentWeight: 0, currentBenefit: 0 }, sortedItems, W);
  const rootNode: BBNode = {
    id: 'root',
    level: 0,
    currentWeight: 0,
    currentBenefit: 0,
    bound: rootBound,
    selectedItems: [],
    lastIncluded: true,
  };

  pq.push(rootNode);

  let nodesExplored = 0;
  let nodesPrunedBound = 0;
  let nodesPrunedCapacity = 0;

  let nodeIdCounter = 1;
  const MAX_EXPLORATION_SAFETY = 250000;

  while (!pq.isEmpty()) {
    const currentNode = pq.pop()!;
    nodesExplored++;

    // Prune if optimistic bound cannot beat currently known best solution
    if (currentNode.bound <= currentBestBenefit) {
      nodesPrunedBound++;
      continue;
    }

    // Leaf node reached
    if (currentNode.level >= sortedItems.length) {
      if (currentNode.currentBenefit > currentBestBenefit) {
        currentBestBenefit = currentNode.currentBenefit;
        bestTotalWeight = currentNode.currentWeight;
        bestSelectedItems = [...currentNode.selectedItems];
      }
      continue;
    }

    const currentItem = sortedItems[currentNode.level];
    const nextLevel = currentNode.level + 1;

    // Symmetry breaking: If current item is another unit of the same supply,
    // only consider INCLUDING it if the preceding unit was also included.
    const isSameSupplyAsPrev =
      currentNode.level > 0 &&
      sortedItems[currentNode.level - 1].sourceSupplyId === currentItem.sourceSupplyId;
    const canInclude = !isSameSupplyAsPrev || currentNode.lastIncluded;

    // Branch 1: INCLUDE current item
    if (canInclude) {
      const withWeight = currentNode.currentWeight + currentItem.weight;
      const withBenefit = currentNode.currentBenefit + currentItem.benefit;

      if (withWeight <= W) {
        if (withBenefit > currentBestBenefit) {
          currentBestBenefit = withBenefit;
          bestTotalWeight = withWeight;
          bestSelectedItems = [...currentNode.selectedItems, currentItem];
        }

        const withBound = calculateUpperBound(
          { level: nextLevel, currentWeight: withWeight, currentBenefit: withBenefit },
          sortedItems,
          W
        );

        if (withBound > currentBestBenefit) {
          pq.push({
            id: `node-${nodeIdCounter++}`,
            level: nextLevel,
            currentWeight: withWeight,
            currentBenefit: withBenefit,
            bound: withBound,
            selectedItems: [...currentNode.selectedItems, currentItem],
            lastIncluded: true,
          });
        } else {
          nodesPrunedBound++;
        }
      } else {
        nodesPrunedCapacity++;
      }
    }

    // Branch 2: EXCLUDE current item
    const withoutBound = calculateUpperBound(
      { level: nextLevel, currentWeight: currentNode.currentWeight, currentBenefit: currentNode.currentBenefit },
      sortedItems,
      W
    );

    if (withoutBound > currentBestBenefit) {
      pq.push({
        id: `node-${nodeIdCounter++}`,
        level: nextLevel,
        currentWeight: currentNode.currentWeight,
        currentBenefit: currentNode.currentBenefit,
        bound: withoutBound,
        selectedItems: [...currentNode.selectedItems],
        lastIncluded: false,
      });
    } else {
      nodesPrunedBound++;
    }

    if (nodesExplored >= MAX_EXPLORATION_SAFETY) {
      break;
    }
  }

  const endTime = performance.now();
  const unusedCapacity = Math.max(0, W - bestTotalWeight);

  return {
    algorithm: 'Branch & Bound',
    maxBenefit: currentBestBenefit,
    totalWeight: bestTotalWeight,
    capacity: W,
    unusedCapacity,
    selectedItems: bestSelectedItems,
    groupedAllocation: groupAllocations(originalSupplies, bestSelectedItems),
    executionTimeMs: Number((endTime - startTime).toFixed(3)),
    nodesExplored,
    nodesPruned: nodesPrunedBound + nodesPrunedCapacity,
    nodesPrunedBound,
    nodesPrunedCapacity,
  };
}

/**
 * Builds a pedagogical state-space tree for visualization on a subset of items.
 * Traces each node, including decision, current benefit/weight, calculated upper bound,
 * and exact pruning status so students can visually understand the Branch and Bound process.
 */
export function generateBBVisualizationTree(
  items: ExpandedItem[],
  capacity: number,
  maxItemsToTrace: number = 4
): {
  root: BBTreeNode;
  allNodes: BBTreeNode[];
  optimalNodeId: string;
  bestBenefit: number;
} {
  const W = Math.max(0, Math.floor(capacity));
  
  // Pick distinct representative items with highest ratios for clean tree visualization
  const sortedItems = [...items]
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, maxItemsToTrace);

  let bestBenefit = 0;
  let optimalNodeId = 'bb-root';
  const allNodes: BBTreeNode[] = [];

  const rootBound = calculateUpperBound({ level: 0, currentWeight: 0, currentBenefit: 0 }, sortedItems, W);
  const rootNode: BBTreeNode = {
    id: 'bb-root',
    level: 0,
    decision: 'root',
    currentWeight: 0,
    currentBenefit: 0,
    bound: Number(rootBound.toFixed(1)),
    status: 'explored',
    selectedItemIds: [],
    children: [],
  };

  allNodes.push(rootNode);

  let idCounter = 1;

  function buildSubtree(parentNode: BBTreeNode): void {
    if (parentNode.level >= sortedItems.length) {
      return;
    }

    const currentItem = sortedItems[parentNode.level];
    const nextLevel = parentNode.level + 1;

    // 1. INCLUDE child (Left)
    const withW = parentNode.currentWeight + currentItem.weight;
    const withB = parentNode.currentBenefit + currentItem.benefit;
    const includeNodeId = `node-${idCounter++}`;

    let includeNode: BBTreeNode;

    if (withW > W) {
      includeNode = {
        id: includeNodeId,
        level: nextLevel,
        decision: 'include',
        itemName: currentItem.name,
        itemWeight: currentItem.weight,
        itemBenefit: currentItem.benefit,
        currentWeight: withW,
        currentBenefit: withB,
        bound: 0,
        status: 'pruned-capacity',
        pruneReason: `Weight (${withW}kg) exceeds vehicle capacity (${W}kg). Infeasible branch.`,
        selectedItemIds: [...parentNode.selectedItemIds, currentItem.id],
        children: [],
      };
    } else {
      if (withB > bestBenefit) {
        bestBenefit = withB;
        optimalNodeId = includeNodeId;
      }

      const boundVal = calculateUpperBound(
        { level: nextLevel, currentWeight: withW, currentBenefit: withB },
        sortedItems,
        W
      );

      if (boundVal <= bestBenefit && nextLevel < sortedItems.length) {
        includeNode = {
          id: includeNodeId,
          level: nextLevel,
          decision: 'include',
          itemName: currentItem.name,
          itemWeight: currentItem.weight,
          itemBenefit: currentItem.benefit,
          currentWeight: withW,
          currentBenefit: withB,
          bound: Number(boundVal.toFixed(1)),
          status: 'pruned-bound',
          pruneReason: `Upper bound (${boundVal.toFixed(1)}) ≤ current best (${bestBenefit}). Subtree cannot improve optimum.`,
          selectedItemIds: [...parentNode.selectedItemIds, currentItem.id],
          children: [],
        };
      } else {
        includeNode = {
          id: includeNodeId,
          level: nextLevel,
          decision: 'include',
          itemName: currentItem.name,
          itemWeight: currentItem.weight,
          itemBenefit: currentItem.benefit,
          currentWeight: withW,
          currentBenefit: withB,
          bound: Number(boundVal.toFixed(1)),
          status: 'explored',
          selectedItemIds: [...parentNode.selectedItemIds, currentItem.id],
          children: [],
        };
        buildSubtree(includeNode);
      }
    }

    parentNode.children.push(includeNode);
    allNodes.push(includeNode);

    // 2. EXCLUDE child (Right)
    const excludeNodeId = `node-${idCounter++}`;
    const withoutW = parentNode.currentWeight;
    const withoutB = parentNode.currentBenefit;

    const withoutBound = calculateUpperBound(
      { level: nextLevel, currentWeight: withoutW, currentBenefit: withoutB },
      sortedItems,
      W
    );

    let excludeNode: BBTreeNode;

    if (withoutBound <= bestBenefit && nextLevel < sortedItems.length) {
      excludeNode = {
        id: excludeNodeId,
        level: nextLevel,
        decision: 'exclude',
        itemName: currentItem.name,
        itemWeight: currentItem.weight,
        itemBenefit: currentItem.benefit,
        currentWeight: withoutW,
        currentBenefit: withoutB,
        bound: Number(withoutBound.toFixed(1)),
        status: 'pruned-bound',
        pruneReason: `Upper bound (${withoutBound.toFixed(1)}) ≤ current best (${bestBenefit}). Subtree cannot improve optimum.`,
        selectedItemIds: [...parentNode.selectedItemIds],
        children: [],
      };
    } else {
      excludeNode = {
        id: excludeNodeId,
        level: nextLevel,
        decision: 'exclude',
        itemName: currentItem.name,
        itemWeight: currentItem.weight,
        itemBenefit: currentItem.benefit,
        currentWeight: withoutW,
        currentBenefit: withoutB,
        bound: Number(withoutBound.toFixed(1)),
        status: 'explored',
        selectedItemIds: [...parentNode.selectedItemIds],
        children: [],
      };
      buildSubtree(excludeNode);
    }

    parentNode.children.push(excludeNode);
    allNodes.push(excludeNode);
  }

  buildSubtree(rootNode);

  // Mark the optimal node
  for (const n of allNodes) {
    if (n.id === optimalNodeId) {
      n.status = 'optimal';
    }
  }

  return {
    root: rootNode,
    allNodes,
    optimalNodeId,
    bestBenefit,
  };
}
