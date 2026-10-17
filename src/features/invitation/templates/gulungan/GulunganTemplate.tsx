import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useInvitation } from '../../InvitationContext.js';
import { useGuestbook } from '../../hooks/useGuestbook.js';
import { useCountdown } from '../../../../hooks/useCountdown.js';
import { useCopy } from '../../../../hooks/useCopy.js';
import { dateParts, formatLongDate } from '../../../../lib/format.js';
import { googleCalendarUrl } from '../../../../lib/calendar.js';
import { Reveal } from '../../../../components/ui/Reveal.js';
import { GalleryLightbox } from '../../../../components/wedding/GalleryLightbox.js';
import { GiftQrDialog, Glyph, romanNumeral, timeRange, useTemplateFonts, usePhotoPool, venuesOf } from '../shared/kit.js';
import { TemplateRsvp } from '../shared/TemplateRsvp.js';
import type { GiftAccount } from '@shared/types';
import './gulungan.css';

const FONTS = 'family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Pinyon+Script&family=VT323';

/** Film-edge print: the couple's initials where a film stock name would be. */
const useEdgeMark = () => {
  const { invitation } = useInvitation();
  return `${invitation.groomShortName.charAt(0)}&${invitation.brideShortName.charAt(0)} 400`.toUpperCase();
};

const Section: React.FC<{ id?: string; kicker: string; title: React.ReactNode; lead?: string; children?: React.ReactNode }> = ({
  id,
  kicker,
  title,
  lead,
  children,
}) => (
  <section id={id} className="gk-sec" aria-labelledby={id ? `${id}-title` : undefined}>
    <Reveal className="gk-wrap">
      <p className="gk-caps gk-muted gk-kicker">{kicker}</p>
      <h2 id={id ? `${id}-title` : undefined} className="gk-title gk-h2">
        {title}
      </h2>
      {lead && <p className="gk-lead">{lead}</p>}
    </Reveal>
    {children}
  </section>
);

/** Ticket-shaped cover. Opening it starts the music. */
const Opener: React.FC = () => {
  const { invitation, displayName, open } = useInvitation();
  const d = dateParts(invitation.weddingDate);
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Sampul undangan"
      className="gk-opener"
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
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

/** Names, a roller, and the love story printed on a strip of film. */
const Reel: React.FC = () => {
  const { invitation } = useInvitation();
  const photo = usePhotoPool(invitation);
  const mark = useEdgeMark();
  const d = dateParts(invitation.weddingDate);
  const frames = invitation.loveStories.flatMap((s, i) => [
    { key: `${s.id}-t`, text: s.title, note: s.year },
    { key: `${s.id}-p`, img: s.photoUrl || photo(i), stamp: `'${s.year.slice(-2)}` },
  ]);

  return (
    <header className="gk-reel">
      <div className="gk-head">
        <p className="gk-caps gk-muted">dengan cinta, dari</p>
        <h1 className="gk-head-names">
          <span className="gk-head-name">{invitation.groomShortName}</span>
          <span className="gk-head-name">{invitation.brideShortName}</span>
        </h1>
      </div>
      <div className="gk-rig">
        <div className="gk-roller" aria-hidden="true">
          <span className="gk-rod" />
          <span className="gk-roll" />
        </div>
        <div className="gk-film">
          <div className="gk-edge gk-edge-l" aria-hidden="true">
            <span>{mark}</span>
            <span>▸ 12</span>
            <span>{mark}</span>
          </div>
          <div className="gk-edge gk-edge-r" aria-hidden="true">
            <span>12A</span>
            <span>SAFETY FILM</span>
            <span>13A</span>
          </div>
          <ol className="gk-frames">
            {frames.map((f) => (
              <Reveal as="li" key={f.key} className="gk-frame">
                {'img' in f ? (
                  <>
                    <img className="gk-frame-img" src={f.img} alt="" loading="lazy" referrerPolicy="no-referrer" />
                    <span className="gk-stamp">{f.stamp}</span>
                  </>
                ) : (
                  <div className="gk-frame-txt">
                    <div>
                      <p className="gk-frame-serif">{f.text}</p>
                      <p className="gk-frame-note">{f.note}</p>
                    </div>
                  </div>
                )}
              </Reveal>
            ))}
            <li className="gk-frame">
              <div className="gk-frame-txt">
                <div>
                  <p className="gk-frame-serif">
                    {d.day} · {d.month} · {d.year}
                  </p>
                  <p className="gk-caps gk-frame-note">sampai jumpa</p>
                </div>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </header>
  );
};

const Invite: React.FC = () => {
  const { invitation, displayName } = useInvitation();
  return (
    <section className="gk-sec gk-invite">
      <Reveal className="gk-wrap">
        <p className="gk-quote">“{invitation.quoteText}”</p>
        <p className="gk-src">{invitation.quoteSource}</p>
        <div className="gk-rule" />
        <p className="gk-to">
          Untuk kamu,
          <span className="gk-to-name">{displayName}</span>
        </p>
        <p className="gk-caps gk-muted">dengan penuh syukur kami mengundang kamu</p>
        <p className="gk-h2 gk-invite-names">
          {invitation.groomShortName} &amp; {invitation.brideShortName}
        </p>
        <p className="gk-lead">untuk menyaksikan adegan paling penting dalam film kami: hari kami resmi menjadi satu keluarga.</p>
      </Reveal>
    </section>
  );
};

const Cast: React.FC = () => {
  const { invitation: inv } = useInvitation();
  const year = new Date(inv.weddingDate).getFullYear().toString().slice(-2);
  const people = [
    {
      short: inv.groomShortName,
      full: inv.groomName,
      parents: inv.groomParents,
      photo: inv.groomPhoto,
      ig: inv.groomInstagram,
      tilt: '-2deg',
    },
    {
      short: inv.brideShortName,
      full: inv.brideName,
      parents: inv.brideParents,
      photo: inv.bridePhoto,
      ig: inv.brideInstagram,
      tilt: '1.8deg',
    },
  ];
  return (
    <Section id="gk-cast" kicker="pemeran utama" title="Dua bintang">
      <div className="gk-wrap">
        <div className="gk-slides">
          {people.map((p, i) => (
            <Reveal key={p.full} className="gk-slide" delay={i * 0.1}>
              <div style={{ rotate: p.tilt }}>
                <div className="gk-slide-win">
                  <img className="gk-slide-img" src={p.photo} alt={p.full} loading="lazy" referrerPolicy="no-referrer" />
                </div>
                <p className="gk-slide-lbl">
                  <span>No. 0{i + 1}</span>
                  <span>'{year}</span>
                </p>
                <p className="gk-slide-name">{p.short}</p>
                <p className="gk-slide-full">{p.full}</p>
                <p className="gk-slide-par">{p.parents}</p>
                {p.ig && (
                  <a className="gk-slide-ig" href={`https://instagram.com/${p.ig.replace('@', '')}`} target="_blank" rel="noreferrer">
                    @{p.ig.replace('@', '')}
                  </a>
                )}
              </div>
            </Reveal>
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
            <Reveal as="li" key={e.id} className="gk-ticket">
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
            </Reveal>
          ))}
        </ol>
        <div className="gk-btns">
          <a className="gk-btn" href={googleCalendarUrl(invitation)} target="_blank" rel="noreferrer">
            Simpan tanggal
          </a>
        </div>
      </div>
    </Section>
  );
};

const Countdown: React.FC = () => {
  const { invitation } = useInvitation();
  const left = useCountdown(invitation.countdownTarget || invitation.weddingDate);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <Section kicker="hitung mundur" title={left.isPast ? 'Sedang tayang' : 'Segera tayang'}>
      <div className="gk-wrap" role="timer" aria-label={`${left.days} hari ${left.hours} jam ${left.minutes} menit lagi`}>
        <div className="gk-cdial" style={{ '--sec': `${left.seconds * 6}deg` } as React.CSSProperties} aria-hidden="true">
          <strong>{left.days}</strong>
          <span className="gk-cdial-label">hari lagi</span>
        </div>
        <div className="gk-units" aria-hidden="true">
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
            <Reveal key={v.id} className="gk-loc">
              <figure className="gk-polaroid" style={{ rotate: i % 2 ? '1.4deg' : '-1.5deg' }}>
                <div className="gk-polaroid-img">
                  <img className="gk-loc-img" src={photo(i + 2)} alt="" loading="lazy" referrerPolicy="no-referrer" />
                </div>
                <figcaption>{v.venueName}</figcaption>
              </figure>
              <p className="gk-loc-name">{v.venueName}</p>
              <p className="gk-loc-address">{v.address}</p>
              <div className="gk-btns">
                <a className="gk-btn" href={v.mapsUrl} target="_blank" rel="noreferrer">
                  Buka Google Maps
                </a>
              </div>
            </Reveal>
          ))
        ) : (
          <p className="gk-lead">
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
      <Reveal className="gk-contact">
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
        {items.length > 1 && <p className="gk-circled-note">yang dilingkari favorit kami ♡</p>}
      </Reveal>
      <GalleryLightbox items={items} index={open} onIndexChange={setOpen} />
    </Section>
  );
};

const Moments: React.FC = () => {
  const { photoMomentsHref } = useInvitation();
  if (!photoMomentsHref) return null;
  return (
    <Section kicker="di balik layar" title="Kamu sudah di lokasi" lead="Rekam suasananya dan kirim ke galeri tamu, hingga tiga foto.">
      <div className="gk-wrap gk-btns">
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
        <Reveal className="gk-gift">
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
                  <button type="button" className="gk-chip" onClick={() => copy(g.accountNumber.replace(/\s/g, ''), g.id)}>
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
        </Reveal>
        <p role="status" className="gk-status">
          {failed ? 'Peramban menolak menyalin otomatis. Salin nomornya secara manual, ya.' : ''}
        </p>
      </div>
      <GiftQrDialog gift={qr} onClose={() => setQr(null)} />
    </Section>
  );
};

const Wishes: React.FC = () => {
  const { wishes, isLoading } = useGuestbook();
  const [limit, setLimit] = useState(6);
  return (
    <div className="gk-wrap gk-wishes">
      <h3 className="gk-wishes-title">Ucapan dari yang lain</h3>
      {isLoading ? (
        <p className="gk-muted">Memuat ucapan...</p>
      ) : wishes.length === 0 ? (
        <p>Belum ada ucapan. Jadi yang pertama menulis, yuk!</p>
      ) : (
        <>
          <ul>
            {wishes.slice(0, limit).map((w) => (
              <li key={w.id} className="gk-wish">
                <p className="gk-wish-name">
                  {w.guestName} <span className="gk-ticket-caps">{w.relationship}</span>
                </p>
                <p className="gk-wish-msg">{w.message}</p>
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

const Credits: React.FC = () => {
  const { invitation: inv, isAdmin } = useInvitation();
  const venues = venuesOf(inv.events);
  const rows: [string, React.ReactNode][] = [
    [
      'pemeran utama',
      <>
        {inv.brideName}
        <br />
        {inv.groomName}
      </>,
    ],
    ['sutradara', 'Takdir'],
    [
      'produser',
      <>
        {inv.brideParents}
        <br />
        {inv.groomParents}
      </>,
    ],
    ...(venues[0] ? ([['lokasi', venues.map((v) => v.venueName).join(' & ')]] as [string, React.ReactNode][]) : []),
    ['pemeran pendukung', 'Kamu, dan semua yang kami sayangi'],
  ];
  return (
    <footer className="gk-credits gk-wrap">
      {rows.map(([k, v]) => (
        <div key={k} className="gk-credit">
          <p className="gk-caps gk-muted">{k}</p>
          <p className="gk-credit-v">{v}</p>
        </div>
      ))}
      <p className="gk-end">tamat.</p>
      <p className="gk-italic gk-muted">…atau justru baru dimulai.</p>
      {isAdmin && (
        <a className="gk-admin" href="/cms/overview">
          Kelola undangan di CMS
        </a>
      )}
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

/** "Gulungan Kenangan": the story told as a film reel, in a dim screening room. */
const GulunganTemplate: React.FC = () => {
  const { isOpen } = useInvitation();
  useTemplateFonts(FONTS);
  return (
    <div className="gk">
      <AnimatePresence>{!isOpen && <Opener />}</AnimatePresence>
      <div inert={!isOpen ? true : undefined}>
        <div className="gk-grain" aria-hidden="true" />
        <main className="gk-main">
          <Reel />
          <Invite />
          <Cast />
          <Schedule />
          <Countdown />
          <Location />
          <ContactSheet />
          <Moments />
          <Gifts />
          <Section id="gk-rsvp" kicker="rsvp & ucapan" title="Kamu datang, kan?">
            <div className="gk-wrap">
              <TemplateRsvp prefix="gk" submitLabel="Kirim" confettiColors={['#F3ECC9', '#C8453A', '#FF9A4A']} />
            </div>
            <Wishes />
          </Section>
        </main>
        <Credits />
        <Dock />
      </div>
    </div>
  );
};

export default GulunganTemplate;
