import React, { useCallback, useEffect, useRef, useState } from 'react';
import { dateParts } from '../../../../lib/format.js';
import { useInvitation } from '../../InvitationContext.js';
import poster from './assets/cover-poster.webp';
import cornerTl from './assets/corner-tl.webp';
import cornerBr from './assets/corner-br.webp';

export const COVER_VIDEO = '/media/envelope-opener.webm';
/** Longest we wait for the opening clip before showing the invitation anyway. */
const VIDEO_TIMEOUT = 6500;
const FADE_MS = 650;

type Phase = 'closed' | 'playing' | 'fading' | 'gone';

/**
 * The closed envelope. Touching the seal starts the invitation (so the music begins inside the tap),
 * plays the opening clip, then fades away to the page behind it. Scrolling is locked while it is up.
 */
export const LayarCover: React.FC<{ onOpened?: () => void }> = ({ onOpened }) => {
  const { invitation, isOpen, open, displayName, isCheckingGuest } = useInvitation();
  const [phase, setPhase] = useState<Phase>(isOpen ? 'gone' : 'closed');
  const [src, setSrc] = useState<string>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const done = useRef(false);

  // The clip is fetched as a whole file (not streamed with Range requests) so the service worker can keep it for offline.
  useEffect(() => {
    let url = '';
    let cancelled = false;
    fetch(COVER_VIDEO)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('no clip'))))
      .then((b) => {
        if (cancelled) return;
        url = URL.createObjectURL(b);
        setSrc(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  const covered = phase !== 'gone';
  useEffect(() => {
    if (!covered) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [covered]);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setPhase('fading');
    onOpened?.();
    window.setTimeout(() => setPhase('gone'), FADE_MS);
  }, [onOpened]);

  const start = () => {
    if (phase !== 'closed') return;
    open();
    const v = videoRef.current;
    if (!v || !src) {
      finish();
      return;
    }
    setPhase('playing');
    v.currentTime = 0;
    v.play().catch(finish);
    window.setTimeout(finish, VIDEO_TIMEOUT);
  };

  if (phase === 'gone') return null;
  const d = dateParts(invitation.weddingDate);
  const stage = `lp-cover is-${phase}`;
  return (
    <div className={stage} role="dialog" aria-modal="true" aria-label="Sampul undangan">
      <img className="lp-cover-corner lp-cover-corner-tl" src={cornerTl} alt="" aria-hidden="true" />
      <img className="lp-cover-corner lp-cover-corner-br" src={cornerBr} alt="" aria-hidden="true" />

      <p className="lp-cover-note lp-cover-note-l" aria-hidden="true">
        <span>Kepada Yth.</span>
        <small>Bapak/Ibu/Saudara/i</small>
        <b>{isCheckingGuest ? '…' : displayName}</b>
        <i />
      </p>
      <p className="lp-cover-note lp-cover-note-r" aria-hidden="true">
        <span>{d.weekday}</span>
        <b>
          {d.day}.{d.month}.{d.year}
        </b>
        <i />
      </p>

      <div className="lp-envelope">
        <img className="lp-envelope-img" src={poster} alt="" />
        <video
          ref={videoRef}
          className="lp-envelope-video"
          src={src}
          poster={poster}
          muted
          playsInline
          preload="auto"
          onEnded={finish}
          onError={finish}
          aria-hidden="true"
        />
        <div className="lp-cover-text">
          <p className="lp-cover-eyebrow">Undangan Pernikahan</p>
          <h1 className="lp-cover-names">
            {invitation.groomShortName} <em>&amp;</em> {invitation.brideShortName}
          </h1>
          <p className="lp-cover-date">
            {d.day} {d.monthName.toUpperCase()} {d.year}
          </p>
          <p className="lp-cover-for">Dengan penuh cinta, untuk</p>
          <p className="lp-cover-guest">{isCheckingGuest ? 'Memeriksa undangan…' : displayName}</p>
        </div>
        <button type="button" className="lp-seal" onClick={start} disabled={phase !== 'closed'} aria-label="Buka undangan">
          <span className="lp-seal-ring" aria-hidden="true" />
          <span className="lp-seal-ring is-outer" aria-hidden="true" />
        </button>
        <p className="lp-cover-hint" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11V5a2 2 0 0 1 4 0v5m0 0V9a2 2 0 0 1 4 0v3m0 0a2 2 0 0 1 4 0v3a6 6 0 0 1-6 6h-2a6 6 0 0 1-5-3l-3-5a2 2 0 0 1 3-2l2 2" />
          </svg>
          Sentuh segel untuk membuka
        </p>
      </div>
    </div>
  );
};
