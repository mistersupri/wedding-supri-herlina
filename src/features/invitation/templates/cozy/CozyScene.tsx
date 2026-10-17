import React from 'react';

/** The little world behind the panels: sun, drifting clouds, hills, a cottage and trees. Decorative only. */
export const CozyScene: React.FC = () => (
  <div className="ch-scene" aria-hidden="true">
    <svg className="ch-sun" viewBox="0 0 100 100">
      <g className="ch-sun-rays" stroke="#ffd36b" strokeWidth="5" strokeLinecap="round">
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="50" y1="6" x2="50" y2="16" transform={`rotate(${i * 30} 50 50)`} />
        ))}
      </g>
      <circle cx="50" cy="50" r="24" fill="#ffd36b" />
      <circle cx="50" cy="50" r="24" fill="none" stroke="#f5b93e" strokeWidth="3" />
    </svg>
    <span className="ch-cloud c1" />
    <span className="ch-cloud c2" />
    <span className="ch-cloud c3" />
    <svg className="ch-land" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice">
      <path d="M0 150 C80 100 160 120 220 140 S340 90 400 120 V300 H0Z" fill="#9fcf8f" />
      <path d="M0 200 C90 160 170 190 240 180 S350 150 400 175 V300 H0Z" fill="#7fb874" />
      <g transform="translate(150 120)">
        <rect x="0" y="40" width="100" height="70" rx="6" fill="#f6e3c4" stroke="#5e331a" strokeWidth="4" />
        <path d="M-12 46 L50 -6 L112 46 Z" fill="#c0583f" stroke="#5e331a" strokeWidth="4" strokeLinejoin="round" />
        <rect x="40" y="66" width="22" height="44" rx="4" fill="#8e5126" stroke="#5e331a" strokeWidth="3" />
        <rect x="12" y="58" width="20" height="18" rx="3" fill="#ffd85e" stroke="#5e331a" strokeWidth="3" />
        <rect x="70" y="58" width="20" height="18" rx="3" fill="#ffd85e" stroke="#5e331a" strokeWidth="3" />
        <rect x="74" y="4" width="12" height="24" fill="#a2622f" stroke="#5e331a" strokeWidth="3" />
      </g>
      {[
        [50, 170, 1],
        [95, 186, 0.8],
        [318, 160, 1.1],
        [360, 182, 0.8],
      ].map(([x, y, s]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
          <rect x="-4" y="0" width="8" height="26" fill="#8e5126" />
          <circle cx="0" cy="-8" r="22" fill="#4f8a55" stroke="#2f5d37" strokeWidth="3" />
          <circle cx="-8" cy="-14" r="6" fill="#6aa66b" />
        </g>
      ))}
      <path d="M200 230 C190 255 215 270 205 300" stroke="#e8d3a6" strokeWidth="18" fill="none" strokeLinecap="round" />
    </svg>
  </div>
);
