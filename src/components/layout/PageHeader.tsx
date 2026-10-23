import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { FISCAL_YEAR } from '../../lib/format';

interface PageHeaderProps {
  crumb: string;
  title: string;
  lead?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ crumb, title, lead, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <nav aria-label="Breadcrumb" className="mb-2">
        <ol className="flex flex-wrap items-center gap-1 text-[13px] text-gov-sub">
          <li>Allocation cycle {FISCAL_YEAR}</li>
          <li aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5 text-gov-muted" />
          </li>
          <li aria-current="page" className="text-gov-ink">
            {crumb}
          </li>
        </ol>
      </nav>
      <div className="flex flex-col gap-4 @[900px]/main:flex-row @[900px]/main:items-end @[900px]/main:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-[26px] font-semibold leading-tight text-gov-ink sm:text-[28px]">{title}</h1>
          {lead && <p className="mt-2 text-[15px] leading-relaxed text-gov-sub">{lead}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">{actions}</div>}
      </div>
    </div>
  );
}
