import React from 'react';
import { useInvitation } from '../../InvitationContext.js';
import { dateParts } from '../../../../lib/format.js';
import { usePhotoPool } from '../shared/kit.js';
import { useReelScroll } from './useReelScroll.js';

type Frame =
  | { key: string; kind: 'photo'; src: string; caption?: string; stamp: string }
  | { key: string; kind: 'serif' | 'script'; text: string; note?: string };

/** The love story as a strip of film: both portraits, the story photos, and the date as the last frame. */
function useFrames(): Frame[] {
  const { invitation: inv } = useInvitation();
  const photo = usePhotoPool(inv);
  const d = dateParts(inv.weddingDate);
  const yy = (y: string) => `'${y.slice(-2)}`;
  const firstYear = inv.loveStories[0]?.year;
  return [
    { key: 'groom', kind: 'photo', src: inv.groomPhoto || photo(0), caption: inv.groomShortName, stamp: firstYear ? yy(firstYear) : '' },
    { key: 'bride', kind: 'photo', src: inv.bridePhoto || photo(1), caption: inv.brideShortName, stamp: firstYear ? yy(firstYear) : '' },
    { key: 'intro', kind: 'serif', text: 'dua orang,\ndua cerita,\nbelum saling kenal' },
    ...inv.loveStories.map<Frame>((s, i) => ({
      key: s.id,
      kind: 'photo',
      src: s.photoUrl || photo(i + 2),
      caption: s.title,
      stamp: yy(s.year),
    })),
    { key: 'forever', kind: 'script', text: 'awal dari\nselamanya kami' },
    { key: 'date', kind: 'serif', text: `${d.day} · ${d.month} · ${d.year}`, note: 'sampai jumpa' },
  ];
}

/**
 * Names, a roll of film and a projector window. With motion on, scrolling unrolls the film out of
 * the roll (see useReelScroll); with reduced motion it is a plain strip of frames.
 */
export const Reel: React.FC<{ motion: boolean }> = ({ motion }) => {
  const { invitation } = useInvitation();
  const frames = useFrames();
  const refs = useReelScroll(motion);
  const mark = `${invitation.groomShortName.charAt(0)}&${invitation.brideShortName.charAt(0)} 400`.toUpperCase();

  return (
    <section
      ref={refs.reel}
      className="gk-reel"
      aria-label={`Gulungan kenangan ${invitation.groomShortName} dan ${invitation.brideShortName}`}
    >
      <div ref={refs.stage} className="gk-stage">
        <header ref={refs.head} className="gk-head">
          <p className="gk-caps">dengan cinta, dari</p>
          <h1 className="gk-head-names">
            <span className="gk-head-name">{invitation.groomShortName}</span>
            <span className="gk-head-name">{invitation.brideShortName}</span>
          </h1>
        </header>
        <div ref={refs.rig} className="gk-rig">
          <div className="gk-roller" aria-hidden="true">
            <span className="gk-rod" />
            <span className="gk-roll" />
          </div>
          <div ref={refs.win} className="gk-window">
            <div ref={refs.film} className="gk-film">
              <div className="gk-edge gk-edge-l" aria-hidden="true">
                {[12, 13, 14].map((n) => (
                  <React.Fragment key={n}>
                    <span>{mark}</span>
                    <span>▸ {n}</span>
                  </React.Fragment>
                ))}
              </div>
              <div className="gk-edge gk-edge-r" aria-hidden="true">
                {[12, 13, 14].map((n) => (
                  <React.Fragment key={n}>
                    <span>{n}A</span>
                    <span>SAFETY FILM</span>
                  </React.Fragment>
                ))}
              </div>
              <div className="gk-leader-end" aria-hidden="true" />
              <ol className="gk-frames">
                {frames.map((f) =>
                  f.kind === 'photo' ? (
                    <li key={f.key}>
                      <figure className="gk-frame">
                        <img className="gk-frame-img" src={f.src} alt={f.caption || ''} loading="lazy" referrerPolicy="no-referrer" />
                        {f.caption && <figcaption className="gk-frame-cap">{f.caption}</figcaption>}
                        {f.stamp && <span className="gk-stamp">{f.stamp}</span>}
                      </figure>
                    </li>
                  ) : (
                    <li key={f.key}>
                      <div className="gk-frame gk-frame-txt">
                        <div>
                          <p className={f.kind === 'script' ? 'gk-frame-script' : 'gk-frame-serif'}>{f.text}</p>
                          {f.note && <p className="gk-caps gk-frame-note">{f.note}</p>}
                        </div>
                      </div>
                    </li>
                  ),
                )}
              </ol>
            </div>
          </div>
        </div>
        <p className="gk-hint">gulir untuk memutar</p>
      </div>
    </section>
  );
};
