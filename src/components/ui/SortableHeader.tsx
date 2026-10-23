import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { SortDir } from '../../lib/useSort';

interface SortableHeaderProps<K extends string> {
  label: string;
  sortKey: K;
  activeKey: K;
  dir: SortDir;
  onSort: (key: K) => void;
  align?: 'left' | 'right' | 'center';
  title?: string;
  className?: string;
}

export function SortableHeader<K extends string>({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align = 'left',
  title,
  className = '',
}: SortableHeaderProps<K>) {
  const active = activeKey === sortKey;
  const ariaSort = active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
  const Icon = !active ? ChevronsUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  const justify = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''} ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={title}
        className={`-mx-1 inline-flex w-[calc(100%+0.5rem)] items-center gap-1 rounded px-1 py-0.5 ${justify} ${
          active ? 'text-gov-ink' : 'text-gov-sub hover:text-gov-ink'
        }`}
      >
        <span>{label}</span>
        <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-gov-royal' : 'text-slate-400'}`} aria-hidden="true" />
      </button>
    </th>
  );
}
