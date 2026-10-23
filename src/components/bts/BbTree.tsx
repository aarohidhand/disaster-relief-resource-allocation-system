import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import type { BBTreeNode, SupplyItem } from '../../algorithms/types';
import { generateBBVisualizationTree } from '../../algorithms/branchAndBound';
import { representativeUnits } from '../../algorithms/analysis';
import { formatDecimal, formatInt } from '../../lib/format';

const NODE_W = 100;
const NODE_H = 44;
const GAP_X = 10;
const LEVEL_H = 80;

interface Placed {
  node: BBTreeNode;
  x: number;
  y: number;
  depth: number;
  parent: Placed | null;
  order: number;
}

function layout(root: BBTreeNode): Placed[] {
  const placed: Placed[] = [];
  let leaf = 0;
  let order = 0;
  const visit = (node: BBTreeNode, depth: number, parent: Placed | null): Placed => {
    const p: Placed = { node, x: 0, y: depth * LEVEL_H, depth, parent, order: order++ };
    placed.push(p);
    if (node.children.length === 0) {
      p.x = leaf * (NODE_W + GAP_X);
      leaf++;
    } else {
      const kids = node.children.map((c) => visit(c, depth + 1, p));
      p.x = (kids[0].x + kids[kids.length - 1].x) / 2;
    }
    return p;
  };
  visit(root, 0, null);
  return placed.sort((a, b) => a.order - b.order);
}

function bestAtPrune(node: BBTreeNode): number | null {
  const m = node.pruneReason ? /current best \((\d+(?:\.\d+)?)\)/.exec(node.pruneReason) : null;
  return m ? Number(m[1]) : null;
}

export function BbTree({ supplies }: { supplies: SupplyItem[] }) {
  const units = useMemo(() => representativeUnits(supplies), [supplies]);
  const top = useMemo(() => [...units].sort((a, b) => b.ratio - a.ratio).slice(0, 4), [units]);
  const total = top.reduce((s, u) => s + Math.round(u.weight), 0);
  const options = useMemo(() => Array.from(new Set([0.4, 0.6, 0.8].map((f) => Math.max(1, Math.round(total * f))))), [total]);
  const [capacity, setCapacity] = useState(options[1] ?? options[0] ?? 10);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!options.includes(capacity)) setCapacity(options[1] ?? options[0] ?? 10);
  }, [options, capacity]);

  const tree = useMemo(() => (top.length > 0 ? generateBBVisualizationTree(units, capacity, 4) : null), [units, capacity, top.length]);
  const placed = useMemo(() => (tree ? layout(tree.root) : []), [tree]);
  const total_nodes = placed.length;

  useEffect(() => {
    setStep(total_nodes);
    setPlaying(false);
    setSelected(null);
  }, [tree, total_nodes]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setStep((s) => {
        if (s + 1 >= total_nodes) setPlaying(false);
        return Math.min(total_nodes, s + 1);
      });
    }, 700);
    return () => window.clearInterval(id);
  }, [playing, total_nodes]);

  if (!tree || placed.length === 0) {
    return <p className="py-8 text-center text-sm text-bts-sub">Add proposals to build a state-space tree.</p>;
  }

  const visible = placed.slice(0, Math.max(1, step));
  const visibleIds = new Set(visible.map((p) => p.node.id));
  const current = visible[visible.length - 1];
  const optimalPlaced = placed.find((p) => p.node.id === tree.optimalNodeId);
  const detail = placed.find((p) => p.node.id === selected) ?? (step >= total_nodes && optimalPlaced ? optimalPlaced : current);
  const width = Math.max(...placed.map((p) => p.x)) + NODE_W + 8;
  const height = Math.max(...placed.map((p) => p.y)) + NODE_H + 8;
  const W = capacity;
  const finished = step >= total_nodes;

  const style = (p: Placed) => {
    const isOpt = p.node.status === 'optimal' && finished;
    if (isOpt) return { stroke: '#34D399', fill: 'rgba(52,211,153,0.16)', text: '#A7F3D0' };
    if (p.node.status === 'pruned-capacity') return { stroke: '#FBBF24', fill: 'rgba(251,191,36,0.10)', text: '#FDE68A' };
    if (p.node.status === 'pruned-bound') return { stroke: '#FB7185', fill: 'rgba(251,113,133,0.10)', text: '#FECDD3' };
    return { stroke: '#38BDF8', fill: 'rgba(56,189,248,0.08)', text: '#E2E8F0' };
  };

  const explain = (p: Placed): string => {
    const n = p.node;
    if (n.status === 'pruned-capacity')
      return `Cost ${formatInt(n.currentWeight)} exceeds the budget ${W}: infeasible, so the branch is cut.`;
    if (n.status === 'pruned-bound') {
      const best = bestAtPrune(n);
      return `Upper bound ${formatDecimal(n.bound, 1)} ≤ best found so far${best !== null ? ` (${formatInt(best)})` : ''}: nothing below can beat it, so the branch is cut.`;
    }
    if (n.status === 'optimal')
      return `Best complete selection found: impact ${formatInt(n.currentBenefit)} for cost ${formatInt(n.currentWeight)}.`;
    if (n.decision === 'root')
      return `Nothing decided yet. The fractional bound says no selection can exceed ${formatDecimal(n.bound, 1)}.`;
    return `Bound ${formatDecimal(n.bound, 1)} still beats the best so far, so both children are explored.`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-bts-sub">
          Teaching instance: one unit each of
          {top.map((u, k) => (
            <span key={u.id} className="rounded border border-bts-line px-1.5 py-0.5 text-bts-ink">
              {k + 1}. {u.name}{' '}
              <span className="font-mono text-bts-muted">
                ({Math.round(u.weight)}, {Math.round(u.benefit)})
              </span>
            </span>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-xs text-bts-sub">
          Budget
          <select className="bts-select py-1 text-xs" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}>
            {options.map((o) => (
              <option key={o} value={o}>
                {o} of {total}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="bts-btn" onClick={() => setStep(1)} disabled={step <= 1}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </button>
        <button
          type="button"
          className="bts-btn-primary min-w-[92px]"
          onClick={() => {
            if (playing) setPlaying(false);
            else {
              if (finished) setStep(1);
              setPlaying(true);
            }
          }}
        >
          {playing ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
          {playing ? 'Pause' : finished ? 'Replay' : 'Play'}
        </button>
        <button type="button" className="bts-btn" onClick={() => setStep((s) => Math.min(total_nodes, s + 1))} disabled={finished}>
          <StepForward className="h-3.5 w-3.5" aria-hidden="true" />
          Next node
        </button>
        <span className="figure text-xs text-bts-sub">
          {Math.max(1, step)} / {total_nodes} nodes
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-bts-sub">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] border border-sky-400" aria-hidden="true" />
            explored
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] border border-rose-400" aria-hidden="true" />
            bound prune
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] border border-amber-400" aria-hidden="true" />
            over budget
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-emerald-400/40 ring-1 ring-emerald-400" aria-hidden="true" />
            optimal
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="scrollbar-thin relative overflow-x-auto rounded border border-bts-line-soft bg-[#0B1326] p-3">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            preserveAspectRatio="xMidYMin meet"
            style={{ maxWidth: width, minWidth: Math.round(width * 0.78) }}
            role="img"
            aria-label={`State-space tree with ${total_nodes} nodes; ${visible.length} shown`}
            className="mx-auto block"
          >
            {visible.map((p) =>
              p.parent ? (
                <g key={`e-${p.node.id}`}>
                  <line
                    x1={p.parent.x + NODE_W / 2}
                    y1={p.parent.y + NODE_H}
                    x2={p.x + NODE_W / 2}
                    y2={p.y}
                    stroke={p.node.decision === 'include' ? '#34D399' : '#64748B'}
                    strokeWidth={1.5}
                    strokeDasharray={p.node.decision === 'include' ? undefined : '4 3'}
                  />
                  <text
                    x={(p.parent.x + p.x) / 2 + NODE_W / 2 + (p.node.decision === 'include' ? -10 : 6)}
                    y={(p.parent.y + NODE_H + p.y) / 2}
                    fill={p.node.decision === 'include' ? '#6EE7B7' : '#94A3B8'}
                    fontSize="10"
                    fontFamily="JetBrains Mono Variable, monospace"
                  >
                    x{p.depth}={p.node.decision === 'include' ? 1 : 0}
                  </text>
                </g>
              ) : null,
            )}
            {visible.map((p) => {
              const s = style(p);
              const isCurrent = p === current && !finished;
              const isSel = p.node.id === selected;
              return (
                <g
                  key={p.node.id}
                  transform={`translate(${p.x},${p.y})`}
                  className="cursor-pointer"
                  onClick={() => setSelected(p.node.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${p.node.decision} node at level ${p.node.level}: impact ${p.node.currentBenefit}, cost ${p.node.currentWeight}, bound ${p.node.bound}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(p.node.id);
                    }
                  }}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={5}
                    fill={s.fill}
                    stroke={isSel || isCurrent ? '#FFFFFF' : s.stroke}
                    strokeWidth={isSel || isCurrent ? 2 : 1.25}
                  />
                  <text x={8} y={18} fill={s.text} fontSize="11" fontFamily="JetBrains Mono Variable, monospace">
                    v={formatInt(p.node.currentBenefit)} c={formatInt(p.node.currentWeight)}
                  </text>
                  <text x={8} y={35} fill="#94A3B8" fontSize="10.5" fontFamily="JetBrains Mono Variable, monospace">
                    {p.node.status === 'pruned-capacity' ? 'over budget' : `ub=${formatDecimal(p.node.bound, 1)}`}
                  </text>
                </g>
              );
            })}
          </svg>
          {!visibleIds.has(tree.optimalNodeId) && <p className="mt-2 text-xs text-bts-muted">Keep stepping to reach the optimal node.</p>}
        </div>

        <aside
          className="grid grid-cols-1 gap-3 rounded border border-bts-line bg-[#0B1326] p-3.5 text-[13px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]"
          aria-live="polite"
        >
          <div className="space-y-2.5">
            <p className="font-mono text-white">
              {detail.node.decision === 'root'
                ? 'Root node'
                : `${detail.node.decision === 'include' ? 'Take' : 'Skip'} ${detail.node.itemName ?? ''}`}
            </p>
            <dl className="grid grid-cols-4 gap-2 font-mono text-xs">
              <div className="rounded bg-bts-panel px-2 py-1.5">
                <dt className="font-sans text-bts-sub">impact so far</dt>
                <dd className="text-bts-emerald">{formatInt(detail.node.currentBenefit)}</dd>
              </div>
              <div className="rounded bg-bts-panel px-2 py-1.5">
                <dt className="font-sans text-bts-sub">cost so far</dt>
                <dd className="text-bts-ink">
                  {formatInt(detail.node.currentWeight)} / {W}
                </dd>
              </div>
              <div className="rounded bg-bts-panel px-2 py-1.5">
                <dt className="font-sans text-bts-sub">upper bound</dt>
                <dd className="text-bts-sky">{formatDecimal(detail.node.bound, 1)}</dd>
              </div>
              <div className="rounded bg-bts-panel px-2 py-1.5">
                <dt className="font-sans text-bts-sub">level</dt>
                <dd className="text-bts-ink">{detail.node.level}</dd>
              </div>
            </dl>
          </div>
          <div className="space-y-2">
            <p className="leading-relaxed text-bts-sub">{explain(detail)}</p>
            <p className="border-t border-bts-line-soft pt-2 text-xs text-bts-muted">
              Best impact for this instance: <span className="font-mono text-bts-emerald">{formatInt(tree.bestBenefit)}</span>. The bound is
              the fractional-knapsack value of the remaining units, so it can never under-estimate.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
