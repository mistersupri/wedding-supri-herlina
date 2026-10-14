import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Heart, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';
import { InvitationData } from '../../types.js';

interface HeroSectionProps {
  invitation: InvitationData;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ invitation }) => {
  const { styles } = useTheme();
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isVideoHero = invitation.heroMediaType === 'VIDEO' && Boolean(invitation.heroVideoUrl);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isVideoMuted;
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formattedDate = new Date(invitation.weddingDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section id="hero-section" className="relative min-h-[90vh] flex items-center justify-center text-center px-4 py-16 overflow-hidden">
      {/* Background Media */}
      {isVideoHero ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            ref={videoRef}
            src={invitation.heroVideoUrl}
            poster={invitation.heroImage}
            autoPlay
            loop
            muted={isVideoMuted}
            playsInline
            className="w-full h-full object-cover scale-105 transition-transform duration-1000"
          />
          {/* Subtle overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#FDFCFA]/40 via-[#FDFCFA]/75 to-[#FDFCFA]/95" />

          {/* Video Control Buttons */}
          <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="p-2.5 rounded-full bg-white/80 hover:bg-white text-stone-800 shadow-md backdrop-blur-md transition-all cursor-pointer border border-white/60 text-xs font-semibold"
              title={isPlaying ? 'Jeda Video Banner' : 'Putar Video Banner'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="p-2.5 rounded-full bg-white/80 hover:bg-white text-stone-800 shadow-md backdrop-blur-md transition-all cursor-pointer border border-white/60 text-xs font-semibold"
              title={isVideoMuted ? 'Nyalakan Suara Video' : 'Mutekan Suara Video'}
            >
              {isVideoMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center z-0 scale-105 transition-transform duration-1000"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(253, 252, 249, 0.45), rgba(253, 252, 249, 0.94)), url(${invitation.heroImage})`,
          }}
        />
      )}

      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
        {/* Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border backdrop-blur-sm"
          style={{
            backgroundColor: 'rgba(253, 252, 249, 0.85)',
            borderColor: styles.borderAccent,
            color: styles.textSecondary,
          }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: styles.accent }} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] font-sans">
            The Wedding Celebration
          </span>
          <Sparkles className="w-3.5 h-3.5" style={{ color: styles.accent }} />
        </motion.div>

        {/* Display Main Title */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-['Alex_Brush'] text-6xl sm:text-7xl md:text-8xl leading-none my-2 drop-shadow-sm"
          style={{ color: styles.accent }}
        >
          {invitation.groomShortName} & {invitation.brideShortName}
        </motion.h1>

        {/* Date line */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="font-['Playfair_Display'] text-lg sm:text-xl md:text-2xl italic tracking-wide font-medium mt-2"
          style={{ color: styles.textPrimary }}
        >
          {formattedDate}
        </motion.p>

        {/* Decorative divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="w-12 h-px" style={{ backgroundColor: styles.borderAccent }} />
          <Heart className="w-3.5 h-3.5 fill-current" style={{ color: styles.accent }} />
          <div className="w-12 h-px" style={{ backgroundColor: styles.borderAccent }} />
        </div>

        {/* Quote Card */}
        {invitation.quoteText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="max-w-xl mx-auto p-6 sm:p-8 rounded-2xl border backdrop-blur-md shadow-sm border-l-4"
            style={{
              backgroundColor: 'rgba(247, 245, 240, 0.85)',
              borderColor: styles.borderAccent,
              borderLeftColor: styles.accent,
            }}
          >
            <p className="font-['Cormorant_Garamond'] text-lg sm:text-xl italic leading-relaxed text-[#4A4A40]">
              "{invitation.quoteText}"
            </p>
            {invitation.quoteSource && (
              <p
                className="text-[11px] font-semibold tracking-[0.2em] uppercase mt-3 font-sans"
                style={{ color: styles.accent }}
              >
                — {invitation.quoteSource}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};
