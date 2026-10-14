import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { MailOpen, Heart, Sparkles, Calendar, CheckCircle2, QrCode } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';
import { InvitationData, InvitedGuest } from '../../types.js';

interface CoverEnvelopeProps {
  invitation: InvitationData;
  recipientName?: string;
  verifiedGuest?: InvitedGuest | null;
  onOpen: () => void;
}

export const CoverEnvelope: React.FC<CoverEnvelopeProps> = ({
  invitation,
  recipientName = 'Tamu Undangan',
  verifiedGuest,
  onOpen,
}) => {
  const { styles } = useTheme();

  const formattedDate = new Date(invitation.weddingDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -80, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-cover bg-center p-4 sm:p-6 select-none"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(40, 40, 32, 0.72), rgba(30, 30, 24, 0.88)), url(${invitation.heroImage})`,
      }}
    >
      {/* Subtle floating particles / ambient light */}
      <div className="absolute inset-0 bg-radial from-white/10 via-transparent to-black/50 pointer-events-none" />

      {/* Main Envelope Card Container */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative w-full max-w-md rounded-2xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-md border"
        style={{
          backgroundColor: 'rgba(253, 252, 249, 0.96)',
          borderColor: styles.borderAccent,
          color: styles.textPrimary,
        }}
      >
        {/* Decorative corner borders */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: styles.accent }} />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: styles.accent }} />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: styles.accent }} />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: styles.accent }} />

        {/* Top Header Tag */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="w-3.5 h-3.5" style={{ color: styles.accent }} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] font-sans" style={{ color: styles.textSecondary }}>
            The Wedding Invitation
          </span>
          <Sparkles className="w-3.5 h-3.5" style={{ color: styles.accent }} />
        </div>

        {/* Couple Names */}
        <h1 className="font-['Alex_Brush'] text-5xl sm:text-6xl my-2 leading-tight" style={{ color: styles.accent }}>
          {invitation.groomShortName} & {invitation.brideShortName}
        </h1>

        <div className="flex items-center justify-center gap-2 text-xs my-2 font-medium" style={{ color: styles.textSecondary }}>
          <Calendar className="w-3.5 h-3.5" />
          <span className="font-sans text-[11px] tracking-wider uppercase">{formattedDate}</span>
        </div>

        <div className="w-16 h-[1px] mx-auto my-4" style={{ backgroundColor: styles.borderAccent }} />

        {/* Recipient Invitation Box */}
        <div
          className="rounded-xl p-4 my-4 border relative overflow-hidden"
          style={{
            backgroundColor: styles.accentLight,
            borderColor: styles.borderAccent,
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] font-sans mb-1" style={{ color: styles.textSecondary }}>
            Kepada Yth. Bapak/Ibu/Saudara/i:
          </p>
          <p className="text-lg sm:text-xl font-bold tracking-wide" style={{ color: styles.textPrimary }}>
            {recipientName}
          </p>

          {verifiedGuest ? (
            <div className="mt-2.5 pt-2 border-t border-dashed border-[#D9D3C7] flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Undangan Resmi ({verifiedGuest.slug})
              </span>
              <span className="text-[10px] text-stone-600 font-semibold">
                {verifiedGuest.category} • Kuota: {verifiedGuest.pax}
              </span>
            </div>
          ) : (
            <p className="text-[11px] italic mt-1 text-[#78786A]">
              *Mohon maaf bila ada kesalahan penulisan nama / gelar
            </p>
          )}
        </div>

        {/* Open Invitation CTA Button */}
        <motion.button
          type="button"
          onClick={onOpen}
          whileHover={{ scale: 1.02, boxShadow: `0 10px 25px -5px ${styles.accent}50` }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-2 py-4 px-6 rounded-xl font-sans text-xs uppercase tracking-[0.2em] font-bold text-white flex items-center justify-center gap-2.5 shadow-lg shadow-[#5A5A40]/20 transition-all cursor-pointer"
          style={{
            backgroundColor: styles.accent,
          }}
        >
          <MailOpen className="w-4 h-4" />
          <span>Buka Undangan</span>
        </motion.button>

        <p className="text-[11px] text-[#78786A] mt-4 flex items-center justify-center gap-1 font-sans">
          <Heart className="w-3 h-3 text-[#5A5A40] fill-[#5A5A40] inline" />
          <span>Sentuhan lembut membuka hari bahagia kami</span>
        </p>
      </motion.div>
    </motion.div>
  );
};
