import React from 'react';

/** The little window on a disposable camera that shows how many shots are left. */
export const FrameCounter: React.FC<{ remaining: number }> = ({ remaining }) => (
  <p className="cam-counter" aria-live="polite">
    <span className="sr-only">Sisa jepretan: </span>
    <span aria-hidden="true" className="cam-counter-dial">
      {String(Math.max(0, remaining)).padStart(2, '0')}
    </span>
    <span className="cam-counter-label">frame lagi</span>
  </p>
);
