import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, LayoutGrid, Share2, X } from 'lucide-react';
import { useDialogBehaviour } from '../../../../components/ui/Modal.js';
import type { GalleryCategory, GalleryPhoto } from '@shared/types';

/** Roll titles for the gallery categories the CMS offers. */
export const ROLL_LABEL: Record<GalleryCategory, string> = {
  PREWEDDING: 'Prewedding',
  ENGAGEMENT: 'Lamaran',
  CEREMONY: 'Akad & resepsi',
  MOMENTS: 'Momen',
};
const ROLL_ORDER: GalleryCategory[] = ['PREWEDDING', 'ENGAGEMENT', 'CEREMONY', 'MOMENTS'];

export type Scene = GalleryPhoto & { index: number; roll: number };

const pad2 = (n: number) => String(n).padStart(2, '0');
export const frameCode = (i: number) => `${pad2(i + 1)}A`;

/** Gallery split into rolls (one per category), each frame keeping its index in the full list. */
export function useRolls(items: GalleryPhoto[]) {
  return useMemo(
    () =>
      ROLL_ORDER.filter((category) => items.some((p) => p.category === category)).map((category, roll) => ({
        category,
        scenes: items.flatMap((p, index): Scene[] => (p.category === category ? [{ ...p, index, roll }] : [])),
      })),
    [items],
  );
}

/** Share the invitation link (gallery or one scene), falling back to copying it. */
async function shareLink(title: string): Promise<'shared' | 'copied' | 'failed'> {
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return 'shared';
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch (e) {
    return (e as DOMException)?.name === 'AbortError' ? 'shared' : 'failed';
  }
}

const SHARE_STATUS = { shared: '', copied: 'Tautan undangan tersalin.', failed: 'Tautan tidak bisa dibagikan dari peramban ini.' };

const Media: React.FC<{ p: GalleryPhoto; still?: boolean }> = ({ p, still }) =>
  p.mediaType === 'VIDEO' ? (
    still ? (
      <video src={`${p.url}#t=0.1`} poster={p.thumbnailUrl} muted playsInline preload="metadata" />
    ) : (
      <video src={p.url} poster={p.thumbnailUrl} controls autoPlay playsInline />
    )
  ) : (
    <img src={still && p.thumbnailUrl ? p.thumbnailUrl : p.url} alt={still ? '' : p.title} loading="lazy" referrerPolicy="no-referrer" />
  );

/** "Lembar kontak": every photo on 35mm strips, one strip per roll, with roll filters. */
export const ContactSheet: React.FC<{
  open: boolean;
  items: GalleryPhoto[];
  owner: string;
  onClose: () => void;
  onOpenScene: (index: number) => void;
}> = ({ open, items, owner, onClose, onOpenScene }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const rolls = useRolls(items);
  const [filter, setFilter] = useState<GalleryCategory | 'ALL'>('ALL');
  const [status, setStatus] = useState('');
  useDialogBehaviour(open, onClose, panelRef);
  const shown = filter === 'ALL' ? rolls : rolls.filter((r) => r.category === filter);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lp-sheet-title"
          tabIndex={-1}
          className="lp lp-sheet"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="lp-sheet-in">
            <div className="lp-sheet-top">
              <button type="button" className="lp-back" onClick={onClose}>
                <ArrowLeft size={16} aria-hidden="true" />
                <span>Kembali ke undangan</span>
              </button>
              <p className="lp-mono lp-ink lp-hide-sm">Reel 05 — Lembar kontak</p>
              <p className="lp-mono lp-ink lp-show-sm">Lembar kontak</p>
              <button type="button" className="lp-round" onClick={onClose} aria-label="Tutup lembar kontak">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <header className="lp-sheet-head">
              <div>
                <p className="lp-mono lp-gold">
                  {rolls.length} rol · 35mm
                </p>
                <h2 id="lp-sheet-title" className="lp-sheet-title">
                  <span className="lp-sheet-count">{items.length}</span> <em>adegan pilihan</em>
                </h2>
              </div>
              {rolls.length > 1 && (
                <div className="lp-filters" role="group" aria-label="Saring rol">
                  {[{ category: 'ALL' as const, label: 'Semua' }, ...rolls.map((r) => ({ category: r.category, label: ROLL_LABEL[r.category] }))].map(
                    (f) => (
                      <button
                        key={f.category}
                        type="button"
                        className="lp-chip"
                        aria-pressed={filter === f.category}
                        onClick={() => setFilter(f.category)}
                      >
                        {f.label}
                      </button>
                    ),
                  )}
                </div>
              )}
            </header>

            {shown.map((r) => {
              const rollNo = rolls.indexOf(r);
              return (
                <section key={r.category} className="lp-roll" aria-labelledby={`lp-roll-${r.category}`}>
                  <div className="lp-roll-head">
                    <p className="lp-mono lp-gold">Rol {pad2(rollNo + 1)}</p>
                    <h3 id={`lp-roll-${r.category}`} className="lp-roll-title">
                      {ROLL_LABEL[r.category]}
                    </h3>
                    <p className="lp-mono lp-muted lp-roll-meta">{r.scenes.length} bingkai</p>
                  </div>
                  <div className="lp-strip-scroll" tabIndex={0} aria-label={`Bingkai rol ${ROLL_LABEL[r.category]}, geser ke samping`}>
                    <ol className="lp-film lp-film-sheet">
                      {r.scenes.map((s) => (
                        <li key={s.id}>
                          <button type="button" className="lp-frame" onClick={() => onOpenScene(s.index)} aria-label={`Buka adegan ${s.index + 1}: ${s.title}`}>
                            <Media p={s} still />
                            <span className="lp-frame-code" aria-hidden="true">
                              {frameCode(s.index)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                </section>
              );
            })}

            <footer className="lp-sheet-foot">
              <p className="lp-mono lp-muted">Foto milik {owner} · mohon izin sebelum dibagikan ulang</p>
              <button
                type="button"
                className="lp-pill"
                onClick={async () => setStatus(SHARE_STATUS[await shareLink(`Galeri ${owner}`)])}
              >
                <Share2 size={15} aria-hidden="true" /> Bagikan galeri
              </button>
            </footer>
            <p role="status" className="lp-status">
              {status}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

/** One scene at a time: stage with arrows, caption, share/download and a thumbnail strip. */
export const SceneViewer: React.FC<{
  items: GalleryPhoto[];
  index: number | null;
  onIndexChange: (i: number | null) => void;
  onBackToSheet: () => void;
}> = ({ items, index, onIndexChange, onBackToSheet }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLOListElement>(null);
  const touchX = useRef<number | null>(null);
  const rolls = useRolls(items);
  const [status, setStatus] = useState('');
  const open = index !== null && items[index] != null;
  const close = () => onIndexChange(null);
  useDialogBehaviour(open, close, panelRef);

  const count = items.length;
  const step = (d: number) => index !== null && count > 0 && onIndexChange((index + d + count) % count);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    setStatus('');
    thumbsRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [index]);

  const current = open ? items[index] : null;
  const roll = current ? rolls.findIndex((r) => r.category === current.category) : -1;
  const rollLabel = roll >= 0 ? `Rol ${pad2(roll + 1)} — ${ROLL_LABEL[rolls[roll].category]}` : '';

  return createPortal(
    <AnimatePresence>
      {current && index !== null && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Adegan galeri"
          tabIndex={-1}
          className="lp lp-scene"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 48) step(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <div className="lp-scene-top">
            <button type="button" className="lp-back lp-hide-sm" onClick={onBackToSheet}>
              <LayoutGrid size={16} aria-hidden="true" />
              <span>Lembar kontak</span>
            </button>
            <button type="button" className="lp-round lp-show-sm" onClick={close} aria-label="Tutup adegan">
              <X size={18} aria-hidden="true" />
            </button>
            <p className="lp-mono lp-ink lp-hide-sm">{rollLabel}</p>
            <p className="lp-scene-count" aria-live="polite">
              <span>{pad2(index + 1)}</span> <small className="lp-mono lp-muted">/ {count}</small>
            </p>
            <button type="button" className="lp-round lp-hide-sm" onClick={close} aria-label="Tutup adegan">
              <X size={18} aria-hidden="true" />
            </button>
            <button type="button" className="lp-round lp-show-sm" onClick={onBackToSheet} aria-label="Buka lembar kontak">
              <LayoutGrid size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="lp-stage">
            {count > 1 && (
              <button type="button" className="lp-round lp-stage-nav lp-hide-sm" onClick={() => step(-1)} aria-label="Adegan sebelumnya">
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
            )}
            <figure className="lp-still-col">
              <div className="lp-still">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.id}
                    className="lp-still-media"
                    initial={{ opacity: 0, scale: 0.985 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Media p={current} />
                  </motion.div>
                </AnimatePresence>
                <p className="lp-still-tag" aria-hidden="true">
                  <span>SC.{pad2(index + 1)}</span>
                  <span>{frameCode(index)}</span>
                </p>
              </div>
              <figcaption className="lp-caption">
                <div>
                  <p className="lp-caption-title">{current.caption || current.title}</p>
                  <p className="lp-mono lp-muted">
                    {roll >= 0 ? ROLL_LABEL[rolls[roll].category] : ''}
                    {current.caption ? ` · ${current.title}` : ''}
                  </p>
                </div>
                <div className="lp-caption-actions">
                  <button
                    type="button"
                    className="lp-pill lp-pill-sm"
                    onClick={async () => setStatus(SHARE_STATUS[await shareLink(current.title)])}
                  >
                    <Share2 size={14} aria-hidden="true" /> Bagikan
                  </button>
                  <a className="lp-pill lp-pill-sm" href={current.url} download target="_blank" rel="noreferrer">
                    <Download size={14} aria-hidden="true" /> Unduh
                  </a>
                </div>
              </figcaption>
              <p role="status" className="lp-status">
                {status}
              </p>
            </figure>
            {count > 1 && (
              <button type="button" className="lp-round lp-stage-nav lp-hide-sm" onClick={() => step(1)} aria-label="Adegan berikutnya">
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="lp-film lp-film-thumbs">
            <ol ref={thumbsRef}>
              {items.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="lp-thumb"
                    aria-current={i === index ? 'true' : undefined}
                    aria-label={`Adegan ${i + 1}: ${p.title}`}
                    onClick={() => onIndexChange(i)}
                  >
                    <Media p={p} still />
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <p className="lp-mono lp-muted lp-keys" aria-hidden="true">
            <span className="lp-hide-sm">← → ganti adegan</span>
            <span className="lp-hide-sm">Esc tutup</span>
            <span className="lp-show-sm">Geser untuk adegan berikutnya</span>
          </p>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
