import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Scatter, ComposedChart, Tooltip, XAxis, YAxis } from 'recharts';
import { FlaskConical, Timer } from 'lucide-react';
import knapsackSource from '../../algorithms/knapsackDP.ts?raw';
import helpersSource from '../../algorithms/helpers.ts?raw';
import bbSource from '../../algorithms/branchAndBound.ts?raw';
import type { BtsData } from './BtsDrawer';
import { BtsSection, Metric } from './primitives';
import { useBtsWide } from './layout';
import { CodeViewer } from './CodeViewer';
import type { LineNote } from './CodeViewer';
import { extractTopLevel } from '../../lib/highlight';
import { solveKnapsackDP } from '../../algorithms/knapsackDP';
import { tabulationStats } from '../../algorithms/analysis';
import { BUDGET_MAX, formatDecimal, formatInt } from '../../lib/format';
import { ChartTooltip } from '../portal/ChartTooltip';

type SnippetId = 'dp' | 'trace' | 'expand' | 'bb' | 'bound';

const SNIPPETS: { id: SnippetId; label: string; file: string; source: string; decl: string }[] = [
  { id: 'dp', label: 'DP solver', file: 'src/algorithms/knapsackDP.ts', source: knapsackSource, decl: 'export function solveKnapsackDP' },
  {
    id: 'trace',
    label: 'Backtracking trace',
    file: 'src/algorithms/knapsackDP.ts',
    source: knapsackSource,
    decl: 'export function generateDPBacktrackingTrace',
  },
  {
    id: 'expand',
    label: 'Unit expansion',
    file: 'src/algorithms/helpers.ts',
    source: helpersSource,
    decl: 'export function expandSupplies',
  },
  {
    id: 'bb',
    label: 'Branch & bound',
    file: 'src/algorithms/branchAndBound.ts',
    source: bbSource,
    decl: 'export function solveBranchAndBound',
  },
  {
    id: 'bound',
    label: 'Fractional bound',
    file: 'src/algorithms/branchAndBound.ts',
    source: bbSource,
    decl: 'export function calculateUpperBound',
  },
];

function findLine(code: string, needle: string, which: 'first' | 'last' = 'first'): number {
  const lines = code.split('\n');
  if (which === 'last') {
    for (let k = lines.length - 1; k >= 0; k--) if (lines[k].includes(needle)) return k;
    return -1;
  }
  return lines.findIndex((l) => l.includes(needle));
}

interface BenchResult {
  runs: number;
  median: number;
  min: number;
  max: number;
}

interface ScalePoint {
  W: number;
  ms: number;
  cells: number;
  fit?: number;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function CodeComplexity({ supplies, capacity, expandedItems, dpResult, bbResult }: BtsData) {
  const wide = useBtsWide();
  const [snippet, setSnippet] = useState<SnippetId>('dp');
  const [bench, setBench] = useState<BenchResult | null>(null);
  const [scale, setScale] = useState<ScalePoint[] | null>(null);
  const [busy, setBusy] = useState<'bench' | 'scale' | null>(null);

  const n = expandedItems.length;
  const W = dpResult.capacity;
  const stats = useMemo(
    () => (dpResult.dpTable && n > 0 ? tabulationStats(dpResult.dpTable, dpResult.dpItems ?? []) : null),
    [dpResult, n],
  );
  const evaluations = n * (W + 1);
  const cells = (n + 1) * (W + 1);
  const excludeBetter = stats ? stats.evaluations - stats.infeasible - stats.includeWins - stats.ties : 0;

  const active = SNIPPETS.find((s) => s.id === snippet) ?? SNIPPETS[0];
  const extracted = useMemo(() => extractTopLevel(active.source, active.decl), [active]);

  const notes = useMemo(() => {
    const m = new Map<number, LineNote>();
    if (!extracted) return m;
    const code = extracted.code;
    const put = (needle: string, note: LineNote, which: 'first' | 'last' = 'first') => {
      const idx = findLine(code, needle, which);
      if (idx >= 0) m.set(idx, note);
    };
    if (snippet === 'dp') {
      put('const dp: number[][] = Array.from(', { text: `${formatInt(cells)} cells allocated` });
      put('for (let i = 1; i <= n; i++)', { text: `runs ${formatInt(n)}×` });
      put('for (let w = 0; w <= W; w++)', { text: `runs ${formatInt(evaluations)}×` });
      if (stats) {
        put('if (itemWeight <= w)', {
          text: `true ${formatInt(stats.evaluations - stats.infeasible)}, false ${formatInt(stats.infeasible)}`,
          tone: 'amber',
        });
        put('dp[i][w] = withItem > withoutItem', { text: `include won ${formatInt(stats.includeWins)}×`, tone: 'emerald' });
      }
      put('const maxBenefit = dp[n][W];', { text: `= ${formatInt(dpResult.maxBenefit)}`, tone: 'emerald' });
      put('for (let i = n; i > 0; i--)', { text: `${formatInt(n)} comparisons` });
      put('selectedItems.push(item);', { text: `${formatInt(dpResult.selectedItems.length)} units funded`, tone: 'emerald' });
      put(
        'executionTimeMs: Number((endTime - startTime).toFixed(3)),',
        { text: `${dpResult.executionTimeMs} ms in the portal’s run` },
        'last',
      );
    } else if (snippet === 'trace') {
      put('for (let i = n; i > 0; i--)', { text: `${formatInt(n)} steps for this register` });
      put('selectedItems.push(item);', { text: `${formatInt(dpResult.selectedItems.length)} pushes`, tone: 'emerald' });
    } else if (snippet === 'expand') {
      put('for (let u = 1; u <= qty; u++)', { text: `${formatInt(n)} items from ${supplies.length} proposals` });
    } else if (snippet === 'bb') {
      put('nodesExplored++;', { text: `${formatInt(bbResult.nodesExplored ?? 0)} nodes popped` });
      put('nodesPrunedBound++;', { text: `${formatInt(bbResult.nodesPrunedBound ?? 0)} bound prunes in total`, tone: 'amber' });
      put('nodesPrunedCapacity++;', { text: `${formatInt(bbResult.nodesPrunedCapacity ?? 0)} capacity prunes`, tone: 'amber' });
      put('for (const item of sortedItems)', { text: `greedy start: ${formatInt(n)} items` });
    }
    return m;
  }, [extracted, snippet, cells, n, evaluations, stats, dpResult, bbResult, supplies.length]);

  const runBench = () => {
    setBusy('bench');
    window.setTimeout(() => {
      const times: number[] = [];
      for (let r = 0; r < 7; r++) times.push(solveKnapsackDP(expandedItems, capacity, supplies).executionTimeMs);
      setBench({ runs: times.length, median: median(times), min: Math.min(...times), max: Math.max(...times) });
      setBusy(null);
    }, 30);
  };

  const runScale = () => {
    setBusy('scale');
    window.setTimeout(() => {
      const budgets = [250, 500, 1000, 1500, 2000, BUDGET_MAX];
      solveKnapsackDP(expandedItems, 500, supplies); // warm-up for the JIT
      const pts: ScalePoint[] = budgets.map((b) => {
        const t: number[] = [];
        for (let r = 0; r < 3; r++) t.push(solveKnapsackDP(expandedItems, b, supplies).executionTimeMs);
        return { W: b, ms: median(t), cells: n * (b + 1) };
      });
      // least-squares line through the origin: ms ≈ k · n · (W + 1)
      const num = pts.reduce((s, p) => s + p.cells * p.ms, 0);
      const den = pts.reduce((s, p) => s + p.cells * p.cells, 0) || 1;
      const k = num / den;
      setScale(pts.map((p) => ({ ...p, fit: Number((k * p.cells).toFixed(3)) })));
      setBusy(null);
    }, 30);
  };

  const breakdown = stats
    ? [
        { label: 'include wins', value: stats.includeWins, cls: 'bg-bts-emerald' },
        { label: 'tie, previous kept', value: stats.ties, cls: 'bg-slate-400' },
        { label: 'previous better', value: excludeBetter, cls: 'bg-slate-600' },
        { label: 'cannot fit', value: stats.infeasible, cls: 'bg-bts-amber' },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div className={`grid gap-2.5 ${wide ? 'grid-cols-4' : 'grid-cols-2'}`}>
        <Metric
          label="Time complexity"
          value="O(n·W)"
          tone="sky"
          hint={`n·(W+1) = ${formatInt(n)} × ${formatInt(W + 1)} = ${formatInt(evaluations)} updates`}
        />
        <Metric
          label="Space complexity"
          value="O(n·W)"
          tone="sky"
          hint={`${formatInt(cells)} cells ≈ ${formatDecimal((cells * 4) / (1024 * 1024))} MB as Int32Array`}
        />
        <Metric
          label="Measured run time"
          value={`${dpResult.executionTimeMs} ms`}
          tone="emerald"
          hint="solveKnapsackDP, this portal render"
        />
        <Metric label="Subproblems solved" value={formatInt(cells)} hint={`(n+1)(W+1); backtracking adds ${formatInt(n)} steps`} />
      </div>

      <div className={`grid gap-5 ${wide ? 'grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]' : 'grid-cols-1'}`}>
        <BtsSection
          title="Implementation"
          description="The project’s own source, loaded at build time. Badges show how often each line ran for the current register and budget."
          actions={
            <select
              className="bts-select"
              value={snippet}
              onChange={(e) => setSnippet(e.target.value as SnippetId)}
              aria-label="Choose function"
            >
              {SNIPPETS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          }
        >
          {extracted ? (
            <CodeViewer code={extracted.code} startLine={extracted.startLine} fileName={active.file} notes={notes} />
          ) : (
            <p className="text-sm text-bts-sub">
              Could not locate {active.decl} in {active.file}.
            </p>
          )}
        </BtsSection>

        <div className="space-y-5">
          <BtsSection title="Where the work goes" description="How each of the n·(W+1) cell updates was decided in this run.">
            {stats ? (
              <>
                <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-sm" aria-hidden="true">
                  {breakdown.map((b) =>
                    b.value > 0 ? (
                      <div key={b.label} className={`${b.cls} h-full`} style={{ width: `${(b.value / stats.evaluations) * 100}%` }} />
                    ) : null,
                  )}
                </div>
                <ul className="mt-3 space-y-1.5 text-[13px]">
                  {breakdown.map((b) => (
                    <li key={b.label} className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-bts-sub">
                        <span className={`h-2.5 w-2.5 rounded-[2px] ${b.cls}`} aria-hidden="true" />
                        {b.label}
                      </span>
                      <span className="figure text-bts-ink">
                        {formatInt(b.value)}{' '}
                        <span className="text-bts-muted">({formatDecimal((b.value / Math.max(1, stats.evaluations)) * 100, 1)}%)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-bts-sub">No cells to evaluate.</p>
            )}
          </BtsSection>

          <BtsSection
            title="Benchmark this instance"
            description="Re-runs solveKnapsackDP seven times on the live data. Timings come from performance.now() inside the solver."
            actions={
              <button type="button" className="bts-btn" onClick={runBench} disabled={busy !== null || n === 0}>
                <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                {busy === 'bench' ? 'Running…' : 'Run 7×'}
              </button>
            }
          >
            {bench ? (
              <div className="grid grid-cols-3 gap-2">
                <Metric label="Median" value={`${formatDecimal(bench.median)} ms`} tone="emerald" />
                <Metric label="Fastest" value={`${formatDecimal(bench.min)} ms`} />
                <Metric label="Cells per ms" value={formatInt(evaluations / Math.max(0.001, bench.median))} />
              </div>
            ) : (
              <p className="text-[13px] text-bts-sub">
                Single timings are noisy; the median of several runs is a fairer figure to quote in a viva.
              </p>
            )}
          </BtsSection>
        </div>
      </div>

      <BtsSection
        title="Pseudo-polynomial in practice"
        description="Run time grows linearly with the budget W, not with the number of bits needed to write W down. Doubling W doubles the table, even though the input grows by one bit."
        actions={
          <button type="button" className="bts-btn" onClick={runScale} disabled={busy !== null || n === 0}>
            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
            {busy === 'scale' ? 'Running…' : 'Run scaling test'}
          </button>
        }
      >
        {scale ? (
          <div className={`grid gap-5 ${wide ? 'grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]' : 'grid-cols-1'}`}>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={scale} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="#1F2C46" vertical={false} />
                  <XAxis
                    dataKey="W"
                    type="number"
                    domain={[0, BUDGET_MAX]}
                    ticks={[0, 500, 1000, 1500, 2000, 2500]}
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={{ stroke: '#26344F' }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} unit=" ms" />
                  <Tooltip
                    cursor={{ stroke: '#64748B', strokeWidth: 1 }}
                    content={(p) => {
                      const d = p.payload?.[0]?.payload as ScalePoint | undefined;
                      return (
                        <ChartTooltip
                          dark
                          active={p.active}
                          label={d ? `W = ${formatInt(d.W)} (${formatInt(d.cells)} updates)` : undefined}
                          rows={
                            d
                              ? [
                                  { key: 'm', value: `${formatDecimal(d.ms)} ms`, name: 'measured median', color: '#38BDF8' },
                                  { key: 'f', value: `${formatDecimal(d.fit ?? 0)} ms`, name: 'linear fit', color: '#94A3B8' },
                                ]
                              : []
                          }
                        />
                      );
                    }}
                  />
                  <Line type="linear" dataKey="fit" stroke="#94A3B8" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Scatter dataKey="ms" fill="#38BDF8" isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="scrollbar-thin relative overflow-x-auto">
              <table className="bts-table">
                <thead>
                  <tr>
                    <th scope="col" className="text-right">
                      W
                    </th>
                    <th scope="col" className="text-right">
                      n·(W+1)
                    </th>
                    <th scope="col" className="text-right">
                      median ms
                    </th>
                    <th scope="col" className="text-right">
                      bits for W
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scale.map((p) => (
                    <tr key={p.W}>
                      <td className="figure text-right">{formatInt(p.W)}</td>
                      <td className="figure text-right text-bts-sub">{formatInt(p.cells)}</td>
                      <td className="figure text-right text-bts-sky">{formatDecimal(p.ms)}</td>
                      <td className="figure text-right text-bts-sub">{Math.ceil(Math.log2(p.W + 1))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-6">
            <div className="h-[120px] w-full max-w-sm">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[250, 500, 1000, 1500, 2000, BUDGET_MAX].map((b) => ({ W: b, cells: n * (b + 1) }))}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <XAxis
                    dataKey="W"
                    type="number"
                    domain={[0, BUDGET_MAX]}
                    ticks={[0, 500, 1000, 1500, 2000, 2500]}
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    axisLine={{ stroke: '#26344F' }}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Line
                    type="linear"
                    dataKey="cells"
                    stroke="#64748B"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#64748B', strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="max-w-md text-[13px] leading-relaxed text-bts-sub">
              The predicted work n·(W+1) is a straight line in W. Run the test to time the real solver at six budgets on your current{' '}
              {formatInt(n)} units and compare with a fitted line.
            </p>
          </div>
        )}
      </BtsSection>
    </div>
  );
}
