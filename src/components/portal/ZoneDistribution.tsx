import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import type { GroupTotal, PlanLine } from '../../lib/portal';
import { groupLines } from '../../lib/portal';
import { formatInt, formatLakh, formatPercent } from '../../lib/format';
import { useSort } from '../../lib/useSort';
import { SortableHeader } from '../ui/SortableHeader';

type ZoneKey = 'zone' | 'proposals' | 'units' | 'funded' | 'impact' | 'share';

export function ZoneDistribution({ lines, allocated, compact = false }: { lines: PlanLine[]; allocated: number; compact?: boolean }) {
  const rows = useMemo(() => groupLines(lines, 'destination'), [lines]);
  const { sorted, sort, requestSort } = useSort<GroupTotal, ZoneKey>(
    rows,
    {
      zone: (r) => r.key,
      proposals: (r) => r.fundedProposals,
      units: (r) => r.unitsFunded,
      funded: (r) => r.funded,
      impact: (r) => r.impact,
      share: (r) => (allocated > 0 ? r.funded / allocated : 0),
    },
    { key: 'funded', dir: 'desc' },
  );

  return (
    <section className="panel" aria-labelledby="zone-title">
      <div className="panel-header">
        <div>
          <h2 id="zone-title" className="panel-title">
            Distribution by implementing zone
          </h2>
          <p className="panel-subtitle">Where allocated funds and projected impact land</p>
        </div>
      </div>
      <div className="relative overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <SortableHeader label="Implementing zone" sortKey="zone" activeKey={sort.key} dir={sort.dir} onSort={requestSort} />
              <SortableHeader
                label="Proposals"
                sortKey="proposals"
                activeKey={sort.key}
                dir={sort.dir}
                onSort={requestSort}
                align="right"
              />
              {!compact && (
                <SortableHeader
                  label="Units funded"
                  sortKey="units"
                  activeKey={sort.key}
                  dir={sort.dir}
                  onSort={requestSort}
                  align="right"
                />
              )}
              <SortableHeader
                label="Allocated (₹ L)"
                sortKey="funded"
                activeKey={sort.key}
                dir={sort.dir}
                onSort={requestSort}
                align="right"
              />
              <SortableHeader label="Impact" sortKey="impact" activeKey={sort.key} dir={sort.dir} onSort={requestSort} align="right" />
              <SortableHeader
                label="Share of allocation"
                sortKey="share"
                activeKey={sort.key}
                dir={sort.dir}
                onSort={requestSort}
                className="min-w-[160px]"
              />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={compact ? 5 : 6} className="py-10 text-center text-gov-sub">
                  No zones to show.
                </td>
              </tr>
            )}
            {sorted.map((r) => {
              const share = allocated > 0 ? r.funded / allocated : 0;
              return (
                <tr key={r.key}>
                  <td>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap font-medium text-gov-ink">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-gov-muted" aria-hidden="true" />
                      {r.key}
                    </span>
                  </td>
                  <td className="figure text-right text-gov-sub">
                    {r.fundedProposals} / {r.proposals}
                  </td>
                  {!compact && (
                    <td className="figure text-right text-gov-sub">
                      {formatInt(r.unitsFunded)} / {formatInt(r.unitsRequested)}
                    </td>
                  )}
                  <td className={`figure text-right font-semibold ${r.funded > 0 ? 'text-gov-ink' : 'text-gov-muted'}`}>
                    {formatLakh(r.funded)}
                  </td>
                  <td className="figure text-right text-gov-sub">{formatInt(r.impact)}</td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 flex-1 rounded-sm bg-slate-100">
                        <div className="h-full rounded-r-[4px] bg-gov-royal" style={{ width: `${share * 100}%` }} />
                      </div>
                      <span className="figure w-12 text-right text-[13px] text-gov-sub">{formatPercent(share)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
