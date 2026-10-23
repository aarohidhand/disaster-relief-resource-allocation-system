import { DEPARTMENT_NAME, PORTAL_NAME, formatClock } from '../../lib/format';

export function PortalFooter({ computedAt }: { computedAt: Date }) {
  return (
    <footer className="@container mt-auto border-t border-gov-line bg-white">
      <div className="mx-auto grid max-w-[1360px] gap-4 px-4 py-6 text-[13px] text-gov-sub sm:px-6 @[900px]:grid-cols-[1fr_auto] lg:px-8">
        <div className="space-y-1">
          <p className="font-semibold text-gov-ink">
            {PORTAL_NAME} <span className="font-normal text-gov-sub">({DEPARTMENT_NAME})</span>
          </p>
          <p>
            Academic prototype for a Design and Analysis of Algorithms course project. All proposals, costs and impact scores are synthetic
            and do not represent any real government programme.
          </p>
        </div>
        <div className="space-y-1 @[900px]:text-right">
          <p>Optimisation engine: exact 0/1 knapsack (dynamic programming), cross-checked by branch and bound.</p>
          <p>
            Plan last computed at <span className="figure text-gov-ink">{formatClock(computedAt)}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
