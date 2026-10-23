import type { ReactNode } from 'react';
import type { PlanSummary } from '../../lib/portal';
import { formatCrore, formatInt, formatLakh, formatPercent } from '../../lib/format';

interface KpiProps {
  label: string;
  value: ReactNode;
  unit?: string;
  detail: ReactNode;
  swatch?: 'funded' | 'reserve';
  className?: string;
}

function Kpi({ label, value, unit, detail, swatch, className = '' }: KpiProps) {
  return (
    <div className={`min-w-0 bg-white px-4 py-3.5 sm:px-5 ${className}`}>
      <dt className="flex items-center gap-1.5 text-[13px] text-gov-sub">
        {swatch === 'funded' && <span className="h-2.5 w-2.5 rounded-sm bg-gov-funded" aria-hidden="true" />}
        {swatch === 'reserve' && <span className="h-2.5 w-2.5 rounded-sm bg-gov-amber" aria-hidden="true" />}
        {label}
      </dt>
      <dd className="mt-1 flex items-baseline gap-1">
        <span className="figure-display text-[22px] font-semibold leading-none text-gov-ink sm:text-2xl">{value}</span>
        {unit && <span className="text-sm font-medium text-gov-sub">{unit}</span>}
      </dd>
      <dd className="mt-1.5 truncate text-[12.5px] text-gov-muted">{detail}</dd>
    </div>
  );
}

export function KpiRibbon({ summary }: { summary: PlanSummary }) {
  const utilPct = Math.max(0, Math.min(1, summary.utilization));
  const reserveShare = summary.budget > 0 ? summary.reserve / summary.budget : 0;
  return (
    <section aria-label="Budget summary" className="@container border-b border-gov-line bg-white">
      <div className="mx-auto max-w-[1360px] sm:px-2 lg:px-4">
        <dl className="grid grid-cols-2 gap-px bg-gov-line @[620px]:grid-cols-6 @[1000px]:grid-cols-5">
          <Kpi
            label="Total budget"
            value={`₹${formatLakh(summary.budget)}`}
            unit="L"
            detail={`${formatCrore(summary.budget)} fiscal envelope`}
            className="@[620px]:col-span-2 @[1000px]:col-span-1"
          />
          <Kpi
            label="Allocated funds"
            value={`₹${formatLakh(summary.allocated)}`}
            unit="L"
            swatch="funded"
            detail={`${formatInt(summary.unitsFunded)} of ${formatInt(summary.unitsRequested)} units funded`}
            className="@[620px]:col-span-2 @[1000px]:col-span-1"
          />
          <Kpi
            label="Remaining reserve"
            value={`₹${formatLakh(summary.reserve)}`}
            unit="L"
            swatch="reserve"
            detail={summary.reserve > 0 ? `${formatPercent(reserveShare)} of budget unallocated` : 'Budget fully committed'}
            className="col-span-2 @[620px]:col-span-2 @[1000px]:col-span-1"
          />
          <Kpi
            label="Total impact score"
            value={formatInt(summary.impact)}
            unit="pts"
            detail="Projected social impact"
            className="@[620px]:col-span-3 @[1000px]:col-span-1"
          />
          <Kpi
            label="Utilization"
            value={formatPercent(utilPct)}
            detail={`Covers ${formatPercent(summary.demandCoverage)} of requested demand`}
            className="@[620px]:col-span-3 @[1000px]:col-span-1"
          />
        </dl>
      </div>
      {/* Utilization meter, drawn as the ribbon's bottom edge: committed funds in emerald, unallocated reserve in amber */}
      <div
        className="flex h-1.5 w-full bg-gov-amber-line"
        role="meter"
        aria-label="Budget utilization"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(utilPct * 1000) / 10}
        aria-valuetext={`${formatPercent(utilPct)} of budget allocated`}
      >
        <div className="h-full bg-gov-funded transition-[width] duration-300" style={{ width: `${utilPct * 100}%` }} />
        {utilPct > 0 && utilPct < 1 && <div className="h-full w-[2px] shrink-0 bg-white" aria-hidden="true" />}
      </div>
    </section>
  );
}
