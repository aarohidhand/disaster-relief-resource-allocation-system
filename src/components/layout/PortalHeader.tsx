import { CodeXml, UserRound } from 'lucide-react';
import { PortalMark } from './PortalMark';
import { DEPARTMENT_NAME, FISCAL_YEAR, PORTAL_NAME, PROGRAMME_NAME } from '../../lib/format';
import { PORTAL_VIEWS } from '../../lib/views';
import type { PortalView } from '../../lib/views';

interface PortalHeaderProps {
  view: PortalView;
  onNavigate: (view: PortalView) => void;
  btsOpen: boolean;
  onToggleBts: () => void;
}

export function PortalHeader({ view, onNavigate, btsOpen, onToggleBts }: PortalHeaderProps) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-gov-royal"
      >
        Skip to main content
      </a>

      <header className="@container bg-gov-navy text-white print:bg-white print:text-gov-ink">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-6 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3.5">
            <PortalMark className="h-10 w-10 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-[13px] text-slate-300">{DEPARTMENT_NAME}</p>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="text-base font-semibold leading-tight sm:text-[17px]">{PORTAL_NAME}</span>
                <span
                  className="rounded-sm border border-amber-400/70 px-1.5 py-px text-xs font-semibold text-amber-300"
                  title="Academic prototype built for a Design and Analysis of Algorithms course. All proposals and figures are synthetic."
                >
                  Prototype
                </span>
              </div>
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-6 text-sm @[1080px]:flex">
            <div className="text-right">
              <p className="text-xs text-slate-400">Allocation cycle</p>
              <p className="font-semibold text-slate-100">
                {PROGRAMME_NAME}, {FISCAL_YEAR}
              </p>
            </div>
            <div
              className="flex items-center gap-2 rounded border border-slate-700 px-2.5 py-1.5"
              aria-label="Signed in as policy analyst (demonstration account)"
            >
              <UserRound className="h-4 w-4 text-slate-300" aria-hidden="true" />
              <span className="text-slate-200">Policy analyst</span>
            </div>
          </div>
        </div>
      </header>

      <nav className="sticky top-0 z-40 bg-gov-royal shadow-[0_1px_0_rgba(15,23,42,0.35)] print:hidden" aria-label="Portal sections">
        <div className="mx-auto flex max-w-[1360px] items-stretch justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <ul className="scrollbar-thin -mb-px flex min-w-0 items-stretch overflow-x-auto">
            {PORTAL_VIEWS.map((item) => {
              const active = item.id === view;
              return (
                <li key={item.id} className="flex">
                  <button
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative whitespace-nowrap px-3 py-3 text-sm transition-colors sm:px-4 ${
                      active ? 'font-semibold text-white' : 'text-blue-100/85 hover:text-white'
                    }`}
                  >
                    {item.label}
                    <span
                      className={`absolute inset-x-3 bottom-0 h-[3px] rounded-t-sm transition-colors sm:inset-x-4 ${active ? 'bg-white' : 'bg-transparent'}`}
                      aria-hidden="true"
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex shrink-0 items-center py-2">
            <button
              type="button"
              onClick={onToggleBts}
              aria-pressed={btsOpen}
              aria-controls="bts-inspector"
              title="Behind the Scenes — see how the 0/1 Knapsack algorithm computes this plan"
              className={`inline-flex items-center gap-2 rounded border px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                btsOpen
                  ? 'border-white bg-white text-gov-royal'
                  : 'border-blue-200/40 text-blue-50 hover:border-blue-100/80 hover:bg-white/10'
              }`}
            >
              <CodeXml className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Behind the scenes</span>
              <span className="sm:hidden">BTS</span>
              <span
                className={`rounded-sm px-1 py-px font-mono text-[11px] ${btsOpen ? 'bg-gov-royal text-white' : 'bg-white/15 text-blue-50'}`}
              >
                DAA
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
