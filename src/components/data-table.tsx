"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Search, ArrowUp, ArrowDown, ArrowUpDown, X, SlidersHorizontal } from "lucide-react";
import { InfoTip } from "@/components/ui";

export type Column<T> = {
  key: string;
  label: string;
  info?: string;
  align?: "right";
  className?: string;
  /** Value used for sorting. Omit to make the column not sortable. */
  sort?: (row: T) => string | number | null | undefined;
  /** Value used for the filter dropdown. Omit for no filter on this column. */
  filter?: (row: T) => string | string[];
  render: (row: T) => React.ReactNode;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Text searched by the search box. */
  searchText: (row: T) => string;
  searchPlaceholder?: string;
  /** Pre-filled search text, e.g. from the top search bar. */
  initialQuery?: string;
  rowHref?: (row: T) => string | undefined;
  initialSort?: { key: string; dir: "asc" | "desc" };
  toolbarRight?: React.ReactNode;
  emptyText?: string;
  maxHeight?: number;
  compact?: boolean;
};

export function DataTable<T>({ rows, columns, rowKey, searchText, searchPlaceholder = "Search…", rowHref, initialSort, toolbarRight, emptyText = "Nothing matches. Try clearing the search or filters.", maxHeight, compact, initialQuery = "" }: Props<T>) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [sort, setSort] = useState(initialSort ?? null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filterCols = columns.filter((c) => c.filter);
  const options = useMemo(() => {
    const o: Record<string, string[]> = {};
    for (const c of filterCols) {
      const set = new Set<string>();
      rows.forEach((r) => { const v = c.filter!(r); (Array.isArray(v) ? v : [v]).filter(Boolean).forEach((x) => set.add(x)); });
      o[c.key] = [...set].sort();
    }
    return o;
  }, [rows, filterCols]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter((r) => !needle || searchText(r).toLowerCase().includes(needle));
    for (const [k, v] of Object.entries(filters)) {
      if (!v) continue;
      const col = columns.find((c) => c.key === k);
      if (col?.filter) out = out.filter((r) => { const x = col.filter!(r); return Array.isArray(x) ? x.includes(v) : x === v; });
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sort) {
        out = [...out].sort((a, b) => {
          const x = col.sort!(a), y = col.sort!(b);
          if (x == null && y == null) return 0;
          if (x == null) return 1; // empty values always last
          if (y == null) return -1;
          const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, q, filters, sort, columns, searchText]);

  const active = Object.values(filters).filter(Boolean).length + (q ? 1 : 0);
  const toggleSort = (k: string) => setSort((s) => (s?.key !== k ? { key: k, dir: "asc" } : s.dir === "asc" ? { key: k, dir: "desc" } : null));

  return (
    <div>
      <div className={clsx("flex flex-wrap items-center gap-2 border-b border-line bg-white", compact ? "px-4 py-2.5" : "px-5 py-3")}>
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-line bg-bg px-3 py-1.5 focus-within:border-purple/50 sm:max-w-xs">
          <Search size={14} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted" aria-label="Search table" />
          {q && <button onClick={() => setQ("")} className="text-muted hover:text-ink" aria-label="Clear search"><X size={13} /></button>}
        </div>
        {filterCols.length > 0 && <SlidersHorizontal size={14} className="ml-1 text-muted" />}
        {filterCols.map((c) => (
          <select
            key={c.key}
            value={filters[c.key] ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
            className={clsx("rounded-lg border px-2.5 py-1.5 text-[13px] outline-none", filters[c.key] ? "border-purple/50 bg-tint text-purple" : "border-line bg-white text-ink")}
            aria-label={`Filter by ${c.label}`}
          >
            <option value="">{c.label}: all</option>
            {options[c.key].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        {active > 0 && <button onClick={() => { setQ(""); setFilters({}); }} className="text-[12px] font-semibold text-purple hover:underline">Clear all</button>}
        <span className="ml-auto text-[12px] text-muted">{shown.length === rows.length ? `${rows.length} rows` : `${shown.length} of ${rows.length} rows`}</span>
        {toolbarRight}
      </div>
      <div className="overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 z-10 bg-bg text-left text-muted">
            <tr>
              {columns.map((c) => {
                const s = sort?.key === c.key ? sort.dir : null;
                return (
                  <th key={c.key} className={clsx("whitespace-nowrap px-3 py-2.5 font-semibold first:pl-5 last:pr-5", c.align === "right" && "text-right", c.className)}>
                    <span className={clsx("inline-flex items-center gap-1", c.align === "right" && "justify-end")}>
                      {c.sort ? (
                        <button onClick={() => toggleSort(c.key)} className={clsx("inline-flex items-center gap-1 hover:text-ink", s && "text-purple")} title="Sort">
                          {c.label}
                          {s === "asc" ? <ArrowUp size={12} /> : s === "desc" ? <ArrowDown size={12} /> : <ArrowUpDown size={12} className="opacity-40" />}
                        </button>
                      ) : c.label}
                      {c.info && <InfoTip text={c.info} />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const href = rowHref?.(r);
              return (
                <tr key={rowKey(r)} onClick={href ? () => router.push(href) : undefined} className={clsx("border-t border-line", href && "cursor-pointer hover:bg-bg/70")}>
                  {columns.map((c) => <td key={c.key} className={clsx("px-3 py-3 align-middle first:pl-5 last:pr-5", c.align === "right" && "text-right", c.className)}>{c.render(r)}</td>)}
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr><td colSpan={columns.length} className="px-5 py-10 text-center text-[13px] text-muted">{emptyText}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
