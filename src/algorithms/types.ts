export interface SupplyItem {
  id: string;
  name: string;
  unitWeight: number; // in kg
  unitBenefit: number; // priority score / humanitarian benefit
  quantity: number; // available units
  destination: string;
  category: 'Medical' | 'Food & Water' | 'Shelter' | 'Sanitation' | 'Energy';
}

export interface ExpandedItem {
  id: string; // e.g. "supply1-unit1"
  sourceSupplyId: string;
  name: string;
  weight: number;
  benefit: number;
  destination: string;
  unitIndex: number; // 1-based index
  totalUnits: number;
  ratio: number; // benefit / weight
  category: string;
}

export interface GroupedAllocation {
  supplyId: string;
  name: string;
  destination: string;
  category: string;
  unitWeight: number;
  unitBenefit: number;
  quantitySelected: number;
  totalAvailable: number;
  totalWeight: number;
  totalBenefit: number;
  ratio: number;
}

export interface KnapsackResult {
  algorithm: 'Dynamic Programming' | 'Branch & Bound';
  maxBenefit: number;
  totalWeight: number;
  capacity: number;
  unusedCapacity: number;
  selectedItems: ExpandedItem[];
  groupedAllocation: GroupedAllocation[];
  executionTimeMs: number;
  dpTable?: number[][];
  dpItems?: ExpandedItem[];
  nodesExplored?: number;
  nodesPruned?: number;
  nodesPrunedBound?: number;
  nodesPrunedCapacity?: number;
}

export interface BBTreeNode {
  id: string;
  level: number; // index of item considered
  decision: 'root' | 'include' | 'exclude';
  itemName?: string;
  itemWeight?: number;
  itemBenefit?: number;
  currentWeight: number;
  currentBenefit: number;
  bound: number;
  status: 'explored' | 'pruned-capacity' | 'pruned-bound' | 'solution' | 'optimal';
  pruneReason?: string;
  selectedItemIds: string[];
  children: BBTreeNode[];
}

export interface DPStep {
  stepIndex: number;
  itemIndex: number; // 1..n
  capacityIndex: number; // 0..W
  itemName: string;
  itemWeight: number;
  itemBenefit: number;
  previousValue: number; // dp[i-1][w]
  withItemValue: number | null; // benefit + dp[i-1][w-weight] if fits
  chosenValue: number;
  decisionReason: string;
}

export interface DPBacktrackStep {
  stepIndex: number;
  itemIndex: number; // Row index i (1..n)
  capacityIndex: number; // Column index w (0..W)
  item: ExpandedItem;
  currentValue: number; // dp[i][w]
  aboveValue: number; // dp[i-1][w]
  isChosen: boolean; // dp[i][w] !== dp[i-1][w]
  decisionReason: string;
  nextItemIndex: number;
  nextCapacityIndex: number;
  selectedItems: ExpandedItem[];
  pathHistory: { row: number; col: number; chosen: boolean }[];
}

export interface DestinationSummaryData {
  destination: string;
  totalWeight: number;
  totalBenefit: number;
  itemsCount: number;
  itemsList: { name: string; qty: number }[];
}

export interface VerificationResult {
  isMatching: boolean;
  benefitDiff: number;
  weightDiff: number;
  dpBenefit: number;
  bbBenefit: number;
  dpWeight: number;
  bbWeight: number;
  dpItemCount: number;
  bbItemCount: number;
  message: string;
}
