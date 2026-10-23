import type { ReactNode } from 'react';

interface ChartTooltipProps {
  active?: boolean;
  label?: ReactNode;
  rows: { key: string; value: ReactNode; name: ReactNode; color?: string }[];
  dark?: boolean;
}

/** Shared tooltip card: the value leads, the series name follows; series keyed with a short line. */
export function ChartTooltip({ active, label, rows, dark = false }: ChartTooltipProps) {
  if (!active || rows.length === 0) return null;
  return (
    <div
      className={`min-w-[160px] rounded border px-3 py-2 text-[13px] shadow-popover ${
        dark ? 'border-bts-line bg-bts-raised text-bts-ink' : 'border-gov-line bg-white text-gov-ink'
      }`}
    >
      {label !== undefined && <p className={`mb-1 text-xs ${dark ? 'text-bts-sub' : 'text-gov-sub'}`}>{label}</p>}
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2">
            {r.color && <span className="h-[2px] w-3 shrink-0 rounded" style={{ background: r.color }} aria-hidden="true" />}
            <span className="figure font-semibold">{r.value}</span>
            <span className={dark ? 'text-bts-sub' : 'text-gov-sub'}>{r.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
