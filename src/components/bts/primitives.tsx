import type { ReactNode } from 'react';

export function BtsSection({
  title,
  description,
  actions,
  children,
  className = '',
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`bts-panel ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-bts-line px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-bts-ink">{title}</h3>
          {description && <p className="mt-0.5 text-[13px] leading-relaxed text-bts-sub">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Metric({
  label,
  value,
  hint,
  tone = 'ink',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'ink' | 'sky' | 'emerald' | 'amber' | 'rose';
}) {
  const toneCls = { ink: 'text-bts-ink', sky: 'text-bts-sky', emerald: 'text-bts-emerald', amber: 'text-bts-amber', rose: 'text-bts-rose' }[
    tone
  ];
  return (
    <div className="min-w-0 rounded border border-bts-line-soft bg-bts-raised/60 px-3 py-2.5">
      <p className="text-xs text-bts-sub">{label}</p>
      <p className={`figure mt-0.5 truncate text-lg font-semibold ${toneCls}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs leading-snug text-bts-muted">{hint}</p>}
    </div>
  );
}

/** Inline math-ish symbol with subscript, e.g. <Sym base="w" sub="i" /> */
export function Sym({ base, sub, sup }: { base: string; sub?: string; sup?: string }) {
  return (
    <span className="whitespace-nowrap font-serif italic">
      {base}
      {sub && <sub className="font-sans not-italic text-[0.7em]">{sub}</sub>}
      {sup && <sup className="font-sans not-italic text-[0.7em]">{sup}</sup>}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-bts-line bg-bts-raised px-1.5 py-px font-mono text-[11px] text-bts-sub">{children}</kbd>;
}
