import { useEffect, useId, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { BUDGET_MAX, BUDGET_MIN, BUDGET_PRESETS, clampBudget, formatCrore, formatInt, formatLakh, formatPercent } from '../../lib/format';

interface BudgetControlProps {
  budget: number;
  requestedTotal: number;
  onBudgetChange: (value: number) => void;
}

export function BudgetControl({ budget, requestedTotal, onBudgetChange }: BudgetControlProps) {
  const inputId = useId();
  const hintId = useId();
  const [draft, setDraft] = useState(String(budget));
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setDraft(String(budget));
  }, [budget]);

  const apply = () => {
    const parsed = Number(draft);
    const next = clampBudget(parsed);
    if (!Number.isFinite(parsed) || parsed !== next) {
      setNotice(
        `Budget must be a whole number between ₹${formatInt(BUDGET_MIN)} L and ₹${formatInt(BUDGET_MAX)} L. Applied ₹${formatInt(next)} L.`,
      );
    } else {
      setNotice(null);
    }
    setDraft(String(next));
    onBudgetChange(next);
  };

  const shortfall = Math.max(0, requestedTotal - budget);
  const coverage = requestedTotal > 0 ? Math.min(1, budget / requestedTotal) : 1;
  const budgetMark = requestedTotal > 0 ? Math.min(1, budget / requestedTotal) : 1;

  return (
    <section className="panel" aria-labelledby={`${inputId}-title`}>
      <div className="grid grid-cols-1 gap-0 @[860px]/main:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="px-5 py-5 @[860px]/main:border-r @[860px]/main:border-gov-line">
          <h2 id={`${inputId}-title`} className="panel-title">
            Total fiscal budget
          </h2>
          <p className="panel-subtitle">The envelope available to this cycle. The plan is re-optimised whenever it changes.</p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor={inputId} className="field-label">
                Budget (₹ lakh)
              </label>
              <div className="flex items-stretch overflow-hidden rounded border border-gov-line-strong focus-within:border-gov-royal focus-within:ring-2 focus-within:ring-gov-royal/20">
                <span
                  className="flex items-center border-r border-gov-line bg-gov-canvas px-3 text-sm font-semibold text-gov-sub"
                  aria-hidden="true"
                >
                  ₹
                </span>
                <input
                  id={inputId}
                  type="number"
                  inputMode="numeric"
                  min={BUDGET_MIN}
                  max={BUDGET_MAX}
                  step={10}
                  value={draft}
                  aria-describedby={hintId}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') apply();
                  }}
                  className="figure w-32 border-0 bg-white px-3 py-2 text-right text-base font-semibold text-gov-ink focus:outline-none"
                />
                <span className="flex items-center border-l border-gov-line bg-gov-canvas px-3 text-sm text-gov-sub" aria-hidden="true">
                  lakh
                </span>
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={apply}>
              Apply budget
            </button>
            <p id={hintId} className="w-full text-[13px] text-gov-muted sm:w-auto">
              = {formatCrore(budget)}
            </p>
          </div>

          {notice && (
            <p
              className="mt-3 flex items-start gap-2 rounded border border-gov-amber-line bg-gov-amber-tint px-3 py-2 text-[13px] text-amber-900"
              role="status"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gov-amber" aria-hidden="true" />
              {notice}
            </p>
          )}

          <div className="mt-5">
            <label htmlFor={`${inputId}-range`} className="sr-only">
              Adjust budget
            </label>
            <input
              id={`${inputId}-range`}
              type="range"
              min={BUDGET_MIN}
              max={BUDGET_MAX}
              step={10}
              value={budget}
              onChange={(e) => onBudgetChange(clampBudget(Number(e.target.value)))}
              className="w-full cursor-pointer accent-[#1E3A8A]"
            />
            <div className="figure mt-1 flex justify-between text-xs text-gov-muted">
              <span>₹{formatInt(BUDGET_MIN)} L</span>
              <span>₹{formatInt(BUDGET_MAX)} L</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[13px] text-gov-sub">Common envelopes</span>
            {BUDGET_PRESETS.map((p) => {
              const active = p === budget;
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setNotice(null);
                    onBudgetChange(p);
                  }}
                  className={`figure rounded border px-2.5 py-1 text-[13px] transition-colors ${
                    active
                      ? 'border-gov-royal bg-gov-royal text-white'
                      : 'border-gov-line-strong bg-white text-gov-ink hover:border-gov-royal hover:text-gov-royal'
                  }`}
                >
                  ₹{formatInt(p)} L
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-gov-line px-5 py-5 @[860px]/main:border-t-0">
          <h3 className="text-sm font-semibold text-gov-ink">Demand against envelope</h3>
          <p className="mt-0.5 text-[13px] text-gov-sub">Total cost of every requested unit, with the budget limit marked.</p>

          {requestedTotal === 0 ? (
            <p className="mt-5 rounded border border-dashed border-gov-line-strong px-4 py-6 text-center text-sm text-gov-sub">
              No proposals in the register, so there is no demand to compare with the envelope.
            </p>
          ) : (
            <>
              <div className="mt-5">
                <div className="relative h-7 rounded-sm bg-slate-200" aria-hidden="true">
                  <div className="absolute inset-y-0 left-0 rounded-l-sm bg-gov-royal/85" style={{ width: `${budgetMark * 100}%` }} />
                  <div
                    className="absolute -inset-y-1.5 w-[3px] rounded-full bg-gov-amber"
                    style={{ left: `calc(${budgetMark * 100}% - 1.5px)` }}
                  />
                </div>
                <div className="mt-2 flex justify-between gap-3 text-[13px]">
                  <span className="text-gov-sub">
                    <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-gov-royal/85 align-middle" aria-hidden="true" />
                    Fundable within budget
                  </span>
                  <span className="text-gov-sub">
                    <span className="mr-1.5 inline-block h-2.5 w-[3px] rounded-full bg-gov-amber align-middle" aria-hidden="true" />
                    Budget limit
                  </span>
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded border border-gov-line bg-gov-line text-sm">
                <div className="bg-white px-3 py-2.5">
                  <dt className="text-xs text-gov-sub">Requested</dt>
                  <dd className="figure mt-0.5 font-semibold text-gov-ink">₹{formatLakh(requestedTotal)} L</dd>
                </div>
                <div className="bg-white px-3 py-2.5">
                  <dt className="text-xs text-gov-sub">Shortfall</dt>
                  <dd className={`figure mt-0.5 font-semibold ${shortfall > 0 ? 'text-amber-700' : 'text-gov-funded'}`}>
                    ₹{formatLakh(shortfall)} L
                  </dd>
                </div>
                <div className="bg-white px-3 py-2.5">
                  <dt className="text-xs text-gov-sub">Coverage</dt>
                  <dd className="figure mt-0.5 font-semibold text-gov-ink">{formatPercent(coverage)}</dd>
                </div>
              </dl>
              {shortfall > 0 ? (
                <p className="mt-3 text-[13px] leading-relaxed text-gov-sub">
                  Demand exceeds the envelope by ₹{formatLakh(shortfall)} L, so proposals compete for funds. The plan funds the combination
                  of units with the highest total projected impact.
                </p>
              ) : (
                <p className="mt-3 text-[13px] leading-relaxed text-gov-sub">
                  The envelope covers every requested unit; all proposals can be approved in full.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
