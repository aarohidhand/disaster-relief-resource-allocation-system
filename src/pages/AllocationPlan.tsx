import { useMemo, useState } from 'react';
import { Download, Printer, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { VerificationResult } from '../algorithms/types';
import type { FundingStatus, PlanLine, PlanSummary } from '../lib/portal';
import { formatInt, formatLakh, formatPercent, sectorLabel } from '../lib/format';
import { useSort } from '../lib/useSort';
import { PageHeader } from '../components/layout/PageHeader';
import { SortableHeader } from '../components/ui/SortableHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ZoneDistribution } from '../components/portal/ZoneDistribution';

interface AllocationPlanProps {
  lines: PlanLine[];
  summary: PlanSummary;
  verification: VerificationResult;
  onExport: () => void;
}

type Filter = 'all' | FundingStatus;
type SortKey = 'proposal' | 'sector' | 'zone' | 'units' | 'cost' | 'funded' | 'impact' | 'share' | 'status';

const STATUS_RANK: Record<FundingStatus, number> = { Approved: 0, Partial: 1, Deferred: 2 };

export function AllocationPlan({ lines, summary, verification, onExport }: AllocationPlanProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => (filter === 'all' ? lines : lines.filter((l) => l.status === filter)), [lines, filter]);
  const { sorted, sort, requestSort } = useSort<PlanLine, SortKey>(
    visible,
    {
      proposal: (l) => l.ref,
      sector: (l) => sectorLabel(l.category),
      zone: (l) => l.destination,
      units: (l) => l.quantitySelected,
      cost: (l) => l.unitWeight,
      funded: (l) => l.totalWeight,
      impact: (l) => l.totalBenefit,
      share: (l) => l.shareOfBudget,
      status: (l) => STATUS_RANK[l.status],
    },
    { key: 'funded', dir: 'desc' },
  );

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All proposals', count: lines.length },
    { id: 'Approved', label: 'Approved', count: summary.approved },
    { id: 'Partial', label: 'Partial', count: summary.partial },
    { id: 'Deferred', label: 'Deferred', count: summary.deferred },
  ];

  const shownFunded = sorted.reduce((s, l) => s + l.totalWeight, 0);
  const shownImpact = sorted.reduce((s, l) => s + l.totalBenefit, 0);
  const shownUnits = sorted.reduce((s, l) => s + l.quantitySelected, 0);
  const shownRequestedUnits = sorted.reduce((s, l) => s + l.totalAvailable, 0);

  return (
    <>
      <PageHeader
        crumb="Optimal allocation plan"
        title="Optimal allocation plan"
        lead={
          <>
            Funding decision for every proposal at a budget of ₹{formatLakh(summary.budget)} lakh. {summary.approved} approved in full,{' '}
            {summary.partial} partially funded and {summary.deferred} deferred, securing {formatInt(summary.impact)} impact points.
          </>
        }
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print
            </button>
            <button type="button" className="btn-primary" onClick={onExport}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Export plan (CSV)
            </button>
          </>
        }
      />

      <div className="space-y-6">
        <section className="panel" aria-labelledby="plan-table-title">
          <div className="flex flex-col gap-3 border-b border-gov-line px-5 py-4 @[760px]/main:flex-row @[760px]/main:items-center @[760px]/main:justify-between">
            <h2 id="plan-table-title" className="panel-title">
              Funding decisions
            </h2>
            <div
              className="flex flex-wrap gap-1 rounded-md border border-gov-line bg-gov-canvas p-1 print:hidden"
              role="group"
              aria-label="Filter by status"
            >
              {filters.map((f) => {
                const active = f.id === filter;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(f.id)}
                    className={`rounded px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      active ? 'bg-white text-gov-ink shadow-[0_0_0_1px_#CBD5E1]' : 'text-gov-sub hover:text-gov-ink'
                    }`}
                  >
                    {f.label} <span className="figure ml-1 text-gov-muted">{f.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="scrollbar-thin relative overflow-x-auto">
            <table className="data-table min-w-[980px]">
              <thead>
                <tr>
                  <SortableHeader label="Proposal" sortKey="proposal" activeKey={sort.key} dir={sort.dir} onSort={requestSort} />
                  <SortableHeader
                    label="Sector and zone"
                    sortKey="sector"
                    activeKey={sort.key}
                    dir={sort.dir}
                    onSort={requestSort}
                    title="Sort by sector"
                  />
                  <SortableHeader
                    label="Units funded"
                    sortKey="units"
                    activeKey={sort.key}
                    dir={sort.dir}
                    onSort={requestSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Unit cost (₹ L)"
                    sortKey="cost"
                    activeKey={sort.key}
                    dir={sort.dir}
                    onSort={requestSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Allocated (₹ L)"
                    sortKey="funded"
                    activeKey={sort.key}
                    dir={sort.dir}
                    onSort={requestSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Impact secured"
                    sortKey="impact"
                    activeKey={sort.key}
                    dir={sort.dir}
                    onSort={requestSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Share of budget"
                    sortKey="share"
                    activeKey={sort.key}
                    dir={sort.dir}
                    onSort={requestSort}
                    className="min-w-[150px]"
                  />
                  <SortableHeader label="Status" sortKey="status" activeKey={sort.key} dir={sort.dir} onSort={requestSort} />
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-sm text-gov-sub">
                      {lines.length === 0
                        ? 'There are no proposals in the register.'
                        : 'No proposals have this status at the current budget.'}
                    </td>
                  </tr>
                )}
                {sorted.map((l) => (
                  <tr key={l.supplyId} className={l.status === 'Deferred' ? 'text-gov-muted' : ''}>
                    <td className="max-w-[260px]">
                      <p className={`truncate font-semibold ${l.status === 'Deferred' ? 'text-gov-sub' : 'text-gov-ink'}`} title={l.name}>
                        {l.name}
                      </p>
                      <p className="figure text-xs text-gov-muted">{l.ref}</p>
                    </td>
                    <td className="max-w-[220px]">
                      <p className={`truncate ${l.status === 'Deferred' ? 'text-gov-sub' : 'text-gov-ink'}`}>{sectorLabel(l.category)}</p>
                      <p className="truncate text-xs text-gov-sub" title={l.destination}>
                        {l.destination}
                      </p>
                    </td>
                    <td className="figure whitespace-nowrap text-right">
                      <span className="font-semibold text-gov-ink">{formatInt(l.quantitySelected)}</span>
                      <span className="text-gov-muted"> / {formatInt(l.totalAvailable)}</span>
                    </td>
                    <td className="figure text-right text-gov-sub">{formatLakh(l.unitWeight)}</td>
                    <td className={`figure text-right font-semibold ${l.totalWeight > 0 ? 'text-gov-ink' : 'text-gov-muted'}`}>
                      {formatLakh(l.totalWeight)}
                    </td>
                    <td className={`figure text-right ${l.totalBenefit > 0 ? 'text-gov-ink' : 'text-gov-muted'}`}>
                      {formatInt(l.totalBenefit)}
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 flex-1 rounded-sm bg-slate-100">
                          <div
                            className="h-full rounded-r-[4px] bg-gov-royal"
                            style={{ width: `${Math.min(1, l.shareOfBudget) * 100}%` }}
                          />
                        </div>
                        <span className="figure w-12 text-right text-[13px] text-gov-sub">{formatPercent(l.shareOfBudget)}</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={l.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
              {sorted.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={2} className="text-gov-ink">
                      {filter === 'all' ? 'Plan total' : `Subtotal, ${filter.toLowerCase()} proposals`}
                    </td>
                    <td className="figure text-right text-gov-ink">
                      {formatInt(shownUnits)} <span className="font-normal text-gov-muted">/ {formatInt(shownRequestedUnits)}</span>
                    </td>
                    <td />
                    <td className="figure text-right text-gov-ink">{formatLakh(shownFunded)}</td>
                    <td className="figure text-right text-gov-ink">{formatInt(shownImpact)}</td>
                    <td className="figure text-[13px] text-gov-sub">
                      {formatPercent(summary.budget > 0 ? shownFunded / summary.budget : 0)} of budget
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        <ZoneDistribution lines={lines} allocated={summary.allocated} />

        <section className="panel" aria-labelledby="basis-title">
          <div className="panel-header">
            <div>
              <h2 id="basis-title" className="panel-title">
                Basis of the plan
              </h2>
              <p className="panel-subtitle">How the recommendation is produced</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 px-5 py-5 text-sm leading-relaxed text-gov-sub @[760px]/main:grid-cols-3">
            <p>
              <span className="font-semibold text-gov-ink">Unit-level decisions.</span> Each requested unit is funded in full or deferred. A
              partially funded proposal is one where some of its units were funded.
            </p>
            <p>
              <span className="font-semibold text-gov-ink">Exact optimum.</span> The plan maximises the total projected impact of funded
              units while their total cost stays within the budget. It is not a ranking heuristic.
            </p>
            <p>
              <span className="font-semibold text-gov-ink">Estimates.</span> Impact scores are planning estimates submitted with each
              proposal and should be reviewed before sanction.
            </p>
          </div>
          <div
            className={`mx-5 mb-5 flex items-start gap-2.5 rounded border px-3 py-2.5 text-sm ${
              verification.isMatching ? 'border-gov-funded-line bg-gov-funded-tint text-green-900' : 'border-red-200 bg-red-50 text-red-900'
            }`}
          >
            {verification.isMatching ? (
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gov-funded" aria-hidden="true" />
            ) : (
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gov-danger" aria-hidden="true" />
            )}
            <p>
              {verification.isMatching
                ? `Independently re-solved by a second method; both report ${formatInt(verification.dpBenefit)} impact points.`
                : verification.message}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
