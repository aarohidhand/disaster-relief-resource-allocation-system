import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check } from 'lucide-react';
import type { BtsData } from './BtsDrawer';
import { BtsSection, Metric } from './primitives';
import { useBtsWide } from './layout';
import { greedyByRatio, marginalAnalysis, valueByBudget } from '../../algorithms/analysis';
import type { MarginalTest } from '../../algorithms/analysis';
import { BUDGET_MAX, formatDecimal, formatInt, formatSignedInt, niceTicks, proposalRef } from '../../lib/format';
import { ChartTooltip } from '../portal/ChartTooltip';

function reading(t: MarginalTest | undefined, funded: number, total: number, w: number): { text: string; tone: string } {
  if (!t) return { text: '—', tone: 'text-bts-sub' };
  if (total === 0) return { text: 'No units requested.', tone: 'text-bts-sub' };
  const lossPlus = t.plusDelta === null ? null : -t.plusDelta;
  const lossMinus = t.minusDelta === null ? null : -t.minusDelta;
  if (funded === 0) {
    if (t.plusReason === 'over-budget') return { text: 'One unit costs more than the whole budget.', tone: 'text-bts-sub' };
    if (lossPlus === 0) return { text: 'Tie: an equally good plan funds one unit of this proposal.', tone: 'text-bts-amber' };
    return {
      text: `Forcing one unit in costs ${formatInt(lossPlus ?? 0)} pts overall: its ₹${formatInt(w)} L buys more impact elsewhere.`,
      tone: 'text-bts-sub',
    };
  }
  if (funded >= total) {
    if (lossMinus === 0) return { text: 'Tie: an equally good plan funds one unit fewer.', tone: 'text-bts-amber' };
    return {
      text: `Every unit funded. Dropping one would lose ${formatInt(lossMinus ?? 0)} pts even after re-optimising.`,
      tone: 'text-bts-ink',
    };
  }
  const parts: string[] = [];
  if (lossPlus !== null) parts.push(lossPlus === 0 ? 'one more ties' : `one more loses ${formatInt(lossPlus)}`);
  if (t.plusReason === 'over-budget') parts.push('one more does not fit');
  if (lossMinus !== null) parts.push(lossMinus === 0 ? 'one fewer ties' : `one fewer loses ${formatInt(lossMinus)}`);
  return { text: `Funded ${funded} of ${total}, the balance point: ${parts.join(', ')}.`, tone: 'text-bts-ink' };
}

export function DecisionTrace({ supplies, capacity, expandedItems, dpResult }: BtsData) {
  const wide = useBtsWide();
  const optimum = dpResult.maxBenefit;
  const greedy = useMemo(() => greedyByRatio(expandedItems, capacity), [expandedItems, capacity]);
  const tests = useMemo(
    () => marginalAnalysis(supplies, capacity, dpResult.groupedAllocation, optimum),
    [supplies, capacity, dpResult.groupedAllocation, optimum],
  );
  const testById = useMemo(() => new Map(tests.map((t) => [t.supplyId, t])), [tests]);

  const rankById = useMemo(() => {
    const sorted = [...supplies]
      .filter((s) => s.unitWeight > 0)
      .sort((a, b) => b.unitBenefit / b.unitWeight - a.unitBenefit / a.unitWeight);
    return new Map(sorted.map((s, k) => [s.id, k + 1]));
  }, [supplies]);

  // Greedy shortfall across budgets (exact optimum from one 1D pass, greedy per budget).
  const sweep = useMemo(() => {
    const opt = valueByBudget(expandedItems, BUDGET_MAX);
    const sorted = [...expandedItems].sort((a, b) => {
      if (Math.abs(b.ratio - a.ratio) > 1e-9) return b.ratio - a.ratio;
      if (a.sourceSupplyId !== b.sourceSupplyId) return a.sourceSupplyId.localeCompare(b.sourceSupplyId);
      return a.unitIndex - b.unitIndex;
    });
    const pts: { budget: number; gap: number }[] = [];
    for (let b = 10; b <= BUDGET_MAX; b += 10) {
      let wsum = 0;
      let vsum = 0;
      for (const it of sorted) {
        const wt = Math.round(it.weight);
        if (wsum + wt <= b) {
          wsum += wt;
          vsum += Math.round(it.benefit);
        }
      }
      pts.push({ budget: b, gap: opt[b] - vsum });
    }
    return pts;
  }, [expandedItems]);

  const failing = sweep.filter((p) => p.gap > 0);
  const gapTicks = niceTicks(Math.max(1, ...sweep.map((p) => p.gap)));
  const worst = failing.reduce<{ budget: number; gap: number } | null>((m, p) => (!m || p.gap > m.gap ? p : m), null);
  const gapNow = optimum - greedy.value;
  const differing = dpResult.groupedAllocation.filter((g) => (greedy.countsBySupply.get(g.supplyId) ?? 0) !== g.quantitySelected).length;
  const funded = dpResult.groupedAllocation.filter((g) => g.quantitySelected > 0);
  const sumCheck = funded.reduce((s, g) => s + g.quantitySelected * Math.round(g.unitBenefit), 0);
  const costCheck = funded.reduce((s, g) => s + g.quantitySelected * Math.round(g.unitWeight), 0);

  return (
    <div className="space-y-5">
      <div className={`grid gap-2.5 ${wide ? 'grid-cols-4' : 'grid-cols-2'}`}>
        <Metric label="DP optimum" value={formatInt(optimum)} tone="sky" hint={`₹${formatInt(dpResult.totalWeight)} L used`} />
        <Metric
          label="Greedy by impact per ₹"
          value={formatInt(greedy.value)}
          tone={gapNow > 0 ? 'rose' : 'ink'}
          hint={`₹${formatInt(greedy.weight)} L used`}
        />
        <Metric
          label="DP advantage here"
          value={gapNow > 0 ? `+${formatInt(gapNow)}` : '0'}
          tone={gapNow > 0 ? 'emerald' : 'ink'}
          hint={gapNow > 0 ? `${differing} proposals funded differently` : 'greedy happens to be optimal at this budget'}
        />
        <Metric
          label="Budgets where greedy fails"
          value={`${failing.length} / ${sweep.length}`}
          tone={failing.length > 0 ? 'amber' : 'ink'}
          hint={worst ? `worst: −${formatInt(worst.gap)} at ₹${formatInt(worst.budget)} L` : 'none in range'}
        />
      </div>

      <BtsSection
        title="Why not just rank by impact per rupee?"
        description="Greedy takes units in descending v/w order while they fit. It is optimal for fractional knapsack but not for 0/1: an expensive, efficient unit can block a better combination, or budget can be left stranded. The chart shows how far greedy falls below the DP optimum at every budget."
      >
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sweep} margin={{ top: 22, right: 16, bottom: 4, left: 0 }} barCategoryGap={0}>
              <CartesianGrid stroke="#1F2C46" vertical={false} />
              <XAxis
                dataKey="budget"
                type="number"
                domain={[0, BUDGET_MAX]}
                ticks={[0, 500, 1000, 1500, 2000, 2500]}
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                tickFormatter={(v: number) => formatInt(v)}
                axisLine={{ stroke: '#26344F' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={36}
                allowDecimals={false}
                ticks={gapTicks}
                domain={[0, gapTicks[gapTicks.length - 1]]}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                content={(p) => {
                  const d = p.payload?.[0]?.payload as { budget: number; gap: number } | undefined;
                  return (
                    <ChartTooltip
                      dark
                      active={p.active}
                      label={d ? `Budget ${formatInt(d.budget)}` : undefined}
                      rows={
                        d
                          ? [
                              {
                                key: 'g',
                                value: d.gap === 0 ? '0' : `−${formatInt(d.gap)}`,
                                name: 'greedy below optimum',
                                color: '#FB7185',
                              },
                            ]
                          : []
                      }
                    />
                  );
                }}
              />
              <Bar dataKey="gap" fill="#FB7185" isAnimationActive={false} />
              <ReferenceLine
                x={capacity}
                stroke="#FBBF24"
                strokeWidth={2}
                label={{ value: `W = ${formatInt(capacity)}`, position: 'top', fill: '#FBBF24', fontSize: 11 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-bts-sub">
          Shortfall in impact points (optimum − greedy), budgets 10 to {formatInt(BUDGET_MAX)} in steps of 10.
        </p>
      </BtsSection>

      <BtsSection
        title="Why each proposal got its funding"
        description="For every proposal the plan is re-optimised twice: once forcing one more unit in, once forcing one funded unit out. If both make the total worse, the DP’s choice is locally provable. A zero change means an equally good alternative plan exists."
      >
        <div className="scrollbar-thin relative overflow-x-auto">
          <table className="bts-table min-w-[900px]">
            <thead>
              <tr>
                <th scope="col">Proposal</th>
                <th scope="col" className="text-right">
                  wᵢ
                </th>
                <th scope="col" className="text-right">
                  vᵢ
                </th>
                <th scope="col" className="text-right">
                  vᵢ / wᵢ (rank)
                </th>
                <th scope="col" className="text-right">
                  DP funds
                </th>
                <th scope="col" className="text-right">
                  Greedy funds
                </th>
                <th scope="col" className="text-right">
                  +1 unit
                </th>
                <th scope="col" className="text-right">
                  −1 unit
                </th>
                <th scope="col">Reading</th>
              </tr>
            </thead>
            <tbody>
              {dpResult.groupedAllocation.map((g) => {
                const t = testById.get(g.supplyId);
                const gCount = greedy.countsBySupply.get(g.supplyId) ?? 0;
                const r = reading(t, g.quantitySelected, g.totalAvailable, Math.round(g.unitWeight));
                return (
                  <tr key={g.supplyId}>
                    <td className="max-w-[220px]">
                      <p className="truncate" title={g.name}>
                        {g.name}
                      </p>
                      <p className="font-mono text-[11px] text-bts-muted">{proposalRef(g.supplyId)}</p>
                    </td>
                    <td className="figure text-right">{Math.round(g.unitWeight)}</td>
                    <td className="figure text-right">{Math.round(g.unitBenefit)}</td>
                    <td className="figure text-right text-bts-sub">
                      {formatDecimal(g.unitWeight > 0 ? g.unitBenefit / g.unitWeight : 0)}{' '}
                      <span className="text-bts-muted">#{rankById.get(g.supplyId) ?? '—'}</span>
                    </td>
                    <td className={`figure text-right ${g.quantitySelected > 0 ? 'text-bts-emerald' : 'text-bts-muted'}`}>
                      {g.quantitySelected}/{g.totalAvailable}
                    </td>
                    <td className={`figure text-right ${gCount !== g.quantitySelected ? 'text-bts-rose' : 'text-bts-sub'}`}>{gCount}</td>
                    <td className="figure whitespace-nowrap text-right">
                      {t?.plusDelta === null || t?.plusDelta === undefined ? (
                        <span
                          className="text-bts-muted"
                          title={t?.plusReason === 'fully-funded' ? 'All requested units are already funded' : undefined}
                        >
                          {t?.plusReason === 'fully-funded' ? 'full' : t?.plusReason === 'over-budget' ? 'no fit' : '—'}
                        </span>
                      ) : (
                        <span className={t.plusDelta < 0 ? 'text-bts-rose' : 'text-bts-amber'}>{formatSignedInt(t.plusDelta)}</span>
                      )}
                    </td>
                    <td className="figure whitespace-nowrap text-right">
                      {t?.minusDelta === null || t?.minusDelta === undefined ? (
                        <span className="text-bts-muted" title="No units funded, so none can be removed">
                          none
                        </span>
                      ) : (
                        <span className={t.minusDelta < 0 ? 'text-bts-rose' : 'text-bts-amber'}>{formatSignedInt(t.minusDelta)}</span>
                      )}
                    </td>
                    <td className={`min-w-[260px] text-xs leading-snug ${r.tone}`}>{r.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </BtsSection>

      <BtsSection
        title="How the optimal value is composed"
        description="Read the funded units back from the table and sum them: the total must equal the bottom-right DP cell, and the cost must stay within W."
      >
        {funded.length === 0 ? (
          <p className="text-sm text-bts-sub">Nothing is funded at this budget.</p>
        ) : (
          <div className="space-y-3 font-mono text-[13px]">
            <div className={`grid gap-x-8 gap-y-1 ${wide ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {funded.map((g) => (
                <p key={g.supplyId} className="flex justify-between gap-4 text-bts-sub">
                  <span className="truncate">
                    {g.quantitySelected} × {Math.round(g.unitBenefit)} <span className="font-sans text-xs">({g.name})</span>
                  </span>
                  <span className="text-bts-ink">{formatInt(g.quantitySelected * Math.round(g.unitBenefit))}</span>
                </p>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-bts-line pt-3">
              <p className="flex items-center gap-1.5 text-bts-ink">
                Σ vᵢxᵢ = <span className="text-bts-sky">{formatInt(sumCheck)}</span> = DP[{expandedItems.length}][{capacity}]
                {sumCheck === optimum && <Check className="h-4 w-4 text-bts-emerald" aria-label="matches" />}
              </p>
              <p className="flex items-center gap-1.5 text-bts-ink">
                Σ wᵢxᵢ = {formatInt(costCheck)} ≤ W = {formatInt(capacity)}
                {costCheck <= capacity && <Check className="h-4 w-4 text-bts-emerald" aria-label="within budget" />}
              </p>
            </div>
          </div>
        )}
      </BtsSection>
    </div>
  );
}
