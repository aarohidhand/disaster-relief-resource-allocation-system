import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ExpandedItem, SupplyItem } from '../algorithms/types';
import { solveKnapsackDP } from '../algorithms/knapsackDP';
import { valueByBudget } from '../algorithms/analysis';
import type { PlanSummary } from '../lib/portal';
import { buildPlanLines } from '../lib/portal';
import { BUDGET_MAX, formatInt, formatLakh, formatPercent, formatSignedInt, niceTicks } from '../lib/format';
import { PageHeader } from '../components/layout/PageHeader';
import { ChartTooltip } from '../components/portal/ChartTooltip';

interface ScenarioAnalysisProps {
  supplies: SupplyItem[];
  expandedItems: ExpandedItem[];
  summary: PlanSummary;
  onBudgetChange: (value: number) => void;
}

const SCENARIO_BUDGETS = [250, 500, 750, 1000, 1500, 2000];
const STEP = 100;

const compact = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K` : formatInt(v));

export function ScenarioAnalysis({ supplies, expandedItems, summary, onBudgetChange }: ScenarioAnalysisProps) {
  const budget = summary.budget;
  const requested = summary.requestedTotal;
  const maxX = Math.min(BUDGET_MAX, Math.max(1000, Math.ceil((requested + 200) / STEP) * STEP));

  // One pass of the 1D recurrence gives the optimum for every budget 0..maxX.
  const frontier = useMemo(() => valueByBudget(expandedItems, BUDGET_MAX), [expandedItems]);

  const curve = useMemo(() => {
    const pts: { budget: number; impact: number }[] = [];
    for (let b = 0; b <= maxX; b += 10) pts.push({ budget: b, impact: frontier[b] ?? 0 });
    return pts;
  }, [frontier, maxX]);

  const marginal = useMemo(() => {
    const bands: { band: string; from: number; gain: number; perLakh: number }[] = [];
    for (let b = 0; b < maxX; b += STEP) {
      const gain = (frontier[b + STEP] ?? 0) - (frontier[b] ?? 0);
      bands.push({ band: `${b}–${b + STEP}`, from: b, gain, perLakh: gain / STEP });
    }
    return bands;
  }, [frontier, maxX]);

  const scenarios = useMemo(() => {
    const set = Array.from(new Set([...SCENARIO_BUDGETS, budget])).sort((a, b) => a - b);
    return set.map((b) => {
      const r = solveKnapsackDP(expandedItems, b, supplies);
      const lines = buildPlanLines(r.groupedAllocation, b);
      return {
        budget: b,
        impact: r.maxBenefit,
        allocated: r.totalWeight,
        utilization: b > 0 ? r.totalWeight / b : 0,
        units: r.selectedItems.length,
        approved: lines.filter((l) => l.status === 'Approved').length,
        partial: lines.filter((l) => l.status === 'Partial').length,
        deferred: lines.filter((l) => l.status === 'Deferred').length,
      };
    });
  }, [expandedItems, supplies, budget]);

  const currentImpact = frontier[budget] ?? summary.impact;
  const nextGain = (frontier[Math.min(BUDGET_MAX, budget + STEP)] ?? currentImpact) - currentImpact;
  const saturation = Math.min(requested, BUDGET_MAX);
  const currentBand = Math.min(Math.floor(budget / STEP), marginal.length - 1);
  const impactTicks = niceTicks(Math.max(...curve.map((c) => c.impact), 1));
  const gainTicks = niceTicks(Math.max(...marginal.map((m) => m.gain), 1));

  return (
    <>
      <PageHeader
        crumb="Scenario analysis"
        title="Scenario analysis"
        lead="How the achievable impact responds to the size of the envelope. Use it to judge whether a supplementary allocation or a cut changes outcomes materially."
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-gov-line bg-gov-line @[640px]/main:grid-cols-3">
          <div className="bg-white px-5 py-4">
            <p className="text-[13px] text-gov-sub">Impact at current budget</p>
            <p className="figure-display mt-1 text-2xl font-semibold text-gov-ink">{formatInt(currentImpact)}</p>
            <p className="mt-1 text-[12.5px] text-gov-muted">At ₹{formatLakh(budget)} L</p>
          </div>
          <div className="bg-white px-5 py-4">
            <p className="text-[13px] text-gov-sub">Gain from next ₹{STEP} L</p>
            <p className="figure-display mt-1 text-2xl font-semibold text-gov-ink">{formatSignedInt(nextGain)}</p>
            <p className="mt-1 text-[12.5px] text-gov-muted">{(nextGain / STEP).toFixed(1)} points per ₹ lakh at the margin</p>
          </div>
          <div className="bg-white px-5 py-4">
            <p className="text-[13px] text-gov-sub">Budget that funds all demand</p>
            <p className="mt-1">
              <span className="figure-display text-2xl font-semibold text-gov-ink">₹{formatLakh(requested)}</span>
              <span className="ml-1 text-sm font-medium text-gov-sub">L</span>
            </p>
            <p className="mt-1 text-[12.5px] text-gov-muted">Beyond this, extra budget adds no impact</p>
          </div>
        </div>

        <section className="panel" aria-labelledby="frontier-title">
          <div className="panel-header">
            <div>
              <h2 id="frontier-title" className="panel-title">
                Achievable impact by budget
              </h2>
              <p className="panel-subtitle">Optimal total impact for every budget from ₹0 to ₹{formatInt(maxX)} lakh</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-gov-sub">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-[2px] w-4 rounded bg-gov-royal" aria-hidden="true" />
                Optimal impact
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-[2px] rounded bg-gov-amber" aria-hidden="true" />
                Current budget
              </span>
            </div>
          </div>
          <div className="h-[340px] px-2 pb-3 pt-4 sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curve} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="budget"
                  type="number"
                  domain={[0, maxX]}
                  ticks={Array.from({ length: Math.floor(maxX / 250) + 1 }, (_, i) => i * 250)}
                  tick={{ fill: '#475569', fontSize: 12 }}
                  tickFormatter={(v: number) => `₹${formatInt(v)}`}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 12 }}
                  tickFormatter={compact}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  ticks={impactTicks}
                  domain={[0, impactTicks[impactTicks.length - 1]]}
                />
                <Tooltip
                  cursor={{ stroke: '#94A3B8', strokeWidth: 1 }}
                  content={(p) => {
                    const d = p.payload?.[0]?.payload as { budget: number; impact: number } | undefined;
                    return (
                      <ChartTooltip
                        active={p.active}
                        label={d ? `Budget ₹${formatLakh(d.budget)} L` : undefined}
                        rows={d ? [{ key: 'impact', value: formatInt(d.impact), name: 'impact points', color: '#1E3A8A' }] : []}
                      />
                    );
                  }}
                />
                {saturation <= maxX && (
                  <ReferenceLine
                    x={saturation}
                    stroke="#94A3B8"
                    strokeWidth={1}
                    label={{ value: 'All demand funded', position: 'insideBottomRight', fill: '#64748B', fontSize: 11 }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="impact"
                  stroke="#1E3A8A"
                  strokeWidth={2}
                  fill="#1E3A8A"
                  fillOpacity={0.08}
                  isAnimationActive={false}
                />
                <ReferenceLine
                  x={budget}
                  stroke="#D97706"
                  strokeWidth={2}
                  label={{ value: `₹${formatInt(budget)} L`, position: 'top', fill: '#92400E', fontSize: 12, fontWeight: 600 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel" aria-labelledby="marginal-title">
          <div className="panel-header">
            <div>
              <h2 id="marginal-title" className="panel-title">
                Impact gained per additional ₹{STEP} lakh
              </h2>
              <p className="panel-subtitle">
                Each bar is the extra impact the optimal plan gains across that budget band. The band holding the current budget is
                highlighted.
              </p>
            </div>
          </div>
          <div className="h-[260px] px-2 pb-3 pt-4 sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marginal} margin={{ top: 8, right: 24, bottom: 8, left: 8 }} barCategoryGap={4}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="from"
                  tick={{ fill: '#475569', fontSize: 11 }}
                  tickFormatter={(v: number) => (v % 500 === 0 ? `₹${formatInt(v)}` : '')}
                  interval={0}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 12 }}
                  tickFormatter={compact}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  ticks={gainTicks}
                  domain={[0, gainTicks[gainTicks.length - 1]]}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                  content={(p) => {
                    const d = p.payload?.[0]?.payload as { band: string; gain: number; perLakh: number } | undefined;
                    return (
                      <ChartTooltip
                        active={p.active}
                        label={d ? `₹${d.band} L` : undefined}
                        rows={
                          d
                            ? [
                                { key: 'g', value: formatSignedInt(d.gain), name: 'impact points' },
                                { key: 'p', value: d.perLakh.toFixed(1), name: 'points per ₹ lakh' },
                              ]
                            : []
                        }
                      />
                    );
                  }}
                />
                <Bar dataKey="gain" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {marginal.map((m, i) => (
                    <Cell key={m.from} fill={i === currentBand ? '#1E3A8A' : '#CBD5E1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel" aria-labelledby="scenario-table-title">
          <div className="panel-header">
            <div>
              <h2 id="scenario-table-title" className="panel-title">
                Scenario comparison
              </h2>
              <p className="panel-subtitle">Full optimisation at common envelope sizes. Apply a scenario to make it the working budget.</p>
            </div>
          </div>
          <div className="scrollbar-thin relative overflow-x-auto">
            <table className="data-table min-w-[860px]">
              <thead>
                <tr>
                  <th scope="col">Budget (₹ L)</th>
                  <th scope="col" className="text-right">
                    Total impact
                  </th>
                  <th scope="col" className="text-right">
                    Change vs current
                  </th>
                  <th scope="col" className="text-right">
                    Allocated (₹ L)
                  </th>
                  <th scope="col" className="text-right">
                    Utilization
                  </th>
                  <th scope="col" className="text-right">
                    Units funded
                  </th>
                  <th scope="col">Approved / partial / deferred</th>
                  <th scope="col">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => {
                  const isCurrent = s.budget === budget;
                  return (
                    <tr key={s.budget} className={isCurrent ? 'bg-gov-royal-tint/60' : ''}>
                      <td className="figure font-semibold text-gov-ink">
                        {formatLakh(s.budget)}
                        {isCurrent && (
                          <span className="ml-2 rounded-sm bg-gov-royal px-1.5 py-px font-sans text-[11px] font-semibold text-white">
                            Current
                          </span>
                        )}
                      </td>
                      <td className="figure text-right font-semibold text-gov-ink">{formatInt(s.impact)}</td>
                      <td
                        className={`figure text-right ${s.impact - currentImpact < 0 ? 'text-gov-danger' : s.impact - currentImpact > 0 ? 'text-gov-funded' : 'text-gov-muted'}`}
                      >
                        {isCurrent ? '—' : formatSignedInt(s.impact - currentImpact)}
                      </td>
                      <td className="figure text-right text-gov-sub">{formatLakh(s.allocated)}</td>
                      <td className="figure text-right text-gov-sub">{formatPercent(s.utilization)}</td>
                      <td className="figure text-right text-gov-sub">{formatInt(s.units)}</td>
                      <td className="figure text-gov-sub">
                        <span className="text-gov-funded">{s.approved}</span> / <span className="text-amber-700">{s.partial}</span> /{' '}
                        <span>{s.deferred}</span>
                      </td>
                      <td className="text-right">
                        {!isCurrent && (
                          <button type="button" className="btn-ghost btn-sm" onClick={() => onBudgetChange(s.budget)}>
                            Apply ₹{formatInt(s.budget)} L
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
