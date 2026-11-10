import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowUpRight, CalendarPlus, Camera, Clock3, Disc3, KeyRound, Lock, MapPin, QrCode, RotateCcw, Settings2, Shirt } from 'lucide-react';
import { useInvitation } from '../../InvitationContext.js';
import { useGuestbook } from '../../hooks/useGuestbook.js';
import { useCountdown } from '../../../../hooks/useCountdown.js';
import { useCopy } from '../../../../hooks/useCopy.js';
import { useActiveSection } from '../../../../hooks/useActiveSection.js';
import { dateParts } from '../../../../lib/format.js';
import { googleCalendarUrl } from '../../../../lib/calendar.js';
import { Reveal } from '../../../../components/ui/Reveal.js';
import { GiftQrDialog, romanNumeral, timeRange, useTemplateFonts, usePhotoPool } from '../shared/kit.js';
import { TemplateRsvp } from '../shared/TemplateRsvp.js';
import { ContactSheet, SceneViewer, frameCode } from './ContactSheet.js';
import type { GiftAccount } from '@shared/types';
import './layar.css';

const FONTS =
  'family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@400;500&family=IBM+Plex+Mono:wght@400';

const NAV = [
  { id: 'kisah', label: 'Kisah' },
  { id: 'acara', label: 'Acara' },
  { id: 'galeri', label: 'Galeri' },
  { id: 'rsvp', label: 'RSVP' },
];

const pad2 = (n: number) => String(n).padStart(2, '0');
const igHandle = (ig: string) => ig.replace('@', '').trim();
const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/** "A · N" monogram from the short names. */
const useMonogram = () => {
  const { invitation } = useInvitation();
  return `${invitation.groomShortName.charAt(0)} · ${invitation.brideShortName.charAt(0)}`.toUpperCase();
};

const Kicker: React.FC<{ reel: number; children: React.ReactNode }> = ({ reel, children }) => (
  <p className="lp-mono lp-gold">
    Reel {pad2(reel)} — {children}
  </p>
);

/* ------------------------------------------------------------------ Nav & dock */

const MusicButton: React.FC<{ className?: string; compact?: boolean }> = ({ className = '', compact }) => {
  const { music } = useInvitation();
  if (!music.available) return null;
  return (
    <button
      type="button"
      className={`lp-pill ${className}`}
      onClick={music.toggle}
      aria-pressed={music.playing}
      aria-label={compact ? (music.playing ? 'Jeda musik' : 'Putar musik') : undefined}
    >
      <Disc3 size={16} aria-hidden="true" className={`lp-gold ${music.playing ? 'lp-spin' : ''}`} />
      {!compact && <span>{music.playing ? 'Jeda musik' : 'Putar musik'}</span>}
    </button>
  );
};

const Nav: React.FC = () => {
  const { invitation, isOpen, guest, showPass, photoMomentsHref } = useInvitation();
  const mono = useMonogram();
  const d = dateParts(invitation.weddingDate);
  const active = useActiveSection(isOpen ? NAV.map((n) => n.id) : []);
  return (
    <nav className="lp-nav" aria-label="Navigasi undangan">
      <p className="lp-mark">{mono}</p>
      <p className="lp-mono lp-muted lp-hide-md">
        Reel 01 · {d.day}.{d.month}.{d.year}
      </p>
      {isOpen && (
        <ul className="lp-nav-links lp-hide-md">
          {NAV.map((n) => (
            <li key={n.id}>
              <a href={`#${n.id}`} aria-current={active === n.id ? 'true' : undefined}>
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="lp-nav-actions">
        {isOpen && guest && (
          <button type="button" className="lp-pill lp-hide-md" onClick={() => showPass()}>
            <QrCode size={16} aria-hidden="true" /> Kartu tamu
          </button>
        )}
        {isOpen && photoMomentsHref && (
          <a className="lp-pill lp-hide-md" href={photoMomentsHref}>
            <Camera size={16} aria-hidden="true" /> Kamera
          </a>
        )}
        <MusicButton className="lp-hide-md" />
        <MusicButton className="lp-show-md lp-round-pill" compact />
      </div>
    </nav>
  );
};

/** Floating controls on phones, where the nav has no room for them. */
const Dock: React.FC = () => {
  const { music, guest, showPass, photoMomentsHref } = useInvitation();
  if (!music.available && !guest && !photoMomentsHref) return null;
  return (
    <nav className="lp-dock" aria-label="Kontrol undangan">
      {music.available && (
        <button type="button" onClick={music.toggle} aria-pressed={music.playing} className={music.playing ? 'is-on' : ''}>
          <Disc3 size={18} aria-hidden="true" />
          <span>{music.playing ? 'Jeda musik' : 'Putar musik'}</span>
        </button>
      )}
      {guest && (
        <button type="button" onClick={() => showPass()}>
          <QrCode size={18} aria-hidden="true" />
          <span>Kartu tamu</span>
        </button>
      )}
      {photoMomentsHref && (
        <a href={photoMomentsHref}>
          <Camera size={18} aria-hidden="true" />
          <span>Kamera</span>
        </a>
      )}
    </nav>
  );
};

/* ------------------------------------------------------------------ Reel 01: opening title (also the cover) */

const LetterboxStill: React.FC = () => {
  const { invitation, isOpen } = useInvitation();
  const photo = usePhotoPool(invitation);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const video = invitation.heroMediaType === 'VIDEO' && invitation.heroVideoUrl ? invitation.heroVideoUrl : '';
  const d = dateParts(invitation.weddingDate);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (reduce) {
      v.pause();
      setPaused(true);
      return;
    }
    // Play only while on screen, so the footage never runs behind the rest of the page.
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !paused) v.play().catch(() => undefined);
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, [reduce, paused, isOpen]);

  return (
    <div className="lp-still-hero">
      {video ? (
        <video ref={videoRef} src={video} poster={invitation.heroImage} muted loop playsInline preload="metadata" aria-label="Video prewedding" />
      ) : (
        <img src={invitation.heroImage || photo(0)} alt={`Foto ${invitation.groomShortName} dan ${invitation.brideShortName}`} referrerPolicy="no-referrer" />
      )}
      <div className="lp-still-scrim" aria-hidden="true" />
      <p className="lp-still-row lp-still-row-top" aria-hidden="true">
        <span>● Rec · SC.01</span>
        <span>2.39 : 1</span>
      </p>
      <p className="lp-still-row lp-still-row-bottom">
        <span aria-hidden="true">Prolog</span>
        {video ? (
          <button
            type="button"
            className="lp-still-toggle"
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              if (v.paused) {
                setPaused(false);
                v.play().catch(() => undefined);
              } else {
                setPaused(true);
                v.pause();
              }
            }}
          >
            {paused ? 'Putar video' : 'Jeda video'}
          </button>
        ) : (
          <span aria-hidden="true">
            {d.day}:{d.month}:{d.year.slice(-2)}
          </span>
        )}
      </p>
    </div>
  );
};

const Hero: React.FC = () => {
  const { invitation, isOpen, open, displayName, guest, isCheckingGuest } = useInvitation();
  const firstVenue = invitation.events[0]?.venueName;
  const date = new Date(invitation.weddingDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <header className="lp-hero" id="mulai">
      <Nav />
      <div className="lp-title-block">
        <p className="lp-mono lp-ink">Bersama keluarga besar kedua mempelai</p>
        <p className="lp-presents">mempersembahkan</p>
        <h1 className="lp-names">
          <span>{invitation.groomShortName}</span>
          <em aria-label="dan">&amp;</em>
          <span>{invitation.brideShortName}</span>
        </h1>
        <p className="lp-tagline">Sebuah kisah cinta dalam satu babak yang panjang</p>
      </div>
      <LetterboxStill />
      <div className="lp-info">
        <div className="lp-info-cell">
          <p className="lp-mono lp-muted">Tayang perdana</p>
          <p className="lp-info-val">{date}</p>
        </div>
        <div className="lp-info-cell lp-info-guest">
          <p className="lp-info-to">Kepada Yth. Bapak/Ibu/Saudara/i</p>
          <p className="lp-info-name">{isCheckingGuest ? 'Memeriksa undangan...' : displayName}</p>
          {isOpen ? (
            <button type="button" className="lp-btn" onClick={() => scrollToId('kisah')}>
              Mulai menonton <ArrowDown size={16} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="lp-btn"
              onClick={() => {
                open();
                requestAnimationFrame(() => scrollToId('kisah'));
              }}
            >
              Buka undangan <ArrowDown size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="lp-info-cell lp-info-end">
          <p className="lp-mono lp-muted">Lokasi</p>
          <p className="lp-info-val">{guest ? firstVenue : <span className="lp-locked">Dibuka dengan kode undangan</span>}</p>
        </div>
      </div>
    </header>
  );
};

/* ------------------------------------------------------------------ Reel 02: story on a 35mm strip */

/** Writes how far the section has scrolled through the viewport (0..1) as `--p`. */
function useScrollProgress(ref: React.RefObject<HTMLElement | null>) {
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
      el.style.setProperty('--p', p.toFixed(4));
    };
    const onScroll = () => (raf ||= requestAnimationFrame(update));
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref, reduce]);
}

const Story: React.FC = () => {
  const { invitation } = useInvitation();
  const photo = usePhotoPool(invitation);
  const ref = useRef<HTMLElement>(null);
  useScrollProgress(ref);
  const stories = invitation.loveStories;
  const year = invitation.weddingDate.slice(2, 4);
  const frames = Array.from({ length: Math.max(8, stories.length + 4) }, (_, i) => stories[i]?.photoUrl || photo(i));
  return (
    <section id="kisah" ref={ref} className="lp-sec lp-story" aria-labelledby="kisah-title">
      <div className="lp-wrap lp-story-head">
        <div>
          <Kicker reel={2}>Kisah kami</Kicker>
          <h2 id="kisah-title" className="lp-h2">
            Gulir perlahan, dan biarkan filmnya berputar.
          </h2>
        </div>
        <p className="lp-mono lp-muted lp-story-hint" aria-hidden="true">
          <span className="lp-ink">{stories.length} adegan</span> · Gulir ↓
        </p>
      </div>
      <div className="lp-strip-window" aria-hidden="true">
        <div className="lp-film lp-film-story">
          <ol>
            {frames.map((src, i) => (
              <li key={i}>
                <span className="lp-frame">{src && <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" />}</span>
                <span className="lp-edge">
                  {romanNumeral(i)} · AN {year} ▸ {frameCode(i)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      {stories.length > 0 && (
        <ol className="lp-wrap lp-chapters">
          {stories.map((s, i) => (
            <Reveal as="li" key={s.id} className="lp-chapter" delay={i * 0.08}>
              <p className="lp-chapter-year">{s.year}</p>
              <div>
                <h3 className="lp-mono lp-ink">{s.title}</h3>
                <p className="lp-body">{s.description}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ Reel 03: cast */

const Cast: React.FC = () => {
  const { invitation: inv } = useInvitation();
  const people = [
    { role: 'Sebagai mempelai pria', full: inv.groomName, parents: inv.groomParents, photo: inv.groomPhoto, ig: inv.groomInstagram },
    { role: 'Sebagai mempelai wanita', full: inv.brideName, parents: inv.brideParents, photo: inv.bridePhoto, ig: inv.brideInstagram },
  ];
  return (
    <section className="lp-sec lp-cast" aria-labelledby="pemeran-title">
      <div className="lp-wrap lp-center">
        <Kicker reel={3}>Para pemeran</Kicker>
        <h2 id="pemeran-title" className="lp-sr">
          Para pemeran
        </h2>
        <blockquote className="lp-quote">
          <p>“{inv.quoteText}”</p>
          {inv.quoteSource && <footer className="lp-mono lp-muted">{inv.quoteSource}</footer>}
        </blockquote>
      </div>
      <div className="lp-wrap lp-cast-row">
        {people.map((p, i) => (
          <React.Fragment key={p.role}>
            {i === 1 && (
              <div className="lp-amp-col" aria-hidden="true">
                <span />
                <em>&amp;</em>
                <span />
              </div>
            )}
            <Reveal className={`lp-person ${i ? 'is-low' : ''}`} delay={i * 0.12}>
              <div className="lp-arch">{p.photo && <img src={p.photo} alt={p.full} loading="lazy" referrerPolicy="no-referrer" />}</div>
              <p className="lp-mono lp-gold">{p.role}</p>
              <h3 className="lp-person-name">{p.full}</h3>
              <p className="lp-body">{p.parents}</p>
              {p.ig && (
                <a className="lp-ig" href={`https://instagram.com/${igHandle(p.ig)}`} target="_blank" rel="noreferrer">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
                  </svg>
                  @{igHandle(p.ig)}
                </a>
              )}
            </Reveal>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ Reel 04: schedule, tickets, countdown */

const MONTH_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const MONTHS_ID = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];

/** "20 · XI · 26" from an event's own "Jumat, 20 November 2026" date, falling back to the wedding date. */
function stubDate(eventDate: string, weddingIso: string) {
  const m = /(\d{1,2})\s+(\p{L}+)\s+(\d{4})/u.exec(eventDate);
  const month = m ? MONTHS_ID.indexOf(m[2].toLowerCase()) : -1;
  if (m && month >= 0) return `${m[1].padStart(2, '0')} · ${MONTH_ROMAN[month]} · ${m[3].slice(-2)}`;
  const d = dateParts(weddingIso);
  return `${d.day} · ${MONTH_ROMAN[Number(d.month) - 1]} · ${d.year.slice(-2)}`;
}

const Tickets: React.FC = () => {
  const { invitation, guest } = useInvitation();
  const admit = guest ? `${guest.pax} kursi` : 'Undangan';
  return (
    <div className="lp-tickets">
      {invitation.events.map((e, i) => (
        <Reveal key={e.id} className="lp-ticket" delay={i * 0.08}>
          <div className="lp-ticket-main">
            <p className="lp-ticket-top">
              <span className="lp-mono lp-muted">Tiket {pad2(i + 1)}</span>
              <span className="lp-mono lp-gold">{admit}</span>
            </p>
            <h3 className="lp-ticket-title">{e.title}</h3>
            <ul className="lp-ticket-details">
              <li>
                <Clock3 size={16} aria-hidden="true" />
                <span>
                  {timeRange(e)}
                  {e.date && <small>{e.date}</small>}
                </span>
              </li>
              {guest ? (
                <li>
                  <MapPin size={16} aria-hidden="true" />
                  <span>
                    {e.venueName}
                    <small>{e.address}</small>
                  </span>
                </li>
              ) : (
                <li>
                  <Lock size={16} aria-hidden="true" />
                  <span className="lp-locked">Lokasi dibuka dengan kode undangan</span>
                </li>
              )}
              {e.dressCode && (
                <li>
                  <Shirt size={16} aria-hidden="true" />
                  <span>Busana: {e.dressCode}</span>
                </li>
              )}
              {e.notes && <li className="lp-ticket-note">{e.notes}</li>}
            </ul>
            {guest ? (
              e.mapsUrl && (
                <a className="lp-link" href={e.mapsUrl} target="_blank" rel="noreferrer">
                  Petunjuk arah <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              )
            ) : (
              <a className="lp-link" href="#buka-undangan">
                <KeyRound size={15} aria-hidden="true" /> Masukkan kode undangan
              </a>
            )}
          </div>
          <div className="lp-perf" aria-hidden="true" />
          <div className="lp-ticket-stub" aria-hidden="true">
            <p className="lp-mono lp-muted">Kursi</p>
            <p className="lp-stub-seat">
              {String.fromCharCode(65 + (i % 26))}
              {i + 1}
            </p>
            <p className="lp-mono lp-ink lp-stub-date">{stubDate(e.date, invitation.weddingDate)}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
};

const Countdown: React.FC = () => {
  const { invitation } = useInvitation();
  const left = useCountdown(invitation.countdownTarget || invitation.weddingDate);
  const units: [number, string][] = [
    [left.days, 'Hari'],
    [left.hours, 'Jam'],
    [left.minutes, 'Menit'],
    [left.seconds, 'Detik'],
  ];
  return (
    <div className="lp-count">
      <div className="lp-leader" aria-hidden="true">
        <span className="lp-leader-sweep" />
        <span className="lp-leader-ring" />
        <span className="lp-leader-ring is-inner" />
        <span className="lp-leader-cross" />
        <b>{left.isPast ? '★' : left.seconds % 10}</b>
      </div>
      <div className="lp-count-body">
        <p className="lp-mono lp-gold">{left.isPast ? 'Sedang tayang' : 'Tayang perdana dalam'}</p>
        <p className="lp-sr" role="timer">
          {left.isPast ? 'Acara sedang berlangsung.' : `${left.days} hari ${left.hours} jam ${left.minutes} menit lagi`}
        </p>
        <div className="lp-count-row" aria-hidden="true">
          {units.map(([v, l]) => (
            <span key={l}>
              <b>{pad2(v)}</b>
              <small className="lp-mono lp-muted">{l}</small>
            </span>
          ))}
        </div>
        <a className="lp-pill" href={googleCalendarUrl(invitation)} target="_blank" rel="noreferrer">
          <CalendarPlus size={16} aria-hidden="true" /> Simpan ke kalender
        </a>
      </div>
    </div>
  );
};

const Schedule: React.FC = () => {
  const { invitation } = useInvitation();
  const d = dateParts(invitation.weddingDate);
  return (
    <section id="acara" className="lp-sec lp-band" aria-labelledby="acara-title">
      <div className="lp-wrap">
        <div className="lp-date-row">
          <div>
            <Kicker reel={4}>Jadwal tayang</Kicker>
            <h2 id="acara-title" className="lp-h2 lp-h2-md">
              Catat tanggal tayang perdananya.
            </h2>
          </div>
          <p className="lp-bigdate">
            <span className="lp-bigdate-day">{Number(d.day)}</span>
            <span className="lp-bigdate-side">
              <em>{d.monthName}</em>
              <span className="lp-mono lp-ink">
                {d.weekday} · {d.year}
              </span>
            </span>
          </p>
        </div>
        <Tickets />
        <Countdown />
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ Reel 05: gallery */

const Gallery: React.FC = () => {
  const { invitation, names } = useInvitation();
  const items = invitation.gallery;
  const [sheet, setSheet] = useState(false);
  const [scene, setScene] = useState<number | null>(null);
  if (!items.length) return null;
  const shots = items.slice(0, 4);
  const note = items.find((p) => p.caption)?.caption;
  const shot = (i: number) => {
    const p = shots[i];
    if (!p) return null;
    return (
      <Reveal className={`lp-shot lp-shot-${i + 1}`} delay={i * 0.06}>
        <button type="button" className="lp-shot-btn" onClick={() => setScene(i)} aria-label={`Buka adegan: ${p.title}`}>
          {p.mediaType === 'VIDEO' ? (
            <>
              <video src={`${p.url}#t=0.1`} poster={p.thumbnailUrl} muted playsInline preload="metadata" />
              <span className="lp-video-badge" aria-hidden="true">
                ▶ Video
              </span>
            </>
          ) : (
            <img src={p.url} alt="" loading="lazy" referrerPolicy="no-referrer" />
          )}
        </button>
        <p className="lp-shot-meta" aria-hidden="true">
          <span className="lp-mono lp-muted">SC.{pad2(i + 1)}</span>
          <span className="lp-mono lp-gold">{frameCode(i)}</span>
        </p>
      </Reveal>
    );
  };
  return (
    <section id="galeri" className="lp-sec" aria-labelledby="galeri-title">
      <div className="lp-wrap">
        <div className="lp-gal-head">
          <div>
            <Kicker reel={5}>Potongan adegan</Kicker>
            <h2 id="galeri-title" className="lp-h2 lp-h2-lg">
              Di balik layar.
            </h2>
          </div>
          <div className="lp-gal-aside">
            <p className="lp-body">Cuplikan dari perjalanan kami berdua, dipilih satu per satu untuk Anda.</p>
            <button type="button" className="lp-link" onClick={() => setSheet(true)}>
              Lihat {items.length} adegan <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="lp-contact">
          <div className="lp-col lp-col-1">{shot(0)}</div>
          <div className="lp-col lp-col-2">
            {shot(1)}
            {shot(2)}
          </div>
          <div className="lp-col lp-col-3">
            {shot(3)}
            {note && (
              <Reveal className="lp-gal-note">
                <p className="lp-gal-note-q">“{note}”</p>
                <p className="lp-mono lp-muted">Catatan sutradara</p>
              </Reveal>
            )}
          </div>
        </div>
        <div className="lp-center lp-show-md">
          <button type="button" className="lp-pill lp-pill-wide" onClick={() => setSheet(true)}>
            Lihat semua {items.length} adegan
          </button>
        </div>
      </div>
      <ContactSheet
        open={sheet && scene === null}
        items={items}
        owner={names}
        onClose={() => setSheet(false)}
        onOpenScene={(i) => setScene(i)}
      />
      <SceneViewer
        items={items}
        index={scene}
        onIndexChange={setScene}
        onBackToSheet={() => {
          setSheet(true);
          setScene(null);
        }}
      />
    </section>
  );
};

/* ------------------------------------------------------------------ Reel 06: RSVP & wishes */

const Wishes: React.FC = () => {
  const { wishes, isLoading, isError, refetch } = useGuestbook();
  const [limit, setLimit] = useState(6);
  return (
    <div className="lp-wishes">
      <div className="lp-wishes-head">
        <h3 className="lp-wishes-title">Ulasan para tamu</h3>
        <p className="lp-mono lp-gold">{wishes.length} ucapan</p>
      </div>
      {isLoading ? (
        <p className="lp-body lp-center">Memuat ucapan...</p>
      ) : isError ? (
        <p className="lp-body lp-center">
          Ucapan belum bisa dimuat.{' '}
          <button type="button" className="lp-link" onClick={refetch}>
            Coba lagi
          </button>
        </p>
      ) : !wishes.length ? (
        <p className="lp-body lp-center lp-empty">Belum ada ulasan. Jadilah penonton pertama yang menulis.</p>
      ) : (
        <>
          <ul className="lp-wish-grid">
            {wishes.slice(0, limit).map((w) => (
              <li key={w.id} className="lp-wish">
                <p className="lp-wish-msg">“{w.message}”</p>
                {w.voiceUrl && <audio src={w.voiceUrl} controls preload="none" aria-label={`Pesan suara dari ${w.guestName}`} />}
                <div>
                  <p className="lp-wish-name">{w.guestName}</p>
                  {w.relationship && <p className="lp-mono lp-muted">{w.relationship}</p>}
                </div>
                {w.reply && (
                  <div className="lp-reply">
                    <p className="lp-mono lp-gold">Balasan mempelai</p>
                    <p>{w.reply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {wishes.length > limit && (
            <div className="lp-center">
              <button type="button" className="lp-pill" onClick={() => setLimit((n) => n + 6)}>
                Muat ulasan lainnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Rsvp: React.FC = () => {
  const { invitation } = useInvitation();
  const { stats: liveStats } = useGuestbook();
  const stats = liveStats || invitation.stats;
  return (
    <section id="rsvp" className="lp-sec lp-band" aria-labelledby="rsvp-title">
      <div className="lp-wrap">
        <div className="lp-rsvp-row">
          <div className="lp-rsvp-intro">
            <Kicker reel={6}>Reservasi kursi</Kicker>
            <h2 id="rsvp-title" className="lp-h2">
              Kursi terbaik sudah kami siapkan untuk Anda.
            </h2>
            <p className="lp-body lp-lead">
              Mohon konfirmasi kehadiran agar kami dapat menyiapkan tempat duduk dan jamuan dengan sebaik-baiknya.
            </p>
            {stats && (
              <dl className="lp-stats">
                <div>
                  <dt className="lp-mono lp-muted">Kursi terisi</dt>
                  <dd>{stats.totalGuestSeats}</dd>
                </div>
                <div>
                  <dt className="lp-mono lp-muted">Ucapan masuk</dt>
                  <dd>{stats.totalWishes}</dd>
                </div>
              </dl>
            )}
          </div>
          <div className="lp-rsvp-card">
            <TemplateRsvp prefix="lp" submitLabel="Kirim reservasi" confettiColors={['#A8844C', '#2B251F', '#FAF6EF']} />
          </div>
        </div>
        <Wishes />
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ Reel 07: gifts */

const Gifts: React.FC = () => {
  const { invitation, guest } = useInvitation();
  const { copy, copied, failed } = useCopy();
  const [qr, setQr] = useState<GiftAccount | null>(null);
  if (!guest || !invitation.giftInfo.length) return null;
  return (
    <section className="lp-sec" aria-labelledby="kasih-title">
      <div className="lp-wrap lp-gift-row">
        <div className="lp-gift-intro">
          <Kicker reel={7}>Tanda kasih</Kicker>
          <h2 id="kasih-title" className="lp-h2 lp-h2-md">
            Doa restu Anda adalah hadiah terindah.
          </h2>
          <p className="lp-body">Namun bila ingin memberikan tanda kasih, kami menyediakan amplop digital berikut.</p>
        </div>
        <div className="lp-gift-list">
          {invitation.giftInfo.map((g) => (
            <div key={g.id} className="lp-gift">
              <p className="lp-mono lp-gold lp-gift-bank">{g.bankName}</p>
              <div className="lp-gift-num">
                <p className="lp-gift-val">{g.accountNumber || 'Pindai kode QR'}</p>
                <p className="lp-body">a.n. {g.accountHolder}</p>
              </div>
              <div className="lp-gift-actions">
                {g.accountNumber && (
                  <button type="button" className="lp-pill lp-pill-sm" onClick={() => copy(g.accountNumber.replace(/\s/g, ''), g.id)}>
                    {copied === g.id ? 'Tersalin' : 'Salin'}
                  </button>
                )}
                {g.qrisImageUrl && (
                  <button type="button" className="lp-pill lp-pill-sm" onClick={() => setQr(g)}>
                    <QrCode size={14} aria-hidden="true" /> Tampilkan QR
                  </button>
                )}
              </div>
            </div>
          ))}
          <p role="status" className="lp-error-text">
            {failed ? 'Peramban menolak menyalin otomatis. Salin nomornya secara manual.' : ''}
          </p>
        </div>
      </div>
      <GiftQrDialog gift={qr} onClose={() => setQr(null)} />
    </section>
  );
};

/* ------------------------------------------------------------------ Bonus reel: guest camera */

const GuestCamera: React.FC = () => {
  const { photoMomentsHref } = useInvitation();
  if (!photoMomentsHref) return null;
  return (
    <section className="lp-sec lp-sec-tight" aria-labelledby="kamera-title">
      <Reveal className="lp-wrap">
        <div className="lp-camera">
          <div className="lp-camera-top">
            <p className="lp-mono">Reel bonus — Kamera tamu</p>
            <span className="lp-lcd" aria-hidden="true">
              27 exp
            </span>
          </div>
          <h2 id="kamera-title" className="lp-camera-title">
            Di hari H, Anda ikut menjadi juru kamera.
          </h2>
          <p className="lp-camera-body">
            Kamera sekali pakai ada di ponsel Anda, lengkap dengan look film. Setiap jepretan langsung masuk ke galeri bersama.
          </p>
          <a className="lp-btn lp-btn-light" href={photoMomentsHref}>
            <Camera size={16} aria-hidden="true" /> Buka kamera tamu
          </a>
        </div>
      </Reveal>
    </section>
  );
};

/* ------------------------------------------------------------------ Reel 08: credits */

const Credits: React.FC = () => {
  const { invitation: inv, displayName, isAdmin } = useInvitation();
  const mono = useMonogram();
  const d = dateParts(inv.weddingDate);
  // "Putra pertama dari Bpk. A & Ibu B" -> ["Bpk. A", "Ibu B"]
  const split = (s: string) =>
    s
      .replace(/^\s*(putra|putri)\b.*?\bdari\s+/i, '')
      .split(/\s+&\s+|\n/)
      .map((x) => x.trim())
      .filter(Boolean);
  const rows: [string, string[]][] = [
    ['Orang tua mempelai pria', split(inv.groomParents)],
    ['Orang tua mempelai wanita', split(inv.brideParents)],
    ...(inv.musicTitle ? ([['Musik pengiring', [inv.musicTitle]]] as [string, string[]][]) : []),
  ];
  const tag = `#${inv.groomShortName}${inv.brideShortName}Reel`.replace(/\s/g, '');
  return (
    <footer className="lp-sec lp-credits" aria-labelledby="penutup-title">
      <div className="lp-wrap lp-center">
        <Kicker reel={8}>Penutup</Kicker>
        <h2 id="penutup-title" className="lp-thanks">
          Terima kasih
        </h2>
        <p className="lp-body lp-lead lp-mx">
          Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.
        </p>

        <div className="lp-roll-credits">
          <p className="lp-mono lp-muted">Dibintangi oleh</p>
          <p className="lp-star">{inv.groomName}</p>
          <p className="lp-star-amp" aria-hidden="true">
            &amp;
          </p>
          <p className="lp-star">{inv.brideName}</p>
          <dl className="lp-credit-list">
            {rows.map(([role, people]) => (
              <div key={role}>
                <dt className="lp-mono lp-muted">{role}</dt>
                <dd>
                  {people.map((p) => (
                    <span key={p}>{p}</span>
                  ))}
                </dd>
              </div>
            ))}
            <div className="is-honor">
              <dt className="lp-mono lp-muted">Tamu kehormatan</dt>
              <dd>{displayName}</dd>
            </div>
          </dl>
        </div>

        <p className="lp-end">Tamat.</p>
        <p className="lp-mono lp-ink">…dan kisah ini berlanjut, selamanya</p>
        {isAdmin && (
          <a className="lp-link lp-admin" href="/cms/overview">
            <Settings2 size={15} aria-hidden="true" /> Kelola undangan di CMS
          </a>
        )}
      </div>
      <div className="lp-wrap lp-foot">
        <p className="lp-mark">{mono}</p>
        <p className="lp-mono lp-muted">
          {tag} · {d.day}.{d.month}.{d.year}
        </p>
        <button type="button" className="lp-pill lp-pill-sm" onClick={() => scrollToId('mulai')}>
          <RotateCcw size={14} aria-hidden="true" /> Putar ulang
        </button>
      </div>
    </footer>
  );
};

/** "Layar Perak": an ivory-and-gold cinema program. The opening title is also the cover. */
const LayarTemplate: React.FC = () => {
  const { isOpen } = useInvitation();
  useTemplateFonts(FONTS);
  return (
    <div className="lp">
      <Hero />
      {isOpen && (
        <>
          <main>
            <Story />
            <Cast />
            <Schedule />
            <Gallery />
            <Rsvp />
            <Gifts />
            <GuestCamera />
          </main>
          <Credits />
          <Dock />
        </>
      )}
    </div>
  );
};

export default LayarTemplate;
