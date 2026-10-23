import type { PlanLine, PlanSummary, FundingStatus } from '../../lib/portal';
import { formatLakh } from '../../lib/format';
import { StatusBadge, statusHint } from '../ui/StatusBadge';

const SEGMENT: Record<FundingStatus, string> = {
  Approved: 'bg-gov-funded',
  Partial: 'bg-gov-amber',
  Deferred: 'bg-slate-300',
};

export function PlanStatusPanel({ lines, summary, onOpenPlan }: { lines: PlanLine[]; summary: PlanSummary; onOpenPlan: () => void }) {
  const statuses: FundingStatus[] = ['Approved', 'Partial', 'Deferred'];
  const counts: Record<FundingStatus, number> = { Approved: summary.approved, Partial: summary.partial, Deferred: summary.deferred };
  const funds: Record<FundingStatus, number> = { Approved: 0, Partial: 0, Deferred: 0 };
  const requested: Record<FundingStatus, number> = { Approved: 0, Partial: 0, Deferred: 0 };
  for (const l of lines) {
    funds[l.status] += l.totalWeight;
    requested[l.status] += l.requestedCost;
  }
  const total = Math.max(1, lines.length);
  const unfunded = lines
    .filter((l) => l.totalAvailable > l.quantitySelected)
    .sort((a, b) => (b.totalAvailable - b.quantitySelected) * b.unitWeight - (a.totalAvailable - a.quantitySelected) * a.unitWeight)
    .slice(0, 4);

  return (
    <section className="panel flex flex-col" aria-labelledby="plan-status-title">
      <div className="panel-header">
        <div>
          <h2 id="plan-status-title" className="panel-title">
            Proposal outcomes
          </h2>
          <p className="panel-subtitle">{lines.length} proposals assessed in this cycle</p>
        </div>
        <button type="button" className="btn-ghost btn-sm" onClick={onOpenPlan}>
          Open allocation plan
        </button>
      </div>

      <div className="px-5 pt-5">
        <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-sm" aria-hidden="true">
          {statuses.map((s) =>
            counts[s] > 0 ? (
              <div
                key={s}
                className={`${SEGMENT[s]} h-full first:rounded-l-sm last:rounded-r-sm`}
                style={{ width: `${(counts[s] / total) * 100}%` }}
              />
            ) : null,
          )}
        </div>
      </div>

      <ul className="divide-y divide-gov-line px-5 py-2">
        {statuses.map((s) => (
          <li key={s} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <StatusBadge status={s} />
              <p className="mt-1 text-xs text-gov-muted">{statusHint(s)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="figure-display text-xl font-semibold text-gov-ink">{counts[s]}</p>
              <p className="figure text-xs text-gov-sub">
                {s === 'Deferred' ? `₹${formatLakh(requested[s])} L requested` : `₹${formatLakh(funds[s])} L allocated`}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {unfunded.length > 0 && (
        <div className="mt-auto border-t border-gov-line px-5 py-4">
          <h3 className="text-sm font-semibold text-gov-ink">Largest unfunded requests</h3>
          <p className="mt-0.5 text-xs text-gov-muted">Demand left outside the plan at this budget</p>
          <ul className="mt-3 space-y-2">
            {unfunded.map((l) => (
              <li key={l.supplyId} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate text-gov-ink" title={l.name}>
                  {l.name}
                </span>
                <span className="figure shrink-0 text-gov-sub">
                  {l.totalAvailable - l.quantitySelected} units,{' '}
                  <span className="text-gov-ink">₹{formatLakh((l.totalAvailable - l.quantitySelected) * l.unitWeight)} L</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
