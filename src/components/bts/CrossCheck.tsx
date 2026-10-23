import { useEffect, useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import type { BtsData } from './BtsDrawer';
import { BtsSection, Metric } from './primitives';
import { useBtsWide } from './layout';
import { BbTree } from './BbTree';
import { solveKnapsackDP } from '../../algorithms/knapsackDP';
import { solveBranchAndBound } from '../../algorithms/branchAndBound';
import { formatInt, formatPercent, niceTicks } from '../../lib/format';
import { ChartTooltip } from '../portal/ChartTooltip';

interface SweepPoint {
  budget: number;
  dp: number;
  bb: number;
}

export function CrossCheck({ supplies, expandedItems, dpResult, bbResult, verification }: BtsData) {
  const wide = useBtsWide();
  const [sweep, setSweep] = useState<SweepPoint[] | null>(null);

  // Independent re-solve at 20 budgets with both algorithms (deferred so the tab paints first).
  useEffect(() => {
    setSweep(null);
    const t = window.setTimeout(() => {
      const pts: SweepPoint[] = [];
      for (let b = 100; b <= 2000; b += 100) {
        pts.push({
          budget: b,
          dp: solveKnapsackDP(expandedItems, b, supplies).maxBenefit,
          bb: solveBranchAndBound(expandedItems, b, supplies).maxBenefit,
        });
      }
      setSweep(pts);
    }, 60);
    return () => window.clearTimeout(t);
  }, [expandedItems, supplies]);

  const explored = bbResult.nodesExplored ?? 0;
  const pruned = bbResult.nodesPruned ?? 0;
  const n = expandedItems.length;
  const mismatches = sweep ? sweep.filter((p) => p.dp !== p.bb).length : 0;
  const sweepTicks = niceTicks(sweep ? Math.max(1, ...sweep.map((p) => Math.max(p.dp, p.bb))) : 1);
  const provenAtRoot = explored <= 1 && verification.isMatching && n > 0;

  const rows: { metric: string; dp: string; bb: string }[] = [
    { metric: 'Optimal total impact', dp: formatInt(dpResult.maxBenefit), bb: formatInt(bbResult.maxBenefit) },
    { metric: 'Cost of selection', dp: formatInt(dpResult.totalWeight), bb: formatInt(bbResult.totalWeight) },
    { metric: 'Unused budget', dp: formatInt(dpResult.unusedCapacity), bb: formatInt(bbResult.unusedCapacity) },
    { metric: 'Units funded', dp: formatInt(dpResult.selectedItems.length), bb: formatInt(bbResult.selectedItems.length) },
    { metric: 'Measured time', dp: `${dpResult.executionTimeMs} ms`, bb: `${bbResult.executionTimeMs} ms` },
    {
      metric: 'Work done',
      dp: `${formatInt(n * (dpResult.capacity + 1))} cell updates`,
      bb: `${formatInt(explored)} ${explored === 1 ? 'node' : 'nodes'} popped`,
    },
    { metric: 'Time complexity', dp: 'O(n·W), pseudo-polynomial', bb: 'O(2ⁿ) worst case' },
    { metric: 'Space complexity', dp: 'O(n·W) table', bb: 'O(queue) nodes, O(n) depth' },
    { metric: 'Search strategy', dp: 'Bottom-up tabulation', bb: 'Best-first, max-heap on upper bound' },
    { metric: 'Pruning', dp: 'None: every subproblem solved', bb: 'Bound ≤ best, or cost > W' },
  ];

  return (
    <div className="space-y-5">
      <div
        className={`flex items-start gap-3 rounded-md border px-4 py-3 text-[13px] ${
          verification.isMatching
            ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
            : 'border-rose-400/40 bg-rose-400/10 text-rose-100'
        }`}
        role="status"
      >
        {verification.isMatching ? (
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-bts-emerald" aria-hidden="true" />
        ) : (
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-bts-rose" aria-hidden="true" />
        )}
        <p>
          {verification.isMatching ? (
            <>
              <span className="font-semibold">Solutions agree.</span> Dynamic programming and branch and bound independently reach{' '}
              <span className="font-mono">{formatInt(verification.dpBenefit)}</span>. The portal shows this check as “Plan verified as
              optimal”.
              {verification.weightDiff !== 0 && ' The two selections differ in cost: more than one optimal plan exists.'}
            </>
          ) : (
            verification.message
          )}
        </p>
      </div>

      <div className={`grid gap-2.5 ${wide ? 'grid-cols-4' : 'grid-cols-2'}`}>
        <Metric label="Nodes explored" value={formatInt(explored)} tone="sky" hint="popped from the priority queue" />
        <Metric label="Pruned by bound" value={formatInt(bbResult.nodesPrunedBound ?? 0)} tone="rose" hint="bound ≤ best found" />
        <Metric label="Pruned by budget" value={formatInt(bbResult.nodesPrunedCapacity ?? 0)} tone="amber" hint="cost would exceed W" />
        <Metric
          label="Share of decisions pruned"
          value={formatPercent(explored + pruned > 0 ? pruned / (explored + pruned) : 0)}
          hint={`full tree has 2^${n} leaves`}
        />
      </div>

      {provenAtRoot && (
        <p className="rounded-md border border-bts-line-soft bg-bts-panel/60 px-4 py-3 text-[13px] leading-relaxed text-bts-sub">
          <span className="font-semibold text-bts-ink">Optimality proven at the root.</span> At this budget the greedy starting solution
          already reaches the root’s fractional upper bound, so branch and bound prunes the root immediately: no branching is needed to
          prove nothing better exists. Try another budget (for example 1,500) to see the tree search do real work.
        </p>
      )}

      <BtsSection
        title="Side by side"
        description="Same live input, two algorithms. Values come from the results the portal is rendering right now."
      >
        <div className="scrollbar-thin relative overflow-x-auto">
          <table className="bts-table min-w-[600px]">
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">Dynamic programming</th>
                <th scope="col">Branch and bound</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.metric}>
                  <td className="text-bts-sub">{r.metric}</td>
                  <td className="font-mono">{r.dp}</td>
                  <td className="font-mono">{r.bb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BtsSection>

      <BtsSection
        title="Agreement across budgets"
        description="Both solvers re-run at 20 budgets from 100 to 2,000. The line is the DP optimum; dots are branch-and-bound results. Every dot on the line is an independent confirmation."
      >
        {sweep ? (
          <>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={sweep} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="#1F2C46" vertical={false} />
                  <XAxis
                    dataKey="budget"
                    type="number"
                    domain={[0, 2000]}
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={{ stroke: '#26344F' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    ticks={sweepTicks}
                    domain={[0, sweepTicks[sweepTicks.length - 1]]}
                    tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}K` : String(v))}
                  />
                  <Tooltip
                    cursor={{ stroke: '#64748B', strokeWidth: 1 }}
                    content={(p) => {
                      const d = p.payload?.[0]?.payload as SweepPoint | undefined;
                      return (
                        <ChartTooltip
                          dark
                          active={p.active}
                          label={d ? `Budget ${formatInt(d.budget)}` : undefined}
                          rows={
                            d
                              ? [
                                  { key: 'dp', value: formatInt(d.dp), name: 'dynamic programming', color: '#3987E5' },
                                  { key: 'bb', value: formatInt(d.bb), name: 'branch and bound', color: '#D95926' },
                                ]
                              : []
                          }
                        />
                      );
                    }}
                  />
                  <Line type="monotone" dataKey="dp" stroke="#3987E5" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Scatter dataKey="bb" fill="#D95926" isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-bts-sub">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-[2px] w-4 rounded bg-[#3987E5]" aria-hidden="true" />
                Dynamic programming
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#D95926]" aria-hidden="true" />
                Branch and bound
              </span>
              <span className={mismatches === 0 ? 'text-bts-emerald' : 'text-bts-rose'}>
                {mismatches === 0 ? 'All 20 budgets agree.' : `${mismatches} budgets disagree.`}
              </span>
            </div>
          </>
        ) : (
          <p className="py-10 text-center text-sm text-bts-sub">Re-solving at 20 budgets…</p>
        )}
      </BtsSection>

      <BtsSection
        title="State-space tree (teaching instance)"
        description="Branch and bound on four of your proposals, one unit each, highest impact per rupee first. This trace explores depth-first with the include branch first; the production solver applies the same bounds in best-first order from a priority queue."
      >
        <BbTree supplies={supplies} />
      </BtsSection>
    </div>
  );
}
