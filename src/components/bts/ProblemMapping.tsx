import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { BtsData } from './BtsDrawer';
import { BtsSection, Metric, Sym } from './primitives';
import { useBtsWide } from './layout';
import { formatInt, proposalRef } from '../../lib/format';

export function ProblemMapping({ supplies, capacity, expandedItems, dpResult, summary }: BtsData) {
  const wide = useBtsWide();
  const n = expandedItems.length;
  const W = dpResult.capacity;
  const selectedIds = useMemo(() => new Set(dpResult.selectedItems.map((i) => i.id)), [dpResult.selectedItems]);

  const ranges = useMemo(() => {
    let cursor = 1;
    return supplies.map((s) => {
      const q = Math.max(0, Math.floor(s.quantity));
      const start = cursor;
      cursor += q;
      const units = expandedItems.filter((u) => u.sourceSupplyId === s.id);
      return { supply: s, start, end: start + q - 1, units, funded: units.filter((u) => selectedIds.has(u.id)).length };
    });
  }, [supplies, expandedItems, selectedIds]);

  const weights = supplies.map((s) => Math.round(s.unitWeight));
  const values = supplies.map((s) => Math.round(s.unitBenefit));
  const span = (arr: number[]) =>
    arr.length === 0
      ? '—'
      : Math.min(...arr) === Math.max(...arr)
        ? formatInt(arr[0])
        : `${formatInt(Math.min(...arr))} – ${formatInt(Math.max(...arr))}`;
  const feasible = dpResult.totalWeight <= W;

  const mapping: { portal: string; symbol: ReactNode; value: ReactNode; source: string }[] = [
    {
      portal: 'Total fiscal budget (₹ lakh)',
      symbol: <Sym base="W" />,
      value: formatInt(W),
      source: 'Budget control. Integer, because DP indexes a column per ₹ lakh.',
    },
    { portal: 'Proposals in the register', symbol: <Sym base="m" />, value: formatInt(supplies.length), source: 'Proposal register rows' },
    {
      portal: 'Units requested by proposal k',
      symbol: <Sym base="q" sub="k" />,
      value: supplies.length
        ? `${supplies
            .map((s) => s.quantity)
            .slice(0, 4)
            .join(', ')}${supplies.length > 4 ? ', …' : ''}`
        : '—',
      source: 'Each unit becomes its own 0/1 item',
    },
    {
      portal: 'Decision variables (resource units)',
      symbol: (
        <>
          n = Σ <Sym base="q" sub="k" />
        </>
      ),
      value: formatInt(n),
      source: 'expandSupplies() in helpers.ts',
    },
    { portal: 'Unit cost', symbol: <Sym base="w" sub="i" />, value: span(weights), source: 'supply.unitWeight' },
    { portal: 'Projected impact per unit', symbol: <Sym base="v" sub="i" />, value: span(values), source: 'supply.unitBenefit' },
    {
      portal: 'Fund (1) or defer (0) unit i',
      symbol: (
        <>
          <Sym base="x" sub="i" /> ∈ {'{0, 1}'}
        </>
      ),
      value: `${formatInt(dpResult.selectedItems.length)} ones`,
      source: 'Recovered by backtracking the DP table',
    },
    {
      portal: 'Allocated funds',
      symbol: (
        <>
          Σ <Sym base="w" sub="i" />
          <Sym base="x" sub="i" />
        </>
      ),
      value: formatInt(dpResult.totalWeight),
      source: 'Must not exceed W',
    },
    {
      portal: 'Remaining reserve',
      symbol: (
        <>
          W − Σ <Sym base="w" sub="i" />
          <Sym base="x" sub="i" />
        </>
      ),
      value: formatInt(dpResult.unusedCapacity),
      source: 'Unused capacity',
    },
    {
      portal: 'Total impact score',
      symbol: (
        <>
          Σ <Sym base="v" sub="i" />
          <Sym base="x" sub="i" /> = DP[n][W]
        </>
      ),
      value: formatInt(dpResult.maxBenefit),
      source: 'Bottom-right cell of the DP table',
    },
    {
      portal: 'Approved / partial / deferred',
      symbol: <span className="text-bts-sub">per proposal</span>,
      value: `${summary.approved} / ${summary.partial} / ${summary.deferred}`,
      source: 'All, some or none of a proposal’s units have xᵢ = 1',
    },
  ];

  return (
    <div className="space-y-5">
      <div className={`grid gap-5 ${wide ? 'grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]' : 'grid-cols-1'}`}>
        <BtsSection title="Formal model" description="The allocation question, written as a 0/1 Knapsack problem over the live register.">
          <div className="rounded border border-bts-line-soft bg-[#0B1326] px-4 py-4 text-[15px] leading-8 text-bts-ink">
            <div className="grid grid-cols-[auto_1fr] gap-x-4">
              <span className="text-bts-sub">maximise</span>
              <span>
                Σ<sub className="text-[0.65em]">i=1…n</sub> <Sym base="v" sub="i" /> · <Sym base="x" sub="i" />
              </span>
              <span className="text-bts-sub">subject to</span>
              <span>
                Σ<sub className="text-[0.65em]">i=1…n</sub> <Sym base="w" sub="i" /> · <Sym base="x" sub="i" /> ≤ <Sym base="W" />
              </span>
              <span />
              <span>
                <Sym base="x" sub="i" /> ∈ {'{0, 1}'}
              </span>
            </div>
          </div>
          <div className="mt-3 space-y-1.5 font-mono text-[13px]">
            <p className="text-bts-sub">
              with <span className="text-bts-ink">W = {formatInt(W)}</span>, <span className="text-bts-ink">n = {formatInt(n)}</span>
            </p>
            <p className="text-bts-sub">
              Σ vᵢxᵢ = <span className="text-bts-sky">{formatInt(dpResult.maxBenefit)}</span> (maximum)
            </p>
            <p className="flex items-center gap-1.5 text-bts-sub">
              Σ wᵢxᵢ = <span className="text-bts-ink">{formatInt(dpResult.totalWeight)}</span> ≤ {formatInt(W)}
              {feasible && <Check className="h-3.5 w-3.5 text-bts-emerald" aria-label="constraint satisfied" />}
            </p>
          </div>
        </BtsSection>

        <BtsSection title="Instance size" description="What the solver is working on right now.">
          <div className="grid grid-cols-2 gap-2.5">
            <Metric label="Budget W" value={formatInt(capacity)} hint="₹ lakh = DP columns − 1" />
            <Metric label="Unit decisions n" value={formatInt(n)} hint={`from ${supplies.length} proposals`} />
            <Metric label="DP table" value={`${formatInt(n + 1)} × ${formatInt(W + 1)}`} hint={`${formatInt((n + 1) * (W + 1))} cells`} />
            <Metric label="Optimum DP[n][W]" value={formatInt(dpResult.maxBenefit)} tone="sky" hint="total impact score" />
            <Metric label="Brute force would test" value={n > 60 ? `2^${n}` : formatInt(2 ** n)} tone="rose" hint="subsets of n units" />
            <Metric label="DP evaluates" value={formatInt(n * (W + 1))} tone="emerald" hint="n × (W + 1) cells" />
          </div>
        </BtsSection>
      </div>

      <BtsSection
        title="Portal field → knapsack symbol"
        description="Every number on the portal maps to one term of the model. Values update with the register and budget."
      >
        <div className="scrollbar-thin relative overflow-x-auto">
          <table className="bts-table min-w-[640px]">
            <thead>
              <tr>
                <th scope="col">Portal term</th>
                <th scope="col">Symbol</th>
                <th scope="col" className="text-right">
                  Live value
                </th>
                <th scope="col">Where it comes from</th>
              </tr>
            </thead>
            <tbody>
              {mapping.map((m) => (
                <tr key={m.portal}>
                  <td className="text-bts-ink">{m.portal}</td>
                  <td className="whitespace-nowrap text-[14px] text-bts-sky">{m.symbol}</td>
                  <td className="figure whitespace-nowrap text-right text-bts-ink">{m.value}</td>
                  <td className="text-bts-sub">{m.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BtsSection>

      <BtsSection
        title="Unit expansion: proposals become 0/1 items"
        description={
          <>
            A proposal for q units is a bounded choice (fund 0…q). Expanding it into q identical items makes it a pure 0/1 problem. Each
            square is one item <Sym base="x" sub="i" />; filled squares are the units the DP funded.
          </>
        }
        actions={
          <div className="flex items-center gap-3 text-xs text-bts-sub">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-bts-emerald" aria-hidden="true" />
              xᵢ = 1
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[2px] border border-slate-500" aria-hidden="true" />
              xᵢ = 0
            </span>
          </div>
        }
      >
        {ranges.length === 0 ? (
          <p className="py-6 text-center text-sm text-bts-sub">The register is empty, so n = 0 and the optimum is 0.</p>
        ) : (
          <ul className="space-y-2.5">
            {ranges.map((r) => (
              <li key={r.supply.id} className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-bts-ink" title={r.supply.name}>
                    {r.supply.name}
                  </p>
                  <p className="flex flex-wrap gap-x-2.5 font-mono text-[11px] text-bts-muted">
                    <span>{proposalRef(r.supply.id)}</span>
                    <span>
                      w={Math.round(r.supply.unitWeight)} v={Math.round(r.supply.unitBenefit)}
                    </span>
                    <span>{r.units.length > 0 ? `rows ${r.start}–${r.end}` : 'no units'}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-[3px]">
                  {r.units.map((u, k) => {
                    const on = selectedIds.has(u.id);
                    return (
                      <span
                        key={u.id}
                        title={`x${r.start + k} = ${on ? 1 : 0} (unit ${u.unitIndex} of ${u.totalUnits}, DP row ${r.start + k})`}
                        className={`h-2.5 w-2.5 rounded-[2px] ${on ? 'bg-bts-emerald' : 'border border-slate-600'}`}
                      />
                    );
                  })}
                  <span className="ml-2 font-mono text-[11px] text-bts-sub">
                    {r.funded}/{r.units.length}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </BtsSection>

      <div className={`grid gap-5 ${wide ? 'grid-cols-3' : 'grid-cols-1'}`}>
        <div className="rounded-md border border-bts-line-soft bg-bts-panel/60 p-4 text-[13px] leading-relaxed text-bts-sub">
          <p className="mb-1 font-semibold text-bts-ink">Why 0/1, not fractional</p>A tent cluster or a medicine batch cannot be bought in
          fractions. Fractional knapsack (sort by v/w, fill greedily) would be optimal only if units could be split, so it is used here only
          as an upper bound inside branch and bound.
        </div>
        <div className="rounded-md border border-bts-line-soft bg-bts-panel/60 p-4 text-[13px] leading-relaxed text-bts-sub">
          <p className="mb-1 font-semibold text-bts-ink">Why integer costs</p>
          DP keeps one column per budget value 0…W, so costs and the budget are whole ₹ lakh. The register form enforces this, and the
          solver rounds defensively with Math.round.
        </div>
        <div className="rounded-md border border-bts-line-soft bg-bts-panel/60 p-4 text-[13px] leading-relaxed text-bts-sub">
          <p className="mb-1 font-semibold text-bts-ink">Same state as the portal</p>
          This inspector receives the exact objects the portal renders: the expanded items, the DP result (table included) and the
          branch-and-bound result. Change the budget above or edit a proposal and every view here recomputes.
        </div>
      </div>
    </div>
  );
}
