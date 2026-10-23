import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CodeXml, PanelRightClose, PanelRightOpen, X } from 'lucide-react';
import type { ExpandedItem, KnapsackResult, SupplyItem, VerificationResult } from '../../algorithms/types';
import type { PlanLine, PlanSummary } from '../../lib/portal';
import type { BtsTab } from '../../lib/views';
import { BTS_TABS } from '../../lib/views';
import { BUDGET_MAX, BUDGET_MIN, clampBudget, formatInt } from '../../lib/format';
import { ProblemMapping } from './ProblemMapping';
import { DpExecution } from './DpExecution';
import { DecisionTrace } from './DecisionTrace';
import { CodeComplexity } from './CodeComplexity';
import { CrossCheck } from './CrossCheck';
import { VivaGuide } from './VivaGuide';
import { BtsWideContext } from './layout';

export interface BtsData {
  supplies: SupplyItem[];
  capacity: number;
  expandedItems: ExpandedItem[];
  dpResult: KnapsackResult;
  bbResult: KnapsackResult;
  verification: VerificationResult;
  planLines: PlanLine[];
  summary: PlanSummary;
  onBudgetChange: (value: number) => void;
}

interface BtsDrawerProps extends BtsData {
  open: boolean;
  docked: boolean;
  onDockedChange: (docked: boolean) => void;
  onClose: () => void;
  tab: BtsTab;
  onTabChange: (tab: BtsTab) => void;
}

export default function BtsDrawer({ open, docked, onDockedChange, onClose, tab, onTabChange, ...data }: BtsDrawerProps) {
  const { capacity, expandedItems, dpResult, onBudgetChange } = data;
  const panelRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [renderContent, setRenderContent] = useState(open);
  const [draft, setDraft] = useState(String(capacity));
  const [flash, setFlash] = useState(false);
  const prevResult = useRef(dpResult);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWide((entries[0]?.contentRect.width ?? 0) >= 1000));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keep content mounted through the slide-out, then release it.
  useEffect(() => {
    if (open) {
      setRenderContent(true);
      const t = window.setTimeout(() => tabRefs.current[tab]?.focus(), 60);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setRenderContent(false), 240);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => setDraft(String(capacity)), [capacity]);

  // Brief highlight on the live-link readout whenever portal data changes.
  useEffect(() => {
    if (prevResult.current === dpResult) return;
    prevResult.current = dpResult;
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 650);
    return () => window.clearTimeout(t);
  }, [dpResult]);

  const onTabKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const focusedId = (e.target as HTMLElement).id?.replace('bts-tab-', '');
    const focusedIdx = BTS_TABS.findIndex((t) => t.id === focusedId);
    const idx = focusedIdx >= 0 ? focusedIdx : BTS_TABS.findIndex((t) => t.id === tab);
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % BTS_TABS.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + BTS_TABS.length) % BTS_TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = BTS_TABS.length - 1;
    else return;
    e.preventDefault();
    const id = BTS_TABS[next].id;
    onTabChange(id);
    tabRefs.current[id]?.focus();
  };

  const applyDraft = () => {
    const v = clampBudget(Number(draft));
    setDraft(String(v));
    onBudgetChange(v);
  };

  const n = expandedItems.length;

  return (
    <>
      {open && (
        <div
          className={`fixed inset-0 z-40 animate-fade-in bg-gov-navy/55 ${docked ? 'min-[1440px]:hidden' : ''}`}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        id="bts-inspector"
        ref={panelRef}
        aria-label="Behind the scenes: algorithm inspector"
        aria-hidden={!open}
        inert={!open}
        className={`bts-root fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-bts-bg text-bts-ink shadow-drawer transition-transform duration-200 ease-out print:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        } ${docked ? 'sm:w-[min(1180px,96vw)] min-[1440px]:w-[min(46vw,860px)] min-[1440px]:border-l min-[1440px]:border-bts-line min-[1440px]:shadow-none' : 'sm:w-[min(1180px,96vw)]'}`}
      >
        <header className="border-b border-bts-line bg-[#0B1326]">
          <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3 sm:px-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CodeXml className="h-4 w-4 text-bts-sky" aria-hidden="true" />
                <h2 className="text-[15px] font-semibold text-white">Behind the scenes</h2>
                <span className="rounded-sm border border-bts-line px-1.5 py-px font-mono text-[11px] text-bts-sub">DAA view</span>
              </div>
              <p className="mt-0.5 text-[13px] text-bts-sub">
                How the 0/1 Knapsack algorithm turns the live register into the allocation plan.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onDockedChange(!docked)}
                className="hidden rounded p-1.5 text-bts-sub hover:bg-bts-raised hover:text-white min-[1440px]:inline-flex"
                aria-pressed={docked}
                title={docked ? 'Float over the portal' : 'Dock beside the portal (split view)'}
              >
                {docked ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                <span className="sr-only">{docked ? 'Undock inspector' : 'Dock inspector beside the portal'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1.5 text-bts-sub hover:bg-bts-raised hover:text-white"
                aria-label="Close inspector"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pb-3 sm:px-5">
            <div
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded border px-2.5 py-1 font-mono text-xs transition-colors duration-500 ${
                flash ? 'border-sky-400/60 bg-sky-400/10' : 'border-bts-line bg-bts-panel'
              }`}
              aria-live="polite"
            >
              <span className="inline-flex items-center gap-1.5 text-bts-emerald">
                <span className="h-1.5 w-1.5 rounded-full bg-bts-emerald" aria-hidden="true" />
                Live
              </span>
              <span className="text-bts-sub">
                W = <span className="text-bts-ink">{formatInt(capacity)}</span>
              </span>
              <span className="text-bts-sub">
                n = <span className="text-bts-ink">{formatInt(n)}</span>
              </span>
              <span className="text-bts-sub">
                DP[n][W] = <span className="text-bts-sky">{formatInt(dpResult.maxBenefit)}</span>
              </span>
            </div>
            <div className="flex min-w-[220px] flex-1 items-center gap-2">
              <label htmlFor="bts-budget" className="whitespace-nowrap text-xs text-bts-sub">
                Budget W
              </label>
              <input
                id="bts-budget"
                type="range"
                min={BUDGET_MIN}
                max={BUDGET_MAX}
                step={10}
                value={capacity}
                onChange={(e) => onBudgetChange(Number(e.target.value))}
                className="min-w-0 flex-1 cursor-pointer accent-sky-400"
                aria-valuetext={`${capacity} lakh`}
              />
              <input
                type="number"
                min={BUDGET_MIN}
                max={BUDGET_MAX}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={applyDraft}
                onKeyDown={(e) => e.key === 'Enter' && applyDraft()}
                className="figure w-20 rounded border border-bts-line bg-bts-raised px-2 py-1 text-right text-xs text-bts-ink focus:border-sky-400 focus:outline-none"
                aria-label="Budget W in lakh"
              />
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Inspector sections"
            className="scrollbar-thin flex overflow-x-auto px-2 sm:px-3"
            onKeyDown={onTabKey}
          >
            {BTS_TABS.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  role="tab"
                  type="button"
                  id={`bts-tab-${t.id}`}
                  aria-selected={active}
                  aria-controls={`bts-panel-${t.id}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => onTabChange(t.id)}
                  className={`relative whitespace-nowrap px-3 py-2.5 text-[13px] transition-colors ${active ? 'font-semibold text-white' : 'text-bts-sub hover:text-bts-ink'}`}
                >
                  {t.label}
                  <span
                    className={`absolute inset-x-3 bottom-0 h-[2px] rounded-t ${active ? 'bg-bts-sky' : 'bg-transparent'}`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </header>

        <div
          ref={scrollRef}
          id={`bts-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`bts-tab-${tab}`}
          className="scrollbar-thin flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5"
        >
          {renderContent && (
            <BtsWideContext.Provider value={wide}>
              {tab === 'mapping' && <ProblemMapping {...data} />}
              {tab === 'execution' && <DpExecution {...data} />}
              {tab === 'trace' && <DecisionTrace {...data} />}
              {tab === 'code' && <CodeComplexity {...data} />}
              {tab === 'crosscheck' && <CrossCheck {...data} />}
              {tab === 'viva' && <VivaGuide onOpenTab={onTabChange} />}
            </BtsWideContext.Provider>
          )}
        </div>
      </aside>
    </>
  );
}
