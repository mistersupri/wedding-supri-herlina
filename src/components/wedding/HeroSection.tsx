import React, { useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { IconButton } from '../ui/Button.js';
import { dateParts } from '../../lib/format.js';
import type { InvitationData } from '../../types.js';

/**
 * Full-bleed photo (or looping video) with the names set low and left.
 * The text sits on a deep scrim that is at least 85% opaque behind it, so it stays legible on any photo.
 */
export const HeroSection: React.FC<{ invitation: InvitationData }> = ({ invitation }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const isVideo = invitation.heroMediaType === 'VIDEO' && Boolean(invitation.heroVideoUrl);
  const date = dateParts(invitation.weddingDate);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <section id="hero-section" aria-label="Pembuka" className="on-deep relative flex min-h-[92dvh] items-end overflow-hidden">
      {isVideo ? (
        <video
          ref={videoRef}
          src={invitation.heroVideoUrl}
          poster={invitation.heroImage}
          autoPlay
          loop
          muted
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <img src={invitation.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, var(--deep) 0%, color-mix(in srgb, var(--deep) 88%, transparent) 38%, transparent 72%)',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-5xl px-5 pb-28 sm:px-8 sm:pb-32">
        <p className="text-sm text-on-deep-soft">Pernikahan</p>
        <h2 className="mt-2 font-display text-[clamp(2.75rem,11vw,6rem)] leading-[0.95] italic">
          {invitation.groomShortName}
          <span className="px-3 text-prada-on-deep not-italic">&amp;</span>
          <br className="sm:hidden" />
          {invitation.brideShortName}
        </h2>

        <div className="mt-6 flex items-end gap-4">
          <p className="display-numeral text-[clamp(2.5rem,9vw,4rem)] leading-none text-prada-on-deep">{date.day}</p>
          <div className="pb-1 text-sm leading-snug">
            <p className="font-semibold capitalize">{date.weekday}</p>
            <p className="text-on-deep-soft">
              {date.monthName} {date.year}
            </p>
          </div>
        </div>
      </div>

      {isVideo && (
        <div className="absolute right-4 bottom-24 flex gap-1 sm:bottom-28 rounded-sm bg-deep/60">
          <IconButton tone="deep" label={playing ? 'Jeda video' : 'Putar video'} onClick={togglePlay}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </IconButton>
          <IconButton tone="deep" label={muted ? 'Nyalakan suara video' : 'Matikan suara video'} onClick={toggleMute}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </IconButton>
        </div>
      )}
    </section>
  );
};
