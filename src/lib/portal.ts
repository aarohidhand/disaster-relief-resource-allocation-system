import type { GroupedAllocation, KnapsackResult, SupplyItem } from '../algorithms/types';
import { proposalRef } from './format';

export type FundingStatus = 'Approved' | 'Partial' | 'Deferred';

export interface PlanLine extends GroupedAllocation {
  ref: string;
  status: FundingStatus;
  /** Cost of every requested unit (₹ lakh). */
  requestedCost: number;
  /** Funded amount as a fraction of the total budget. */
  shareOfBudget: number;
  /** Impact points per ₹ lakh — the analyst-facing name for v/w. */
  impactPerLakh: number;
}

export interface PlanSummary {
  budget: number;
  allocated: number;
  reserve: number;
  impact: number;
  utilization: number;
  requestedTotal: number;
  demandCoverage: number;
  proposals: number;
  unitsRequested: number;
  unitsFunded: number;
  approved: number;
  partial: number;
  deferred: number;
}

export interface GroupTotal {
  key: string;
  requested: number;
  funded: number;
  impact: number;
  unitsFunded: number;
  unitsRequested: number;
  proposals: number;
  fundedProposals: number;
}

export function fundingStatus(selected: number, available: number): FundingStatus {
  if (selected <= 0) return 'Deferred';
  if (selected >= available) return 'Approved';
  return 'Partial';
}

export function buildPlanLines(grouped: GroupedAllocation[], budget: number): PlanLine[] {
  return grouped.map((g) => ({
    ...g,
    ref: proposalRef(g.supplyId),
    status: fundingStatus(g.quantitySelected, g.totalAvailable),
    requestedCost: g.unitWeight * g.totalAvailable,
    shareOfBudget: budget > 0 ? g.totalWeight / budget : 0,
    impactPerLakh: g.unitWeight > 0 ? g.unitBenefit / g.unitWeight : 0,
  }));
}

export function summarizePlan(result: KnapsackResult, lines: PlanLine[], supplies: SupplyItem[]): PlanSummary {
  const requestedTotal = supplies.reduce((s, x) => s + x.unitWeight * x.quantity, 0);
  const budget = result.capacity;
  return {
    budget,
    allocated: result.totalWeight,
    reserve: result.unusedCapacity,
    impact: result.maxBenefit,
    utilization: budget > 0 ? result.totalWeight / budget : 0,
    requestedTotal,
    demandCoverage: requestedTotal > 0 ? Math.min(1, budget / requestedTotal) : 1,
    proposals: supplies.length,
    unitsRequested: supplies.reduce((s, x) => s + Math.max(0, Math.floor(x.quantity)), 0),
    unitsFunded: result.selectedItems.length,
    approved: lines.filter((l) => l.status === 'Approved').length,
    partial: lines.filter((l) => l.status === 'Partial').length,
    deferred: lines.filter((l) => l.status === 'Deferred').length,
  };
}

export function groupLines(lines: PlanLine[], by: 'category' | 'destination'): GroupTotal[] {
  const map = new Map<string, GroupTotal>();
  for (const line of lines) {
    const key = line[by];
    const g =
      map.get(key) ??
      ({ key, requested: 0, funded: 0, impact: 0, unitsFunded: 0, unitsRequested: 0, proposals: 0, fundedProposals: 0 } as GroupTotal);
    g.requested += line.requestedCost;
    g.funded += line.totalWeight;
    g.impact += line.totalBenefit;
    g.unitsFunded += line.quantitySelected;
    g.unitsRequested += line.totalAvailable;
    g.proposals += 1;
    if (line.quantitySelected > 0) g.fundedProposals += 1;
    map.set(key, g);
  }
  return Array.from(map.values());
}

/** Builds the CSV for the allocation plan (all proposals, with statuses and totals). */
export function buildPlanCsv(lines: PlanLine[], summary: PlanSummary, sectorName: (c: string) => string): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [
    'Proposal ref',
    'Proposal / resource',
    'Sector',
    'Implementing zone',
    'Unit cost (INR lakh)',
    'Impact per unit',
    'Units requested',
    'Units funded',
    'Funded amount (INR lakh)',
    'Impact secured',
    'Share of budget (%)',
    'Status',
  ];
  const rows = lines.map((l) => [
    l.ref,
    l.name,
    sectorName(l.category),
    l.destination,
    l.unitWeight.toFixed(2),
    l.unitBenefit,
    l.totalAvailable,
    l.quantitySelected,
    l.totalWeight.toFixed(2),
    l.totalBenefit,
    (l.shareOfBudget * 100).toFixed(2),
    l.status,
  ]);
  rows.push([
    'TOTAL',
    `Optimal allocation plan — budget ${summary.budget.toFixed(2)} lakh`,
    '',
    '',
    '',
    '',
    summary.unitsRequested,
    summary.unitsFunded,
    summary.allocated.toFixed(2),
    summary.impact,
    (summary.utilization * 100).toFixed(2),
    `${summary.approved} approved / ${summary.partial} partial / ${summary.deferred} deferred`,
  ]);
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
}

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿', text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
