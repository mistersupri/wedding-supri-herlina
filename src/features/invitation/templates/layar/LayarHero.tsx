import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { dateParts } from '../../../../lib/format.js';
import { useInvitation } from '../../InvitationContext.js';
import { usePhotoPool } from '../shared/kit.js';

interface Slide {
  key: string;
  kind: 'video' | 'image';
  src: string;
  poster?: string;
}

const HOLD_MS = 7000;
const MAX_SLIDES = 3;
const pad = (n: number) => String(n).padStart(2, '0');

/** Hero video (or photo) first, then gallery videos and photos: up to three scenes on the screen. */
function useSlides(): Slide[] {
  const { invitation: inv } = useInvitation();
  const photo = usePhotoPool(inv);
  return useMemo(() => {
    const slides: Slide[] = [];
    if (inv.heroMediaType === 'VIDEO' && inv.heroVideoUrl) slides.push({ key: 'hero-video', kind: 'video', src: inv.heroVideoUrl, poster: inv.heroImage });
    else if (inv.heroImage) slides.push({ key: 'hero-image', kind: 'image', src: inv.heroImage });
    for (const p of inv.gallery.filter((g) => g.mediaType === 'VIDEO')) slides.push({ key: p.id, kind: 'video', src: p.url, poster: p.thumbnailUrl });
    for (const p of inv.gallery.filter((g) => g.mediaType !== 'VIDEO')) slides.push({ key: p.id, kind: 'image', src: p.url });
    if (!slides.length && photo(0)) slides.push({ key: 'pool', kind: 'image', src: photo(0) });
    return slides.slice(0, MAX_SLIDES);
  }, [inv, photo]);
}

/** Full-screen opening scene: the couple's video or photos, names at the foot, the guest's greeting and controls. */
export const LayarHero: React.FC = () => {
  const { invitation: inv, isOpen, displayName, isCheckingGuest } = useInvitation();
  const reduce = useReducedMotion();
  const slides = useSlides();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(Boolean(reduce));
  const [inView, setInView] = useState(true);
  const root = useRef<HTMLElement>(null);
  const videos = useRef<Record<string, HTMLVideoElement | null>>({});
  const count = slides.length;
  const current = slides[index];
  const d = dateParts(inv.weddingDate);

  const go = useCallback((n: number) => setIndex((i) => (count ? (i + n + count) % count : 0)), [count]);

  useEffect(() => {
    for (const [key, v] of Object.entries(videos.current)) {
      if (!v) continue;
      if (key === current?.key && isOpen && inView && !paused) v.play().catch(() => undefined);
      else v.pause();
    }
  }, [current, isOpen, inView, paused]);

  useEffect(() => {
    if (!current || current.kind !== 'image' || count < 2 || paused || !inView) return;
    const t = setTimeout(() => go(1), HOLD_MS);
    return () => clearTimeout(t);
  }, [current, count, paused, inView, go]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hasVideo = slides.some((s) => s.kind === 'video');
  return (
    <section ref={root} id="top" className="lp-hero" aria-roledescription="carousel" aria-label="Sampul undangan">
      <div className="lp-hero-media">
        {slides.map((s, i) => (
          <div key={s.key} className={`lp-hero-slide ${i === index ? 'is-on' : ''}`} aria-hidden={i !== index}>
            {s.kind === 'video' ? (
              <video
                ref={(v) => {
                  videos.current[s.key] = v;
                }}
                src={s.src}
                poster={s.poster}
                muted
                playsInline
                loop={count === 1}
                preload={i === 0 ? 'auto' : 'metadata'}
                onEnded={() => count > 1 && go(1)}
              />
            ) : (
              <img src={s.src} alt={i === index ? `Foto ${inv.groomShortName} dan ${inv.brideShortName}` : ''} referrerPolicy="no-referrer" />
            )}
          </div>
        ))}
      </div>
      <div className="lp-hero-shade" aria-hidden="true" />
      <div className="lp-hero-ui">
        <p className="lp-hero-meta">
          <span>Undangan Pernikahan</span>
          <time dateTime={inv.weddingDate}>
            {Number(d.day)} {d.monthName} {d.year}
          </time>
        </p>
        <h1 className="lp-hero-names">
          {inv.groomShortName} <em>&amp;</em> {inv.brideShortName}
        </h1>
        <div className="lp-hero-foot">
          <div className="lp-hero-guest">
            <p className="lp-to">
              Kepada Yth.
              <small>Bapak/Ibu/Saudara/i</small>
            </p>
            <p className="lp-guest-pill">{isCheckingGuest ? 'Memeriksa undangan…' : displayName}</p>
            <button type="button" className="lp-btn-ghost" onClick={() => document.getElementById('salam')?.scrollIntoView({ behavior: 'smooth' })}>
              Buka Undangan <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="lp-hero-ctrl">
            {hasVideo && (
              <button type="button" className="lp-round" onClick={() => setPaused((p) => !p)} aria-pressed={paused} aria-label={paused ? 'Putar video' : 'Jeda video'}>
                {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
              </button>
            )}
            {count > 1 && (
              <>
                <span className="lp-count-n" aria-live="polite">
                  {pad(index + 1)} / {pad(count)}
                </span>
                <button type="button" className="lp-round" onClick={() => go(-1)} aria-label="Sebelumnya">
                  ←
                </button>
                <button type="button" className="lp-round" onClick={() => go(1)} aria-label="Berikutnya">
                  →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
