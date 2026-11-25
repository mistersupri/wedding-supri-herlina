import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutTemplate } from 'lucide-react';
import { buttonClass } from '../ui/Button.js';
import { useActiveTemplate } from './useActiveTemplate.js';

/** Says which template is active and what it does with the content on this page, with a way to change it. */
export const TemplateNote: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const template = useActiveTemplate();
  return (
    <aside aria-label="Template aktif" className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 rounded-md border border-line bg-paper-2 px-4 py-3">
      <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
        <LayoutTemplate className="mt-0.5 h-5 w-5 shrink-0 text-prada-ink" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-semibold">Template aktif: {template.name}</p>
          {children && <p className="mt-0.5 text-ink-soft">{children}</p>}
        </div>
      </div>
      <Link to="/cms/tema" className={buttonClass('secondary', 'sm')}>
        Ganti template
      </Link>
    </aside>
  );
};
