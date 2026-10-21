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
import { GiftQrDialog, Glyph, timeRange, useTemplateFonts, usePhotoPool, venuesOf } from '../shared/kit.js';
import { TemplateRsvp } from '../shared/TemplateRsvp.js';
import type { GalleryPhoto, GiftAccount } from '@shared/types';
import './bilik.css';

const FONTS =
  'family=Fraunces:opsz,wght@9..144,400;9..144,800&family=Instrument+Sans:wght@400;600&family=Courier+Prime:wght@400;700&family=DotGothic16&family=Reenie+Beanie';

const Head: React.FC<{ kicker: string; title: React.ReactNode; lead?: string; id?: string }> = ({ kicker, title, lead, id }) => (
  <Reveal className="bf-head">
    <p className="bf-kicker">{kicker}</p>
    <h2 id={id} className="bf-h2">
      {title}
    </h2>
    {lead && <p className="bf-lead">{lead}</p>}
  </Reveal>
);

/** Booth curtain cover addressed to the guest. */
const Opener: React.FC = () => {
  const { invitation, displayName, open } = useInvitation();
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Sampul undangan"
      className="bf-opener"
      exit={{ y: '-100%', transition: { duration: 0.8, ease: [0.65, 0, 0.35, 1] } }}
    >
      <div className="bf-curtain" aria-hidden="true" />
      <div className="bf-opener-card">
        <p className="bf-kicker">bilik foto · 4 pose</p>
        <p className="bf-opener-names">
          {invitation.groomShortName} <em>&amp;</em> {invitation.brideShortName}
        </p>
        <p className="bf-opener-to">Untuk kamu,</p>
        <p className="bf-opener-guest">{displayName}</p>
        <button type="button" className="bf-red-btn" onClick={open}>
          Masuk ke bilik
        </button>
      </div>
    </motion.div>
  );
};

/** Names, then a booth slot that prints a strip of the couple's photos. */
const Hero: React.FC = () => {
  const { invitation, isOpen } = useInvitation();
  const photo = usePhotoPool(invitation);
  const d = dateParts(invitation.weddingDate);
  return (
    <header className="bf-hero">
      <p className="bf-kicker">kami menikah!</p>
      <h1 className="bf-names">
        {invitation.groomShortName}
        <em>&amp;</em>
        {invitation.brideShortName}
      </h1>
      <p className="bf-date">
        {d.day} · {d.month} · {d.year}
      </p>
      <div className="bf-slot">
        <span className="bf-slot-label">foto keluar di sini</span>
        <span className="bf-slot-mouth" />
      </div>
      <div className="bf-print-window">
        <motion.div
          className="bf-strip"
          initial={{ y: '-100%' }}
          animate={isOpen ? { y: 0 } : undefined}
          transition={{ duration: 2.4, ease: [0.3, 0.7, 0.4, 1], delay: 0.4 }}
        >
          {[0, 1, 2].map((i) => (
            <img key={i} src={photo(i)} alt="" referrerPolicy="no-referrer" />
          ))}
          <p className="bf-strip-names">
            {invitation.groomShortName} &amp;
            <br />
            {invitation.brideShortName}
          </p>
          <p className="bf-strip-meta">
            {d.day}.{d.month}.{d.year}
          </p>
        </motion.div>
      </div>
    </header>
  );
};

const Invite: React.FC = () => {
  const { invitation, displayName } = useInvitation();
  return (
    <section className="bf-sec bf-center">
      <Reveal>
        <p className="bf-quote">“{invitation.quoteText}”</p>
        <p className="bf-src">{invitation.quoteSource}</p>
        <div className="bf-rule" />
        <p className="bf-to">Untuk kamu,</p>
        <p className="bf-to-name">{displayName}</p>
        <p className="bf-kicker bf-mt">dengan penuh syukur kami mengundang kamu</p>
        <h2 className="bf-h2 bf-mt">Satu pose lagi, bareng kamu</h2>
        <p className="bf-lead">
          Ratusan foto sudah kami ambil berdua. Yang paling penting belum: foto di hari kami resmi jadi keluarga, dan kami mau kamu ada di
          dalamnya.
        </p>
      </Reveal>
    </section>
  );
};

const Couple: React.FC = () => {
  const { invitation: inv } = useInvitation();
  const people = [
    { short: inv.groomShortName, full: inv.groomName, parents: inv.groomParents, photo: inv.groomPhoto, ig: inv.groomInstagram },
    { short: inv.brideShortName, full: inv.brideName, parents: inv.brideParents, photo: inv.bridePhoto, ig: inv.brideInstagram },
  ];
  return (
    <section className="bf-sec" aria-labelledby="bf-couple">
      <Head id="bf-couple" kicker="yang di dalam foto" title="Kami berdua" />
      <div className="bf-polaroids">
        {people.map((p, i) => (
          <Reveal key={p.full} className={`bf-polaroid ${i ? 'is-right' : ''}`} delay={i * 0.1}>
            <span className="bf-tape" aria-hidden="true" />
            <img src={p.photo} alt={p.full} loading="lazy" referrerPolicy="no-referrer" />
            <p className="bf-polaroid-name">{p.short}</p>
            <p className="bf-polaroid-full">{p.full}</p>
            <p className="bf-polaroid-par">{p.parents}</p>
            {p.ig && (
              <a className="bf-ig" href={`https://instagram.com/${p.ig.replace('@', '')}`} target="_blank" rel="noreferrer">
                @{p.ig.replace('@', '')}
              </a>
            )}
          </Reveal>
        ))}
      </div>
    </section>
  );
};

const Schedule: React.FC = () => {
  const { invitation, guest } = useInvitation();
  return (
    <section className="bf-sec" aria-labelledby="bf-schedule">
      <Head id="bf-schedule" kicker="jadwal sesi" title={formatLongDate(invitation.weddingDate)} />
      <Reveal className="bf-board">
        <ol>
          {invitation.events.map((e, i) => (
            <li key={e.id}>
              <p className="bf-board-sm">sesi {i + 1}</p>
              <h3 className="bf-board-title">{e.title}</h3>
              <p className="bf-board-time">{timeRange(e)}</p>
              <p className="bf-board-sm">{e.date}</p>
              <p className="bf-board-sm">{guest ? e.venueName : 'lokasi dibuka dengan kode undangan'}</p>
              {e.dressCode && <p className="bf-board-sm">busana: {e.dressCode}</p>}
            </li>
          ))}
        </ol>
        <span className="bf-board-heart" aria-hidden="true">
          ♥
        </span>
      </Reveal>
      <div className="bf-btns">
        <a className="bf-btn" href={googleCalendarUrl(invitation)} target="_blank" rel="noreferrer">
          Simpan tanggal
        </a>
      </div>
    </section>
  );
};

const Countdown: React.FC = () => {
  const { invitation } = useInvitation();
  const left = useCountdown(invitation.countdownTarget || invitation.weddingDate);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <section className="bf-sec" aria-labelledby="bf-count">
      <Head id="bf-count" kicker="hitung mundur" title={left.isPast ? 'Sesi sedang berlangsung' : 'Siap-siap gaya'} />
      <Reveal className="bf-lcd">
        <p className="bf-lcd-cap" role="timer" aria-label={`${left.days} hari ${left.hours} jam ${left.minutes} menit lagi`}>
          sesi dimulai dalam
        </p>
        <div className="bf-lcd-row" aria-hidden="true">
          {[
            [left.days, 'hari'],
            [pad(left.hours), 'jam'],
            [pad(left.minutes), 'menit'],
            [pad(left.seconds), 'detik'],
          ].map(([v, l]) => (
            <span key={l}>
              <b>{v}</b>
              <small>{l}</small>
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
};

const Receipt: React.FC = () => {
  const { invitation, guest } = useInvitation();
  const venues = venuesOf(invitation.events);
  const d = dateParts(invitation.weddingDate);
  const mark = `${invitation.groomShortName.charAt(0)} & ${invitation.brideShortName.charAt(0)}`.toUpperCase();
  return (
    <section className="bf-sec" aria-labelledby="bf-loc">
      <Head id="bf-loc" kicker="lokasi" title="Ketemu di sini, ya" />
      {venues.map((v) => (
        <Reveal key={v.id} className="bf-receipt-wrap">
          <div className="bf-receipt">
            <p className="bf-receipt-c">*** {mark} ***</p>
            <p className="bf-receipt-c bf-receipt-sm">
              struk lokasi · no. {d.day}
              {d.month}
              {d.year.slice(-2)}
            </p>
            <hr />
            {guest ? (
              <>
                <p className="bf-receipt-venue">{v.venueName}</p>
                <p className="bf-receipt-c">{v.address}</p>
              </>
            ) : (
              <p className="bf-receipt-c">Alamat dicetak setelah kode undangan dimasukkan.</p>
            )}
            <hr />
            <dl>
              {invitation.events
                .filter((e) => e.venueName === v.venueName)
                .map((e) => (
                  <React.Fragment key={e.id}>
                    <dt>{e.title}</dt>
                    <dd>{e.startTime}</dd>
                    <dt>Tanggal</dt>
                    <dd>{e.date.replace(/^\w+,\s*/, '')}</dd>
                  </React.Fragment>
                ))}
            </dl>
            <hr />
            <dl className="bf-receipt-total">
              <dt>TOTAL</dt>
              <dd>doa restu</dd>
            </dl>
            <div className="bf-barcode" aria-hidden="true" />
            <p className="bf-receipt-c">terima kasih sudah datang ♥</p>
          </div>
          <div className="bf-btns">
            {guest ? (
              <a className="bf-btn" href={v.mapsUrl} target="_blank" rel="noreferrer">
                Buka Google Maps
              </a>
            ) : (
              <a className="bf-btn" href="#buka-undangan">
                Masukkan kode undangan
              </a>
            )}
          </div>
        </Reveal>
      ))}
    </section>
  );
};

/** Gallery cut into photobooth strips of four, taped to the wall. */
const StripWall: React.FC = () => {
  const { invitation } = useInvitation();
  const [open, setOpen] = useState<number | null>(null);
  const items = invitation.gallery;
  if (!items.length) return null;
  const strips: { photos: (GalleryPhoto & { index: number })[] }[] = [];
  items.forEach((p, index) => {
    if (index % 4 === 0) strips.push({ photos: [] });
    strips[strips.length - 1].photos.push({ ...p, index });
  });
  const captions = invitation.loveStories.map((s) => s.title);
  return (
    <section className="bf-sec" aria-labelledby="bf-wall">
      <Head id="bf-wall" kicker="dinding strip" title="Hasil sesi sebelumnya" />
      <div className="bf-wall">
        {strips.map((s, i) => (
          <Reveal key={s.photos[0].id} className="bf-wall-strip" delay={i * 0.08}>
            <span className="bf-tape" aria-hidden="true" />
            {s.photos.map((p) => (
              <button key={p.id} type="button" onClick={() => setOpen(p.index)} aria-label={`Buka foto: ${p.title}`}>
                {p.mediaType === 'VIDEO' ? (
                  <video src={p.url} muted playsInline preload="metadata" />
                ) : (
                  <img src={p.url} alt="" loading="lazy" referrerPolicy="no-referrer" />
                )}
              </button>
            ))}
            <p className="bf-hand">{captions[i] || s.photos[0].caption || s.photos[0].title}</p>
          </Reveal>
        ))}
      </div>
      <GalleryLightbox items={items} index={open} onIndexChange={setOpen} />
    </section>
  );
};

const Story: React.FC = () => {
  const { invitation } = useInvitation();
  if (!invitation.loveStories.length) return null;
  return (
    <section className="bf-sec" aria-labelledby="bf-story">
      <Head id="bf-story" kicker="catatan sesi" title="Dari kenalan sampai pelaminan" />
      <ol className="bf-story">
        {invitation.loveStories.map((s) => (
          <Reveal as="li" key={s.id} className="bf-story-item">
            <span className="bf-story-year">{s.year}</span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
};

const MomentsNote: React.FC = () => {
  const { photoMomentsHref } = useInvitation();
  return (
    <Reveal className="bf-moments">
      <span className="bf-moments-icon" aria-hidden="true">
        <Glyph.Camera />
      </span>
      <div>
        <p className="bf-moments-title">Di hari H, bilik fotonya beneran ada.</p>
        <p>
          Kamera sekali pakai ada di HP-mu, lengkap dengan look film dan bingkai. Fotomu langsung masuk ke galeri bersama. Jangan malu-malu.
        </p>
        {photoMomentsHref && (
          <a className="bf-btn bf-mt-sm" href={photoMomentsHref}>
            Buka kamera tamu
          </a>
        )}
      </div>
    </Reveal>
  );
};

const Gifts: React.FC = () => {
  const { invitation, guest } = useInvitation();
  const { copy, copied, failed } = useCopy();
  const [qr, setQr] = useState<GiftAccount | null>(null);
  if (!guest || !invitation.giftInfo.length) return null;
  const watermark = `${invitation.groomShortName} & ${invitation.brideShortName} · photo paper · `.repeat(6);
  return (
    <section className="bf-sec" aria-labelledby="bf-gift">
      <Head
        id="bf-gift"
        kicker="tanda kasih"
        title="Amplop digital"
        lead="Doa dan kehadiranmu sudah jadi hadiah terbaik. Kalau ingin mengirim tanda kasih, bisa lewat sini."
      />
      <Reveal className="bf-gift">
        <p className="bf-gift-hand">di balik foto ini ↓</p>
        <p className="bf-gift-wm" aria-hidden="true">
          {watermark}
        </p>
        {invitation.giftInfo.map((g) => (
          <div key={g.id} className="bf-gift-row">
            <div>
              <p className="bf-kicker">{g.bankName}</p>
              <p className="bf-gift-num">{g.accountNumber || 'QRIS'}</p>
              <p className="bf-gift-holder">a.n. {g.accountHolder}</p>
            </div>
            <div className="bf-gift-actions">
              {g.accountNumber && (
                <button type="button" className="bf-chip" onClick={() => copy(g.accountNumber.replace(/\s/g, ''), g.id)}>
                  {copied === g.id ? 'tersalin' : 'salin'}
                </button>
              )}
              {g.qrisImageUrl && (
                <button type="button" className="bf-chip" onClick={() => setQr(g)}>
                  qr
                </button>
              )}
            </div>
          </div>
        ))}
      </Reveal>
      <p role="status" className="bf-center bf-status">
        {failed ? 'Peramban menolak menyalin otomatis. Salin nomornya secara manual, ya.' : ''}
      </p>
      <GiftQrDialog gift={qr} onClose={() => setQr(null)} />
    </section>
  );
};

/** Wishes come out of the machine as narrow printed strips. */
const PrintedWishes: React.FC = () => {
  const { wishes, isLoading } = useGuestbook();
  const [limit, setLimit] = useState(6);
  if (isLoading) return <p className="bf-center bf-lead">Memuat ucapan...</p>;
  if (!wishes.length) return <p className="bf-center bf-empty">Belum ada strip yang tercetak. Jadi yang pertama, yuk!</p>;
  return (
    <>
      <ul className="bf-prints">
        {wishes.slice(0, limit).map((w, i) => (
          <li key={w.id} className="bf-print" style={{ rotate: `${(i % 3) - 1}deg` }}>
            <p className="bf-print-head">*** {w.guestName} ***</p>
            <p className="bf-print-rel">{w.relationship}</p>
            <p className="bf-print-msg">{w.message}</p>
            {w.voiceUrl && <audio src={w.voiceUrl} controls preload="none" aria-label={`Pesan suara dari ${w.guestName}`} />}
            {w.reply && <p className="bf-print-reply">balasan: {w.reply}</p>}
          </li>
        ))}
      </ul>
      {wishes.length > limit && (
        <div className="bf-btns">
          <button type="button" className="bf-btn" onClick={() => setLimit((n) => n + 6)}>
            Cetak lebih banyak
          </button>
        </div>
      )}
    </>
  );
};

const Footer: React.FC = () => {
  const { invitation, isAdmin } = useInvitation();
  return (
    <footer className="bf-sec bf-center bf-footer">
      <p className="bf-kicker">pose terakhir</p>
      <p className="bf-h2">Sampai ketemu</p>
      <p className="bf-footer-red">di depan kamera</p>
      <p className="bf-lead">
        {invitation.groomShortName} &amp; {invitation.brideShortName}, beserta keluarga besar
      </p>
      {isAdmin && (
        <a className="bf-admin" href="/cms/overview">
          Kelola undangan di CMS
        </a>
      )}
    </footer>
  );
};

const Dock: React.FC = () => {
  const { guest, music, showPass, photoMomentsHref } = useInvitation();
  return (
    <nav className="bf-dock" aria-label="Kontrol undangan">
      {music.available && (
        <button type="button" onClick={music.toggle} aria-pressed={music.playing} aria-label={music.playing ? 'Jeda musik' : 'Putar musik'}>
          <Glyph.Note />
          <span>{music.playing ? 'jeda' : 'musik'}</span>
        </button>
      )}
      {guest && (
        <button type="button" onClick={() => showPass()}>
          <Glyph.Pass />
          <span>kartu</span>
        </button>
      )}
      {photoMomentsHref && (
        <a href={photoMomentsHref}>
          <Glyph.Camera />
          <span>kamera</span>
        </a>
      )}
    </nav>
  );
};

/** "Bilik Foto": a photobooth on a paper wall. Strips, a letterboard, a receipt. */
const BilikTemplate: React.FC = () => {
  const { isOpen } = useInvitation();
  useTemplateFonts(FONTS);
  return (
    <div className="bf">
      <AnimatePresence>{!isOpen && <Opener />}</AnimatePresence>
      <div inert={!isOpen ? true : undefined}>
        <main>
          <Hero />
          <Invite />
          <Couple />
          <Schedule />
          <Countdown />
          <Receipt />
          <StripWall />
          <Story />
          <MomentsNote />
          <Gifts />
          <section className="bf-sec" aria-labelledby="bf-rsvp">
            <Head
              id="bf-rsvp"
              kicker="rsvp & ucapan"
              title="Kamu ikut foto, kan?"
              lead="Setiap balasan langsung dicetak jadi strip kecil di bawah."
            />
            <TemplateRsvp prefix="bf" submitLabel="Cetak ucapanku" confettiColors={['#B42A2F', '#FFCF3A', '#221D1A']} />
            <PrintedWishes />
          </section>
        </main>
        <Footer />
        <Dock />
      </div>
    </div>
  );
};

export default BilikTemplate;
