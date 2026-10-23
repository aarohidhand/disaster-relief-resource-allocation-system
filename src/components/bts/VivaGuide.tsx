import type { BtsTab } from '../../lib/views';
import { BtsSection } from './primitives';
import { useBtsWide } from './layout';

const STEPS: { title: string; body: string; tab?: BtsTab }[] = [
  {
    title: 'Start on the portal overview',
    body: 'Read the KPI ribbon (total budget, allocated funds, remaining reserve, total impact, utilization) and the “plan verified as optimal” banner. This is what an analyst sees.',
  },
  {
    title: 'Open the proposal register',
    body: 'Twelve proposals, 238 resource units. Each has a unit cost (₹ lakh), units requested and a projected impact per unit. Edit one to show the plan recomputes instantly.',
  },
  {
    title: 'Change the budget',
    body: 'Pick the ₹500 L envelope. Statuses move between Approved, Partial and Deferred, and the reserve and utilization update. Return to ₹1,000 L.',
  },
  {
    title: 'Walk through the allocation plan',
    body: 'Sort by impact secured and filter to Partial. A partial proposal is one where only some of its units were funded: each unit is its own yes/no decision.',
  },
  {
    title: 'Show scenario analysis',
    body: 'The impact-by-budget curve rises steeply and then flattens: diminishing returns. The marginal bar chart quantifies what each extra ₹100 L buys.',
  },
  {
    title: 'Open Behind the scenes',
    body: 'Problem mapping ties every portal term to the model: W is the budget, wᵢ the unit cost, vᵢ the impact, n the number of units after expansion.',
    tab: 'mapping',
  },
  {
    title: 'Run the tabulation',
    body: 'In DP execution press Play. Each row adds a unit; emerald columns are where including it wins. Click a cell to read the recurrence with real numbers.',
    tab: 'execution',
  },
  {
    title: 'Run the backtracking',
    body: 'Switch to Backtracking and use Next funded unit. The path walks from DP[n][W] to row 0, and the funded impact adds up to exactly DP[n][W].',
    tab: 'execution',
  },
  {
    title: 'Use the readable walkthrough',
    body: 'Choose Readable walkthrough, then Find a case where greedy fails. Step through every cell of a small table built from your own proposals.',
    tab: 'execution',
  },
  {
    title: 'Explain each decision',
    body: 'Decision trace compares DP with greedy-by-ratio across budgets and re-optimises with one unit forced in or out of every proposal, proving each choice.',
    tab: 'trace',
  },
  {
    title: 'Show code and complexity',
    body: 'The real solver source with live loop counts. Run the scaling test: time grows linearly with W, which is what pseudo-polynomial means in practice.',
    tab: 'code',
  },
  {
    title: 'Cross-check with branch and bound',
    body: 'Both algorithms agree at the current budget and at 20 others. Step through the state-space tree to show bound and budget pruning.',
    tab: 'crosscheck',
  },
  {
    title: 'Finish in split view',
    body: 'Dock the inspector beside the portal (wide screens) and drag the budget: both sides react, because they read the same state.',
  },
];

const QA: { q: string; a: string }[] = [
  {
    q: 'Why is the DP called pseudo-polynomial?',
    a: 'It runs in O(n·W). That is polynomial in the numeric value of W, but the input stores W in about log₂W bits, so the running time is exponential in the size of the input. Doubling the budget doubles the work while adding only one bit.',
  },
  {
    q: 'Why expand a proposal for q units into q separate items?',
    a: 'A proposal with q identical units is a bounded knapsack item (fund 0…q). Expanding it into q copies turns it into standard 0/1 Knapsack, which the DP solves directly. Binary splitting (1, 2, 4, … copies) would cut the item count to about Σ log q, a possible optimisation.',
  },
  {
    q: 'How are the funded units recovered from the table?',
    a: 'Backtracking from DP[n][W]: if DP[i][w] differs from DP[i−1][w], unit i must have been included, so record it and move to column w − wᵢ. If the values are equal, unit i was not needed; move straight up. It costs O(n).',
  },
  {
    q: 'Why not sort by impact per rupee and fund greedily?',
    a: 'Greedy is optimal only when items can be split (fractional knapsack). With indivisible units an efficient but expensive unit can block a better combination or strand budget. The decision trace shows the budgets where greedy falls short on this data, and the walkthrough builds a counter-example from your proposals.',
  },
  {
    q: 'How does branch and bound compute its upper bound?',
    a: 'Units are sorted by vᵢ/wᵢ. From a node, it greedily adds whole units that fit and then a fraction of the next one. The fractional optimum relaxes the 0/1 constraint, so it can never be lower than the best 0/1 completion, which makes it a safe bound for pruning.',
  },
  {
    q: 'Why implement both algorithms?',
    a: 'They have different strengths: DP is predictable for moderate integer budgets; branch and bound needs no table and copes with very large or fractional budgets, pruning most of the tree when bounds are tight. Running both on the same input also gives an independent correctness check.',
  },
  {
    q: 'Could the DP use less memory?',
    a: 'Yes for the value alone: a single array of W+1 entries updated right to left gives O(W) space, and the scenario view uses exactly that to get the optimum for every budget in one pass. Recovering the chosen units needs the full table, or a divide-and-conquer scheme such as Hirschberg’s.',
  },
  {
    q: 'What if two plans have the same impact?',
    a: 'The solver keeps the exclude value on ties (it compares with a strict “>”), so one optimal plan is returned. The decision trace flags a tie when forcing a unit in or out leaves the total unchanged.',
  },
];

export function VivaGuide({ onOpenTab }: { onOpenTab: (tab: BtsTab) => void }) {
  const wide = useBtsWide();
  return (
    <div className="space-y-5">
      <BtsSection
        title="Demonstration sequence"
        description="A route through the portal and the inspector that covers every course outcome in about ten minutes."
      >
        <ol className={`grid gap-2.5 ${wide ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {STEPS.map((s, k) => (
            <li key={s.title} className="flex gap-3 rounded border border-bts-line-soft bg-bts-raised/40 px-3 py-2.5">
              <span className="figure mt-px w-5 shrink-0 text-right text-sm text-bts-sky">{k + 1}</span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-bts-ink">{s.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-bts-sub">{s.body}</p>
                {s.tab && (
                  <button type="button" className="mt-1 text-xs text-bts-sky hover:underline" onClick={() => onOpenTab(s.tab as BtsTab)}>
                    Go to this tab
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </BtsSection>

      <BtsSection title="Likely viva questions" description="Short, defensible answers grounded in this implementation.">
        <div className="space-y-2">
          {QA.map((item) => (
            <details key={item.q} className="group rounded border border-bts-line-soft bg-bts-raised/40 px-3 py-2.5 open:bg-bts-raised/70">
              <summary className="cursor-pointer list-none text-[13px] font-semibold text-bts-ink marker:hidden">
                <span className="mr-2 inline-block text-bts-sky transition-transform group-open:rotate-90" aria-hidden="true">
                  ›
                </span>
                {item.q}
              </summary>
              <p className="mt-2 pl-4 text-[13px] leading-relaxed text-bts-sub">{item.a}</p>
            </details>
          ))}
        </div>
      </BtsSection>
    </div>
  );
}
