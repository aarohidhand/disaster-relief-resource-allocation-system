import type { KnapsackResult, VerificationResult } from './types';

export function verifySolutions(
  dpResult: KnapsackResult,
  bbResult: KnapsackResult
): VerificationResult {
  const benefitDiff = Math.abs(dpResult.maxBenefit - bbResult.maxBenefit);
  const weightDiff = Math.abs(dpResult.totalWeight - bbResult.totalWeight);
  const isMatching = benefitDiff === 0;

  return {
    isMatching,
    benefitDiff,
    weightDiff,
    dpBenefit: dpResult.maxBenefit,
    bbBenefit: bbResult.maxBenefit,
    dpWeight: dpResult.totalWeight,
    bbWeight: bbResult.totalWeight,
    dpItemCount: dpResult.selectedItems.length,
    bbItemCount: bbResult.selectedItems.length,
    message: isMatching
      ? 'Both algorithms independently found the identical optimal benefit.'
      : `Optimal benefit discrepancy: DP found ${dpResult.maxBenefit}, B&B found ${bbResult.maxBenefit}. Inspect item data or capacities.`,
  };
}
