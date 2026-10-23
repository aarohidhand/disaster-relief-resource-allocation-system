import { useCallback, useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

/**
 * Client-side sorting for data tables. Accessors return the comparable value per column;
 * the first click on a numeric column sorts descending (largest first), text ascending.
 */
export function useSort<T, K extends string>(rows: T[], accessors: Record<K, (row: T) => string | number>, initial: SortState<K>) {
  const [sort, setSort] = useState<SortState<K>>(initial);

  const sorted = useMemo(() => {
    const get = accessors[sort.key];
    if (!get) return rows;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
      return String(va).localeCompare(String(vb), 'en-IN', { numeric: true, sensitivity: 'base' }) * factor;
    });
    // accessors are defined inline by callers; the sort key captures intent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  const requestSort = useCallback(
    (key: K) => {
      setSort((prev) => {
        if (prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
        const sample = rows.length > 0 ? accessors[key](rows[0]) : '';
        return { key, dir: typeof sample === 'number' ? 'desc' : 'asc' };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  );

  return { sorted, sort, requestSort };
}
