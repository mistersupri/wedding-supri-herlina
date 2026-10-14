import React, { useEffect, useRef, useState } from 'react';
import { KawungMark } from '../ui/Kawung.js';

interface MusicPlayerProps {
  src: string;
  title: string;
  /** Becomes true when the guest opens the cover; that click is the gesture browsers require to play audio. */
  autoStart: boolean;
}

/** Background music toggle. The kawung mark turns slowly while the music plays. */
export const MusicPlayer: React.FC<MusicPlayerProps> = ({ src, title, autoStart }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (autoStart) audioRef.current?.play().catch(() => undefined);
  }, [autoStart]);

  if (!src) return null;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => undefined);
    else audio.pause();
  };

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? `Jeda musik: ${title}` : `Putar musik: ${title}`}
        title={title}
        className="on-deep fixed top-3 right-3 z-30 flex h-12 w-12 items-center justify-center rounded-full shadow-[0_8px_24px_-8px_rgba(20,12,6,0.6)]"
      >
        <KawungMark className={`h-7 w-7 text-prada-on-deep ${playing ? 'animate-spin [animation-duration:6s]' : 'opacity-60'}`} />
      </button>
    </>
  );
};
