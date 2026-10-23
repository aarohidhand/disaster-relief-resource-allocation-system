import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsRight, Pause, Play, RotateCcw, SkipBack, SkipForward, StepBack, StepForward } from 'lucide-react';
import type { BtsData } from './BtsDrawer';
import type { BacktrackStepLite, Cell, RowGroup } from './DpHeatmap';
import { DpHeatmap, RAMP_CSS } from './DpHeatmap';
import { DpWalkthrough } from './DpWalkthrough';
import { BtsSection } from './primitives';
import { useBtsWide } from './layout';
import { generateDPBacktrackingTrace } from '../../algorithms/knapsackDP';
import { formatInt, proposalRef } from '../../lib/format';

type Phase = 'tabulate' | 'backtrack';
type Speed = 'slow' | 'normal' | 'fast';
const SPEEDS: Record<Speed, { ms: number; stride: number; label: string }> = {
  slow: { ms: 260, stride: 1, label: 'Slow' },
  normal: { ms: 90, stride: 1, label: 'Normal' },
  fast: { ms: 40, stride: 4, label: 'Fast' },
};

export function DpExecution(props: BtsData) {
  const [view, setView] = useState<'live' | 'walkthrough'>('live');
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-bts-line bg-bts-panel p-1" role="group" aria-label="Instance">
          {(
            [
              ['live', 'Live instance (full table)', 'Full table'],
              ['walkthrough', 'Readable walkthrough (cell by cell)', 'Walkthrough'],
            ] as const
          ).map(([id, label, short]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={`rounded px-3 py-1.5 text-[13px] transition-colors ${view === id ? 'bg-bts-raised font-semibold text-white' : 'text-bts-sub hover:text-bts-ink'}`}
            >
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{short}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-bts-muted">
          {view === 'live'
            ? 'Every cell of the solver’s real table for the current register and budget.'
            : 'A small instance built from your own proposals, with every number visible.'}
        </p>
      </div>
      {view === 'live' ? <LiveExecution {...props} /> : <DpWalkthrough supplies={props.supplies} />}
    </div>
  );
}

function LiveExecution({ supplies, dpResult }: BtsData) {
  const wide = useBtsWide();
  const table = dpResult.dpTable ?? [[0]];
  const items = dpResult.dpItems ?? [];
  const n = items.length;
  const W = dpResult.capacity;

  const trace = useMemo(() => (n > 0 && W > 0 ? generateDPBacktrackingTrace(items, W) : null), [items, W, n]);
  const steps: BacktrackStepLite[] = useMemo(
    () => (trace ? trace.steps.map((s) => ({ i: s.itemIndex, w: s.capacityIndex, nextW: s.nextCapacityIndex, chosen: s.isChosen })) : []),
    [trace],
  );

  const groups: RowGroup[] = useMemo(() => {
    let cursor = 1;
    return supplies
      .filter((s) => Math.floor(s.quantity) > 0)
      .map((s) => {
        const q = Math.floor(s.quantity);
        const g = {
          key: s.id,
          label: proposalRef(s.id).replace('DRF-26-', '#'),
          title: `${s.name}: rows ${cursor}–${cursor + q - 1}`,
          start: cursor,
          end: cursor + q - 1,
        };
        cursor += q;
        return g;
      });
  }, [supplies]);

  const [phase, setPhase] = useState<Phase>('tabulate');
  const [row, setRow] = useState(n);
  const [stepIndex, setStepIndex] = useState(steps.length);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>('normal');
  const [focus, setFocus] = useState<Cell | null>(null);
  const [hover, setHover] = useState<Cell | null>(null);
  const [colorMode, setColorMode] = useState<'value' | 'decision'>('value');

  // New data → show the finished table again, keep the pinned cell if it still exists.
  useEffect(() => {
    setRow(n);
    setStepIndex(steps.length);
    setPlaying(false);
    setFocus((f) => (f && f.i <= n && f.w <= W ? f : null));
  }, [table, n, W, steps.length]);

  const limit = phase === 'tabulate' ? n : steps.length;
  const position = phase === 'tabulate' ? row : stepIndex;
  const setPosition = (v: number) => {
    const clamped = Math.max(0, Math.min(limit, v));
    if (phase === 'tabulate') setRow(clamped);
    else setStepIndex(clamped);
  };

  const posRef = useRef(position);
  useEffect(() => {
    posRef.current = position;
  });
  useEffect(() => {
    if (!playing) return;
    const { ms, stride } = SPEEDS[speed];
    const id = window.setInterval(() => {
      const next = Math.min(limit, posRef.current + stride);
      if (phase === 'tabulate') setRow(next);
      else setStepIndex(next);
      if (next >= limit) setPlaying(false);
    }, ms);
    return () => window.clearInterval(id);
  }, [playing, speed, limit, phase]);

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (position >= limit) setPosition(0);
    setPlaying(true);
  };

  const nextFunded = () => {
    for (let k = stepIndex; k < steps.length; k++) {
      if (steps[k].chosen) {
        setStepIndex(k + 1);
        return;
      }
    }
    setStepIndex(steps.length);
  };

  if (n === 0 || W === 0) {
    return (
      <div className="bts-panel px-6 py-12 text-center text-sm text-bts-sub">
        {n === 0 ? 'The register has no units, so the table is a single base cell DP[0][W] = 0.' : 'The budget is 0, so every cell is 0.'}{' '}
        Add proposals or raise the budget to watch the table fill.
      </div>
    );
  }

  const currentStep = phase === 'backtrack' && stepIndex > 0 ? steps[stepIndex - 1] : null;
  const defaultCell: Cell =
    phase === 'tabulate' ? { i: Math.max(0, row), w: W } : currentStep ? { i: currentStep.i, w: currentStep.w } : { i: n, w: W };
  const inspectCell = focus ?? hover ?? defaultCell;

  return (
    <div className="space-y-5">
      <BtsSection
        title={
          phase === 'tabulate'
            ? 'Phase 1: tabulation, filling DP[i][w] row by row'
            : 'Phase 2: backtracking, recovering which units were funded'
        }
        description={
          phase === 'tabulate'
            ? 'Each row adds one unit. A cell holds the best impact using the first i units within budget w. Emerald marks columns where including the new unit wins; amber marks columns where it cannot fit.'
            : 'Start at DP[n][W] and walk up one row at a time. If the value differs from the cell above, that unit was funded: move diagonally left by its cost. Otherwise move straight up.'
        }
        actions={
          <div className="inline-flex rounded border border-bts-line bg-bts-raised p-0.5" role="group" aria-label="Algorithm phase">
            {(
              [
                ['tabulate', 'Tabulation'],
                ['backtrack', 'Backtracking'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={phase === id}
                onClick={() => {
                  setPlaying(false);
                  setPhase(id);
                }}
                className={`rounded px-2.5 py-1 text-xs transition-colors ${phase === id ? 'bg-sky-400 font-semibold text-slate-950' : 'text-bts-sub hover:text-bts-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        <div className={`grid gap-5 ${wide ? 'grid-cols-[minmax(0,1fr)_300px]' : 'grid-cols-1'}`}>
          <div className="min-w-0 space-y-4">
            <DpHeatmap
              table={table}
              items={items}
              groups={groups}
              mode={phase}
              row={row}
              steps={steps}
              stepIndex={stepIndex}
              focus={focus}
              onFocusChange={setFocus}
              onHoverChange={setHover}
              colorMode={colorMode}
            />

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-bts-sub">
              <div className="inline-flex rounded border border-bts-line bg-bts-raised p-0.5" role="group" aria-label="Colour cells by">
                {(
                  [
                    ['value', 'Value'],
                    ['decision', 'Decision'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={colorMode === id}
                    onClick={() => setColorMode(id)}
                    className={`rounded px-2 py-0.5 text-xs ${colorMode === id ? 'bg-bts-panel font-semibold text-white' : 'text-bts-sub hover:text-bts-ink'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {colorMode === 'value' ? (
                <span className="inline-flex items-center gap-2">
                  <span className="figure">0</span>
                  <span className="h-2 w-28 rounded-sm" style={{ background: RAMP_CSS }} aria-hidden="true" />
                  <span className="figure">{formatInt(dpResult.maxBenefit)}</span>
                  <span>cell value (impact)</span>
                </span>
              ) : (
                <>
                  <LegendSwatch cls="bg-[#34D399]" label="unit i included in DP[i][w]" />
                  <LegendSwatch cls="bg-[#182642] ring-1 ring-slate-600" label="previous value kept" />
                  <LegendSwatch cls="bg-[#5C4614]" label="cannot fit" />
                </>
              )}
              {phase === 'tabulate' ? (
                colorMode === 'value' ? (
                  <>
                    <LegendSwatch cls="bg-bts-emerald" label="current row: include wins" />
                    <LegendSwatch cls="bg-bts-amber" label="current row: cannot fit" />
                  </>
                ) : null
              ) : (
                <>
                  <LegendLine cls="bg-bts-emerald" label="funded: move diagonally" />
                  <LegendLine cls="bg-slate-300" label="not funded: move up" />
                  <LegendSwatch cls="bg-bts-amber/50" label="remaining budget column" />
                </>
              )}
              <span className="text-bts-muted">Click or use arrow keys on the table to inspect a cell.</span>
            </div>

            <Controls
              phase={phase}
              position={position}
              limit={limit}
              playing={playing}
              speed={speed}
              onSpeed={setSpeed}
              onToggle={togglePlay}
              onPosition={(v) => {
                setPlaying(false);
                setPosition(v);
              }}
              onNextFunded={phase === 'backtrack' ? nextFunded : undefined}
            />

            {phase === 'tabulate' ? (
              <RowLens table={table} items={items} row={row} />
            ) : (
              <Accumulator steps={steps} stepIndex={stepIndex} items={items} table={table} W={W} />
            )}
          </div>

          <CellInspector
            table={table}
            items={items}
            cell={inspectCell}
            pinned={!!focus}
            phase={phase}
            row={row}
            onUnpin={() => setFocus(null)}
          />
        </div>
      </BtsSection>

      <Frontier table={table} W={W} marker={phase === 'tabulate' ? row : currentStep ? currentStep.i : n} />
    </div>
  );
}

function LegendSwatch({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-[2px] ${cls}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function LegendLine({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-[2px] w-4 rounded ${cls}`} aria-hidden="true" />
      {label}
    </span>
  );
}

interface ControlsProps {
  phase: Phase;
  position: number;
  limit: number;
  playing: boolean;
  speed: Speed;
  onSpeed: (s: Speed) => void;
  onToggle: () => void;
  onPosition: (v: number) => void;
  onNextFunded?: () => void;
}

function Controls({ phase, position, limit, playing, speed, onSpeed, onToggle, onPosition, onNextFunded }: ControlsProps) {
  const label = phase === 'tabulate' ? 'Row' : 'Step';
  return (
    <div className="rounded border border-bts-line-soft bg-bts-raised/40 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="bts-btn" onClick={() => onPosition(0)} disabled={position === 0} title="Back to start">
          <SkipBack className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Back to start</span>
        </button>
        <button
          type="button"
          className="bts-btn"
          onClick={() => onPosition(position - 1)}
          disabled={position === 0}
          title={`Previous ${label.toLowerCase()}`}
        >
          <StepBack className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Previous {label.toLowerCase()}</span>
        </button>
        <button type="button" className="bts-btn-primary min-w-[96px]" onClick={onToggle}>
          {playing ? (
            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
          ) : position >= limit ? (
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {playing ? 'Pause' : position >= limit ? 'Replay' : 'Play'}
        </button>
        <button
          type="button"
          className="bts-btn"
          onClick={() => onPosition(position + 1)}
          disabled={position >= limit}
          title={`Next ${label.toLowerCase()}`}
        >
          <StepForward className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Next {label.toLowerCase()}</span>
        </button>
        <button type="button" className="bts-btn" onClick={() => onPosition(limit)} disabled={position >= limit} title="Jump to end">
          <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Jump to end</span>
        </button>
        {onNextFunded && (
          <button type="button" className="bts-btn" onClick={onNextFunded} disabled={position >= limit}>
            <ChevronsRight className="h-3.5 w-3.5" aria-hidden="true" />
            Next funded unit
          </button>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-bts-sub">
          Speed
          <select className="bts-select py-1 text-xs" value={speed} onChange={(e) => onSpeed(e.target.value as Speed)}>
            {(Object.keys(SPEEDS) as Speed[]).map((s) => (
              <option key={s} value={s}>
                {SPEEDS[s].label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <label htmlFor="dp-scrubber" className="figure w-28 shrink-0 text-xs text-bts-sub">
          {label} {formatInt(position)} / {formatInt(limit)}
        </label>
        <input
          id="dp-scrubber"
          type="range"
          min={0}
          max={limit}
          value={position}
          onChange={(e) => onPosition(Number(e.target.value))}
          className="min-w-0 flex-1 cursor-pointer accent-sky-400"
        />
      </div>
    </div>
  );
}

function RowLens({ table, items, row }: { table: number[][]; items: BtsData['expandedItems']; row: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cols = table[0]?.length ?? 0;
  const stats = useMemo(() => {
    if (row < 1) return null;
    const wt = Math.round(items[row - 1].weight);
    let wins = 0;
    for (let w = wt; w < cols; w++) if (table[row][w] !== table[row - 1][w]) wins++;
    const noFit = Math.min(wt, cols);
    return { wt, wins, noFit, kept: cols - noFit - wins };
  }, [table, items, row, cols]);

  useEffect(() => {
    const c = ref.current;
    if (!c || row < 1) return;
    const width = c.clientWidth;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(width * dpr);
    c.height = Math.round(16 * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, width, 16);
    const colW = width / cols;
    const wt = Math.round(items[row - 1].weight);
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(0, 0, Math.min(wt, cols) * colW, 16);
    ctx.fillStyle = '#34D399';
    for (let w = wt; w < cols; w++) if (table[row][w] !== table[row - 1][w]) ctx.fillRect(w * colW, 0, Math.max(colW, 0.6), 16);
  }, [table, items, row, cols]);

  if (row < 1 || !stats) {
    return (
      <div className="rounded border border-bts-line-soft px-3 py-3 text-[13px] text-bts-sub">
        Row 0 is the base case: with no units considered, the best impact for every budget is 0. Press Play or step forward to add units.
      </div>
    );
  }
  const item = items[row - 1];
  return (
    <div className="rounded border border-bts-line-soft px-3 py-3" aria-live="polite">
      <p className="text-[13px] text-bts-ink">
        <span className="font-mono text-bts-sky">Row {formatInt(row)}</span> adds unit {item.unitIndex} of {item.totalUnits} of{' '}
        <span className="font-semibold">{item.name}</span>{' '}
        <span className="font-mono text-bts-sub">
          (w = {stats.wt}, v = {Math.round(item.benefit)})
        </span>
      </p>
      <canvas ref={ref} className="mt-2.5 block h-4 w-full rounded-sm" aria-hidden="true" />
      <p className="mt-2 text-xs leading-relaxed text-bts-sub">
        Across the {formatInt(cols)} budget columns: including it wins in{' '}
        <span className="font-mono text-bts-emerald">{formatInt(stats.wins)}</span>, the previous row’s value is kept in{' '}
        <span className="font-mono text-bts-ink">{formatInt(stats.kept)}</span>, and it cannot fit in{' '}
        <span className="font-mono text-bts-amber">{formatInt(stats.noFit)}</span> (w &lt; {stats.wt}).
      </p>
    </div>
  );
}

function Accumulator({
  steps,
  stepIndex,
  items,
  table,
  W,
}: {
  steps: BacktrackStepLite[];
  stepIndex: number;
  items: BtsData['expandedItems'];
  table: number[][];
  W: number;
}) {
  const taken = steps.slice(0, stepIndex);
  const chosen = taken.filter((s) => s.chosen).map((s) => items[s.i - 1]);
  const byName = new Map<string, number>();
  for (const it of chosen) byName.set(it.name, (byName.get(it.name) ?? 0) + 1);
  const sumV = chosen.reduce((s, it) => s + Math.round(it.benefit), 0);
  const sumW = chosen.reduce((s, it) => s + Math.round(it.weight), 0);
  const current = taken[taken.length - 1];
  const n = table.length - 1;
  const done = stepIndex >= steps.length;

  return (
    <div className="space-y-3 rounded border border-bts-line-soft px-3 py-3" aria-live="polite">
      {current ? (
        <p className="text-[13px] leading-relaxed text-bts-ink">
          <span className="font-mono text-bts-sky">Step {formatInt(stepIndex)}</span> at{' '}
          <span className="font-mono">
            DP[{current.i}][{current.w}] = {formatInt(table[current.i][current.w])}
          </span>{' '}
          vs above <span className="font-mono">{formatInt(table[current.i - 1][current.w])}</span>:{' '}
          {current.chosen ? (
            <>
              <span className="font-semibold text-bts-emerald">different, so unit {current.i} was funded</span> ({items[current.i - 1].name}
              ); budget pointer{' '}
              <span className="font-mono">
                {current.w} → {current.nextW}
              </span>
              .
            </>
          ) : (
            <>
              <span className="font-semibold text-bts-ink">equal, so unit {current.i} was not funded</span>; budget pointer stays at{' '}
              <span className="font-mono">{current.w}</span>.
            </>
          )}
        </p>
      ) : (
        <p className="text-[13px] text-bts-sub">
          Ready to start at DP[{n}][{W}] = {formatInt(table[n][W])}. Press Play, or Next funded unit to jump between selections.
        </p>
      )}
      <div className="grid grid-cols-3 gap-2 font-mono text-xs">
        <div className="rounded bg-bts-raised/60 px-2.5 py-2">
          <p className="font-sans text-bts-sub">Σ v of funded so far</p>
          <p className="mt-0.5 text-sm text-bts-emerald">{formatInt(sumV)}</p>
        </div>
        <div className="rounded bg-bts-raised/60 px-2.5 py-2">
          <p className="font-sans text-bts-sub">Σ w of funded so far</p>
          <p className="mt-0.5 text-sm text-bts-ink">{formatInt(sumW)}</p>
        </div>
        <div className="rounded bg-bts-raised/60 px-2.5 py-2">
          <p className="font-sans text-bts-sub">Budget pointer w</p>
          <p className="mt-0.5 text-sm text-bts-amber">{formatInt(current ? current.nextW : W)}</p>
        </div>
      </div>
      {byName.size > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Units recovered so far">
          {Array.from(byName.entries()).map(([name, count]) => (
            <li key={name} className="rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-200">
              {name} <span className="font-mono">×{count}</span>
            </li>
          ))}
        </ul>
      )}
      {done && (
        <p className="text-xs text-bts-sub">
          Reached row 0. Funded impact <span className="font-mono text-bts-emerald">{formatInt(sumV)}</span>{' '}
          {sumV === table[n][W] ? '= DP[n][W], as it must.' : `≠ DP[n][W] (${formatInt(table[n][W])}).`}
        </p>
      )}
    </div>
  );
}

function CellInspector({
  table,
  items,
  cell,
  pinned,
  phase,
  row,
  onUnpin,
}: {
  table: number[][];
  items: BtsData['expandedItems'];
  cell: Cell;
  pinned: boolean;
  phase: Phase;
  row: number;
  onUnpin: () => void;
}) {
  const rows = table.length;
  const cols = table[0].length;
  const { i, w } = cell;
  const notYet = phase === 'tabulate' && i > row;
  const item = i > 0 ? items[i - 1] : null;
  const wt = item ? Math.round(item.weight) : 0;
  const vt = item ? Math.round(item.benefit) : 0;
  const value = table[i][w];
  const above = i > 0 ? table[i - 1][w] : 0;
  const fits = item ? wt <= w : false;
  const left = fits ? table[i - 1][w - wt] : 0;
  const include = vt + left;

  const r0 = Math.max(0, Math.min(rows - 5, i - 2));
  const c0 = Math.max(0, Math.min(cols - 5, w - 2));
  const zRows = Array.from({ length: Math.min(5, rows) }, (_, k) => r0 + k);
  const zCols = Array.from({ length: Math.min(5, cols) }, (_, k) => c0 + k);

  return (
    <aside className="space-y-3 rounded border border-bts-line bg-[#0B1326] p-3.5" aria-live="polite" aria-label="Cell inspector">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-sm text-white">
          DP[{i}][{w}]
        </p>
        {pinned ? (
          <button type="button" className="text-xs text-bts-sky hover:underline" onClick={onUnpin}>
            Unpin
          </button>
        ) : (
          <span className="text-xs text-bts-muted">{phase === 'tabulate' ? 'current row' : 'current step'}</span>
        )}
      </div>

      <div className="space-y-0.5 text-xs text-bts-sub">
        {item ? (
          <>
            <p className="truncate text-bts-ink" title={item.name}>
              {item.name}
            </p>
            <p>
              Row {i}: unit {item.unitIndex} of {item.totalUnits}, <span className="font-mono">wᵢ = {wt}</span>,{' '}
              <span className="font-mono">vᵢ = {vt}</span>
            </p>
          </>
        ) : (
          <p className="text-bts-ink">Row 0: base case, no units</p>
        )}
        <p>
          Column {w}: a budget of ₹{formatInt(w)} lakh
        </p>
      </div>

      <div className="rounded border border-bts-line-soft bg-bts-panel px-3 py-2.5 font-mono text-[12.5px] leading-6">
        {notYet ? (
          <p className="font-sans text-bts-sub">Not computed yet: the outer loop is at row {row}. Step forward to reach it.</p>
        ) : i === 0 ? (
          <p className="text-bts-ink">DP[0][w] = 0 for every w</p>
        ) : !fits ? (
          <>
            <p className="text-bts-amber">
              wᵢ = {wt} &gt; w = {w}: cannot fit
            </p>
            <p className="text-bts-ink">
              DP[{i}][{w}] = DP[{i - 1}][{w}] = <span className="text-bts-sky">{formatInt(value)}</span>
            </p>
          </>
        ) : (
          <>
            <p className="text-bts-sub">max( exclude, include )</p>
            <p>
              <span className="text-bts-amber">exclude</span> = DP[{i - 1}][{w}]
            </p>
            <p className="pl-[8ch] text-bts-ink">= {formatInt(above)}</p>
            <p>
              <span className="text-bts-emerald">include</span> = vᵢ + DP[{i - 1}][{w - wt}]
            </p>
            <p className="pl-[8ch] text-bts-ink">
              = {vt} + {formatInt(left)} = {formatInt(include)}
            </p>
            <p className="border-t border-bts-line-soft pt-1 text-bts-ink">
              = <span className="text-bts-sky">{formatInt(value)}</span>{' '}
              <span className="font-sans text-xs text-bts-sub">
                {include > above
                  ? `include wins by ${formatInt(include - above)}`
                  : include === above
                    ? 'tie: code keeps exclude (strict >)'
                    : `exclude kept (+${formatInt(above - include)})`}
              </span>
            </p>
          </>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs text-bts-sub">Neighbourhood</p>
        <div className="scrollbar-thin relative overflow-x-auto">
          <table className="w-full border-separate border-spacing-[2px] font-mono text-[10.5px]">
            <thead>
              <tr>
                <th className="w-8 text-right font-normal text-bts-muted" scope="col">
                  <span className="sr-only">row</span>
                </th>
                {zCols.map((c) => (
                  <th key={c} scope="col" className={`text-center font-normal ${c === w ? 'text-white' : 'text-bts-muted'}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zRows.map((r) => (
                <tr key={r}>
                  <th scope="row" className={`pr-1 text-right font-normal ${r === i ? 'text-white' : 'text-bts-muted'}`}>
                    {r}
                  </th>
                  {zCols.map((c) => {
                    const isTarget = r === i && c === w;
                    const isAbove = i > 0 && r === i - 1 && c === w;
                    const isLeft = fits && i > 0 && r === i - 1 && c === w - wt;
                    const hidden = phase === 'tabulate' && r > row;
                    return (
                      <td
                        key={c}
                        className={`rounded-[3px] px-1 py-0.5 text-center ${
                          isTarget
                            ? 'bg-white text-slate-950'
                            : isAbove
                              ? 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/70'
                              : isLeft
                                ? 'bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/70'
                                : 'bg-bts-panel text-bts-sub'
                        }`}
                      >
                        {hidden ? '·' : formatInt(table[r][c])}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!notYet && fits && i > 0 && (w - wt < c0 || w - wt >= c0 + zCols.length) && (
          <p className="mt-1.5 text-xs text-bts-sub">
            The include branch reads{' '}
            <span className="font-mono text-bts-emerald">
              DP[{i - 1}][{w - wt}] = {formatInt(left)}
            </span>
            , {wt} columns to the left.
          </p>
        )}
      </div>
    </aside>
  );
}

function Frontier({ table, W, marker }: { table: number[][]; W: number; marker: number }) {
  const values = useMemo(() => table.map((r) => r[W]), [table, W]);
  const n = values.length - 1;
  const max = Math.max(1, values[n] ?? 1);
  const h = 96;
  const pts = values.map((v, i) => `${(i / Math.max(1, n)) * 1000},${h - (v / max) * (h - 6) - 3}`).join(' ');
  const mx = (marker / Math.max(1, n)) * 100;
  const mv = values[Math.max(0, Math.min(n, marker))] ?? 0;
  return (
    <BtsSection
      title="Best impact at full budget as units are added"
      description="DP[i][W] for i = 0…n: the optimum when only the first i units may be funded. It never decreases, and its last value is the plan’s total impact."
    >
      <div className="relative">
        <svg
          viewBox={`0 0 1000 ${h}`}
          preserveAspectRatio="none"
          className="block h-24 w-full"
          role="img"
          aria-label={`Line rising from 0 to ${formatInt(values[n] ?? 0)} over ${n} units`}
        >
          <line x1="0" y1={h - 3} x2="1000" y2={h - 3} stroke="#26344F" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <polyline points={pts} fill="none" stroke="#38BDF8" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
        <div className="pointer-events-none absolute inset-y-0 w-px bg-white/60" style={{ left: `${mx}%` }} aria-hidden="true" />
        <div className="figure mt-1 flex justify-between text-[11px] text-bts-muted">
          <span>i = 0</span>
          <span className="text-bts-ink">
            i = {marker}: DP[{marker}][{W}] = <span className="text-bts-sky">{formatInt(mv)}</span>
          </span>
          <span>i = {formatInt(n)}</span>
        </div>
      </div>
    </BtsSection>
  );
}
