import React, { useEffect, useRef, useState } from 'react';
import { CalendarPlus, Camera, Check, Lock, MapPin, Pause, Play, QrCode, X } from 'lucide-react';
import { useInvitation } from '../../InvitationContext.js';
import { useGuestbook } from '../../hooks/useGuestbook.js';
import { useCountdown } from '../../../../hooks/useCountdown.js';
import { useCopy } from '../../../../hooks/useCopy.js';
import { useActiveSection } from '../../../../hooks/useActiveSection.js';
import { dateParts, formatDateTime, initials } from '../../../../lib/format.js';
import { googleCalendarUrl } from '../../../../lib/calendar.js';
import { Reveal } from '../../../../components/ui/Reveal.js';
import { GalleryLightbox } from '../../../../components/wedding/GalleryLightbox.js';
import { GiftQrDialog, timeRange, useTemplateFonts, usePhotoPool } from '../shared/kit.js';
import { TemplateRsvp } from '../shared/TemplateRsvp.js';
import { LayarCover } from './LayarCover.js';
import { LayarHero } from './LayarHero.js';
import { FallingFlowers } from './FallingFlowers.js';
import type { GiftAccount } from '@shared/types';
import swagTop from './assets/swag-top.webp';
import cornerTl from './assets/corner-tl.webp';
import swagBottom from './assets/swag-bottom.webp';
import cornerLeft from './assets/corner-left.webp';
import cornerBr from './assets/corner-br.webp';
import sprigB from './assets/sprig-b.webp';
import rings from './assets/rings.webp';
import garland from './assets/garland.webp';
import divider from './assets/divider.webp';
import filmRibbon from './assets/film-ribbon.webp';
import './layar.css';

const FONTS =
  'family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Great+Vibes&family=Playfair+Display:wght@400;500';

const NAV = [
  { id: 'top', label: 'Home' },
  { id: 'kisah', label: 'Kisah Kami' },
  { id: 'acara', label: 'Acara' },
  { id: 'galeri', label: 'Galeri' },
  { id: 'rsvp', label: 'RSVP' },
];

const pad2 = (n: number) => String(n).padStart(2, '0');
const igHandle = (ig: string) => ig.replace('@', '').trim();
const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/** "Putra pertama dari Bpk. A & Ibu B" -> ["Putra pertama dari", "Bpk. A & Ibu B"]. */
function splitParents(text: string): [string, string] {
  const m = /^\s*((?:putra|putri)\b[^\n]*?\bdari)\s+([\s\S]+)$/i.exec(text);
  return m ? [m[1].trim(), m[2].trim()] : ['', text];
}

/** The last part of an address ("Jl. Sudirman 1, Jakarta Selatan" -> "Jakarta Selatan"); empty until a guest unlocks it. */
const cityOf = (address: string) => address.split(',').map((s) => s.trim()).filter(Boolean).pop() || '';

const Ornament: React.FC<{ className?: string }> = ({ className = '' }) => <img className={`lp-ornament ${className}`} data-anim="draw-x" src={divider} alt="" aria-hidden="true" loading="lazy" />;

/** Writes how far a section has travelled through the viewport (0..1) as `--p` on it. `through` = the section is taller than the screen (sticky stage). */
function useScrollProgress(ref: React.RefObject<HTMLElement | null>, sticky = false) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = sticky ? -r.top / Math.max(1, r.height - vh) : (vh - r.top) / (vh + r.height);
      el.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(4));
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
  }, [ref, sticky]);
}

/** Adds `is-in` to every `[data-anim]` inside the page while it is on screen, and removes it when it leaves (also for ones that mount later). */
function useScrollAnimations(ref: React.RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // In when it is properly on screen, back to its starting state once fully off screen, so it plays again on the next pass.
          if (e.intersectionRatio >= 0.18) e.target.classList.add('is-in');
          else if (!e.isIntersecting) e.target.classList.remove('is-in');
        }
      },
      { threshold: [0, 0.18], rootMargin: '0px 0px -6% 0px' },
    );
    const seen = new WeakSet<Element>();
    const scan = () =>
      root.querySelectorAll('[data-anim]').forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el);
          io.observe(el);
        }
      });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [ref, enabled]);
}

/* ------------------------------------------------------------------ Nav */

const Nav: React.FC = () => {
  const { invitation, music, guest, showPass, photoMomentsHref } = useInvitation();
  const active = useActiveSection(NAV.slice(1).map((n) => n.id));
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const on = () => setStuck(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <nav className={`lp-nav ${stuck ? 'is-stuck' : ''}`} aria-label="Navigasi undangan">
      <a className="lp-brand" href="#top" onClick={(e) => (e.preventDefault(), scrollToId('top'))}>
        {invitation.groomShortName} <em>&amp;</em> {invitation.brideShortName}
      </a>
      <ul className="lp-nav-links">
        {NAV.map((n) => (
          <li key={n.id}>
            <a href={`#${n.id}`} aria-current={active === n.id ? 'true' : undefined} onClick={(e) => (e.preventDefault(), scrollToId(n.id))}>
              {n.label}
            </a>
          </li>
        ))}
      </ul>
      <div className="lp-nav-actions">
        {guest && (
          <button type="button" className="lp-nav-btn" onClick={() => showPass()} aria-label="Kartu tamu">
            <QrCode size={16} aria-hidden="true" /> <span className="lp-lbl">Kartu tamu</span>
          </button>
        )}
        {photoMomentsHref && (
          <a className="lp-nav-btn" href={photoMomentsHref} aria-label="Kamera">
            <Camera size={16} aria-hidden="true" /> <span className="lp-lbl">Kamera</span>
          </a>
        )}
        {music.available && (
          <button type="button" className="lp-music" onClick={music.toggle} aria-pressed={music.playing} aria-label={music.playing ? 'Jeda musik' : 'Putar musik'}>
            <span>{music.playing ? 'On' : 'Off'}</span>
            {music.playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          </button>
        )}
      </div>
    </nav>
  );
};

/* ------------------------------------------------------------------ Greeting & quote */

const Greeting: React.FC = () => (
  <section id="salam" className="lp-salam">
    <img className="lp-corner-tl" src={cornerTl} alt="" aria-hidden="true" />
    <div>
      <Ornament />
      <p className="lp-salam-title" data-anim="rise" style={{ '--d': '0.15s' } as React.CSSProperties}>
        Assalamu’alaikum Warahmatullahi Wabarakatuh
      </p>
      <p className="lp-salam-body" data-anim="rise" style={{ '--d': '0.35s' } as React.CSSProperties}>
        Dengan memohon rahmat dan ridho Allah SWT, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan berbagi kebahagiaan di hari pernikahan kami.
      </p>
    </div>
  </section>
);

const Quote: React.FC = () => {
  const { invitation: inv } = useInvitation();
  if (!inv.quoteText) return null;
  return (
    <section className="lp-quote">
      <div className="lp-quote-in">
        <span className="lp-vrule" data-anim="draw-y" aria-hidden="true" />
        <blockquote>
          <p data-anim="rise" style={{ '--d': '0.4s' } as React.CSSProperties}>
            “{inv.quoteText}”
          </p>
          {inv.quoteSource && (
            <footer data-anim="rise" style={{ '--d': '0.8s' } as React.CSSProperties}>
              {inv.quoteSource}
            </footer>
          )}
        </blockquote>
      </div>
      <img className="lp-quote-sprig" src={sprigB} alt="" aria-hidden="true" loading="lazy" />
    </section>
  );
};

/* ------------------------------------------------------------------ Film strip & story */

const FilmStrip: React.FC = () => {
  const { invitation: inv } = useInvitation();
  const photo = usePhotoPool(inv);
  const ref = useRef<HTMLElement>(null);
  useScrollProgress(ref);
  if (!photo(0)) return null;
  const frames = Array.from({ length: 10 }, (_, i) => photo(i));
  return (
    <section ref={ref} className="lp-filmwrap" aria-hidden="true">
      <div className="lp-film">
        <span className="lp-holes" />
        <div className="lp-film-track">
          {frames.map((src, i) => (
            <img key={i} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" />
          ))}
        </div>
        <span className="lp-holes" />
      </div>
    </section>
  );
};

const FALLBACK_STORY = [
  'Dua hati yang dipertemukan oleh takdir, melangkah bersama dalam doa dan harapan akan masa depan yang penuh berkah.',
  'Kini, dengan penuh syukur, kami melangkah ke jenjang yang lebih suci, dan berharap kehadiran serta doa restu Anda melengkapi kebahagiaan kami.',
];

const Story: React.FC = () => {
  const { invitation: inv } = useInvitation();
  const stories = inv.loveStories;
  return (
    <section id="kisah" className="lp-story" aria-label="Kisah kami">
      {stories.length ? (
        <ol className="lp-story-grid">
          {stories.map((s) => (
            <Reveal repeat as="li" key={s.id} className="lp-story-item">
              <p className="lp-story-year">{s.year}</p>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
            </Reveal>
          ))}
        </ol>
      ) : (
        <Reveal repeat className="lp-story-pair">
          <p>{FALLBACK_STORY[0]}</p>
          <span className="lp-vrule" data-anim="draw-y" aria-hidden="true" />
          <p>{FALLBACK_STORY[1]}</p>
        </Reveal>
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ Couple */

const Couple: React.FC = () => {
  const { invitation: inv } = useInvitation();
  const people = [
    { full: inv.groomName, parents: inv.groomParents, photo: inv.groomPhoto, ig: inv.groomInstagram, tilt: -2.5 },
    { full: inv.brideName, parents: inv.brideParents, photo: inv.bridePhoto, ig: inv.brideInstagram, tilt: 2.5 },
  ];
  return (
    <section className="lp-couple-sec" aria-labelledby="mempelai-title">
      <div className="lp-swag-head">
        <img className="lp-swag" data-anim="drop" src={swagTop} alt="" aria-hidden="true" loading="lazy" />
        <h2 id="mempelai-title" className="lp-h2" data-anim="track">
          Mempelai
        </h2>
        <Ornament />
      </div>
      <div className="lp-couple">
        {people.map((p, i) => {
          const [rel, parents] = splitParents(p.parents);
          return (
            <React.Fragment key={p.full}>
              {i === 1 && (
                <span className="lp-amp" data-anim="pop" aria-hidden="true">
                  &amp;
                </span>
              )}
              <Reveal repeat className="lp-person" delay={i * 0.1}>
                <div className="lp-photo-frame" data-anim="develop" style={{ transform: `rotate(${p.tilt}deg)` }}>
                  {p.photo && <img src={p.photo} alt={p.full} loading="lazy" referrerPolicy="no-referrer" />}
                </div>
                <h3 className="lp-person-name">{p.full}</h3>
                {rel && <p className="lp-person-rel">{rel}</p>}
                <p className="lp-person-parents">{parents}</p>
                {p.ig && (
                  <a className="lp-ig" href={`https://instagram.com/${igHandle(p.ig)}`} target="_blank" rel="noreferrer">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
                    </svg>
                    @{igHandle(p.ig)}
                  </a>
                )}
              </Reveal>
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ Countdown & events */

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
    <section className="lp-count" aria-label="Hitung mundur">
      <span className="lp-hrule" data-anim="draw-x" aria-hidden="true" />
      <div className="lp-count-row">
        <p className="lp-sr" role="timer">
          {left.isPast ? 'Acara sedang berlangsung.' : `${left.days} hari ${left.hours} jam ${left.minutes} menit lagi`}
        </p>
        {units.map(([v, l], i) => (
          <div key={l} className="lp-count-dial" data-anim="pop" style={{ '--d': `${i * 0.14}s` } as React.CSSProperties} aria-hidden="true">
            <b key={v} className="lp-tick">{pad2(v)}</b>
            <small>{l}</small>
          </div>
        ))}
      </div>
      <span className="lp-hrule" data-anim="draw-x" aria-hidden="true" />
    </section>
  );
};

const Events: React.FC = () => {
  const { invitation: inv, guest } = useInvitation();
  const d = dateParts(inv.weddingDate);
  return (
    <section id="acara" className="lp-events" aria-labelledby="acara-title">
      <h2 id="acara-title" className="lp-sr">
        Acara
      </h2>
      <div className="lp-events-row">
        <Reveal repeat className="lp-bigdate">
          <b data-anim="pop">{Number(d.day)}</b>
          <p>
            <span aria-hidden="true" />
            {d.monthName.toUpperCase()} {d.year}
          </p>
        </Reveal>
        {inv.events.map((e, i) => (
          <Reveal repeat key={e.id} className="lp-event" delay={i * 0.08}>
            <img className="lp-event-rings" data-anim="pop" src={rings} alt="" aria-hidden="true" loading="lazy" />
            <h3>{e.title}</h3>
            <p className="lp-event-time">Pukul {timeRange(e)}</p>
            {e.date && <p className="lp-event-date">{e.date}</p>}
            {guest ? (
              <p className="lp-event-venue">
                {e.venueName}
                {e.address && <small>{e.address}</small>}
              </p>
            ) : (
              <p className="lp-event-venue is-locked">
                <Lock size={14} aria-hidden="true" /> Lokasi dibuka dengan kode undangan
              </p>
            )}
            {e.dressCode && <p className="lp-event-note">Busana: {e.dressCode}</p>}
            {e.notes && <p className="lp-event-note">{e.notes}</p>}
          </Reveal>
        ))}
      </div>
      <div className="lp-center">
        <a className="lp-btn-pill" href={googleCalendarUrl(inv)} target="_blank" rel="noreferrer">
          <CalendarPlus size={16} aria-hidden="true" /> Simpan ke Google Calendar
        </a>
      </div>
    </section>
  );
};

const MapSection: React.FC = () => {
  const { invitation: inv, guest } = useInvitation();
  const event = inv.events.find((e) => e.mapsEmbedUrl) || inv.events[0];
  if (!event) return null;
  return (
    <section className="lp-map" aria-label="Lokasi acara">
      <div className="lp-map-box">
        {guest && event.mapsEmbedUrl ? (
          <iframe title={`Peta ${event.venueName}`} src={event.mapsEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        ) : (
          <span className="lp-map-ph">
            <MapPin size={34} aria-hidden="true" />
            {guest ? event.venueName : 'Peta dibuka dengan kode undangan'}
          </span>
        )}
      </div>
      {guest ? (
        event.mapsUrl && (
          <a className="lp-btn-pill" href={event.mapsUrl} target="_blank" rel="noreferrer">
            <MapPin size={16} aria-hidden="true" /> Buka Google Maps
          </a>
        )
      ) : (
        <a className="lp-btn-pill" href="#buka-undangan" onClick={(e) => (e.preventDefault(), scrollToId('rsvp'))}>
          Masukkan kode undangan
        </a>
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ Gallery */

const TILTS = [-3, 2.5, -1.5, 3.5, -2.5, 2, -3.5, 1.5];

const Gallery: React.FC = () => {
  const { invitation: inv } = useInvitation();
  const items = inv.gallery;
  const [open, setOpen] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  if (!items.length) return null;
  const shown = all ? items : items.slice(0, 8);
  return (
    <section id="galeri" className="lp-gallery" aria-labelledby="galeri-title">
      <img className="lp-garland" data-anim="pop" src={garland} alt="" aria-hidden="true" loading="lazy" />
      <h2 id="galeri-title" className="lp-h2" data-anim="track">
        Galeri
      </h2>
      <p className="lp-sub" data-anim="rise" style={{ '--d': '0.25s' } as React.CSSProperties}>Kenangan indah di hari yang istimewa</p>
      <ul className="lp-polaroids">
        {shown.map((p, i) => (
          <li key={p.id} data-anim="drop" style={{ '--d': `${(i % 4) * 0.12}s` } as React.CSSProperties}>
            <button type="button" className="lp-polaroid" style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg)` }} onClick={() => setOpen(i)} aria-label={`Buka foto: ${p.title}`}>
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
              <span className="lp-polaroid-cap">{p.title}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="lp-center">
        {items.length > 8 && !all ? (
          <button type="button" className="lp-btn-pill" onClick={() => setAll(true)}>
            Lihat Semua Foto ({items.length})
          </button>
        ) : (
          <button type="button" className="lp-btn-pill" onClick={() => setOpen(0)}>
            Putar Slideshow
          </button>
        )}
      </div>
      <GalleryLightbox items={items} index={open} onIndexChange={setOpen} />
    </section>
  );
};

/* ------------------------------------------------------------------ RSVP, gifts & wishes */

const Gifts: React.FC = () => {
  const { invitation: inv } = useInvitation();
  const { copy, copied, failed } = useCopy();
  const [qr, setQr] = useState<GiftAccount | null>(null);
  if (!inv.giftInfo.length) return null;
  return (
    <div className="lp-info-col">
      <h3 className="lp-card-title">Amplop Digital</h3>
      <p className="lp-card-hint">Doa restu Anda adalah hadiah terindah. Bila ingin berbagi tanda kasih:</p>
      {inv.giftInfo.map((g) => (
        <div key={g.id} className="lp-account" data-anim="rise">
          <p className="lp-account-bank">{g.bankName}</p>
          <p className="lp-account-num">{g.accountNumber || 'Pindai kode QR'}</p>
          <p className="lp-account-name">a.n. {g.accountHolder}</p>
          <div className="lp-account-actions">
            {g.accountNumber && (
              <button type="button" className="lp-btn-mini" onClick={() => copy(g.accountNumber.replace(/\s/g, ''), g.id)}>
                {copied === g.id ? 'Tersalin' : 'Salin'}
              </button>
            )}
            {g.qrisImageUrl && (
              <button type="button" className="lp-btn-mini" onClick={() => setQr(g)}>
                <QrCode size={13} aria-hidden="true" /> QR
              </button>
            )}
          </div>
        </div>
      ))}
      <p role="status" className="lp-error">
        {failed ? 'Peramban menolak menyalin otomatis. Salin nomornya secara manual.' : ''}
      </p>
      <GiftQrDialog gift={qr} onClose={() => setQr(null)} />
    </div>
  );
};

const Rsvp: React.FC = () => {
  const { guest, invitation: inv } = useInvitation();
  return (
    <section id="rsvp" className="lp-rsvp" aria-labelledby="rsvp-title">
      {guest && inv.giftInfo.length > 0 && (
        <div className="lp-info-card" data-anim="rise">
          <Gifts />
        </div>
      )}
      <div className="lp-rsvp-card" data-anim="rise">
        <h2 id="rsvp-title" className="lp-card-main" data-anim="track">
          {guest ? 'Konfirmasi Kehadiran' : 'Buka Undangan'}
        </h2>
        <Ornament />
        <TemplateRsvp prefix="lp" submitLabel="Kirim RSVP" confettiColors={['#A8835A', '#3B2E25', '#F4EBDF']} />
      </div>
    </section>
  );
};

const STATUS: Record<string, { label: string; ok: boolean }> = {
  HADIR: { label: 'Hadir', ok: true },
  TIDAK_HADIR: { label: 'Tidak Hadir', ok: false },
  RAGU: { label: 'Masih ragu', ok: false },
};

const Wishes: React.FC = () => {
  const { invitation: inv } = useInvitation();
  const { wishes, isLoading, isError, refetch } = useGuestbook();
  const [limit, setLimit] = useState(5);
  const mono = `${inv.groomShortName.charAt(0)}&${inv.brideShortName.charAt(0)}`.toUpperCase();
  return (
    <section className="lp-wishes" aria-labelledby="ucapan-title">
      <h2 id="ucapan-title" className="lp-h2 lp-h2-sm" data-anim="track">
        Buku Tamu
      </h2>
      <p className="lp-sub" data-anim="rise" style={{ '--d': '0.25s' } as React.CSSProperties}>{wishes.length ? `${wishes.length} ucapan & doa` : 'Ucapan & doa dari para tamu'}</p>
      {isLoading ? (
        <p className="lp-muted-center">Memuat ucapan…</p>
      ) : isError ? (
        <p className="lp-muted-center">
          Ucapan belum bisa dimuat.{' '}
          <button type="button" className="lp-textlink" onClick={refetch}>
            Coba lagi
          </button>
        </p>
      ) : !wishes.length ? (
        <p className="lp-muted-center">Belum ada ucapan. Jadilah yang pertama menulis.</p>
      ) : (
        <>
          <ul className="lp-feed">
            {wishes.slice(0, limit).map((w, i) => {
              const st = STATUS[w.attendanceStatus] ?? STATUS.RAGU;
              return (
                <li key={w.id} className="lp-wish" data-anim="rise" style={{ '--d': `${(i % 5) * 0.08}s` } as React.CSSProperties}>
                  <span className="lp-avatar" aria-hidden="true">
                    {initials(w.guestName)}
                  </span>
                  <div className="lp-wish-body">
                    <p className="lp-wish-head">
                      <b>{w.guestName}</b>
                      <span className={`lp-status ${st.ok ? 'is-yes' : ''}`}>
                        {st.ok ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
                        {st.label}
                        {st.ok && w.numberOfGuests > 0 ? ` · ${w.numberOfGuests} kursi` : ''}
                      </span>
                      <time dateTime={w.createdAt}>{formatDateTime(w.createdAt)}</time>
                    </p>
                    {w.message && <p className="lp-wish-msg">{w.message}</p>}
                    {w.voiceUrl && <audio src={w.voiceUrl} controls preload="none" aria-label={`Pesan suara dari ${w.guestName}`} />}
                    {w.reply && (
                      <div className="lp-reply">
                        <span className="lp-reply-mono" aria-hidden="true">
                          {mono}
                        </span>
                        <p>
                          <small>Balasan mempelai</small>
                          {w.reply}
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {wishes.length > limit && (
            <div className="lp-center">
              <button type="button" className="lp-btn-pill" onClick={() => setLimit((n) => n + 5)}>
                Lihat {wishes.length - limit} ucapan lainnya
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ Credits */

/** Closing credits on cream paper: the lines rise one after another when the footer comes into view. */
const Credits: React.FC = () => {
  const { invitation: inv, displayName, guest } = useInvitation();
  const people = (s: string) =>
    s
      .replace(/^\s*(putra|putri)\b.*?\bdari\s+/i, '')
      .split(/\s+&\s+|\n/)
      .map((x) => x.trim())
      .filter(Boolean);
  const venues = guest ? [...new Set(inv.events.map((e) => e.venueName).filter(Boolean))] : [];
  const rows: [string, string[]][] = [
    ['Dibintangi oleh', [inv.groomName, inv.brideName]],
    ['Orang tua mempelai pria', people(inv.groomParents)],
    ['Orang tua mempelai wanita', people(inv.brideParents)],
    ...(venues.length ? ([['Lokasi', venues]] as [string, string[]][]) : []),
    ...(inv.musicTitle ? ([['Musik pengiring', [inv.musicTitle]]] as [string, string[]][]) : []),
    ['Tamu kehormatan', [displayName]],
  ];
  const step = (i: number) => ({ '--d': `${i * 0.28}s` }) as React.CSSProperties;
  return (
    <footer className="lp-footer" aria-label="Penutup">
      <img className="lp-corner-bl" src={cornerLeft} alt="" aria-hidden="true" loading="lazy" />
      <img className="lp-corner-br" src={cornerBr} alt="" aria-hidden="true" loading="lazy" />
      <img className="lp-swag-bottom" data-anim="drop" src={swagBottom} alt="" aria-hidden="true" loading="lazy" />
      <div className="lp-footer-in" data-anim="stage">
        {rows.map(([role, names], i) => (
          <div key={role} className="lp-credit lp-rollrow" style={step(i)}>
            <p className="lp-credit-role">{role}</p>
            {names.map((n) => (
              <p key={n} className="lp-credit-name">
                {n}
              </p>
            ))}
          </div>
        ))}
        <p className="lp-thanks lp-rollrow lp-write" style={step(rows.length)}>
          Terima Kasih
        </p>
        <p className="lp-farewell lp-rollrow" style={step(rows.length + 1)}>
          Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.
        </p>
        <p className="lp-sign lp-rollrow" style={step(rows.length + 2)}>
          {inv.groomShortName} &amp; {inv.brideShortName}
        </p>
      </div>
    </footer>
  );
};

/** "Layar Perak": a warm paper invitation that opens from a sealed envelope, with orchids falling as it opens. */
const LayarTemplate: React.FC = () => {
  const { isOpen } = useInvitation();
  const [shower, setShower] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useTemplateFonts(FONTS);
  useScrollAnimations(rootRef, isOpen);
  return (
    <div className="lp" ref={rootRef} style={{ '--ribbon': `url(${filmRibbon})` } as React.CSSProperties}>
      <LayarCover onOpened={() => setShower(true)} />
      {isOpen && (
        <>
          <Nav />
          <main>
            <LayarHero />
            <Greeting />
            <Quote />
            <FilmStrip />
            <Story />
            <Couple />
            <Countdown />
            <Events />
            <div className="lp-ribbon">
              <MapSection />
              <Gallery />
            </div>
            <Rsvp />
            <Wishes />
          </main>
          <Credits />
        </>
      )}
      <FallingFlowers run={shower} />
    </div>
  );
};

export default LayarTemplate;
