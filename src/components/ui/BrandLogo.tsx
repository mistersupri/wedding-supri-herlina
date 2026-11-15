import React from 'react';

/**
 * The couple's ring logo (public/logo.png, transparent background).
 * On dark surfaces its brown linework needs a light badge behind it to stay readable; `onLight` skips the badge.
 */
export const BrandLogo: React.FC<{ className?: string; onLight?: boolean }> = ({ className = 'h-8 w-8', onLight = false }) => (
  <span className={`inline-grid shrink-0 place-items-center ${onLight ? '' : 'rounded-md bg-paper p-0.5'} ${className}`}>
    <img src="/logo.png" alt="" aria-hidden="true" width={512} height={512} className="h-full w-full object-contain" />
  </span>
);
