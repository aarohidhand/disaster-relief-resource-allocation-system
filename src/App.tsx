import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SupplyItem } from './algorithms/types';
import {
  INITIAL_SUPPLIES,
  DEFAULT_VEHICLE_CAPACITY,
  expandSupplies,
  solveKnapsackDP,
  solveBranchAndBound,
  verifySolutions,
} from './algorithms';

import { buildPlanCsv, buildPlanLines, downloadText, summarizePlan } from './lib/portal';
import { FISCAL_YEAR, clampBudget, proposalRef, sectorLabel } from './lib/format';
import type { BtsTab, PortalView } from './lib/views';
import { PortalHeader } from './components/layout/PortalHeader';
import { KpiRibbon } from './components/layout/KpiRibbon';
import { PortalFooter } from './components/layout/PortalFooter';
import { Toast } from './components/ui/Toast';
import type { ToastMessage } from './components/ui/Toast';
import { Overview } from './pages/Overview';
import { ProposalRegister } from './pages/ProposalRegister';
import { AllocationPlan } from './pages/AllocationPlan';

// Chart-heavy views load on first use so the portal shell stays light.
const BtsDrawer = lazy(() => import('./components/bts/BtsDrawer'));
const ScenarioAnalysis = lazy(() => import('./pages/ScenarioAnalysis').then((m) => ({ default: m.ScenarioAnalysis })));

export function App() {
  const [supplies, setSupplies] = useState<SupplyItem[]>(INITIAL_SUPPLIES);
  const [capacity, setCapacity] = useState<number>(DEFAULT_VEHICLE_CAPACITY);
  const [view, setView] = useState<PortalView>('overview');
  const [btsOpen, setBtsOpen] = useState(false);
  const [btsDocked, setBtsDocked] = useState(false);
  const [btsTab, setBtsTab] = useState<BtsTab>('mapping');
  const [btsLoaded, setBtsLoaded] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastId = useRef(0);

  // ── Core data flow (unchanged): expand units → solve DP → solve B&B → verify ──
  const expandedItems = useMemo(() => expandSupplies(supplies), [supplies]);

  const dpResult = useMemo(() => solveKnapsackDP(expandedItems, capacity, supplies), [expandedItems, capacity, supplies]);

  const bbResult = useMemo(() => solveBranchAndBound(expandedItems, capacity, supplies), [expandedItems, capacity, supplies]);

  const verification = useMemo(() => verifySolutions(dpResult, bbResult), [dpResult, bbResult]);

  // ── Portal view-model, derived from the DP result ──
  const planLines = useMemo(() => buildPlanLines(dpResult.groupedAllocation, capacity), [dpResult, capacity]);
  const summary = useMemo(() => summarizePlan(dpResult, planLines, supplies), [dpResult, planLines, supplies]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const computedAt = useMemo(() => new Date(), [dpResult]);

  const notify = useCallback((tone: ToastMessage['tone'], text: string) => {
    toastId.current += 1;
    setToast({ id: toastId.current, tone, text });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  // ── Register handlers (same behaviour as before) ──
  const handleSaveSupply = (saved: SupplyItem) => {
    const created = !supplies.some((s) => s.id === saved.id);
    setSupplies((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    notify('success', `${created ? 'Added' : 'Saved'} ${proposalRef(saved.id)} — the plan has been recalculated.`);
  };

  const handleDeleteSupply = (id: string) => {
    setSupplies((prev) => prev.filter((s) => s.id !== id));
    notify('success', `Removed ${proposalRef(id)} from the register.`);
  };

  const handleResetDemo = () => {
    setSupplies(INITIAL_SUPPLIES);
    setCapacity(DEFAULT_VEHICLE_CAPACITY);
    notify('success', 'Reference dataset loaded and budget reset to ₹1,000 lakh.');
  };

  const handleClearAll = () => {
    setSupplies([]);
    notify('success', 'Register cleared.');
  };

  const handleBudgetChange = useCallback((value: number) => setCapacity(clampBudget(value)), []);

  const handleExport = () => {
    if (planLines.length === 0) {
      notify('warning', 'There is nothing to export: the register is empty.');
      return;
    }
    const csv = buildPlanCsv(planLines, summary, sectorLabel);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadText(`allocation-plan_${FISCAL_YEAR.replace(/\s|–/g, '')}_budget-${capacity}L_${stamp}.csv`, csv);
    notify('success', `Exported the allocation plan for ${planLines.length} proposals.`);
  };

  const navigate = (next: PortalView) => {
    setView(next);
    window.scrollTo({ top: 0 });
  };

  const toggleBts = () => {
    setBtsLoaded(true);
    setBtsOpen((v) => !v);
  };

  // Escape closes the inspector; overlay mode locks page scroll behind it.
  useEffect(() => {
    if (!btsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBtsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const overlay = !btsDocked || window.innerWidth < 1440;
    const prevOverflow = document.body.style.overflow;
    if (overlay) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [btsOpen, btsDocked]);

  const docked = btsOpen && btsDocked;

  return (
    <div
      className={`flex min-h-screen flex-col bg-gov-canvas transition-[padding] duration-200 ${docked ? 'min-[1440px]:pr-[min(46vw,860px)]' : ''}`}
    >
      <PortalHeader view={view} onNavigate={navigate} btsOpen={btsOpen} onToggleBts={toggleBts} />
      <KpiRibbon summary={summary} />

      <main
        id="main-content"
        className="@container/main mx-auto w-full max-w-[1360px] flex-1 px-4 pb-16 pt-7 sm:px-6 lg:px-8"
        tabIndex={-1}
      >
        {view === 'overview' && (
          <Overview
            summary={summary}
            lines={planLines}
            verification={verification}
            onBudgetChange={handleBudgetChange}
            onOpenPlan={() => navigate('plan')}
            onExport={handleExport}
          />
        )}

        {view === 'proposals' && (
          <ProposalRegister
            supplies={supplies}
            lines={planLines}
            summary={summary}
            onSaveSupply={handleSaveSupply}
            onDeleteSupply={handleDeleteSupply}
            onResetDemo={handleResetDemo}
            onClearAll={handleClearAll}
            onExport={handleExport}
          />
        )}

        {view === 'plan' && <AllocationPlan lines={planLines} summary={summary} verification={verification} onExport={handleExport} />}

        {view === 'scenarios' && (
          <Suspense fallback={<p className="py-16 text-center text-sm text-gov-sub">Loading scenario analysis…</p>}>
            <ScenarioAnalysis supplies={supplies} expandedItems={expandedItems} summary={summary} onBudgetChange={handleBudgetChange} />
          </Suspense>
        )}
      </main>

      <PortalFooter computedAt={computedAt} />

      {btsLoaded && (
        <Suspense fallback={null}>
          <BtsDrawer
            open={btsOpen}
            docked={btsDocked}
            onDockedChange={setBtsDocked}
            onClose={() => setBtsOpen(false)}
            tab={btsTab}
            onTabChange={setBtsTab}
            supplies={supplies}
            capacity={capacity}
            expandedItems={expandedItems}
            dpResult={dpResult}
            bbResult={bbResult}
            verification={verification}
            planLines={planLines}
            summary={summary}
            onBudgetChange={handleBudgetChange}
          />
        </Suspense>
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
