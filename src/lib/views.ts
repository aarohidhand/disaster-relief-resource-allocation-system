export type PortalView = 'overview' | 'proposals' | 'plan' | 'scenarios';

export const PORTAL_VIEWS: { id: PortalView; label: string; crumb: string }[] = [
  { id: 'overview', label: 'Overview', crumb: 'Overview' },
  { id: 'proposals', label: 'Proposal register', crumb: 'Proposal register' },
  { id: 'plan', label: 'Allocation plan', crumb: 'Optimal allocation plan' },
  { id: 'scenarios', label: 'Scenario analysis', crumb: 'Scenario analysis' },
];

export type BtsTab = 'mapping' | 'execution' | 'trace' | 'code' | 'crosscheck' | 'viva';

export const BTS_TABS: { id: BtsTab; label: string; short: string }[] = [
  { id: 'mapping', label: 'Problem mapping', short: 'Mapping' },
  { id: 'execution', label: 'DP execution', short: 'Execution' },
  { id: 'trace', label: 'Decision trace', short: 'Trace' },
  { id: 'code', label: 'Code & complexity', short: 'Code' },
  { id: 'crosscheck', label: 'Cross-check (B&B)', short: 'B&B' },
  { id: 'viva', label: 'Viva guide', short: 'Viva' },
];
