import { useMemo, useState } from 'react';
import { Download, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import type { SupplyItem } from '../algorithms/types';
import type { PlanLine, PlanSummary } from '../lib/portal';
import { SECTOR_LABELS, SECTOR_ORDER, formatDecimal, formatInt, formatLakh, proposalRef, sectorLabel } from '../lib/format';
import { useSort } from '../lib/useSort';
import { PageHeader } from '../components/layout/PageHeader';
import { SortableHeader } from '../components/ui/SortableHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/Modal';
import { ProposalModal } from '../components/portal/ProposalModal';

interface ProposalRegisterProps {
  supplies: SupplyItem[];
  lines: PlanLine[];
  summary: PlanSummary;
  onSaveSupply: (supply: SupplyItem) => void;
  onDeleteSupply: (id: string) => void;
  onResetDemo: () => void;
  onClearAll: () => void;
  onExport: () => void;
}

interface Row {
  supply: SupplyItem;
  line: PlanLine | undefined;
  ref: string;
  requested: number;
  efficiency: number;
}

type SortKey = 'proposal' | 'sector' | 'zone' | 'cost' | 'units' | 'requested' | 'impact' | 'efficiency' | 'recommendation';

type Pending = { kind: 'delete'; supply: SupplyItem } | { kind: 'reset' } | { kind: 'clear' } | null;

export function ProposalRegister({
  supplies,
  lines,
  summary,
  onSaveSupply,
  onDeleteSupply,
  onResetDemo,
  onClearAll,
  onExport,
}: ProposalRegisterProps) {
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState<'all' | SupplyItem['category']>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SupplyItem | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const lineById = useMemo(() => new Map(lines.map((l) => [l.supplyId, l])), [lines]);
  const zones = useMemo(() => Array.from(new Set(supplies.map((s) => s.destination))), [supplies]);

  const rows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return supplies
      .map((s) => ({
        supply: s,
        line: lineById.get(s.id),
        ref: proposalRef(s.id),
        requested: s.unitWeight * s.quantity,
        efficiency: s.unitWeight > 0 ? s.unitBenefit / s.unitWeight : 0,
      }))
      .filter((r) => (sector === 'all' ? true : r.supply.category === sector))
      .filter((r) => (q === '' ? true : `${r.supply.name} ${r.ref} ${r.supply.destination}`.toLowerCase().includes(q)));
  }, [supplies, lineById, query, sector]);

  const { sorted, sort, requestSort } = useSort<Row, SortKey>(
    rows,
    {
      proposal: (r) => r.ref,
      sector: (r) => sectorLabel(r.supply.category),
      zone: (r) => r.supply.destination,
      cost: (r) => r.supply.unitWeight,
      units: (r) => r.supply.quantity,
      requested: (r) => r.requested,
      impact: (r) => r.supply.unitBenefit,
      efficiency: (r) => r.efficiency,
      recommendation: (r) => (r.line && r.line.totalAvailable > 0 ? r.line.quantitySelected / r.line.totalAvailable : 0),
    },
    { key: 'proposal', dir: 'asc' },
  );

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (s: SupplyItem) => {
    setEditing(s);
    setModalOpen(true);
  };

  const filtered = query.trim() !== '' || sector !== 'all';
  const shownRequested = sorted.reduce((s, r) => s + r.requested, 0);
  const shownUnits = sorted.reduce((s, r) => s + r.supply.quantity, 0);

  return (
    <>
      <PageHeader
        crumb="Proposal register"
        title="Proposal register"
        lead={
          <>
            Every proposal submitted for this cycle, with its unit cost, units requested and projected impact. Edits take effect in the
            allocation plan immediately.
          </>
        }
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={onExport}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Export plan (CSV)
            </button>
            <button type="button" className="btn-primary" onClick={openAdd}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New proposal
            </button>
          </>
        }
      />

      <section className="panel" aria-labelledby="register-title">
        <h2 id="register-title" className="sr-only">
          Proposals
        </h2>
        <div className="flex flex-col gap-3 border-b border-gov-line px-5 py-4 @[960px]/main:flex-row @[960px]/main:items-center @[960px]/main:justify-between">
          <div className="flex flex-1 flex-col gap-3 @[560px]/main:flex-row @[560px]/main:items-center">
            <div className="relative w-full @[560px]/main:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gov-muted" aria-hidden="true" />
              <label htmlFor="register-search" className="sr-only">
                Search proposals
              </label>
              <input
                id="register-search"
                type="search"
                className="input pl-9"
                placeholder="Search by name, reference or zone"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="register-sector" className="whitespace-nowrap text-sm text-gov-sub">
                Sector
              </label>
              <select
                id="register-sector"
                className="input w-auto"
                value={sector}
                onChange={(e) => setSector(e.target.value as typeof sector)}
              >
                <option value="all">All sectors</option>
                {SECTOR_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {SECTOR_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={() => setPending({ kind: 'reset' })}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Load reference dataset
            </button>
            <button
              type="button"
              className="btn-danger btn-sm"
              onClick={() => setPending({ kind: 'clear' })}
              disabled={supplies.length === 0}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clear register
            </button>
          </div>
        </div>

        <div className="scrollbar-thin relative overflow-x-auto">
          <table className="data-table min-w-[1000px]">
            <thead>
              <tr>
                <SortableHeader label="Proposal" sortKey="proposal" activeKey={sort.key} dir={sort.dir} onSort={requestSort} />
                <SortableHeader
                  label="Sector and zone"
                  sortKey="sector"
                  activeKey={sort.key}
                  dir={sort.dir}
                  onSort={requestSort}
                  title="Sort by sector"
                />
                <SortableHeader
                  label="Unit cost (₹ L)"
                  sortKey="cost"
                  activeKey={sort.key}
                  dir={sort.dir}
                  onSort={requestSort}
                  align="right"
                />
                <SortableHeader
                  label="Units"
                  sortKey="units"
                  activeKey={sort.key}
                  dir={sort.dir}
                  onSort={requestSort}
                  align="right"
                  title="Units requested"
                />
                <SortableHeader
                  label="Requested (₹ L)"
                  sortKey="requested"
                  activeKey={sort.key}
                  dir={sort.dir}
                  onSort={requestSort}
                  align="right"
                  title="Total cost of all requested units"
                />
                <SortableHeader
                  label="Impact / unit"
                  sortKey="impact"
                  activeKey={sort.key}
                  dir={sort.dir}
                  onSort={requestSort}
                  align="right"
                />
                <SortableHeader
                  label="Impact / ₹ L"
                  sortKey="efficiency"
                  activeKey={sort.key}
                  dir={sort.dir}
                  onSort={requestSort}
                  align="right"
                  title="Projected impact points per ₹ lakh of cost"
                />
                <SortableHeader label="Recommendation" sortKey="recommendation" activeKey={sort.key} dir={sort.dir} onSort={requestSort} />
                <th scope="col" className="text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    {supplies.length === 0 ? (
                      <div className="mx-auto max-w-md space-y-3">
                        <p className="font-semibold text-gov-ink">The register is empty</p>
                        <p className="text-sm text-gov-sub">
                          Add a proposal, or load the reference dataset of 12 relief procurement proposals.
                        </p>
                        <div className="flex justify-center gap-2">
                          <button type="button" className="btn-primary btn-sm" onClick={openAdd}>
                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            New proposal
                          </button>
                          <button type="button" className="btn-secondary btn-sm" onClick={onResetDemo}>
                            Load reference dataset
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gov-sub">No proposals match the current search and sector filter.</p>
                    )}
                  </td>
                </tr>
              )}
              {sorted.map((r) => (
                <tr key={r.supply.id}>
                  <td className="max-w-[260px]">
                    <p className="truncate font-semibold text-gov-ink" title={r.supply.name}>
                      {r.supply.name}
                    </p>
                    <p className="figure text-xs text-gov-muted">{r.ref}</p>
                  </td>
                  <td className="max-w-[220px]">
                    <p className="truncate text-gov-ink">{sectorLabel(r.supply.category)}</p>
                    <p className="truncate text-xs text-gov-sub" title={r.supply.destination}>
                      {r.supply.destination}
                    </p>
                  </td>
                  <td className="figure text-right text-gov-ink">{formatLakh(r.supply.unitWeight)}</td>
                  <td className="figure text-right text-gov-ink">{formatInt(r.supply.quantity)}</td>
                  <td className="figure text-right font-semibold text-gov-ink">{formatLakh(r.requested)}</td>
                  <td className="figure text-right text-gov-ink">{formatInt(r.supply.unitBenefit)}</td>
                  <td className="figure text-right text-gov-sub">{formatDecimal(r.efficiency)}</td>
                  <td>
                    {r.line ? (
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.line.status} size="sm" />
                        <span className="figure whitespace-nowrap text-xs text-gov-sub">
                          {r.line.quantitySelected}/{r.line.totalAvailable}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gov-muted">—</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(r.supply)}
                        className="rounded p-1.5 text-gov-sub hover:bg-gov-royal-tint hover:text-gov-royal"
                        aria-label={`Edit ${r.supply.name}`}
                        title="Edit proposal"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPending({ kind: 'delete', supply: r.supply })}
                        className="rounded p-1.5 text-gov-sub hover:bg-red-50 hover:text-gov-danger"
                        aria-label={`Remove ${r.supply.name}`}
                        title="Remove proposal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {sorted.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-gov-ink">
                    {filtered ? `${sorted.length} of ${supplies.length} proposals shown` : `${supplies.length} proposals`}
                  </td>
                  <td className="figure text-right text-gov-ink">{formatInt(shownUnits)}</td>
                  <td className="figure text-right text-gov-ink">{formatLakh(shownRequested)}</td>
                  <td colSpan={4} className="text-[13px] font-normal text-gov-sub">
                    Budget ₹{formatLakh(summary.budget)} L, {formatInt(summary.unitsFunded)} units recommended
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <ProposalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={onSaveSupply}
        supplyToEdit={editing}
        knownZones={zones}
      />

      <ConfirmDialog
        open={pending?.kind === 'delete'}
        title="Remove proposal?"
        message={
          pending?.kind === 'delete' ? (
            <>
              <span className="font-semibold text-gov-ink">{pending.supply.name}</span> ({proposalRef(pending.supply.id)}) will be removed
              from the register and the plan will be recalculated.
            </>
          ) : null
        }
        confirmLabel="Remove proposal"
        onConfirm={() => pending?.kind === 'delete' && onDeleteSupply(pending.supply.id)}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.kind === 'reset'}
        title="Load reference dataset?"
        message="The register will be replaced with the 12 reference proposals and the budget reset to ₹1,000 lakh. Changes you have made will be lost."
        confirmLabel="Load reference dataset"
        tone="primary"
        onConfirm={onResetDemo}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.kind === 'clear'}
        title="Clear the register?"
        message="All proposals will be removed. You can load the reference dataset again afterwards."
        confirmLabel="Clear register"
        onConfirm={onClearAll}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
