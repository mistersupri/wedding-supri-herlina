import React, { useState, useEffect, useRef } from 'react';
import { Music, Volume2, VolumeX, Disc, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../../context/ThemeContext.js';

interface FloatingMusicPlayerProps {
  musicUrl?: string;
  audioUrl?: string;
  musicTitle?: string;
  songTitle?: string;
  autoPlayTriggered?: boolean;
  autoPlayTrigger?: boolean;
}

export const FloatingMusicPlayer: React.FC<FloatingMusicPlayerProps> = ({
  musicUrl,
  audioUrl,
  musicTitle,
  songTitle,
  autoPlayTriggered,
  autoPlayTrigger,
}) => {
  const effectiveMusicUrl = musicUrl || audioUrl || '';
  const effectiveMusicTitle = musicTitle || songTitle || 'Background Music';
  const effectiveAutoPlay = autoPlayTriggered ?? autoPlayTrigger ?? false;

  const { styles } = useTheme();
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current && effectiveAutoPlay && !hasInteracted) {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setHasInteracted(true);
        })
        .catch((err) => {
          console.log('Audio autoplay prevented by browser policy:', err);
        });
    }
  }, [effectiveAutoPlay, hasInteracted]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => console.log('Audio play error:', err));
    }
    setHasInteracted(true);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={effectiveMusicUrl}
        loop
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="fixed bottom-24 right-6 z-50 flex items-center gap-3 sm:bottom-28">
        {/* Track info banner on hover / playing */}
        <AnimatePresence>
          {isPlaying && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full shadow-lg border backdrop-blur-md text-xs font-medium"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                borderColor: styles.borderAccent,
                color: styles.textPrimary,
              }}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span className="truncate max-w-[140px]">{effectiveMusicTitle}</span>
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 hover:bg-black/5 rounded-full transition-colors ml-1"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vinyl disc circular toggle button */}
        <motion.button
          type="button"
          onClick={togglePlay}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          aria-label={isPlaying ? 'Jeda Musik' : 'Putar Musik'}
          className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-xl border-2 flex items-center justify-center cursor-pointer transition-shadow"
          style={{
            backgroundColor: styles.bgCard,
            borderColor: styles.accent,
            boxShadow: `0 8px 24px -4px ${styles.accent}40`,
          }}
        >
          {/* Animated vinyl grooves */}
          <motion.div
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{
              repeat: isPlaying ? Infinity : 0,
              duration: 4,
              ease: 'linear',
            }}
            className="absolute inset-1 rounded-full border border-dashed border-black/20 flex items-center justify-center bg-stone-900"
          >
            <div
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: styles.accent, backgroundColor: styles.accentLight }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-stone-900" />
            </div>
          </motion.div>

          {/* Floating music note icon badge */}
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white shadow-md"
            style={{ backgroundColor: isPlaying ? styles.accent : '#8E8E93' }}
          >
            {isPlaying ? <Music className="w-2.5 h-2.5" /> : <Disc className="w-2.5 h-2.5" />}
          </div>
        </motion.button>
      </div>
    </>
  );
};
