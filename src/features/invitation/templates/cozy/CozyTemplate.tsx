import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useInvitation } from '../../InvitationContext.js';
import { useGuestbook } from '../../hooks/useGuestbook.js';
import { useCountdown } from '../../../../hooks/useCountdown.js';
import { useCopy } from '../../../../hooks/useCopy.js';
import { formatLongDate } from '../../../../lib/format.js';
import { googleCalendarUrl } from '../../../../lib/calendar.js';
import { useDialogBehaviour } from '../../../../components/ui/Modal.js';
import { GalleryLightbox } from '../../../../components/wedding/GalleryLightbox.js';
import { GiftQrDialog, Glyph, timeRange, useTemplateFonts } from '../shared/kit.js';
import { TemplateRsvp } from '../shared/TemplateRsvp.js';
import { CozyScene } from './CozyScene.js';
import type { GiftAccount } from '@shared/types';
import './cozy.css';

const FONTS = 'family=Nunito:ital,wght@0,600;0,700;0,800;0,900;1,700';

type PanelId = 'letter' | 'vows' | 'events' | 'rsvp' | 'gifts' | 'gallery';

const TABS: { id: PanelId; label: string; spot: [number, number] }[] = [
  { id: 'letter', label: 'Surat buat kamu', spot: [22, 58] },
  { id: 'vows', label: 'Janji suci', spot: [50, 42] },
  { id: 'events', label: 'Detail acara', spot: [80, 50] },
  { id: 'rsvp', label: 'Ucapan & RSVP', spot: [70, 70] },
  { id: 'gifts', label: 'Kado', spot: [88, 36] },
  { id: 'gallery', label: 'Galeri', spot: [30, 76] },
];

/** Wood-framed dialog. Escape, the close button or the backdrop closes it. */
const Panel: React.FC<{ kicker: string; title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }> = ({
  kicker,
  title,
  onClose,
  wide,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useDialogBehaviour(true, onClose, ref);
  return (
    <div className="ch-overlay" onClick={onClose}>
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ch-panel-title"
        className={`ch-panel ${wide ? 'wide' : ''}`}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ch-panel-head">
          <span className="ch-kicker">{kicker}</span>
          <button type="button" className="ch-close" onClick={onClose} aria-label="Tutup">
            ×
          </button>
        </div>
        <h2 id="ch-panel-title">{title}</h2>
        {children}
      </motion.div>
    </div>
  );
};

/** The letter types itself out, like a game dialogue box. A tap shows it all at once. */
const Letter: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { invitation, displayName, names } = useInvitation();
  const text = `Halo, ${displayName}! Kami, ${names}, akan menikah pada ${formatLongDate(invitation.weddingDate)}. Rumah kecil kami di tengah hutan ini terbuka untukmu. Datang, ya. Doamu adalah kado yang paling kami tunggu.`;
  const [shown, setShown] = useState(0);
  const done = shown >= text.length;
  const ref = useRef<HTMLDivElement>(null);
  useDialogBehaviour(true, onClose, ref);

  useEffect(() => {
    if (done || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(text.length);
      return;
    }
    const t = setTimeout(() => setShown((n) => n + 2), 28);
    return () => clearTimeout(t);
  }, [shown, done, text.length]);

  return (
    <div className="ch-talk" onClick={() => (done ? onClose() : setShown(text.length))}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Surat buat kamu" className="ch-talk-box" tabIndex={-1}>
        <span className="ch-talk-name">{names}</span>
        <p className="ch-talk-text" aria-live="off">
          {text.slice(0, shown)}
        </p>
        <span className="ch-sr">{text}</span>
        <p className="ch-talk-quote">
          “{invitation.quoteText}” <cite>{invitation.quoteSource}</cite>
        </p>
        <span className={`ch-talk-next ${done ? 'is-on' : ''}`} aria-hidden="true">
          ▼
        </span>
        <button type="button" className="ch-sr" onClick={onClose}>
          Tutup surat
        </button>
      </div>
    </div>
  );
};

const Vows: React.FC = () => {
  const { invitation: inv } = useInvitation();
  return (
    <>
      <div className="ch-couple">
        {[
          { short: inv.groomShortName, full: inv.groomName, parents: inv.groomParents, photo: inv.groomPhoto, ig: inv.groomInstagram },
          { short: inv.brideShortName, full: inv.brideName, parents: inv.brideParents, photo: inv.bridePhoto, ig: inv.brideInstagram },
        ].map((p) => (
          <figure key={p.full} className="ch-person">
            <img src={p.photo} alt={p.full} loading="lazy" referrerPolicy="no-referrer" />
            <figcaption>
              <strong>{p.full}</strong>
              <span>{p.parents}</span>
              {p.ig && (
                <a href={`https://instagram.com/${p.ig.replace('@', '')}`} target="_blank" rel="noreferrer">
                  @{p.ig.replace('@', '')}
                </a>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
      {inv.loveStories.length > 0 && (
        <ol className="ch-list">
          {inv.loveStories.map((s) => (
            <li key={s.id} className="ch-item">
              <span className="ch-time">{s.year}</span>
              <div>
                <strong>{s.title}</strong>
                <p>{s.description}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
};

const Events: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
  const { invitation, guest } = useInvitation();
  const left = useCountdown(invitation.countdownTarget || invitation.weddingDate);
  return (
    <>
      <div className="ch-count" role="timer" aria-label={`${left.days} hari ${left.hours} jam ${left.minutes} menit lagi`}>
        {[
          [left.days, 'hari'],
          [left.hours, 'jam'],
          [left.minutes, 'menit'],
          [left.seconds, 'detik'],
        ].map(([v, l]) => (
          <span key={l} aria-hidden="true">
            <b>{v}</b>
            {l}
          </span>
        ))}
      </div>
      <ol className="ch-list">
        {invitation.events.map((e) => (
          <li key={e.id} className="ch-item">
            <span className="ch-time">{timeRange(e)}</span>
            <div>
              <strong>{e.title}</strong>
              <p>
                {e.date}
                {guest ? (
                  <>
                    <br />
                    {e.venueName}, {e.address}
                  </>
                ) : null}
                {e.dressCode ? (
                  <>
                    <br />
                    Busana: {e.dressCode}
                  </>
                ) : null}
              </p>
              {guest && (
                <a className="ch-button ch-button-sm" href={e.mapsUrl} target="_blank" rel="noreferrer">
                  Buka peta
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
      {!guest && (
        <p className="ch-hint">
          Alamat lengkap muncul setelah kode undangan dimasukkan.{' '}
          <button type="button" className="ch-text-btn" onClick={onUnlock}>
            Masukkan kode
          </button>
        </p>
      )}
      <a className="ch-button" href={googleCalendarUrl(invitation)} target="_blank" rel="noreferrer">
        Simpan ke kalender
      </a>
    </>
  );
};

const Rsvp: React.FC = () => {
  const { wishes } = useGuestbook();
  return (
    <>
      <TemplateRsvp prefix="ch" submitLabel="Kirim surat" confettiColors={['#E3928A', '#FFD85E', '#587957']} />
      {wishes.length > 0 && (
        <ul className="ch-wishes" aria-label="Ucapan tamu">
          {wishes.slice(0, 20).map((w) => (
            <li key={w.id}>
              <strong>{w.guestName}</strong>
              <p>{w.message}</p>
              {w.voiceUrl && <audio src={w.voiceUrl} controls preload="none" aria-label={`Pesan suara dari ${w.guestName}`} />}
              {w.reply && <p className="ch-reply">Balasan mempelai: {w.reply}</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

const Gifts: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
  const { invitation, guest } = useInvitation();
  const { copy, copied, failed } = useCopy();
  const [qr, setQr] = useState<GiftAccount | null>(null);
  if (!guest) {
    return (
      <p>
        Amplop digital terbuka untuk tamu terdaftar.{' '}
        <button type="button" className="ch-text-btn" onClick={onUnlock}>
          Masukkan kode undangan
        </button>
      </p>
    );
  }
  return (
    <>
      <p>Doa dan kehadiranmu sudah jadi hadiah terbaik. Kalau ingin mengirim tanda kasih, bisa lewat sini.</p>
      {invitation.giftInfo.map((g) => (
        <div key={g.id} className="ch-gift-card">
          <div>
            <strong>{g.bankName}</strong>
            <br />
            <span className="ch-gift-num">{g.accountNumber || 'QRIS'}</span>
            <br />
            a.n. {g.accountHolder}
          </div>
          <div className="ch-gift-actions">
            {g.accountNumber && (
              <button type="button" className="ch-button ch-button-sm" onClick={() => copy(g.accountNumber.replace(/\s/g, ''), g.id)}>
                {copied === g.id ? 'Tersalin' : 'Salin'}
              </button>
            )}
            {g.qrisImageUrl && (
              <button type="button" className="ch-button ch-button-sm" onClick={() => setQr(g)}>
                QR
              </button>
            )}
          </div>
        </div>
      ))}
      <p role="status">{failed ? 'Peramban menolak menyalin otomatis. Salin nomornya secara manual, ya.' : ''}</p>
      <GiftQrDialog gift={qr} onClose={() => setQr(null)} />
    </>
  );
};

const Gallery: React.FC = () => {
  const { invitation } = useInvitation();
  const [open, setOpen] = useState<number | null>(null);
  if (!invitation.gallery.length) return <p>Foto-foto kami segera menyusul.</p>;
  return (
    <>
      <ul className="ch-gallery">
        {invitation.gallery.map((p, i) => (
          <li key={p.id}>
            <button type="button" onClick={() => setOpen(i)} aria-label={`Buka foto: ${p.title}`}>
              {p.mediaType === 'VIDEO' ? (
                <video src={p.url} muted playsInline preload="metadata" />
              ) : (
                <img src={p.url} alt="" loading="lazy" referrerPolicy="no-referrer" />
              )}
            </button>
          </li>
        ))}
      </ul>
      <GalleryLightbox items={invitation.gallery} index={open} onIndexChange={setOpen} />
    </>
  );
};

const PANEL_TITLES: Record<Exclude<PanelId, 'letter'>, { kicker: string; title: string; wide?: boolean }> = {
  vows: { kicker: 'janji suci', title: 'Dua hati, satu rumah' },
  events: { kicker: 'detail acara', title: 'Kapan & di mana' },
  rsvp: { kicker: 'ucapan & rsvp', title: 'Kamu datang, kan?' },
  gifts: { kicker: 'kado', title: 'Amplop digital' },
  gallery: { kicker: 'galeri', title: 'Album kami', wide: true },
};

const Opener: React.FC = () => {
  const { invitation, displayName, open } = useInvitation();
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Sampul undangan"
      className="ch-opener"
      exit={{ opacity: 0, transition: { duration: 0.6 } }}
    >
      <div className="ch-sign">
        <span className="ch-eyebrow">ada surat untuk</span>
        <p className="ch-sign-name">{displayName}</p>
        <p className="ch-sign-from">
          dari {invitation.groomShortName} &amp; {invitation.brideShortName}
        </p>
      </div>
      <button type="button" className="ch-button ch-button-lg" onClick={open}>
        Masuk ke hutan
      </button>
    </motion.div>
  );
};

/** "Cozy Home": a small world in the woods. Signposts and a dock open wood-framed panels. */
const CozyTemplate: React.FC = () => {
  const { invitation, guest, isOpen, music, showPass, photoMomentsHref, isAdmin } = useInvitation();
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [visited, setVisited] = useState<Set<PanelId>>(new Set());
  useTemplateFonts(FONTS);

  const show = (id: PanelId) => {
    setPanel(id);
    setVisited((v) => new Set(v).add(id));
  };
  const next = TABS.find((t) => !visited.has(t.id))?.id;
  const meta = panel && panel !== 'letter' ? PANEL_TITLES[panel] : null;

  return (
    <div className="ch-root">
      <CozyScene />
      <AnimatePresence>{!isOpen && <Opener />}</AnimatePresence>

      <div className="ch-world" inert={!isOpen || panel ? true : undefined}>
        <header className="ch-masthead">
          <span className="ch-eyebrow">pernikahan di tengah hutan</span>
          <h1>
            {invitation.groomShortName}
            <em>&amp;</em>
            {invitation.brideShortName}
          </h1>
          <span className="ch-date">{formatLongDate(invitation.weddingDate)}</span>
        </header>

        <div className="ch-tools">
          {music.available && (
            <button
              type="button"
              className="ch-round"
              onClick={music.toggle}
              aria-pressed={music.playing}
              aria-label={music.playing ? 'Jeda musik' : 'Putar musik'}
            >
              <Glyph.Note />
            </button>
          )}
          {guest && (
            <button type="button" className="ch-round" onClick={() => showPass()} aria-label="Kartu tamu">
              <Glyph.Pass />
            </button>
          )}
          {photoMomentsHref && (
            <a className="ch-round" href={photoMomentsHref} aria-label="Kamera tamu">
              <Glyph.Camera />
            </a>
          )}
          {isAdmin && (
            <a className="ch-round ch-round-text" href="/cms/overview">
              CMS
            </a>
          )}
        </div>

        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`ch-hotspot ${next === t.id ? 'near' : ''}`}
            style={{ left: `${t.spot[0]}%`, top: `${t.spot[1]}%` }}
            onClick={() => show(t.id)}
            tabIndex={-1}
            aria-hidden="true"
          >
            {t.label}
          </button>
        ))}

        <nav className="ch-dock" aria-label="Isi undangan">
          {TABS.map((t) => (
            <button key={t.id} type="button" aria-pressed={panel === t.id} onClick={() => show(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {panel === 'letter' && <Letter onClose={() => setPanel(null)} />}
      {meta && panel && (
        <Panel kicker={meta.kicker} title={meta.title} wide={meta.wide} onClose={() => setPanel(null)}>
          {panel === 'vows' && <Vows />}
          {panel === 'events' && <Events onUnlock={() => show('rsvp')} />}
          {panel === 'rsvp' && <Rsvp />}
          {panel === 'gifts' && <Gifts onUnlock={() => show('rsvp')} />}
          {panel === 'gallery' && <Gallery />}
        </Panel>
      )}
    </div>
  );
};

export default CozyTemplate;
