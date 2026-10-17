import React from 'react';
import { useInvitation } from '../../features/invitation/InvitationContext.js';
import { KawungMark } from '../ui/Kawung.js';

/** Background music toggle. The kawung mark turns slowly while the music plays. */
export const MusicPlayer: React.FC = () => {
  const { music } = useInvitation();
  if (!music.available) return null;

  return (
    <button
      type="button"
      onClick={music.toggle}
      aria-pressed={music.playing}
      aria-label={music.playing ? `Jeda musik: ${music.title}` : `Putar musik: ${music.title}`}
      title={music.title}
      className="on-deep fixed top-3 right-3 z-30 flex h-12 w-12 items-center justify-center rounded-full shadow-[0_8px_24px_-8px_rgba(20,12,6,0.6)]"
    >
      <KawungMark className={`h-7 w-7 text-prada-on-deep ${music.playing ? 'animate-spin [animation-duration:6s]' : 'opacity-60'}`} />
    </button>
  );
};
