import React, { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import f1 from './assets/orchid-1.webp';
import f2 from './assets/orchid-2.webp';
import f3 from './assets/orchid-3.webp';
import f4 from './assets/orchid-4.webp';
import f5 from './assets/orchid-5.webp';
import f6 from './assets/orchid-6.webp';

const SPRITES = [f1, f2, f3, f4, f5, f6];

/** Small deterministic generator so the shower looks the same on every render (and in tests). */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

interface Petal {
  src: string;
  left: number;
  size: number;
  delay: number;
  fall: number;
  sway: number;
  spin: number;
  flip: number;
}

/**
 * Orchids drifting down the screen once the invitation opens. Pure CSS animation on a fixed,
 * click-through layer; it unmounts itself when the last flower has landed off screen.
 */
export const FallingFlowers: React.FC<{ run: boolean; count?: number }> = ({ run, count = 26 }) => {
  const reduce = useReducedMotion();
  const [alive, setAlive] = useState(true);
  const petals = useMemo<Petal[]>(() => {
    const r = rng(20261120);
    const scale = typeof window !== 'undefined' && window.innerWidth < 768 ? 0.75 : 1.25;
    return Array.from({ length: count }, (_, i) => ({
      src: SPRITES[i % SPRITES.length],
      left: r() * 100,
      size: (46 + r() * 70) * scale,
      delay: r() * 5.5,
      fall: 7 + r() * 5,
      sway: 28 + r() * 70,
      spin: (r() > 0.5 ? 1 : -1) * (120 + r() * 300),
      flip: r() > 0.5 ? 1 : -1,
    }));
  }, [count]);

  useEffect(() => {
    if (!run) return;
    setAlive(true);
    const longest = Math.max(...petals.map((p) => p.delay + p.fall));
    const t = window.setTimeout(() => setAlive(false), longest * 1000 + 400);
    return () => window.clearTimeout(t);
  }, [run, petals]);

  if (!run || !alive || reduce) return null;
  return (
    <div className="lp-flowers" aria-hidden="true">
      {petals.map((p, i) => (
        <img
          key={i}
          src={p.src}
          alt=""
          className="lp-flower"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.fall}s`,
              '--sway': `${p.sway}px`,
              '--spin': `${p.spin}deg`,
              '--flip': p.flip,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};
