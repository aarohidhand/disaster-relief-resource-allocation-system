import { useMemo, useState } from 'react';
import type { PlanLine } from '../../lib/portal';
import { groupLines } from '../../lib/portal';
import { SECTOR_ORDER, formatInt, formatLakh, formatPercent, sectorLabel } from '../../lib/format';

/** Funded vs requested by sector — emphasis form: funded in navy, unfunded demand as the grey track. */
export function SectorFunding({ lines }: { lines: PlanLine[] }) {
  const [showTable, setShowTable] = useState(false);
  const rows = useMemo(() => {
    const groups = groupLines(lines, 'category');
    return groups.sort((a, b) => SECTOR_ORDER.indexOf(a.key as never) - SECTOR_ORDER.indexOf(b.key as never));
  }, [lines]);
  const maxRequested = Math.max(1, ...rows.map((r) => r.requested));

  return (
    <section className="panel flex flex-col" aria-labelledby="sector-funding-title">
      <div className="panel-header">
        <div>
          <h2 id="sector-funding-title" className="panel-title">
            Funding by sector
          </h2>
          <p className="panel-subtitle">Allocated funds against requested cost, ₹ lakh</p>
        </div>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gov-sub">No proposals in the register yet.</p>
      ) : showTable ? (
        <div className="relative overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Sector</th>
                <th scope="col" className="text-right">
                  Requested (₹ L)
                </th>
                <th scope="col" className="text-right">
                  Allocated (₹ L)
                </th>
                <th scope="col" className="text-right">
                  Funded share
                </th>
                <th scope="col" className="text-right">
                  Impact
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="font-medium text-gov-ink">{sectorLabel(r.key)}</td>
                  <td className="figure text-right text-gov-sub">{formatLakh(r.requested)}</td>
                  <td className="figure text-right font-semibold text-gov-ink">{formatLakh(r.funded)}</td>
                  <td className="figure text-right text-gov-sub">{formatPercent(r.requested > 0 ? r.funded / r.requested : 0)}</td>
                  <td className="figure text-right text-gov-sub">{formatInt(r.impact)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="flex-1 space-y-4 px-5 py-5">
          {rows.map((r) => {
            const share = r.requested > 0 ? r.funded / r.requested : 0;
            return (
              <li key={r.key} className="group">
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-gov-ink">{sectorLabel(r.key)}</span>
                  <span className="text-[13px] text-gov-sub">
                    <span className="figure font-semibold text-gov-ink">₹{formatLakh(r.funded)}</span>
                    <span className="figure"> of ₹{formatLakh(r.requested)} L</span>
                  </span>
                </div>
                <div
                  className="relative h-2.5 rounded-r-[4px] bg-slate-200"
                  style={{ width: `${(r.requested / maxRequested) * 100}%` }}
                  title={`${sectorLabel(r.key)}: ₹${formatLakh(r.funded)} L allocated of ₹${formatLakh(r.requested)} L requested (${formatPercent(share)})`}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-r-[4px] bg-gov-royal transition-[width] duration-300"
                    style={{ width: `${share * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gov-muted">
                  {formatPercent(share)} funded, {r.fundedProposals} of {r.proposals} {r.proposals === 1 ? 'proposal' : 'proposals'},{' '}
                  {formatInt(r.impact)} impact pts
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap gap-4 border-t border-gov-line px-5 py-3 text-xs text-gov-sub">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-gov-royal" aria-hidden="true" />
          Allocated
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-200" aria-hidden="true" />
          Requested, not funded
        </span>
      </div>
    </section>
  );
}
