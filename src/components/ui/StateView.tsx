import React from 'react';
import { KawungMark } from './Kawung.js';

// State views appear on paper and on the dark wedel bands; .muted and .danger-text follow the surrounding tone.

export const Spinner: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden="true" />
);

export const LoadingState: React.FC<{ label: string; className?: string }> = ({ label, className = 'py-16' }) => (
  <div role="status" className={`flex flex-col items-center justify-center gap-3 muted ${className}`}>
    <KawungMark className="h-8 w-8 animate-spin text-prada [animation-duration:2.4s]" />
    <p className="text-sm">{label}</p>
  </div>
);

export const ErrorState: React.FC<{ title: string; detail?: string; onRetry?: () => void; className?: string }> = ({
  title,
  detail,
  onRetry,
  className = 'py-12',
}) => (
  <div role="alert" className={`mx-auto flex max-w-md flex-col items-center gap-2 text-center ${className}`}>
    <p className="danger-text font-semibold">{title}</p>
    {detail && <p className="muted text-sm">{detail}</p>}
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 min-h-11 rounded-sm border border-current px-4 text-sm font-semibold hover:opacity-80"
      >
        Coba lagi
      </button>
    )}
  </div>
);

export const EmptyState: React.FC<{ title: string; detail?: string; action?: React.ReactNode; className?: string }> = ({
  title,
  detail,
  action,
  className = 'py-12',
}) => (
  <div className={`mx-auto flex max-w-md flex-col items-center gap-2 text-center ${className}`}>
    <KawungMark className="h-6 w-6 text-prada" />
    <p className="font-display text-lg">{title}</p>
    {detail && <p className="muted text-sm">{detail}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
