import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInvitation } from '../../InvitationContext.js';
import { formatLongDate } from '../../../../lib/format.js';
import { venuesOf } from '../shared/kit.js';

interface Slide {
  key: string;
  kind: 'video' | 'image';
  src: string;
  poster?: string;
}

const IMAGE_HOLD_MS = 7000;
const MAX_SLIDES = 3;

/** Hero video first, then gallery videos, then gallery photos, up to three "reels" on the screen. */
function useSlides(): Slide[] {
  const { invitation: inv } = useInvitation();
  return useMemo(() => {
    const slides: Slide[] = [];
    if (inv.heroMediaType === 'VIDEO' && inv.heroVideoUrl)
      slides.push({ key: 'hero-video', kind: 'video', src: inv.heroVideoUrl, poster: inv.heroImage });
    else if (inv.heroImage) slides.push({ key: 'hero-image', kind: 'image', src: inv.heroImage });
    for (const p of inv.gallery.filter((g) => g.mediaType === 'VIDEO'))
      slides.push({ key: p.id, kind: 'video', src: p.url, poster: p.thumbnailUrl });
    for (const p of inv.gallery.filter((g) => g.mediaType !== 'VIDEO')) slides.push({ key: p.id, kind: 'image', src: p.url });
    return slides.slice(0, MAX_SLIDES);
  }, [inv]);
}

const pad = (n: number) => String(n).padStart(2, '0');
const timecode = (s: number) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}`;

/**
 * "Layar lebar": the prewedding film on a full screen, the first scene after the ticket is torn.
 * Videos play muted (the background music keeps playing) and can be paused; photos hold for a few
 * seconds with a slow push-in. Off screen, playback pauses. As the guest scrolls on, the screen
 * recedes and dims into the film reel below.
 */
export const Screen: React.FC<{ motion: boolean }> = ({ motion }) => {
  const { invitation, isOpen, guest } = useInvitation();
  const slides = useSlides();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(!motion);
  const [time, setTime] = useState(0);
  const root = useRef<HTMLElement>(null);
  const videos = useRef<Record<string, HTMLVideoElement | null>>({});
  const [inView, setInView] = useState(true);
  const current = slides[index];
  const count = slides.length;

  const go = useCallback((delta: number) => setIndex((i) => (count ? (i + delta + count) % count : 0)), [count]);

  // Only the visible slide's video plays, and only while the screen is on screen and not paused.
  useEffect(() => {
    for (const [key, v] of Object.entries(videos.current)) {
      if (!v) continue;
      if (key === current?.key && isOpen && inView && !paused) v.play().catch(() => undefined);
      else v.pause();
    }
  }, [current, isOpen, inView, paused]);

  // A photo holds for a while; a video advances when it ends (a lone video loops instead).
  useEffect(() => {
    if (!current || current.kind !== 'image' || count < 2 || paused || !inView || !isOpen) return;
    const t = setTimeout(() => go(1), IMAGE_HOLD_MS);
    return () => clearTimeout(t);
  }, [current, count, paused, inView, isOpen, go]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Scroll-out: --out goes 0..1 over the first screen; gulungan.css scales and dims the screen with it.
  useEffect(() => {
    const el = root.current;
    if (!el || !motion) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const out = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / el.offsetHeight));
      el.style.setProperty('--out', out.toFixed(3));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [motion]);

  useEffect(() => setTime(0), [index]);

  const venue = guest ? venuesOf(invitation.events).at(-1)?.venueName : undefined;
  const hasVideo = slides.some((s) => s.kind === 'video');
  if (!count) return null;

  return (
    <section ref={root} id="gk-screen" className="gk-screen" aria-roledescription="carousel" aria-label="Film prewedding">
      <div className="gk-screen-media">
        {slides.map((s, i) => (
          <div key={s.key} className={`gk-screen-slide ${i === index ? 'is-on' : ''}`} aria-hidden={i !== index}>
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
                onTimeUpdate={(e) => i === index && setTime(e.currentTarget.currentTime)}
                onEnded={() => count > 1 && go(1)}
              />
            ) : (
              <img src={s.src} alt="" referrerPolicy="no-referrer" />
            )}
          </div>
        ))}
        <span className="gk-screen-sprockets" aria-hidden="true" />
      </div>

      <div className="gk-screen-ui">
        <header className="gk-screen-bar">
          <a href="#gk-reel" className="gk-screen-brand">
            {invitation.groomShortName} <span>&amp;</span> {invitation.brideShortName}
          </a>
          <nav className="gk-screen-nav" aria-label="Bagian undangan">
            <a href="#gk-reel">Kisah kami</a>
            <a href="#gk-schedule">Jadwal</a>
            <a href="#gk-location">Lokasi</a>
            <a href="#gk-gallery">Galeri</a>
          </nav>
          <a href="#gk-rsvp" className="gk-screen-cta">
            Konfirmasi hadir
          </a>
        </header>

        <div className="gk-screen-meta">
          <p>Seumur hidup kita dimulai di sini.</p>
          <p>
            {formatLongDate(invitation.weddingDate).replace(/^\w+,\s*/, '')}
            {venue ? ` · ${venue}` : ''}
          </p>
        </div>

        <h2 className="gk-screen-names">
          {invitation.groomShortName} <span>&amp;</span> {invitation.brideShortName}
        </h2>

        <div className="gk-screen-foot">
          <p className="gk-screen-line">
            Hari favorit kami.
            <br />
            Orang-orang favorit kami.
          </p>
          <a href="#gk-rsvp" className="gk-screen-seat">
            Kami simpan kursi untukmu <span aria-hidden="true">↗</span>
          </a>
          <div className="gk-screen-ctrl">
            <span className="gk-screen-tc" aria-hidden="true">
              {current?.kind === 'video' && (
                <>
                  {paused ? '❚❚' : '●'} {timecode(time)}
                </>
              )}
            </span>
            {hasVideo && (
              <button
                type="button"
                className="gk-round"
                onClick={() => setPaused((p) => !p)}
                aria-pressed={paused}
                aria-label={paused ? 'Putar video' : 'Jeda video'}
              >
                {paused ? '▶' : '❚❚'}
              </button>
            )}
            {count > 1 && (
              <>
                <span className="gk-screen-count" aria-live="polite">
                  {pad(index + 1)} / {pad(count)}
                </span>
                <button type="button" className="gk-round" onClick={() => go(-1)} aria-label="Sebelumnya">
                  ←
                </button>
                <button type="button" className="gk-round" onClick={() => go(1)} aria-label="Berikutnya">
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
