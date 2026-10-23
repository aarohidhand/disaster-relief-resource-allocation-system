import { Download, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { PlanLine, PlanSummary } from '../lib/portal';
import type { VerificationResult } from '../algorithms/types';
import { formatInt, formatLakh, PROGRAMME_NAME } from '../lib/format';
import { PageHeader } from '../components/layout/PageHeader';
import { BudgetControl } from '../components/portal/BudgetControl';
import { SectorFunding } from '../components/portal/SectorFunding';
import { PlanStatusPanel } from '../components/portal/PlanStatusPanel';
import { ZoneDistribution } from '../components/portal/ZoneDistribution';
import { TopContributors } from '../components/portal/TopContributors';

interface OverviewProps {
  summary: PlanSummary;
  lines: PlanLine[];
  verification: VerificationResult;
  onBudgetChange: (value: number) => void;
  onOpenPlan: () => void;
  onExport: () => void;
}

export function Overview({ summary, lines, verification, onBudgetChange, onOpenPlan, onExport }: OverviewProps) {
  return (
    <>
      <PageHeader
        crumb="Overview"
        title="Allocation overview"
        lead={
          summary.proposals === 0 ? (
            <>
              No proposals are in the register yet. Add proposals, or load the reference dataset from the proposal register, to compute a
              plan.
            </>
          ) : (
            <>
              Recommended use of the {PROGRAMME_NAME} envelope across {summary.proposals} proposals ({formatInt(summary.unitsRequested)}{' '}
              resource units). The plan funds the combination of units with the highest total projected social impact that fits within ₹
              {formatLakh(summary.budget)} lakh.
            </>
          )
        }
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={onExport}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Export plan (CSV)
            </button>
            <button type="button" className="btn-primary" onClick={onOpenPlan}>
              Review allocation plan
            </button>
          </>
        }
      />

      {summary.proposals > 0 && (
        <div
          className={`mb-6 flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${
            verification.isMatching ? 'border-gov-funded-line bg-gov-funded-tint text-green-900' : 'border-red-200 bg-red-50 text-red-900'
          }`}
          role="status"
        >
          {verification.isMatching ? (
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gov-funded" aria-hidden="true" />
          ) : (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-gov-danger" aria-hidden="true" />
          )}
          <p>
            {verification.isMatching ? (
              <>
                <span className="font-semibold">Plan verified as optimal.</span> Two independent solution methods report the same maximum
                impact of <span className="figure font-semibold">{formatInt(summary.impact)}</span> points at this budget.
              </>
            ) : (
              <>
                <span className="font-semibold">Verification mismatch.</span> {verification.message}
              </>
            )}
          </p>
        </div>
      )}

      <div className="space-y-6">
        <BudgetControl budget={summary.budget} requestedTotal={summary.requestedTotal} onBudgetChange={onBudgetChange} />

        <div className="grid grid-cols-1 gap-6 @[1100px]/main:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <SectorFunding lines={lines} />
          <PlanStatusPanel lines={lines} summary={summary} onOpenPlan={onOpenPlan} />
        </div>

        <div className="grid grid-cols-1 gap-6 @[1100px]/main:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <ZoneDistribution lines={lines} allocated={summary.allocated} compact />
          <TopContributors lines={lines} totalImpact={summary.impact} />
        </div>
      </div>
    </>
  );
}
