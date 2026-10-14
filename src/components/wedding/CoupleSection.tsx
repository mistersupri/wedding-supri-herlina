import React from 'react';
import { motion } from 'motion/react';
import { Heart, Instagram, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';
import { InvitationData } from '../../types.js';

interface CoupleSectionProps {
  invitation: InvitationData;
}

export const CoupleSection: React.FC<CoupleSectionProps> = ({ invitation }) => {
  const { styles } = useTheme();

  return (
    <section id="couple-section" className="py-20 px-4">
      <div className="max-w-5xl mx-auto text-center">
        {/* Intro Tag */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5" style={{ color: styles.accent }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] font-sans" style={{ color: styles.textSecondary }}>
              Mempelai Yang Berbahagia
            </span>
          </div>
          <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl md:text-5xl font-semibold" style={{ color: styles.textPrimary }}>
            Assalamu’alaikum Wr. Wb.
          </h2>
          <p className="text-sm sm:text-base text-[#78786A] max-w-2xl mx-auto mt-3 leading-relaxed">
            Dengan memohon rahmat dan ridho Allah Subhanahu Wa Ta’ala, kami bermaksud menyelenggarakan syukuran pernikahan putra-putri kami:
          </p>
        </motion.div>

        {/* Couple Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center relative">
          {/* Groom Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="flex flex-col items-center text-center p-6 sm:p-10 rounded-3xl border shadow-sm transition-all hover:shadow-md"
            style={{
              backgroundColor: styles.bgCard,
              borderColor: styles.borderAccent,
            }}
          >
            {/* Groom Photo in Elegant Arch Frame */}
            <div className="relative mb-6">
              <div
                className="w-44 h-56 sm:w-52 sm:h-64 rounded-t-full rounded-b-2xl overflow-hidden border-4 border-white ring-1 shadow-md"
                style={{ ringColor: styles.borderAccent }}
              >
                <img
                  src={invitation.groomPhoto}
                  alt={invitation.groomName}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-white shadow-md"
                style={{ backgroundColor: styles.accent }}
              >
                Mempelai Pria
              </div>
            </div>

            <h3 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold mt-2" style={{ color: styles.textPrimary }}>
              {invitation.groomName}
            </h3>
            <p className="text-xs sm:text-sm text-[#78786A] font-medium mt-2 leading-relaxed max-w-xs">
              {invitation.groomParents}
            </p>

            {invitation.groomInstagram && (
              <a
                href={`https://instagram.com/${invitation.groomInstagram}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-medium mt-5 px-4 py-2 rounded-xl border transition-colors hover:bg-[#F0EEE6]"
                style={{ borderColor: styles.borderAccent, color: styles.textPrimary }}
              >
                <Instagram className="w-3.5 h-3.5" style={{ color: styles.accent }} />
                <span>@{invitation.groomInstagram}</span>
              </a>
            )}
          </motion.div>

          {/* Decorative Ampersand Connector */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 items-center justify-center z-10 shadow-lg bg-[#FDFCF9]" style={{ borderColor: styles.accent }}>
            <Heart className="w-5 h-5 fill-current animate-pulse" style={{ color: styles.accent }} />
          </div>

          {/* Bride Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="flex flex-col items-center text-center p-6 sm:p-10 rounded-3xl border shadow-sm transition-all hover:shadow-md"
            style={{
              backgroundColor: styles.bgCard,
              borderColor: styles.borderAccent,
            }}
          >
            {/* Bride Photo in Elegant Arch Frame */}
            <div className="relative mb-6">
              <div
                className="w-44 h-56 sm:w-52 sm:h-64 rounded-t-full rounded-b-2xl overflow-hidden border-4 border-white ring-1 shadow-md"
                style={{ ringColor: styles.borderAccent }}
              >
                <img
                  src={invitation.bridePhoto}
                  alt={invitation.brideName}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-white shadow-md"
                style={{ backgroundColor: styles.accent }}
              >
                Mempelai Wanita
              </div>
            </div>

            <h3 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold mt-2" style={{ color: styles.textPrimary }}>
              {invitation.brideName}
            </h3>
            <p className="text-xs sm:text-sm text-[#78786A] font-medium mt-2 leading-relaxed max-w-xs">
              {invitation.brideParents}
            </p>

            {invitation.brideInstagram && (
              <a
                href={`https://instagram.com/${invitation.brideInstagram}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-medium mt-5 px-4 py-2 rounded-xl border transition-colors hover:bg-[#F0EEE6]"
                style={{ borderColor: styles.borderAccent, color: styles.textPrimary }}
              >
                <Instagram className="w-3.5 h-3.5" style={{ color: styles.accent }} />
                <span>@{invitation.brideInstagram}</span>
              </a>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
