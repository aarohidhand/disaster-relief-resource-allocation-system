import { useEffect, useMemo, useRef } from 'react';
import type { TokenKind } from '../../lib/highlight';
import { toLines, tokenize } from '../../lib/highlight';

const COLORS: Record<TokenKind, string> = {
  kw: 'text-violet-300',
  str: 'text-amber-200',
  num: 'text-orange-300',
  com: 'text-slate-500 italic',
  type: 'text-teal-300',
  fn: 'text-sky-300',
  id: 'text-slate-200',
  punc: 'text-slate-400',
  ws: '',
};

export interface LineNote {
  text: string;
  tone?: 'sky' | 'emerald' | 'amber';
}

interface CodeViewerProps {
  code: string;
  startLine: number;
  fileName: string;
  notes?: Map<number, LineNote>;
  maxHeight?: number;
}

export function CodeViewer({ code, startLine, fileName, notes, maxHeight = 560 }: CodeViewerProps) {
  const lines = useMemo(() => toLines(tokenize(code)), [code]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstNote = notes && notes.size > 0 ? Math.min(...notes.keys()) : -1;

  // Open on the first annotated line (the interesting part), keeping a little context above it.
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const row = firstNote >= 0 ? box.querySelector<HTMLTableRowElement>(`tr[data-line="${firstNote}"]`) : null;
    box.scrollTop = row ? Math.max(0, row.offsetTop - 60) : 0;
  }, [code, firstNote]);
  const noteTone = {
    sky: 'border-sky-400/40 bg-sky-400/10 text-sky-200',
    emerald: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
    amber: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  };

  return (
    <figure className="overflow-hidden rounded-md border border-bts-line bg-[#0B1326]">
      <figcaption className="flex items-center justify-between gap-3 border-b border-bts-line px-3 py-2 text-xs">
        <span className="font-mono text-bts-sub">{fileName}</span>
        <span className="text-bts-muted">
          lines {startLine}–{startLine + lines.length - 1}
        </span>
      </figcaption>
      <div ref={scrollRef} className="scrollbar-thin relative overflow-auto" style={{ maxHeight }}>
        <table className="w-full border-collapse font-mono text-[12.5px] leading-[1.6] [font-variant-ligatures:none]">
          <tbody>
            {lines.map((toks, idx) => {
              const note = notes?.get(idx);
              return (
                <tr key={idx} data-line={idx} className={note ? 'bg-sky-400/[0.06]' : ''}>
                  <td className="sticky left-0 w-12 select-none border-r border-bts-line-soft bg-[#0B1326] pr-3 text-right align-top text-bts-muted">
                    {startLine + idx}
                  </td>
                  <td className="whitespace-pre pl-4 pr-4 align-top">
                    {toks.length === 0
                      ? ' '
                      : toks.map((t, k) =>
                          t.k === 'ws' ? (
                            t.v
                          ) : (
                            <span key={k} className={COLORS[t.k]}>
                              {t.v}
                            </span>
                          ),
                        )}
                  </td>
                  <td
                    className={`sticky right-0 w-0 whitespace-nowrap pr-3 text-right align-top ${
                      note ? 'bg-[linear-gradient(to_left,#0B1326_85%,transparent)] pl-8' : ''
                    }`}
                  >
                    {note && (
                      <span
                        className={`inline-block rounded border px-1.5 font-sans text-[11px] leading-[1.45rem] ${noteTone[note.tone ?? 'sky']}`}
                      >
                        {note.text}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
