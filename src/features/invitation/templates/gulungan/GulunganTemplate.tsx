import React, { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useInvitation } from '../../InvitationContext.js';
import { useGuestbook } from '../../hooks/useGuestbook.js';
import { useCountdown } from '../../../../hooks/useCountdown.js';
import { useCopy } from '../../../../hooks/useCopy.js';
import { dateParts, formatLongDate } from '../../../../lib/format.js';
import { googleCalendarUrl } from '../../../../lib/calendar.js';
import { GalleryLightbox } from '../../../../components/wedding/GalleryLightbox.js';
import { GiftQrDialog, Glyph, romanNumeral, timeRange, useTemplateFonts, usePhotoPool, venuesOf } from '../shared/kit.js';
import { TemplateRsvp } from '../shared/TemplateRsvp.js';
import { Reel } from './Reel.js';
import { Screen } from './Screen.js';
import { useRevealOnScroll } from './useRevealOnScroll.js';
import type { GiftAccount } from '@shared/types';
import './gulungan.css';

const FONTS = 'family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Pinyon+Script&family=VT323';

/** Section opener: small caps kicker, script title, optional lead. Fades up as it scrolls in. */
const Section: React.FC<{
  id?: string;
  kicker: string;
  title: React.ReactNode;
  lead?: string;
  className?: string;
  children?: React.ReactNode;
}> = ({ id, kicker, title, lead, className = '', children }) => (
  <section id={id} className={`gk-sec ${className}`} aria-labelledby={id ? `${id}-title` : undefined}>
    <div className="gk-wrap">
      <p className="gk-caps gk-muted gk-kicker">{kicker}</p>
      <h2 id={id ? `${id}-title` : undefined} className="gk-script gk-title gk-rv">
        {title}
      </h2>
      {lead && <p className="gk-lead gk-rv">{lead}</p>}
    </div>
    {children}
  </section>
);

/** Ticket-shaped cover. The page waits behind it, held slightly smaller; opening starts the music. */
const Opener: React.FC = () => {
  const { invitation, displayName, open } = useInvitation();
  const d = dateParts(invitation.weddingDate);
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Sampul undangan"
      className="gk-opener"
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
    >
      <div className="gk-opener-inner">
        <p className="gk-caps gk-muted">pemutaran perdana</p>
        <p className="gk-opener-names">
          {invitation.groomShortName} <span>&amp;</span> {invitation.brideShortName}
        </p>
        <div className="gk-ticket gk-opener-ticket">
          <div className="gk-ticket-main">
            <p className="gk-ticket-caps">tiket masuk untuk</p>
            <p className="gk-ticket-title">{displayName}</p>
            <p className="gk-ticket-when">
              {d.day}.{d.month}.{d.year}
            </p>
          </div>
          <div className="gk-ticket-stub">
            <span className="gk-stub-small">kursi</span>
            <span className="gk-stub-num">VIP</span>
          </div>
        </div>
        <button type="button" className="gk-btn gk-btn-solid" onClick={open}>
          Putar filmnya
        </button>
      </div>
    </motion.div>
  );
};

const Invite: React.FC = () => {
  const { invitation, displayName } = useInvitation();
  return (
    <section className="gk-wrap gk-invite">
      <p className="gk-quote gk-rv">“{invitation.quoteText}”</p>
      <p className="gk-src gk-rv">{invitation.quoteSource}</p>
      <div className="gk-rule" aria-hidden="true" />
      <p className="gk-to gk-rv">
        Untuk kamu,
        <strong className="gk-to-name">{displayName}</strong>
      </p>
      <p className="gk-caps gk-muted gk-rv">dengan penuh syukur kami mengundang kamu</p>
      <h2 className="gk-script gk-invite-names gk-rv">
        {invitation.groomShortName} &amp; {invitation.brideShortName}
      </h2>
      <p className="gk-lead gk-rv">untuk menyaksikan adegan paling penting dalam film kami: hari kami resmi menjadi satu keluarga.</p>
    </section>
  );
};

const Cast: React.FC = () => {
  const { invitation: inv } = useInvitation();
  const year = new Date(inv.weddingDate).getFullYear().toString().slice(-2);
  const people = [
    { short: inv.groomShortName, full: inv.groomName, parents: inv.groomParents, photo: inv.groomPhoto, ig: inv.groomInstagram },
    { short: inv.brideShortName, full: inv.brideName, parents: inv.brideParents, photo: inv.bridePhoto, ig: inv.brideInstagram },
  ];
  return (
    <Section id="gk-cast" kicker="pemeran utama" title="Dua bintang">
      <div className="gk-wrap">
        <div className="gk-slides">
          {people.map((p, i) => (
            <article
              key={p.full}
              className="gk-slide gk-rv"
              style={{ '--t': i ? '2deg' : '-2deg', transitionDelay: `${i * 0.15}s` } as React.CSSProperties}
            >
              <div className="gk-slide-win">
                <img className="gk-slide-img" src={p.photo} alt={p.full} loading="lazy" referrerPolicy="no-referrer" />
              </div>
              <p className="gk-slide-lbl">
                <span>No. 0{i + 1}</span>
                <span>'{year}</span>
              </p>
              <h3 className="gk-slide-name">{p.short}</h3>
              <p className="gk-slide-full">{p.full}</p>
              <p className="gk-slide-par">{p.parents}</p>
              {p.ig && (
                <a className="gk-slide-ig" href={`https://instagram.com/${p.ig.replace('@', '')}`} target="_blank" rel="noreferrer">
                  @{p.ig.replace('@', '')}
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
};

const Schedule: React.FC = () => {
  const { invitation, guest } = useInvitation();
  return (
    <Section id="gk-schedule" kicker="jadwal tayang" title={formatLongDate(invitation.weddingDate)}>
      <div className="gk-wrap">
        <ol className="gk-tickets">
          {invitation.events.map((e, i) => (
            <li key={e.id} className="gk-ticket gk-rv" style={{ transitionDelay: `${i * 0.12}s` }}>
              <div className="gk-ticket-main">
                <p className="gk-ticket-caps">adegan {romanNumeral(i)}</p>
                <h3 className="gk-ticket-title">{e.title}</h3>
                <p className="gk-ticket-when">{timeRange(e)}</p>
                <p className="gk-ticket-where">
                  {e.date}
                  <br />
                  {guest ? e.venueName : 'Lokasi tampil setelah kode undangan dimasukkan'}
                  {e.notes ? ` · ${e.notes}` : ''}
                </p>
                {e.dressCode && <p className="gk-ticket-dress">Busana: {e.dressCode}</p>}
              </div>
              <div className="gk-ticket-stub">
                <span className="gk-stub-small">studio</span>
                <span className="gk-stub-num">{String(i + 1).padStart(2, '0')}</span>
              </div>
            </li>
          ))}
        </ol>
        <div className="gk-btns gk-rv">
          <a className="gk-btn" href={googleCalendarUrl(invitation)} target="_blank" rel="noreferrer">
            Simpan tanggal
          </a>
        </div>
      </div>
    </Section>
  );
};

/** A film-leader countdown: the sweep turns once a minute, the big number is days. */
const Countdown: React.FC = () => {
  const { invitation } = useInvitation();
  const left = useCountdown(invitation.countdownTarget || invitation.weddingDate);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <Section kicker="hitung mundur" title={left.isPast ? 'Sedang tayang' : 'Segera tayang'}>
      <div className="gk-wrap" role="timer" aria-label={`${left.days} hari ${left.hours} jam ${left.minutes} menit lagi`}>
        <div className="gk-cdial gk-rv" style={{ '--sec': `${left.seconds * 6}deg` } as React.CSSProperties} aria-hidden="true">
          <strong>{left.days}</strong>
          <span className="gk-cdial-label">hari lagi</span>
        </div>
        <div className="gk-units gk-rv" aria-hidden="true">
          {[
            [left.hours, 'jam'],
            [left.minutes, 'menit'],
            [left.seconds, 'detik'],
          ].map(([v, l]) => (
            <span key={l}>
              <b>{pad(Number(v))}</b>
              <span className="gk-unit-label">{l}</span>
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
};

const Location: React.FC = () => {
  const { invitation, guest } = useInvitation();
  const photo = usePhotoPool(invitation);
  const venues = venuesOf(invitation.events);
  return (
    <Section id="gk-location" kicker="lokasi syuting" title="Sampai ketemu di sini">
      <div className="gk-wrap">
        {guest ? (
          venues.map((v, i) => (
            <div key={v.id} className="gk-loc">
              <figure className="gk-polaroid gk-rv" style={{ rotate: i % 2 ? '1.4deg' : '-1.5deg' }}>
                <div className="gk-polaroid-img">
                  <img className="gk-loc-img" src={photo(i + 2)} alt="" loading="lazy" referrerPolicy="no-referrer" />
                </div>
                <figcaption>{v.venueName}</figcaption>
              </figure>
              <p className="gk-loc-name gk-rv">{v.venueName}</p>
              <p className="gk-loc-address gk-rv">{v.address}</p>
              <div className="gk-btns gk-rv">
                <a className="gk-btn" href={v.mapsUrl} target="_blank" rel="noreferrer">
                  Buka Google Maps
                </a>
              </div>
            </div>
          ))
        ) : (
          <p className="gk-lead gk-rv">
            Alamat lengkap kami bagikan ke tamu terdaftar. <a href="#gk-rsvp">Masukkan kode undanganmu</a> untuk membukanya.
          </p>
        )}
      </div>
    </Section>
  );
};

const ContactSheet: React.FC = () => {
  const { invitation } = useInvitation();
  const [open, setOpen] = useState<number | null>(null);
  const items = invitation.gallery;
  if (!items.length) return null;
  return (
    <Section id="gk-gallery" kicker="contact sheet" title="Potongan adegan">
      <div className="gk-contact gk-rv">
        <ul className="gk-sheet">
          {items.map((p, i) => (
            <li key={p.id} className="gk-cell">
              <button
                type="button"
                className={`gk-cell-pic ${i === 1 ? 'is-circled' : ''}`}
                onClick={() => setOpen(i)}
                aria-label={`Buka foto: ${p.title}`}
              >
                {p.mediaType === 'VIDEO' ? (
                  <video className="gk-cell-img" src={p.url} muted playsInline preload="metadata" />
                ) : (
                  <img className="gk-cell-img" src={p.url} alt="" loading="lazy" referrerPolicy="no-referrer" />
                )}
              </button>
              <span className="gk-cell-no" aria-hidden="true">
                {21 + i}
              </span>
            </li>
          ))}
        </ul>
        {items.length > 1 && <p className="gk-contact-note">yang dilingkari favorit kami ♡</p>}
      </div>
      <GalleryLightbox items={items} index={open} onIndexChange={setOpen} />
    </Section>
  );
};

const Moments: React.FC = () => {
  const { photoMomentsHref } = useInvitation();
  if (!photoMomentsHref) return null;
  return (
    <Section kicker="di balik layar" title="Kamera sekali pakai" lead="Pilih look film, jepret suasananya, dan kirim ke galeri tamu.">
      <div className="gk-wrap gk-btns gk-rv">
        <a className="gk-btn gk-btn-solid" href={photoMomentsHref}>
          Buka kamera tamu
        </a>
      </div>
    </Section>
  );
};

const Gifts: React.FC = () => {
  const { invitation, guest } = useInvitation();
  const { copy, copied, failed } = useCopy();
  const [qr, setQr] = useState<GiftAccount | null>(null);
  if (!guest || !invitation.giftInfo.length) return null;
  return (
    <Section
      id="gk-gifts"
      kicker="tanda kasih"
      title="Amplop digital"
      lead="Doa dan kehadiranmu sudah jadi hadiah terbaik. Kalau ingin mengirim tanda kasih, bisa lewat sini."
    >
      <div className="gk-wrap">
        <div className="gk-gift gk-rv">
          <div className="gk-gift-head">
            <span className="gk-caps">tanda kasih</span>
            <span className="gk-gift-iso">ISO 400</span>
          </div>
          {invitation.giftInfo.map((g) => (
            <div key={g.id} className="gk-gift-row">
              <div className="gk-gift-body">
                <p className="gk-ticket-caps">{g.bankName}</p>
                <p className="gk-gift-num">{g.accountNumber || 'QRIS'}</p>
                <p className="gk-gift-holder">a.n. {g.accountHolder}</p>
              </div>
              <div className="gk-gift-actions">
                {g.accountNumber && (
                  <button
                    type="button"
                    className={`gk-chip ${copied === g.id ? 'is-done' : ''}`}
                    onClick={() => copy(g.accountNumber.replace(/\s/g, ''), g.id)}
                  >
                    {copied === g.id ? 'Tersalin' : 'Salin'}
                  </button>
                )}
                {g.qrisImageUrl && (
                  <button type="button" className="gk-chip" onClick={() => setQr(g)}>
                    QR
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p role="status" className="gk-status">
          {failed ? 'Peramban menolak menyalin otomatis. Salin nomornya secara manual, ya.' : ''}
        </p>
      </div>
      <GiftQrDialog gift={qr} onClose={() => setQr(null)} />
    </Section>
  );
};

/** Wishes pinned up as small paper cards, each rising in as it arrives. */
const Wishes: React.FC = () => {
  const { wishes, isLoading } = useGuestbook();
  const [limit, setLimit] = useState(6);
  return (
    <div className="gk-wrap gk-wish-block">
      <h3 className="gk-wishes-title gk-rv">Ucapan dari yang lain</h3>
      {isLoading ? (
        <p className="gk-muted">Memuat ucapan...</p>
      ) : wishes.length === 0 ? (
        <p className="gk-rv">Belum ada ucapan. Jadi yang pertama menulis, yuk!</p>
      ) : (
        <>
          <ul className="gk-wishes">
            {wishes.slice(0, limit).map((w) => (
              <li key={w.id}>
                <b>{w.guestName}</b>
                <em>{w.relationship}</em>
                <p>{w.message}</p>
                {w.voiceUrl && (
                  <audio src={w.voiceUrl} controls preload="none" className="gk-audio" aria-label={`Pesan suara dari ${w.guestName}`} />
                )}
                {w.reply && <p className="gk-wish-reply">Balasan mempelai: {w.reply}</p>}
              </li>
            ))}
          </ul>
          {wishes.length > limit && (
            <div className="gk-btns">
              <button type="button" className="gk-btn" onClick={() => setLimit((n) => n + 6)}>
                Lihat lebih banyak
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/** End credits. With motion they roll up the screen once, like the end of a film. */
const Credits: React.FC = () => {
  const { invitation: inv, isAdmin } = useInvitation();
  const venues = venuesOf(inv.events);
  const rows: [string, string][] = [
    ['pemeran utama', `${inv.brideName}\n${inv.groomName}`],
    ['sutradara', 'Takdir'],
    ['produser', `${inv.brideParents}\n${inv.groomParents}`],
    ...(venues.length ? ([['lokasi', venues.map((v) => v.venueName).join('\n')]] as [string, string][]) : []),
    ['pemeran pendukung', 'Kamu, dan semua yang kami sayangi'],
  ];
  return (
    <footer className="gk-credits">
      <div className="gk-roll-up gk-wrap">
        {rows.map(([role, names]) => (
          <div key={role} className="gk-credit-row">
            <p className="gk-credit-role">{role}</p>
            <p className="gk-credit-names">{names}</p>
          </div>
        ))}
        <p className="gk-end">tamat.</p>
        <p className="gk-end-line">…atau justru baru dimulai.</p>
        {isAdmin && (
          <a className="gk-admin" href="/cms/overview">
            Kelola undangan di CMS
          </a>
        )}
      </div>
    </footer>
  );
};

const Dock: React.FC = () => {
  const { guest, music, showPass, photoMomentsHref } = useInvitation();
  return (
    <nav className="gk-dock" aria-label="Kontrol undangan">
      {music.available && (
        <button type="button" onClick={music.toggle} aria-pressed={music.playing} aria-label={music.playing ? 'Jeda musik' : 'Putar musik'}>
          <span className={music.playing ? 'gk-eq is-on' : 'gk-eq'} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>
      )}
      {guest && (
        <button type="button" onClick={() => showPass()} aria-label="Kartu tamu">
          <Glyph.Pass />
        </button>
      )}
      {photoMomentsHref && (
        <a href={photoMomentsHref} aria-label="Kamera tamu">
          <Glyph.Camera />
        </a>
      )}
    </nav>
  );
};

/**
 * "Gulungan Kenangan": the story told as a film reel in a dim screening room. Scrolling unrolls the
 * film, sections fade up as they enter, and the page closes on rolling end credits.
 * With prefers-reduced-motion everything is laid out still.
 */
const GulunganTemplate: React.FC = () => {
  const { isOpen } = useInvitation();
  const reduced = useReducedMotion();
  const animate = !reduced;
  const root = useRef<HTMLDivElement>(null);
  useTemplateFonts(FONTS);
  useRevealOnScroll(root, animate && isOpen);

  return (
    <div ref={root} className={`gk ${animate ? 'is-motion' : ''}`}>
      <AnimatePresence>{!isOpen && <Opener />}</AnimatePresence>
      <div className={`gk-stage-host ${isOpen ? '' : 'is-held'}`} inert={!isOpen ? true : undefined}>
        <div className="gk-bgfx" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="gk-grain" aria-hidden="true" />
        <main className="gk-main">
          <Screen motion={animate} />
          <Reel motion={animate} />
          <Invite />
          <Cast />
          <Schedule />
          <Countdown />
          <Location />
          <ContactSheet />
          <Moments />
          <Gifts />
          <Section id="gk-rsvp" kicker="rsvp & ucapan" title="Kamu datang, kan?" className="gk-rsvp">
            <div className="gk-wrap gk-rv">
              <TemplateRsvp prefix="gk" submitLabel="Kirim" confettiColors={['#F3ECC9', '#C8453A', '#FF9A4A']} />
            </div>
            <Wishes />
          </Section>
        </main>
        <Credits />
      </div>
      {/* Outside the held stage: a transformed ancestor would pin it to the page instead of the screen. */}
      {isOpen && <Dock />}
    </div>
  );
};

export default GulunganTemplate;
