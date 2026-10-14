import React from 'react';

const PETALS = [45, 135, 225, 315].map((deg) => {
  const rad = (deg * Math.PI) / 180;
  return { deg, x: 12 + Math.cos(rad) * 5.8, y: 12 + Math.sin(rad) * 5.8 };
});

/** One kawung unit: four petals around a seed. The invitation's only ornament. */
export const KawungMark: React.FC<{ className?: string; title?: string }> = ({ className = 'h-5 w-5', title }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    role={title ? 'img' : undefined}
    aria-hidden={!title}
    aria-label={title}
  >
    {PETALS.map((p) => (
      <ellipse key={p.deg} cx={p.x} cy={p.y} rx="3.6" ry="4.2" transform={`rotate(${p.deg + 90} ${p.x} ${p.y})`} />
    ))}
    <circle cx="12" cy="12" r="1.2" />
  </svg>
);

/** Section divider: two hairlines meeting at a kawung mark. */
export const KawungDivider: React.FC<{ className?: string; tone?: 'paper' | 'deep' }> = ({ className = '', tone = 'paper' }) => {
  const line = tone === 'deep' ? 'bg-prada-on-deep/40' : 'bg-prada/50';
  const mark = tone === 'deep' ? 'text-prada-on-deep' : 'text-prada';
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden="true">
      <span className={`h-px w-14 ${line}`} />
      <KawungMark className={`h-5 w-5 ${mark}`} />
      <span className={`h-px w-14 ${line}`} />
    </div>
  );
};
