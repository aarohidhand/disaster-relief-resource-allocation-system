import type { PlanLine } from '../../lib/portal';
import { formatInt, formatLakh, formatPercent, sectorLabel } from '../../lib/format';
import { StatusBadge } from '../ui/StatusBadge';

export function TopContributors({ lines, totalImpact }: { lines: PlanLine[]; totalImpact: number }) {
  const top = [...lines]
    .filter((l) => l.totalBenefit > 0)
    .sort((a, b) => b.totalBenefit - a.totalBenefit)
    .slice(0, 5);

  return (
    <section className="panel" aria-labelledby="top-title">
      <div className="panel-header">
        <div>
          <h2 id="top-title" className="panel-title">
            Largest impact contributors
          </h2>
          <p className="panel-subtitle">Proposals securing the most projected impact, with their share of the total</p>
        </div>
      </div>
      {top.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gov-sub">No proposals are funded at the current budget.</p>
      ) : (
        <ol className="divide-y divide-gov-line">
          {top.map((l, idx) => {
            const share = totalImpact > 0 ? l.totalBenefit / totalImpact : 0;
            return (
              <li key={l.supplyId} className="flex items-center gap-4 px-5 py-3">
                <span className="figure w-5 shrink-0 text-right text-sm text-gov-muted">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gov-ink">{l.name}</p>
                  <p className="text-xs text-gov-sub">
                    <span className="figure">{l.ref}</span>, {sectorLabel(l.category)}, {formatInt(l.quantitySelected)} units for ₹
                    {formatLakh(l.totalWeight)} L
                  </p>
                </div>
                <div className="hidden shrink-0 sm:block">
                  <StatusBadge status={l.status} size="sm" />
                </div>
                <div className="w-20 shrink-0 text-right">
                  <p className="figure text-sm font-semibold text-gov-ink">{formatInt(l.totalBenefit)}</p>
                  <p className="figure whitespace-nowrap text-xs text-gov-muted" title="Share of total impact">
                    {formatPercent(share)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
