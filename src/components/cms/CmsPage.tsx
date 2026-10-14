import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '../ui/Button.js';

export const PageHeader: React.FC<{ title: string; description?: string; actions?: React.ReactNode }> = ({
  title,
  description,
  actions,
}) => (
  <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="font-display text-3xl leading-tight">{title}</h1>
      {description && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-soft">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </header>
);

export const Panel: React.FC<{
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, description, actions, className = '', children }) => (
  <section className={`rounded-md border border-line bg-card p-5 sm:p-6 ${className}`}>
    {(title || actions) && (
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
        </div>
        {actions}
      </div>
    )}
    {children}
  </section>
);

/** Number + label tile for real counts from the server. */
export const Stat: React.FC<{ label: string; value: number | string; detail?: string }> = ({ label, value, detail }) => (
  <div className="rounded-md border border-line bg-card p-4">
    <p className="text-sm text-ink-soft">{label}</p>
    <p className="display-numeral mt-1 text-3xl leading-none">{value}</p>
    {detail && <p className="mt-1.5 text-xs text-ink-soft">{detail}</p>}
  </div>
);

export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = React.useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages);
  return {
    page: current,
    pages,
    setPage,
    slice: items.slice((current - 1) * pageSize, current * pageSize),
    from: items.length ? (current - 1) * pageSize + 1 : 0,
    to: Math.min(current * pageSize, items.length),
    total: items.length,
  };
}

export const Pagination: React.FC<{
  page: number;
  pages: number;
  from: number;
  to: number;
  total: number;
  onPage: (p: number) => void;
  noun: string;
}> = ({ page, pages, from, to, total, onPage, noun }) => (
  <nav aria-label={`Halaman ${noun}`} className="mt-4 flex items-center justify-between gap-3 text-sm text-ink-soft">
    <p>
      {from}–{to} dari {total} {noun}
    </p>
    {pages > 1 && (
      <div className="flex items-center gap-1">
        <IconButton label="Halaman sebelumnya" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-5 w-5" />
        </IconButton>
        <span aria-current="page" className="min-w-16 text-center">
          {page} / {pages}
        </span>
        <IconButton label="Halaman berikutnya" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="h-5 w-5" />
        </IconButton>
      </div>
    )}
  </nav>
);
