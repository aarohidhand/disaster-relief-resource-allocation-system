import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { ExpandedItem } from '../../algorithms/types';
import { formatInt } from '../../lib/format';

export interface Cell {
  i: number;
  w: number;
}

export interface BacktrackStepLite {
  i: number;
  w: number;
  nextW: number;
  chosen: boolean;
}

export interface RowGroup {
  key: string;
  label: string;
  title: string;
  start: number;
  end: number;
}

interface DpHeatmapProps {
  table: number[][];
  items: ExpandedItem[];
  groups: RowGroup[];
  mode: 'tabulate' | 'backtrack';
  /** Tabulation: rows 0..row are computed. */
  row: number;
  steps: BacktrackStepLite[];
  /** Backtracking: number of steps already taken. */
  stepIndex: number;
  focus: Cell | null;
  onFocusChange: (cell: Cell | null) => void;
  onHoverChange: (cell: Cell | null) => void;
  /** 'value' shades cells by DP value; 'decision' shows where including row i's unit won. */
  colorMode?: 'value' | 'decision';
}

// Sequential single-hue ramp (blue), dark → light on the dark surface: higher value reads brighter.
const STOPS: [number, [number, number, number]][] = [
  [0, [17, 29, 52]],
  [0.18, [16, 52, 98]],
  [0.42, [28, 92, 171]],
  [0.68, [57, 135, 229]],
  [0.86, [134, 182, 239]],
  [1, [214, 232, 252]],
];

function buildLut(): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let k = 0; k < 256; k++) {
    const t = k / 255;
    let s = 0;
    while (s < STOPS.length - 2 && t > STOPS[s + 1][0]) s++;
    const [t0, c0] = STOPS[s];
    const [t1, c1] = STOPS[s + 1];
    const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
    lut[k * 3] = c0[0] + (c1[0] - c0[0]) * f;
    lut[k * 3 + 1] = c0[1] + (c1[1] - c0[1]) * f;
    lut[k * 3 + 2] = c0[2] + (c1[2] - c0[2]) * f;
  }
  return lut;
}

const LUT = buildLut();
export const RAMP_CSS = `linear-gradient(90deg, ${STOPS.map(([t, c]) => `rgb(${c.join(',')}) ${t * 100}%`).join(', ')})`;
export const MAX_RENDER_CELLS = 4_000_000;

export function DpHeatmap({
  table,
  items,
  groups,
  mode,
  row,
  steps,
  stepIndex,
  focus,
  onFocusChange,
  onHoverChange,
  colorMode = 'value',
}: DpHeatmapProps) {
  const rows = table.length;
  const cols = rows > 0 ? table[0].length : 0;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resampledRef = useRef<{ src: HTMLCanvasElement; w: number; canvas: HTMLCanvasElement } | null>(null);
  const [wrapWidth, setWrapWidth] = useState(760);
  const GUTTER = wrapWidth < 520 ? 56 : 132;
  const width = Math.max(160, Math.floor(wrapWidth - GUTTER));
  const [hover, setHover] = useState<(Cell & { x: number; y: number }) | null>(null);

  const height = Math.round(Math.min(520, Math.max(220, rows * 2)));
  const maxValue = rows > 0 ? Math.max(1, table[rows - 1][cols - 1]) : 1;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setWrapWidth(entries[0]?.contentRect.width ?? 760);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Cell-resolution image of the table (one pixel per DP cell), rebuilt only when the table changes.
  const offscreen = useMemo(() => {
    if (rows === 0 || cols === 0 || rows * cols > MAX_RENDER_CELLS) return null;
    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    const ctx = off.getContext('2d');
    if (!ctx) return null;
    const img = ctx.createImageData(cols, rows);
    const data = img.data;
    for (let i = 0; i < rows; i++) {
      const r = table[i];
      for (let w = 0; w < cols; w++) {
        const k = Math.min(255, Math.round((r[w] / maxValue) * 255)) * 3;
        const p = (i * cols + w) * 4;
        data[p] = LUT[k];
        data[p + 1] = LUT[k + 1];
        data[p + 2] = LUT[k + 2];
        data[p + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return off;
  }, [table, rows, cols, maxValue]);

  // Decision map: emerald where including unit i improved DP[i][w], amber where it could not fit.
  const decisionImage = useMemo(() => {
    if (colorMode !== 'decision' || rows === 0 || cols === 0 || rows * cols > MAX_RENDER_CELLS) return null;
    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    const ctx = off.getContext('2d');
    if (!ctx) return null;
    const img = ctx.createImageData(cols, rows);
    const data = img.data;
    const paint = (p: number, r: number, g: number, b: number) => {
      data[p] = r;
      data[p + 1] = g;
      data[p + 2] = b;
      data[p + 3] = 255;
    };
    for (let w = 0; w < cols; w++) paint(w * 4, 17, 29, 52);
    for (let i = 1; i < rows; i++) {
      const wt = Math.round(items[i - 1]?.weight ?? 0);
      const cur = table[i];
      const prev = table[i - 1];
      for (let w = 0; w < cols; w++) {
        const p = (i * cols + w) * 4;
        if (w < wt) paint(p, 92, 70, 20);
        else if (cur[w] !== prev[w]) paint(p, 52, 211, 153);
        else paint(p, 24, 38, 66);
      }
    }
    ctx.putImageData(img, 0, 0);
    return off;
  }, [colorMode, table, items, rows, cols]);

  const activeCell: Cell | null =
    focus ?? (mode === 'backtrack' && stepIndex > 0 ? { i: steps[stepIndex - 1].i, w: steps[stepIndex - 1].w } : null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const off = colorMode === 'decision' && decisionImage ? decisionImage : offscreen;
    if (!canvas || !off) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, width, height);
    // More columns than device pixels: average them horizontally first (avoids moiré), then
    // stretch rows with nearest-neighbour so each DP row stays a crisp band.
    const targetW = Math.round(width * dpr);
    let source: HTMLCanvasElement = off;
    if (off.width > targetW) {
      const cached = resampledRef.current;
      if (cached && cached.src === off && cached.w === targetW) {
        source = cached.canvas;
      } else {
        const mid = document.createElement('canvas');
        mid.width = targetW;
        mid.height = off.height;
        const mctx = mid.getContext('2d');
        if (mctx) {
          mctx.imageSmoothingEnabled = true;
          mctx.imageSmoothingQuality = 'high';
          mctx.drawImage(off, 0, 0, targetW, off.height);
          resampledRef.current = { src: off, w: targetW, canvas: mid };
          source = mid;
        }
      }
    }
    ctx.drawImage(source, 0, 0, width, height);

    const colW = width / cols;
    const rowH = height / rows;
    const cx = (w: number) => (w + 0.5) * colW;
    const cy = (i: number) => (i + 0.5) * rowH;

    if (mode === 'tabulate') {
      // rows not yet computed
      if (row < rows - 1) {
        ctx.fillStyle = '#0B1326';
        ctx.fillRect(0, (row + 1) * rowH, width, height - (row + 1) * rowH);
        ctx.fillStyle = 'rgba(148,163,184,0.06)';
        for (let y = (row + 1) * rowH; y < height; y += 6) ctx.fillRect(0, y, width, 1);
      }
      if (row >= 1) {
        const item = items[row - 1];
        const wt = Math.round(item?.weight ?? 0);
        const cur = table[row];
        const prev = table[row - 1];
        const y0 = row * rowH;
        const h = Math.max(rowH, 2);
        // cannot fit: w < w_i
        ctx.fillStyle = colorMode === 'decision' ? 'rgba(251,191,36,1)' : 'rgba(251,191,36,0.9)';
        ctx.fillRect(0, y0, Math.min(wt, cols) * colW, h);
        // include wins
        ctx.fillStyle = 'rgba(52,211,153,0.95)';
        let runStart = -1;
        for (let w = wt; w <= cols; w++) {
          const win = w < cols && cur[w] !== prev[w];
          if (win && runStart < 0) runStart = w;
          if (!win && runStart >= 0) {
            ctx.fillRect(runStart * colW, y0, (w - runStart) * colW, h);
            runStart = -1;
          }
        }
        // row bracket
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0.75, y0 - 3, width - 1.5, h + 6);
      }
    } else {
      // dim the finished table so the reconstruction path stands out
      ctx.fillStyle = 'rgba(11,19,38,0.5)';
      ctx.fillRect(0, 0, width, height);
      const taken = steps.slice(0, stepIndex);
      if (taken.length > 0) {
        const current = taken[taken.length - 1];
        // remaining-budget pointer column
        ctx.fillStyle = 'rgba(251,191,36,0.22)';
        ctx.fillRect(current.nextW * colW, 0, Math.max(1, colW), height);
      }
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (const s of taken) {
        ctx.strokeStyle = s.chosen ? '#34D399' : 'rgba(226,232,240,0.75)';
        ctx.beginPath();
        ctx.moveTo(cx(s.w), cy(s.i));
        ctx.lineTo(cx(s.nextW), cy(s.i - 1));
        ctx.stroke();
      }
      for (const s of taken) {
        if (!s.chosen) continue;
        ctx.fillStyle = '#34D399';
        ctx.beginPath();
        ctx.arc(cx(s.w), cy(s.i), 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      // start marker at DP[n][W]
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx(cols - 1), cy(rows - 1), 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // dependency diagram for the focused cell: DP[i][w] ← DP[i−1][w] and DP[i−1][w−w_i]
    if (activeCell && activeCell.i >= 1 && (mode === 'backtrack' || activeCell.i <= row)) {
      const { i, w } = activeCell;
      const wt = Math.round(items[i - 1]?.weight ?? 0);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(251,191,36,0.95)';
      ctx.beginPath();
      ctx.moveTo(cx(w), cy(i - 1));
      ctx.lineTo(cx(w), cy(i));
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx(w), cy(i - 1), 4, 0, Math.PI * 2);
      ctx.stroke();
      if (w - wt >= 0) {
        ctx.strokeStyle = 'rgba(52,211,153,0.95)';
        ctx.beginPath();
        ctx.moveTo(cx(w - wt), cy(i - 1));
        ctx.lineTo(cx(w), cy(i));
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx(w - wt), cy(i - 1), 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx(w), cy(i), 5.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // hover crosshair
    if (hover) {
      ctx.fillStyle = 'rgba(248,250,252,0.16)';
      ctx.fillRect(0, hover.i * rowH, width, Math.max(1, rowH));
      ctx.fillRect(hover.w * colW, 0, Math.max(1, colW), height);
    }
  }, [offscreen, decisionImage, colorMode, width, height, table, items, rows, cols, mode, row, steps, stepIndex, activeCell, hover]);

  const cellFromEvent = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = Math.max(0, Math.min(cols - 1, Math.floor((x / rect.width) * cols)));
    const i = Math.max(0, Math.min(rows - 1, Math.floor((y / rect.height) * rows)));
    return { i, w, x, y };
  };

  const onKey = (e: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const base = focus ?? activeCell ?? { i: Math.max(0, mode === 'tabulate' ? row : rows - 1), w: cols - 1 };
    const stepW = e.shiftKey ? 10 : 1;
    let next: Cell | null = null;
    if (e.key === 'ArrowLeft') next = { i: base.i, w: Math.max(0, base.w - stepW) };
    else if (e.key === 'ArrowRight') next = { i: base.i, w: Math.min(cols - 1, base.w + stepW) };
    else if (e.key === 'ArrowUp') next = { i: Math.max(0, base.i - stepW), w: base.w };
    else if (e.key === 'ArrowDown') next = { i: Math.min(rows - 1, base.i + stepW), w: base.w };
    else if (e.key === 'Escape' && focus) {
      e.stopPropagation();
      onFocusChange(null);
      return;
    }
    if (next) {
      e.preventDefault();
      onFocusChange(next);
    }
  };

  if (rows * cols > MAX_RENDER_CELLS) {
    return (
      <div className="rounded border border-bts-line bg-bts-raised/50 px-4 py-10 text-center text-sm text-bts-sub">
        The table has {formatInt(rows * cols)} cells, more than this view renders. Lower the budget or the units requested to inspect it.
      </div>
    );
  }

  const hoverItem = hover && hover.i > 0 ? items[hover.i - 1] : null;
  const rowH = height / rows;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (cols - 1)));

  return (
    <div ref={wrapRef} className="relative select-none">
      <div className="flex">
        {/* proposal bands: which DP rows belong to which proposal */}
        <div className="relative shrink-0" style={{ width: GUTTER, height }} aria-hidden="true">
          <div className="absolute inset-x-0 top-0 border-b border-bts-line-soft" style={{ height: Math.max(rowH, 1) }} />
          {groups.map((g, k) => {
            const top = g.start * rowH;
            const h = (g.end - g.start + 1) * rowH;
            return (
              <div
                key={g.key}
                title={g.title}
                className={`absolute inset-x-0 overflow-hidden border-l-2 pl-2 pr-2 ${k % 2 === 0 ? 'border-slate-500 bg-white/[0.03]' : 'border-slate-700 bg-transparent'}`}
                style={{ top, height: h }}
              >
                {h >= 13 && <span className="block truncate pt-px font-mono text-[10px] leading-3 text-bts-sub">{g.label}</span>}
              </div>
            );
          })}
        </div>
        <div className="relative min-w-0 flex-1">
          <canvas
            ref={canvasRef}
            tabIndex={0}
            role="img"
            aria-label={`Dynamic programming table with ${formatInt(rows)} rows (units 0 to ${rows - 1}) and ${formatInt(cols)} columns (budget 0 to ${cols - 1}). Use arrow keys to inspect cells; hold Shift to move by 10.`}
            style={{ width, height }}
            className="block cursor-crosshair rounded-sm outline-offset-2"
            onPointerMove={(e) => {
              const c = cellFromEvent(e);
              setHover(c);
              onHoverChange({ i: c.i, w: c.w });
            }}
            onPointerLeave={() => {
              setHover(null);
              onHoverChange(null);
            }}
            onClick={(e) => {
              const c = cellFromEvent(e);
              onFocusChange({ i: c.i, w: c.w });
            }}
            onKeyDown={onKey}
          />
          {hover && (
            <div
              className="pointer-events-none absolute z-10 w-max max-w-[260px] rounded border border-bts-line bg-bts-raised px-2.5 py-1.5 text-xs shadow-popover"
              style={{
                left: Math.min(Math.max(0, hover.x + 14), width - 200),
                top: hover.y > height - 70 ? hover.y - 62 : hover.y + 14,
              }}
            >
              <p className="font-mono">
                <span className="text-bts-sub">
                  DP[{hover.i}][{hover.w}] ={' '}
                </span>
                <span className="font-semibold text-bts-sky">
                  {mode === 'tabulate' && hover.i > row ? 'not computed yet' : formatInt(table[hover.i][hover.w])}
                </span>
              </p>
              <p className="mt-0.5 truncate text-bts-sub">
                {hoverItem ? `${hoverItem.name} (unit ${hoverItem.unitIndex}/${hoverItem.totalUnits})` : 'Row 0: no units considered'}
              </p>
              {hoverItem && !(mode === 'tabulate' && hover.i > row) && (
                <p className="mt-0.5 text-bts-muted">
                  {Math.round(hoverItem.weight) > hover.w
                    ? 'cannot fit at this budget'
                    : table[hover.i][hover.w] !== table[hover.i - 1][hover.w]
                      ? 'including this unit wins here'
                      : 'previous row’s value kept'}
                </p>
              )}
            </div>
          )}
          <div className="relative mt-1 h-4 font-mono text-[10px] text-bts-muted" aria-hidden="true">
            {ticks.map((t, k) => (
              <span
                key={k}
                className="absolute -translate-x-1/2"
                style={{ left: Math.min(width - 12, Math.max(12, ((t + 0.5) / cols) * width)) }}
              >
                {formatInt(t)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap justify-between gap-x-4 text-[11px] text-bts-muted" style={{ paddingLeft: GUTTER }}>
        <span>Rows: units i = 0…{formatInt(rows - 1)} (grouped by proposal)</span>
        <span>Columns: budget w = 0…{formatInt(cols - 1)} (₹ lakh)</span>
      </div>
    </div>
  );
}
