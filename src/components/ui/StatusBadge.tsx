import { ChartPie, CircleCheck, CirclePause } from 'lucide-react';
import type { FundingStatus } from '../../lib/portal';

const STYLES: Record<FundingStatus, { cls: string; icon: typeof CircleCheck; iconCls: string; hint: string }> = {
  Approved: {
    cls: 'bg-gov-funded-tint text-gov-funded border-gov-funded-line',
    icon: CircleCheck,
    iconCls: 'text-gov-funded',
    hint: 'All requested units funded',
  },
  Partial: {
    cls: 'bg-gov-amber-tint text-amber-800 border-gov-amber-line',
    icon: ChartPie,
    iconCls: 'text-gov-amber',
    hint: 'Some requested units funded; the budget limit binds',
  },
  Deferred: {
    cls: 'bg-gov-deferred-tint text-gov-deferred border-gov-line',
    icon: CirclePause,
    iconCls: 'text-gov-muted',
    hint: 'No units funded in this cycle',
  },
};

interface StatusBadgeProps {
  status: FundingStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const s = STYLES[status];
  const Icon = s.icon;
  return (
    <span
      title={s.hint}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded border font-semibold ${s.cls} ${
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-[13px]'
      }`}
    >
      <Icon className={`${size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} ${s.iconCls}`} aria-hidden="true" />
      {status}
    </span>
  );
}

export function statusHint(status: FundingStatus): string {
  return STYLES[status].hint;
}
