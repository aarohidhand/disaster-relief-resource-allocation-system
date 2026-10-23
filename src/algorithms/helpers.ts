import type { SupplyItem, ExpandedItem, GroupedAllocation } from './types';

/**
 * Expands grouped supply items (quantity > 1) into individual 0/1 Knapsack items.
 * Each unit becomes a distinct item with its own unique ID.
 */
export function expandSupplies(supplies: SupplyItem[]): ExpandedItem[] {
  const expanded: ExpandedItem[] = [];
  
  for (const supply of supplies) {
    const qty = Math.max(0, Math.floor(supply.quantity));
    for (let u = 1; u <= qty; u++) {
      expanded.push({
        id: `${supply.id}-u${u}`,
        sourceSupplyId: supply.id,
        name: supply.name,
        weight: supply.unitWeight,
        benefit: supply.unitBenefit,
        destination: supply.destination,
        unitIndex: u,
        totalUnits: qty,
        ratio: supply.unitWeight > 0 ? supply.unitBenefit / supply.unitWeight : 0,
        category: supply.category,
      });
    }
  }

  return expanded;
}

/**
 * Groups selected 0/1 items back into human-friendly supply allocations with quantities.
 */
export function groupAllocations(
  supplies: SupplyItem[],
  selectedExpandedItems: ExpandedItem[]
): GroupedAllocation[] {
  // Count how many units selected per supplyId
  const countsBySupplyId = new Map<string, number>();
  for (const item of selectedExpandedItems) {
    countsBySupplyId.set(item.sourceSupplyId, (countsBySupplyId.get(item.sourceSupplyId) || 0) + 1);
  }

  return supplies.map((supply) => {
    const qtySelected = countsBySupplyId.get(supply.id) || 0;
    return {
      supplyId: supply.id,
      name: supply.name,
      destination: supply.destination,
      category: supply.category,
      unitWeight: supply.unitWeight,
      unitBenefit: supply.unitBenefit,
      quantitySelected: qtySelected,
      totalAvailable: supply.quantity,
      totalWeight: qtySelected * supply.unitWeight,
      totalBenefit: qtySelected * supply.unitBenefit,
      ratio: supply.unitWeight > 0 ? Number((supply.unitBenefit / supply.unitWeight).toFixed(2)) : 0,
    };
  });
}
