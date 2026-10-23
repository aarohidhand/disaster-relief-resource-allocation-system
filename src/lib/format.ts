import type { SupplyItem } from '../algorithms/types';

/**
 * Presentation helpers for the portal.
 *
 * The optimisation model is unit-agnostic: `unitWeight` is the knapsack weight and
 * `unitBenefit` the knapsack value. The portal presents them as a unit cost in
 * ₹ lakh and a projected social-impact score. Nothing here changes solver inputs.
 */

export const FISCAL_YEAR = 'FY 2026–27';
export const PROGRAMME_NAME = 'Disaster Relief & Resilience Fund';
export const DEPARTMENT_NAME = 'Directorate of Relief & Resource Planning';
export const PORTAL_NAME = 'Resource Allocation & Decision Support Portal';

export const BUDGET_MIN = 10;
export const BUDGET_MAX = 2500;
export const BUDGET_PRESETS = [250, 500, 750, 1000, 1500];
export const MAX_UNITS_PER_PROPOSAL = 200;

const lakhFmt = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const oneDp = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const twoDp = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 1000 → "1,000.00" (₹ lakh figures are always shown with two decimals). */
export function formatLakh(value: number): string {
  return lakhFmt.format(Number.isFinite(value) ? value : 0);
}

/** 1000 → "₹1,000.00 L" */
export function formatLakhWithUnit(value: number): string {
  return `₹${formatLakh(value)} L`;
}

/** Lakh → crore, 1000 → "₹10.00 Cr" */
export function formatCrore(lakh: number): string {
  return `₹${twoDp.format(lakh / 100)} Cr`;
}

/** Indian digit grouping, no decimals: 123456 → "1,23,456" */
export function formatInt(value: number): string {
  return intFmt.format(Number.isFinite(value) ? value : 0);
}

export function formatDecimal(value: number, digits: 1 | 2 = 2): string {
  const v = Number.isFinite(value) ? value : 0;
  return digits === 1 ? oneDp.format(v) : twoDp.format(v);
}

export function formatPercent(fraction: number, digits = 1): string {
  const v = Number.isFinite(fraction) ? fraction * 100 : 0;
  return `${v.toFixed(digits)}%`;
}

export function formatSignedInt(value: number): string {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '−'}${formatInt(Math.abs(value))}`;
}

/** Stable, human-readable proposal reference derived from the record id. */
export function proposalRef(id: string): string {
  const seeded = /^sup-(\d{1,3})$/.exec(id);
  if (seeded) return `DRF-26-${seeded[1].padStart(3, '0')}`;
  const tail = id
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-4)
    .toUpperCase();
  return `DRF-26-${tail}`;
}

export const SECTOR_LABELS: Record<SupplyItem['category'], string> = {
  Medical: 'Health',
  'Food & Water': 'Food & water',
  Shelter: 'Shelter',
  Sanitation: 'Sanitation (WASH)',
  Energy: 'Energy',
};

export const SECTOR_ORDER: SupplyItem['category'][] = ['Medical', 'Food & Water', 'Shelter', 'Sanitation', 'Energy'];

export function sectorLabel(category: string): string {
  return SECTOR_LABELS[category as SupplyItem['category']] ?? category;
}

export function clampBudget(value: number): number {
  if (!Number.isFinite(value)) return BUDGET_MIN;
  return Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, Math.round(value)));
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

/** Clean axis ticks from 0: picks a 1/2/2.5/5 × 10^k step giving at most `count` intervals. */
export function niceTicks(max: number, count = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}
