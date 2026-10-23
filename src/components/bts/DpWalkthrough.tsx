import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, Sparkles, StepBack, StepForward } from 'lucide-react';
import type { SupplyItem } from '../../algorithms/types';
import { generateDPBacktrackingTrace, generateDPTrace } from '../../algorithms/knapsackDP';
import { evaluateMini, findGreedyCounterexample, representativeUnits } from '../../algorithms/analysis';
import { BtsSection } from './primitives';
import { useBtsWide } from './layout';
import { proposalRef } from '../../lib/format';

type Mode = 'forward' | 'backtrack';
const MAX_PICK = 6;
const MAX_W = 60;

function initialPick(supplies: SupplyItem[]): { ids: string[]; capacity: number } {
  const ce = findGreedyCounterexample(supplies);
  if (ce) return { ids: ce.items.map((u) => u.sourceSupplyId), capacity: ce.capacity };
  const units = representativeUnits(supplies)
    .filter((u) => Math.round(u.weight) <= MAX_W)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 4);
  const total = units.reduce((s, u) => s + Math.round(u.weight), 0);
  return { ids: units.map((u) => u.sourceSupplyId), capacity: Math.max(5, Math.min(MAX_W, Math.round(total * 0.6))) };
}

export function DpWalkthrough({ supplies }: { supplies: SupplyItem[] }) {
  const wide = useBtsWide();
  const [{ ids, capacity }, setInstance] = useState(() => initialPick(supplies));
  const [mode, setMode] = useState<Mode>('forward');
  const [fStep, setFStep] = useState(0);
  const [bStep, setBStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ms, setMs] = useState(600);

  const allUnits = useMemo(() => representativeUnits(supplies), [supplies]);
  const items = useMemo(() => {
    const order = new Map(supplies.map((s, k) => [s.id, k]));
    return allUnits
      .filter((u) => ids.includes(u.sourceSupplyId))
      .sort((a, b) => (order.get(a.sourceSupplyId) ?? 0) - (order.get(b.sourceSupplyId) ?? 0));
  }, [allUnits, ids, supplies]);

  // drop selections that no longer exist in the register
  useEffect(() => {
    const valid = ids.filter((id) => allUnits.some((u) => u.sourceSupplyId === id));
    if (valid.length !== ids.length) setInstance((s) => ({ ...s, ids: valid }));
  }, [allUnits, ids]);

  const forward = useMemo(() => generateDPTrace(items, capacity), [items, capacity]);
  const backtrack = useMemo(() => generateDPBacktrackingTrace(items, capacity), [items, capacity]);
  const mini = useMemo(() => evaluateMini(items, capacity), [items, capacity]);

  useEffect(() => {
    setFStep(0);
    setBStep(0);
    setPlaying(false);
  }, [items, capacity]);

  const limit = mode === 'forward' ? forward.steps.length : backtrack.steps.length;
  const pos = mode === 'forward' ? fStep : bStep;
  const setPos = (v: number) => (mode === 'forward' ? setFStep : setBStep)(Math.max(0, Math.min(limit, v)));

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const setter = mode === 'forward' ? setFStep : setBStep;
      setter((p) => {
        if (p + 1 >= limit) setPlaying(false);
        return Math.min(limit, p + 1);
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [playing, ms, mode, limit]);

  const toggle = (id: string) => {
    setInstance((s) => {
      if (s.ids.includes(id)) return { ...s, ids: s.ids.filter((x) => x !== id) };
      if (s.ids.length >= MAX_PICK) return s;
      return { ...s, ids: [...s.ids, id] };
    });
  };

  const findCounter = () => {
    const ce = findGreedyCounterexample(supplies);
    if (ce) setInstance({ ids: ce.items.map((u) => u.sourceSupplyId), capacity: ce.capacity });
  };

  const fCur = fStep > 0 ? forward.steps[fStep - 1] : null;
  const tableNow = mode === 'forward' ? forward.tableHistory[Math.min(fStep, forward.tableHistory.length - 1)] : backtrack.dpTable;
  const bCur = bStep > 0 ? backtrack.steps[bStep - 1] : null;
  const visited = new Map<string, boolean>();
  for (let k = 0; k < bStep; k++)
    visited.set(`${backtrack.steps[k].itemIndex}-${backtrack.steps[k].capacityIndex}`, backtrack.steps[k].isChosen);
  const n = items.length;

  return (
    <div className="space-y-5">
      <BtsSection
        title="Build a small instance from the register"
        description="Pick 2 to 6 proposals (one unit each) and a small budget so every cell fits on screen. Every step comes from the project’s own generateDPTrace and generateDPBacktrackingTrace functions."
        actions={
          <button type="button" className="bts-btn" onClick={findCounter}>
            <Sparkles className="h-3.5 w-3.5 text-bts-amber" aria-hidden="true" />
            Find a case where greedy fails
          </button>
        }
      >
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Proposals in the walkthrough">
          {allUnits.map((u) => {
            const on = ids.includes(u.sourceSupplyId);
            const disabled = !on && ids.length >= MAX_PICK;
            return (
              <button
                key={u.sourceSupplyId}
                type="button"
                aria-pressed={on}
                disabled={disabled}
                onClick={() => toggle(u.sourceSupplyId)}
                className={`rounded border px-2 py-1 text-xs transition-colors disabled:opacity-40 ${
                  on
                    ? 'border-sky-400/70 bg-sky-400/15 text-sky-100'
                    : 'border-bts-line text-bts-sub hover:border-slate-500 hover:text-bts-ink'
                }`}
                title={`${proposalRef(u.sourceSupplyId)}: w = ${Math.round(u.weight)}, v = ${Math.round(u.benefit)}`}
              >
                {u.name}{' '}
                <span className="font-mono text-[11px] opacity-75">
                  ({Math.round(u.weight)}, {Math.round(u.benefit)})
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex min-w-[240px] flex-1 items-center gap-3 text-xs text-bts-sub">
            Budget W′
            <input
              type="range"
              min={1}
              max={MAX_W}
              value={capacity}
              onChange={(e) => setInstance((s) => ({ ...s, capacity: Number(e.target.value) }))}
              className="min-w-0 flex-1 cursor-pointer accent-sky-400"
            />
            <span className="figure w-8 text-right text-sm text-bts-ink">{capacity}</span>
          </label>
          <div className="flex flex-wrap gap-2 font-mono text-xs">
            <span className="rounded border border-bts-line px-2 py-1 text-bts-sub">
              greedy by v/w ={' '}
              <span className={mini.greedyValue < mini.optimalValue ? 'text-bts-rose' : 'text-bts-ink'}>{mini.greedyValue}</span>
            </span>
            <span className="rounded border border-bts-line px-2 py-1 text-bts-sub">
              DP optimum = <span className="text-bts-emerald">{mini.optimalValue}</span>
            </span>
            {mini.greedyValue < mini.optimalValue && (
              <span className="rounded bg-rose-400/15 px-2 py-1 text-rose-200">
                greedy falls short by {mini.optimalValue - mini.greedyValue}
              </span>
            )}
          </div>
        </div>
      </BtsSection>

      {n === 0 ? (
        <div className="bts-panel px-6 py-10 text-center text-sm text-bts-sub">Select at least one proposal to build the table.</div>
      ) : (
        <>
          <div className={`grid gap-5 ${wide ? 'grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]' : 'grid-cols-1'}`}>
            <BtsSection
              title={mode === 'forward' ? 'Recurrence' : 'Backtracking rule'}
              actions={
                <div className="inline-flex rounded border border-bts-line bg-bts-raised p-0.5" role="group" aria-label="Walkthrough phase">
                  {(
                    [
                      ['forward', 'Fill table'],
                      ['backtrack', 'Choose units'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={mode === id}
                      onClick={() => {
                        setPlaying(false);
                        setMode(id);
                      }}
                      className={`rounded px-2.5 py-1 text-xs ${mode === id ? 'bg-sky-400 font-semibold text-slate-950' : 'text-bts-sub hover:text-bts-ink'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              }
            >
              {mode === 'forward' ? (
                <pre className="whitespace-pre-wrap rounded bg-[#0B1326] p-3 font-mono text-[12.5px] leading-6 text-bts-ink">
                  <span className="text-bts-violet">if</span> wᵢ ≤ w:{'\n'}
                  {'  '}DP[i][w] = max( <span className="text-bts-amber">DP[i−1][w]</span>,{'\n'}
                  {'                  '}vᵢ + <span className="text-bts-emerald">DP[i−1][w−wᵢ]</span> ){'\n'}
                  <span className="text-bts-violet">else</span>:{'\n'}
                  {'  '}DP[i][w] = <span className="text-bts-amber">DP[i−1][w]</span>
                </pre>
              ) : (
                <pre className="whitespace-pre-wrap rounded bg-[#0B1326] p-3 font-mono text-[12.5px] leading-6 text-bts-ink">
                  w ← W{'\n'}
                  <span className="text-bts-violet">for</span> i = n … 1:{'\n'}
                  {'  '}
                  <span className="text-bts-violet">if</span> DP[i][w] ≠ <span className="text-bts-amber">DP[i−1][w]</span>:{'\n'}
                  {'    '}
                  <span className="text-bts-emerald">fund unit i</span>; w ← w − wᵢ{'\n'}
                  {'  '}
                  <span className="text-bts-violet">else</span>: skip unit i
                </pre>
              )}
              <div className="mt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="bts-btn" onClick={() => setPos(pos - 1)} disabled={pos === 0} aria-label="Previous step">
                    <StepBack className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="bts-btn-primary min-w-[92px]"
                    onClick={() => {
                      if (playing) setPlaying(false);
                      else {
                        if (pos >= limit) setPos(0);
                        setPlaying(true);
                      }
                    }}
                  >
                    {playing ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : pos >= limit ? (
                      <RotateCcw className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    {playing ? 'Pause' : pos >= limit ? 'Replay' : 'Play'}
                  </button>
                  <button type="button" className="bts-btn" onClick={() => setPos(pos + 1)} disabled={pos >= limit} aria-label="Next step">
                    <StepForward className="h-3.5 w-3.5" />
                  </button>
                  <span className="figure text-xs text-bts-sub">
                    Step {pos} / {limit}
                  </span>
                  <select
                    className="bts-select ml-auto py-1 text-xs"
                    value={ms}
                    onChange={(e) => setMs(Number(e.target.value))}
                    aria-label="Playback speed"
                  >
                    <option value={1100}>Slow</option>
                    <option value={600}>Normal</option>
                    <option value={250}>Fast</option>
                  </select>
                </div>
              </div>
            </BtsSection>

            <BtsSection title="What this step computes">
              <div aria-live="polite" className="min-h-[148px] text-[13px] leading-relaxed">
                {mode === 'forward' ? (
                  fCur ? (
                    <div className="space-y-2">
                      <p className="text-bts-ink">
                        Cell{' '}
                        <span className="font-mono text-white">
                          DP[{fCur.itemIndex}][{fCur.capacityIndex}]
                        </span>
                        : {fCur.itemName}{' '}
                        <span className="font-mono text-bts-sub">
                          (w = {fCur.itemWeight}, v = {fCur.itemBenefit})
                        </span>{' '}
                        with budget {fCur.capacityIndex}.
                      </p>
                      {fCur.withItemValue === null ? (
                        <p className="font-mono text-bts-amber">
                          {fCur.itemWeight} &gt; {fCur.capacityIndex}: cannot fit, copy {fCur.previousValue} from above
                        </p>
                      ) : (
                        <div className="space-y-0.5 font-mono">
                          <p>
                            <span className="text-bts-amber">exclude</span> = {fCur.previousValue}
                          </p>
                          <p>
                            <span className="text-bts-emerald">include</span> = {fCur.itemBenefit} + {fCur.withItemValue - fCur.itemBenefit}{' '}
                            = {fCur.withItemValue}
                          </p>
                          <p className="text-white">
                            → {fCur.chosenValue} ({fCur.withItemValue > fCur.previousValue ? 'include' : 'exclude'})
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-bts-sub">
                      Row 0 starts as all zeros. Step forward to fill the table one cell at a time, left to right, top to bottom.
                    </p>
                  )
                ) : bCur ? (
                  <div className="space-y-2">
                    <p className="text-bts-ink">
                      Compare{' '}
                      <span className="font-mono text-white">
                        DP[{bCur.itemIndex}][{bCur.capacityIndex}] = {bCur.currentValue}
                      </span>{' '}
                      with the cell above, <span className="font-mono text-bts-amber">{bCur.aboveValue}</span>.
                    </p>
                    <p className={bCur.isChosen ? 'font-semibold text-bts-emerald' : 'text-bts-sub'}>
                      {bCur.isChosen
                        ? `Different, so ${bCur.item.name} is funded. Budget ${bCur.capacityIndex} − ${Math.round(bCur.item.weight)} = ${bCur.nextCapacityIndex}.`
                        : `Equal, so ${bCur.item.name} is skipped. Budget stays ${bCur.capacityIndex}.`}
                    </p>
                    <p className="text-xs text-bts-sub">
                      Funded so far: {bCur.selectedItems.length === 0 ? 'none' : bCur.selectedItems.map((s) => s.name).join(', ')}
                    </p>
                  </div>
                ) : (
                  <p className="text-bts-sub">
                    Start at the bottom-right cell DP[{n}][{capacity}] = {backtrack.dpTable[n][capacity]} and walk upwards.
                  </p>
                )}
              </div>
            </BtsSection>
          </div>

          <BtsSection
            title={`DP table: ${n + 1} rows × ${capacity + 1} columns`}
            description="Rows are units, columns are budget values. Optimal value in the bottom-right cell."
          >
            <div className="scrollbar-thin relative overflow-x-auto">
              <table className="border-separate border-spacing-[2px] font-mono text-[13px]">
                <thead>
                  <tr>
                    <th scope="col" className="min-w-[180px] pr-2 text-left font-sans font-normal text-bts-muted">
                      i: unit (w, v)
                    </th>
                    {Array.from({ length: capacity + 1 }, (_, c) => {
                      const hot = (mode === 'forward' && fCur?.capacityIndex === c) || (mode === 'backtrack' && bCur?.capacityIndex === c);
                      return (
                        <th key={c} scope="col" className={`min-w-[36px] text-center font-normal ${hot ? 'text-white' : 'text-bts-muted'}`}>
                          {c}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: n + 1 }, (_, i) => {
                    const it = i > 0 ? items[i - 1] : null;
                    return (
                      <tr key={i}>
                        <th scope="row" className="max-w-[220px] truncate pr-2 text-left font-sans font-normal text-bts-sub">
                          {i}: {it ? `${it.name} (${Math.round(it.weight)}, ${Math.round(it.benefit)})` : 'no units'}
                        </th>
                        {Array.from({ length: capacity + 1 }, (_, c) => {
                          const v = tableNow[i][c];
                          let cls = v > 0 ? 'bg-bts-panel text-bts-ink' : 'bg-bts-panel/60 text-bts-muted';
                          if (mode === 'forward' && fCur) {
                            const filled = i < fCur.itemIndex || (i === fCur.itemIndex && c <= fCur.capacityIndex);
                            if (!filled && i > 0) cls = 'bg-transparent text-transparent';
                            if (i === fCur.itemIndex && c === fCur.capacityIndex) cls = 'bg-white text-slate-950 font-semibold';
                            else if (i === fCur.itemIndex - 1 && c === fCur.capacityIndex)
                              cls = 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/70';
                            else if (fCur.withItemValue !== null && i === fCur.itemIndex - 1 && c === fCur.capacityIndex - fCur.itemWeight)
                              cls = 'bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/70';
                          } else if (mode === 'forward' && !fCur && i > 0) {
                            cls = 'bg-transparent text-transparent';
                          }
                          if (mode === 'backtrack') {
                            const key = `${i}-${c}`;
                            if (bCur && i === bCur.itemIndex && c === bCur.capacityIndex)
                              cls = bCur.isChosen ? 'bg-emerald-400 text-slate-950 font-semibold' : 'bg-white text-slate-950 font-semibold';
                            else if (bCur && i === bCur.itemIndex - 1 && c === bCur.capacityIndex)
                              cls = 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/70';
                            else if (visited.has(key))
                              cls = visited.get(key) ? 'bg-emerald-400/25 text-emerald-100' : 'bg-slate-500/25 text-bts-ink';
                          }
                          return (
                            <td key={c} className={`rounded-[3px] px-1 py-1 text-center transition-colors ${cls}`}>
                              {v}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </BtsSection>
        </>
      )}
    </div>
  );
}
